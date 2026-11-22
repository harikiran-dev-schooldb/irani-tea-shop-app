"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  AlertTriangle, ArrowDownLeft, ArrowUpRight, BarChart3, Boxes, CalendarDays,
  Download, FlaskConical, LoaderCircle, Package, Plus, RefreshCw, ShoppingBasket,
  TrendingUp, Wallet, Wheat,
} from "lucide-react";

type Ingredient = { id: string; name: string; unit: string; stockQty: number; reorderAt: number; unitCostPaise: number };
type Recipe = { id: string; menuItemId: string; ingredientId: string; quantity: number };
type Purchase = { id: string; ingredientId: string; quantity: number; totalCostPaise: number; supplier: string; note: string; createdAt: string };
type Movement = { id: string; ingredientId: string; quantityChange: number; unitCostPaise: number; reason: string; note: string; createdAt: string };
type Menu = { id: string; name: string; category: string; price: number };
type Inventory = { ingredients: Ingredient[]; recipes: Recipe[]; purchases: Purchase[]; movements: Movement[]; menu: Menu[] };
type Daily = { date: string; revenue: number; cash: number; online: number; expenses: number; cogs: number; wastage: number; purchases: number; orders: number; profit: number };
type Totals = Omit<Daily, "date">;
type Report = {
  from: string; to: string; totals: Totals; daily: Daily[];
  topProducts: { name: string; quantity: number; revenue: number }[];
  configuredRecipeLines: number; accountingNote: string;
};
type Props = { mode: "inventory" | "profit" };
type Tab = "ingredients" | "purchases" | "recipes" | "wastage";
const money = (amount: number) => "₹" + amount.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: amount % 1 === 0 ? 0 : 2 });
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const priorMonth = () => {
  const current = today();
  const date = new Date(current + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() - 29);
  return date.toISOString().slice(0, 10);
};
function getError(error: unknown) { return error instanceof Error ? error.message : "Request failed."; }
function Field({ title, children }: { title: string; children: React.ReactNode }) {
  return <label className="biz-field"><span>{title}</span>{children}</label>;
}
function Stat({ label, value, detail, icon: Icon }: {
  label: string; value: string; detail: string; icon: typeof Package;
}) {
  return <article className="biz-stat">
    <span className="biz-stat-icon"><Icon size={19} /></span>
    <span>{label}</span><strong>{value}</strong><small>{detail}</small>
  </article>;
}

