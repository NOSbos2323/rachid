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

type DailyHistoryItem = { date: string; totals: { liters: number; tProf: number; nProf: number } };

type Config = { taxRate: number; zakatRate: number; base: 'TP' | 'NP' };

type OtherExpense = {
  id: string;
  date: string;
  name: string;
  type: 'Electricity' | 'Fine' | 'Maintenance' | 'Worker payment' | 'Other';
  amount: number;
  deductFrom: 'TP' | 'NP';
  note?: string;
};

function todayKey(): string {
  const d = new Date();
  const year = Math.max(d.getFullYear(), 2025);
  const d2025 = new Date(year, d.getMonth(), d.getDate());
  return d2025.toISOString().slice(0, 10);
}

export default function TaxesZakatPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [cfg, setCfg] = useState<Config>(() => store.get<Config>("gs.taxes.config", { taxRate: 0, zakatRate: 0, base: 'NP' }));
  useEffect(() => store.set("gs.taxes.config", cfg), [cfg]);

  const daily = store.get<DailyHistoryItem[]>("gs.history.daily", []);
  const storeHist = store.get<{ date: string; totals: { tProf: number; nProf: number } }[]>("gs.history.store", []);

  const { baseAmount } = useMemo(() => {
    const within = (d: string) => (!from || d >= from) && (!to || d <= to);
    const dRows = daily.filter((i) => within(i.date));
    const sRows = storeHist.filter((i) => within(i.date));
    const sums = [...dRows.map(d => d.totals), ...sRows.map(s => s.totals)].reduce((acc, t) => {
      acc.tProf += t.tProf; acc.nProf += t.nProf; return acc;
    }, { tProf: 0, nProf: 0 });
    return { baseAmount: cfg.base === 'TP' ? sums.tProf : sums.nProf };
  }, [daily, storeHist, from, to, cfg.base]);

  const taxDue = (baseAmount * (cfg.taxRate || 0)) / 100;
  const zakatDue = (baseAmount * (cfg.zakatRate || 0)) / 100;

  const addOtherExpense = (name: 'Taxes' | 'Zakat', amount: number, deductFrom: 'TP'|'NP') => {
    const entry: OtherExpense = {
      id: crypto.randomUUID(),
      date: todayKey(),
      name,
      type: 'Other',
      amount: Number((amount || 0).toFixed(2)),
      deductFrom,
    };
    const list = store.get<OtherExpense[]>("gs.other.itemsToday", []);
    store.set("gs.other.itemsToday", [entry, ...list]);
    alert(`${name} recorded for today. Check Other Expenses in Main page.`);
  };

  const [taxDeductFrom, setTaxDeductFrom] = useState<'TP'|'NP'>(() => store.get<'TP'|'NP'>("gs.taxes.taxFrom", 'NP'));
  const [zakatDeductFrom, setZakatDeductFrom] = useState<'TP'|'NP'>(() => store.get<'TP'|'NP'>("gs.taxes.zakatFrom", 'NP'));
  useEffect(() => store.set("gs.taxes.taxFrom", taxDeductFrom), [taxDeductFrom]);
  useEffect(() => store.set("gs.taxes.zakatFrom", zakatDeductFrom), [zakatDeductFrom]);

  return (
    <div className="bg-background space-y-4">
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>#Taxes & Zakat</CardTitle>
          <CardDescription>Configure rates and compute due amounts over a date range. Record payments to Other Expenses.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-12 gap-3 items-end">
          <div className="col-span-3 space-y-1">
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="col-span-3 space-y-1">
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">Base</Label>
            <select className="w-full h-9 rounded-md border bg-transparent px-2 text-sm" value={cfg.base} onChange={(e) => setCfg((c) => ({ ...c, base: e.target.value as 'TP'|'NP' }))}>
              <option value="TP">Total Profit (TP)</option>
              <option value="NP">Net Profit (NP)</option>
            </select>
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">Tax %</Label>
            <Input inputMode="decimal" value={cfg.taxRate} onChange={(e) => setCfg((c) => ({ ...c, taxRate: parseFloat(e.target.value) || 0 }))} />
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">Zakat %</Label>
            <Input inputMode="decimal" value={cfg.zakatRate} onChange={(e) => setCfg((c) => ({ ...c, zakatRate: parseFloat(e.target.value) || 0 }))} />
          </div>
          <div className="col-span-12 text-sm">
            <div className="flex items-center gap-2"><span className="text-muted-foreground">Base amount ({cfg.base}):</span><span className="font-semibold">{baseAmount.toFixed(2)} DZD</span></div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Taxes</CardTitle>
          <CardDescription>Due: {taxDue.toFixed(2)} DZD</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-12 gap-3 items-end">
          <div className="col-span-3 space-y-1">
            <Label className="text-xs">Deduct From</Label>
            <select className="w-full h-9 rounded-md border bg-transparent px-2 text-sm" value={taxDeductFrom} onChange={(e) => setTaxDeductFrom(e.target.value as 'TP'|'NP')}>
              <option value="TP">Total Profit</option>
              <option value="NP">Net Profit</option>
            </select>
          </div>
          <div className="col-span-3 space-y-1">
            <Label className="text-xs">Amount</Label>
            <Input inputMode="decimal" value={taxDue.toFixed(2)} readOnly className="bg-muted/30" />
          </div>
          <div className="col-span-3">
            <Button className="w-full" onClick={() => addOtherExpense('Taxes', taxDue, taxDeductFrom)}>Record Taxes</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Zakat</CardTitle>
          <CardDescription>Due: {zakatDue.toFixed(2)} DZD</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-12 gap-3 items-end">
          <div className="col-span-3 space-y-1">
            <Label className="text-xs">Deduct From</Label>
            <select className="w-full h-9 rounded-md border bg-transparent px-2 text-sm" value={zakatDeductFrom} onChange={(e) => setZakatDeductFrom(e.target.value as 'TP'|'NP')}>
              <option value="TP">Total Profit</option>
              <option value="NP">Net Profit</option>
            </select>
          </div>
          <div className="col-span-3 space-y-1">
            <Label className="text-xs">Amount</Label>
            <Input inputMode="decimal" value={zakatDue.toFixed(2)} readOnly className="bg-muted/30" />
          </div>
          <div className="col-span-3">
            <Button className="w-full" onClick={() => addOtherExpense('Zakat', zakatDue, zakatDeductFrom)}>Record Zakat</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
