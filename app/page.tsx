"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import { Banknote, BarChart3, BookOpen, CalendarDays, Check, ChevronRight, CircleDollarSign, Cloud, Coffee, Download, IndianRupee, LayoutDashboard, Menu, Plus, ReceiptIndianRupee, Search, Settings, ShoppingBag, Smartphone, Store, TrendingDown, TrendingUp, WalletCards, WifiOff, X } from "lucide-react";
import Image from "next/image";

import type { MenuItem, Order, ShopData, Transaction } from "@/lib/shop-data";

type View = "dashboard" | "orders" | "menu" | "cashflow" | "expenses" | "storefront";
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const nav: { id: View; label: string; icon: typeof Store }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "menu", label: "Menu", icon: BookOpen },
  { id: "cashflow", label: "Sales report", icon: WalletCards },
  { id: "expenses", label: "Expenses", icon: ReceiptIndianRupee },
  { id: "storefront", label: "Counter", icon: Store },
];

const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;
const todayLabel = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
const indiaDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" });
const dateKey = (value: string | Date) => indiaDate.format(new Date(value));
const todayInput = dateKey(new Date());
const indiaTimeInput = () => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
const transactionStamp = (value: string) => {
  const date = new Date(value);
  const dateLabel = date.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });
  const usesOldPlaceholderTime = date.getUTCHours() === 12 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0;
  if (usesOldPlaceholderTime) return `${dateLabel} · Time not recorded`;
  return date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
};
const storageKey = "irani-tea-shop-data-v2";
const starterMenu: MenuItem[] = [
  { id: "irani-tea", name: "Irani Tea", category: "Tea", price: 15, isAvailable: true },
  { id: "lemon-tea", name: "Lemon Tea", category: "Tea", price: 20, isAvailable: true },
  { id: "special-irani", name: "Special Irani Tea", category: "Tea", price: 20, isAvailable: true },
  { id: "horlicks", name: "Horlicks", category: "Health Drinks", price: 20, isAvailable: true },
  { id: "boost", name: "Boost", category: "Health Drinks", price: 20, isAvailable: true },
  { id: "osmania-1", name: "Osmania Biscuit (1 Pc)", category: "Biscuits", price: 5, isAvailable: true },
  { id: "osmania-2", name: "Osmania Biscuit (2 Pcs)", category: "Biscuits", price: 10, isAvailable: true },
  { id: "water-500", name: "Water Bottle 500 ml", category: "Water", price: 10, isAvailable: true },
  { id: "water-1l", name: "Water Bottle 1 Litre", category: "Water", price: 20, isAvailable: true },
];
const starterData: ShopData = { menu: starterMenu, orders: [], transactions: [] };

