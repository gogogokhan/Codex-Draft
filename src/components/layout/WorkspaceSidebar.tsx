"use client";

import { useState } from "react";
import { ChevronDown, CircleDot, Menu, Monitor, NotebookTabs, Shield, X } from "lucide-react";
import { useApp } from "@/context/AppContext";

interface WorkspaceSidebarProps {
  onOpenCommunities: () => void;
}

export function WorkspaceSidebar({ onOpenCommunities }: WorkspaceSidebarProps) {
  const {
    groups,
    activeGroup,
    workspaceMode,
    currentStep,
    isAuthenticated,
    selectPersonalWorkspace,
    selectGroup,
    setCurrentStep,
  } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [communitiesOpen, setCommunitiesOpen] = useState(true);

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

  const toggleCommunities = () => {
    setCommunitiesOpen((open) => !open);
    onOpenCommunities();
  };

  const isCommunityActive = currentStep === "community" || workspaceMode === "community";

  const content = (
    <div className="relative flex h-full flex-col overflow-hidden bg-[linear-gradient(165deg,#071025_0%,#030712_48%,#02040a_100%)]">
      <div className="pointer-events-none absolute -left-24 top-20 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-16 h-56 w-56 rounded-full bg-cyan-500/5 blur-3xl" />

      <div className="relative flex h-[82px] items-center gap-3 border-b border-blue-400/10 px-4">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/35 bg-gradient-to-br from-cyan-400/20 via-blue-600/15 to-[#071126] text-cyan-200 shadow-[inset_0_0_16px_rgba(34,211,238,0.12),0_0_22px_rgba(2,56,214,0.25)]">
          <div className="absolute inset-1 rounded-xl border border-white/5" />
          <Shield className="relative h-5 w-5 fill-cyan-300/10" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-black tracking-wide text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.14)]">Codex Draft</p>
          <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.15em] text-cyan-200/45">Akıllı Takım Kurucu</p>
        </div>
      </div>

      <nav className="relative flex-1 overflow-y-auto px-3 py-5 lg:pt-[17vh]">
        <p className="mb-3 px-2 text-[9px] font-black uppercase tracking-[0.24em] text-blue-200/35">Çalışma Alanı</p>
        <button
          type="button"
          onClick={choosePersonal}
          className={`group flex h-14 w-full items-center gap-3 rounded-2xl border px-2.5 text-left text-xs font-black uppercase tracking-wide transition-all duration-200 ${workspaceMode === "personal" && currentStep !== "community" ? "translate-x-0 border-blue-400/45 bg-gradient-to-r from-[#123ba0]/65 via-[#0b2d73]/55 to-[#071632] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_28px_rgba(2,56,214,0.24),0_0_20px_rgba(34,211,238,0.08)]" : "border-transparent bg-white/[0.025] text-slate-400 hover:translate-x-1 hover:border-blue-400/30 hover:bg-gradient-to-r hover:from-blue-600/20 hover:to-cyan-500/5 hover:text-white hover:shadow-[0_8px_24px_rgba(2,56,214,0.14)]"}`}
        >
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all ${workspaceMode === "personal" && currentStep !== "community" ? "border-cyan-300/45 bg-cyan-300/15 text-cyan-100 shadow-[0_0_15px_rgba(34,211,238,0.2)]" : "border-blue-300/10 bg-blue-950/50 text-blue-200/60 group-hover:border-cyan-300/30 group-hover:text-cyan-100"}`}><Monitor className="h-4 w-4" /></span>
          <span>Kişisel Alan</span>
        </button>

        <button
          type="button"
          onClick={toggleCommunities}
          aria-expanded={communitiesOpen}
          className={`group mt-2 flex h-14 w-full items-center rounded-2xl border px-2.5 text-left text-xs font-black uppercase tracking-wide transition-all duration-200 ${isCommunityActive ? "border-blue-400/45 bg-gradient-to-r from-[#123ba0]/65 via-[#0b2d73]/55 to-[#071632] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_28px_rgba(2,56,214,0.24),0_0_20px_rgba(34,211,238,0.08)]" : "border-transparent bg-white/[0.025] text-slate-400 hover:translate-x-1 hover:border-blue-400/30 hover:bg-gradient-to-r hover:from-blue-600/20 hover:to-cyan-500/5 hover:text-white hover:shadow-[0_8px_24px_rgba(2,56,214,0.14)]"}`}
        >
          <span className="flex min-w-0 flex-1 items-center gap-3">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all ${isCommunityActive ? "border-cyan-300/45 bg-cyan-300/15 text-cyan-100 shadow-[0_0_15px_rgba(34,211,238,0.2)]" : "border-blue-300/10 bg-blue-950/50 text-blue-200/60 group-hover:border-cyan-300/30 group-hover:text-cyan-100"}`}><NotebookTabs className="h-4 w-4" /></span>
            <span>Topluluk</span>
          </span>
          <span className="mr-1 flex h-6 w-6 items-center justify-center rounded-lg bg-black/15 text-cyan-100/70"><ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${communitiesOpen ? "rotate-0" : "-rotate-90"}`} /></span>
        </button>

        {communitiesOpen && <div className="mx-2 mt-2 overflow-hidden rounded-xl border border-blue-400/10 bg-[#050c1b]/80 p-1.5 shadow-inner">
          {groups.map((group) => {
            const isActive = workspaceMode === "community" && activeGroup?.id === group.id;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => chooseCommunity(group.id)}
                className={`group/community flex min-h-9 w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-all ${isActive ? "bg-gradient-to-r from-blue-600/30 to-cyan-400/10 text-white shadow-[inset_2px_0_0_#67e8f9]" : "text-slate-400 hover:bg-blue-500/10 hover:text-cyan-100"}`}
              >
                <CircleDot className={`h-3 w-3 shrink-0 transition-colors ${isActive ? "text-cyan-200" : "text-blue-300/35 group-hover/community:text-cyan-300"}`} />
                <span className="truncate text-[11px] font-black uppercase tracking-wide">{group.name}</span>
              </button>
            );
          })}
          {groups.length === 0 && <p className="px-3 py-4 text-center text-[10px] font-bold text-slate-600">Henüz topluluk yok</p>}
        </div>}
      </nav>

      <div className="relative mx-4 mb-4 rounded-2xl border border-blue-400/10 bg-gradient-to-r from-blue-950/35 to-cyan-950/15 px-3 py-2.5">
        <div className="flex items-center gap-2.5"><span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_10px_#67e8f9]" /><div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-200/40">Aktif Alan</p><p className="mt-0.5 max-w-[165px] truncate text-[11px] font-black text-slate-200">{workspaceMode === "community" && activeGroup ? activeGroup.name : "Kişisel Alan"}</p></div></div>
      </div>
    </div>
  );

  return (
    <>
      <button type="button" onClick={() => setMobileOpen(true)} className="fixed left-3 top-3 z-[70] flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/30 bg-[#061127] text-cyan-300 shadow-lg lg:hidden" aria-label="Çalışma alanı menüsünü aç">
        <Menu className="h-5 w-5" />
      </button>

      <aside className="fixed inset-y-0 left-0 z-[60] hidden w-60 border-r border-blue-400/15 shadow-[12px_0_40px_rgba(0,0,0,0.28)] lg:block">{content}</aside>

      {mobileOpen && <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm lg:hidden" onMouseDown={() => setMobileOpen(false)}>
        <aside className="relative h-full w-[min(86vw,300px)] border-r border-cyan-500/20 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
          {content}
          <button type="button" onClick={() => setMobileOpen(false)} className="absolute right-3 top-4 rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white" aria-label="Menüyü kapat"><X className="h-5 w-5" /></button>
        </aside>
      </div>}
    </>
  );
}
