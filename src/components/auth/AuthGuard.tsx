"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import AuthModal from "@/components/auth/AuthModal";
import { Lock, LogIn } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useApp();
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="relative flex min-h-[70vh] flex-col items-center justify-center p-4 text-center">
      <div className="relative max-w-md w-full overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/90 p-8 backdrop-blur-xl shadow-2xl shadow-cyan-950/30 flex flex-col items-center">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.3)]">
          <Lock className="h-8 w-8 text-cyan-400" />
        </div>

        <h2 className="text-2xl font-black text-white tracking-wide mb-2">
          Erişim Kısıtlandı
        </h2>
        
        <p className="text-xs font-medium text-zinc-400 mb-6 leading-relaxed">
          Codex Draft oyuncu havuzuna ve kadro kurucuya erişebilmek için giriş yapmanız veya yeni bir hesap oluşturmanız gerekmektedir.
        </p>

        <button
          type="button"
          onClick={() => setIsAuthOpen(true)}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-500 py-3.5 text-sm font-bold text-zinc-950 shadow-lg shadow-cyan-500/25 transition-all hover:bg-cyan-400 hover:shadow-cyan-500/40 active:scale-[0.98] cursor-pointer"
        >
          <LogIn className="h-4 w-4 stroke-[2.5]" />
          <span>Giriş Yap / Kayıt Ol</span>
        </button>
      </div>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
}

export default AuthGuard;