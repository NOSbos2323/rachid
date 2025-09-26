import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

// Simple local storage util
const ls = {
  get<T>(k: string, fb: T): T {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : fb; } catch { return fb; }
  },
  set<T>(k: string, v: T) { localStorage.setItem(k, JSON.stringify(v)); },
};

export type Lang = 'en' | 'fr';

type Dict = Record<string, string>;

type I18nContextType = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, fallback?: string) => string;
};

const I18nContext = createContext<I18nContextType | null>(null);

// Minimal dictionaries (extend as needed)
const en: Dict = {
  workers: "Workers",
  workers_desc: "Manage workers, set salaries, record payments, and see their balances. Differences from Cashier Closing update here.",
  no_workers: "No workers yet.",
  date_hired: "Date Hired",
  salary: "Salary",
  pay_amount: "Pay Amount",
  last_payment: "Last payment",
  adjust_balance: "Adjust Balance",
  add: "Add",
  deduct: "Deduct",
  delete_worker: "Delete Worker",
  add_worker: "Add Worker",
  total_monthly_salaries: "Total monthly salaries",
  payments_history: "Payments History",
  recent_worker_payments: "Recent worker payments",
  no_payments: "No payments yet.",
  menu: "Menu",
  home: "Home",
  reports: "Reports",
  settings: "Settings",
  taxes_zakat: "Taxes & Zakat",
  workers_nav: "Workers",
  language: "Language",
};

const fr: Dict = {
  workers: "Travailleurs",
  workers_desc: "Gérer les travailleurs, définir les salaires, enregistrer les paiements et voir leurs soldes. Les différences de clôture de caisse se mettent ici.",
  no_workers: "Aucun travailleur pour l'instant.",
  date_hired: "Date d'embauche",
  salary: "Salaire",
  pay_amount: "Montant du paiement",
  last_payment: "Dernier paiement",
  adjust_balance: "Ajuster le solde",
  add: "Ajouter",
  deduct: "Déduire",
  delete_worker: "Supprimer le travailleur",
  add_worker: "Ajouter un travailleur",
  total_monthly_salaries: "Salaires mensuels totaux",
  payments_history: "Historique des paiements",
  recent_worker_payments: "Paiements récents",
  no_payments: "Aucun paiement pour l'instant.",
  menu: "Menu",
  home: "Accueil",
  reports: "Rapports",
  settings: "Paramètres",
  taxes_zakat: "Taxes & Zakat",
  workers_nav: "Travailleurs",
  language: "Langue",
};

const dicts: Record<Lang, Dict> = { en, fr };

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => ls.get<Lang>('gs.lang', 'en'));
  useEffect(() => { ls.set('gs.lang', lang); }, [lang]);

  const t = useMemo(() => (key: string, fallback?: string) => {
    const d = dicts[lang] || en;
    return d[key] ?? fallback ?? key;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within LanguageProvider');
  return ctx;
}