export default function Home() {
  const [view, setView] = useState<View>("dashboard");
  const [data, setData] = useState<ShopData>(starterData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"menu" | "sale" | "expense" | "order" | null>(null);
  const [query, setQuery] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [syncState, setSyncState] = useState<"synced" | "local" | "offline">("synced");
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);

  async function loadData() {
    try {
      const response = await fetch("/api/shop", { cache: "no-store" });
      if (!response.ok) throw new Error("Database unavailable");
      const fresh = await response.json() as ShopData;
      setData(fresh);
      window.localStorage.setItem(storageKey, JSON.stringify(fresh));
      setSyncState("synced");
      setError("");
    } catch {
      const saved = window.localStorage.getItem(storageKey);
      setData(saved ? JSON.parse(saved) as ShopData : starterData);
      const state = navigator.onLine ? "local" : "offline";
      setSyncState(state);
      setError(state === "offline" ? "You’re offline. Showing the latest saved shop data; editing will resume when the connection returns." : "Neon is not connected. Showing local sample data until DATABASE_URL is configured.");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    queueMicrotask(() => void loadData());
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    const onOnline = () => loadData();
    const onOffline = () => setSyncState("offline");
    const onInstall = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent); };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("beforeinstallprompt", onInstall);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("beforeinstallprompt", onInstall);
    };
  }, []);

  async function post(payload: Record<string, unknown>) {
    if (!navigator.onLine) throw new Error("This entry needs an internet connection to sync with Neon.");
    const response = await fetch("/api/shop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json() as ShopData & { error?: string };
    if (!response.ok) throw new Error(result.error || "Could not save this entry.");
    setData(result);
    window.localStorage.setItem(storageKey, JSON.stringify(result));
    setSyncState("synced");
  }

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstallPrompt(null);
  }

  const sales = data.transactions.filter((item) => item.type === "sale").reduce((sum, item) => sum + item.amount, 0);
  const cashSales = data.transactions.filter((item) => item.type === "sale" && (item.paymentMode ?? "cash") === "cash").reduce((sum, item) => sum + item.amount, 0);
  const expenses = data.transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  const balance = cashSales - expenses;
  const overallNet = sales - expenses;
  const activeOrders = data.orders.filter((order) => order.status !== "completed");
  const filteredMenu = data.menu.filter((item) => `${item.name} ${item.category}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="app-shell">
      {mobileNavOpen ? <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}/> : null}
      <aside className={`sidebar${mobileNavOpen ? " mobile-open" : ""}`}>
        <div className="shop-brand"><span className="brand-cup"><Image src="/icon.svg" width={48} height={48} alt="Irani Tea logo" priority/></span><div><strong>Irani Tea</strong><small>Shop manager</small></div></div>
        <nav className="side-nav" aria-label="App navigation">
          {nav.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? "active" : ""} onClick={() => { setView(id); setMobileNavOpen(false); }}><Icon size={19}/><span>{label}</span>{id === "orders" && activeOrders.length > 0 ? <b>{activeOrders.length}</b> : null}</button>)}
        </nav>
        <div className="shop-status"><span/><div><strong>Shop is open</strong><small>7:00 AM – 11:00 PM</small></div></div>
        <button className="settings-row"><Settings size={18}/> Settings</button>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div className="topbar-title"><button className="mobile-menu" aria-label="Open main navigation" onClick={() => setMobileNavOpen(true)}><Menu size={20}/></button><Image className="mobile-logo" src="/icon.svg" width={42} height={42} alt=""/><div><p>{todayLabel}</p><h1>{nav.find((item) => item.id === view)?.label}</h1></div></div>
          <div className="top-actions"><span className={`sync-state ${syncState}`}>{syncState === "synced" ? <Cloud size={15}/> : <WifiOff size={15}/>}<span>{syncState === "synced" ? "Neon synced" : syncState === "offline" ? "Offline" : "Local cache"}</span></span>{installPrompt ? <button className="install-button" onClick={installApp}><Download size={17}/> Install app</button> : null}<button className="search-button" aria-label="Search"><Search size={19}/></button><button className="quick-order" onClick={() => setModal("order")}><Plus size={18}/> New order</button><span className="avatar"><Image src="/icon.svg" width={40} height={40} alt=""/></span></div>
        </header>

        {error ? <div className="error-banner"><span>{error}</span><button onClick={loadData}>Try again</button></div> : null}
        {loading ? <div className="loading"><Coffee size={30}/><span>Opening your shop…</span></div> : null}
        {!loading && view === "dashboard" ? <Dashboard data={data} sales={sales} expenses={expenses} balance={balance} overallNet={overallNet} setView={setView} open={setModal}/> : null}
        {!loading && view === "orders" ? <Orders orders={data.orders} post={post} open={() => setModal("order")}/> : null}
        {!loading && view === "menu" ? <MenuView menu={filteredMenu} query={query} setQuery={setQuery} post={post} open={() => setModal("menu")}/> : null}
        {!loading && view === "cashflow" ? <Cashflow transactions={data.transactions} expenses={expenses} balance={balance} open={setModal}/> : null}
        {!loading && view === "expenses" ? <Expenses transactions={data.transactions.filter((item) => item.type === "expense")} total={expenses} open={() => setModal("expense")}/> : null}
        {!loading && view === "storefront" ? <Counter menu={data.menu.filter((item) => item.isAvailable)} post={post}/> : null}
      </main>

      {modal ? <EntryModal kind={modal} close={() => setModal(null)} post={post}/> : null}
    </div>
  );
}

function Dashboard({ data, sales, expenses, balance, overallNet, setView, open }: { data: ShopData; sales: number; expenses: number; balance: number; overallNet: number; setView: (view: View) => void; open: (kind: "sale" | "expense" | "order") => void }) {
  const cards = [
    { label: "Total sales", value: sales, detail: `${data.orders.length} orders recorded`, icon: TrendingUp, tone: "coffee" },
    { label: "Expenses", value: expenses, detail: `${data.transactions.filter((item) => item.type === "expense").length} entries`, icon: TrendingDown, tone: "red" },
    { label: "Cash balance", value: balance, detail: "Cash sales minus expenses", icon: IndianRupee, tone: "gold" },
    { label: "Menu items", value: data.menu.length, detail: `${data.menu.filter((item) => item.isAvailable).length} available`, icon: Coffee, tone: "blue", plain: true },
    { label: "Overall net", value: overallNet, detail: "All sales minus expenses", icon: CircleDollarSign, tone: overallNet >= 0 ? "gold" : "red", wide: true },
  ];
  return <div className="page-content">
    <section className="welcome"><div><p className="eyebrow">Today at a glance</p><h2>Good evening, boss.</h2><p>Here’s how Irani Tea is doing today.</p></div><div className="welcome-mark"><Coffee size={38}/><span>Fresh since 2024</span></div></section>
    <div className="metric-grid">{cards.map(({ label, value, detail, icon: Icon, tone, plain, wide }) => <article className={`metric${wide ? " metric-wide" : ""}`} key={label}><div className={`metric-icon ${tone}`}><Icon size={20}/></div><span>{label}</span><strong>{plain ? value : money(value)}</strong><small>{detail}</small></article>)}</div>
    <section className="dashboard-grid">
      <div className="panel"><div className="panel-head"><div><span>Recent orders</span><h3>Kitchen queue</h3></div><button onClick={() => setView("orders")}>View all <ChevronRight size={16}/></button></div><div className="order-list">{data.orders.length ? data.orders.slice(0, 5).map((order) => <OrderRow order={order} key={order.id}/>) : <Empty icon={<ShoppingBag/>} title="No orders yet" text="Create the first order when a customer arrives."/>}</div></div>
      <div className="panel quick-panel"><div className="panel-head"><div><span>Quick actions</span><h3>Keep things moving</h3></div></div><button onClick={() => open("order")}><span className="quick-icon coffee"><ShoppingBag/></span><div><strong>New counter order</strong><small>Record an order and sale</small></div><ChevronRight/></button><button onClick={() => open("expense")}><span className="quick-icon red"><ReceiptIndianRupee/></span><div><strong>Add an expense</strong><small>Stock, rent or supplies</small></div><ChevronRight/></button><button onClick={() => open("sale")}><span className="quick-icon gold"><CircleDollarSign/></span><div><strong>Record a sale</strong><small>Cash or online payment</small></div><ChevronRight/></button></div>
    </section>
  </div>;
}

function Orders({ orders, post, open }: { orders: Order[]; post: (payload: Record<string, unknown>) => Promise<void>; open: () => void }) {
  return <div className="page-content"><div className="page-tools"><div><p>Track every cup and snack from counter to collection.</p></div><button className="primary" onClick={open}><Plus size={18}/> Add order</button></div><section className="panel full-panel"><div className="table-head"><span>Order</span><span>Customer</span><span>Items</span><span>Total</span><span>Status</span></div>{orders.length ? orders.map((order) => <div className="table-row" key={order.id}><strong>#{order.orderNo}</strong><span>{order.customer}</span><span>{order.itemCount}</span><strong>{money(order.total)}</strong><button className={`status ${order.status}`} onClick={() => post({ kind: "order-status", id: order.id, status: order.status === "preparing" ? "ready" : "completed" })}>{order.status === "preparing" ? "Preparing" : order.status === "ready" ? "Ready" : "Completed"}</button></div>) : <Empty icon={<ShoppingBag/>} title="No orders recorded" text="Add your first counter order to start the day."/>}</section></div>;
}

function MenuView({ menu, query, setQuery, post, open }: { menu: MenuItem[]; query: string; setQuery: (value: string) => void; post: (payload: Record<string, unknown>) => Promise<void>; open: () => void }) {
  return <div className="page-content"><div className="page-tools"><label className="search-field"><Search size={18}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search menu"/></label><button className="primary" onClick={open}><Plus size={18}/> Add item</button></div><div className="menu-cards">{menu.map((item) => <article className="menu-item" key={item.id}><div className={`food-mark ${item.category.toLowerCase()}`}><Coffee size={24}/></div><div className="menu-copy"><span>{item.category}</span><h3>{item.name}</h3><strong>{money(item.price)}</strong></div><label className="switch"><input type="checkbox" checked={item.isAvailable} onChange={(event) => post({ kind: "menu-toggle", id: item.id, isAvailable: event.target.checked })}/><i/></label></article>)}</div></div>;
}

function Cashflow({ transactions, expenses, balance, open }: { transactions: Transaction[]; expenses: number; balance: number; open: (kind: "sale" | "expense") => void }) {
  const [selectedDate, setSelectedDate] = useState("");
  const sales = transactions.filter((item) => item.type === "sale");
  const dailyReports = Object.values(sales.reduce<Record<string, { date: string; cash: number; online: number; count: number }>>((days, item) => {
    const date = dateKey(item.createdAt);
    const mode = item.paymentMode === "online" ? "online" : "cash";
    days[date] ??= { date, cash: 0, online: 0, count: 0 };
    days[date][mode] += item.amount;
    days[date].count += 1;
    return days;
  }, {})).sort((a, b) => b.date.localeCompare(a.date));
  const visibleSales = selectedDate ? sales.filter((item) => dateKey(item.createdAt) === selectedDate) : sales;
  const cashTotal = visibleSales.filter((item) => (item.paymentMode ?? "cash") === "cash").reduce((sum, item) => sum + item.amount, 0);
  const onlineTotal = visibleSales.filter((item) => item.paymentMode === "online").reduce((sum, item) => sum + item.amount, 0);
  const visibleTransactions = selectedDate ? transactions.filter((item) => dateKey(item.createdAt) === selectedDate) : transactions;
  return <div className="page-content">
    <div className="cash-hero"><div><span>Cash in hand</span><strong>{money(balance)}</strong><small>Cash sales less all expenses · Expenses {money(expenses)}</small></div><BarChart3 size={54}/></div>
    <div className="report-toolbar"><label><CalendarDays size={18}/><span>Report date</span><input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)}/></label>{selectedDate ? <button className="text-button" onClick={() => setSelectedDate("")}>Show all dates</button> : <span>Showing all recorded dates</span>}</div>
    <div className="payment-summary"><article><span className="payment-icon cash"><Banknote/></span><div><small>Cash sales</small><strong>{money(cashTotal)}</strong></div></article><article><span className="payment-icon online"><Smartphone/></span><div><small>Online sales</small><strong>{money(onlineTotal)}</strong></div></article><article><span className="payment-icon total"><TrendingUp/></span><div><small>Total sales</small><strong>{money(cashTotal + onlineTotal)}</strong></div></article></div>
    <div className="page-tools"><div><p>Day-wise sales</p><h3>{selectedDate ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "Daily collection report"}</h3></div><div className="button-pair"><button className="secondary" onClick={() => open("expense")}><TrendingDown size={17}/> Expense</button><button className="primary" onClick={() => open("sale")}><Plus size={17}/> Add sale</button></div></div>
    {!selectedDate ? <section className="daily-report-list">{dailyReports.length ? dailyReports.map((report) => <article className="daily-report" key={report.date}><div className="report-date"><CalendarDays/><div><strong>{new Date(`${report.date}T12:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}</strong><small>{report.count} sale{report.count === 1 ? "" : "s"}</small></div></div><div className="report-splits"><span>Cash <b>{money(report.cash)}</b></span><span>Online <b>{money(report.online)}</b></span><strong>{money(report.cash + report.online)}</strong></div><button aria-label={`View report for ${report.date}`} onClick={() => setSelectedDate(report.date)}><ChevronRight/></button></article>) : <Empty icon={<BarChart3/>} title="No sales yet" text="Add a cash or online sale to start your daily reports."/>}</section> : null}
    <section className="panel full-panel"><div className="panel-head transaction-heading"><div><span>Transactions</span><h3>{selectedDate ? "Selected day" : "Latest activity"}</h3></div></div><div className="transaction-list">{visibleTransactions.length ? visibleTransactions.map((item) => <div className="transaction" key={item.id}><span className={`transaction-icon ${item.type}`}>{item.type === "sale" ? <TrendingUp/> : <TrendingDown/>}</span><div><strong>{item.note || item.category}</strong><small>{item.category} · {transactionStamp(item.createdAt)}{item.type === "sale" ? <span className={`payment-badge ${item.paymentMode === "online" ? "online" : "cash"}`}>{item.paymentMode === "online" ? "Online" : "Cash"}</span> : null}</small></div><b className={item.type}>{item.type === "sale" ? "+" : "−"}{money(item.amount)}</b></div>) : <Empty icon={<WalletCards/>} title="No entries on this date" text="Choose another date or add a new sale."/>}</div></section>
  </div>;
}

