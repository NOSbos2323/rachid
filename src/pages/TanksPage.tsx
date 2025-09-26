import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

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

// Types
type Tank = {
  id: string;
  name: string;
  fuelType: "ES" | "GAZ" | "GPL" | "OIL";
  capacity: number;
  current: number;
  price: number;
  profitPerL: number;
  history: { date: string; type: "fill" | "refill" | "deduct"; liters: number; note?: string; factureNo?: string }[];
};

type Assignments = Record<string, string | undefined>; // pumpId -> tankId

type Pump = { id: string; name: string; type: "ES" | "GAZ" | "GPL" };

const DEFAULT_PUMPS: Pump[] = [
  { id: "es1", name: "ES 1", type: "ES" },
  { id: "es2", name: "ES 2", type: "ES" },
  { id: "gaz1", name: "GaZ 1", type: "GAZ" },
  { id: "gaz2", name: "GaZ 2", type: "GAZ" },
  { id: "gaz3", name: "GaZ 3", type: "GAZ" },
  { id: "gaz4", name: "GaZ 4", type: "GAZ" },
  { id: "gaz5", name: "GaZ 5", type: "GAZ" },
  { id: "gpl1", name: "GPL 1", type: "GPL" },
];

const DEFAULT_TANKS: Tank[] = [
  { id: "esA", name: "ES Tank A", fuelType: "ES", capacity: 20000, current: 20000, price: 45.62, profitPerL: 3.18, history: [] },
  { id: "esB", name: "ES Tank B", fuelType: "ES", capacity: 20000, current: 20000, price: 45.62, profitPerL: 3.18, history: [] },
  { id: "gzA", name: "GAZ Tank A", fuelType: "GAZ", capacity: 30000, current: 30000, price: 45.62, profitPerL: 3.18, history: [] },
  { id: "gzB", name: "GAZ Tank B", fuelType: "GAZ", capacity: 30000, current: 30000, price: 45.62, profitPerL: 3.18, history: [] },
  { id: "gpl", name: "GPL Tank", fuelType: "GPL", capacity: 15000, current: 15000, price: 45.62, profitPerL: 3.18, history: [] },
  { id: "oil", name: "Oil Tank", fuelType: "OIL", capacity: 10000, current: 10000, price: 0, profitPerL: 0, history: [] },
];

const DEFAULT_ASSIGNMENTS: Assignments = {
  gaz1: "gzA",
  gaz2: "gzA",
  gaz3: "gzA",
  gaz4: "gzB",
  gaz5: "gzB",
  es1: "esA",
  es2: "esB",
  gpl1: "gpl",
};

function todayKey(): string {
  const d = new Date();
  const year = Math.max(d.getFullYear(), 2025);
  const d2025 = new Date(year, d.getMonth(), d.getDate());
  return d2025.toISOString().slice(0, 10);
}

