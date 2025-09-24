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
  date: string; // Added Date (yyyy-mm-dd)
  depositedDate?: string; // Date deposited (yyyy-mm-dd)
  number: string;
  issuer: string; // Party/Person/Company name
  amount: number;
  transactionType: "Cash" | "Check";
  kind: "received" | "sent" | "naftal"; // section
  status: "pending" | "paid" | "pending_payment" | "money_received";
  updatedAt?: string; // last status edit date
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
  depositedDate: "",
  number: "",
  issuer: "",
  amount: 0,
  transactionType: "Check",
  kind: "received",
  status: "pending",
  note: "",
});

export default function ChecksPage() {
  const [checks, setChecks] = useState<Check[]>(() => store.get<Check[]>("gs.checks.list", []));
  const [draft, setDraft] = useState<Check>(emptyNew());
  const [q, setQ] = useState(""); // search query
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Check | null>(null);

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
        const st = c.status === "pending" ? "pending_payment" : c.status;
        if (st === "pending_payment") acc.pending += c.amount || 0;
        if (st === "paid" || st === "money_received") acc.cleared += c.amount || 0;
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

  const setStatus = (id: string, status: Check["status"]) =>
    setChecks((s) => s.map(x => x.id === id ? { ...x, status, updatedAt: todayKey() } : x));

  const beginEdit = (c: Check) => { setEditingId(c.id); setEditDraft({ ...c }); };
  const saveEdit = () => {
    if (!editingId || !editDraft) return;
    setChecks(s => s.map(c => c.id === editingId ? { ...c, ...editDraft } : c));
    setEditingId(null);
    setEditDraft(null);
  };
  const cancelEdit = () => { setEditingId(null); setEditDraft(null); };

  const statusBadge = (st: Check["status"]) => {
    const map: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-700",
      pending_payment: "bg-yellow-100 text-yellow-700",
      paid: "bg-green-100 text-green-700",
      money_received: "bg-blue-100 text-blue-700",
    };
    const label: Record<string, string> = {
      pending: "Pending Payment",
      pending_payment: "Pending Payment",
      paid: "Paid",
      money_received: "Money Received",
    };
    return <span className={`px-2 py-0.5 rounded text-xs ${map[st] || "bg-muted"}`}>{label[st] || st}</span>;
  };

  const filtered = (k: Check["kind"]) =>
    checks.filter(c => c.kind === k && (!q || c.number.toLowerCase().includes(q.toLowerCase()) || c.issuer.toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="bg-background space-y-4">
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>#Cheques</CardTitle>
          <CardDescription>Add, manage and update status. Sections: Received, Sent, Sent to Naftal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Add Check Form */}
          <div className="grid grid-cols-12 gap-2 items-end border rounded-md p-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Date Added</Label>
              <Input type="date" value={draft.date} onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Deposited Date</Label>
              <Input type="date" value={draft.depositedDate || ""} onChange={(e) => setDraft((d) => ({ ...d, depositedDate: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Check Number</Label>
              <Input value={draft.number} onChange={(e) => setDraft((d) => ({ ...d, number: e.target.value }))} placeholder="CHK-0001" />
            </div>
            <div className="col-span-3 space-y-1">
              <Label className="text-xs">Party / Company</Label>
              <Input value={draft.issuer} onChange={(e) => setDraft((d) => ({ ...d, issuer: e.target.value }))} placeholder="Client / Company" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Amount</Label>
              <Input inputMode="decimal" value={draft.amount} onChange={(e) => setDraft((d) => ({ ...d, amount: parseFloat(e.target.value) || 0 }))} placeholder="0" />
            </div>
            <div className="col-span-1 space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={draft.transactionType} onValueChange={(v) => setDraft((d) => ({ ...d, transactionType: v as Check["transactionType"] }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Check">Check</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Section</Label>
              <Select value={draft.kind} onValueChange={(v) => setDraft((d) => ({ ...d, kind: v as Check["kind"] }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Section" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="naftal">Sent to Naftal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-12 space-y-1">
              <Label className="text-xs">Status (default: Pending Payment)</Label>
              <Select value={draft.status} onValueChange={(v) => setDraft((d) => ({ ...d, status: v as Check["status"] }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending Payment</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="money_received">Money Received</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-12 space-y-1">
              <Label className="text-xs">Manager Note</Label>
              <Input value={draft.note} onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))} placeholder="Optional note" />
            </div>
            <div className="col-span-12">
              <Button onClick={addCheck}>Add Check</Button>
            </div>
          </div>

          {/* Search */}
          <div className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-4 space-y-1">
              <Label className="text-xs">Search</Label>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by number or party" />
            </div>
          </div>

          {/* Sections: top row */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-6 border rounded-md p-3">
              <div className="font-medium mb-2">Checks Received</div>
              <div className="space-y-2 max-h-80 overflow-auto">
                {filtered("received").map((c) => (
                  <div key={c.id} className="grid grid-cols-12 gap-2 border rounded-md p-2 text-sm">
                    <div className="col-span-5 font-medium truncate" title={c.issuer}>{c.issuer} <span className="text-muted-foreground ml-2">{c.number}</span></div>
                    <div className="col-span-3">{c.amount.toFixed(2)} DZD</div>
                    <div className="col-span-4 flex items-center gap-2">
                      {statusBadge(c.status)}
                      <Select value={c.status} onValueChange={(v) => setStatus(c.id, v as Check["status"]) }>
                        <SelectTrigger className="h-7 w-[160px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending Payment</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="money_received">Money Received</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="secondary" onClick={() => beginEdit(c)}>Edit</Button>
                    </div>
                    <div className="col-span-12 text-xs text-muted-foreground flex justify-between">
                      <div>Added: {c.date}{c.depositedDate ? ` • Deposited: ${c.depositedDate}` : ''}</div>
                      {c.updatedAt && <div>Edited: {c.updatedAt}</div>}
                    </div>
                    {editingId === c.id && editDraft && (
                      <div className="col-span-12 grid grid-cols-12 gap-2 items-end bg-muted/20 p-2 rounded">
                        <div className="col-span-3 space-y-1"><Label className="text-xs">Number</Label><Input value={editDraft.number} onChange={(e) => setEditDraft({ ...editDraft, number: e.target.value })} /></div>
                        <div className="col-span-3 space-y-1"><Label className="text-xs">Party</Label><Input value={editDraft.issuer} onChange={(e) => setEditDraft({ ...editDraft, issuer: e.target.value })} /></div>
                        <div className="col-span-2 space-y-1"><Label className="text-xs">Amount</Label><Input inputMode="decimal" value={editDraft.amount} onChange={(e) => setEditDraft({ ...editDraft, amount: parseFloat(e.target.value) || 0 })} /></div>
                        <div className="col-span-2 space-y-1"><Label className="text-xs">Added</Label><Input type="date" value={editDraft.date} onChange={(e) => setEditDraft({ ...editDraft, date: e.target.value })} /></div>
                        <div className="col-span-2 space-y-1"><Label className="text-xs">Deposited</Label><Input type="date" value={editDraft.depositedDate || ""} onChange={(e) => setEditDraft({ ...editDraft, depositedDate: e.target.value })} /></div>
                        <div className="col-span-12 flex items-center gap-2 justify-end">
                          <Button size="sm" variant="secondary" onClick={cancelEdit}>Cancel</Button>
                          <Button size="sm" onClick={saveEdit}>Save</Button>
                        </div>
                      </div>
                    )}
                    <div className="col-span-12 grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-10">
                        <Input value={c.note || ""} onChange={(e) => setChecks((s) => s.map(x => x.id === c.id ? { ...x, note: e.target.value } : x))} placeholder="Manager note" />
                      </div>
                      <div className="col-span-2 text-right">
                        <Button size="sm" variant="destructive" onClick={() => removeCheck(c.id)}>Delete</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-6 border rounded-md p-3">
              <div className="font-medium mb-2">Checks Sent</div>
              <div className="space-y-2 max-h-80 overflow-auto">
                {filtered("sent").map((c) => (
                  <div key={c.id} className="grid grid-cols-12 gap-2 border rounded-md p-2 text-sm">
                    <div className="col-span-5 font-medium truncate" title={c.issuer}>{c.issuer} <span className="text-muted-foreground ml-2">{c.number}</span></div>
                    <div className="col-span-3">{c.amount.toFixed(2)} DZD</div>
                    <div className="col-span-4 flex items-center gap-2">
                      {statusBadge(c.status)}
                      <Select value={c.status} onValueChange={(v) => setStatus(c.id, v as Check["status"]) }>
                        <SelectTrigger className="h-7 w-[160px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending Payment</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="money_received">Money Received</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="secondary" onClick={() => beginEdit(c)}>Edit</Button>
                    </div>
                    <div className="col-span-12 text-xs text-muted-foreground flex justify-between">
                      <div>Added: {c.date}{c.depositedDate ? ` • Deposited: ${c.depositedDate}` : ''}</div>
                      {c.updatedAt && <div>Edited: {c.updatedAt}</div>}
                    </div>
                    {editingId === c.id && editDraft && (
                      <div className="col-span-12 grid grid-cols-12 gap-2 items-end bg-muted/20 p-2 rounded">
                        <div className="col-span-3 space-y-1"><Label className="text-xs">Number</Label><Input value={editDraft.number} onChange={(e) => setEditDraft({ ...editDraft, number: e.target.value })} /></div>
                        <div className="col-span-3 space-y-1"><Label className="text-xs">Party</Label><Input value={editDraft.issuer} onChange={(e) => setEditDraft({ ...editDraft, issuer: e.target.value })} /></div>
                        <div className="col-span-2 space-y-1"><Label className="text-xs">Amount</Label><Input inputMode="decimal" value={editDraft.amount} onChange={(e) => setEditDraft({ ...editDraft, amount: parseFloat(e.target.value) || 0 })} /></div>
                        <div className="col-span-2 space-y-1"><Label className="text-xs">Added</Label><Input type="date" value={editDraft.date} onChange={(e) => setEditDraft({ ...editDraft, date: e.target.value })} /></div>
                        <div className="col-span-2 space-y-1"><Label className="text-xs">Deposited</Label><Input type="date" value={editDraft.depositedDate || ""} onChange={(e) => setEditDraft({ ...editDraft, depositedDate: e.target.value })} /></div>
                        <div className="col-span-12 flex items-center gap-2 justify-end">
                          <Button size="sm" variant="secondary" onClick={cancelEdit}>Cancel</Button>
                          <Button size="sm" onClick={saveEdit}>Save</Button>
                        </div>
                      </div>
                    )}
                    <div className="col-span-12 grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-10">
                        <Input value={c.note || ""} onChange={(e) => setChecks((s) => s.map(x => x.id === c.id ? { ...x, note: e.target.value } : x))} placeholder="Manager note" />
                      </div>
                      <div className="col-span-2 text-right">
                        <Button size="sm" variant="destructive" onClick={() => removeCheck(c.id)}>Delete</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom: Naftal */}
          <div className="border rounded-md p-3">
            <div className="font-medium mb-2">Checks Sent to Naftal</div>
            <div className="space-y-2 max-h-80 overflow-auto">
              {filtered("naftal").map((c) => (
                <div key={c.id} className="grid grid-cols-12 gap-2 border rounded-md p-2 text-sm">
                  <div className="col-span-5 font-medium truncate" title={c.issuer}>{c.issuer} <span className="text-muted-foreground ml-2">{c.number}</span></div>
                  <div className="col-span-3">{c.amount.toFixed(2)} DZD</div>
                  <div className="col-span-4 flex items-center gap-2">
                    {statusBadge(c.status)}
                    <Select value={c.status} onValueChange={(v) => setStatus(c.id, v as Check["status"]) }>
                      <SelectTrigger className="h-7 w-[160px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending Payment</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="money_received">Money Received</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="secondary" onClick={() => beginEdit(c)}>Edit</Button>
                  </div>
                  <div className="col-span-12 text-xs text-muted-foreground flex justify-between">
                    <div>Added: {c.date}{c.depositedDate ? ` • Deposited: ${c.depositedDate}` : ''}</div>
                    {c.updatedAt && <div>Edited: {c.updatedAt}</div>}
                  </div>
                  {editingId === c.id && editDraft && (
                    <div className="col-span-12 grid grid-cols-12 gap-2 items-end bg-muted/20 p-2 rounded">
                      <div className="col-span-3 space-y-1"><Label className="text-xs">Number</Label><Input value={editDraft.number} onChange={(e) => setEditDraft({ ...editDraft, number: e.target.value })} /></div>
                      <div className="col-span-3 space-y-1"><Label className="text-xs">Party</Label><Input value={editDraft.issuer} onChange={(e) => setEditDraft({ ...editDraft, issuer: e.target.value })} /></div>
                      <div className="col-span-2 space-y-1"><Label className="text-xs">Amount</Label><Input inputMode="decimal" value={editDraft.amount} onChange={(e) => setEditDraft({ ...editDraft, amount: parseFloat(e.target.value) || 0 })} /></div>
                      <div className="col-span-2 space-y-1"><Label className="text-xs">Added</Label><Input type="date" value={editDraft.date} onChange={(e) => setEditDraft({ ...editDraft, date: e.target.value })} /></div>
                      <div className="col-span-2 space-y-1"><Label className="text-xs">Deposited</Label><Input type="date" value={editDraft.depositedDate || ""} onChange={(e) => setEditDraft({ ...editDraft, depositedDate: e.target.value })} /></div>
                      <div className="col-span-12 flex items-center gap-2 justify-end">
                        <Button size="sm" variant="secondary" onClick={cancelEdit}>Cancel</Button>
                        <Button size="sm" onClick={saveEdit}>Save</Button>
                      </div>
                    </div>
                  )}
                  <div className="col-span-12 grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-10">
                      <Input value={c.note || ""} onChange={(e) => setChecks((s) => s.map(x => x.id === c.id ? { ...x, note: e.target.value } : x))} placeholder="Manager note" />
                    </div>
                    <div className="col-span-2 text-right">
                      <Button size="sm" variant="destructive" onClick={() => removeCheck(c.id)}>Delete</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

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