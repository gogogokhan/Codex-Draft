"use client";

import { useState } from "react";
import { Plus, UsersRound } from "lucide-react";
import { useApp } from "@/context/AppContext";

export function GroupOnboarding() {
  const { createGroup, joinGroup } = useApp();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError(null);
    const result = mode === "create" ? await createGroup(value) : await joinGroup(value);
    if (!result.success) setError(result.error ?? "İşlem tamamlanamadı.");
    setLoading(false);
  };

  return (
    <section className="mx-auto mt-10 max-w-xl rounded-3xl border border-cyan-500/25 bg-gradient-to-br from-[#081a35] via-[#061127] to-[#020617] p-6 shadow-[0_0_35px_rgba(6,182,212,0.12)] sm:p-8">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/40 bg-cyan-400/10 text-cyan-300">
          <UsersRound className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-black text-white">Ortak Oyuncu Havuzunu Kur</h2>
        <p className="mt-2 text-sm text-zinc-400">Yeni bir grup oluştur veya arkadaşından aldığın davet koduyla mevcut gruba katıl.</p>
      </div>

      <div className="mb-5 grid grid-cols-2 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-1">
        <button type="button" onClick={() => { setMode("create"); setError(null); setValue(""); }} className={`rounded-xl px-4 py-2.5 text-xs font-black transition ${mode === "create" ? "bg-cyan-400 text-[#061127]" : "text-zinc-400 hover:text-white"}`}>
          Grup Oluştur
        </button>
        <button type="button" onClick={() => { setMode("join"); setError(null); setValue(""); }} className={`rounded-xl px-4 py-2.5 text-xs font-black transition ${mode === "join" ? "bg-cyan-400 text-[#061127]" : "text-zinc-400 hover:text-white"}`}>
          Gruba Katıl
        </button>
      </div>

      <label className="mb-2 block text-xs font-black uppercase tracking-wider text-cyan-200">
        {mode === "create" ? "Grup Adı" : "Davet Kodu"}
      </label>
      <input
        value={value}
        onChange={(event) => setValue(mode === "join" ? event.target.value.toUpperCase() : event.target.value)}
        onKeyDown={(event) => { if (event.key === "Enter" && value.trim()) submit(); }}
        placeholder={mode === "create" ? "Örn. Salı Akşamı Halı Saha" : "Örn. AB12CD34"}
        className="w-full rounded-xl border border-cyan-500/30 bg-[#040a1b] px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-300"
      />
      {error && <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300">{error}</p>}
      <button
        type="button"
        disabled={loading || !value.trim()}
        onClick={submit}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-black text-[#061127] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus className="h-4 w-4" />
        {loading ? "İşleniyor..." : mode === "create" ? "Grubu Oluştur" : "Gruba Katıl"}
      </button>
    </section>
  );
}
