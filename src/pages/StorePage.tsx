import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

// Local storage helpers
const store = {
  get<T>(key: string, fallback: T): T {
    try {
      const v = localStorage.getItem(key);
      return v ? (JSON.parse(v) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set<T>(key: string, value: T) {
    localStorage.setItem(key, JSON.stringify(value));
  },
};

type Item = {
  id: string;
  name: string;
  price: number; // per unit (TProf)
  profit: number; // per unit (NP)
  stock: number; // available stock
};

type Sold = Record<string, string>; // id -> qty text

type StoreHistoryItem = {
  date: string;
  totals: { tProf: number; nProf: number };
};

function todayKey(): string {
  const d = new Date();
  const year = Math.max(d.getFullYear(), 2025);
  const d2025 = new Date(year, d.getMonth(), d.getDate());
  return d2025.toISOString().slice(0, 10);
}

const DEFAULT_ITEMS: Item[] = [
  { id: crypto.randomUUID(), name: "Water 1.5L", price: 80, profit: 15, stock: 0 },
  { id: crypto.randomUUID(), name: "Wipers", price: 700, profit: 120, stock: 0 },
  { id: crypto.randomUUID(), name: "Snacks", price: 120, profit: 30, stock: 0 },
  { id: crypto.randomUUID(), name: "H Gaz 1L V", price: 500, profit: 0, stock: 0 },
  { id: crypto.randomUUID(), name: "H 10 V L", price: 500, profit: 0, stock: 0 },
  { id: crypto.randomUUID(), name: "H 140 V", price: 0, profit: 0, stock: 0 },
  { id: crypto.randomUUID(), name: "H 10 V", price: 0, profit: 0, stock: 0 },
  { id: crypto.randomUUID(), name: "HTD V", price: 550, profit: 0, stock: 0 },
  { id: crypto.randomUUID(), name: "H 10 W40 1L", price: 1100, profit: 0, stock: 0 },
  { id: crypto.randomUUID(), name: "HTD 5L", price: 3000, profit: 0, stock: 0 },
  { id: crypto.randomUUID(), name: "H10W40 4L", price: 4400, profit: 0, stock: 0 },
  { id: crypto.randomUUID(), name: "H5W 40 5L", price: 4500, profit: 0, stock: 0 },
  { id: crypto.randomUUID(), name: "GALSIOL 5L", price: 850, profit: 0, stock: 0 },
  { id: crypto.randomUUID(), name: "GLASIOL 2L", price: 480, profit: 0, stock: 0 },
  { id: crypto.randomUUID(), name: "Lave Glass 2L", price: 300, profit: 0, stock: 0 },
  { id: crypto.randomUUID(), name: "Tondeuer Naftal", price: 950, profit: 0, stock: 0 },
  { id: crypto.randomUUID(), name: "Grass 1KG", price: 500, profit: 0, stock: 0 },
  { id: crypto.randomUUID(), name: "Acide", price: 220, profit: 0, stock: 0 },
  { id: crypto.randomUUID(), name: "Eau Disstile", price: 100, profit: 0, stock: 0 },
  { id: crypto.randomUUID(), name: "H 1L 75W80", price: 1200, profit: 0, stock: 0 },
  { id: crypto.randomUUID(), name: "Fut", price: 1200, profit: 0, stock: 0 },
];

export default function StorePage() {
  const [items, setItems] = useState<Item[]>(() => store.get<Item[]>("gs.store.items", DEFAULT_ITEMS));
  // Seed/merge defaults once so new catalog items appear for existing users
  useEffect(() => {
    const existing = store.get<Item[]>("gs.store.items", []);
    if (!existing || existing.length === 0) {
      setItems(DEFAULT_ITEMS);
      return;
    }
    const names = new Set(existing.map(i => i.name.trim().toLowerCase()));
    const missing = DEFAULT_ITEMS.filter(d => !names.has(d.name.trim().toLowerCase()));
    if (missing.length > 0) setItems(prev => [...prev, ...missing]);
  }, []);
  const [sold, setSold] = useState<Sold>({});

  // Shared configs with MainPage
  const [oilSetup, setOilSetup] = useState(() =>
    store.get("gs.oil", {
      prev: 0,
      today: "",
      directLiters: "",
      bottles: "",
      bottlePrice: 0,
      bottleProfit: 0,
      deductLiters: true,
      deductBottles: true,
      bottlesStock: 0,
    })
  );
  const [gazb, setGazb] = useState(() =>
    store.get("gs.gazb", {
      bottles: "",
      price: 200,
      profit: 23.5,
      deduct: true,
      stock: 0,
    })
  );

  useEffect(() => store.set("gs.store.items", items), [items]);
  useEffect(() => store.set("gs.oil", oilSetup), [oilSetup]);
  useEffect(() => store.set("gs.gazb", gazb), [gazb]);

  const rows = items.map((it) => {
    const q = Math.max(0, parseInt((sold[it.id] || "0").replace(/[^0-9]/g, "")) || 0);
    const tProf = q * (it.price || 0);
    const nProf = q * (it.profit || 0);
    return { it, q, tProf, nProf };
  });

  const totals = rows.reduce(
    (acc, r) => {
      acc.tProf += r.tProf;
      acc.nProf += r.nProf;
      return acc;
    },
    { tProf: 0, nProf: 0 }
  );

  const addItem = () => {
    const name = prompt("Item name", "New Item");
    if (!name) return;
    setItems((s) => [...s, { id: crypto.randomUUID(), name, price: 0, profit: 0, stock: 0 }]);
  };
  const removeItem = (id: string) => setItems((s) => s.filter(i => i.id !== id));

  const saveDay = () => {
    if (!confirm("Are you sure you want to save store sales for today?")) return;
    const entry: StoreHistoryItem = { date: todayKey(), totals: { tProf: Number(totals.tProf.toFixed(2)), nProf: Number(totals.nProf.toFixed(2)) } };
    const hist = store.get<StoreHistoryItem[]>("gs.history.store", []);
    store.set("gs.history.store", [...hist, entry]);
    setSold({});
    alert("Store sales saved for today");
  };

  return (
    <div className="bg-background space-y-4">
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>#Store</CardTitle>
          <CardDescription>Enter quantities sold for each item. Maintain prices and profit per unit.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.map(({ it, q, tProf, nProf }) => (
            <div key={it.id} className="grid grid-cols-12 gap-2 items-end border rounded-md p-3">
              <div className="col-span-3 space-y-1">
                <Label className="text-xs">Name</Label>
                <Input value={it.name} onChange={(e) => setItems((s) => s.map(x => x.id === it.id ? { ...x, name: e.target.value } : x))} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Price</Label>
                <Input inputMode="decimal" value={it.price} onChange={(e) => setItems((s) => s.map(x => x.id === it.id ? { ...x, price: parseFloat(e.target.value) || 0 } : x))} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Profit/Unit</Label>
                <Input inputMode="decimal" value={it.profit} onChange={(e) => setItems((s) => s.map(x => x.id === it.id ? { ...x, profit: parseFloat(e.target.value) || 0 } : x))} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Stock</Label>
                <Input inputMode="numeric" value={it.stock} onChange={(e) => setItems((s) => s.map(x => x.id === it.id ? { ...x, stock: Math.max(0, parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0) } : x))} />
              </div>
              <div className="col-span-1 space-y-1">
                <Label className="text-xs">Sold</Label>
                <Input inputMode="numeric" value={sold[it.id] || ""} onChange={(e) => setSold((s) => ({ ...s, [it.id]: e.target.value }))} placeholder="0" />
              </div>
              <div className="col-span-2 text-sm">
                <div className="flex items-center gap-2"><span className="text-muted-foreground">TP:</span><span className="font-semibold">{tProf.toFixed(2)} DZD</span></div>
                <div className="flex items-center gap-2"><span className="text-muted-foreground">NP:</span><span className="font-semibold">{nProf.toFixed(2)} DZD</span></div>
              </div>
              <div className="col-span-12 text-right">
                <Button size="sm" variant="destructive" onClick={() => removeItem(it.id)}>Delete</Button>
              </div>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Button onClick={addItem}>Add Item</Button>
            <div className="text-sm text-muted-foreground">Totals — TP: <span className="font-semibold text-foreground">{totals.tProf.toFixed(2)} DZD</span> · NP: <span className="font-semibold text-foreground">{totals.nProf.toFixed(2)} DZD</span></div>
            <div className="ml-auto"><Button onClick={saveDay}>Save Day</Button></div>
          </div>
        </CardContent>
      </Card>

      {/* Oil Bottles Stock & Prices */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>#Oil Bottles</CardTitle>
          <CardDescription>Manage oil bottles stock and unit prices. Linked to Main Page Oils section.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-12 gap-2 items-end border rounded-md p-3">
            <div className="col-span-3 space-y-1">
              <Label className="text-xs">Stock (bottles)</Label>
              <Input inputMode="numeric" value={oilSetup.bottlesStock || 0} onChange={(e) => setOilSetup((s: any) => ({ ...s, bottlesStock: Math.max(0, parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0) }))} />
            </div>
            <div className="col-span-3 space-y-1">
              <Label className="text-xs">Price/Unit (TP)</Label>
              <Input inputMode="decimal" value={oilSetup.bottlePrice || 0} onChange={(e) => setOilSetup((s: any) => ({ ...s, bottlePrice: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="col-span-3 space-y-1">
              <Label className="text-xs">Profit/Unit (NP)</Label>
              <Input inputMode="decimal" value={oilSetup.bottleProfit || 0} onChange={(e) => setOilSetup((s: any) => ({ ...s, bottleProfit: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="col-span-3 flex items-end">
              <Button className="w-full" variant="secondary" onClick={() => {
                const v = prompt('Add bottles to stock', '0');
                if (v == null) return;
                const n = Math.max(0, parseInt(v) || 0);
                setOilSetup((s: any) => ({ ...s, bottlesStock: (s.bottlesStock || 0) + n }));
              }}>Refill Stock</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gaz Bottles Stock & Prices */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>#Gaz Bottles</CardTitle>
          <CardDescription>Manage gaz bottles stock and unit prices. Linked to Main Page GazB section.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-12 gap-2 items-end border rounded-md p-3">
            <div className="col-span-3 space-y-1">
              <Label className="text-xs">Stock (bottles)</Label>
              <Input inputMode="numeric" value={gazb.stock || 0} onChange={(e) => setGazb((s: any) => ({ ...s, stock: Math.max(0, parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0) }))} />
            </div>
            <div className="col-span-3 space-y-1">
              <Label className="text-xs">TProf/Unit</Label>
              <Input inputMode="decimal" value={gazb.price || 0} onChange={(e) => setGazb((s: any) => ({ ...s, price: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="col-span-3 space-y-1">
              <Label className="text-xs">NP/Unit</Label>
              <Input inputMode="decimal" value={gazb.profit || 0} onChange={(e) => setGazb((s: any) => ({ ...s, profit: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="col-span-3 flex items-end">
              <Button className="w-full" variant="secondary" onClick={() => {
                const v = prompt('Add bottles to stock', '0');
                if (v == null) return;
                const n = Math.max(0, parseInt(v) || 0);
                setGazb((s: any) => ({ ...s, stock: (s.stock || 0) + n }));
              }}>Refill Stock</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}