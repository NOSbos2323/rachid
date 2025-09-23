import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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
  lastPayment?: { date: string; amount: number };
  payments?: { date: string; amount: number; note?: string }[];
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
  const [workers, setWorkers] = useState<Worker[]>(() =>
    store.get<Worker[]>("gs.workers.list", [
      { id: "w1", name: "Worker A", salary: 0 },
      { id: "w2", name: "Worker B", salary: 0 },
    ])
  );
  useEffect(() => store.set("gs.workers.list", workers), [workers]);

  // local draft for pay amounts per worker
  const [payDraft, setPayDraft] = useState<Record<string, string>>({});

  const addWorker = () => {
    const name = prompt("Worker name", "New Worker");
    if (!name) return;
    setWorkers((s) => [...s, { id: crypto.randomUUID(), name, salary: 0 }]);
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

    // 2) Update worker ledger
    setWorkers((prev) => prev.map(x => {
      if (x.id !== w.id) return x;
      const payments = [...(x.payments || []), { date: newExp.date, amount: -newExp.amount, note: newExp.name }];
      return { ...x, payments, lastPayment: { date: newExp.date, amount: -newExp.amount } };
    }));

    // reset draft
    setPayDraft((s) => ({ ...s, [w.id]: "" }));
    alert("Worker payment recorded for today. Check Other Expenses in Main page.");
  };

  const totals = useMemo(() => {
    const monthly = (workers.reduce((s, w) => s + (w.salary || 0), 0));
    return { monthly };
  }, [workers]);

  return (
    <div className="bg-background space-y-4">
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>#Workers</CardTitle>
          <CardDescription>Manage workers, set salaries, and record payments. Payments are added to Other Expenses (NP) for today.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {workers.length === 0 ? (
            <div className="text-sm text-muted-foreground">No workers yet.</div>
          ) : (
            workers.map((w) => (
              <div key={w.id} className="grid grid-cols-12 gap-2 items-end border rounded-md p-3">
                <div className="col-span-3 space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input value={w.name} onChange={(e) => setWorkers((s) => s.map(x => x.id === w.id ? { ...x, name: e.target.value } : x))} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Salary</Label>
                  <Input inputMode="decimal" value={w.salary || 0} onChange={(e) => setWorkers((s) => s.map(x => x.id === w.id ? { ...x, salary: parseFloat(e.target.value) || 0 } : x))} />
                </div>
                <div className="col-span-3 space-y-1">
                  <Label className="text-xs">Pay Amount</Label>
                  <Input inputMode="decimal" placeholder="0" value={payDraft[w.id] ?? ""} onChange={(e) => setPayDraft((s) => ({ ...s, [w.id]: e.target.value }))} />
                </div>
                <div className="col-span-2 space-y-1 text-xs text-muted-foreground">
                  <div>Last payment:</div>
                  <div>{w.lastPayment ? `${w.lastPayment.date} · ${Math.abs(w.lastPayment.amount).toFixed(2)} DZD` : "—"}</div>
                </div>
                <div className="col-span-1">
                  <Button className="w-full" onClick={() => recordPayment(w)}>Pay</Button>
                </div>
                <div className="col-span-1">
                  <Button variant="destructive" className="w-full" onClick={() => removeWorker(w.id)}>Delete</Button>
                </div>
              </div>
            ))
          )}

          <div className="flex items-center gap-2">
            <Button onClick={addWorker}>Add Worker</Button>
            <div className="text-sm text-muted-foreground">Total monthly salaries: <span className="font-semibold text-foreground">{totals.monthly.toFixed(2)} DZD</span></div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Payments History</CardTitle>
          <CardDescription>Recent worker payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm max-h-72 overflow-auto space-y-2">
            {workers.flatMap(w => (w.payments || []).map(p => ({...p, worker: w.name}))).length === 0 ? (
              <div className="text-muted-foreground">No payments yet.</div>
            ) : (
              workers
                .flatMap(w => (w.payments || []).map(p => ({...p, worker: w.name})))
                .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
                .slice(0, 100)
                .map((r, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center border rounded-md p-2">
                    <div className="col-span-3 font-medium">{r.worker}</div>
                    <div className="col-span-3">{r.date}</div>
                    <div className="col-span-6 text-right font-semibold text-red-600">- {Math.abs(r.amount).toFixed(2)} DZD</div>
                  </div>
                ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
