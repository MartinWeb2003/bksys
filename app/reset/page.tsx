"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { STR, DEFAULT_LANG, type Lang } from "@/lib/i18n";

function ResetInner() {
  const token = useSearchParams().get("token") ?? "";
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG);
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const L = STR[lang];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    if (res.ok) {
      setDone(true);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error === "invalid_token" ? L.resetInvalid : data.message || L.resetInvalid);
      setBusy(false);
    }
  }

  const inp =
    "w-full border border-stone-300 rounded px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cyan-700/30 focus:border-cyan-700";
  const lbl = "block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1";

  return (
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
      <p className="text-xs text-stone-500 mb-5">{L.resetSubtitle}</p>

      {done ? (
        <p className="text-sm text-teal-700">{L.resetSuccess}</p>
      ) : !token ? (
        <p className="text-sm text-red-700">{L.resetInvalid}</p>
      ) : (
        <>
          <label className={lbl}>{L.newPasswordLbl}</label>
          <input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} className={inp} />
          {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
          <button type="submit" disabled={busy || password.length < 8}
            className="mt-4 w-full px-4 py-1.5 text-sm rounded bg-cyan-800 text-white font-medium hover:bg-cyan-900 disabled:opacity-40 disabled:cursor-not-allowed">
            {L.resetButton}
          </button>
        </>
      )}

      <Link href="/login" className="block mt-3 text-center text-xs text-cyan-800 hover:underline">
        {L.toLogin}
      </Link>
    </form>
  );
}

export default function ResetPage() {
  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4" style={{ fontFamily: "system-ui, sans-serif" }}>
      <Suspense fallback={null}>
        <ResetInner />
      </Suspense>
    </div>
  );
}
