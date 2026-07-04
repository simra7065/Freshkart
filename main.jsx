import { useState, useEffect, useCallback } from "react";
import {
  ShoppingBasket, Search, Plus, Minus, Trash2, MapPin, Phone, User,
  Package, Truck, CheckCircle2, Clock, ChevronLeft, LayoutDashboard,
  ClipboardList, LogOut, Store, Pencil, X, IndianRupee, Wallet,
  Smartphone, RotateCcw, AlertCircle
} from "lucide-react";

const STORE_NAME = "FreshKart";
const STORE_AREA = "Deoband, Saharanpur";
const UPI_ID = "freshkart@upi";
const STATUS_FLOW = ["Pending", "Packed", "Out for Delivery", "Delivered"];

const SUPABASE_URL = "https://jlawoemqseioorgidzwv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsYXdvZW1xc2Vpb29yZ2lkend2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDQzNjgsImV4cCI6MjA5ODY4MDM2OH0.hgFiJ7xMv9slLpcWXClHaB8zOppPTcBjOcTh9ULWpZg";

const CATEGORIES = [
  { id: "Vegetables", emoji: "🥬" },
  { id: "Dairy", emoji: "🥛" },
  { id: "Grocery", emoji: "🛒" },
  { id: "Snacks", emoji: "🍪" },
  { id: "Beverages", emoji: "🥤" },
  { id: "Household", emoji: "🧴" },
];

const DEFAULT_PRODUCTS = [
  { id: "p1", name: "Fresh Tomato (1 kg)", category: "Vegetables", price: 40, inStock: true, image: "" },
  { id: "p2", name: "Onion (1 kg)", category: "Vegetables", price: 35, inStock: true, image: "" },
  { id: "p3", name: "Potato (1 kg)", category: "Vegetables", price: 28, inStock: true, image: "" },
  { id: "p4", name: "Toned Milk (500 ml)", category: "Dairy", price: 27, inStock: true, image: "" },
  { id: "p5", name: "Paneer (200 g)", category: "Dairy", price: 80, inStock: true, image: "" },
  { id: "p6", name: "Curd (400 g)", category: "Dairy", price: 35, inStock: false, image: "" },
  { id: "p7", name: "Basmati Rice (1 kg)", category: "Grocery", price: 95, inStock: true, image: "" },
  { id: "p8", name: "Toor Dal (1 kg)", category: "Grocery", price: 130, inStock: true, image: "" },
  { id: "p9", name: "Mustard Oil (1 L)", category: "Grocery", price: 165, inStock: true, image: "" },
  { id: "p10", name: "Parle-G Biscuit", category: "Snacks", price: 10, inStock: true, image: "" },
  { id: "p11", name: "Aloo Bhujia (200 g)", category: "Snacks", price: 45, inStock: true, image: "" },
  { id: "p12", name: "Masala Chai (250 g)", category: "Beverages", price: 90, inStock: true, image: "" },
  { id: "p13", name: "Cold Drink (750 ml)", category: "Beverages", price: 40, inStock: true, image: "" },
  { id: "p14", name: "Dish Wash Bar", category: "Household", price: 20, inStock: true, image: "" },
];

const catEmoji = (c) => CATEGORIES.find((x) => x.id === c)?.emoji || "🧺";
const rupee = (n) => `₹${Number(n).toFixed(0)}`;
const genId = (prefix) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();

function sbHeaders(token) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
  };
}

const productFromDb = (p) => ({
  id: p.id,
  name: p.name,
  category: p.category,
  price: Number(p.price),
  inStock: p.in_stock,
  image: p.image || "",
});
const productToDb = (p) => ({
  name: p.name,
  category: p.category,
  price: p.price,
  in_stock: p.inStock,
  image: p.image || null,
});
const orderFromDb = (o) => ({
  id: o.id,
  customerName: o.customer_name,
  customerPhone: o.customer_phone,
  address: o.address,
  items: o.items,
  total: Number(o.total),
  payment: o.payment,
  status: o.status,
  createdAt: new Date(o.created_at).getTime(),
});
const orderToDb = (o) => ({
  customer_name: o.customerName,
  customer_phone: o.customerPhone,
  address: o.address,
  items: o.items,
  total: o.total,
  payment: o.payment,
  status: o.status,
});

