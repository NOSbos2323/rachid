import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { Sheet, SheetContent } from "@/components/ui/sheet";

// Local storage helpers (match existing pattern)
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

function todayKey(): string {
  const d = new Date();
  const year = Math.max(d.getFullYear(), 2025);
  const d2025 = new Date(year, d.getMonth(), d.getDate());
  return d2025.toISOString().slice(0, 10);
}

type Worker = {
  id: string;
  name: string;
  salary?: number; // monthly or agreed amount
  balance?: number; // positive: owed to worker; negative: worker owes
  lastPayment?: { date: string; amount: number };
  payments?: { date: string; amount: number; note?: string }[];
  // added hired date for due tracking
  hiredDate?: string;
};

type OtherExpense = {
  id: string;
  date: string;
  name: string;
  type: 'Electricity' | 'Fine' | 'Maintenance' | 'Worker payment' | 'Other';
  amount: number;
  deductFrom: 'TP' | 'NP';
  note?: string;
  workerId?: string;
};

export default function WorkersPage() {
  const { t } = useI18n();
  const [workers, setWorkers] = useState<Worker[]>(() =>
    store.get<Worker[]>("gs.workers.list", [
      { id: "w1", name: "Worker A", salary: 0, balance: 0 },
      { id: "w2", name: "Worker B", salary: 0, balance: 0 },
    ])
  );
  useEffect(() => store.set("gs.workers.list", workers), [workers]);

  // local draft for pay amounts per worker
  const [payDraft, setPayDraft] = useState<Record<string, string>>({});
  // local draft for manual balance adjust per worker
  const [adjDraft, setAdjDraft] = useState<Record<string, string>>({});
  // history dialog state
  const [openWorkerId, setOpenWorkerId] = useState<string | null>(null);

  const addWorker = () => {
    const name = prompt("Worker name", "New Worker");
    if (!name) return;
    setWorkers((s) => [...s, { id: crypto.randomUUID(), name, salary: 0, balance: 0 }]);
  };

  const removeWorker = (id: string) => setWorkers((s) => s.filter((w) => w.id !== id));

  const recordPayment = (w: Worker) => {
    const v = payDraft[w.id] ?? String(w.salary || 0);
    const amount = Math.max(0, parseFloat((v || "0").replace(",", ".")) || 0);
    if (amount <= 0) return;

    // 1) Append to today's Other Expenses so it deducts from NP on Main Page
    const newExp: OtherExpense = {
      id: crypto.randomUUID(),
      date: todayKey(),
      name: `Worker payment: ${w.name}`,
      type: 'Worker payment',
      amount: Number(amount.toFixed(2)),
      deductFrom: 'NP',
      workerId: w.id,
    };
    const list = store.get<OtherExpense[]>("gs.other.itemsToday", []);
    store.set("gs.other.itemsToday", [newExp, ...list]);

    // 2) Update worker ledger and balance (payment reduces balance owed)
    setWorkers((prev) => prev.map(x => {
      if (x.id !== w.id) return x;
      const payments = [...(x.payments || []), { date: newExp.date, amount: -newExp.amount, note: newExp.name }];
      const nextBal = Number(((x.balance || 0) - newExp.amount).toFixed(2));
      return { ...x, balance: nextBal, payments, lastPayment: { date: newExp.date, amount: -newExp.amount } };
    }));

    // reset draft
    setPayDraft((s) => ({ ...s, [w.id]: "" }));
    alert("Worker payment recorded for today. Check Other Expenses in Main page.");
  };

  const adjustBalance = (w: Worker, sign: 1 | -1) => {
    const raw = adjDraft[w.id] ?? "";
    const amount = Math.max(0, parseFloat(raw.replace(",", ".")) || 0);
    if (amount <= 0) return;
    const date = todayKey();
    setWorkers(prev => prev.map(x => {
      if (x.id !== w.id) return x;
      const adjAmount = sign * amount; // + extra money (worker owes more), - less (we owe worker less)
      const payments = [
        ...(x.payments || []),
        { date, amount: adjAmount, note: adjAmount >= 0 ? `Manual adjust (+${amount.toFixed(2)})` : `Manual adjust (-${amount.toFixed(2)})` }
      ];
      const nextBal = Number(((x.balance || 0) + adjAmount).toFixed(2));
      return { ...x, balance: nextBal, payments };
    }));
    setAdjDraft(s => ({ ...s, [w.id]: "" }));
  };

  const totals = useMemo(() => {
    const monthly = (workers.reduce((s, w) => s + (w.salary || 0), 0));
    return { monthly };
  }, [workers]);

  return (
    <div className="bg-background space-y-4">
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>#{t('workers')}</CardTitle>
          <CardDescription>{t('workers_desc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {workers.length === 0 ? (
            <div className="text-sm text-muted-foreground">{t('no_workers')}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {workers.map((w) => (
                <Card key={w.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="p-4 cursor-pointer" onClick={() => setOpenWorkerId(w.id)}>
                    <CardTitle className="text-base">
                      <Input onClick={(e) => e.stopPropagation()} className="w-full" value={w.name} onChange={(e) => setWorkers((s) => s.map(x => x.id === w.id ? { ...x, name: e.target.value } : x))} />
                    </CardTitle>
                    <CardDescription className="text-xs">Balance</CardDescription>
                    <div className={`font-semibold ${((w.balance || 0) >= 0) ? 'text-orange-600' : 'text-green-600'}`}>{Number(w.balance || 0).toFixed(2)} DZD</div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-2 text-sm">
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-6 space-y-1">
                        <Label className="text-xs">{t('date_hired')}</Label>
                        <Input className="w-full" type="date" value={w.hiredDate || ''} onChange={(e) => setWorkers((s) => s.map(x => x.id === w.id ? { ...x, hiredDate: e.target.value } : x))} />
                      </div>
                      <div className="col-span-6 flex items-end justify-end">
                        <Button variant="secondary" size="sm" onClick={() => setOpenWorkerId(w.id)}>
                          {t('payments_history')}
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-6 space-y-1">
                        <Label className="text-xs">{t('salary')}</Label>
                        <Input className="w-full" inputMode="decimal" value={w.salary || 0} onChange={(e) => setWorkers((s) => s.map(x => x.id === w.id ? { ...x, salary: parseFloat(e.target.value) || 0 } : x))} />
                      </div>
                      <div className="col-span-6 space-y-1">
                        <Label className="text-xs">{t('pay_amount')}</Label>
                        <div className="flex gap-2 flex-col sm:flex-row">
                          <Input className="flex-1 min-w-0 w-full" inputMode="decimal" placeholder="0" value={payDraft[w.id] ?? ""} onChange={(e) => setPayDraft((s) => ({ ...s, [w.id]: e.target.value }))} />
                          <Button className="w-full sm:w-auto" onClick={() => recordPayment(w)}>Pay</Button>
                        </div>
                      </div>
                      <div className="col-span-12 text-xs text-muted-foreground">
                        {t('last_payment')}: {w.lastPayment ? `${w.lastPayment.date} · ${Math.abs(w.lastPayment.amount).toFixed(2)} DZD` : "—"}
                      </div>
                    </div>
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-8 space-y-1">
                        <Label className="text-xs">{t('adjust_balance')}</Label>
                        <Input className="w-full" inputMode="decimal" placeholder="0" value={adjDraft[w.id] ?? ''} onChange={(e) => setAdjDraft(s => ({ ...s, [w.id]: e.target.value }))} />
                      </div>
                      <div className="col-span-4 flex gap-2 flex-col sm:flex-row">
                        <Button variant="secondary" className="w-full" onClick={() => adjustBalance(w, 1)}>{t('add')}</Button>
                        <Button variant="destructive" className="w-full" onClick={() => adjustBalance(w, -1)}>{t('deduct')}</Button>
                      </div>
                    </div>
                    <div className="pt-1">
                      <Button variant="destructive" className="w-full" onClick={() => removeWorker(w.id)}>{t('delete_worker')}</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 flex-col sm:flex-row">
            <Button onClick={addWorker}>{t('add_worker')}</Button>
            <div className="text-sm text-muted-foreground">{t('total_monthly_salaries')}: <span className="font-semibold text-foreground">{totals.monthly.toFixed(2)} DZD</span></div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle>{t('payments_history')}</CardTitle>
          <CardDescription>{t('recent_worker_payments')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm max-h-72 overflow-auto space-y-2">
            {workers.flatMap(w => (w.payments || []).map(p => ({...p, worker: w.name}))).length === 0 ? (
              <div className="text-muted-foreground">{t('no_payments')}</div>
            ) : (
              workers
                .flatMap(w => (w.payments || []).map(p => ({...p, worker: w.name})))
                .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
                .slice(0, 100)
                .map((r, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center border rounded-md p-2">
                    <div className="col-span-12 sm:col-span-4 md:col-span-3 font-medium">{r.worker}</div>
                    <div className="col-span-6 sm:col-span-4 md:col-span-3">{r.date}</div>
                    <div className="col-span-6 sm:col-span-4 md:col-span-6 text-right font-semibold text-red-600">- {Math.abs(r.amount).toFixed(2)} DZD</div>
                  </div>
                ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Worker History Sheet (replaces Dialog) */}
      <Sheet open={!!openWorkerId} onOpenChange={(o) => { if (!o) setOpenWorkerId(null); }}>
        <SheetContent side="right" className="w-[420px] sm:w-[520px]">
          {openWorkerId && (
            (() => {
              const w = workers.find(x => x.id === openWorkerId)!;
              const list = (w.payments || []).slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
              return (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Worker</div>
                    <div className="text-lg font-semibold">{w.name}</div>
                    <div className="text-sm">Balance: <span className={`font-semibold ${((w.balance || 0) >= 0) ? 'text-orange-600' : 'text-green-600'}`}>{Number(w.balance || 0).toFixed(2)} DZD</span></div>
                  </div>
                  <div className="space-y-1 text-sm max-h-[70vh] overflow-auto">
                    {list.length === 0 ? (
                      <div className="text-muted-foreground">{t('no_payments')}</div>
                    ) : (
                      list.map((r, i) => (
                        <div key={i} className="grid grid-cols-12 gap-2 items-center border rounded-md p-2">
                          <div className="col-span-4 text-xs text-muted-foreground">{r.date}</div>
                          <div className="col-span-4">{r.note || (r.amount < 0 ? 'Payment' : 'Adjustment')}</div>
                          <div className={`col-span-4 text-right font-semibold ${r.amount < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                            {r.amount < 0 ? '- ' : '+ '} {Math.abs(r.amount).toFixed(2)} DZD
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })()
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}