"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Category = "chai" | "coolers" | "bites";
type Product = { id: string; name: string; price: number; category: Category; emoji: string; color: string; description: string };
type CartItem = { key: string; name: string; price: number; options: string };

const products: Product[] = [
  { id: "masala", name: "Masala Chai", price: 45, category: "chai", emoji: "☕", color: "#edc56f", description: "Bold Assam tea with ginger, cardamom and warming spices." },
  { id: "elaichi", name: "Elaichi Chai", price: 50, category: "chai", emoji: "🫖", color: "#d9e0ba", description: "Fragrant green cardamom, slow-simmered with milk tea." },
  { id: "cutting", name: "Mumbai Cutting", price: 30, category: "chai", emoji: "🥃", color: "#f1b598", description: "A short, strong and sweet glass of proper street-style chai." },
  { id: "kashmiri", name: "Kashmiri Kahwa", price: 70, category: "chai", emoji: "🍵", color: "#c7d79c", description: "Light green tea with saffron, cinnamon and almonds." },
  { id: "lemon", name: "Iced Lemon Tea", price: 80, category: "coolers", emoji: "🧋", color: "#f0d87e", description: "Black tea, fresh lemon and mint poured over ice." },
  { id: "rose", name: "Rose Milk Chai", price: 90, category: "coolers", emoji: "🥤", color: "#eeb7af", description: "Chilled milk tea with a delicate rose finish." },
  { id: "samosa", name: "Classic Samosa", price: 35, category: "bites", emoji: "🥟", color: "#e8c078", description: "Crisp pastry packed with spiced potato and peas." },
  { id: "bun", name: "Bun Maska", price: 55, category: "bites", emoji: "🥖", color: "#e6c9a2", description: "Soft toasted bun with a generous swipe of salted butter." },
];

const money = (value: number) => `₹${value}`;