export default function TanksPage() {
  const [tanks, setTanks] = useState<Tank[]>(() => store.get<Tank[]>("gs.tanks", DEFAULT_TANKS));
  const [assignments, setAssignments] = useState<Assignments>(() => store.get<Assignments>("gs.assignments", DEFAULT_ASSIGNMENTS));
  const [pumpNames, setPumpNames] = useState<Record<string, string>>(() =>
    store.get<Record<string, string>>("gs.pumps.names", Object.fromEntries(DEFAULT_PUMPS.map((p) => [p.id, p.name])))
  );

  useEffect(() => store.set("gs.tanks", tanks), [tanks]);
  useEffect(() => store.set("gs.assignments", assignments), [assignments]);
  useEffect(() => store.set("gs.pumps.names", pumpNames), [pumpNames]);

  const tankById = useMemo(() => Object.fromEntries(tanks.map(t => [t.id, t])), [tanks]);

  const addTank = () => {
    const id = crypto.randomUUID();
    const newTank: Tank = {
      id,
      name: `Tank ${tanks.length + 1}`,
      fuelType: "ES",
      capacity: 10000,
      current: 0,
      price: 0,
      profitPerL: 0,
      history: [],
    };
    setTanks((s) => [...s, newTank]);
  };

  const updateTank = (id: string, patch: Partial<Tank>) => {
    setTanks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const refillTank = (id: string) => {
    const v = prompt("Liters to add", "0");
    if (v == null) return;
    const liters = Math.max(0, parseFloat(v) || 0);
    const factureNo = prompt("Facture number (optional)") || undefined;
    const note = prompt("Note (optional)") || undefined;
    setTanks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const next = Math.min(t.capacity, Number((t.current + liters).toFixed(2)));
        return {
          ...t,
          current: next,
          history: [
            ...t.history,
            { date: todayKey(), type: t.current === 0 ? "fill" : "refill", liters, note, factureNo },
          ],
        };
      })
    );
  };

  const assignPump = (pumpId: string, tankId: string | undefined) => {
    setAssignments((prev) => ({ ...prev, [pumpId]: tankId }));
  };

  // History filters
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const historyRows = useMemo(() => {
    const all = tanks.flatMap((t) => t.history.map((h) => ({ ...h, tankId: t.id, tankName: t.name })));
    return all
      .filter((h) => {
        const afterFrom = !from || h.date >= from;
        const beforeTo = !to || h.date <= to;
        return afterFrom && beforeTo;
      })
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [tanks, from, to]);

  return (
    <div className="bg-background space-y-4">
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>#Tanks</CardTitle>
          <CardDescription>Name, price & stock. Assign pumps below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tanks.map((t) => (
            <div key={t.id} className="grid grid-cols-12 gap-3 items-end border rounded-md p-3">
              <div className="col-span-3 space-y-1">
                <Label className="text-xs">Name</Label>
                <Input value={t.name} onChange={(e) => updateTank(t.id, { name: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Type</Label>
                <select
                  className="w-full h-9 rounded-md border bg-transparent px-2 text-sm"
                  value={t.fuelType}
                  onChange={(e) => updateTank(t.id, { fuelType: e.target.value as Tank["fuelType"] })}
                >
                  <option value="ES">ES</option>
                  <option value="GAZ">GAZ</option>
                  <option value="GPL">GPL</option>
                  <option value="OIL">OIL</option>
                </select>
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Capacity (L)</Label>
                <Input
                  inputMode="decimal"
                  value={t.capacity}
                  onChange={(e) => updateTank(t.id, { capacity: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Current (L)</Label>
                <Input
                  inputMode="decimal"
                  value={t.current}
                  onChange={(e) => updateTank(t.id, { current: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="col-span-1 space-y-1">
                <Label className="text-xs">Price</Label>
                <Input
                  inputMode="decimal"
                  value={t.price}
                  onChange={(e) => updateTank(t.id, { price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="col-span-1 space-y-1">
                <Label className="text-xs">Profit/L</Label>
                <Input
                  inputMode="decimal"
                  value={t.profitPerL}
                  onChange={(e) => updateTank(t.id, { profitPerL: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="col-span-1 flex items-end">
                <Button variant="secondary" className="w-full" onClick={() => refillTank(t.id)}>Refill</Button>
              </div>
              <div className="col-span-12 text-xs text-muted-foreground">
                History: {t.history.length ? t.history.slice(-3).map(h => `${h.date} ${h.type} +${h.liters}L`).join(" · ") : "—"}
              </div>
            </div>
          ))}

          <div>
            <Button onClick={addTank}>Add Tank</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Assign Pumps</CardTitle>
          <CardDescription>Each pump can be linked to one tank of the same type. You can also rename pumps.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {DEFAULT_PUMPS.map((p) => (
            <div key={p.id} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-3 space-y-1">
                <Label className="text-xs">Pump Name</Label>
                <Input
                  value={pumpNames[p.id] ?? p.name}
                  onChange={(e) => setPumpNames((s) => ({ ...s, [p.id]: e.target.value }))}
                />
              </div>
              <div className="col-span-2 text-xs text-muted-foreground">Type: {p.type}</div>
              <div className="col-span-7">
                <Label className="text-xs">Linked Tank</Label>
                <select
                  className="w-full h-9 rounded-md border bg-transparent px-2 text-sm"
                  value={assignments[p.id] || ""}
                  onChange={(e) => assignPump(p.id, e.target.value || undefined)}
                >
                  <option value="">— None —</option>
                  {tanks
                    .filter((t) => (p.type === "ES" && t.fuelType === "ES") || (p.type === "GAZ" && t.fuelType === "GAZ") || (p.type === "GPL" && t.fuelType === "GPL"))
                    .map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Fill & Refill History</CardTitle>
          <CardDescription>Browse by date range. Includes deductions logged from Main Page saves.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-12 gap-2 mb-3">
            <div className="col-span-3 space-y-1">
              <Label className="text-xs">From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="col-span-3 space-y-1">
              <Label className="text-xs">To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
          <div className="max-h-72 overflow-auto text-sm space-y-2">
            {historyRows.length === 0 ? (
              <div className="text-muted-foreground">No history in selected range.</div>
            ) : (
              historyRows.map((h, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center border rounded-md p-2">
                  <div className="col-span-12 sm:col-span-4 md:col-span-3 font-medium">{h.tankName}</div>
                  <div className="col-span-6 sm:col-span-3 md:col-span-2">{h.date}</div>
                  <div className="col-span-6 sm:col-span-3 md:col-span-2 capitalize">{h.type}</div>
                  <div className="col-span-6 sm:col-span-3 md:col-span-3 font-semibold">{h.type === "deduct" ? "-" : "+"}{h.liters} L</div>
                  <div className="col-span-6 sm:col-span-3 md:col-span-2 text-xs text-muted-foreground">Facture: {h.factureNo || '—'}</div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}