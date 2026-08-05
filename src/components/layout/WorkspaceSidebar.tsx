"use client";

import { useState } from "react";
import { Check, ChevronRight, Database, Menu, Plus, Shield, UserRound, UsersRound, X } from "lucide-react";
import { useApp } from "@/context/AppContext";

export function WorkspaceSidebar() {
  const {
    groups,
    activeGroup,
    activeGroupRole,
    workspaceMode,
    isAuthenticated,
    selectPersonalWorkspace,
    selectGroup,
    setCurrentStep,
  } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!isAuthenticated) return null;

  const choosePersonal = () => {
    selectPersonalWorkspace();
    setMobileOpen(false);
  };

  const chooseCommunity = (groupId: string) => {
    selectGroup(groupId);
    setCurrentStep("pool");
    setMobileOpen(false);
  };

  const openCommunityManagement = () => {
    setCurrentStep("community");
    setMobileOpen(false);
  };

  const roleLabel = activeGroupRole === "owner"
    ? "Kurucu Admin"
    : activeGroupRole === "admin"
      ? "Admin"
      : activeGroupRole === "editor"
        ? "Moderatör"
        : "Üye";

  const content = (
    <div className="flex h-full flex-col bg-[#030711]">
      <div className="flex h-[72px] items-center gap-3 border-b border-white/10 px-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-500/35 bg-cyan-500/10 text-cyan-300 shadow-[0_0_18px_rgba(6,182,212,0.2)]">
          <Shield className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-black tracking-wide text-white">Codex Draft</p>
          <p className="text-[10px] font-bold text-zinc-500">Akıllı Takım Kurucu</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-5">
        <p className="px-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Çalışma Alanı</p>

        <button
          type="button"
          onClick={choosePersonal}
          className={`mt-3 flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left transition ${workspaceMode === "personal" ? "border-cyan-400/45 bg-cyan-400/15 text-cyan-100 shadow-[0_0_16px_rgba(6,182,212,0.12)]" : "border-transparent text-zinc-400 hover:border-zinc-800 hover:bg-white/5 hover:text-white"}`}
        >
          <span className="flex items-center gap-3 text-sm font-black"><UserRound className="h-4 w-4" /> Kişisel Alan</span>
          {workspaceMode === "personal" && <Check className="h-4 w-4 text-cyan-300" />}
        </button>

        <div className="mt-6 flex items-center justify-between px-3">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Topluluklar</p>
          <button type="button" onClick={openCommunityManagement} title="Topluluk Yönetimi" className="rounded-lg p-1 text-violet-300 hover:bg-violet-400/10"><Plus className="h-4 w-4" /></button>
        </div>

        <div className="mt-2 space-y-1.5">
          {groups.map((group) => {
            const isActive = workspaceMode === "community" && activeGroup?.id === group.id;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => chooseCommunity(group.id)}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left transition ${isActive ? "border-violet-400/45 bg-violet-400/15 text-violet-100 shadow-[0_0_16px_rgba(139,92,246,0.12)]" : "border-transparent text-zinc-400 hover:border-zinc-800 hover:bg-white/5 hover:text-white"}`}
              >
                <span className="flex min-w-0 items-center gap-3"><UsersRound className="h-4 w-4 shrink-0" /><span className="min-w-0"><span className="block truncate text-sm font-black">{group.name}</span>{isActive && <span className="mt-0.5 block text-[9px] font-black uppercase tracking-wider text-violet-300">{roleLabel}</span>}</span></span>
                {isActive ? <Check className="h-4 w-4 shrink-0 text-violet-300" /> : <ChevronRight className="h-4 w-4 shrink-0 text-zinc-700" />}
              </button>
            );
          })}
          {groups.length === 0 && <p className="rounded-xl border border-dashed border-zinc-800 px-3 py-4 text-center text-xs text-zinc-600">Henüz topluluk yok</p>}
        </div>

        <button type="button" onClick={openCommunityManagement} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-violet-400/25 bg-violet-400/10 px-3 py-2.5 text-xs font-black text-violet-200 transition hover:bg-violet-400/20">
          <Database className="h-4 w-4" /> Topluluk Yönetimi
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button type="button" onClick={() => setMobileOpen(true)} className="fixed left-3 top-3 z-[70] flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/30 bg-[#061127] text-cyan-300 shadow-lg lg:hidden" aria-label="Çalışma alanı menüsünü aç">
        <Menu className="h-5 w-5" />
      </button>

      <aside className="fixed inset-y-0 left-0 z-[60] hidden w-60 border-r border-white/10 lg:block">{content}</aside>

      {mobileOpen && <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm lg:hidden" onMouseDown={() => setMobileOpen(false)}>
        <aside className="relative h-full w-[min(86vw,300px)] border-r border-cyan-500/20 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
          {content}
          <button type="button" onClick={() => setMobileOpen(false)} className="absolute right-3 top-4 rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white" aria-label="Menüyü kapat"><X className="h-5 w-5" /></button>
        </aside>
      </div>}
    </>
  );
}
