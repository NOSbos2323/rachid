import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Simple local storage helpers (match existing pattern)
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

type DailyHistoryItem = {
  date: string; // yyyy-mm-dd
  totals: { liters: number; tProf: number; nProf: number };
};

type StoreHistoryItem = {
  date: string; // yyyy-mm-dd
  totals: { tProf: number; nProf: number };
};

export default function OverallTotalsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const daily = store.get<DailyHistoryItem[]>("gs.history.daily", []);
  const storeHist = store.get<StoreHistoryItem[]>("gs.history.store", []);

  const { list, sums } = useMemo(() => {
    const within = (d: string) => (!from || d >= from) && (!to || d <= to);
    const dRows = daily.filter((i) => within(i.date));
    const sRows = storeHist.filter((i) => within(i.date));

    const combined = [
      ...dRows.map((d) => ({
        date: d.date,
        source: "Pumps + Oils + GazB",
        tProf: d.totals.tProf,
        nProf: d.totals.nProf,
      })),
      ...sRows.map((s) => ({
        date: s.date,
        source: "Store",
        tProf: s.totals.tProf,
        nProf: s.totals.nProf,
      })),
    ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

    const sums = combined.reduce(
      (acc, r) => {
        acc.tProf += r.tProf;
        acc.nProf += r.nProf;
        return acc;
      },
      { tProf: 0, nProf: 0 }
    );

    return { list: combined, sums };
  }, [daily, storeHist, from, to]);

  return (
    <div className="bg-background space-y-4">
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Total So Far</CardTitle>
          <CardDescription>Aggregates Main Page saves and Store sales. Use date range to filter.</CardDescription>
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
          <div className="col-span-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Total Profite (TP):</span>
              <span className="font-semibold">{sums.tProf.toFixed(2)} DZD</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Net Profite (NP):</span>
              <span className="font-semibold">{sums.nProf.toFixed(2)} DZD</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle>History</CardTitle>
          <CardDescription>Latest entries first</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-80 overflow-auto space-y-2 text-sm">
            {list.length === 0 ? (
              <div className="text-muted-foreground">No entries in range.</div>
            ) : (
              list.map((r, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center border rounded-md p-2">
                  <div className="col-span-3 font-medium">{r.date}</div>
                  <div className="col-span-6">{r.source}</div>
                  <div className="col-span-3 text-right font-semibold">TP {r.tProf.toFixed(2)} · NP {r.nProf.toFixed(2)}</div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
