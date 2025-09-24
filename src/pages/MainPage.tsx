import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

// Default pump setup
const DEFAULT_PUMPS = [
  { id: "es1", name: "ES 1", type: "ES" as const, price: 45.62, profitPerL: 3.18 },
  { id: "es2", name: "ES 2", type: "ES" as const, price: 45.62, profitPerL: 3.18 },
  { id: "gaz1", name: "GaZ 1", type: "GAZ" as const, price: 45.62, profitPerL: 3.18 },
  { id: "gaz2", name: "GaZ 2", type: "GAZ" as const, price: 45.62, profitPerL: 3.18 },
  { id: "gaz3", name: "GaZ 3", type: "GAZ" as const, price: 45.62, profitPerL: 3.18 },
  { id: "gaz4", name: "GaZ 4", type: "GAZ" as const, price: 45.62, profitPerL: 3.18 },
  { id: "gaz5", name: "GaZ 5", type: "GAZ" as const, price: 45.62, profitPerL: 3.18 },
  { id: "gpl1", name: "GPL 1", type: "GPL" as const, price: 45.62, profitPerL: 3.18 },
];

type Pump = typeof DEFAULT_PUMPS[number];

type PumpReadings = Record<string, { prev: number }>; // prev = yesterday's reading

type TodayInputs = Record<string, string>; // text inputs for today

type DailyHistoryItem = {
  date: string; // yyyy-mm-dd
  totals: { liters: number; tProf: number; nProf: number };
};

// Tanks & assignments
type Tank = {
  id: string;
  name: string;
  fuelType: "ES" | "GAZ" | "GPL" | "OIL";
  capacity: number;
  current: number;
  price: number; // selling price per L
  profitPerL: number; // net profit per L
  history: { date: string; type: "fill" | "refill" | "deduct"; liters: number; note?: string }[];
};

type Assignments = Record<string, string | undefined>; // pumpId -> tankId

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
  gaz3: "gzA", // 3 pumps -> 1 tank
  gaz4: "gzB",
  gaz5: "gzB", // 2 pumps -> 1 tank
  es1: "esA", // 1 pump -> 1 tank
  es2: "esB", // 1 pump -> 1 tank
  gpl1: "gpl", // 1 pump -> 1 tank
};

type OtherExpenseType = 'Electricity' | 'Fine' | 'Maintenance' | 'Worker payment' | 'Other';

// Add Credit client type
type CreditClient = {
  id: string;
  name: string;
  group: 'Companies' | 'Entrepreneurs' | 'Agricultures' | 'Normal People' | 'Other';
};

type OtherExpense = {
  id: string;
  date: string;
  name: string;
  type: OtherExpenseType;
  amount: number;
  deductFrom: 'TP' | 'NP';
  note?: string;
  workerId?: string;
};

type OtherExpenseDraft = {
  name: string;
  type: OtherExpenseType;
  amount: string; // text input
  deductFrom: 'TP' | 'NP';
  note: string;
  workerId?: string;
};

type Worker = {
  id: string;
  name: string;
  lastPayment?: { date: string; amount: number };
  payments?: { date: string; amount: number; note?: string }[];
};

function todayKey(): string {
  const d = new Date();
  const year = Math.max(d.getFullYear(), 2025);
  const d2025 = new Date(year, d.getMonth(), d.getDate());
  return d2025.toISOString().slice(0, 10);
}

