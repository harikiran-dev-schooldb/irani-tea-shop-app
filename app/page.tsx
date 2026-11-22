"use client";

import { FormEvent, ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { useAuth, useClerk, useUser } from "@clerk/nextjs";
import {
  Banknote,
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  ChevronDown,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  CircleDollarSign,
  Cloud,
  Coffee,
  Download,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Pencil,
  Plus,
  Printer,
  ReceiptIndianRupee,
  RefreshCw,
  Search,
  ShoppingBag,
  Smartphone,
  Store,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserRound,
  WalletCards,
  WifiOff,
  X,
} from "lucide-react";
import Image from "next/image";

import WhatsAppAuthGate from "@/components/WhatsAppAuthGate";
import ShopCommandMenu from "@/components/ShopCommandMenu";
import type {
  DailyClosing,
  MenuItem,
  Order,
  ShopData,
  Transaction,
} from "@/lib/shop-data";

type EditTarget =
  | { kind: "transaction"; record: Transaction }
  | { kind: "order"; record: Order };
type ReceiptData = {
  orderNo: number;
  createdAt: string;
  paymentMode: "cash" | "online";
  total: number;
  items: { name: string; quantity: number; price: number }[];
};

type View =
  | "dashboard"
  | "orders"
  | "menu"
  | "cashflow"
  | "expenses"
  | "storefront";
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

class ShopRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ShopRequestError";
  }
}

const nav: { id: View; label: string; icon: typeof Store }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "menu", label: "Menu", icon: BookOpen },
  { id: "cashflow", label: "Sales report", icon: WalletCards },
  { id: "expenses", label: "Expenses", icon: ReceiptIndianRupee },
  { id: "storefront", label: "Counter", icon: Store },
];

const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;
const todayLabel = new Intl.DateTimeFormat("en-IN", {
  weekday: "long",
  day: "numeric",
  month: "long",
}).format(new Date());
const indiaDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
});
const dateKey = (value: string | Date) => indiaDate.format(new Date(value));
const todayInput = dateKey(new Date());
const indiaTimeInput = () =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
const transactionStamp = (value: string) => {
  const date = new Date(value);
  const dateLabel = date.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
  });
  const usesOldPlaceholderTime =
    date.getUTCHours() === 12 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0;
  if (usesOldPlaceholderTime) return `${dateLabel} · Time not recorded`;
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
};
const storageKey = "irani-tea-shop-data-v2";
const starterMenu: MenuItem[] = [
  {
    id: "irani-tea",
    name: "Irani Tea",
    category: "Tea",
    price: 15,
    isAvailable: true,
    stockQty: 50,
    lowStockThreshold: 10,
  },
  {
    id: "lemon-tea",
    name: "Lemon Tea",
    category: "Tea",
    price: 20,
    isAvailable: true,
    stockQty: 50,
    lowStockThreshold: 10,
  },
  {
    id: "special-irani",
    name: "Special Irani Tea",
    category: "Tea",
    price: 20,
    isAvailable: true,
    stockQty: 50,
    lowStockThreshold: 10,
  },
  {
    id: "horlicks",
    name: "Horlicks",
    category: "Health Drinks",
    price: 20,
    isAvailable: true,
    stockQty: 50,
    lowStockThreshold: 10,
  },
  {
    id: "boost",
    name: "Boost",
    category: "Health Drinks",
    price: 20,
    isAvailable: true,
    stockQty: 50,
    lowStockThreshold: 10,
  },
  {
    id: "osmania-1",
    name: "Osmania Biscuit (1 Pc)",
    category: "Biscuits",
    price: 5,
    isAvailable: true,
    stockQty: 50,
    lowStockThreshold: 10,
  },
  {
    id: "osmania-2",
    name: "Osmania Biscuit (2 Pcs)",
    category: "Biscuits",
    price: 10,
    isAvailable: true,
    stockQty: 50,
    lowStockThreshold: 10,
  },
  {
    id: "water-500",
    name: "Water Bottle 500 ml",
    category: "Water",
    price: 10,
    isAvailable: true,
    stockQty: 50,
    lowStockThreshold: 10,
  },
  {
    id: "water-1l",
    name: "Water Bottle 1 Litre",
    category: "Water",
    price: 20,
    isAvailable: true,
    stockQty: 50,
    lowStockThreshold: 10,
  },
];
const starterData: ShopData = {
  menu: starterMenu,
  orders: [],
  orderItems: [],
  transactions: [],
  closings: [],
};
const normalizeData = (value: ShopData): ShopData => ({
  ...starterData,
  ...value,
  menu: (value.menu ?? starterMenu).map((item) => ({
    ...item,
    stockQty: item.stockQty ?? 50,
    lowStockThreshold: item.lowStockThreshold ?? 10,
  })),
  orders: value.orders ?? [],
  orderItems: value.orderItems ?? [],
  transactions: value.transactions ?? [],
  closings: value.closings ?? [],
});

export default function Home() {
  return (
    <WhatsAppAuthGate>
      <ShopManager />
    </WhatsAppAuthGate>
  );
}

