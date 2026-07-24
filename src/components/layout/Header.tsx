"use client";

import { Shield, ShieldCheck } from "lucide-react";
import { RoleToggle } from "@/components/auth/RoleToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 ring-1 ring-emerald-500/40">
            <Shield className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white sm:text-xl">
              Codex Draft
            </h1>
            <p className="hidden text-xs text-zinc-500 sm:block">
              Akıllı Takım Kurucu
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-1.5 text-xs text-zinc-500 sm:flex">
            <ShieldCheck className="h-3.5 w-3.5" />
            EA FC Konsept
          </div>
          <RoleToggle />
        </div>
      </div>
    </header>
  );
}
