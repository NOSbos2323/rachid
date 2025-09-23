import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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

function todayKey(): string {
  const d = new Date();
  const year = Math.max(d.getFullYear(), 2025);
  const d2025 = new Date(year, d.getMonth(), d.getDate());
  return d2025.toISOString().slice(0, 10);
}

type CreditTx = {
  id: string;
  date: string; // yyyy-mm-dd
  customer: string;
  amount: number;
  note?: string;
  kind: 'sale' | 'payment';
  category?: 'Fuel' | 'Store' | 'Other';
};

type CreditClient = {
  id: string;
  name: string;
  group: 'Companies' | 'Entrepreneurs' | 'Agricultures' | 'Normal People' | 'Other';
};

export default function CreditsPage() {
  const [ledger, setLedger] = useState<CreditTx[]>(() => store.get<CreditTx[]>("gs.credits.ledger", []));
  useEffect(() => { store.set("gs.credits.ledger", ledger); }, [ledger]);

  // Clients
  const [clients, setClients] = useState<CreditClient[]>(() => store.get<CreditClient[]>("gs.credits.clients", []));
  useEffect(() => { store.set("gs.credits.clients", clients); }, [clients]);
  // sanitize any clients that may have empty IDs (avoids Radix Select.Item empty value error)
  useEffect(() => {
    const hasInvalid = clients.some(c => !c.id || c.id.trim() === "");
    if (hasInvalid) {
      const fixed = clients.map(c => ({ ...c, id: c.id && c.id.trim() !== "" ? c.id : crypto.randomUUID() }));
      setClients(fixed);
    }
  }, [clients]);

  const customers = useMemo(() => clients.map(c => c.name), [clients]);
  const clientById = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c])), [clients]);

  const balances = useMemo(() => {
    const m = new Map<string, number>();
    ledger.forEach(tx => {
      const cur = m.get(tx.customer) || 0;
      m.set(tx.customer, cur + (tx.kind === 'sale' ? tx.amount : -tx.amount));
    });
    return m;
  }, [ledger]);

  // Drafts
  const [clientDraft, setClientDraft] = useState({ name: "", group: 'Companies' as CreditClient['group'] });
  const [saleDraft, setSaleDraft] = useState({ clientId: "", amount: "", category: 'Fuel' as 'Fuel'|'Store'|'Other', note: "" });
  const [payDraft, setPayDraft] = useState({ clientId: "", amount: "", note: "" });

  const addClient = () => {
    const name = clientDraft.name.trim();
    if (!name) return;
    // Prevent duplicates by name
    if (clients.some(c => c.name.toLowerCase() === name.toLowerCase())) return;
    setClients(s => [...s, { id: crypto.randomUUID(), name, group: clientDraft.group }]);
    setClientDraft({ name: "", group: clientDraft.group });
  };

  const addSale = () => {
    const amount = parseFloat(saleDraft.amount.replace(',', '.')) || 0;
    if (!saleDraft.clientId || amount <= 0) return;
    const customer = clientById[saleDraft.clientId]?.name || '';
    const tx: CreditTx = { id: crypto.randomUUID(), date: todayKey(), customer, amount: Number(amount.toFixed(2)), note: saleDraft.note || undefined, kind: 'sale', category: saleDraft.category };
    setLedger(s => [...s, tx]);
    const cur = store.get<number>("gs.credits.today", 0) + tx.amount;
    store.set("gs.credits.today", cur);
    setSaleDraft({ clientId: saleDraft.clientId, amount: "", category: saleDraft.category, note: "" });
  };

  const addPayment = () => {
    const amount = parseFloat(payDraft.amount.replace(',', '.')) || 0;
    if (!payDraft.clientId || amount <= 0) return;
    const customer = clientById[payDraft.clientId]?.name || '';
    const tx: CreditTx = { id: crypto.randomUUID(), date: todayKey(), customer, amount: Number(amount.toFixed(2)), note: payDraft.note || undefined, kind: 'payment' };
    setLedger(s => [...s, tx]);
    const curPaid = store.get<number>("gs.credits.paid.today", 0) + tx.amount;
    store.set("gs.credits.paid.today", curPaid);
    setPayDraft({ clientId: payDraft.clientId, amount: "", note: "" });
  };

  const history = [...ledger].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  return (
    <div className="bg-background space-y-4">
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>#Credits</CardTitle>
          <CardDescription>Manage clients, credit sales and payments. Credit affects Total Profit; payments reduce it. Client balances update accordingly.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Clients */}
          <div className="space-y-2">
            <div className="font-medium">Clients</div>
            <div className="grid grid-cols-12 gap-2 items-end border rounded-md p-3">
              <div className="col-span-6 space-y-1">
                <Label className="text-xs">Name</Label>
                <Input value={clientDraft.name} onChange={(e) => setClientDraft(d => ({ ...d, name: e.target.value }))} placeholder="Client name" />
              </div>
              <div className="col-span-4 space-y-1">
                <Label className="text-xs">Group</Label>
                <Select value={clientDraft.group} onValueChange={(v) => setClientDraft(d => ({ ...d, group: v as CreditClient['group'] }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Group" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Companies">Companies</SelectItem>
                    <SelectItem value="Entrepreneurs">Entrepreneurs</SelectItem>
                    <SelectItem value="Agricultures">Agricultures</SelectItem>
                    <SelectItem value="Normal People">Normal People</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Button className="w-full" onClick={addClient}>Add</Button>
              </div>
            </div>
          </div>

          {/* Add Credit Sale */}
          <div className="grid grid-cols-12 gap-2 items-end border rounded-md p-3">
            <div className="col-span-3 space-y-1">
              <Label className="text-xs">Client</Label>
              <Select value={saleDraft.clientId} onValueChange={(v) => setSaleDraft(d => ({ ...d, clientId: v }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.length === 0 ? (
                    <SelectItem value="no_clients" disabled>No clients yet</SelectItem>
                  ) : (
                    clients.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={saleDraft.category} onValueChange={(v) => setSaleDraft(d => ({ ...d, category: v as 'Fuel'|'Store'|'Other' }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fuel">Fuel</SelectItem>
                  <SelectItem value="Store">Store</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Amount</Label>
              <Input inputMode="decimal" value={saleDraft.amount} onChange={(e) => setSaleDraft(d => ({ ...d, amount: e.target.value }))} placeholder="0" />
            </div>
            <div className="col-span-5 space-y-1">
              <Label className="text-xs">Note</Label>
              <Input value={saleDraft.note} onChange={(e) => setSaleDraft(d => ({ ...d, note: e.target.value }))} placeholder="Optional note" />
            </div>
            <div className="col-span-12">
              <Button onClick={addSale} disabled={!saleDraft.clientId}>Add Credit</Button>
            </div>
          </div>

          {/* Record Payment */}
          <div className="grid grid-cols-12 gap-2 items-end border rounded-md p-3">
            <div className="col-span-4 space-y-1">
              <Label className="text-xs">Client</Label>
              <Select value={payDraft.clientId} onValueChange={(v) => setPayDraft(d => ({ ...d, clientId: v }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.length === 0 ? (
                    <SelectItem value="no_clients" disabled>No clients yet</SelectItem>
                  ) : (
                    clients.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-3 space-y-1">
              <Label className="text-xs">Amount</Label>
              <Input inputMode="decimal" value={payDraft.amount} onChange={(e) => setPayDraft(d => ({ ...d, amount: e.target.value }))} placeholder="0" />
            </div>
            <div className="col-span-4 space-y-1">
              <Label className="text-xs">Note</Label>
              <Input value={payDraft.note} onChange={(e) => setPayDraft(d => ({ ...d, note: e.target.value }))} placeholder="Optional note" />
            </div>
            <div className="col-span-1">
              <Button className="w-full" onClick={addPayment} disabled={!payDraft.clientId}>Pay</Button>
            </div>
          </div>

          {/* Balances */}
          <div className="space-y-2">
            <div className="font-medium">Balances</div>
            {clients.length === 0 ? (
              <div className="text-sm text-muted-foreground">No clients yet.</div>
            ) : (
              <div className="space-y-1 text-sm max-h-40 overflow-auto">
                {clients.map(c => {
                  const bal = balances.get(c.name) || 0;
                  return (
                    <div key={c.id} className="grid grid-cols-12 gap-2 items-center border rounded-md p-2">
                      <div className="col-span-8 font-medium">{c.name} <span className="text-xs text-muted-foreground">• {c.group}</span></div>
                      <div className={`col-span-4 text-right font-semibold ${bal >= 0 ? 'text-orange-600' : 'text-green-600'}`}>{bal.toFixed(2)} DZD</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* History */}
          <div className="space-y-2">
            <div className="font-medium">History</div>
            {history.length === 0 ? (
              <div className="text-sm text-muted-foreground">No history yet.</div>
            ) : (
              <div className="space-y-1 text-sm max-h-56 overflow-auto">
                {history.map(tx => (
                  <div key={tx.id} className="grid grid-cols-12 gap-2 items-center border rounded-md p-2">
                    <div className="col-span-2 text-xs text-muted-foreground">{tx.date}</div>
                    <div className="col-span-4 font-medium">{tx.customer}</div>
                    <div className="col-span-2">{tx.kind === 'sale' ? (tx.category || 'Sale') : 'Payment'}</div>
                    <div className={`col-span-4 text-right font-semibold ${tx.kind === 'sale' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.kind === 'sale' ? '+ ' : '- '} {tx.amount.toFixed(2)} DZD
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}