function ShopManager() {
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const { user } = useUser();
  const [view, setView] = useState<View>("dashboard");
  const [data, setData] = useState<ShopData>(starterData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<
    "menu" | "sale" | "expense" | "order" | null
  >(null);
  const [query, setQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    kind: "transaction" | "order";
    id: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [syncState, setSyncState] = useState<"synced" | "local" | "offline">(
    "synced",
  );
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(
    null,
  );
  const [signingOut, setSigningOut] = useState(false);
  const ownerName =
    user?.fullName || user?.primaryEmailAddress?.emailAddress || "Shop staff";
  const ownerRole =
    typeof user?.publicMetadata.role === "string"
      ? user.publicMetadata.role.replaceAll("_", " ").toLowerCase()
      : "Authorised staff";

  const loadData = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch("/api/shop", {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new ShopRequestError(
          result.error || "Could not load shop data.",
          response.status,
        );
      }
      const fresh = normalizeData((await response.json()) as ShopData);
      setData(fresh);
      window.localStorage.setItem(storageKey, JSON.stringify(fresh));
      setSyncState("synced");
      setError("");
    } catch (loadError) {
      if (
        loadError instanceof ShopRequestError &&
        (loadError.status === 401 || loadError.status === 403)
      ) {
        window.localStorage.removeItem(storageKey);
        setData(starterData);
        setSyncState("synced");
        setError(loadError.message);
        return;
      }
      const saved = window.localStorage.getItem(storageKey);
      setData(
        saved ? normalizeData(JSON.parse(saved) as ShopData) : starterData,
      );
      const state = navigator.onLine ? "local" : "offline";
      setSyncState(state);
      setError(
        state === "offline"
          ? "You’re offline. Showing the latest saved shop data; editing will resume when the connection returns."
          : loadError instanceof Error
            ? `${loadError.message} Showing the latest saved shop data.`
            : "Could not load shop data. Showing the latest saved copy.",
      );
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  const handleSignOut = useCallback(async () => {
    if (signingOut) return;
    setSigningOut(true);
    window.localStorage.removeItem(storageKey);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }, [signOut, signingOut]);

  useEffect(() => {
    // Defer client-only preferences until after hydration.
    const frame = window.requestAnimationFrame(() => {
      setSidebarCollapsed(window.localStorage.getItem("irani-tea-sidebar-collapsed") === "true");
      setTheme(window.localStorage.getItem("irani-tea-workspace-theme") === "dark" ? "dark" : "light");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setProfileOpen(false);
        setSearchOpen((current) => !current);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setProfileOpen(false);
      }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  useEffect(() => {
    if (!profileOpen) return;
    const onOutsideClick = (event: PointerEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("pointerdown", onOutsideClick);
    return () => document.removeEventListener("pointerdown", onOutsideClick);
  }, [profileOpen]);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    window.localStorage.setItem("irani-tea-workspace-theme", next);
    setTheme(next);
  };

  const toggleSidebar = () => {
    const next = !sidebarCollapsed;
    window.localStorage.setItem("irani-tea-sidebar-collapsed", String(next));
    setSidebarCollapsed(next);
  };

  useEffect(() => {
    queueMicrotask(() => void loadData());
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    const onOnline = () => loadData();
    const onOffline = () => setSyncState("offline");
    const onInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("beforeinstallprompt", onInstall);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("beforeinstallprompt", onInstall);
    };
  }, [loadData]);

  async function post(payload: Record<string, unknown>) {
    if (!navigator.onLine)
      throw new Error(
        "This entry needs an internet connection to sync with Neon.",
      );
    const token = await getToken();
    const response = await fetch("/api/shop", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as ShopData & { error?: string };
    if (!response.ok)
      throw new Error(result.error || "Could not save this entry.");
    const normalized = normalizeData(result);
    setData(normalized);
    window.localStorage.setItem(storageKey, JSON.stringify(normalized));
    setSyncState("synced");
    return { ...normalized, createdOrderId: result.createdOrderId };
  }

  function removeRecord(kind: "transaction" | "order", id: string) {
    setDeleteError("");
    setDeleteTarget({ kind, id });
  }

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await post({ kind: `${deleteTarget.kind}-delete`, id: deleteTarget.id });
      setDeleteTarget(null);
    } catch (deleteFailure) {
      setDeleteError(
        deleteFailure instanceof Error ? deleteFailure.message : "Could not delete this record.",
      );
    } finally {
      setDeleting(false);
    }
  }

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstallPrompt(null);
  }

  async function refreshData() {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }

  const scopedTransactions = selectedDate
    ? data.transactions.filter(
        (item) => dateKey(item.createdAt) === selectedDate,
      )
    : data.transactions;
  const scopedOrders = selectedDate
    ? data.orders.filter((item) => dateKey(item.createdAt) === selectedDate)
    : data.orders;
  const scopedData: ShopData = {
    ...data,
    orders: scopedOrders,
    orderItems: data.orderItems.filter((item) =>
      scopedOrders.some((order) => order.id === item.orderId),
    ),
    transactions: scopedTransactions,
  };
  const sales = scopedTransactions
    .filter((item) => item.type === "sale")
    .reduce((sum, item) => sum + item.amount, 0);
  const cashSales = scopedTransactions
    .filter(
      (item) => item.type === "sale" && (item.paymentMode ?? "cash") === "cash",
    )
    .reduce((sum, item) => sum + item.amount, 0);
  const expenses = scopedTransactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);
  const balance = cashSales - expenses;
  const overallNet = sales - expenses;
  const activeOrders = data.orders.filter(
    (order) => order.status !== "completed",
  );
  const filteredMenu = data.menu.filter((item) =>
    `${item.name} ${item.category}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className={`app-shell${sidebarCollapsed ? " is-collapsed" : ""}${theme === "dark" ? " theme-dark" : ""}`}>
      {mobileNavOpen ? (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}
      <aside className={`sidebar${mobileNavOpen ? " mobile-open" : ""}`}>
        <div className="shop-brand">
          <span className="brand-cup">
            <Image
              src="/icon.svg"
              width={48}
              height={48}
              alt="Irani Tea logo"
              priority
            />
          </span>
          <div>
            <strong>Irani Tea</strong>
            <small>Shop manager</small>
          </div>
        </div>
        <button
          className="sidebar-toggle"
          type="button"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={toggleSidebar}
        >
          {sidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          <span>{sidebarCollapsed ? "Expand" : "Collapse"}</span>
        </button>
        <nav className="side-nav" aria-label="App navigation">
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              title={label}
              aria-label={label}
              aria-current={view === id ? "page" : undefined}
              className={view === id ? "active" : ""}
              onClick={() => {
                setView(id);
                setMobileNavOpen(false);
              }}
            >
              <Icon size={19} />
              <span>{label}</span>
              {id === "orders" && activeOrders.length > 0 ? (
                <b>{activeOrders.length}</b>
              ) : null}
            </button>
          ))}
        </nav>
        <div className="shop-status">
          <span />
          <div>
            <strong>Shop hours</strong>
            <small>04:30 AM – 11:00 AM</small>
            <small>03:00 PM – 08:00 PM</small>
          </div>
        </div>
        <button
          className="settings-row"
          type="button"
          disabled={signingOut}
          onClick={() => void handleSignOut()}
        >
          <LogOut size={18} /> <span className="settings-label">{signingOut ? "Signing out…" : "Sign out"}</span>
        </button>
        <div className="owner-card">
          <span className="owner-avatar">
            <UserRound size={17} />
          </span>
          <div>
            <strong>{ownerName}</strong>
            <small>{ownerRole}</small>
          </div>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div className="topbar-title">
            <button
              className="mobile-menu"
              aria-label="Open main navigation"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu size={20} />
            </button>
            <Image
              className="mobile-logo"
              src="/icon.svg"
              width={42}
              height={42}
              alt=""
            />
            <div>
              <p>Irani Tea workspace <span className="header-date">· {todayLabel}</span></p>
              <h1>{nav.find((item) => item.id === view)?.label}</h1>
            </div>
          </div>
          <div className="top-actions">
            <span className={`sync-state ${syncState}`}>
              {syncState === "synced" ? (
                <Cloud size={15} />
              ) : (
                <WifiOff size={15} />
              )}
              <span>
                {syncState === "synced"
                  ? "Neon synced"
                  : syncState === "offline"
                    ? "Offline"
                    : "Local cache"}
              </span>
            </span>
            {installPrompt ? (
              <button className="install-button" onClick={installApp}>
                <Download size={17} /> Install app
              </button>
            ) : null}
            <button
              className="theme-button"
              type="button"
              title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              onClick={toggleTheme}
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button
              className="refresh-button"
              aria-label="Refresh shop data"
              title="Refresh shop data"
              disabled={refreshing}
              onClick={refreshData}
            >
              <RefreshCw className={refreshing ? "spinning" : ""} size={18} />
            </button>
            <button
              className="search-button"
              type="button"
              aria-label="Search workspace"
              title="Search workspace (⌘K / Ctrl+K)"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={19} />
              <span className="search-shortcut">⌘ K</span>
            </button>
            <button className="quick-order" onClick={() => setModal("order")}>
              <Plus size={18} /> New order
            </button>
            <div className="profile-menu-shell" ref={profileRef}>
              <button
                className="profile-trigger"
                type="button"
                aria-label="Open account menu"
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                onClick={() => setProfileOpen((current) => !current)}
              >
                <span className="profile-avatar"><UserRound size={18} /></span>
                <span className="profile-trigger-copy">
                  <strong>{ownerName}</strong>
                  <small>{ownerRole}</small>
                </span>
                <ChevronDown className="profile-chevron" size={16} />
              </button>
              {profileOpen ? (
                <div className="profile-dropdown" role="menu">
                  <div className="profile-dropdown-user">
                    <strong>{ownerName}</strong>
                    <small>{ownerRole}</small>
                  </div>
                  <button type="button" role="menuitem" onClick={() => {
                    setView("dashboard");
                    setProfileOpen(false);
                  }}>
                    <LayoutDashboard size={17} /> Dashboard
                  </button>
                  <button type="button" role="menuitem" disabled={signingOut} onClick={() => void handleSignOut()}>
                    <LogOut size={17} /> {signingOut ? "Signing out…" : "Sign out"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {error ? (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={loadData}>Try again</button>
          </div>
        ) : null}
        {loading ? (
          <div className="loading">
            <Coffee size={30} />
            <span>Opening your shop…</span>
          </div>
        ) : null}
        {!loading && view === "dashboard" ? (
          <Dashboard
            data={scopedData}
            sales={sales}
            expenses={expenses}
            balance={balance}
            overallNet={overallNet}
            reportDate={selectedDate}
            setReportDate={setSelectedDate}
            setView={setView}
            open={setModal}
          />
        ) : null}
        {!loading && view === "orders" ? (
          <Orders
            orders={scopedOrders}
            reportDate={selectedDate}
            setReportDate={setSelectedDate}
            post={post}
            open={() => setModal("order")}
            edit={setEditTarget}
            remove={(id) => removeRecord("order", id)}
          />
        ) : null}
        {!loading && view === "menu" ? (
          <MenuView
            menu={filteredMenu}
            query={query}
            setQuery={setQuery}
            post={post}
            open={() => setModal("menu")}
          />
        ) : null}
        {!loading && view === "cashflow" ? (
          <Cashflow
            transactions={data.transactions}
            expenses={expenses}
            balance={balance}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            open={setModal}
            closings={data.closings}
            post={post}
            edit={setEditTarget}
            remove={(id) => removeRecord("transaction", id)}
          />
        ) : null}
        {!loading && view === "expenses" ? (
          <Expenses
            transactions={scopedTransactions.filter(
              (item) => item.type === "expense",
            )}
            total={expenses}
            reportDate={selectedDate}
            setReportDate={setSelectedDate}
            open={() => setModal("expense")}
            edit={setEditTarget}
            remove={(id) => removeRecord("transaction", id)}
          />
        ) : null}
        {!loading && view === "storefront" ? (
          <Counter
            menu={data.menu.filter(
              (item) => item.isAvailable && item.stockQty > 0,
            )}
            post={post}
            showReceipt={setReceipt}
          />
        ) : null}
      </main>

      <ShopCommandMenu
        key={searchOpen ? "open" : "closed"}
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        menu={data.menu}
        onNavigate={(nextView) => {
          setView(nextView);
          setMobileNavOpen(false);
        }}
        onMenuSearch={(term) => {
          setQuery(term);
          setView("menu");
          setMobileNavOpen(false);
        }}
        onNewOrder={() => {
          setModal("order");
          setSearchOpen(false);
        }}
      />

      {deleteTarget ? (
        <div className="modal-backdrop" onClick={() => {
          if (!deleting) setDeleteTarget(null);
        }}>
          <section
            className="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            aria-describedby="delete-dialog-description"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="confirm-dialog-icon"><Trash2 size={21} /></span>
            <h2 id="delete-dialog-title">Delete this {deleteTarget.kind}?</h2>
            <p id="delete-dialog-description">
              This action permanently removes the record from the shop. It cannot be undone.
            </p>
            {deleteError ? <p className="confirm-error" role="alert">{deleteError}</p> : null}
            <div className="confirm-dialog-actions">
              <button type="button" className="secondary" disabled={deleting} onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button type="button" className="danger-button" disabled={deleting} onClick={() => void confirmDelete()}>
                {deleting ? "Deleting…" : "Delete record"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {modal ? (
        <EntryModal kind={modal} close={() => setModal(null)} post={post} />
      ) : null}
      {editTarget ? (
        <EditRecordModal
          target={editTarget}
          close={() => setEditTarget(null)}
          post={post}
        />
      ) : null}
      {receipt ? (
        <ReceiptModal receipt={receipt} close={() => setReceipt(null)} />
      ) : null}
    </div>
  );
}

function Dashboard({
  data,
  sales,
  expenses,
  balance,
  overallNet,
  reportDate,
  setReportDate,
  setView,
  open,
}: {
  data: ShopData;
  sales: number;
  expenses: number;
  balance: number;
  overallNet: number;
  reportDate: string;
  setReportDate: (value: string) => void;
  setView: (view: View) => void;
  open: (kind: "sale" | "expense" | "order") => void;
}) {
  const cards = [
    {
      label: "Total sales",
      value: sales,
      detail: `${data.orders.length} orders recorded`,
      icon: TrendingUp,
      tone: "coffee",
    },
    {
      label: "Expenses",
      value: expenses,
      detail: `${data.transactions.filter((item) => item.type === "expense").length} entries`,
      icon: TrendingDown,
      tone: "red",
    },
    {
      label: "Cash balance",
      value: balance,
      detail: "Cash sales minus expenses",
      icon: IndianRupee,
      tone: "gold",
    },
    {
      label: "Menu items",
      value: data.menu.length,
      detail: `${data.menu.filter((item) => item.isAvailable).length} available`,
      icon: Coffee,
      tone: "blue",
      plain: true,
    },
    {
      label: "Overall net",
      value: overallNet,
      detail: "All sales minus expenses",
      icon: CircleDollarSign,
      tone: overallNet >= 0 ? "gold" : "red",
      wide: true,
    },
  ];
  return (
    <div className="page-content">
      <section className="welcome">
        <div>
          <p className="eyebrow">
            {reportDate ? "Selected day at a glance" : "All-time at a glance"}
          </p>
          <h2>Welcome to Irani Tea.</h2>
          <p>
            {reportDate
              ? `Showing the report for ${new Date(`${reportDate}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}.`
              : "Here’s how Irani Tea is doing across all recorded dates."}
          </p>
        </div>
        <div className="welcome-mark">
          <Coffee size={38} />
          <span>Fresh since 2026</span>
        </div>
      </section>
      <ReportDateFilter value={reportDate} onChange={setReportDate} />
      <div className="metric-grid">
        {cards.map(
          ({ label, value, detail, icon: Icon, tone, plain, wide }) => (
            <article
              className={`metric${wide ? " metric-wide" : ""}`}
              key={label}
            >
              <div className={`metric-icon ${tone}`}>
                <Icon size={20} />
              </div>
              <span>{label}</span>
              <strong>{plain ? value : money(value)}</strong>
              <small>{detail}</small>
            </article>
          ),
        )}
      </div>
      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-head">
            <div>
              <span>Recent orders</span>
              <h3>Kitchen queue</h3>
            </div>
            <button onClick={() => setView("orders")}>
              View all <ChevronRight size={16} />
            </button>
          </div>
          <div className="order-list">
            {data.orders.length ? (
              data.orders
                .slice(0, 5)
                .map((order) => <OrderRow order={order} key={order.id} />)
            ) : (
              <Empty
                icon={<ShoppingBag />}
                title="No orders yet"
                text="Create the first order when a customer arrives."
              />
            )}
          </div>
        </div>
        <div className="panel quick-panel">
          <div className="panel-head">
            <div>
              <span>Quick actions</span>
              <h3>Keep things moving</h3>
            </div>
          </div>
          <button onClick={() => open("order")}>
            <span className="quick-icon coffee">
              <ShoppingBag />
            </span>
            <div>
              <strong>New counter order</strong>
              <small>Record an order and sale</small>
            </div>
            <ChevronRight />
          </button>
          <button onClick={() => open("expense")}>
            <span className="quick-icon red">
              <ReceiptIndianRupee />
            </span>
            <div>
              <strong>Add an expense</strong>
              <small>Stock, rent or supplies</small>
            </div>
            <ChevronRight />
          </button>
          <button onClick={() => open("sale")}>
            <span className="quick-icon gold">
              <CircleDollarSign />
            </span>
            <div>
              <strong>Record a sale</strong>
              <small>Cash or online payment</small>
            </div>
            <ChevronRight />
          </button>
        </div>
      </section>
      <Insights data={data} />
    </div>
  );
}

function Insights({ data }: { data: ShopData }) {
  const [period, setPeriod] = useState<"day" | "week" | "month">("week");
  const days = period === "day" ? 1 : period === "week" ? 7 : 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (days - 1));
  cutoff.setHours(0, 0, 0, 0);
  const periodOrders = data.orders.filter(
    (order) => new Date(order.createdAt) >= cutoff,
  );
  const orderIds = new Set(periodOrders.map((order) => order.id));
  const topItems = Object.values(
    data.orderItems
      .filter((item) => orderIds.has(item.orderId))
      .reduce<
        Record<string, { name: string; quantity: number; revenue: number }>
      >((items, item) => {
        items[item.name] ??= { name: item.name, quantity: 0, revenue: 0 };
        items[item.name].quantity += item.quantity;
        items[item.name].revenue += item.quantity * item.unitPrice;
        return items;
      }, {}),
  )
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);
  const expenses = Object.entries(
    data.transactions
      .filter(
        (item) => item.type === "expense" && new Date(item.createdAt) >= cutoff,
      )
      .reduce<Record<string, number>>((groups, item) => {
        groups[item.category] = (groups[item.category] ?? 0) + item.amount;
        return groups;
      }, {}),
  ).sort((a, b) => b[1] - a[1]);
  const maxExpense = Math.max(...expenses.map(([, amount]) => amount), 1);
  const lowStock = data.menu.filter(
    (item) => item.stockQty <= item.lowStockThreshold,
  );

  return (
    <section className="insights-section">
      <div className="section-title-row">
        <div>
          <p className="eyebrow">Business insights</p>
          <h2>What is moving today</h2>
        </div>
        <div className="period-tabs" aria-label="Analytics period">
          {(["day", "week", "month"] as const).map((value) => (
            <button
              className={period === value ? "active" : ""}
              key={value}
              onClick={() => setPeriod(value)}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
      <div className="insights-grid">
        <article className="panel insight-card">
          <div className="panel-head">
            <div>
              <span>Top sellers</span>
              <h3>Popular items</h3>
            </div>
            <TrendingUp />
          </div>
          <div className="ranking-list">
            {topItems.length ? (
              topItems.map((item, index) => (
                <div key={item.name}>
                  <b>{index + 1}</b>
                  <span>
                    {item.name}
                    <small>{item.quantity} sold</small>
                  </span>
                  <strong>{money(item.revenue)}</strong>
                </div>
              ))
            ) : (
              <p className="mini-empty">Counter sales will appear here.</p>
            )}
          </div>
        </article>
        <article className="panel insight-card">
          <div className="panel-head">
            <div>
              <span>Expense split</span>
              <h3>Where money goes</h3>
            </div>
            <BarChart3 />
          </div>
          <div className="expense-bars">
            {expenses.length ? (
              expenses.map(([category, amount]) => (
                <div key={category}>
                  <span>
                    {category}
                    <b>{money(amount)}</b>
                  </span>
                  <i>
                    <em style={{ width: `${(amount / maxExpense) * 100}%` }} />
                  </i>
                </div>
              ))
            ) : (
              <p className="mini-empty">No expenses in this period.</p>
            )}
          </div>
        </article>
        <article className="panel insight-card stock-alerts">
          <div className="panel-head">
            <div>
              <span>Inventory</span>
              <h3>Low-stock alerts</h3>
            </div>
            <Package />
          </div>
          <div className="stock-alert-list">
            {lowStock.length ? (
              lowStock.map((item) => (
                <div key={item.id}>
                  <span>
                    {item.name}
                    <small>Reorder at {item.lowStockThreshold}</small>
                  </span>
                  <b>{item.stockQty} left</b>
                </div>
              ))
            ) : (
              <p className="mini-empty">All items have healthy stock.</p>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

function Orders({
  orders,
  reportDate,
  setReportDate,
  post,
  open,
  edit,
  remove,
}: {
  orders: Order[];
  reportDate: string;
  setReportDate: (value: string) => void;
  post: (payload: Record<string, unknown>) => Promise<ShopData>;
  open: () => void;
  edit: (target: EditTarget) => void;
  remove: (id: string) => void;
}) {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(orders.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleOrders = orders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="page-content">
      <ReportDateFilter value={reportDate} onChange={(value) => {
        setPage(1);
        setReportDate(value);
      }} />
      <div className="page-tools">
        <div>
          <p>Track every cup and snack from counter to collection.</p>
        </div>
        <button className="primary" onClick={open}>
          <Plus size={18} /> Add order
        </button>
      </div>
      <section className="panel full-panel">
        <div className="table-head">
          <span>Order</span>
          <span>Customer</span>
          <span>Items</span>
          <span>Total</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        {orders.length ? (
          visibleOrders.map((order) => (
            <div className="table-row" key={order.id}>
              <strong>#{order.orderNo}</strong>
              <span>{order.customer}</span>
              <span>{order.itemCount}</span>
              <strong>{money(order.total)}</strong>
              <button
                className={`status ${order.status}`}
                disabled={order.status === "completed"}
                title={order.status === "completed" ? "Order completed" : "Move to next stage"}
                onClick={() =>
                  post({
                    kind: "order-status",
                    id: order.id,
                    status:
                      order.status === "preparing" ? "ready" : "completed",
                  })
                }
              >
                {order.status === "preparing"
                  ? "Preparing"
                  : order.status === "ready"
                    ? "Ready"
                    : "Completed"}
              </button>
              <span className="row-actions">
                <button
                  aria-label={`Edit order ${order.orderNo}`}
                  onClick={() => edit({ kind: "order", record: order })}
                >
                  <Pencil />
                </button>
                <button
                  aria-label={`Delete order ${order.orderNo}`}
                  onClick={() => remove(order.id)}
                >
                  <Trash2 />
                </button>
              </span>
            </div>
          ))
        ) : (
          <Empty
            icon={<ShoppingBag />}
            title="No orders recorded"
            text="Add your first counter order to start the day."
          />
        )}
        {orders.length > pageSize ? (
          <div className="table-pagination" aria-label="Orders pagination">
            <span>
              Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, orders.length)} of {orders.length} orders
            </span>
            <div>
              <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                Previous
              </button>
              <strong>Page {currentPage} of {totalPages}</strong>
              <button type="button" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>
                Next
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function MenuView({
  menu,
  query,
  setQuery,
  post,
  open,
}: {
  menu: MenuItem[];
  query: string;
  setQuery: (value: string) => void;
  post: (payload: Record<string, unknown>) => Promise<ShopData>;
  open: () => void;
}) {
  const [menuError, setMenuError] = useState("");
  async function updateMenu(payload: Record<string, unknown>) {
    setMenuError("");
    try {
      await post(payload);
    } catch (caught) {
      setMenuError(caught instanceof Error ? caught.message : "Could not update the menu.");
    }
  }
  return (
    <div className="page-content">
      {menuError ? <p className="inline-action-error" role="alert">{menuError}</p> : null}
      <div className="page-tools">
        <label className="search-field">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search menu"
          />
        </label>
        <button className="primary" onClick={open}>
          <Plus size={18} /> Add item
        </button>
      </div>
      <div className="menu-cards">
        {menu.map((item) => (
          <article className="menu-item" key={item.id}>
            <div className={`food-mark ${item.category.toLowerCase()}`}>
              <Coffee size={24} />
            </div>
            <div className="menu-copy">
              <span>{item.category}</span>
              <h3>{item.name}</h3>
              <strong>{money(item.price)}</strong>
              <small
                className={
                  item.stockQty <= item.lowStockThreshold ? "low-stock" : ""
                }
              >
                {item.stockQty <= item.lowStockThreshold ? "Low stock · " : ""}
                {item.stockQty} in stock
              </small>
            </div>
            <div className="menu-controls">
              <label className="switch">
                <input
                  type="checkbox"
                  checked={item.isAvailable}
                  onChange={(event) =>
                    updateMenu({
                      kind: "menu-toggle",
                      id: item.id,
                      isAvailable: event.target.checked,
                    })
                  }
                />
                <i />
              </label>
              <div className="stock-stepper" aria-label={`${item.name} stock`}>
                <button
                  onClick={() =>
                    updateMenu({ kind: "stock-adjust", id: item.id, delta: -1 })
                  }
                >
                  −
                </button>
                <b>{item.stockQty}</b>
                <button
                  onClick={() =>
                    updateMenu({ kind: "stock-adjust", id: item.id, delta: 1 })
                  }
                >
                  +
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Cashflow({
  transactions,
  expenses,
  balance,
  selectedDate,
  setSelectedDate,
  open,
  closings,
  post,
  edit,
  remove,
}: {
  transactions: Transaction[];
  expenses: number;
  balance: number;
  selectedDate: string;
  setSelectedDate: (value: string) => void;
  open: (kind: "sale" | "expense") => void;
  closings: DailyClosing[];
  post: (payload: Record<string, unknown>) => Promise<ShopData>;
  edit: (target: EditTarget) => void;
  remove: (id: string) => void;
}) {
  const sales = transactions.filter((item) => item.type === "sale");
  const dailyReports = Object.values(
    sales.reduce<
      Record<
        string,
        { date: string; cash: number; online: number; count: number }
      >
    >((days, item) => {
      const date = dateKey(item.createdAt);
      const mode = item.paymentMode === "online" ? "online" : "cash";
      days[date] ??= { date, cash: 0, online: 0, count: 0 };
      days[date][mode] += item.amount;
      days[date].count += 1;
      return days;
    }, {}),
  ).sort((a, b) => b.date.localeCompare(a.date));
  const visibleSales = selectedDate
    ? sales.filter((item) => dateKey(item.createdAt) === selectedDate)
    : sales;
  const cashTotal = visibleSales
    .filter((item) => (item.paymentMode ?? "cash") === "cash")
    .reduce((sum, item) => sum + item.amount, 0);
  const onlineTotal = visibleSales
    .filter((item) => item.paymentMode === "online")
    .reduce((sum, item) => sum + item.amount, 0);
  const visibleTransactions = selectedDate
    ? transactions.filter((item) => dateKey(item.createdAt) === selectedDate)
    : transactions;
  return (
    <div className="page-content">
      <div className="cash-hero">
        <div>
          <span>Cash in hand</span>
          <strong>{money(balance)}</strong>
          <small>
            Cash sales less all expenses · Expenses {money(expenses)}
          </small>
        </div>
        <BarChart3 size={54} />
      </div>
      <div className="report-toolbar">
        <label>
          <CalendarDays size={18} />
          <span>Report date</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
        </label>
        {selectedDate ? (
          <button className="text-button" onClick={() => setSelectedDate("")}>
            Show all dates
          </button>
        ) : (
          <span>Showing all recorded dates</span>
        )}
      </div>
      <div className="payment-summary">
        <article>
          <span className="payment-icon cash">
            <Banknote />
          </span>
          <div>
            <small>Cash sales</small>
            <strong>{money(cashTotal)}</strong>
          </div>
        </article>
        <article>
          <span className="payment-icon online">
            <Smartphone />
          </span>
          <div>
            <small>UPI / Online sales</small>
            <strong>{money(onlineTotal)}</strong>
          </div>
        </article>
        <article>
          <span className="payment-icon total">
            <TrendingUp />
          </span>
          <div>
            <small>Total sales</small>
            <strong>{money(cashTotal + onlineTotal)}</strong>
          </div>
        </article>
      </div>
      <DailyClosePanel
        key={selectedDate || todayInput}
        date={selectedDate || todayInput}
        transactions={transactions}
        closing={closings.find(
          (item) => item.businessDate === (selectedDate || todayInput),
        )}
        post={post}
      />
      <div className="page-tools">
        <div>
          <p>Day-wise sales</p>
          <h3>
            {selectedDate
              ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString(
                  "en-IN",
                  { day: "numeric", month: "long", year: "numeric" },
                )
              : "Daily collection report"}
          </h3>
        </div>
        <div className="button-pair">
          <button className="secondary" onClick={() => open("expense")}>
            <TrendingDown size={17} /> Expense
          </button>
          <button className="primary" onClick={() => open("sale")}>
            <Plus size={17} /> Add sale
          </button>
        </div>
      </div>
      {!selectedDate ? (
        <section className="daily-report-list">
          {dailyReports.length ? (
            dailyReports.map((report) => (
              <article className="daily-report" key={report.date}>
                <div className="report-date">
                  <CalendarDays />
                  <div>
                    <strong>
                      {new Date(`${report.date}T12:00:00`).toLocaleDateString(
                        "en-IN",
                        {
                          weekday: "short",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        },
                      )}
                    </strong>
                    <small>
                      {report.count} sale{report.count === 1 ? "" : "s"}
                    </small>
                  </div>
                </div>
                <div className="report-splits">
                  <span>
                    Cash <b>{money(report.cash)}</b>
                  </span>
                  <span>
                    UPI / Online <b>{money(report.online)}</b>
                  </span>
                  <strong>{money(report.cash + report.online)}</strong>
                </div>
                <button
                  aria-label={`View report for ${report.date}`}
                  onClick={() => setSelectedDate(report.date)}
                >
                  <ChevronRight />
                </button>
              </article>
            ))
          ) : (
            <Empty
              icon={<BarChart3 />}
              title="No sales yet"
              text="Add a cash or UPI / online sale to start your daily reports."
            />
          )}
        </section>
      ) : null}
      <section className="panel full-panel">
        <div className="panel-head transaction-heading">
          <div>
            <span>Transactions</span>
            <h3>{selectedDate ? "Selected day" : "Latest activity"}</h3>
          </div>
        </div>
        <div className="transaction-list">
          {visibleTransactions.length ? (
            visibleTransactions.map((item) => (
              <div className="transaction" key={item.id}>
                <span className={`transaction-icon ${item.type}`}>
                  {item.type === "sale" ? <TrendingUp /> : <TrendingDown />}
                </span>
                <div>
                  <strong>{item.note || item.category}</strong>
                  <small>
                    {item.category} · {transactionStamp(item.createdAt)}
                    {item.type === "sale" ? (
                      <span
                        className={`payment-badge ${item.paymentMode === "online" ? "online" : "cash"}`}
                      >
                        {item.paymentMode === "online" ? "UPI / Online" : "Cash"}
                      </span>
                    ) : null}
                  </small>
                </div>
                <b className={item.type}>
                  {item.type === "sale" ? "+" : "−"}
                  {money(item.amount)}
                </b>
                <span className="row-actions transaction-actions">
                  <button
                    aria-label="Edit transaction"
                    onClick={() => edit({ kind: "transaction", record: item })}
                  >
                    <Pencil />
                  </button>
                  <button
                    aria-label="Delete transaction"
                    onClick={() => remove(item.id)}
                  >
                    <Trash2 />
                  </button>
                </span>
              </div>
            ))
          ) : (
            <Empty
              icon={<WalletCards />}
              title="No entries on this date"
              text="Choose another date or add a new sale."
            />
          )}
        </div>
      </section>
    </div>
  );
}

function DailyClosePanel({
  date,
  transactions,
  closing,
  post,
}: {
  date: string;
  transactions: Transaction[];
  closing?: DailyClosing;
  post: (payload: Record<string, unknown>) => Promise<ShopData>;
}) {
  const [openingCash, setOpeningCash] = useState(closing?.openingCash ?? 0);
  const [actualCash, setActualCash] = useState(closing?.actualCash ?? 0);
  const [saving, setSaving] = useState(false);
  const [closingError, setClosingError] = useState("");
  const dayEntries = transactions.filter(
    (item) => dateKey(item.createdAt) === date,
  );
  const cashSales = dayEntries
    .filter((item) => item.type === "sale" && item.paymentMode !== "online")
    .reduce((sum, item) => sum + item.amount, 0);
  const dayExpenses = dayEntries
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);
  const expectedCash = openingCash + cashSales - dayExpenses;
  const difference = actualCash - expectedCash;
  async function closeDay() {
    setSaving(true);
    setClosingError("");
    try {
      await post({
        kind: "daily-closing",
        businessDate: date,
        openingCash,
        expectedCash,
        actualCash,
      });
    } catch (caught) {
      setClosingError(caught instanceof Error ? caught.message : "Could not close the day.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="daily-close panel">
      <div className="daily-close-title">
        <div>
          <p className="eyebrow">Daily closing</p>
          <h3>Count the cash drawer</h3>
        </div>
        <span className={closing ? "closed" : "open"}>
          {closing ? "Day closed" : "Ready to close"}
        </span>
      </div>
      <div className="closing-grid">
        <label>
          Opening cash
          <input
            type="number"
            min="0"
            value={openingCash}
            onChange={(event) => setOpeningCash(Number(event.target.value))}
          />
        </label>
        <div>
          <span>Cash sales</span>
          <strong>{money(cashSales)}</strong>
        </div>
        <div>
          <span>Expenses</span>
          <strong>−{money(dayExpenses)}</strong>
        </div>
        <div>
          <span>Expected cash</span>
          <strong>{money(expectedCash)}</strong>
        </div>
        <label>
          Actual cash
          <input
            type="number"
            min="0"
            value={actualCash}
            onChange={(event) => setActualCash(Number(event.target.value))}
          />
        </label>
        <div
          className={
            difference === 0 ? "balanced" : difference < 0 ? "short" : "over"
          }
        >
          <span>Difference</span>
          <strong>
            {difference < 0 ? "−" : difference > 0 ? "+" : ""}
            {money(Math.abs(difference))}
          </strong>
        </div>
      </div>
      {closingError ? <p className="inline-action-error" role="alert">{closingError}</p> : null}
      <button
        className="primary close-day-button"
        disabled={saving}
        onClick={closeDay}
      >
        <Check />{" "}
        {saving ? "Closing…" : closing ? "Update closing" : "Close day"}
      </button>
    </section>
  );
}

function Expenses({
  transactions,
  total,
  reportDate,
  setReportDate,
  open,
  edit,
  remove,
}: {
  transactions: Transaction[];
  total: number;
  reportDate: string;
  setReportDate: (value: string) => void;
  open: () => void;
  edit: (target: EditTarget) => void;
  remove: (id: string) => void;
}) {
  return (
    <div className="page-content">
      <section className="expense-summary">
        <div>
          <span>Total expenses</span>
          <strong>{money(total)}</strong>
          <small>Across {transactions.length} entries</small>
        </div>
        <button className="primary" onClick={open}>
          <Plus size={18} /> Add expense
        </button>
      </section>
      <ReportDateFilter value={reportDate} onChange={setReportDate} />
      <div className="expense-grid">
        {transactions.length ? (
          transactions.map((item) => (
            <article className="expense-card" key={item.id}>
              <span className="expense-icon">
                <ReceiptIndianRupee />
              </span>
              <div>
                <small>{item.category}</small>
                <h3>{item.note || "Shop expense"}</h3>
                <p>
                  {new Date(item.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <strong>{money(item.amount)}</strong>
              <span className="row-actions">
                <button
                  aria-label="Edit expense"
                  onClick={() => edit({ kind: "transaction", record: item })}
                >
                  <Pencil />
                </button>
                <button
                  aria-label="Delete expense"
                  onClick={() => remove(item.id)}
                >
                  <Trash2 />
                </button>
              </span>
            </article>
          ))
        ) : (
          <Empty
            icon={<ReceiptIndianRupee />}
            title="No expenses yet"
            text="Add stock, rent, wages or other shop costs."
          />
        )}
      </div>
    </div>
  );
}

function Counter({
  menu,
  post,
  showReceipt,
}: {
  menu: MenuItem[];
  post: (payload: Record<string, unknown>) => Promise<ShopData>;
  showReceipt: (receipt: ReceiptData) => void;
}) {
  const [basket, setBasket] = useState<MenuItem[]>([]);
  const [paymentMode, setPaymentMode] = useState<"cash" | "online">("cash");
  const [counterSaving, setCounterSaving] = useState(false);
  const checkoutInFlight = useRef(false);
  const [counterError, setCounterError] = useState("");
  const [counterQuery, setCounterQuery] = useState("");
  const [counterCategory, setCounterCategory] = useState("All");
  const categories = ["All", ...new Set(menu.map((item) => item.category))];
  const visibleCounterItems = menu.filter((item) =>
    (counterCategory === "All" || item.category === counterCategory) &&
    `${item.name} ${item.category}`.toLowerCase().includes(counterQuery.trim().toLowerCase())
  );
  const total = basket.reduce((sum, item) => sum + item.price, 0);
  const itemCount = (id: string) =>
    basket.filter((basketItem) => basketItem.id === id).length;
  const basketLines = Array.from(
    new Map(basket.map((item) => [item.id, item])).values(),
  ).map((item) => ({ ...item, quantity: itemCount(item.id) }));
  const removeOne = (id: string) => {
    const index = basket.findLastIndex((item) => item.id === id);
    if (index < 0) return;
    setBasket((items) => items.filter((_, itemIndex) => itemIndex !== index));
  };
  async function finish() {
    if (!total || checkoutInFlight.current) return;
    checkoutInFlight.current = true;
    setCounterSaving(true);
    setCounterError("");
    try {
      const result = await post({
        kind: "order",
        customer: "Walk-in",
        total,
        itemCount: basket.length,
        paymentMode,
        date: todayInput,
        items: basketLines.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
      });
      const order = result.orders.find((entry) => entry.id === result.createdOrderId);
      if (!order) {
        // Saved successfully; never invite the cashier to retry the payment.
        setCounterError("Order saved. Open Orders to review the new order.");
      } else {
        showReceipt({
          orderNo: order.orderNo,
          createdAt: order.createdAt,
          paymentMode,
          total,
          items: basketLines.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
        });
      }
      setBasket([]);
      setPaymentMode("cash");
    } catch (caught) {
      setCounterError(caught instanceof Error ? caught.message : "Could not complete this order.");
    } finally {
      checkoutInFlight.current = false;
      setCounterSaving(false);
    }
  }
  return (
    <div className="counter-layout">
      <section>
        <div className="counter-heading">
          <div>
            <p className="eyebrow">Counter mode</p>
            <h2>Tap to add</h2>
          </div>
          <span>{menu.length} available</span>
        </div>
        <div className="counter-filters">
          <label className="counter-search">
            <Search size={17} />
            <input value={counterQuery} onChange={(event) => setCounterQuery(event.target.value)} placeholder="Find a drink or snack…" aria-label="Search counter menu" />
          </label>
          <div className="counter-categories" role="group" aria-label="Filter menu by category">
            {categories.map((category) => (
              <button type="button" key={category} aria-pressed={counterCategory === category} className={counterCategory === category ? "active" : ""} onClick={() => setCounterCategory(category)}>{category}</button>
            ))}
          </div>
        </div>
        <div className="counter-menu">
          {visibleCounterItems.map((item) => {
            const quantity = itemCount(item.id);
            return (
              <button
                className={quantity ? "selected" : ""}
                key={item.id}
                disabled={counterSaving || quantity >= item.stockQty}
                onClick={() => {
                  setCounterError("");
                  setBasket((items) => [...items, item]);
                }}
              >
                <span className="counter-item-top">
                  <span className="counter-item-icon">
                    <Coffee />
                  </span>
                  <small>{item.category}</small>
                  {quantity ? <b>{quantity}</b> : null}
                </span>
                <span className="counter-item-name">{item.name}</span>
                <span className="counter-item-foot">
                  <strong>{money(item.price)}</strong>
                  <em>Add +</em>
                </span>
              </button>
            );
          })}
        </div>
      </section>
      <aside className="basket">
        <div className="panel-head">
          <div>
            <span>Current order</span>
            <h3>
              {basket.length} item{basket.length === 1 ? "" : "s"}
            </h3>
          </div>
          <button onClick={() => setBasket([])}>Clear</button>
        </div>
        <div className="basket-items">
          {basket.length ? (
            basketLines.map((item) => (
              <div className="basket-line" key={item.id}>
                <div className="basket-line-copy">
                  <strong>{item.name}</strong>
                  <small>{money(item.price)} each</small>
                </div>
                <div
                  className="quantity-stepper"
                  aria-label={`${item.name} quantity`}
                >
                  <button
                    type="button"
                    aria-label={`Remove one ${item.name}`}
                    onClick={() => removeOne(item.id)}
                  >
                    −
                  </button>
                  <b>{item.quantity}</b>
                  <button
                    type="button"
                    aria-label={`Add one ${item.name}`}
                    disabled={counterSaving || item.quantity >= item.stockQty}
                    onClick={() => {
                      setCounterError("");
                      setBasket((items) => [...items, item]);
                    }}
                  >
                    +
                  </button>
                </div>
                <strong>{money(item.price * item.quantity)}</strong>
              </div>
            ))
          ) : (
            <Empty
              icon={<ShoppingBag />}
              title="Order is empty"
              text="Tap menu items to add them."
            />
          )}
        </div>
        <div className="basket-total">
          <span>Total</span>
          <strong>{money(total)}</strong>
        </div>
        <div className="payment-choice" aria-label="Payment method">
          <button
            className={paymentMode === "cash" ? "active" : ""}
            onClick={() => setPaymentMode("cash")}
          >
            <Banknote /> Cash
          </button>
          <button
            className={paymentMode === "online" ? "active" : ""}
            onClick={() => setPaymentMode("online")}
          >
            <Smartphone /> Online
          </button>
        </div>
        {counterError ? <div className="counter-error" role="alert">{counterError}</div> : null}
        <button
          className="checkout-btn"
          disabled={!basket.length || counterSaving}
          onClick={() => void finish()}
        >
          {counterSaving ? <RefreshCw size={18} className="spinning" /> : <Check size={19} />}
          {counterSaving ? "Saving order…" : "Complete order"}
        </button>
      </aside>
    </div>
  );
}

function OrderRow({ order }: { order: Order }) {
  return (
    <div className="order-row">
      <span className="order-number">#{order.orderNo}</span>
      <div>
        <strong>{order.customer}</strong>
        <small>
          {order.itemCount} item{order.itemCount === 1 ? "" : "s"}
        </small>
      </div>
      <strong>{money(order.total)}</strong>
      <span className={`status-dot ${order.status}`}>{order.status}</span>
    </div>
  );
}

function ReportDateFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="report-toolbar page-date-filter">
      <label>
        <CalendarDays size={18} />
        <span>Report date</span>
        <input
          type="date"
          aria-label="Filter this report by date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      {value ? (
        <button className="text-button" onClick={() => onChange("")}>
          Show all dates
        </button>
      ) : (
        <span>Showing all recorded dates</span>
      )}
    </div>
  );
}

function Empty({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="empty-state">
      <span>{icon}</span>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function EntryModal({
  kind,
  close,
  post,
}: {
  kind: "menu" | "sale" | "expense" | "order";
  close: () => void;
  post: (payload: Record<string, unknown>) => Promise<ShopData>;
}) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const titles = {
    menu: "Add menu item",
    sale: "Record a sale",
    expense: "Add expense",
    order: "New counter order",
  };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = { kind };
    form.forEach(
      (value, key) =>
        (payload[key] =
          key === "price" ||
          key === "amount" ||
          key === "total" ||
          key === "itemCount" ||
          key === "stockQty" ||
          key === "lowStockThreshold"
            ? Number(value)
            : value),
    );
    if (kind === "sale" || kind === "expense") payload.type = kind;
    try {
      await post(payload);
      close();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Could not save");
      setSaving(false);
    }
  }
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <section className="entry-modal" role="dialog" aria-modal="true">
        <div className="modal-head">
          <div>
            <span>Irani Tea</span>
            <h2>{titles[kind]}</h2>
          </div>
          <button onClick={close} aria-label="Close">
            <X />
          </button>
        </div>
        <form onSubmit={submit}>
          {kind === "menu" ? (
            <>
              <label>
                Item name
                <input name="name" required placeholder="e.g. Irani Chai" />
              </label>
              <div className="form-row">
                <label>
                  Category
                  <select name="category">
                    <option>Tea</option>
                    <option>Snacks</option>
                    <option>Drinks</option>
                    <option>Breakfast</option>
                  </select>
                </label>
                <label>
                  Price (₹)
                  <input
                    name="price"
                    type="number"
                    min="1"
                    required
                    placeholder="25"
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  Opening stock
                  <input
                    name="stockQty"
                    type="number"
                    min="0"
                    defaultValue="50"
                    required
                  />
                </label>
                <label>
                  Low-stock warning
                  <input
                    name="lowStockThreshold"
                    type="number"
                    min="0"
                    defaultValue="10"
                    required
                  />
                </label>
              </div>
            </>
          ) : null}
          {kind === "expense" ? (
            <>
              <label>
                Expense category
                <select name="category">
                  <option>Stock</option>
                  <option>Milk & tea</option>
                  <option>Rent</option>
                  <option>Wages</option>
                  <option>Gas & electricity</option>
                  <option>Other</option>
                </select>
              </label>
              <label>
                Amount (₹)
                <input
                  name="amount"
                  type="number"
                  min="1"
                  required
                  placeholder="500"
                />
              </label>
              <div className="form-row">
                <label>
                  Date
                  <input
                    name="date"
                    type="date"
                    defaultValue={todayInput}
                    required
                  />
                </label>
                <label>
                  Time
                  <input
                    name="time"
                    type="time"
                    defaultValue={indiaTimeInput()}
                    required
                  />
                </label>
              </div>
              <label>
                Note
                <input name="note" required placeholder="What was this for?" />
              </label>
            </>
          ) : null}
          {kind === "sale" ? (
            <>
              <label>
                Amount received (₹)
                <input
                  name="amount"
                  type="number"
                  min="1"
                  required
                  placeholder="250"
                />
              </label>
              <div className="form-row">
                <label>
                  Date
                  <input
                    name="date"
                    type="date"
                    defaultValue={todayInput}
                    required
                  />
                </label>
                <label>
                  Time
                  <input
                    name="time"
                    type="time"
                    defaultValue={indiaTimeInput()}
                    required
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  Payment method
                  <select name="paymentMode">
                    <option value="cash">Cash</option>
                    <option value="online">Online / UPI</option>
                  </select>
                </label>
                <label>
                  Sale type
                  <select name="category">
                    <option>Counter sale</option>
                    <option>Delivery</option>
                    <option>Catering</option>
                    <option>Other income</option>
                  </select>
                </label>
              </div>
              <label>
                Note
                <input name="note" placeholder="Optional note" />
              </label>
            </>
          ) : null}
          {kind === "order" ? (
            <>
              <label>
                Customer
                <input name="customer" placeholder="Walk-in" />
              </label>
              <div className="form-row">
                <label>
                  Items
                  <input
                    name="itemCount"
                    type="number"
                    min="1"
                    defaultValue="1"
                    required
                  />
                </label>
                <label>
                  Total (₹)
                  <input
                    name="total"
                    type="number"
                    min="1"
                    required
                    placeholder="100"
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  Date
                  <input
                    name="date"
                    type="date"
                    defaultValue={todayInput}
                    required
                  />
                </label>
                <label>
                  Time
                  <input
                    name="time"
                    type="time"
                    defaultValue={indiaTimeInput()}
                    required
                  />
                </label>
              </div>
              <label>
                Payment method
                <select name="paymentMode">
                  <option value="cash">Cash</option>
                  <option value="online">Online / UPI</option>
                </select>
              </label>
            </>
          ) : null}
          {message ? <p className="form-error">{message}</p> : null}
          <button className="modal-submit" disabled={saving}>
            {saving ? "Saving…" : "Save entry"}
          </button>
        </form>
      </section>
    </div>
  );
}

function EditRecordModal({
  target,
  close,
  post,
}: {
  target: EditTarget;
  close: () => void;
  post: (payload: Record<string, unknown>) => Promise<ShopData>;
}) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const recordDate = dateKey(target.record.createdAt);
  const recordTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(target.record.createdAt));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {
      kind: `${target.kind}-update`,
      id: target.record.id,
    };
    form.forEach((value, key) => {
      payload[key] = ["amount", "total", "itemCount"].includes(key)
        ? Number(value)
        : value;
    });
    if (target.kind === "transaction") payload.type = target.record.type;
    try {
      await post(payload);
      close();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Could not update");
      setSaving(false);
    }
  }
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <section className="entry-modal" role="dialog" aria-modal="true">
        <div className="modal-head">
          <div>
            <span>Correct a record</span>
            <h2>Edit {target.kind}</h2>
          </div>
          <button onClick={close} aria-label="Close">
            <X />
          </button>
        </div>
        <form onSubmit={submit}>
          {target.kind === "transaction" ? (
            <>
              <label>
                Category
                <input
                  name="category"
                  defaultValue={target.record.category}
                  required
                />
              </label>
              <label>
                Amount (₹)
                <input
                  name="amount"
                  type="number"
                  min="1"
                  defaultValue={target.record.amount}
                  required
                />
              </label>
              <div className="form-row">
                <label>
                  Date
                  <input
                    name="date"
                    type="date"
                    defaultValue={recordDate}
                    required
                  />
                </label>
                <label>
                  Time
                  <input
                    name="time"
                    type="time"
                    defaultValue={recordTime}
                    required
                  />
                </label>
              </div>
              {target.record.type === "sale" ? (
                <label>
                  Payment method
                  <select
                    name="paymentMode"
                    defaultValue={target.record.paymentMode}
                  >
                    <option value="cash">Cash</option>
                    <option value="online">Online / UPI</option>
                  </select>
                </label>
              ) : null}
              <label>
                Note
                <input name="note" defaultValue={target.record.note} />
              </label>
            </>
          ) : (
            <>
              <label>
                Customer
                <input
                  name="customer"
                  defaultValue={target.record.customer}
                  required
                />
              </label>
              <div className="form-row">
                <label>
                  Items
                  <input
                    name="itemCount"
                    type="number"
                    min="1"
                    defaultValue={target.record.itemCount}
                    required
                  />
                </label>
                <label>
                  Total (₹)
                  <input
                    name="total"
                    type="number"
                    min="1"
                    defaultValue={target.record.total}
                    required
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  Date
                  <input
                    name="date"
                    type="date"
                    defaultValue={recordDate}
                    required
                  />
                </label>
                <label>
                  Time
                  <input
                    name="time"
                    type="time"
                    defaultValue={recordTime}
                    required
                  />
                </label>
              </div>
            </>
          )}
          {message ? <p className="form-error">{message}</p> : null}
          <button className="modal-submit" disabled={saving}>
            {saving ? "Updating…" : "Update record"}
          </button>
        </form>
      </section>
    </div>
  );
}

function ReceiptModal({
  receipt,
  close,
}: {
  receipt: ReceiptData;
  close: () => void;
}) {
  const receiptText = [
    `Irani Tea · Receipt #${receipt.orderNo}`,
    ...receipt.items.map(
      (item) =>
        `${item.name} x${item.quantity} — ${money(item.price * item.quantity)}`,
    ),
    `Total: ${money(receipt.total)}`,
    `Paid by: ${receipt.paymentMode === "online" ? "Online / UPI" : "Cash"}`,
    "Thank you!",
  ].join("\n");
  async function shareReceipt() {
    if (navigator.share) {
      await navigator.share({
        title: `Irani Tea receipt #${receipt.orderNo}`,
        text: receiptText,
      });
      return;
    }
    window.open(
      `https://wa.me/?text=${encodeURIComponent(receiptText)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }
  return (
    <div className="modal-backdrop receipt-backdrop">
      <section className="receipt-modal" role="dialog" aria-modal="true">
        <button
          className="receipt-close"
          onClick={close}
          aria-label="Close receipt"
        >
          <X />
        </button>
        <div className="receipt-brand">
          <Image src="/icon.svg" width={58} height={58} alt="Irani Tea" />
          <h2>Irani Tea</h2>
          <p>Freshly brewed with love</p>
        </div>
        <div className="receipt-meta">
          <span>Receipt #{receipt.orderNo}</span>
          <span>{transactionStamp(receipt.createdAt)}</span>
        </div>
        <div className="receipt-lines">
          {receipt.items.map((item) => (
            <div key={item.name}>
              <span>
                {item.name}
                <small>
                  {item.quantity} × {money(item.price)}
                </small>
              </span>
              <strong>{money(item.price * item.quantity)}</strong>
            </div>
          ))}
        </div>
        <div className="receipt-total">
          <span>Total</span>
          <strong>{money(receipt.total)}</strong>
        </div>
        <p className="receipt-payment">
          Paid by {receipt.paymentMode === "online" ? "Online / UPI" : "Cash"}
        </p>
        <div className="receipt-actions">
          <button className="secondary" onClick={() => window.print()}>
            <Printer /> Print
          </button>
          <button className="primary" onClick={shareReceipt}>
            <ShareIcon /> Share
          </button>
        </div>
      </section>
    </div>
  );
}

function ShareIcon() {
  return <Smartphone size={17} />;
}