async function sbAdminLogin(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || "Invalid email or password");
  return data.access_token;
}

async function sbFetchProducts() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*&order=created_at.asc`, {
    headers: sbHeaders(),
  });
  if (!res.ok) throw new Error("Could not load products");
  const rows = await res.json();
  return rows.map(productFromDb);
}

async function sbFetchOrders() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc`, {
    headers: sbHeaders(),
  });
  if (!res.ok) throw new Error("Could not load orders");
  const rows = await res.json();
  return rows.map(orderFromDb);
}

async function sbInsertOrder(order) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
    method: "POST",
    headers: { ...sbHeaders(), "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(orderToDb(order)),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Could not place order");
  return orderFromDb(data[0]);
}

async function sbUpdateOrderStatus(id, status, token) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...sbHeaders(token), "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Could not update order status");
  return orderFromDb(data[0]);
}

async function sbInsertProduct(product, token) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/products`, {
    method: "POST",
    headers: { ...sbHeaders(token), "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(productToDb(product)),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Could not add product");
  return productFromDb(data[0]);
}

async function sbUpdateProduct(id, product, token) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...sbHeaders(token), "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(productToDb(product)),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Could not update product");
  return productFromDb(data[0]);
}

async function sbDeleteProduct(id, token) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${id}`, {
    method: "DELETE",
    headers: sbHeaders(token),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Could not delete product");
  }
}

