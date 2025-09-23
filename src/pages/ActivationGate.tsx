import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sun, Moon } from "lucide-react";
import MainPage from "./MainPage";
import TanksPage from "./TanksPage";
import StorePage from "./StorePage";
import OverallTotalsPage from "./OverallTotalsPage";
import ChecksPage from "./ChecksPage";
import CreditsPage from "./CreditsPage";
import WorkersPage from "./WorkersPage";
import TaxesZakatPage from "./TaxesZakatPage";
import ReportsPage from "./ReportsPage";
import SettingsPage from "./SettingsPage";

// Simple local persistence helpers
const storage = {
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
  remove(key: string) {
    localStorage.removeItem(key);
  },
};

// Keys
const ACTIVATION_KEY = "app.activation.valid";
const AUTH_KEY = "app.auth.user";
const THEME_KEY = "app.theme";
const LANG_KEY = "app.lang";

// Fake activation validator
function validateActivationKey(key: string) {
  // Accept a few simple keys for demo
  const allowed = ["TEMPO-GAS-1234", "GAS-2025-OK", "GS-KEY-9999"];
  return allowed.includes(key.trim());
}

// Auth
type User = { username: string } | null;

export default function ActivationGate() {
  const [activated, setActivated] = useState<boolean>(() => storage.get(ACTIVATION_KEY, false));
  const [user, setUser] = useState<User>(() => storage.get<User>(AUTH_KEY, null));
  const [theme, setTheme] = useState<string>(() => storage.get<string>(THEME_KEY, "light"));
  const [lang, setLang] = useState<string>(() => storage.get<string>(LANG_KEY, "fr"));

  useEffect(() => {
    storage.set(THEME_KEY, theme);
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [theme]);

  useEffect(() => {
    storage.set(LANG_KEY, lang);
  }, [lang]);

  const onActivated = () => setActivated(true);
  const onLoggedIn = (u: User) => setUser(u);
  const onLogout = () => {
    storage.remove(AUTH_KEY);
    setUser(null);
  };

  if (!activated) return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <ActivationScreen onActivated={onActivated} />
    </div>
  );

  if (!user) return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <LoginScreen onLoggedIn={onLoggedIn} />
    </div>
  );

  return (
    <MainShell
      theme={theme}
      setTheme={setTheme}
      lang={lang}
      setLang={setLang}
      user={user}
      onLogout={onLogout}
    />
  );
}

function ActivationScreen({ onActivated }: { onActivated: () => void }) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");

  const handleActivate = () => {
    if (validateActivationKey(key)) {
      storage.set(ACTIVATION_KEY, true);
      setError("");
      onActivated();
    } else {
      setError("Invalid activation key");
    }
  };

  return (
    <Card className="w-full max-w-md bg-card">
      <CardHeader>
        <CardTitle>Activation</CardTitle>
        <CardDescription>Enter your one-time activation key to unlock the app.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="activation-key">Activation Key</Label>
          <Input id="activation-key" placeholder="TEMPO-GAS-1234" value={key} onChange={(e) => setKey(e.target.value)} />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <Button className="w-full" onClick={handleActivate}>Activate</Button>
      </CardContent>
    </Card>
  );
}

function LoginScreen({ onLoggedIn }: { onLoggedIn: (u: User) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const defaultUser = useMemo(() => ({ username: "admin", password: "admin123" }), []);

  const handleLogin = () => {
    const ok = (username || "").trim() === defaultUser.username && password === defaultUser.password;
    if (ok) {
      const u = { username };
      storage.set(AUTH_KEY, u);
      setError("");
      onLoggedIn(u);
    } else setError("Invalid credentials");
  };

  return (
    <Card className="w-full max-w-md bg-card">
      <CardHeader>
        <CardTitle>Login</CardTitle>
        <CardDescription>Local only. Default admin/admin123</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input id="username" placeholder="admin" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" onClick={handleLogin}>Sign in</Button>
      </CardContent>
    </Card>
  );
}

function MainShell({
  theme,
  setTheme,
  lang,
  setLang,
  user,
  onLogout,
}: {
  theme: string;
  setTheme: (t: string) => void;
  lang: string;
  setLang: (l: string) => void;
  user: User;
  onLogout: () => void;
}) {
  const [active, setActive] = useState<string>("main");

  const items = [
    { key: "main", label: "Main" },
    { key: "tanks", label: "Tanks" },
    { key: "store", label: "Store" },
    { key: "credits", label: "Credits" },
    { key: "workers", label: "Workers" },
    { key: "taxes", label: "Taxes & Zakat" },
    { key: "cheques", label: "Cheques" },
    { key: "reports", label: "Reports" },
    { key: "totals", label: "Total So Far" },
    { key: "settings", label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground grid grid-cols-[240px_1fr]">
      <aside className="h-screen sticky top-0 border-r bg-card">
        <div className="p-4 border-b flex items-center gap-2">
          <img src="/waali-gas-logo.svg" alt="Waali Gas Station" className="h-6 w-6" />
          <div>
            <p className="font-semibold">Waali Gas Station</p>
            <p className="text-xs text-muted-foreground">Dashboard</p>
          </div>
        </div>
        <nav className="p-2 space-y-1">
          {items.map((it) => (
            <button
              key={it.key}
              onClick={() => setActive(it.key)}
              className={`w-full text-left rounded-md px-3 py-2 text-sm hover:bg-accent ${active === it.key ? "bg-accent" : ""}`}
            >
              {it.label}
            </button>
          ))}
        </nav>
      </aside>
      <div className="min-h-screen flex flex-col">
        <header className="h-14 border-b bg-card flex items-center justify-between px-4 gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{formatToday()}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4" />
              <Switch checked={theme === "dark"} onCheckedChange={(v) => setTheme(v ? "dark" : "light")} />
              <Moon className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="lang" className="text-xs">Lang</Label>
              <select
                id="lang"
                className="bg-transparent border rounded-md px-2 py-1 text-sm"
                value={lang}
                onChange={(e) => setLang(e.target.value)}
              >
                <option value="fr">Français</option>
                <option value="ar">العربية</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">{user?.username || "user"}</span>
              <Button variant="secondary" size="sm" onClick={onLogout}>Logout</Button>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 bg-background">
          {active === "main" && <MainPage />}
          {active === "tanks" && <TanksPage />}
          {active === "store" && <StorePage />}
          {active === "totals" && <OverallTotalsPage />}
          {active === "cheques" && <ChecksPage />}
          {active === "credits" && <CreditsPage />}
          {active === "workers" && <WorkersPage />}
          {active === "taxes" && <TaxesZakatPage />}
          {active === "reports" && <ReportsPage />}
          {active === "settings" && <SettingsPage />}
          {active !== "main" && active !== "tanks" && active !== "store" && active !== "totals" && active !== "cheques" && active !== "credits" && (
            <Card className="bg-card">
              <CardHeader>
                <CardTitle>{items.find(i => i.key === active)?.label}</CardTitle>
                <CardDescription>Scaffolding ready. We will implement this section next.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Coming soon…</p>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}

function formatToday() {
  const d = new Date();
  // Ensure 2025 as required in notes if year < 2025, display 2025 (for demo purposes)
  const year = Math.max(d.getFullYear(), 2025);
  const display = new Date(year, d.getMonth(), d.getDate());
  return display.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}