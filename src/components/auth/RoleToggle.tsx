"use client";

import { Shield, User } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { UserRole } from "@/types";

export function RoleToggle() {
  const { role, setRole } = useApp();
  const isAdmin = role === "ADMIN";

  const toggle = () => {
    setRole(isAdmin ? "USER" : "ADMIN");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ring-1 transition-all ${
        isAdmin
          ? "bg-amber-500/20 text-amber-400 ring-amber-500/40 hover:bg-amber-500/30"
          : "bg-zinc-800 text-zinc-300 ring-zinc-700 hover:bg-zinc-700"
      }`}
      title={isAdmin ? "Kullanıcı moduna geç" : "Admin moda geç"}
    >
      {isAdmin ? (
        <>
          <Shield className="h-4 w-4" />
          <span className="hidden sm:inline">Admin Modu</span>
        </>
      ) : (
        <>
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">Kullanıcı Modu</span>
        </>
      )}
    </button>
  );
}