export default function MainPage() {
  // Load custom pump names saved from Tanks page (fallback to defaults)
  const pumpNames = store.get<Record<string, string>>("gs.pumps.names", {});
  const pumps = DEFAULT_PUMPS.map((p) => ({ ...p, name: pumpNames[p.id] || p.name }));

  const [readings, setReadings] = useState<PumpReadings>(() =>
    store.get<PumpReadings>("gs.pumps.readings", Object.fromEntries(pumps.map(p => [p.id, { prev: 0 }])))
  );
  const [today, setToday] = useState<TodayInputs>(() => ({}));

  // Tanks & assignments
  const [tanks, setTanks] = useState<Tank[]>(() => store.get<Tank[]>("gs.tanks", DEFAULT_TANKS));
  const [assignments, setAssignments] = useState<Assignments>(() => store.get<Assignments>("gs.assignments", DEFAULT_ASSIGNMENTS));

  // Oil section state
  const [oil, setOil] = useState(() =>
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

  // Gas Bottles section state
  const [gazb, setGazb] = useState(() =>
    store.get("gs.gazb", {
      bottles: "",
      price: 200,
      profit: 23.5,
      deduct: true,
      stock: 0,
    })
  );

  // Store items (for showing in Oils section) — hidden when stock = 0
  type StoreItem = { id: string; name: string; price: number; profit: number; stock: number };
  const [storeItemsMP, setStoreItemsMP] = useState<StoreItem[]>(() => store.get<StoreItem[]>("gs.store.items", []));
  const visibleStoreItems = (storeItemsMP || []).filter(it => (it.stock || 0) > 0);

  // Oil products selling like fuel: show Prev (stock), input Today Left -> Sold = Prev - Today
  const [storeLeft, setStoreLeft] = useState<Record<string, string>>(() => store.get<Record<string, string>>("gs.store.left.today", {}));
  useEffect(() => { store.set("gs.store.left.today", storeLeft); }, [storeLeft]);

  const storeRows = visibleStoreItems.map((it) => {
    const prev = it.stock || 0;
    const todayLeft = Math.max(0, parseInt((storeLeft[it.id] || "").replace(/[^0-9]/g, '')) || 0);
    const sold = Math.max(0, prev - todayLeft);
    const tProf = sold * (it.price || 0);
    const nProf = sold * (it.profit || 0);
    return { it, prev, todayLeft, sold, tProf, nProf };
  });

  const storeTotals = storeRows.reduce((acc, r) => ({ tProf: acc.tProf + r.tProf, nProf: acc.nProf + r.nProf }), { tProf: 0, nProf: 0 });

  const applyStoreSales = () => {
    const all = store.get<StoreItem[]>("gs.store.items", []);
    const updated = all.map((it) => {
      const left = Math.max(0, parseInt((storeLeft[it.id] || "").replace(/[^0-9]/g, '')) || it.stock || 0);
      return { ...it, stock: left };
    });
    store.set("gs.store.items", updated);
    setStoreItemsMP(updated);
    setStoreLeft({});
    alert("Updated stock from Today Left");
  };

  // Other Expenses state
  const [otherItems, setOtherItems] = useState<OtherExpense[]>(() => store.get<OtherExpense[]>("gs.other.itemsToday", []));
  const [expDraft, setExpDraft] = useState<OtherExpenseDraft>({ name: "", type: "Other", amount: "", deductFrom: "NP", note: "" });

  // Workers state (used when type = Worker payment)
  const [workers, setWorkers] = useState<Worker[]>(() =>
    store.get<Worker[]>("gs.workers.list", [
      { id: "w1", name: "Worker A" },
      { id: "w2", name: "Worker B" },
    ])
  );

  // Cashier change (deducted from Net Profit)
  const [cashierChange, setCashierChange] = useState<number>(() => store.get<number>("gs.cashier.change.today", 0));

  // Credit sales/payments (today)
  const [creditsSumToday, setCreditsSumToday] = useState<number>(() => store.get<number>("gs.credits.today", 0));
  const [paidCreditsToday, setPaidCreditsToday] = useState<number>(() => store.get<number>("gs.credits.paid.today", 0));
  // Load clients created in Credits page
  const [creditClients, setCreditClients] = useState<CreditClient[]>(() => store.get<CreditClient[]>("gs.credits.clients", []));
  // sanitize any clients that may have empty IDs (avoids Radix Select.Item empty value error)
  useEffect(() => {
    const needFix = creditClients.some(c => !c.id || c.id.trim() === "");
    if (needFix) {
      const fixed = creditClients.map(c => ({ ...c, id: c.id && c.id.trim() !== "" ? c.id : crypto.randomUUID() }));
      setCreditClients(fixed);
      store.set("gs.credits.clients", fixed);
    }
  }, [creditClients]);

  useEffect(() => {
    store.set("gs.pumps.readings", readings);
  }, [readings]);
  useEffect(() => {
    store.set("gs.tanks", tanks);
  }, [tanks]);
  useEffect(() => {
    store.set("gs.assignments", assignments);
  }, [assignments]);
  useEffect(() => {
    store.set("gs.oil", oil);
  }, [oil]);
  useEffect(() => {
    store.set("gs.gazb", gazb);
  }, [gazb]);
  useEffect(() => {
    store.set("gs.other.itemsToday", otherItems);
  }, [otherItems]);
  useEffect(() => {
    store.set("gs.workers.list", workers);
  }, [workers]);
  useEffect(() => {
    store.set("gs.cashier.change.today", cashierChange);
  }, [cashierChange]);

  const tankById = useMemo(() => Object.fromEntries(tanks.map(t => [t.id, t])), [tanks]);
  const oilTank = tanks.find(t => t.fuelType === "OIL");

  const rows = pumps.map((p) => {
    const prev = readings[p.id]?.prev ?? 0;
    const tn = parseFloat(today[p.id] || "0");
    const liters = Math.max(0, tn - prev);

    const tankId = assignments[p.id];
    const tank = tankId ? tankById[tankId] : undefined;
    const price = tank?.price ?? p.price;
    const profitPerL = tank?.profitPerL ?? p.profitPerL;

    const tProf = liters * price;
    const nProf = liters * profitPerL;

    return { pump: p, prev, tn, liters, tProf, nProf, tank };
  });

  const totals = rows.reduce(
    (acc, r) => {
      acc.liters += r.liters;
      acc.tProf += r.tProf;
      acc.nProf += r.nProf;
      return acc;
    },
    { liters: 0, tProf: 0, nProf: 0 }
  );

  const byType = rows.reduce(
    (acc, r) => {
      acc[r.pump.type] = (acc[r.pump.type] || 0) + r.liters;
      return acc;
    },
    {} as Record<string, number>
  );

  // OIL calculations
  const oilLitersByReadings = Math.max(0, (parseFloat(oil.today || "0") - (oil.prev || 0)) || 0);
  const oilLitersDirect = Math.max(0, parseFloat(oil.directLiters || "0") || 0);
  const oilTotalLiters = oilLitersByReadings + oilLitersDirect;
  const oilPrice = oilTank?.price || 0;
  const oilProfitPerL = oilTank?.profitPerL || 0;
  const oilTProf = oilTotalLiters * oilPrice;
  const oilNProf = oilTotalLiters * oilProfitPerL;

  // OIL bottles calculations
  const oilBottlesSold = Math.max(0, parseInt(oil.bottles || "0") || 0);
  const oilBottlesTProf = oilBottlesSold * (oil.bottlePrice || 0);
  const oilBottlesNProf = oilBottlesSold * (oil.bottleProfit || 0);

  // GazB calculations
  const gazbSold = Math.max(0, parseInt(gazb.bottles || "0") || 0);
  const gazbTProf = gazbSold * (gazb.price || 0);
  const gazbNProf = gazbSold * (gazb.profit || 0);

  const overall = {
    tProf: totals.tProf + oilTProf + oilBottlesTProf + gazbTProf + storeTotals.tProf,
    nProf: totals.nProf + oilNProf + oilBottlesNProf + gazbNProf + storeTotals.nProf,
  };

  // Other expenses adjustments
  const tpAdj = otherItems.filter(i => i.deductFrom === 'TP').reduce((s, i) => s + (i.amount || 0), 0);
  const npAdj = otherItems.filter(i => i.deductFrom === 'NP').reduce((s, i) => s + (i.amount || 0), 0);
  const finalTotals = {
    tProf: Math.max(0, overall.tProf - tpAdj + creditsSumToday - paidCreditsToday),
    nProf: Math.max(0, overall.nProf - npAdj + (cashierChange || 0)),
  };
  const creditsToday = store.get<number>("gs.credits.today", 0);

  // Allow editing Oil previous number (P.N)
  const resetOilPrev = () => {
    const v = prompt("Enter previous reading (P.N)", String(oil.prev ?? 0));
    if (v == null) return;
    const n = parseFloat(v) || 0;
    setOil((s: any) => ({ ...s, prev: n }));
  };

  // Add missing saveDay implementation
  const saveDay = () => {
    const date = todayKey();

    // 1) Deduct liters from assigned tanks and log history
    setTanks((prev) => {
      const next = prev.map((t) => ({ ...t }));
      const indexById = Object.fromEntries(next.map((t, i) => [t.id, i]));

      const applyDeduct = (tankId: string | undefined, liters: number, note?: string) => {
        if (!tankId || liters <= 0) return;
        const idx = indexById[tankId];
        if (idx == null) return;
        const t = next[idx];
        t.current = Math.max(0, (t.current || 0) - liters);
        t.history = [
          ...t.history,
          { date, type: "deduct" as const, liters: Number(liters.toFixed(2)), note },
        ];
        next[idx] = t;
      };

      // From pump sales
      rows.forEach((r) => {
        if (r.tank && r.liters > 0) applyDeduct(r.tank.id, r.liters, r.pump.name);
      });

      // Oil liters (from oil tank)
      if (oilTank && oil.deductLiters) {
        applyDeduct(oilTank.id, oilTotalLiters, "Oil liters");
      }

      return next;
    });

    // 1.5) Update store items stock from Today Left like pumps (Prev -> Today)
    {
      const all = store.get<StoreItem[]>("gs.store.items", []);
      const updated = all.map((it) => {
        const left = Math.max(0, parseInt((storeLeft[it.id] || "").replace(/[^0-9]/g, '')) || it.stock || 0);
        return { ...it, stock: left };
      });
      store.set("gs.store.items", updated);
      setStoreItemsMP(updated);
      setStoreLeft({});
    }

    // 2) Update stocks and reset inputs for oil/gazb
    setOil((s: any) => ({
      ...s,
      bottlesStock: s.deductBottles ? Math.max(0, (s.bottlesStock || 0) - (oilBottlesSold || 0)) : (s.bottlesStock || 0),
      prev: parseFloat(s.today || "0") || s.prev,
      today: "",
      bottles: "",
    }));
    setGazb((s: any) => ({
      ...s,
      stock: s.deduct ? Math.max(0, (s.stock || 0) - (gazbSold || 0)) : (s.stock || 0),
      bottles: "",
    }));

    // 3) Update pump previous readings to today's
    setReadings((prev) => {
      const updated: PumpReadings = { ...prev };
      pumps.forEach((p) => {
        const tn = parseFloat(today[p.id] || "0");
        if (!isNaN(tn) && tn > 0) updated[p.id] = { prev: tn };
      });
      return updated;
    });
    setToday({});

    // 4) Persist daily history for Overall Totals page
    const hist = store.get<DailyHistoryItem[]>("gs.history.daily", []);
    const entry: DailyHistoryItem = {
      date,
      totals: {
        liters: Number((totals.liters + oilTotalLiters).toFixed(2)),
        // include adjustments (other expenses + credits) in saved totals
        tProf: Number(finalTotals.tProf.toFixed(2)),
        nProf: Number(finalTotals.nProf.toFixed(2)),
      },
    };
    store.set("gs.history.daily", [...hist, entry]);

    // Reset daily credit aggregates
    store.set("gs.credits.today", 0);
    store.set("gs.credits.paid.today", 0);
    setCreditsSumToday(0);
    setPaidCreditsToday(0);
    // Reset cashier change
    store.set("gs.cashier.change.today", 0);
    setCashierChange(0);

    alert("Saved day");
  };

  // Selling with credit
  type CreditTx = {
    id: string;
    date: string;
    customer: string;
    amount: number;
    note?: string;
    kind: 'sale' | 'payment';
    category?: 'Fuel' | 'Store' | 'Other';
  };
  const [creditLedger, setCreditLedger] = useState<CreditTx[]>(() => store.get<CreditTx[]>("gs.credits.ledger", []));
  useEffect(() => { store.set("gs.credits.ledger", creditLedger); }, [creditLedger]);
  const [creditDraft, setCreditDraft] = useState({ clientId: "", op: 'credit' as 'credit'|'payment', amount: "", note: "", category: 'Fuel' as 'Fuel'|'Store'|'Other' });

  const selectedClient = useMemo(() => creditClients.find(c => c.id === creditDraft.clientId), [creditClients, creditDraft.clientId]);

  const addCreditTx = () => {
    const amount = parseFloat(creditDraft.amount.replace(',', '.')) || 0;
    if (!creditDraft.clientId || amount <= 0) return;
    const tx: CreditTx = {
      id: crypto.randomUUID(),
      date: todayKey(),
      customer: selectedClient?.name || "",
      amount: Number(amount.toFixed(2)),
      note: creditDraft.note || undefined,
      kind: creditDraft.op === 'credit' ? 'sale' : 'payment',
      category: creditDraft.category,
    };
    setCreditLedger((s) => [...s, tx]);
    if (creditDraft.op === 'credit') {
      const cur = store.get<number>("gs.credits.today", 0) + tx.amount;
      store.set("gs.credits.today", cur);
      setCreditsSumToday(cur);
    } else {
      const curPaid = store.get<number>("gs.credits.paid.today", 0) + tx.amount;
      store.set("gs.credits.paid.today", curPaid);
      setPaidCreditsToday(curPaid);
    }
    setCreditDraft({ clientId: "", op: 'credit', amount: "", note: "", category: creditDraft.category });
  };

  const todaysCreditTx = useMemo(() => creditLedger.filter(tx => tx.date === todayKey()), [creditLedger]);

  const addExpense = () => {
    const amount = parseFloat(expDraft.amount.replace(",", ".")) || 0;
    if (!expDraft.name || amount <= 0) return;
    const forceNP = expDraft.type === 'Worker payment';
    const newItem: OtherExpense = {
      id: crypto.randomUUID(),
      date: todayKey(),
      name: expDraft.name,
      type: expDraft.type,
      amount: Number(amount.toFixed(2)),
      deductFrom: forceNP ? 'NP' : expDraft.deductFrom,
      note: expDraft.note || undefined,
      workerId: expDraft.type === 'Worker payment' ? expDraft.workerId : undefined,
    };
    setOtherItems((s) => [newItem, ...s]);

    // If worker payment, record in worker history and update last payment
    if (newItem.type === 'Worker payment' && newItem.workerId) {
      setWorkers((prev) => prev.map(w => {
        if (w.id !== newItem.workerId) return w;
        const payments = [...(w.payments || []), { date: newItem.date, amount: -newItem.amount, note: newItem.name }];
        return { ...w, payments, lastPayment: { date: newItem.date, amount: -newItem.amount } };
      }));
    }

    setExpDraft({ name: "", type: "Other", amount: "", deductFrom: "NP", note: "" });
  };

  const removeExpense = (id: string) => setOtherItems((s) => s.filter(i => i.id !== id));

  const resetPrev = (id: string) => {
    const v = prompt("Enter previous reading (P.N)", String(readings[id]?.prev ?? 0));
    if (v == null) return;
    const n = parseFloat(v) || 0;
    setReadings((s) => ({ ...s, [id]: { prev: n } }));
  };

  return (
    <div className="bg-background">
      {/* Pumps */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>#Pumps</CardTitle>
          <CardDescription>
            Enter today's (T.N) readings. Yesterday's (P.N) is stored after first entry and auto-updates on Save Day.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.map((r) => (
            <div key={r.pump.id} className="grid grid-cols-12 items-end gap-2">
              <div className="col-span-2 text-sm font-medium">
                <div>{r.pump.name}</div>
                {r.tank && (
                  <div className="text-xs text-muted-foreground">{r.tank.name}</div>
                )}
              </div>
              <div className="col-span-3 space-y-1">
                <Label className="text-xs">Yesterday</Label>
                <div className="flex gap-2">
                  <Input value={r.prev} readOnly className="bg-muted/30" />
                  <Button type="button" variant="secondary" size="sm" onClick={() => resetPrev(r.pump.id)}>
                    Edit
                  </Button>
                </div>
              </div>
              <div className="col-span-3 space-y-1">
                <Label className="text-xs">Today</Label>
                <Input
                  inputMode="decimal"
                  placeholder="0"
                  value={today[r.pump.id] || ""}
                  onChange={(e) =>
                    setToday((s) => ({ ...s, [r.pump.id]: e.target.value.replace(",", ".") }))
                  }
                />
              </div>
              <div className="col-span-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Liters:</span>
                  <span className="font-semibold">{r.liters.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">TProf:</span>
                  <span className="font-semibold">{r.tProf.toFixed(2)} DZD</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">NProf:</span>
                  <span className="font-semibold">{r.nProf.toFixed(2)} DZD</span>
                </div>
              </div>
            </div>
          ))}

          <Separator className="my-2" />

          <div className="grid grid-cols-12 gap-2 text-sm">
            <div className="col-span-6">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Total Liters:</span>
                <span className="font-semibold">{totals.liters.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">ES Liters:</span>
                <span className="font-semibold">{(byType["ES"] || 0).toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">GAZ Liters:</span>
                <span className="font-semibold">{(byType["GAZ"] || 0).toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">GPL Liters:</span>
                <span className="font-semibold">{(byType["GPL"] || 0).toFixed(2)}</span>
              </div>
            </div>
            <div className="col-span-6">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Total Profite:</span>
                <span className="font-semibold">{totals.tProf.toFixed(2)} DZD</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Net Profite:</span>
                <span className="font-semibold">{totals.nProf.toFixed(2)} DZD</span>
              </div>
            </div>
          </div>

          {/* Save Day moved to bottom Overall section */}
          
        </CardContent>
      </Card>

      {/* OILS */}
      <Card className="bg-card mt-4">
        <CardHeader>
          <CardTitle>#Oils</CardTitle>
          <CardDescription>Liters by readings or direct entry, and bottles. Prices pulled from Oil Tank.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-3 text-sm font-medium">Liters via Readings</div>
            <div className="col-span-3 space-y-1">
              <Label className="text-xs">Yesterday</Label>
              <div className="flex gap-2">
                <Input value={oil.prev} readOnly className="bg-muted/30" />
                <Button type="button" variant="secondary" size="sm" onClick={resetOilPrev}>Edit</Button>
              </div>
            </div>
            <div className="col-span-3 space-y-1">
              <Label className="text-xs">Today</Label>
              <Input value={oil.today}
                     onChange={(e) => setOil((s: any) => ({ ...s, today: e.target.value.replace(",", ".") }))}
                     inputMode="decimal" placeholder="0" />
            </div>
            <div className="col-span-3 flex items-center gap-2">
              <Label className="text-xs">Deduct from tank</Label>
              <Switch checked={!!oil.deductLiters} onCheckedChange={(v) => setOil((s: any) => ({ ...s, deductLiters: v }))} />
            </div>
          </div>

          <div className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-3 text-sm font-medium">Liters Direct</div>
            <div className="col-span-3 space-y-1">
              <Label className="text-xs">Liters</Label>
              <Input value={oil.directLiters}
                     onChange={(e) => setOil((s: any) => ({ ...s, directLiters: e.target.value.replace(",", ".") }))}
                     inputMode="decimal" placeholder="0" />
            </div>
            <div className="col-span-6 text-sm">
              <div className="text-xs text-muted-foreground">Price: {oilPrice} • Profit/L: {oilProfitPerL}</div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-3 text-sm font-medium">Bottles</div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Sold</Label>
              <Input value={oil.bottles}
                     onChange={(e) => setOil((s: any) => ({ ...s, bottles: e.target.value.replace(/[^0-9]/g, '') }))}
                     inputMode="numeric" placeholder="0" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Price/Unit</Label>
              <Input value={oil.bottlePrice}
                     onChange={(e) => setOil((s: any) => ({ ...s, bottlePrice: parseFloat(e.target.value) || 0 }))}
                     inputMode="decimal" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Profit/Unit</Label>
              <Input value={oil.bottleProfit}
                     onChange={(e) => setOil((s: any) => ({ ...s, bottleProfit: parseFloat(e.target.value) || 0 }))}
                     inputMode="decimal" />
            </div>
            <div className="col-span-3 flex items-center gap-2">
              <Label className="text-xs">Deduct stock</Label>
              <Switch checked={!!oil.deductBottles} onCheckedChange={(v) => setOil((s: any) => ({ ...s, deductBottles: v }))} />
            </div>
            <div className="col-span-12 text-xs text-muted-foreground">Stock: {oil.bottlesStock || 0} bottles</div>
          </div>

          <Separator />

          {/* Products (in oil section, direct sales) */}
          <div className="space-y-2">
            {visibleStoreItems.length === 0 ? (
              <div className="text-sm text-muted-foreground">No products in stock.</div>
            ) : (
              <div className="space-y-2 text-sm">
                {storeRows.map(({ it, prev, todayLeft, sold, tProf, nProf }) => (
                  <div key={it.id} className="grid grid-cols-12 gap-2 items-end border rounded-md p-2">
                    <div className="col-span-3 font-medium truncate" title={it.name}>{it.name}</div>
                    <div className="col-span-2">Prev: {prev}</div>
                    <div className="col-span-2">Price: {Number(it.price || 0).toFixed(2)}</div>
                    <div className="col-span-2">NP/U: {Number(it.profit || 0).toFixed(2)}</div>
                    <div className="col-span-3 space-y-1">
                      <Label className="text-xs">Today Left</Label>
                      <Input inputMode="numeric" value={storeLeft[it.id] || ""} onChange={(e) => setStoreLeft(s => ({ ...s, [it.id]: e.target.value }))} placeholder="0" />
                    </div>
                    <div className="col-span-12 grid grid-cols-12 gap-2 text-xs">
                      <div className="col-span-4">Sold: <span className="font-semibold">{sold}</span></div>
                      <div className="col-span-4">TP: <span className="font-semibold">{tProf.toFixed(2)} DZD</span></div>
                      <div className="col-span-4">NP: <span className="font-semibold">{nProf.toFixed(2)} DZD</span></div>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <div className="text-sm text-muted-foreground">Totals — TP: <span className="font-semibold text-foreground">{storeTotals.tProf.toFixed(2)} DZD</span> · NP: <span className="font-semibold text-foreground">{storeTotals.nProf.toFixed(2)} DZD</span></div>
                  <div className="ml-auto"><Button size="sm" onClick={applyStoreSales}>Update stock</Button></div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-12 gap-2 text-sm">
            <div className="col-span-6 space-y-1">
              <div>Liters (readings): {oilLitersByReadings.toFixed(2)} L</div>
              <div>Liters (direct): {oilLitersDirect.toFixed(2)} L</div>
              <div>Bottles sold: {oilBottlesSold}</div>
            </div>
            <div className="col-span-6 space-y-1">
              <div>TProf (liters): {oilTProf.toFixed(2)} DZD</div>
              <div>NP (liters): {oilNProf.toFixed(2)} DZD</div>
              <div>TProf (bottles): {oilBottlesTProf.toFixed(2)} DZD</div>
              <div>NP (bottles): {oilBottlesNProf.toFixed(2)} DZD</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gas Bottles */}
      <Card className="bg-card mt-4">
        <CardHeader>
          <CardTitle>#GazB</CardTitle>
          <CardDescription>Number of bottles sold. Default TProf 200, NP 23.50 per bottle.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-3 space-y-1">
              <Label className="text-xs">Sold</Label>
              <Input value={gazb.bottles}
                     onChange={(e) => setGazb((s: any) => ({ ...s, bottles: e.target.value.replace(/[^0-9]/g, '') }))}
                     inputMode="numeric" placeholder="0" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">TProf/Unit</Label>
              <Input value={gazb.price}
                     onChange={(e) => setGazb((s: any) => ({ ...s, price: parseFloat(e.target.value) || 0 }))}
                     inputMode="decimal" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">NP/Unit</Label>
              <Input value={gazb.profit}
                     onChange={(e) => setGazb((s: any) => ({ ...s, profit: parseFloat(e.target.value) || 0 }))}
                     inputMode="decimal" />
            </div>
            <div className="col-span-3 flex items-center gap-2">
              <Label className="text-xs">Deduct stock</Label>
              <Switch checked={!!gazb.deduct} onCheckedChange={(v) => setGazb((s: any) => ({ ...s, deduct: v }))} />
            </div>
            <div className="col-span-12 text-xs text-muted-foreground">Stock: {gazb.stock || 0} bottles</div>
          </div>

          <div className="text-sm">
            <div>TProf: {gazbTProf.toFixed(2)} DZD</div>
            <div>NP: {gazbNProf.toFixed(2)} DZD</div>
          </div>
        </CardContent>
      </Card>

      {/* Selling with Credit */}
      <Card className="bg-card mt-4">
        <CardHeader>
          <CardTitle>#Selling with Credit</CardTitle>
          <CardDescription>Choose client from list, record Credit or Payment. Affects Total Profit only and updates client account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-12 gap-2 items-end border rounded-md p-3">
            <div className="col-span-3 space-y-1">
              <Label className="text-xs">Client</Label>
              <Select value={creditDraft.clientId} onValueChange={(v) => setCreditDraft(d => ({ ...d, clientId: v }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {creditClients.length === 0 ? (
                    <SelectItem value="no_clients" disabled>No clients — add in Credits page</SelectItem>
                  ) : (
                    creditClients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Operation</Label>
              <Select value={creditDraft.op} onValueChange={(v) => setCreditDraft(d => ({ ...d, op: v as 'credit'|'payment' }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Choose" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Credit</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={creditDraft.category} onValueChange={(v) => setCreditDraft(d => ({ ...d, category: v as 'Fuel'|'Store'|'Other' }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fuel">Fuel</SelectItem>
                  <SelectItem value="Store">Store</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Amount (DZD)</Label>
              <Input inputMode="decimal" value={creditDraft.amount} onChange={(e) => setCreditDraft(d => ({ ...d, amount: e.target.value }))} placeholder="0" />
            </div>
            <div className="col-span-3 space-y-1">
              <Label className="text-xs">Note</Label>
              <Input value={creditDraft.note} onChange={(e) => setCreditDraft(d => ({ ...d, note: e.target.value }))} placeholder="Optional note" />
            </div>
            <div className="col-span-12">
              <Button onClick={addCreditTx} disabled={!creditDraft.clientId}>Add</Button>
            </div>
          </div>

          {/* Today list */}
          {todaysCreditTx.length === 0 ? (
            <div className="text-sm text-muted-foreground">No credit operations today.</div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-auto text-sm">
              {todaysCreditTx.map((tx) => (
                <div key={tx.id} className="grid grid-cols-12 gap-2 items-center border rounded-md p-2">
                  <div className="col-span-4 font-medium">{tx.customer}</div>
                  <div className="col-span-3">{tx.kind === 'sale' ? (tx.category || 'Sale') : 'Payment'}</div>
                  <div className={`col-span-3 font-semibold ${tx.kind === 'sale' ? 'text-green-600' : 'text-red-600'}`}>{tx.kind === 'sale' ? '+ ' : '- '} {tx.amount.toFixed(2)} DZD</div>
                  <div className="col-span-2 text-xs text-muted-foreground text-right">{tx.date}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Other Expenses */}
      <Card className="bg-card mt-4">
        <CardHeader>
          <CardTitle>#Other Expenses</CardTitle>
          <CardDescription>Add expenses and choose whether to deduct from Total or Net profit. Worker payments always deduct from Net.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Draft */}
          <div className="grid grid-cols-12 gap-2 items-end border rounded-md p-3">
            <div className="col-span-3 space-y-1">
              <Label className="text-xs">Name</Label>
              <Input value={expDraft.name} onChange={(e) => setExpDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Electricity bill" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={expDraft.type} onValueChange={(v) => setExpDraft((d) => ({ ...d, type: v as OtherExpenseType, deductFrom: v === 'Worker payment' ? 'NP' : d.deductFrom }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Electricity">Electricity</SelectItem>
                  <SelectItem value="Fine">Fine</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  <SelectItem value="Worker payment">Worker payment</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Deduct From</Label>
              <Select disabled={expDraft.type === 'Worker payment'} value={expDraft.deductFrom} onValueChange={(v) => setExpDraft((d) => ({ ...d, deductFrom: v as 'TP' | 'NP' }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="From" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TP">Total Profit</SelectItem>
                  <SelectItem value="NP">Net Profit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Amount</Label>
              <Input inputMode="decimal" value={expDraft.amount} onChange={(e) => setExpDraft((d) => ({ ...d, amount: e.target.value }))} placeholder="0" />
            </div>
            <div className="col-span-3 space-y-1" hidden={expDraft.type !== 'Worker payment'}>
              <Label className="text-xs">Worker</Label>
              <Select value={expDraft.workerId} onValueChange={(v) => setExpDraft((d) => ({ ...d, workerId: v }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select worker" /></SelectTrigger>
                <SelectContent>
                  {workers.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-12 space-y-1">
              <Label className="text-xs">Note</Label>
              <Input value={expDraft.note} onChange={(e) => setExpDraft((d) => ({ ...d, note: e.target.value }))} placeholder="Optional note" />
            </div>
            <div className="col-span-12">
              <Button onClick={addExpense}>Add Expense</Button>
            </div>
          </div>

          {/* List */}
          {otherItems.length === 0 ? (
            <div className="text-sm text-muted-foreground">No expenses yet.</div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-auto">
              {otherItems.map((it) => (
                <div key={it.id} className="grid grid-cols-12 gap-2 items-center border rounded-md p-2 text-sm">
                  <div className="col-span-3 font-medium">{it.name}</div>
                  <div className="col-span-2">{it.type}</div>
                  <div className="col-span-2">From: {it.deductFrom}</div>
                  <div className="col-span-3">
                    <span className="text-red-600 font-semibold">- {it.amount.toFixed(2)} DZD</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <Button size="sm" variant="destructive" onClick={() => removeExpense(it.id)}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cashier Change */}
      <Card className="bg-card mt-4">
        <CardHeader>
          <CardTitle>#Cashier Change</CardTitle>
          <CardDescription>Amount of change left with the cashier today. Added to Net Profit.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-3 space-y-1">
            <Label className="text-xs">Change (DZD)</Label>
            <Input inputMode="decimal" value={String(cashierChange)} onChange={(e) => setCashierChange(parseFloat(e.target.value) || 0)} placeholder="0" />
          </div>
        </CardContent>
      </Card>

      {/* OVERALL */}
      <Card className="bg-card mt-4">
        <CardHeader>
          <CardTitle>Overall Totals</CardTitle>
          <CardDescription>Pumps + Oils + GazB + Other Expenses</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {/* Pre Totals */}
          <div className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-6 space-y-1">
              <div className="flex items-center gap-2"><span className="text-muted-foreground">Total Profite (TP):</span><span className="font-semibold">{overall.tProf.toFixed(2)} DZD</span></div>
              <div className="flex items-center gap-2"><span className="text-muted-foreground">Net Profite (NP):</span><span className="font-semibold">{overall.nProf.toFixed(2)} DZD</span></div>
            </div>
            <div className="col-span-6 text-right">
              <Button onClick={saveDay}>Save Day</Button>
            </div>
          </div>

          <Separator />

          {/* Sections Summary */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-3 space-y-1">
              <div className="font-medium">Pumps</div>
              <div>TP: {totals.tProf.toFixed(2)} DZD</div>
              <div>NP: {totals.nProf.toFixed(2)} DZD</div>
            </div>
            <div className="col-span-3 space-y-1">
              <div className="font-medium">Oils (liters)</div>
              <div>TP: {oilTProf.toFixed(2)} DZD</div>
              <div>NP: {oilNProf.toFixed(2)} DZD</div>
            </div>
            <div className="col-span-3 space-y-1">
              <div className="font-medium">Oil Bottles</div>
              <div>TP: {oilBottlesTProf.toFixed(2)} DZD</div>
              <div>NP: {oilBottlesNProf.toFixed(2)} DZD</div>
            </div>
            <div className="col-span-3 space-y-1">
              <div className="font-medium">GazB Bottles</div>
              <div>TP: {gazbTProf.toFixed(2)} DZD</div>
              <div>NP: {gazbNProf.toFixed(2)} DZD</div>
            </div>
            <div className="col-span-3 space-y-1">
              <div className="font-medium">Products</div>
              <div>TP: {storeTotals.tProf.toFixed(2)} DZD</div>
              <div>NP: {storeTotals.nProf.toFixed(2)} DZD</div>
            </div>
          </div>

          {/* Summary of adds/minus */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-6">
              <div className="font-medium">Summary (TP)</div>
              {(tpAdj === 0 && creditsSumToday === 0 && paidCreditsToday === 0) ? (
                <div className="text-muted-foreground">No adjustments.</div>
              ) : (
                <ul className="list-disc pl-5 space-y-1">
                  {creditsSumToday > 0 && (
                    <li className="text-green-600">+ Credit sales today: {creditsSumToday.toFixed(2)} DZD</li>
                  )}
                  {paidCreditsToday > 0 && (
                    <li className="text-red-600">- Paid credits today: {paidCreditsToday.toFixed(2)} DZD</li>
                  )}
                  {otherItems.filter(i => i.deductFrom === 'TP').map(i => (
                    <li key={i.id} className="text-red-600">- {i.name} ({i.type}): {i.amount.toFixed(2)} DZD</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="col-span-6">
              <div className="font-medium">Summary (NP)</div>
              {(npAdj === 0 && (cashierChange || 0) === 0) ? (
                <div className="text-muted-foreground">No adjustments.</div>
              ) : (
                <ul className="list-disc pl-5 space-y-1">
                  {cashierChange > 0 && (
                    <li key="cashier-change" className="text-green-600">+ Cashier change: {cashierChange.toFixed(2)} DZD</li>
                  )}
                  {otherItems.filter(i => i.deductFrom === 'NP').map(i => (
                    <li key={i.id} className="text-red-600">- {i.name} ({i.type}): {i.amount.toFixed(2)} DZD</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <Separator />

          {/* Final totals row */}
          <div className="grid grid-cols-12 gap-2 items-center text-sm">
            <div className="col-span-4">
              <div className="text-muted-foreground">Total Profite</div>
              <div className="font-semibold">{finalTotals.tProf.toFixed(2)} DZD</div>
            </div>
            <div className="col-span-4">
              <div className="text-muted-foreground">Net Profite</div>
              <div className="font-semibold">{finalTotals.nProf.toFixed(2)} DZD</div>
            </div>
            <div className="col-span-4">
              <div className="text-muted-foreground">Credite sales today</div>
              <div className="font-semibold text-green-600">+ {Number(creditsToday || 0).toFixed(2)} DZD</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}