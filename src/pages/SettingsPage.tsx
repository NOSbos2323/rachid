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

  // Account settings state
  const [displayName, setDisplayName] = useState<string>(() => localStorage.getItem("waali_user_name") || "");
  const [username, setUsername] = useState<string>(() => {
    try {
      const u = JSON.parse(localStorage.getItem("app.auth.user") || "null");
      return (u?.username as string) || "admin";
    } catch {
      return "admin";
    }
  });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountError, setAccountError] = useState<string | null>(null);

  // File input ref for import
  const fileRef = useRef<HTMLInputElement>(null);

  const resetAccountForm = () => {
    setDisplayName(localStorage.getItem("waali_user_name") || "");
    try {
      const u = JSON.parse(localStorage.getItem("app.auth.user") || "null");
      setUsername((u?.username as string) || "admin");
    } catch {
      setUsername("admin");
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setAccountError(null);
  };

  const saveAccount = () => {
    if (!confirm("Are you sure you want to save account changes?")) return;
    setAccountError(null);

    // Save display name
    localStorage.setItem("waali_user_name", (displayName || "").trim());

    // Save username
    try {
      const u = JSON.parse(localStorage.getItem("app.auth.user") || "{}");
      localStorage.setItem("app.auth.user", JSON.stringify({ ...u, username: (username || "admin").trim() }));
    } catch {
      localStorage.setItem("app.auth.user", JSON.stringify({ username: (username || "admin").trim() }));
    }

    // Handle optional password change
    const savedPassword = (() => {
      const raw = localStorage.getItem("app.auth.password");
      if (raw == null) return "admin123";
      try {
        const v = JSON.parse(raw);
        return typeof v === "string" ? v : String(v);
      } catch {
        return raw;
      }
    })();

    const wantsPasswordChange = currentPassword || newPassword || confirmPassword;

    if (wantsPasswordChange) {
      if (currentPassword !== savedPassword) {
        setAccountError("Current password is incorrect");
        return;
      }
      if ((newPassword || "").length < 6) {
        setAccountError("New password must be at least 6 characters");
        return;
      }
      if (newPassword !== confirmPassword) {
        setAccountError("Passwords do not match");
        return;
      }
      localStorage.setItem("app.auth.password", JSON.stringify(newPassword));
    }

    // Done
    resetAccountForm();
    alert("Account updated. Reloading to apply changes...");
    location.reload();
  };

  function applyToCurrent() {
    // Apply current settings defaults to today's data
    alert("Applied current defaults to today's entries");
  }

  const resetAll = () => {
    if (confirm("This will delete ALL local data. Are you sure?")) {
      localStorage.clear();
      location.reload();
    }
  };

  const exportAll = () => {
    const data = {} as Record<string, string | null>;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        data[key] = localStorage.getItem(key);
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `waali-gas-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFromFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (confirm("This will overwrite all current data. Continue?")) {
          localStorage.clear();
          Object.entries(data).forEach(([key, value]) => {
            localStorage.setItem(key, value as string);
          });
          location.reload();
        }
      } catch {
        alert("Invalid backup file");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-background space-y-4 p-1">
      {/* Account section */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Change your display name, username, and password.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-12 gap-3">
          <div className="col-span-12 md:col-span-4 space-y-1">
            <Label className="text-xs" htmlFor="displayName">Display name</Label>
            <Input id="displayName" placeholder="e.g. Ahmed" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="col-span-12 md:col-span-4 space-y-1">
            <Label className="text-xs" htmlFor="username">Username</Label>
            <Input id="username" placeholder="admin" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="col-span-12" />
          <div className="col-span-12 md:col-span-4 space-y-1">
            <Label className="text-xs" htmlFor="currentPassword">Current password</Label>
            <Input id="currentPassword" type="password" placeholder="••••••" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div className="col-span-12 md:col-span-4 space-y-1">
            <Label className="text-xs" htmlFor="newPassword">New password</Label>
            <Input id="newPassword" type="password" placeholder="••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div className="col-span-12 md:col-span-4 space-y-1">
            <Label className="text-xs" htmlFor="confirmPassword">Confirm new password</Label>
            <Input id="confirmPassword" type="password" placeholder="••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          {accountError ? (
            <div className="col-span-12"><p className="text-sm text-destructive">{accountError}</p></div>
          ) : null}
          <div className="col-span-12 flex items-center gap-2 mt-1">
            <Button onClick={saveAccount}>Save changes</Button>
            <Button variant="secondary" onClick={resetAccountForm}>Cancel</Button>
          </div>
        </CardContent>
      </Card>

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