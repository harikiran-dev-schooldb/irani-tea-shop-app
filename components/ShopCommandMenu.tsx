"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Coffee,
  LayoutDashboard,
  Plus,
  ReceiptIndianRupee,
  Search,
  ShoppingBag,
  Store,
  WalletCards,
  X,
} from "lucide-react";
import type { MenuItem } from "@/lib/shop-data";

type View = "dashboard" | "orders" | "menu" | "cashflow" | "expenses" | "storefront";

type Props = {
  open: boolean;
  onClose: () => void;
  menu: MenuItem[];
  onNavigate: (view: View) => void;
  onMenuSearch: (term: string) => void;
  onNewOrder: () => void;
};

const destinations = [
  { id: "dashboard", label: "Dashboard", description: "Sales overview and quick actions", icon: LayoutDashboard },
  { id: "orders", label: "Orders", description: "Track and manage counter orders", icon: ShoppingBag },
  { id: "menu", label: "Menu", description: "Prices, availability and stock", icon: BookOpen },
  { id: "cashflow", label: "Sales report", description: "Cash, UPI and daily closing", icon: WalletCards },
  { id: "expenses", label: "Expenses", description: "Review shop spending", icon: ReceiptIndianRupee },
  { id: "storefront", label: "Counter", description: "Point of sale and checkout", icon: Store },
] as const;

export default function ShopCommandMenu({
  open,
  onClose,
  menu,
  onNavigate,
  onMenuSearch,
  onNewOrder,
}: Props) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  if (!open) return null;

  const term = query.trim().toLowerCase();
  const matchedDestinations = destinations.filter((item) =>
    `${item.label} ${item.description}`.toLowerCase().includes(term),
  );
  const matchedMenu = term
    ? menu.filter((item) => `${item.name} ${item.category}`.toLowerCase().includes(term)).slice(0, 6)
    : [];

  return (
    <div className="command-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="command-dialog" role="dialog" aria-modal="true" aria-labelledby="command-title">
        <div className="command-search">
          <Search size={21} aria-hidden="true" />
          <label className="sr-only" htmlFor="shop-command-query" id="command-title">Search workspace</label>
          <input
            id="shop-command-query"
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search pages or menu items…"
            autoComplete="off"
          />
          <button type="button" aria-label="Close search" onClick={onClose}><X size={19} /></button>
        </div>
        <div className="command-results">
          {matchedDestinations.length > 0 ? (
            <div className="command-section">
              <p>Pages</p>
              {matchedDestinations.map(({ id, label, description, icon: Icon }) => (
                <button key={id} type="button" onClick={() => {
                  onNavigate(id);
                  onClose();
                }}>
                  <span className="command-result-icon"><Icon size={19} /></span>
                  <span><strong>{label}</strong><small>{description}</small></span>
                  <ArrowRight size={16} className="command-result-arrow" />
                </button>
              ))}
            </div>
          ) : null}
          {matchedMenu.length > 0 ? (
            <div className="command-section">
              <p>Menu items</p>
              {matchedMenu.map((item) => (
                <button key={item.id} type="button" onClick={() => {
                  onMenuSearch(item.name);
                  onClose();
                }}>
                  <span className="command-result-icon"><Coffee size={19} /></span>
                  <span><strong>{item.name}</strong><small>{item.category} · ₹{item.price} · View in menu</small></span>
                  <ArrowRight size={16} className="command-result-arrow" />
                </button>
              ))}
            </div>
          ) : null}
          {matchedDestinations.length === 0 && matchedMenu.length === 0 ? (
            <div className="command-empty">No matches found. Try “orders”, “sales”, or a drink name.</div>
          ) : null}
        </div>
        <div className="command-footer">
          <span><kbd>Esc</kbd> to close · <kbd>⌘</kbd><kbd>K</kbd> to search</span>
          <button type="button" onClick={onNewOrder}><Plus size={15} /> New order</button>
        </div>
      </section>
    </div>
  );
}
