import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

type Check = {
  id: string;
  date: string; // yyyy-mm-dd
  number: string;
  issuer: string;
  amount: number;
  status: "pending" | "cleared" | "bounced";
  note?: string;
};

type DailyHistoryItem = { date: string; totals: { liters: number; tProf: number; nProf: number } };

function todayKey(): string {
  const d = new Date();
  const year = Math.max(d.getFullYear(), 2025);
  const d2025 = new Date(year, d.getMonth(), d.getDate());
  return d2025.toISOString().slice(0, 10);
}

const emptyNew = (): Check => ({
  id: crypto.randomUUID(),
  date: todayKey(),
  number: "",
  issuer: "",
  amount: 0,
  status: "pending",
  note: "",
});

export default function ChecksPage() {
  const [checks, setChecks] = useState<Check[]>(() => store.get<Check[]>("gs.checks.list", []));
  const [draft, setDraft] = useState<Check>(emptyNew());

  useEffect(() => store.set("gs.checks.list", checks), [checks]);

  // Accumulated Total Profit (TP) from saved history
  const daily = store.get<DailyHistoryItem[]>("gs.history.daily", []);
  const storeHist = store.get<{ date: string; totals: { tProf: number; nProf: number } }[]>("gs.history.store", []);
  const totalSalesTP = useMemo(() => {
    const sumDaily = daily.reduce((s, d) => s + (d.totals?.tProf || 0), 0);
    const sumStore = storeHist.reduce((s, d) => s + (d.totals?.tProf || 0), 0);
    return sumDaily + sumStore;
  }, [daily, storeHist]);
  const totalSalesNP = useMemo(() => {
    const sumDaily = daily.reduce((s, d) => s + (d.totals?.nProf || 0), 0);
    const sumStore = storeHist.reduce((s, d) => s + (d.totals?.nProf || 0), 0);
    return sumDaily + sumStore;
  }, [daily, storeHist]);
  const payableBase = Math.max(0, totalSalesTP - totalSalesNP);
  const paidViaChecks = useMemo(() => checks.filter(c => c.status === "cleared").reduce((s, c) => s + (c.amount || 0), 0), [checks]);
  const remainingToPay = Math.max(0, payableBase - paidViaChecks);

  const totals = useMemo(() =>
    checks.reduce(
      (acc, c) => {
        if (c.status === "pending") acc.pending += c.amount || 0;
        if (c.status === "cleared") acc.cleared += c.amount || 0;
        return acc;
      },
      { pending: 0, cleared: 0 }
    ),
  [checks]);

  const addCheck = () => {
    if (!draft.number && !draft.issuer && !draft.amount) return;
    setChecks((s) => [...s, { ...draft, id: crypto.randomUUID(), amount: Number(draft.amount) || 0 }]);
    setDraft(emptyNew());
  };

  const removeCheck = (id: string) => setChecks((s) => s.filter((c) => c.id !== id));

  return (
    <div className="bg-background space-y-4">
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>#Cheques</CardTitle>
          <CardDescription>Track incoming cheques: add, edit, and update their status. Totals show pending vs cleared.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* New cheque */}
          <div className="grid grid-cols-12 gap-2 items-end border rounded-md p-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Date</Label>
              <Input type="date" value={draft.date} onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Number</Label>
              <Input value={draft.number} onChange={(e) => setDraft((d) => ({ ...d, number: e.target.value }))} placeholder="CHK-0001" />
            </div>
            <div className="col-span-3 space-y-1">
              <Label className="text-xs">Issuer</Label>
              <Input value={draft.issuer} onChange={(e) => setDraft((d) => ({ ...d, issuer: e.target.value }))} placeholder="Client / Company" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Amount</Label>
              <Input inputMode="decimal" value={draft.amount} onChange={(e) => setDraft((d) => ({ ...d, amount: parseFloat(e.target.value) || 0 }))} placeholder="0" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={draft.status} onValueChange={(v) => setDraft((d) => ({ ...d, status: v as Check["status"] }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cleared">Cleared</SelectItem>
                  <SelectItem value="bounced">Bounced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1">
              <Button className="w-full" onClick={addCheck}>Add</Button>
            </div>
            <div className="col-span-12 space-y-1">
              <Label className="text-xs">Note</Label>
              <Input value={draft.note} onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))} placeholder="Optional note" />
            </div>
          </div>

          {/* Existing cheques */}
          {checks.length === 0 ? (
            <div className="text-sm text-muted-foreground">No cheques yet.</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-auto">
              {checks.map((c) => (
                <div key={c.id} className="grid grid-cols-12 gap-2 items-end border rounded-md p-3">
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Date</Label>
                    <Input type="date" value={c.date} onChange={(e) => setChecks((s) => s.map(x => x.id === c.id ? { ...x, date: e.target.value } : x))} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Number</Label>
                    <Input value={c.number} onChange={(e) => setChecks((s) => s.map(x => x.id === c.id ? { ...x, number: e.target.value } : x))} />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <Label className="text-xs">Issuer</Label>
                    <Input value={c.issuer} onChange={(e) => setChecks((s) => s.map(x => x.id === c.id ? { ...x, issuer: e.target.value } : x))} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Amount</Label>
                    <Input inputMode="decimal" value={c.amount} onChange={(e) => setChecks((s) => s.map(x => x.id === c.id ? { ...x, amount: parseFloat(e.target.value) || 0 } : x))} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Status</Label>
                    <Select value={c.status} onValueChange={(v) => setChecks((s) => s.map(x => x.id === c.id ? { ...x, status: v as Check["status"] } : x))}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="cleared">Cleared</SelectItem>
                        <SelectItem value="bounced">Bounced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1">
                    <Button variant="destructive" className="w-full" onClick={() => removeCheck(c.id)}>Delete</Button>
                  </div>
                  <div className="col-span-12 space-y-1">
                    <Label className="text-xs">Note</Label>
                    <Input value={c.note || ""} onChange={(e) => setChecks((s) => s.map(x => x.id === c.id ? { ...x, note: e.target.value } : x))} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Totals */}
          <div className="grid grid-cols-12 gap-2 text-sm">
            <div className="col-span-6 flex items-center gap-2">
              <span className="text-muted-foreground">Pending Total:</span>
              <span className="font-semibold">{totals.pending.toFixed(2)} DZD</span>
            </div>
            <div className="col-span-6 flex items-center gap-2">
              <span className="text-muted-foreground">Cleared Total:</span>
              <span className="font-semibold">{totals.cleared.toFixed(2)} DZD</span>
            </div>
          </div>

          {/* Sales payable summary */}
          <div className="grid grid-cols-12 gap-2 text-sm mt-2 border-t pt-2">
            <div className="col-span-4 flex items-center gap-2">
              <span className="text-muted-foreground">Payable base (TP - NP):</span>
              <span className="font-semibold">{payableBase.toFixed(2)} DZD</span>
            </div>
            <div className="col-span-4 flex items-center gap-2">
              <span className="text-muted-foreground">Paid via cleared cheques:</span>
              <span className="font-semibold text-red-600">- {paidViaChecks.toFixed(2)} DZD</span>
            </div>
            <div className="col-span-4 flex items-center gap-2">
              <span className="text-muted-foreground">Remaining to pay:</span>
              <span className="font-semibold text-green-600">{remainingToPay.toFixed(2)} DZD</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}