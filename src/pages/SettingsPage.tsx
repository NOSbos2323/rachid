import React, { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

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

 type Settings = {
  businessName: string;
  currency: string;
  gazbDefaults: { price: number; profit: number; deduct: boolean };
  oilBottleDefaults: { price: number; profit: number; deduct: boolean };
};

export default function SettingsPage() {
  const [cfg, setCfg] = useState<Settings>(() =>
    store.get<Settings>("gs.settings", {
      businessName: "",
      currency: "DZD",
      gazbDefaults: { price: 200, profit: 23.5, deduct: true },
      oilBottleDefaults: { price: 0, profit: 0, deduct: true },
    })
  );
  useEffect(() => store.set("gs.settings", cfg), [cfg]);

  const applyToCurrent = () => {
    const gazb = store.get("gs.gazb", { bottles: "", price: 200, profit: 23.5, deduct: true, stock: 0 });
    const oil = store.get("gs.oil", { prev: 0, today: "", directLiters: "", bottles: "", bottlePrice: 0, bottleProfit: 0, deductLiters: true, deductBottles: true, bottlesStock: 0 });

    store.set("gs.gazb", { ...gazb, price: cfg.gazbDefaults.price, profit: cfg.gazbDefaults.profit, deduct: cfg.gazbDefaults.deduct });
    store.set("gs.oil", { ...oil, bottlePrice: cfg.oilBottleDefaults.price, bottleProfit: cfg.oilBottleDefaults.profit, deductBottles: cfg.oilBottleDefaults.deduct });
    alert("Defaults applied to current day inputs.");
  };

  const resetAll = () => {
    if (!confirm("This will clear ALL local data for the app. Continue?")) return;
    localStorage.clear();
    alert("All local data cleared.");
  };

  const exportData = () => {
    const data: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      const v = localStorage.getItem(k);
      try { data[k] = v != null ? JSON.parse(v) : null; } catch { data[k] = v; }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tempo_data_backup.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const triggerImport = () => {
    const el = document.getElementById('settings-import-json') as HTMLInputElement | null;
    el?.click();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      Object.keys(data || {}).forEach((k) => {
        localStorage.setItem(k, JSON.stringify(data[k]));
      });
      alert('Data imported successfully.');
    } catch (err) {
      alert('Invalid JSON file.');
    } finally {
      e.currentTarget.value = '';
    }
  };

  const fileRef = useRef<HTMLInputElement>(null);

  const exportAll = () => {
    const data: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      if (k.startsWith("gs.") || k.startsWith("app.")) {
        try {
          data[k] = JSON.parse(localStorage.getItem(k) as string);
        } catch {
          data[k] = localStorage.getItem(k);
        }
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `waali-gas-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFromFile = (file: File) => {
    file.text().then((txt) => {
      try {
        const obj = JSON.parse(txt);
        if (!confirm("Import will overwrite existing data keys. Continue?")) return;
        Object.entries(obj).forEach(([k, v]) => {
          try {
            const val = typeof v === "string" ? v : JSON.stringify(v);
            localStorage.setItem(k, val as string);
          } catch {}
        });
        alert("Data imported. Reloading…");
        location.reload();
      } catch (e) {
        alert("Invalid backup file");
      }
    });
  };

  return (
    <div className="bg-background space-y-4 p-1">
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>#Settings</CardTitle>
          <CardDescription>Business, currency, and defaults for Gaz bottles and Oil bottles.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-12 gap-3">
          <div className="col-span-4 space-y-1">
            <Label className="text-xs">Business name</Label>
            <Input value={cfg.businessName} onChange={(e) => setCfg((s) => ({ ...s, businessName: e.target.value }))} placeholder="My Station" />
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">Currency</Label>
            <Input value={cfg.currency} onChange={(e) => setCfg((s) => ({ ...s, currency: e.target.value }))} placeholder="DZD" />
          </div>
          <div className="col-span-12" />

          <div className="col-span-6 border rounded-md p-3 space-y-2">
            <div className="font-medium">Gaz Bottles Defaults</div>
            <div className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4 space-y-1">
                <Label className="text-xs">TProf/Unit</Label>
                <Input inputMode="decimal" value={cfg.gazbDefaults.price} onChange={(e) => setCfg((s) => ({ ...s, gazbDefaults: { ...s.gazbDefaults, price: parseFloat(e.target.value) || 0 } }))} />
              </div>
              <div className="col-span-4 space-y-1">
                <Label className="text-xs">NP/Unit</Label>
                <Input inputMode="decimal" value={cfg.gazbDefaults.profit} onChange={(e) => setCfg((s) => ({ ...s, gazbDefaults: { ...s.gazbDefaults, profit: parseFloat(e.target.value) || 0 } }))} />
              </div>
              <div className="col-span-4 flex items-center gap-2">
                <Label className="text-xs">Deduct stock</Label>
                <Switch checked={cfg.gazbDefaults.deduct} onCheckedChange={(v) => setCfg((s) => ({ ...s, gazbDefaults: { ...s.gazbDefaults, deduct: v } }))} />
              </div>
            </div>
          </div>

          <div className="col-span-6 border rounded-md p-3 space-y-2">
            <div className="font-medium">Oil Bottles Defaults</div>
            <div className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4 space-y-1">
                <Label className="text-xs">Price/Unit</Label>
                <Input inputMode="decimal" value={cfg.oilBottleDefaults.price} onChange={(e) => setCfg((s) => ({ ...s, oilBottleDefaults: { ...s.oilBottleDefaults, price: parseFloat(e.target.value) || 0 } }))} />
              </div>
              <div className="col-span-4 space-y-1">
                <Label className="text-xs">NP/Unit</Label>
                <Input inputMode="decimal" value={cfg.oilBottleDefaults.profit} onChange={(e) => setCfg((s) => ({ ...s, oilBottleDefaults: { ...s.oilBottleDefaults, profit: parseFloat(e.target.value) || 0 } }))} />
              </div>
              <div className="col-span-4 flex items-center gap-2">
                <Label className="text-xs">Deduct stock</Label>
                <Switch checked={cfg.oilBottleDefaults.deduct} onCheckedChange={(v) => setCfg((s) => ({ ...s, oilBottleDefaults: { ...s.oilBottleDefaults, deduct: v } }))} />
              </div>
            </div>
          </div>

          <div className="col-span-12 flex items-center gap-2 mt-2">
            <Button onClick={applyToCurrent}>Apply defaults to current day</Button>
            <Button variant="destructive" onClick={resetAll}>Reset ALL local data</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Data</CardTitle>
          <CardDescription>Backup (export) or restore (import) local data.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-2">
          <Button variant="secondary" onClick={exportAll}>Export (Download)</Button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importFromFile(f); (e.currentTarget as HTMLInputElement).value = ""; }} />
          <Button onClick={() => fileRef.current?.click()}>Import</Button>
        </CardContent>
      </Card>
    </div>
  );
}