function Expenses({ transactions, total, open }: { transactions: Transaction[]; total: number; open: () => void }) {
  return <div className="page-content"><section className="expense-summary"><div><span>Total expenses</span><strong>{money(total)}</strong><small>Across {transactions.length} entries</small></div><button className="primary" onClick={open}><Plus size={18}/> Add expense</button></section><div className="expense-grid">{transactions.length ? transactions.map((item) => <article className="expense-card" key={item.id}><span className="expense-icon"><ReceiptIndianRupee/></span><div><small>{item.category}</small><h3>{item.note || "Shop expense"}</h3><p>{new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p></div><strong>{money(item.amount)}</strong></article>) : <Empty icon={<ReceiptIndianRupee/>} title="No expenses yet" text="Add stock, rent, wages or other shop costs."/>}</div></div>;
}

function Counter({ menu, post }: { menu: MenuItem[]; post: (payload: Record<string, unknown>) => Promise<void> }) {
  const [basket, setBasket] = useState<MenuItem[]>([]);
  const [paymentMode, setPaymentMode] = useState<"cash" | "online">("cash");
  const total = basket.reduce((sum, item) => sum + item.price, 0);
  async function finish() { if (!total) return; await post({ kind: "order", customer: "Walk-in", total, itemCount: basket.length, paymentMode, date: todayInput }); setBasket([]); setPaymentMode("cash"); }
  return <div className="counter-layout"><section><div className="counter-heading"><div><p className="eyebrow">Counter mode</p><h2>Tap to add</h2></div><span>{menu.length} available</span></div><div className="counter-menu">{menu.map((item) => <button key={item.id} onClick={() => setBasket((items) => [...items, item])}><Coffee/><span>{item.name}</span><strong>{money(item.price)}</strong></button>)}</div></section><aside className="basket"><div className="panel-head"><div><span>Current order</span><h3>{basket.length} items</h3></div><button onClick={() => setBasket([])}>Clear</button></div><div className="basket-items">{basket.length ? basket.map((item, index) => <div key={`${item.id}-${index}`}><span>{item.name}</span><strong>{money(item.price)}</strong></div>) : <Empty icon={<ShoppingBag/>} title="Order is empty" text="Tap menu items to add them."/>}</div><div className="basket-total"><span>Total</span><strong>{money(total)}</strong></div><div className="payment-choice" aria-label="Payment method"><button className={paymentMode === "cash" ? "active" : ""} onClick={() => setPaymentMode("cash")}><Banknote/> Cash</button><button className={paymentMode === "online" ? "active" : ""} onClick={() => setPaymentMode("online")}><Smartphone/> Online</button></div><button className="checkout-btn" disabled={!basket.length} onClick={finish}><Check size={19}/> Complete order</button></aside></div>;
}

function OrderRow({ order }: { order: Order }) { return <div className="order-row"><span className="order-number">#{order.orderNo}</span><div><strong>{order.customer}</strong><small>{order.itemCount} item{order.itemCount === 1 ? "" : "s"}</small></div><strong>{money(order.total)}</strong><span className={`status-dot ${order.status}`}>{order.status}</span></div>; }

function Empty({ icon, title, text }: { icon: ReactNode; title: string; text: string }) { return <div className="empty-state"><span>{icon}</span><strong>{title}</strong><p>{text}</p></div>; }

function EntryModal({ kind, close, post }: { kind: "menu" | "sale" | "expense" | "order"; close: () => void; post: (payload: Record<string, unknown>) => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const titles = { menu: "Add menu item", sale: "Record a sale", expense: "Add expense", order: "New counter order" };
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setSaving(true); setMessage(""); const form = new FormData(event.currentTarget); const payload: Record<string, unknown> = { kind };
    form.forEach((value, key) => payload[key] = key === "price" || key === "amount" || key === "total" || key === "itemCount" ? Number(value) : value);
    if (kind === "sale" || kind === "expense") payload.type = kind;
    try { await post(payload); close(); } catch (caught) { setMessage(caught instanceof Error ? caught.message : "Could not save"); setSaving(false); }
  }
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && close()}><section className="entry-modal" role="dialog" aria-modal="true"><div className="modal-head"><div><span>Irani Tea</span><h2>{titles[kind]}</h2></div><button onClick={close} aria-label="Close"><X/></button></div><form onSubmit={submit}>
    {kind === "menu" ? <><label>Item name<input name="name" required placeholder="e.g. Irani Chai"/></label><div className="form-row"><label>Category<select name="category"><option>Tea</option><option>Snacks</option><option>Drinks</option><option>Breakfast</option></select></label><label>Price (₹)<input name="price" type="number" min="1" required placeholder="25"/></label></div></> : null}
    {kind === "expense" ? <><label>Expense category<select name="category"><option>Stock</option><option>Milk & tea</option><option>Rent</option><option>Wages</option><option>Gas & electricity</option><option>Other</option></select></label><label>Amount (₹)<input name="amount" type="number" min="1" required placeholder="500"/></label><div className="form-row"><label>Date<input name="date" type="date" defaultValue={todayInput} required/></label><label>Time<input name="time" type="time" defaultValue={indiaTimeInput()} required/></label></div><label>Note<input name="note" required placeholder="What was this for?"/></label></> : null}
    {kind === "sale" ? <><label>Amount received (₹)<input name="amount" type="number" min="1" required placeholder="250"/></label><div className="form-row"><label>Date<input name="date" type="date" defaultValue={todayInput} required/></label><label>Time<input name="time" type="time" defaultValue={indiaTimeInput()} required/></label></div><div className="form-row"><label>Payment method<select name="paymentMode"><option value="cash">Cash</option><option value="online">Online / UPI</option></select></label><label>Sale type<select name="category"><option>Counter sale</option><option>Delivery</option><option>Catering</option><option>Other income</option></select></label></div><label>Note<input name="note" placeholder="Optional note"/></label></> : null}
    {kind === "order" ? <><label>Customer<input name="customer" placeholder="Walk-in"/></label><div className="form-row"><label>Items<input name="itemCount" type="number" min="1" defaultValue="1" required/></label><label>Total (₹)<input name="total" type="number" min="1" required placeholder="100"/></label></div><div className="form-row"><label>Date<input name="date" type="date" defaultValue={todayInput} required/></label><label>Time<input name="time" type="time" defaultValue={indiaTimeInput()} required/></label></div><label>Payment method<select name="paymentMode"><option value="cash">Cash</option><option value="online">Online / UPI</option></select></label></> : null}
    {message ? <p className="form-error">{message}</p> : null}<button className="modal-submit" disabled={saving}>{saving ? "Saving…" : "Save entry"}</button>
  </form></section></div>;
}
