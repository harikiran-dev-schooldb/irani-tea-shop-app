import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Irani Tea Shop Manager",
  description: "Privacy policy for the Irani Tea Shop Manager Android application.",
};

const sectionStyle = {
  marginTop: "2rem",
} as const;

export default function PrivacyPolicyPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "clamp(24px, 6vw, 72px) 20px",
        background: "#fff8ec",
      }}
    >
      <article
        style={{
          width: "min(760px, 100%)",
          margin: "0 auto",
          padding: "clamp(24px, 5vw, 56px)",
          color: "#25150d",
          background: "#fffdf8",
          border: "1px solid rgba(72, 37, 17, .13)",
          borderRadius: 24,
          boxShadow: "0 18px 50px rgba(42, 18, 8, .1)",
          lineHeight: 1.7,
        }}
      >
        <p style={{ color: "#b96f32", fontWeight: 700, letterSpacing: ".08em" }}>
          IRANI TEA
        </p>
        <h1 style={{ margin: "0 0 .35rem", fontSize: "clamp(2rem, 6vw, 3.5rem)" }}>
          Privacy Policy
        </h1>
        <p style={{ color: "#806949" }}>Last updated: 16 October 2026</p>

        <p>
          Irani Tea Shop Manager is a business application used by authorised tea-shop staff to
          manage menu items, stock, orders, sales, expenses, and daily cash records. It does not
          display advertising and does not use data for behavioural tracking.
        </p>

        <section style={sectionStyle}>
          <h2>Information processed</h2>
          <p>The app may process the following information when staff enter it:</p>
          <ul>
            <li>optional customer names;</li>
            <li>order items, quantities, totals, status, date, and time;</li>
            <li>payment method labels such as cash or online (not card or bank credentials);</li>
            <li>menu, inventory, expense, and daily-closing records; and</li>
            <li>technical error information needed to show connection failures.</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2>How information is used and stored</h2>
          <p>
            Information is used only to provide shop-management features. Operational records are
            sent over an encrypted connection to the shop&apos;s hosted database. The Android app also
            keeps the most recently loaded shop snapshot on the device so staff can view it during
            a temporary connection outage. Device backup is disabled for this local cache.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2>Sharing and retention</h2>
          <p>
            Information is not sold and is not shared for advertising. Infrastructure providers may
            process it only as needed to host the application and database. Shop records remain
            until an authorised staff member deletes them or the shop owner requests deletion.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2>Permissions and children</h2>
          <p>
            The Android app requests internet and network-state access only. It does not request
            location, contacts, camera, microphone, or advertising-ID access. This business tool is
            not directed to children.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2>Your choices and contact</h2>
          <p>
            Shop staff can correct or delete supported records inside the app. For access, deletion,
            or privacy questions, contact the developer using the support email shown on the Irani
            Tea Shop Manager Google Play listing or through the developer profile below.
          </p>
          <p>
            <a href="https://github.com/harikiran-dev-schooldb">Developer profile</a>
          </p>
        </section>
      </article>
    </main>
  );
}
