"use client";

import { Shield, ShieldAlert } from "lucide-react";
import { useApp } from "@/context/AppContext";

export function RoleToggle() {
  const { isAdmin, setIsAdmin } = useApp();

  return (
    <button
      type="button"
      onClick={() => setIsAdmin(!isAdmin)}
      className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
        isAdmin
          ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-400 shadow-sm shadow-cyan-500/10 hover:bg-cyan-500/20"
          : "border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
      }`}
    >
      {isAdmin ? (
        <>
          <Shield className="h-3.5 w-3.5 fill-cyan-400/20 text-cyan-400" />
          <span>Admin Modu</span>
        </>
      ) : (
        <>
          <ShieldAlert className="h-3.5 w-3.5 text-zinc-500" />
          <span>Kullanıcı Modu</span>
        </>
      )}
    </button>
  );
}