export default function Home() {
  const [filter, setFilter] = useState<"all" | Category>("all");
  const [selected, setSelected] = useState<Product | null>(null);
  const [size, setSize] = useState("Regular");
  const [sweetness, setSweetness] = useState("Regular");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState("");
  const visibleProducts = filter === "all" ? products : products.filter((product) => product.category === filter);
  const total = useMemo(() => cart.reduce((sum, item) => sum + item.price, 0), [cart]);

  useEffect(() => {
    document.body.classList.toggle("no-scroll", cartOpen || Boolean(selected));
    return () => document.body.classList.remove("no-scroll");
  }, [cartOpen, selected]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function chooseProduct(product: Product) {
    setSize("Regular");
    setSweetness("Regular");
    setSelected(product);
  }

  function addToCart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const isBite = selected.category === "bites";
    const chosenSize = isBite ? "One serving" : size;
    const options = isBite ? chosenSize : `${chosenSize} · ${sweetness}`;
    const price = selected.price + (chosenSize === "Large" ? 20 : 0);
    setCart((items) => [...items, { key: `${selected.id}-${Date.now()}`, name: selected.name, price, options }]);
    setToast(`${selected.name} added to your bag`);
    setSelected(null);
  }

  function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "friend");
    setCart([]);
    setCartOpen(false);
    event.currentTarget.reset();
    setToast(`Thanks, ${name}! Your pickup order is confirmed.`);
  }

  return (
    <>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Chai Corner home"><span className="brand-mark" aria-hidden="true">च</span><span>Chai Corner</span></a>
        <nav aria-label="Main navigation"><a href="#menu">Menu</a><a href="#story">Our story</a><button className="cart-button" type="button" onClick={() => setCartOpen(true)} aria-label="Open cart">Bag <span className="cart-count">{cart.length}</span></button></nav>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy"><p className="eyebrow">Brewed fresh · Served warm</p><h1 id="hero-title">Your daily pause,<br/><em>poured perfectly.</em></h1><p className="hero-intro">Small-batch chai, fragrant spices, and crisp snacks made for slow sips and quick catch-ups.</p><div className="hero-actions"><a className="primary-button" href="#menu">Order your chai <span aria-hidden="true">↗</span></a><span className="open-note"><i/> Open today · 7:00 AM–9:00 PM</span></div></div>
          <div className="hero-art" aria-label="Illustration of hot masala chai"><div className="sun-seal">SINCE<br/><strong>2024</strong></div><div className="steam steam-one"/><div className="steam steam-two"/><div className="cup"><div className="tea-surface"/><div className="cup-label">chai<br/><small>corner</small></div><div className="handle"/></div><div className="saucer"/><div className="spice spice-one">✦</div><div className="spice spice-two">✦</div><div className="leaf leaf-one"/><div className="leaf leaf-two"/></div>
        </section>

        <section className="ticker" aria-label="Shop highlights"><span>Whole spices</span><b>✦</b><span>Fresh milk</span><b>✦</b><span>Brewed to order</span><b>✦</b><span>Quick pickup</span></section>

        <section className="menu-section" id="menu" aria-labelledby="menu-title">
          <div className="section-heading"><div><p className="eyebrow">What are you in the mood for?</p><h2 id="menu-title">The tea table</h2></div><div className="filters" role="group" aria-label="Filter menu">{(["all", "chai", "coolers", "bites"] as const).map((category) => <button key={category} className={`filter ${filter === category ? "active" : ""}`} type="button" onClick={() => setFilter(category)}>{category[0].toUpperCase() + category.slice(1)}</button>)}</div></div>
          <div className="menu-grid">{visibleProducts.map((item) => <article className="menu-card" key={item.id}><div className="product-art" style={{ "--art-bg": item.color } as React.CSSProperties}><span className="emoji" aria-hidden="true">{item.emoji}</span></div><div className="product-meta"><h3>{item.name}</h3><span className="price">{money(item.price)}</span></div><p>{item.description}</p><button className="order-item" type="button" onClick={() => chooseProduct(item)}><span>Add to order</span><span aria-hidden="true">+</span></button></article>)}</div>
        </section>

        <section className="ritual" id="story" aria-labelledby="ritual-title"><div className="ritual-visual" aria-hidden="true"><div className="arch arch-back"/><div className="arch arch-front"><span className="kettle">♨</span><span className="pour"/><span className="mini-cup">च</span></div></div><div className="ritual-copy"><p className="eyebrow">The everyday ritual</p><h2 id="ritual-title">Good chai can’t be rushed.</h2><p>We crush our spices in small batches, simmer every pot until the flavours settle in, and pour only when it is just right.</p><div className="steps"><div><strong>01</strong><span>Choose your favourite</span></div><div><strong>02</strong><span>We brew it fresh</span></div><div><strong>03</strong><span>Pick up &amp; enjoy</span></div></div></div></section>

        <section className="visit" aria-labelledby="visit-title"><div><p className="eyebrow">Come say hello</p><h2 id="visit-title">There’s always<br/>a cup waiting.</h2></div><div className="visit-details"><div><span>Find us</span><strong>12 Market Road<br/>Your City</strong></div><div><span>Opening hours</span><strong>Mon–Sun<br/>7:00 AM–9:00 PM</strong></div><a href="tel:+919000000000">+91 90000 00000 <span aria-hidden="true">↗</span></a></div></section>
      </main>

      <footer><a className="brand footer-brand" href="#top"><span className="brand-mark">च</span><span>Chai Corner</span></a><p>Fresh chai. Familiar feeling.</p><p>© {new Date().getFullYear()} Chai Corner</p></footer>

      {!cartOpen ? null : <button className="drawer-backdrop" type="button" aria-label="Close cart" onClick={() => setCartOpen(false)}/>} 
      <aside className={`cart-drawer ${cartOpen ? "open" : ""}`} aria-labelledby="cart-title" aria-hidden={!cartOpen}>
        <div className="drawer-head"><div><p className="eyebrow">Your order</p><h2 id="cart-title">The chai bag</h2></div><button className="icon-button" type="button" onClick={() => setCartOpen(false)} aria-label="Close cart">×</button></div>
        <div className="cart-items">{cart.map((item) => <div className="cart-row" key={item.key}><div><h3>{item.name}</h3><p>{item.options}</p><button type="button" onClick={() => setCart((items) => items.filter((entry) => entry.key !== item.key))}>Remove</button></div><strong>{money(item.price)}</strong></div>)}</div>
        {cart.length === 0 ? <div className="empty-cart"><span>च</span><h3>Your bag is empty</h3><p>Add something warm and wonderful.</p><button className="text-button" type="button" onClick={() => setCartOpen(false)}>Browse the menu</button></div> : <form className="checkout" onSubmit={placeOrder}><div className="total-line"><span>Total</span><strong>{money(total)}</strong></div><label>Name<input name="name" required autoComplete="name" placeholder="Your name"/></label><label>Phone<input name="phone" required inputMode="tel" autoComplete="tel" placeholder="Mobile number"/></label><label>Pickup time<select name="time" required defaultValue=""><option value="" disabled>Choose a time</option><option>As soon as possible</option><option>In 30 minutes</option><option>In 1 hour</option></select></label><button className="primary-button checkout-button" type="submit">Place pickup order <span aria-hidden="true">→</span></button><p className="checkout-note">Pay at the counter when you collect your order.</p></form>}
      </aside>

      {selected ? <div className="modal-shell" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><section className="customize-dialog" role="dialog" aria-modal="true" aria-labelledby="customize-title"><button className="icon-button dialog-close" type="button" onClick={() => setSelected(null)} aria-label="Close">×</button><div className="dialog-visual" style={{ background: selected.color }}>{selected.emoji}</div><p className="eyebrow">Make it yours</p><h2 id="customize-title">{selected.name}</h2><p className="dialog-description">{selected.description}</p><form onSubmit={addToCart}>{selected.category === "bites" ? null : <><fieldset><legend>Size</legend>{["Regular", "Large"].map((option) => <label key={option}><input type="radio" name="size" checked={size === option} onChange={() => setSize(option)}/><span>{option} {option === "Large" ? <small>+₹20</small> : null}</span></label>)}</fieldset><fieldset><legend>Sweetness</legend>{["No sugar", "Less sweet", "Regular"].map((option) => <label key={option}><input type="radio" name="sweetness" checked={sweetness === option} onChange={() => setSweetness(option)}/><span>{option}</span></label>)}</fieldset></>}<button className="primary-button add-button" type="submit">Add to bag <span>{money(selected.price + (size === "Large" && selected.category !== "bites" ? 20 : 0))}</span></button></form></section></div> : null}

      <div className={`toast ${toast ? "show" : ""}`} role="status" aria-live="polite">{toast}</div>
    </>
  );
}
