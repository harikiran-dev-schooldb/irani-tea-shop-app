"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSignIn } from "@clerk/nextjs/legacy";
import { Check, LoaderCircle, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import Image from "next/image";

type Step = "phone" | "code" | "accounts";
type Account = { id: string; name?: string; role?: string };
type VerifyResponse = {
  error?: string;
  token?: string;
  requiresAccountSelection?: boolean;
  challengeId?: string;
  accounts?: Account[];
};

async function readResponse(response: Response): Promise<VerifyResponse> {
  const result = (await response.json().catch(() => ({}))) as VerifyResponse;
  if (!response.ok) throw new Error(result.error || "Could not complete sign in.");
  return result;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Could not complete sign in. Please try again.";
}

export default function WhatsAppAuthGate({ children }: { children: ReactNode }) {
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { isLoaded: signInLoaded, signIn, setActive } = useSignIn();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(
      () => setResendSeconds((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  if (authLoaded && isSignedIn) return children;

  async function activateTicket(ticket: string) {
    if (!signInLoaded || !signIn || !setActive) {
      throw new Error(
        "Secure sign-in is not ready on this domain. Open the shop’s schooldb.co.in web address and try again.",
      );
    }
    const attempt = await signIn.create({ strategy: "ticket", ticket });
    if (attempt.status !== "complete" || !attempt.createdSessionId) {
      throw new Error("Clerk could not create your session.");
    }
    await setActive({ session: attempt.createdSessionId });
  }

  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await readResponse(
        await fetch("/api/auth/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
        }),
      );
      setOtp("");
      setStep("code");
      setResendSeconds(60);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit WhatsApp code.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await readResponse(
        await fetch("/api/auth/whatsapp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "VERIFY", phone, otp }),
        }),
      );
      if (result.token) {
        await activateTicket(result.token);
        return;
      }
      if (result.requiresAccountSelection && result.challengeId) {
        setChallengeId(result.challengeId);
        setAccounts(result.accounts ?? []);
        setStep("accounts");
        return;
      }
      throw new Error("The sign-in response was incomplete.");
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  async function chooseAccount(accountId: string) {
    setLoading(true);
    setError("");
    try {
      const result = await readResponse(
        await fetch("/api/auth/whatsapp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "SELECT", challengeId, accountId }),
        }),
      );
      if (!result.token) throw new Error("The sign-in response was incomplete.");
      await activateTicket(result.token);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  function changeNumber() {
    setStep("phone");
    setOtp("");
    setAccounts([]);
    setChallengeId("");
    setResendSeconds(0);
    setError("");
  }

  return (
    <main className="auth-page">
      <section className="auth-brand" aria-label="Irani Tea">
        <Image src="/icon.svg" width={96} height={96} alt="Irani Tea logo" priority />
        <div>
          <p>Shop manager</p>
          <h1>Irani Tea</h1>
          <span>Secure staff access</span>
        </div>
      </section>

      <section className="auth-card">
        <div className="auth-heading">
          <span><ShieldCheck size={18} /></span>
          <div>
            <p>Welcome back</p>
            <h2>
              {step === "phone" && "Sign in with WhatsApp"}
              {step === "code" && "Enter your code"}
              {step === "accounts" && "Choose your account"}
            </h2>
          </div>
        </div>

        {step === "phone" ? (
          <form onSubmit={sendCode} className="auth-form">
            <label htmlFor="phone">Mobile number</label>
            <div className="auth-phone-field">
              <Phone size={19} />
              <span>+91</span>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="98765 43210"
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value.replace(/\D/g, "").slice(-10));
                  setError("");
                }}
                autoFocus
              />
            </div>
            <p className="auth-help">We’ll send a 6-digit code to your registered WhatsApp number.</p>
            {error ? <p className="auth-error">{error}</p> : null}
            <button className="auth-submit" disabled={loading}>
              {loading ? <LoaderCircle className="spinning" /> : <MessageCircle />}
              Send WhatsApp code
            </button>
          </form>
        ) : null}

        {step === "code" ? (
          <form onSubmit={verifyCode} className="auth-form">
            <p className="auth-sent">Code sent to <strong>+91 {phone}</strong></p>
            <label htmlFor="otp">WhatsApp code</label>
            <input
              id="otp"
              className="auth-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              value={otp}
              onChange={(event) => {
                setOtp(event.target.value.replace(/\D/g, "").slice(0, 6));
                setError("");
              }}
              autoFocus
            />
            {error ? <p className="auth-error">{error}</p> : null}
            <button className="auth-submit" disabled={loading}>
              {loading ? <LoaderCircle className="spinning" /> : <Check />}
              Verify and sign in
            </button>
            <div className="auth-links">
              <button type="button" onClick={changeNumber}>Change number</button>
              <button
                type="button"
                disabled={loading || resendSeconds > 0}
                onClick={() => void sendCode()}
              >
                {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : "Resend code"}
              </button>
            </div>
          </form>
        ) : null}

        {step === "accounts" ? (
          <div className="auth-form">
            <p className="auth-help">This number has more than one account. Select the Irani Tea account.</p>
            <div className="auth-accounts">
              {accounts.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  disabled={loading}
                  onClick={() => void chooseAccount(account.id)}
                >
                  <span>{account.name || "Shop account"}</span>
                  <small>{account.role?.replaceAll("_", " ") || "Staff"}</small>
                </button>
              ))}
            </div>
            {error ? <p className="auth-error">{error}</p> : null}
            {loading ? <LoaderCircle className="auth-account-loader spinning" /> : null}
            <div className="auth-links"><button type="button" onClick={changeNumber}>Use another number</button></div>
          </div>
        ) : null}
      </section>

      <p className="auth-footer"><ShieldCheck size={15} /> Authorized Irani Tea staff only</p>
    </main>
  );
}
