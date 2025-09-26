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
  balance?: number;
  lastPayment?: { date: string; amount: number };
  payments?: { date: string; amount: number; note?: string }[];
};

// Credit ledger types
type CreditTx = {
  id: string;
  date: string; // yyyy-mm-dd
  customer: string;
  amount: number;
  kind: 'payment' | 'sale';
  category?: 'Fuel' | 'Store' | 'Other';
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
  // Move cashierChange to the very top of state declarations to avoid any TDZ issues
  const [cashierChange, setCashierChange] = useState<number>(() => store.get<number>("gs.cashier.change.today", 0));

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
    const raw = (storeLeft[it.id] ?? "").replace(/[^0-9]/g, '');
    const hasInput = raw.trim() !== "";
    const todayLeft = hasInput ? Math.max(0, parseInt(raw) || 0) : prev;
    const sold = hasInput ? Math.max(0, prev - todayLeft) : 0;
    const tProf = sold * (it.price || 0);
    const nProf = sold * (it.profit || 0);
    return { it, prev, todayLeft, sold, tProf, nProf };
  });

  const storeTotals = storeRows.reduce((acc, r) => ({ tProf: acc.tProf + r.tProf, nProf: acc.nProf + r.nProf }), { tProf: 0, nProf: 0 });

  const applyStoreSales = () => {
    if (!confirm("Are you sure you want to update stock from Today Left?")) return;
    const all = store.get<StoreItem[]>("gs.store.items", []);
    const updated = all.map((it) => {
      const leftText = (storeLeft[it.id] || "").replace(/[^0-9]/g, '');
      const hasInput = leftText.trim() !== "";
      const left = hasInput ? Math.max(0, parseInt(leftText) || 0) : (it.stock || 0);
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
      { id: "w1", name: "Worker A", balance: 0 },
      { id: "w2", name: "Worker B", balance: 0 },
    ])
  );

  // Selected cashier worker for closing adjustments
  const [closingCashierId, setClosingCashierId] = useState<string>(() => store.get<string>("gs.cashier.workerId", ""));
  useEffect(() => { store.set("gs.cashier.workerId", closingCashierId); }, [closingCashierId]);

  // Credit sales/payments (today)
  const [creditsSumToday, setCreditsSumToday] = useState<number>(() => store.get<number>("gs.credits.today", 0));
  const [paidCreditsToday, setPaidCreditsToday] = useState<number>(() => store.get<number>("gs.credits.paid.today", 0));
  // cashierChange defined above
  // Load clients created in Credits page
  const [creditClients, setCreditClients] = useState<CreditClient[]>(() => store.get<CreditClient[]>("gs.credits.clients", []));
  // Credit ledger (persisted)
  const [creditLedger, setCreditLedger] = useState<CreditTx[]>(() => store.get<CreditTx[]>("gs.credits.ledger", []));
  useEffect(() => { store.set("gs.credits.ledger", creditLedger); }, [creditLedger]);
  // Fixed Overall Totals snapshot (freeze when first credit sale is added)
  const [overallFixedTP, setOverallFixedTP] = useState<number | null>(() => store.get<number | null>("gs.overall.fixed.tp", null));
  const [overallFixedNP, setOverallFixedNP] = useState<number | null>(() => store.get<number | null>("gs.overall.fixed.np", null));
  useEffect(() => { store.set("gs.overall.fixed.tp", overallFixedTP as any); }, [overallFixedTP]);
  useEffect(() => { store.set("gs.overall.fixed.np", overallFixedNP as any); }, [overallFixedNP]);
  
  // After a saved day, clear credit aggregates automatically on the next day (not immediately on save)
  useEffect(() => {
    const closed = store.get<string>("gs.day.closed", "");
    if (closed && closed !== todayKey()) {
      store.set("gs.credits.today", 0);
      store.set("gs.credits.paid.today", 0);
      setCreditsSumToday(0);
      setPaidCreditsToday(0);
      // reset fixed overall snapshot for new day
      store.set("gs.overall.fixed.tp", null as any);
      store.set("gs.overall.fixed.np", null as any);
      setOverallFixedTP(null);
      setOverallFixedNP(null);
    }
  }, []);

  // Track if the day has been saved to hide today's credit lists from summaries
  const [dayClosedOn, setDayClosedOn] = useState<string>(() => store.get<string>("gs.day.closed", ""));
  useEffect(() => { store.set("gs.day.closed", dayClosedOn); }, [dayClosedOn]);
  // Cashier Closing Summary state
  const [closingActualCash, setClosingActualCash] = useState<string>(() => store.get<string>("gs.cashier.close.actual", ""));
  useEffect(() => { store.set("gs.cashier.close.actual", closingActualCash); }, [closingActualCash]);
  const [closingPaidOverride, setClosingPaidOverride] = useState<string>("");
  const [closingNewCreditsOverride, setClosingNewCreditsOverride] = useState<string>("");
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
  // Combined totals after Paid Credits + Starting Money (before credit sales deduction)
  const combined = {
    tProf: overall.tProf + paidCreditsToday + (cashierChange || 0),
    // Starting money should NOT affect Net Profit
    nProf: overall.nProf,
  };
  // Final totals after adjustments and deducting credit sales
  const finalTotals = {
    tProf: Math.max(0, combined.tProf - tpAdj - creditsSumToday),
    nProf: Math.max(0, combined.nProf - npAdj),
  };

  // Display totals for Overall card (no credit sales deduction)
  const overallDisplayTotals = {
    tProf: Math.max(0, combined.tProf - tpAdj),
    nProf: Math.max(0, combined.nProf - npAdj),
  };

  // Reference totals to display (fixed after first credit sale)
  const displayTP = (overallFixedTP ?? overallDisplayTotals.tProf);
  const displayNP = (overallFixedNP ?? overallDisplayTotals.nProf);
  const adjustedTP = Math.max(0, displayTP - creditsSumToday);

  // Cashier Closing Summary calculations
  const closingCreditsPaid = (closingPaidOverride.trim() !== "") ? (parseFloat(closingPaidOverride.replace(',', '.')) || 0) : paidCreditsToday;
  const closingNewCredits = (closingNewCreditsOverride.trim() !== "") ? (parseFloat(closingNewCreditsOverride.replace(',', '.')) || 0) : creditsSumToday;
  const todaySales = overall.tProf;
  const expectedSalesCash = Math.max(0, todaySales - closingNewCredits);
  const expectedClosing = (cashierChange || 0) + expectedSalesCash + closingCreditsPaid;
  const actualCash = parseFloat((closingActualCash || "").replace(',', '.')) || 0;
  const closingDiff = Number((actualCash - expectedClosing).toFixed(2));
  const closingStatus = closingDiff === 0 ? 'ok' : (closingDiff < 0 ? 'short' : 'extra');

  // Allow editing Oil previous number (P.N)
  const resetOilPrev = () => {
    const v = prompt("Enter previous reading (P.N)", String(oil.prev ?? 0));
    if (v == null) return;
    const n = parseFloat(v) || 0;
    setOil((s: any) => ({ ...s, prev: n }));
  };

  // Edit pump previous reading (P.N)
  const resetPrev = (pumpId: string) => {
    const v = prompt("Enter previous reading (P.N)", String(readings[pumpId]?.prev ?? 0));
    if (v == null) return;
    const n = parseFloat(v) || 0;
    setReadings((s) => ({ ...s, [pumpId]: { prev: n } }));
  };

  // Add Other Expense
  const addExpense = () => {
    const amt = parseFloat((expDraft.amount || '').replace(',', '.')) || 0;
    if (!expDraft.name.trim() || amt <= 0) return;
    const item: OtherExpense = {
      id: crypto.randomUUID(),
      date: todayKey(),
      name: expDraft.name.trim(),
      type: expDraft.type,
      amount: Number(amt.toFixed(2)),
      deductFrom: expDraft.type === 'Worker payment' ? 'NP' : expDraft.deductFrom,
      note: expDraft.note || '',
      workerId: expDraft.type === 'Worker payment' ? expDraft.workerId : undefined,
    };
    setOtherItems((s) => [...s, item]);
    setExpDraft({ name: "", type: "Other", amount: "", deductFrom: "NP", note: "", workerId: undefined });
  };

  // Remove Other Expense
  const removeExpense = (id: string) => {
    setOtherItems((s) => s.filter((i) => i.id !== id));
  };

  // Add missing saveDay implementation
  const saveDay = () => {
    if (!confirm("Are you sure you want to Save Day?")) return;
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
        const leftText = (storeLeft[it.id] || "").replace(/[^0-9]/g, '');
        const hasInput = leftText.trim() !== "";
        const left = hasInput ? Math.max(0, parseInt(leftText) || 0) : (it.stock || 0);
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

    // Mark day closed so UI hides today's credit/payment name lists
    setDayClosedOn(date);
    
    // Reset fixed overall snapshot for next day
    store.set("gs.overall.fixed.tp", null as any);
    store.set("gs.overall.fixed.np", null as any);
    setOverallFixedTP(null);
    setOverallFixedNP(null);
    // Keep cashier starting money for carry-over to next day (no reset)

    alert("Saved day");
  };

  // Drafts for Paid Credits and Sales with Credit
  const [payDraft, setPayDraft] = useState<{ clientId: string; amount: string }>({ clientId: "", amount: "" });
  const [creditSaleDraft, setCreditSaleDraft] = useState<{ clientId: string; amount: string; category: 'Fuel'|'Store'|'Other' }>({ clientId: "", amount: "", category: 'Fuel' });

  const clientById = useMemo(() => Object.fromEntries(creditClients.map(c => [c.id, c])), [creditClients]);

  const addPaidCredit = () => {
    const amount = parseFloat(payDraft.amount.replace(',', '.')) || 0;
    if (!payDraft.clientId || amount <= 0) return;
    const customer = clientById[payDraft.clientId]?.name || '';
    const tx: CreditTx = { id: crypto.randomUUID(), date: todayKey(), customer, amount: Number(amount.toFixed(2)), kind: 'payment' };
    setCreditLedger((s) => [...s, tx]);
    const curPaid = store.get<number>("gs.credits.paid.today", 0) + tx.amount;
    store.set("gs.credits.paid.today", curPaid);
    setPaidCreditsToday(curPaid);
    setPayDraft({ clientId: payDraft.clientId, amount: "" });
  };

  const addCreditSale = () => {
    const amount = parseFloat(creditSaleDraft.amount.replace(',', '.')) || 0;
    if (!creditSaleDraft.clientId || amount <= 0) return;
    // Freeze Overall Totals on first credit sale
    const prevCredits = store.get<number>("gs.credits.today", 0);
    if (prevCredits === 0 && overallFixedTP == null) {
      const snapTP = Number(overallDisplayTotals.tProf.toFixed(2));
      const snapNP = Number(overallDisplayTotals.nProf.toFixed(2));
      setOverallFixedTP(snapTP);
      setOverallFixedNP(snapNP);
      store.set("gs.overall.fixed.tp", snapTP);
      store.set("gs.overall.fixed.np", snapNP);
    }
    const customer = clientById[creditSaleDraft.clientId]?.name || '';
    const tx: CreditTx = { id: crypto.randomUUID(), date: todayKey(), customer, amount: Number(amount.toFixed(2)), kind: 'sale', category: creditSaleDraft.category };
    setCreditLedger((s) => [...s, tx]);
    const cur = store.get<number>("gs.credits.today", 0) + tx.amount;
    store.set("gs.credits.today", cur);
    setCreditsSumToday(cur);
    setCreditSaleDraft({ clientId: creditSaleDraft.clientId, amount: "", category: creditSaleDraft.category });
  };

  // Cashier's Starting Money state moved above

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
                <span className="text-muted-foreground">Liters:</span>
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
          <CardDescription>Store products only. Manage stock in Store page.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Products (only) */}
          <div className="space-y-2">
            {visibleStoreItems.length === 0 ? (
              <div className="text-sm text-muted-foreground">No products in stock.</div>
            ) : (
              <div className="space-y-2 text-sm">
                {storeRows.map(({ it, prev, todayLeft, sold, tProf, nProf }) => (
                  <div key={it.id} className="grid grid-cols-12 gap-2 items-end border rounded-md p-2">
                    <div className="col-span-3">
                      <div className="font-medium truncate" title={it.name}>{it.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        TP: <span className="font-semibold">{tProf.toFixed(2)} DZD</span> · NP: <span className="font-semibold">{nProf.toFixed(2)} DZD</span>
                      </div>
                    </div>
                    <div className="col-span-2">Prev: {prev}</div>
                    <div className="col-span-2">Price: {Number(it.price || 0).toFixed(2)}</div>
                    <div className="col-span-2">NP/U: {Number(it.profit || 0).toFixed(2)}</div>
                    <div className="col-span-3 space-y-1">
                      <Label className="text-xs">Today Left</Label>
                      <Input inputMode="numeric" value={storeLeft[it.id] || ""} onChange={(e) => setStoreLeft(s => ({ ...s, [it.id]: e.target.value }))} placeholder="" />
                      <div className="text-xs text-muted-foreground">Left now: <span className="font-semibold">{todayLeft}</span> · Sold: <span className="font-semibold">{sold}</span></div>
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
            <div className="col-span-12 text-xs text-muted-foreground">Stock: {gazb.stock || 0} bottles · Left now: <span className="font-semibold">{Math.max(0, (gazb.stock || 0) - (gazbSold || 0))}</span></div>
          </div>

          <div className="text-sm">
            <div>TProf: {gazbTProf.toFixed(2)} DZD</div>
            <div>NP: {gazbNProf.toFixed(2)} DZD</div>
          </div>
        </CardContent>
      </Card>

      {/* Paid Credits Today */}
      <Card className="bg-card mt-4">
        <CardHeader>
          <CardTitle>#Paid Credits Today</CardTitle>
          <CardDescription>Record payments received from clients. Updates client balance and adds to totals.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-5 space-y-1">
            <Label className="text-xs">Client</Label>
            <Select value={payDraft.clientId} onValueChange={(v) => setPayDraft(d => ({ ...d, clientId: v }))}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                {creditClients.length === 0 ? (
                  <SelectItem value="no_clients" disabled>No clients — add in Credits page</SelectItem>
                ) : (
                  creditClients.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-3 space-y-1">
            <Label className="text-xs">Amount (DZD)</Label>
            <Input inputMode="decimal" value={payDraft.amount} onChange={(e) => setPayDraft(d => ({ ...d, amount: e.target.value }))} placeholder="0" />
          </div>
          <div className="col-span-4">
            <Button className="w-full" onClick={addPaidCredit} disabled={!payDraft.clientId}>Record Payment</Button>
          </div>
        </CardContent>
      </Card>

      {/* Cashier's Starting Money */}
      <Card className="bg-card mt-4">
        <CardHeader>
          <CardTitle>#Cashier's Starting Money</CardTitle>
          <CardDescription>Money cashier had at the start of the day (for change).</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-4 space-y-1">
            <Label className="text-xs">Starting Money (DZD)</Label>
            <Input inputMode="decimal" value={String(cashierChange)} onChange={(e) => setCashierChange(parseFloat(e.target.value) || 0)} placeholder="0" />
          </div>
        </CardContent>
      </Card>

      {/* OVERALL */}
      <Card className="bg-card mt-4">
        <CardHeader>
          <CardTitle>Overall Totals</CardTitle>
          <CardDescription>Pumps + Oils + GazB + Paid Credits + Starting Money</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {/* Pre Totals */}
          <div className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-6 space-y-1">
              <div className="flex items-center gap-2"><span className="text-muted-foreground">Combined TP (incl. Paid + Start):</span><span className="font-semibold">{combined.tProf.toFixed(2)} DZD</span></div>
              <div className="flex items-center gap-2"><span className="text-muted-foreground">Combined NP (incl. Start):</span><span className="font-semibold">{combined.nProf.toFixed(2)} DZD</span></div>
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
            <div className="col-span-3 space-y-1">
              <div className="font-medium">Paid Credits</div>
              <div>TP: +{paidCreditsToday.toFixed(2)} DZD</div>
              <div className="text-muted-foreground">NP: —</div>
            </div>
            <div className="col-span-3 space-y-1">
              <div className="font-medium">Starting Money</div>
              <div>TP: +{(cashierChange || 0).toFixed(2)} DZD</div>
              <div className="text-muted-foreground">NP: —</div>
            </div>
          </div>

          {/* Summary of adds/minus */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-6">
              <div className="font-medium">Summary (TP)</div>
              {(tpAdj === 0 && creditsSumToday === 0 && paidCreditsToday === 0 && (cashierChange || 0) === 0) ? (
                <div className="text-muted-foreground">No adjustments.</div>
              ) : (
                <ul className="list-disc pl-5 space-y-1">
                  {/* List payments with client names; hidden after Save Day */}
                  {dayClosedOn === todayKey() ? null : creditLedger.filter(tx => tx.date === todayKey() && tx.kind === 'payment').map(tx => (
                    <li key={tx.id} className="text-green-600">+ Payment from {tx.customer || 'Unknown'}: {tx.amount.toFixed(2)} DZD</li>
                  ))}
                  {/* List credit sales with client names; hidden after Save Day (moved back as requested) */}
                  {dayClosedOn === todayKey() ? null : creditLedger.filter(tx => tx.date === todayKey() && tx.kind === 'sale').map(tx => (
                    <li key={tx.id} className="text-red-600">- Credit sale to {tx.customer || 'Unknown'}: {tx.amount.toFixed(2)} DZD</li>
                  ))}
                  {(cashierChange || 0) > 0 && (
                    <li className="text-green-600">+ Starting money: {(cashierChange || 0).toFixed(2)} DZD</li>
                  )}
                  {otherItems.filter(i => i.deductFrom === 'TP').map(i => (
                    <li key={i.id} className="text-red-600">- {i.name} ({i.type}): {i.amount.toFixed(2)} DZD</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="col-span-6">
              <div className="font-medium">Summary (NP)</div>
              {(npAdj === 0) ? (
                <div className="text-muted-foreground">No adjustments.</div>
              ) : (
                <ul className="list-disc pl-5 space-y-1">
                  {otherItems.filter(i => i.deductFrom === 'NP').map(i => (
                    <li key={i.id} className="text-red-600">- {i.name} ({i.type}): {i.amount.toFixed(2)} DZD</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <Separator />

          {/* Final totals row (Overall card stays fixed; no credit deduction here) */}
          <div className="grid grid-cols-12 gap-2 items-center text-sm">
            <div className="col-span-6">
              <div className="text-muted-foreground">Total Profite</div>
              <div className="font-semibold">{displayTP.toFixed(2)} DZD</div>
            </div>
            <div className="col-span-6">
              <div className="text-muted-foreground">Net Profite</div>
              <div className="font-semibold">{displayNP.toFixed(2)} DZD</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales with Credit (after totals) */}
      <Card className="bg-card mt-4">
        <CardHeader>
          <CardTitle>#Sales with Credit</CardTitle>
          <CardDescription>Record new credit taken by clients. Overall Totals remain unchanged; see Credits Impact below.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-4 space-y-1">
            <Label className="text-xs">Client</Label>
            <Select value={creditSaleDraft.clientId} onValueChange={(v) => setCreditSaleDraft(d => ({ ...d, clientId: v }))}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                {creditClients.length === 0 ? (
                  <SelectItem value="no_clients" disabled>No clients — add in Credits page</SelectItem>
                ) : (
                  creditClients.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-3 space-y-1">
            <Label className="text-xs">Type</Label>
            <Select value={creditSaleDraft.category} onValueChange={(v) => setCreditSaleDraft(d => ({ ...d, category: v as 'Fuel'|'Store'|'Other' }))}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Fuel">Fuel</SelectItem>
                <SelectItem value="Store">Store</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-3 space-y-1">
            <Label className="text-xs">Amount (DZD)</Label>
            <Input inputMode="decimal" value={creditSaleDraft.amount} onChange={(e) => setCreditSaleDraft(d => ({ ...d, amount: e.target.value }))} placeholder="0" />
          </div>
          <div className="col-span-2">
            <Button className="w-full" onClick={addCreditSale} disabled={!creditSaleDraft.clientId}>Add Credit</Button>
          </div>
        </CardContent>
      </Card>

      {/* Credits Impact (does not alter Overall Totals card) */}
      <Card className="bg-card mt-4">
        <CardHeader>
          <CardTitle>Adjusted Total after Credits</CardTitle>
          <CardDescription>Overall Total (fixed) minus Sales with Credits.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-4">
              <div className="text-muted-foreground">Overall Total (fixed)</div>
              <div className="font-semibold">{displayTP.toFixed(2)} DZD</div>
            </div>
            <div className="col-span-4">
              <div className="text-muted-foreground">Sales with Credits</div>
              <div className="font-semibold text-red-600">- {creditsSumToday.toFixed(2)} DZD</div>
            </div>
            <div className="col-span-4">
              <div className="text-muted-foreground">Adjusted Total</div>
              <div className="font-semibold">{adjustedTP.toFixed(2)} DZD</div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">Note: Adjusted Total = Overall Total − Sales with Credits. Overall Total remains unchanged as reference.</div>
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

      {/* Cashier Closing Summary */}
      <Card className="bg-card mt-4">
        <CardHeader>
          <CardTitle>Cashier Closing Summary</CardTitle>
          <CardDescription>Validate closing cash vs expected and carry over starting money.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {/* Inputs */}
          <div className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-3 space-y-1">
              <Label className="text-xs">Starting Money (DZD)</Label>
              <Input inputMode="decimal" value={String(cashierChange)} onChange={(e) => setCashierChange(parseFloat(e.target.value) || 0)} placeholder="0" />
            </div>
            <div className="col-span-3 space-y-1">
              <Label className="text-xs">Today's Sales (auto)</Label>
              <Input readOnly className="bg-muted/30" value={todaySales.toFixed(2)} />
            </div>
            <div className="col-span-3 space-y-1">
              <Label className="text-xs">New Credits Given Today</Label>
              <Input inputMode="decimal" value={closingNewCreditsOverride} onChange={(e) => setClosingNewCreditsOverride(e.target.value)} placeholder={creditsSumToday.toFixed(2)} />
            </div>
            <div className="col-span-3 space-y-1">
              <Label className="text-xs">Credits Paid Today</Label>
              <Input inputMode="decimal" value={closingPaidOverride} onChange={(e) => setClosingPaidOverride(e.target.value)} placeholder={paidCreditsToday.toFixed(2)} />
            </div>
            <div className="col-span-3 space-y-1">
              <Label className="text-xs">Actual Cash at Closing</Label>
              <Input inputMode="decimal" value={closingActualCash} onChange={(e) => setClosingActualCash(e.target.value)} placeholder="0" />
            </div>
            <div className="col-span-3 space-y-1">
              <Label className="text-xs">Cashier (worker)</Label>
              <Select value={closingCashierId} onValueChange={(v) => setClosingCashierId(v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select cashier" /></SelectTrigger>
                <SelectContent>
                  {workers.length === 0 ? (
                    <SelectItem value="no_workers" disabled>No workers</SelectItem>
                  ) : (
                    workers.map(w => (<SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Calculations */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-4">
              <div className="text-muted-foreground">Expected Sales Cash</div>
              <div className="font-semibold">{expectedSalesCash.toFixed(2)} DZD</div>
            </div>
            <div className="col-span-4">
              <div className="text-muted-foreground">Expected Closing</div>
              <div className="font-semibold">{expectedClosing.toFixed(2)} DZD</div>
            </div>
            <div className="col-span-4">
              <div className="text-muted-foreground">Difference</div>
              <div className={closingDiff === 0 ? "font-semibold" : (closingDiff < 0 ? "font-semibold text-red-600" : "font-semibold text-green-600")}>{closingDiff.toFixed(2)} DZD</div>
            </div>
          </div>

          {/* Status */}
          <div className="text-sm">
            {closingStatus === 'ok' && <div className="text-green-600">✅ Cashier balance correct.</div>}
            {closingStatus === 'short' && <div className="text-red-600">❌ Cashier is short by {Math.abs(closingDiff).toFixed(2)} DZD.</div>}
            {closingStatus === 'extra' && <div className="text-amber-600">⚡ Cashier has {Math.abs(closingDiff).toFixed(2)} DZD more than expected.</div>}
          </div>

          {/* Summary Card */}
          <div className="border rounded-md p-3 grid grid-cols-12 gap-2">
            <div className="col-span-3">Starting Money: <span className="font-semibold">{(cashierChange || 0).toFixed(2)} DZD</span></div>
            <div className="col-span-3">Expected Closing: <span className="font-semibold">{expectedClosing.toFixed(2)} DZD</span></div>
            <div className="col-span-3">Actual Closing: <span className="font-semibold">{actualCash.toFixed(2)} DZD</span></div>
            <div className="col-span-3">Difference: <span className="font-semibold">{closingDiff.toFixed(2)} DZD</span></div>
            <div className="col-span-12 text-right">
              <Button onClick={() => {
                // Apply difference to selected cashier worker (if any)
                if (closingCashierId && Math.abs(closingDiff) > 0.009) {
                  setWorkers(prev => prev.map(w => w.id === closingCashierId ? { ...w, balance: Number(((w.balance || 0) + closingDiff).toFixed(2)) } : w));
                }
                // Mark day closed in UI (hide credit name lists in summaries)
                setDayClosedOn(todayKey());
                if (Math.abs(closingDiff) < 0.01) {
                  // carry over same starting money to next day by keeping it persisted
                  store.set("gs.cashier.change.today", cashierChange || 0);
                  alert("Validated. Starting Money carried over for tomorrow.");
                } else {
                  alert(closingCashierId ? "Applied difference to cashier's balance." : "Difference exists. Select a cashier to apply difference, or resolve to 0 to carry over.");
                }
              }}>Validate & Carry Over</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}