function StatusBadge({ status }) {
  const map = {
    Pending: "bg-gray-100 text-gray-600",
    Packed: "bg-amber-100 text-amber-700",
    "Out for Delivery": "bg-blue-100 text-blue-700",
    Delivered: "bg-green-100 text-green-700",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${map[status]}`}>
      {status}
    </span>
  );
}

function StatusStepper({ status }) {
  const idx = STATUS_FLOW.indexOf(status);
  const icons = [Clock, Package, Truck, CheckCircle2];
  return (
    <div className="flex items-center w-full mt-3">
      {STATUS_FLOW.map((s, i) => {
        const Icon = icons[i];
        const done = i <= idx;
        return (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center ${
                  done ? "bg-green-600 text-white" : "bg-gray-100 text-gray-400"
                }`}
              >
                <Icon size={14} />
              </div>
              <span className={`text-[10px] font-medium text-center leading-tight w-14 ${done ? "text-green-700" : "text-gray-400"}`}>
                {s}
              </span>
            </div>
            {i < STATUS_FLOW.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 mb-4 ${i < idx ? "bg-green-600" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function PhoneFrame({ children }) {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-6 px-3">
      <div className="w-full max-w-sm bg-white rounded-[2rem] shadow-xl overflow-hidden border-4 border-gray-900" style={{ minHeight: "700px" }}>
        <div className="bg-gray-900 h-6 flex items-center justify-between px-5 text-white text-[10px]">
          <span>9:41</span>
          <span>●●●</span>
        </div>
        <div className="flex flex-col" style={{ height: "674px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function BrandHeader({ subtitle, right }) {
  return (
    <div className="bg-green-700 rounded-b-3xl px-4 pt-4 pb-5 text-white shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-white/15 rounded-xl p-2">
            <ShoppingBasket size={20} />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight">{STORE_NAME}</h1>
            <p className="text-[11px] text-green-100 flex items-center gap-1">
              <MapPin size={10} /> {STORE_AREA}
            </p>
          </div>
        </div>
        {right}
      </div>
      {subtitle}
    </div>
  );
}

function RoleSelect({ onSelect }) {
  return (
    <PhoneFrame>
      <div className="flex-1 flex flex-col items-center justify-center px-8 bg-green-50 gap-8">
        <div className="text-center">
          <div className="bg-green-700 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <ShoppingBasket className="text-white" size={30} />
          </div>
          <h1 className="text-2xl font-bold text-green-900 tracking-tight">{STORE_NAME}</h1>
          <p className="text-sm text-gray-500 mt-1">Fresh groceries, delivered daily in {STORE_AREA}</p>
        </div>
        <div className="w-full flex flex-col gap-3">
          <button
            onClick={() => onSelect("customer")}
            className="w-full bg-green-700 text-white font-semibold py-3.5 rounded-xl active:bg-green-800 transition-colors"
          >
            I'm a Customer
          </button>
          <button
            onClick={() => onSelect("admin")}
            className="w-full bg-white text-green-800 font-semibold py-3.5 rounded-xl border-2 border-green-700 active:bg-green-50 transition-colors"
          >
            Store Admin Login
          </button>
        </div>
      </div>
    </PhoneFrame>
  );
}

function CustomerLogin({ onLogin, onBack }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (!name.trim()) return setError("Please enter your name");
    if (!/^\d{10}$/.test(phone.trim())) return setError("Enter a valid 10-digit phone number");
    setError("");
    onLogin({ name: name.trim(), phone: phone.trim() });
  };

  return (
    <PhoneFrame>
      <div className="flex-1 flex flex-col bg-white">
        <div className="p-4 flex items-center gap-3 shrink-0">
          <button onClick={onBack} className="text-gray-500"><ChevronLeft size={22} /></button>
          <h2 className="font-bold text-gray-900">Customer Login</h2>
        </div>
        <div className="flex-1 px-6 pt-4">
          <p className="text-sm text-gray-500 mb-6">Enter your details to start shopping. No password needed.</p>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Your name</label>
          <div className="flex items-center border border-gray-200 rounded-xl px-3 py-2.5 mt-1 mb-4">
            <User size={16} className="text-gray-400 mr-2" />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aftab Ahmad"
              className="flex-1 outline-none text-sm"
            />
          </div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone number</label>
          <div className="flex items-center border border-gray-200 rounded-xl px-3 py-2.5 mt-1">
            <Phone size={16} className="text-gray-400 mr-2" />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="10-digit mobile number"
              className="flex-1 outline-none text-sm"
              inputMode="numeric"
            />
          </div>
          {error && <p className="text-red-500 text-xs mt-3 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
        </div>
        <div className="p-6 shrink-0">
          <button onClick={submit} className="w-full bg-green-700 text-white font-semibold py-3.5 rounded-xl active:bg-green-800">
            Continue
          </button>
        </div>
      </div>
    </PhoneFrame>
  );
}

function AdminLogin({ onLogin, onBack }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) return setError("Enter email and password");
    setBusy(true);
    setError("");
    try {
      const token = await sbAdminLogin(email.trim(), password);
      onLogin(token);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PhoneFrame>
      <div className="flex-1 flex flex-col bg-white">
        <div className="p-4 flex items-center gap-3 shrink-0">
          <button onClick={onBack} className="text-gray-500"><ChevronLeft size={22} /></button>
          <h2 className="font-bold text-gray-900">Admin Login</h2>
        </div>
        <div className="flex-1 px-6 pt-4">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@freshkart.com"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 mt-1 mb-4 text-sm outline-none"
          />
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 mt-1 text-sm outline-none"
          />
          {error && <p className="text-red-500 text-xs mt-3 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
        </div>
        <div className="p-6 shrink-0">
          <button disabled={busy} onClick={submit} className="w-full bg-green-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl active:bg-green-800">
            {busy ? "Logging in..." : "Log In"}
          </button>
        </div>
      </div>
    </PhoneFrame>
  );
}

/* ---------------- CUSTOMER APP ---------------- */

function CustomerApp({ profile, onLogout, products, orders, refreshOrders, placeOrder }) {
  const [tab, setTab] = useState("home");
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState({});
  const [checkoutStep, setCheckoutStep] = useState(false);
  const [address, setAddress] = useState("");
  const [payment, setPayment] = useState("COD");
  const [placing, setPlacing] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const myOrders = orders
    .filter((o) => o.customerPhone === profile.phone)
    .sort((a, b) => b.createdAt - a.createdAt);

  const filtered = products.filter(
    (p) =>
      (category === "All" || p.category === category) &&
      p.name.toLowerCase().includes(query.toLowerCase())
  );

  const cartItems = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => ({ ...products.find((p) => p.id === id), qty }))
    .filter((i) => i.id);

  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cartItems.reduce((s, i) => s + i.qty * i.price, 0);

  const addToCart = (id, delta) => {
    setCart((c) => {
      const next = { ...c, [id]: Math.max(0, (c[id] || 0) + delta) };
      return next;
    });
  };

  const reorder = (order) => {
    const next = {};
    order.items.forEach((i) => {
      if (products.find((p) => p.id === i.id)?.inStock) next[i.id] = i.qty;
    });
    setCart(next);
    setTab("home");
  };

  const submitOrder = async () => {
    if (!address.trim()) return;
    setPlacing(true);
    const order = {
      id: genId("ORD"),
      customerName: profile.name,
      customerPhone: profile.phone,
      address: address.trim(),
      items: cartItems.map((i) => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
      total: cartTotal,
      payment,
      status: "Pending",
      createdAt: Date.now(),
    };
    await placeOrder(order);
    setPlacing(false);
    setCart({});
    setCheckoutStep(false);
    setConfirmedOrder(order);
    setTab("orders");
  };

  return (
    <PhoneFrame>
      <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
        {tab === "home" && !checkoutStep && (
          <>
            <BrandHeader
              right={
                <button onClick={onLogout} className="text-white/80"><LogOut size={18} /></button>
              }
            />
            <div className="px-4 -mt-2 shrink-0">
              <div className="bg-white shadow-sm rounded-xl flex items-center px-3 py-2.5 border border-gray-100">
                <Search size={16} className="text-gray-400 mr-2" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for atta, milk, snacks..."
                  className="flex-1 outline-none text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 px-4 py-3 overflow-x-auto shrink-0 no-scrollbar">
              {["All", ...CATEGORIES.map((c) => c.id)].map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border ${
                    category === c ? "bg-green-700 text-white border-green-700" : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  {c !== "All" && catEmoji(c) + " "}{c}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <div className="grid grid-cols-2 gap-3">
                {filtered.map((p) => (
                  <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-2.5 flex flex-col shadow-sm">
                    <div className="bg-green-50 rounded-lg h-16 flex items-center justify-center text-3xl mb-2">
                      {catEmoji(p.category)}
                    </div>
                    <p className="text-xs font-semibold text-gray-800 leading-snug line-clamp-2 h-8">{p.name}</p>
                    <p className="text-sm font-bold text-green-800 mt-1 flex items-center"><IndianRupee size={11} />{p.price}</p>
                    {!p.inStock ? (
                      <span className="text-[10px] text-red-500 font-medium mt-1">Out of stock</span>
                    ) : cart[p.id] > 0 ? (
                      <div className="flex items-center justify-between mt-2 bg-green-700 rounded-lg overflow-hidden">
                        <button onClick={() => addToCart(p.id, -1)} className="text-white px-2.5 py-1"><Minus size={12} /></button>
                        <span className="text-white text-xs font-bold">{cart[p.id]}</span>
                        <button onClick={() => addToCart(p.id, 1)} className="text-white px-2.5 py-1"><Plus size={12} /></button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(p.id, 1)}
                        className="mt-2 text-xs font-semibold text-green-700 border border-green-700 rounded-lg py-1 active:bg-green-50"
                      >
                        Add
                      </button>
                    )}
                  </div>
                ))}
                {filtered.length === 0 && (
                  <p className="col-span-2 text-center text-sm text-gray-400 py-10">No products found</p>
                )}
              </div>
            </div>
            {cartCount > 0 && (
              <button
                onClick={() => setTab("cart")}
                className="mx-4 mb-3 shrink-0 bg-green-700 text-white rounded-xl py-3 px-4 flex items-center justify-between font-semibold text-sm"
              >
                <span>{cartCount} item{cartCount > 1 ? "s" : ""} added</span>
                <span className="flex items-center gap-1">View Cart · {rupee(cartTotal)}</span>
              </button>
            )}
          </>
        )}

        {tab === "cart" && !checkoutStep && (
          <>
            <div className="p-4 flex items-center gap-3 shrink-0 border-b border-gray-100">
              <button onClick={() => setTab("home")} className="text-gray-500"><ChevronLeft size={22} /></button>
              <h2 className="font-bold text-gray-900">Your Cart</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {cartItems.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-16">Your cart is empty</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {cartItems.map((i) => (
                    <div key={i.id} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-3">
                      <div className="text-2xl">{catEmoji(i.category)}</div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800">{i.name}</p>
                        <p className="text-xs text-gray-500">{rupee(i.price)} x {i.qty}</p>
                      </div>
                      <div className="flex items-center gap-2 bg-green-700 rounded-lg overflow-hidden">
                        <button onClick={() => addToCart(i.id, -1)} className="text-white px-2 py-1"><Minus size={12} /></button>
                        <span className="text-white text-xs font-bold">{i.qty}</span>
                        <button onClick={() => addToCart(i.id, 1)} className="text-white px-2 py-1"><Plus size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {cartItems.length > 0 && (
              <div className="p-4 border-t border-gray-100 shrink-0">
                <div className="flex justify-between text-sm mb-3">
                  <span className="text-gray-500">Total</span>
                  <span className="font-bold text-gray-900">{rupee(cartTotal)}</span>
                </div>
                <button
                  onClick={() => setCheckoutStep(true)}
                  className="w-full bg-green-700 text-white font-semibold py-3 rounded-xl active:bg-green-800"
                >
                  Proceed to Checkout
                </button>
              </div>
            )}
          </>
        )}

        {checkoutStep && (
          <>
            <div className="p-4 flex items-center gap-3 shrink-0 border-b border-gray-100">
              <button onClick={() => setCheckoutStep(false)} className="text-gray-500"><ChevronLeft size={22} /></button>
              <h2 className="font-bold text-gray-900">Checkout</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Delivery address</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House no, street, mohalla, landmark, Deoband"
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 mt-1 mb-4 text-sm outline-none resize-none"
              />
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Payment method</label>
              <div className="flex flex-col gap-2 mb-4">
                <button
                  onClick={() => setPayment("COD")}
                  className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 text-sm font-medium ${
                    payment === "COD" ? "border-green-700 bg-green-50 text-green-800" : "border-gray-200 text-gray-600"
                  }`}
                >
                  <Wallet size={16} /> Cash on Delivery
                </button>
                <button
                  onClick={() => setPayment("UPI")}
                  className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 text-sm font-medium ${
                    payment === "UPI" ? "border-green-700 bg-green-50 text-green-800" : "border-gray-200 text-gray-600"
                  }`}
                >
                  <Smartphone size={16} /> Pay via UPI
                </button>
                {payment === "UPI" && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-xs text-amber-800">
                    Pay to UPI ID <span className="font-semibold">{UPI_ID}</span> and keep the receipt ready for the delivery person.
                  </div>
                )}
              </div>
              <div className="bg-white border border-gray-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Order summary</p>
                {cartItems.map((i) => (
                  <div key={i.id} className="flex justify-between text-sm py-0.5">
                    <span className="text-gray-600">{i.name} x{i.qty}</span>
                    <span className="text-gray-800">{rupee(i.price * i.qty)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-bold border-t border-gray-100 mt-2 pt-2">
                  <span>Total</span>
                  <span>{rupee(cartTotal)}</span>
                </div>
              </div>
            </div>
            <div className="p-4 shrink-0">
              <button
                disabled={!address.trim() || placing}
                onClick={submitOrder}
                className="w-full bg-green-700 disabled:opacity-40 text-white font-semibold py-3 rounded-xl active:bg-green-800"
              >
                {placing ? "Placing order..." : `Place Order · ${rupee(cartTotal)}`}
              </button>
            </div>
          </>
        )}

        {tab === "orders" && (
          <>
            <div className="p-4 shrink-0 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">My Orders</h2>
              <button onClick={refreshOrders} className="text-green-700"><RotateCcw size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {confirmedOrder && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 text-center">
                  <CheckCircle2 className="text-green-600 mx-auto mb-1" size={22} />
                  <p className="text-sm font-semibold text-green-800">Order placed successfully!</p>
                  <p className="text-xs text-green-600">Order #{confirmedOrder.id}</p>
                </div>
              )}
              {myOrders.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-16">No orders yet</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {myOrders.map((o) => (
                    <div key={o.id} className="bg-white border border-gray-100 rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-400">#{o.id}</p>
                          <p className="text-sm font-bold text-gray-800">{rupee(o.total)} · {o.payment}</p>
                        </div>
                        <StatusBadge status={o.status} />
                      </div>
                      <StatusStepper status={o.status} />
                      <button
                        onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                        className="text-xs text-green-700 font-semibold mt-2"
                      >
                        {expanded === o.id ? "Hide details" : "View details"}
                      </button>
                      {expanded === o.id && (
                        <div className="mt-2 border-t border-gray-100 pt-2">
                          {o.items.map((i) => (
                            <div key={i.id} className="flex justify-between text-xs text-gray-600 py-0.5">
                              <span>{i.name} x{i.qty}</span>
                              <span>{rupee(i.price * i.qty)}</span>
                            </div>
                          ))}
                          <p className="text-xs text-gray-500 mt-2">Deliver to: {o.address}</p>
                        </div>
                      )}
                      <button
                        onClick={() => reorder(o)}
                        className="w-full mt-2 text-xs font-semibold text-green-700 border border-green-700 rounded-lg py-1.5"
                      >
                        Reorder
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <div className="flex border-t border-gray-100 bg-white shrink-0">
          {[
            { id: "home", label: "Home", icon: Store },
            { id: "cart", label: "Cart", icon: ShoppingBasket, badge: cartCount },
            { id: "orders", label: "Orders", icon: ClipboardList },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setCheckoutStep(false); }}
              className={`flex-1 flex flex-col items-center py-2 gap-0.5 relative ${
                tab === t.id ? "text-green-700" : "text-gray-400"
              }`}
            >
              <t.icon size={18} />
              {t.badge > 0 && (
                <span className="absolute top-1 right-1/3 bg-amber-500 text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center">
                  {t.badge}
                </span>
              )}
              <span className="text-[10px] font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </PhoneFrame>
  );
}

/* ---------------- ADMIN APP ---------------- */

function ProductForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(
    initial || { name: "", category: "Vegetables", price: "", inStock: true, image: "" }
  );
  return (
    <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50">
      <div className="bg-white rounded-t-2xl w-full max-w-sm p-5 max-h-[85%] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-900">{initial ? "Edit Product" : "Add Product"}</h3>
          <button onClick={onCancel}><X size={20} className="text-gray-400" /></button>
        </div>
        <label className="text-xs font-semibold text-gray-500 uppercase">Name</label>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 mb-3 text-sm outline-none"
        />
        <label className="text-xs font-semibold text-gray-500 uppercase">Category</label>
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 mb-3 text-sm outline-none"
        >
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>{c.emoji} {c.id}</option>
          ))}
        </select>
        <label className="text-xs font-semibold text-gray-500 uppercase">Price (₹)</label>
        <input
          type="number"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 mb-3 text-sm outline-none"
        />
        <label className="text-xs font-semibold text-gray-500 uppercase">Image URL (optional)</label>
        <input
          value={form.image}
          onChange={(e) => setForm({ ...form, image: e.target.value })}
          placeholder="Leave blank to use category icon"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 mb-3 text-sm outline-none"
        />
        <div className="flex items-center justify-between mb-5">
          <span className="text-sm font-medium text-gray-700">In stock</span>
          <button
            onClick={() => setForm({ ...form, inStock: !form.inStock })}
            className={`w-11 h-6 rounded-full transition-colors ${form.inStock ? "bg-green-600" : "bg-gray-300"}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${form.inStock ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>
        <button
          disabled={!form.name.trim() || !form.price}
          onClick={() => onSave({ ...form, price: Number(form.price), id: initial?.id })}
          className="w-full bg-green-700 disabled:opacity-40 text-white font-semibold py-3 rounded-xl"
        >
          Save Product
        </button>
      </div>
    </div>
  );
}

function AdminApp({ onLogout, products, orders, onAddProduct, onEditProduct, onDeleteProduct, refreshOrders, updateOrderStatus }) {
  const [tab, setTab] = useState("dashboard");
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const today = new Date().toDateString();
  const todaysOrders = orders.filter((o) => new Date(o.createdAt).toDateString() === today);
  const todaysSales = todaysOrders.reduce((s, o) => s + o.total, 0);
  const pendingCount = orders.filter((o) => o.status !== "Delivered").length;

  const saveProduct = async (p) => {
    setError("");
    try {
      if (p.id) await onEditProduct(p.id, p);
      else await onAddProduct(p);
      setEditing(null);
      setAdding(false);
    } catch (e) {
      setError(e.message);
    }
  };
  const deleteProduct = async (id) => {
    setError("");
    try {
      await onDeleteProduct(id);
    } catch (e) {
      setError(e.message);
    }
  };

  const sortedOrders = [...orders].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <PhoneFrame>
      <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
        <BrandHeader
          subtitle={<p className="text-xs text-green-100 mt-1">Admin Panel</p>}
          right={<button onClick={onLogout} className="text-white/80"><LogOut size={18} /></button>}
        />

        {tab === "dashboard" && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white border border-gray-100 rounded-xl p-3">
                <p className="text-xs text-gray-500">Today's Sales</p>
                <p className="text-xl font-bold text-green-800 mt-1">{rupee(todaysSales)}</p>
                <p className="text-[11px] text-gray-400">{todaysOrders.length} orders today</p>
              </div>
              <div className="bg-white border border-gray-100 rounded-xl p-3">
                <p className="text-xs text-gray-500">Active Orders</p>
                <p className="text-xl font-bold text-amber-600 mt-1">{pendingCount}</p>
                <p className="text-[11px] text-gray-400">need action</p>
              </div>
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent Orders</p>
            <div className="flex flex-col gap-2">
              {sortedOrders.slice(0, 6).map((o) => (
                <div key={o.id} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{o.customerName}</p>
                    <p className="text-xs text-gray-400">{rupee(o.total)}</p>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
              ))}
              {sortedOrders.length === 0 && <p className="text-center text-sm text-gray-400 py-10">No orders yet</p>}
            </div>
          </div>
        )}

        {tab === "products" && (
          <div className="flex-1 overflow-y-auto p-4">
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg px-3 py-2 mb-3 flex items-center gap-1">
                <AlertCircle size={12} /> {error}
              </div>
            )}
            <button
              onClick={() => setAdding(true)}
              className="w-full mb-3 bg-green-700 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1 text-sm"
            >
              <Plus size={16} /> Add Product
            </button>
            <div className="flex flex-col gap-2">
              {products.map((p) => (
                <div key={p.id} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-3">
                  <div className="text-2xl">{catEmoji(p.category)}</div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.category} · {rupee(p.price)}</p>
                    {!p.inStock && <span className="text-[10px] text-red-500 font-medium">Out of stock</span>}
                  </div>
                  <button onClick={() => setEditing(p)} className="text-gray-400 p-1"><Pencil size={15} /></button>
                  <button onClick={() => deleteProduct(p.id)} className="text-red-400 p-1"><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "orders" && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">All Orders</p>
              <button onClick={refreshOrders} className="text-green-700"><RotateCcw size={16} /></button>
            </div>
            <div className="flex flex-col gap-3">
              {sortedOrders.map((o) => {
                const idx = STATUS_FLOW.indexOf(o.status);
                const next = STATUS_FLOW[idx + 1];
                return (
                  <div key={o.id} className="bg-white border border-gray-100 rounded-xl p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-bold text-gray-800">{o.customerName}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1"><Phone size={10} />{o.customerPhone}</p>
                      </div>
                      <StatusBadge status={o.status} />
                    </div>
                    <p className="text-xs text-gray-500 mt-1 flex items-start gap-1"><MapPin size={10} className="mt-0.5 shrink-0" />{o.address}</p>
                    <div className="border-t border-gray-100 mt-2 pt-2">
                      {o.items.map((i) => (
                        <div key={i.id} className="flex justify-between text-xs text-gray-600 py-0.5">
                          <span>{i.name} x{i.qty}</span>
                          <span>{rupee(i.price * i.qty)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-sm font-bold mt-2">
                      <span>{o.payment}</span>
                      <span>{rupee(o.total)}</span>
                    </div>
                    {next && (
                      <button
                        onClick={() => updateOrderStatus(o.id, next).catch((e) => setError(e.message))}
                        className="w-full mt-2 bg-green-700 text-white text-xs font-semibold py-2 rounded-lg"
                      >
                        Mark as {next}
                      </button>
                    )}
                  </div>
                );
              })}
              {sortedOrders.length === 0 && <p className="text-center text-sm text-gray-400 py-10">No orders yet</p>}
            </div>
          </div>
        )}

        <div className="flex border-t border-gray-100 bg-white shrink-0">
          {[
            { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
            { id: "products", label: "Products", icon: ShoppingBasket },
            { id: "orders", label: "Orders", icon: ClipboardList },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center py-2 gap-0.5 ${tab === t.id ? "text-green-700" : "text-gray-400"}`}
            >
              <t.icon size={18} />
              <span className="text-[10px] font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
      {(adding || editing) && (
        <ProductForm
          initial={editing}
          onSave={saveProduct}
          onCancel={() => { setAdding(false); setEditing(null); }}
        />
      )}
    </PhoneFrame>
  );
}

/* ---------------- ROOT ---------------- */

export default function App() {
  const [screen, setScreen] = useState("role");
  const [profile, setProfile] = useState(null);
  const [adminToken, setAdminToken] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadAll = useCallback(async () => {
    setLoadError("");
    try {
      const [p, o] = await Promise.all([sbFetchProducts(), sbFetchOrders()]);
      setProducts(p);
      setOrders(o);
    } catch (e) {
      setLoadError(e.message || "Could not connect to the database");
    }
  }, []);

  useEffect(() => {
    loadAll().finally(() => setLoading(false));
  }, [loadAll]);

  const refreshOrders = async () => {
    try {
      setOrders(await sbFetchOrders());
    } catch {
      /* silent on background refresh */
    }
  };

  const placeOrder = async (order) => {
    const created = await sbInsertOrder(order);
    setOrders((prev) => [created, ...prev]);
  };

  const updateOrderStatus = async (id, status) => {
    const updated = await sbUpdateOrderStatus(id, status, adminToken);
    setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
  };

  const addProduct = async (product) => {
    const created = await sbInsertProduct(product, adminToken);
    setProducts((prev) => [...prev, created]);
  };
  const editProduct = async (id, product) => {
    const updated = await sbUpdateProduct(id, product, adminToken);
    setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
  };
  const deleteProductRemote = async (id) => {
    await sbDeleteProduct(id, adminToken);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  useEffect(() => {
    if (screen !== "customerApp" && screen !== "adminApp") return;
    const interval = setInterval(refreshOrders, 4000);
    return () => clearInterval(interval);
  }, [screen]);

  if (loading) {
    return (
      <PhoneFrame>
        <div className="flex-1 flex items-center justify-center bg-green-50">
          <ShoppingBasket className="text-green-700 animate-pulse" size={32} />
        </div>
      </PhoneFrame>
    );
  }

  if (loadError) {
    return (
      <PhoneFrame>
        <div className="flex-1 flex flex-col items-center justify-center bg-white px-8 text-center gap-3">
          <AlertCircle className="text-red-500" size={28} />
          <p className="text-sm font-semibold text-gray-800">Couldn't connect to FreshKart's database</p>
          <p className="text-xs text-gray-500">{loadError}</p>
          <button onClick={() => { setLoading(true); loadAll().finally(() => setLoading(false)); }} className="text-xs font-semibold text-green-700 border border-green-700 rounded-lg px-4 py-2 mt-2">
            Retry
          </button>
        </div>
      </PhoneFrame>
    );
  }

  if (screen === "role") return <RoleSelect onSelect={(r) => setScreen(r === "customer" ? "customerLogin" : "adminLogin")} />;
  if (screen === "customerLogin")
    return <CustomerLogin onBack={() => setScreen("role")} onLogin={(p) => { setProfile(p); setScreen("customerApp"); }} />;
  if (screen === "adminLogin")
    return <AdminLogin onBack={() => setScreen("role")} onLogin={(token) => { setAdminToken(token); setScreen("adminApp"); }} />;
  if (screen === "customerApp")
    return (
      <CustomerApp
        profile={profile}
        onLogout={() => { setProfile(null); setScreen("role"); }}
        products={products}
        orders={orders}
        refreshOrders={refreshOrders}
        placeOrder={placeOrder}
      />
    );
  if (screen === "adminApp")
    return (
      <AdminApp
        onLogout={() => { setAdminToken(null); setScreen("role"); }}
        products={products}
        orders={orders}
        onAddProduct={addProduct}
        onEditProduct={editProduct}
        onDeleteProduct={deleteProductRemote}
        refreshOrders={refreshOrders}
        updateOrderStatus={updateOrderStatus}
      />
    );
  return null;
}
