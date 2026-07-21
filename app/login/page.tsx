"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { STR, DEFAULT_LANG, type Lang } from "@/lib/i18n";

export default function LoginPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const L = STR[lang];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      router.replace("/");
      router.refresh();
    } else {
      setError(true);
      setBusy(false);
    }
  }

  const inp =
    "w-full border border-stone-300 rounded px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cyan-700/30 focus:border-cyan-700";
  const lbl = "block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1";

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4" style={{ fontFamily: "system-ui, sans-serif" }}>
      <form onSubmit={submit} className="bg-white border border-stone-200 rounded-lg shadow-sm w-full max-w-xs p-6">
        <div className="flex items-baseline justify-between mb-1">
          <h1 className="text-lg font-bold tracking-tight text-stone-800">
            {L.loginTitle}<span className="text-cyan-700">.</span>
          </h1>
          <button type="button" onClick={() => setLang(lang === "hr" ? "en" : "hr")}
            className="px-2 py-0.5 text-xs font-bold rounded border border-stone-300 text-stone-600 hover:bg-stone-50">
            {L.langOther}
          </button>
        </div>
        <p className="text-xs text-stone-500 mb-5">{L.loginSubtitle}</p>

        <label className={lbl}>{L.email}</label>
        <input type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} className={inp + " mb-3"} />

        <label className={lbl}>{L.passwordLbl}</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inp} />

        {error && <p className="mt-2 text-xs text-red-700">{L.loginError}</p>}

        <button type="submit" disabled={busy || !email || !password}
          className="mt-4 w-full px-4 py-1.5 text-sm rounded bg-cyan-800 text-white font-medium hover:bg-cyan-900 disabled:opacity-40 disabled:cursor-not-allowed">
          {L.loginButton}
        </button>

        <Link href="/forgot" className="block mt-3 text-center text-xs text-stone-500 hover:underline">
          {L.forgotLink}
        </Link>
        <Link href="/register" className="block mt-2 text-center text-xs text-cyan-800 hover:underline">
          {L.toRegister}
        </Link>
      </form>
    </div>
  );
}