export default function BusinessHub({ mode }: Props) {
  const { getToken } = useAuth();
  const [tab, setTab] = useState<Tab>("ingredients");
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [from, setFrom] = useState(priorMonth);
  const [to, setTo] = useState(today);
  const [reload, setReload] = useState(0);

  const authorisedRequest = useCallback(async (url: string, init?: RequestInit) => {
    const token = await getToken();
    const response = await fetch(url, {
      ...init, cache: "no-store",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
      },
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error || "Unable to load shop records.");
    }
    return response;
  }, [getToken]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const endpoint = mode === "inventory" ? "/api/shop/inventory" :
          `/api/shop/insights?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
        const response = await authorisedRequest(endpoint);
        if (cancelled) return;
        if (mode === "inventory") setInventory(await response.json() as Inventory);
        else setReport(await response.json() as Report);
        setError("");
      } catch (caught) {
        if (!cancelled) setError(getError(caught));
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [authorisedRequest, mode, from, to, reload]);

  async function save(event: FormEvent<HTMLFormElement>, kind: string) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setBusy(true);
    setError("");
    try {
      const response = await authorisedRequest("/api/shop/inventory", {
        method: "POST", body: JSON.stringify({ kind, ...values }),
      });
      const result = await response.json() as Inventory;
      setInventory(result);
      form.reset();
    } catch (caught) {
      setError(getError(caught));
    } finally {
      setBusy(false);
    }
  }
  async function downloadCsv() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await authorisedRequest(`/api/shop/insights?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&format=csv`);
      const blob = await res.blob();
      const link = document.createElement("a");
      const path = URL.createObjectURL(blob);
      link.href = path;
      link.download = `irani-tea-profit-${report?.from ?? "all"}-${report?.to ?? "today"}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(path);
    } catch (caught) {
      setError(getError(caught));
    } finally { setBusy(false); }
  }
  const ingredients = inventory?.ingredients ?? [];
  const itemName = (id: string) => inventory?.menu.find((item) => item.id === id)?.name ?? "Menu item";
  const ingredientName = (id: string) => ingredients.find((item) => item.id === id)?.name ?? "Ingredient";
  const lowStock = ingredients.filter((item) => item.stockQty <= item.reorderAt);
  const recipeCost = (id: string) => (inventory?.recipes ?? [])
    .filter((item) => item.menuItemId === id)
    .reduce((total, item) => total + item.quantity * (ingredients.find((ing) => ing.id === item.ingredientId)?.unitCostPaise ?? 0), 0) / 100;

  const heading = mode === "inventory" ? "Ingredient inventory" : "Profit intelligence";
  const subtitle = mode === "inventory"
    ? "Track purchases, ingredient usage, recipe costs and wastage."
    : "Understand cash, UPI, expenses and true ingredient consumption costs across your full history.";

  return <div className="page-content biz-workspace">
    <header className="biz-heading">
      <div><p className="eyebrow">Irani Tea · Business tools</p><h2>{heading}</h2><p>{subtitle}</p></div>
      <button type="button" className="secondary" disabled={busy} onClick={() => setReload((v) => v + 1)}>
        <RefreshCw size={16} /> Refresh
      </button>
    </header>
    {error ? <p className="biz-error" role="alert"><AlertTriangle size={17} /> {error}</p> : null}

    {mode === "inventory" ? <>
      <div className="biz-stat-grid">
        <Stat label="Ingredients" value={String(ingredients.length)} detail="Raw materials tracked" icon={Boxes} />
        <Stat label="Low stock" value={String(lowStock.length)} detail="At or below reorder level" icon={AlertTriangle} />
        <Stat label="Inventory value" value={money(ingredients.reduce((sum, item) => sum + item.stockQty * item.unitCostPaise / 100, 0))} detail="Estimated weighted-average value" icon={Wallet} />
        <Stat label="Recipe lines" value={String(inventory?.recipes.length ?? 0)} detail="Ingredient quantities mapped to products" icon={FlaskConical} />
      </div>
      <div className="biz-tabs" role="tablist" aria-label="Inventory workspace">
        {([
          ["ingredients", "Ingredients", Package],
          ["purchases", "Purchases", ShoppingBasket],
          ["recipes", "Recipes", FlaskConical],
          ["wastage", "Wastage & stock", ArrowDownLeft],
        ] as const).map(([id, label, Icon]) => (
          <button type="button" role="tab" aria-selected={tab === id} className={tab === id ? "active" : ""} key={id} onClick={() => setTab(id)}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === "ingredients" ? <div className="biz-columns">
        <section className="biz-panel"><div className="biz-panel-title"><h3>Ingredient stock</h3><small>Quantity is counted in ml, g or pieces</small></div>
          <div className="biz-table-scroll"><table className="biz-table"><thead><tr><th>Ingredient</th><th>Available</th><th>Reorder at</th><th>Unit cost</th></tr></thead>
          <tbody>{ingredients.map((item) => <tr key={item.id}>
            <td><strong>{item.name}</strong><small>{item.unit}</small></td>
            <td><span className={item.stockQty <= item.reorderAt ? "biz-low" : ""}>{item.stockQty.toLocaleString("en-IN")} {item.unit}</span></td>
            <td>{item.reorderAt.toLocaleString("en-IN")}</td><td>{money(item.unitCostPaise / 100)} / {item.unit}</td>
          </tr>)}
          {!ingredients.length ? <tr><td colSpan={4} className="biz-empty">No ingredients yet. Add milk, tea powder or sugar to start.</td></tr> : null}</tbody></table></div>
        </section>
        <section className="biz-panel biz-form-panel"><div className="biz-panel-title"><h3>Add ingredient</h3><small>Start with zero stock and add a purchase</small></div>
          <form onSubmit={(event) => void save(event, "ingredient-create")} className="biz-form">
            <Field title="Ingredient name"><input required name="name" placeholder="e.g. Milk" maxLength={80} /></Field>
            <div className="biz-form-grid">
              <Field title="Base unit"><select name="unit"><option value="ml">Millilitres (ml)</option><option value="g">Grams (g)</option><option value="pcs">Pieces (pcs)</option></select></Field>
              <Field title="Reorder warning"><input name="reorderAt" type="number" min="0" step="1" defaultValue="100" required /></Field>
            </div>
            <button className="primary" disabled={busy}><Plus size={16} /> Add ingredient</button>
          </form>
        </section>
      </div> : null}

      {tab === "purchases" ? <div className="biz-columns">
        <section className="biz-panel"><div className="biz-panel-title"><h3>Purchase history</h3><small>Last 100 stock purchases</small></div>
          <div className="biz-table-scroll"><table className="biz-table"><thead><tr><th>Date</th><th>Ingredient</th><th>Qty</th><th>Supplier</th><th>Amount</th></tr></thead>
          <tbody>{inventory?.purchases.map((item) => <tr key={item.id}>
            <td>{new Date(item.createdAt).toLocaleDateString("en-IN")}</td><td>{ingredientName(item.ingredientId)}</td>
            <td>{item.quantity}</td><td>{item.supplier || "—"}</td><td>{money(item.totalCostPaise / 100)}</td>
          </tr>)}
          {!inventory?.purchases.length ? <tr><td colSpan={5} className="biz-empty">No purchases recorded.</td></tr> : null}</tbody></table></div>
        </section>
        <section className="biz-panel biz-form-panel"><div className="biz-panel-title"><h3>Receive stock</h3><small>Updates quantity and weighted-average cost</small></div>
          <form onSubmit={(event) => void save(event, "purchase-create")} className="biz-form">
            <Field title="Ingredient"><select required name="ingredientId" defaultValue=""><option value="" disabled>Select ingredient</option>{ingredients.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}</select></Field>
            <div className="biz-form-grid">
              <Field title="Quantity (base unit)"><input name="quantity" type="number" min="1" step="1" required placeholder="1000" /></Field>
              <Field title="Total purchase cost (₹)"><input name="totalCost" type="number" min="0.01" step="0.01" required placeholder="60" /></Field>
            </div>
            <Field title="Supplier"><input name="supplier" maxLength={120} placeholder="Optional vendor name" /></Field>
            <Field title="Note"><input name="note" maxLength={300} placeholder="Invoice or batch reference" /></Field>
            <button className="primary" disabled={busy || !ingredients.length}><ShoppingBasket size={16} /> Record purchase</button>
          </form>
          <p className="biz-help">Example: 1 litre of milk = 1000 ml. Buying it for ₹60 sets cost to about ₹0.06/ml. Do not also enter the same purchase as a shop expense.</p>
        </section>
      </div> : null}

      {tab === "recipes" ? <div className="biz-columns">
        <section className="biz-panel"><div className="biz-panel-title"><h3>Configured recipes</h3><small>Quantity consumed for one menu item sold</small></div>
          <div className="biz-table-scroll"><table className="biz-table"><thead><tr><th>Menu item</th><th>Ingredient</th><th>Usage</th><th>Cost / unit</th></tr></thead><tbody>
            {inventory?.recipes.map((item) => <tr key={item.id}><td>{itemName(item.menuItemId)}</td><td>{ingredientName(item.ingredientId)}</td>
              <td>{item.quantity} {ingredients.find((ingredient) => ingredient.id === item.ingredientId)?.unit}</td>
              <td>{money(recipeCost(item.menuItemId))}</td></tr>)}
            {!inventory?.recipes.length ? <tr><td colSpan={4} className="biz-empty">Set recipes so sales automatically consume ingredients.</td></tr> : null}
          </tbody></table></div>
        </section>
        <section className="biz-panel biz-form-panel"><div className="biz-panel-title"><h3>Set recipe quantity</h3><small>Use 0 to remove an ingredient from a recipe</small></div>
          <form onSubmit={(event) => void save(event, "recipe-set")} className="biz-form">
            <Field title="Sold menu item"><select name="menuItemId" required defaultValue=""><option value="" disabled>Select menu item</option>{inventory?.menu.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
            <Field title="Ingredient"><select name="ingredientId" required defaultValue=""><option value="" disabled>Select ingredient</option>{ingredients.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}</select></Field>
            <Field title="Quantity used per sale"><input name="quantity" type="number" min="0" step="1" required placeholder="80" /></Field>
            <button className="primary" disabled={busy || !ingredients.length}><FlaskConical size={16} /> Save recipe line</button>
          </form>
          <p className="biz-help">Example: one Irani Tea could use 80 ml of milk and 8 g of sugar. Configure your actual recipe; no quantities are assumed.</p>
        </section>
      </div> : null}

      {tab === "wastage" ? <div className="biz-columns">
        <section className="biz-panel"><div className="biz-panel-title"><h3>Stock movement ledger</h3><small>Recent 100 movements, including order consumption</small></div>
          <div className="biz-table-scroll"><table className="biz-table"><thead><tr><th>When</th><th>Ingredient</th><th>Change</th><th>Reason</th></tr></thead><tbody>
            {inventory?.movements.map((item) => <tr key={item.id}>
              <td>{new Date(item.createdAt).toLocaleString("en-IN", { day:"numeric", month:"short", hour:"numeric", minute:"2-digit" })}</td>
              <td>{ingredientName(item.ingredientId)}</td>
              <td className={item.quantityChange < 0 ? "biz-loss" : "biz-gain"}>{item.quantityChange > 0 ? "+" : ""}{item.quantityChange}</td><td>{item.reason}</td>
            </tr>)}
            {!inventory?.movements.length ? <tr><td colSpan={4} className="biz-empty">Stock movements will appear here.</td></tr> : null}
          </tbody></table></div>
        </section>
        <section className="biz-panel biz-form-panel"><div className="biz-panel-title"><h3>Wastage or correction</h3><small>Correct stock with a recorded movement</small></div>
          <form onSubmit={(event) => void save(event, "ingredient-adjust")} className="biz-form">
            <Field title="Ingredient"><select name="ingredientId" required defaultValue=""><option value="" disabled>Select ingredient</option>{ingredients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
            <Field title="Type"><select name="reason"><option value="wastage">Wastage / spoilage</option><option value="correction-out">Remove stock (correction)</option><option value="correction-in">Add stock (correction)</option></select></Field>
            <Field title="Quantity (base unit)"><input name="quantity" type="number" min="1" step="1" required /></Field>
            <Field title="Reason / note"><input name="note" maxLength={300} placeholder="e.g. Milk spoiled" /></Field>
            <button className="primary" disabled={busy || !ingredients.length}><ArrowDownLeft size={16} /> Save movement</button>
          </form>
        </section>
      </div> : null}
    </> : <>
      <div className="biz-report-filter">
        <label><CalendarDays size={16} /> From <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
        <label>To <input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
        <button type="button" className="secondary" onClick={() => { setFrom(priorMonth()); setTo(today()); }}>Last 30 days</button>
        <button type="button" className="secondary" onClick={() => { setFrom(""); setTo(""); }}>All history</button>
        <button type="button" className="primary" disabled={busy || !report} onClick={() => void downloadCsv()}><Download size={16} /> Export CSV</button>
      </div>
      {report ? <>
        <div className="biz-stat-grid">
          <Stat label="Sales revenue" value={money(report.totals.revenue)} detail={`${report.totals.orders} orders`} icon={TrendingUp} />
          <Stat label="Ingredient cost" value={money(report.totals.cogs)} detail="Cost of recipes sold" icon={Wheat} />
          <Stat label="Operating expenses" value={money(report.totals.expenses)} detail="Recorded expense transactions" icon={ArrowDownLeft} />
          <Stat label="Net profit estimate" value={money(report.totals.profit)} detail={`After ${money(report.totals.wastage)} wastage`} icon={Wallet} />
        </div>
        <div className="biz-stat-grid biz-secondary-stats">
          <Stat label="Cash sales" value={money(report.totals.cash)} detail="Cash receipts" icon={Wallet} />
          <Stat label="UPI / online" value={money(report.totals.online)} detail="Electronic receipts" icon={ArrowUpRight} />
          <Stat label="Purchases" value={money(report.totals.purchases)} detail="Restocked inventory, not expense" icon={ShoppingBasket} />
          <Stat label="Recipe coverage" value={String(report.configuredRecipeLines)} detail="Configured recipe lines" icon={FlaskConical} />
        </div>
        <div className="biz-panel biz-chart-panel"><div className="biz-panel-title"><h3>Daily revenue vs cost</h3><small>Up to 14 most recent days</small></div>
          <div className="biz-chart">
            {report.daily.slice(0, 14).reverse().map((day) => {
              const max = Math.max(1, ...report.daily.slice(0, 14).map((row) => Math.max(row.revenue, row.expenses + row.cogs + row.wastage)));
              return <div key={day.date} className="biz-chart-day" title={`${day.date} · Sales ${money(day.revenue)} · Costs ${money(day.expenses + day.cogs + day.wastage)}`}>
                <div className="biz-chart-bars"><span style={{ height: `${100 * day.revenue / max}%` }} /><span style={{ height: `${100 * (day.expenses + day.cogs + day.wastage) / max}%` }} /></div>
                <small>{day.date.slice(5)}</small>
              </div>;
            })}
            {!report.daily.length ? <p className="biz-empty">No activity in this date range.</p> : null}
          </div>
          <p className="biz-chart-legend"><i /> Sales <i /> Operating + ingredient costs</p>
        </div>
        <div className="biz-columns">
          <section className="biz-panel"><div className="biz-panel-title"><h3>Daily financial ledger</h3><small>{report.from} to {report.to}</small></div>
            <div className="biz-table-scroll"><table className="biz-table"><thead><tr><th>Date</th><th>Sales</th><th>Expenses</th><th>COGS</th><th>Net profit</th></tr></thead><tbody>
              {report.daily.map((day) => <tr key={day.date}><td>{day.date}</td><td>{money(day.revenue)}</td><td>{money(day.expenses)}</td><td>{money(day.cogs + day.wastage)}</td>
                <td className={day.profit < 0 ? "biz-loss" : "biz-gain"}>{money(day.profit)}</td></tr>)}
              {!report.daily.length ? <tr><td colSpan={5} className="biz-empty">No sales for this period.</td></tr> : null}
            </tbody></table></div>
          </section>
          <section className="biz-panel"><div className="biz-panel-title"><h3>Best-selling items</h3><small>Top 10 by quantity</small></div>
            <div className="biz-table-scroll"><table className="biz-table"><thead><tr><th>Menu item</th><th>Qty</th><th>Sales</th></tr></thead><tbody>
              {report.topProducts.map((item) => <tr key={item.name}><td>{item.name}</td><td>{item.quantity}</td><td>{money(item.revenue)}</td></tr>)}
              {!report.topProducts.length ? <tr><td colSpan={3} className="biz-empty">No item-level sales for this period.</td></tr> : null}
            </tbody></table></div>
            <p className="biz-help">{report.accountingNote} Costs are only deducted automatically for products with configured recipes.</p>
          </section>
        </div>
      </> : <div className="biz-panel biz-empty"><LoaderCircle className="spinning" /> Loading profit reports…</div>}
    </>}
  </div>;
}
