import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

// Local storage helpers (kept consistent with other pages)
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
 type StoreHistoryItem = { date: string; totals: { tProf: number; nProf: number } };

function toCSV(rows: { date: string; liters?: number; tProf: number; nProf: number }[]) {
  const header = ["Date", "Liters", "Total Profit", "Net Profit"].join(",");
  const body = rows
    .map((r) => [r.date, r.liters ?? "", r.tProf.toFixed(2), r.nProf.toFixed(2)].join(","))
    .join("\n");
  return `${header}\n${body}`;
}

export default function ReportsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [includeStore, setIncludeStore] = useState<boolean>(() => store.get("gs.reports.includeStore", true));

  const daily = store.get<DailyHistoryItem[]>("gs.history.daily", []);
  const storeHist = store.get<StoreHistoryItem[]>("gs.history.store", []);

  const within = (d: string) => (!from || d >= from) && (!to || d <= to);

  const rows = useMemo(() => {
    // combine daily and store by date
    const map = new Map<string, { date: string; liters: number; tProf: number; nProf: number }>();
    daily.filter((i) => within(i.date)).forEach((d) => {
      map.set(d.date, { date: d.date, liters: d.totals.liters || 0, tProf: d.totals.tProf || 0, nProf: d.totals.nProf || 0 });
    });
    if (includeStore) {
      storeHist.filter((i) => within(i.date)).forEach((s) => {
        const prev = map.get(s.date) || { date: s.date, liters: 0, tProf: 0, nProf: 0 };
        map.set(s.date, { date: s.date, liters: prev.liters, tProf: prev.tProf + (s.totals.tProf || 0), nProf: prev.nProf + (s.totals.nProf || 0) });
      });
    }
    return Array.from(map.values()).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [daily, storeHist, from, to, includeStore]);

  const summary = rows.reduce(
    (acc, r) => {
      acc.days += 1;
      acc.liters += r.liters || 0;
      acc.tProf += r.tProf || 0;
      acc.nProf += r.nProf || 0;
      return acc;
    },
    { days: 0, liters: 0, tProf: 0, nProf: 0 }
  );

  const exportCSV = () => {
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reports_${from || "all"}_${to || "all"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-background space-y-4 p-1">
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>#Reports</CardTitle>
          <CardDescription>Filter by date range. Totals combine Main and {includeStore ? "Store" : "—"} history.</CardDescription>
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
          <div className="col-span-3 flex items-center gap-2">
            <Label className="text-xs">Include Store</Label>
            <Switch checked={includeStore} onCheckedChange={(v) => { setIncludeStore(v); store.set("gs.reports.includeStore", v); }} />
          </div>
          <div className="col-span-3">
            <Button className="w-full" variant="secondary" onClick={exportCSV}>Export CSV</Button>
          </div>
          <div className="col-span-12 text-sm grid grid-cols-4 gap-3 mt-2">
            <div className="p-3 rounded-md border"><div className="text-muted-foreground">Days</div><div className="font-semibold">{summary.days}</div></div>
            <div className="p-3 rounded-md border"><div className="text-muted-foreground">Liters</div><div className="font-semibold">{summary.liters.toFixed(2)} L</div></div>
            <div className="p-3 rounded-md border"><div className="text-muted-foreground">Total Profit</div><div className="font-semibold">{summary.tProf.toFixed(2)} DZD</div></div>
            <div className="p-3 rounded-md border"><div className="text-muted-foreground">Net Profit</div><div className="font-semibold">{summary.nProf.toFixed(2)} DZD</div></div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Daily breakdown</CardTitle>
          <CardDescription>Combined totals per day</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-2 max-h-[500px] overflow-auto">
            {rows.length === 0 ? (
              <div className="text-muted-foreground">No data for selected range.</div>
            ) : (
              rows.map((r) => (
                <div key={r.date} className="grid grid-cols-12 gap-2 items-center border rounded-md p-2">
                  <div className="col-span-3 font-medium">{r.date}</div>
                  <div className="col-span-3">{(r.liters || 0).toFixed(2)} L</div>
                  <div className="col-span-3 font-semibold">{r.tProf.toFixed(2)} DZD</div>
                  <div className="col-span-3 text-right">{r.nProf.toFixed(2)} DZD</div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}