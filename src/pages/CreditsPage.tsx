import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  // extra info
  phone?: string;
  address?: string;
  note?: string;
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
  const [clientDraft, setClientDraft] = useState({ name: "", group: 'Companies' as CreditClient['group'], phone: "", address: "", note: "" });
  const [saleDraft, setSaleDraft] = useState({ clientId: "", amount: "", category: 'Fuel' as 'Fuel'|'Store'|'Other', note: "" });
  const [payDraft, setPayDraft] = useState({ clientId: "", amount: "", note: "" });
  const [showClientExtra, setShowClientExtra] = useState(false);

  const [openClientId, setOpenClientId] = useState<string | null>(null);
  const openClient = openClientId ? clientById[openClientId] : undefined;
  const [editDraft, setEditDraft] = useState<{ phone?: string; address?: string; note?: string; group?: CreditClient['group'] }>({});

  const addClient = () => {
    const name = clientDraft.name.trim();
    if (!name) return;
    // Prevent duplicates by name
    if (clients.some(c => c.name.toLowerCase() === name.toLowerCase())) return;
    setClients(s => [...s, { id: crypto.randomUUID(), name, group: clientDraft.group, phone: clientDraft.phone?.trim() || undefined, address: clientDraft.address?.trim() || undefined, note: clientDraft.note?.trim() || undefined }]);
    setClientDraft({ name: "", group: clientDraft.group, phone: "", address: "", note: "" });
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
              <div className="col-span-2 flex gap-2">
                <Button className="w-full" onClick={addClient}>Add</Button>
              </div>
              <div className="col-span-12 flex items-center gap-2 text-xs pt-2">
                <Button variant="secondary" size="sm" onClick={() => setShowClientExtra(v => !v)}>{showClientExtra ? 'Hide extra' : 'More info'}</Button>
                <span className="text-muted-foreground">Optional: phone, address, note</span>
              </div>
              {showClientExtra && (
                <div className="col-span-12 grid grid-cols-12 gap-2">
                  <div className="col-span-3 space-y-1">
                    <Label className="text-xs">Phone</Label>
                    <Input value={clientDraft.phone} onChange={(e) => setClientDraft(d => ({ ...d, phone: e.target.value }))} placeholder="e.g. 0555..." />
                  </div>
                  <div className="col-span-5 space-y-1">
                    <Label className="text-xs">Address</Label>
                    <Input value={clientDraft.address} onChange={(e) => setClientDraft(d => ({ ...d, address: e.target.value }))} placeholder="City, Street" />
                  </div>
                  <div className="col-span-4 space-y-1">
                    <Label className="text-xs">Note</Label>
                    <Input value={clientDraft.note} onChange={(e) => setClientDraft(d => ({ ...d, note: e.target.value }))} placeholder="Notes" />
                  </div>
                </div>
              )}
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

          {/* Clients List as Cards */}
          <div className="space-y-2">
            <div className="font-medium">Clients List</div>
            {clients.length === 0 ? (
              <div className="text-sm text-muted-foreground">No clients yet.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {clients.map(c => {
                  const bal = balances.get(c.name) || 0;
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        setOpenClientId(c.id);
                        setEditDraft({ phone: c.phone, address: c.address, note: c.note, group: c.group });
                      }}
                      className="text-left"
                    >
                      <Card className="hover:shadow-md transition-shadow">
                        <CardHeader className="p-4">
                          <CardTitle className="text-base">{c.name}</CardTitle>
                          <CardDescription className="text-xs">{c.group}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 text-sm space-y-1">
                          <div className={`font-semibold ${bal >= 0 ? 'text-orange-600' : 'text-green-600'}`}>{bal.toFixed(2)} DZD</div>
                          {c.phone && <div className="text-muted-foreground">📞 {c.phone}</div>}
                          {c.address && <div className="text-muted-foreground truncate" title={c.address}>📍 {c.address}</div>}
                          {c.note && <div className="text-muted-foreground truncate" title={c.note}>📝 {c.note}</div>}
                          <div className="text-xs text-muted-foreground pt-1">Tap to view history</div>
                        </CardContent>
                      </Card>
                    </button>
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

      {/* Client Details + History Dialog */}
      <Dialog open={!!openClientId} onOpenChange={(o) => !o ? setOpenClientId(null) : null}>
        <DialogContent className="max-w-2xl">
          {openClient && (
            <>
              <DialogHeader>
                <DialogTitle>{openClient.name}</DialogTitle>
                <DialogDescription>
                  Group: {openClient.group} · Balance: <span className={`font-semibold ${((balances.get(openClient.name) || 0) >= 0) ? 'text-orange-600' : 'text-green-600'}`}>{(balances.get(openClient.name) || 0).toFixed(2)} DZD</span>
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-12 md:col-span-5 space-y-2 border rounded-md p-3">
                  <div className="font-medium text-sm">Client Info</div>
                  <div className="space-y-1">
                    <Label className="text-xs">Phone</Label>
                    <Input value={editDraft.phone || ''} onChange={(e) => setEditDraft(d => ({ ...d, phone: e.target.value }))} placeholder="0555..." />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Address</Label>
                    <Input value={editDraft.address || ''} onChange={(e) => setEditDraft(d => ({ ...d, address: e.target.value }))} placeholder="City, Street" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Note</Label>
                    <Input value={editDraft.note || ''} onChange={(e) => setEditDraft(d => ({ ...d, note: e.target.value }))} placeholder="Notes" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Group</Label>
                    <Select value={editDraft.group || openClient.group} onValueChange={(v) => setEditDraft(d => ({ ...d, group: v as CreditClient['group'] }))}>
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
                  <div className="pt-2">
                    <Button
                      onClick={() => {
                        if (!openClientId) return;
                        setClients(prev => prev.map(c => c.id === openClientId ? { ...c, phone: (editDraft.phone || '').trim() || undefined, address: (editDraft.address || '').trim() || undefined, note: (editDraft.note || '').trim() || undefined, group: editDraft.group || c.group } : c));
                        setOpenClientId(null);
                      }}
                    >Save</Button>
                  </div>
                </div>
                <div className="col-span-12 md:col-span-7 space-y-2">
                  <div className="font-medium text-sm">Full Credit History</div>
                  <div className="space-y-1 text-sm max-h-72 overflow-auto">
                    {history.filter(h => h.customer === openClient.name).length === 0 ? (
                      <div className="text-sm text-muted-foreground">No history for this client.</div>
                    ) : (
                      history.filter(h => h.customer === openClient.name).map(tx => (
                        <div key={tx.id} className="grid grid-cols-12 gap-2 items-center border rounded-md p-2">
                          <div className="col-span-3 text-xs text-muted-foreground">{tx.date}</div>
                          <div className="col-span-4">{tx.kind === 'sale' ? (tx.category || 'Sale') : 'Payment'}</div>
                          <div className={`col-span-5 text-right font-semibold ${tx.kind === 'sale' ? 'text-green-600' : 'text-red-600'}`}>
                            {tx.kind === 'sale' ? '+ ' : '- '} {tx.amount.toFixed(2)} DZD
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}