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
    <div className="relative flex h-full flex-col overflow-hidden bg-[linear-gradient(180deg,#071124_0%,#040914_46%,#03060d_100%)]">

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

      <nav className="relative flex-1 overflow-y-auto px-4 py-5 lg:pt-24">
        <button
          type="button"
          onClick={choosePersonal}
          className={`group flex h-11 w-full items-center gap-3 rounded-full px-4 text-left text-[11px] font-bold transition-all duration-200 ${workspaceMode === "personal" && currentStep !== "community" ? "bg-gradient-to-r from-[#1267df] via-[#068fe9] to-[#10d9e7] text-white shadow-[0_8px_24px_rgba(0,145,235,0.28),inset_0_1px_0_rgba(255,255,255,0.25)]" : "text-slate-500 hover:translate-x-1 hover:bg-white/[0.035] hover:text-slate-200"}`}
        >
          <Monitor className={`h-4 w-4 shrink-0 ${workspaceMode === "personal" && currentStep !== "community" ? "text-white" : "text-slate-600 group-hover:text-cyan-300"}`} />
          <span>Kişisel Alan</span>
        </button>

        <button
          type="button"
          onClick={toggleCommunities}
          aria-expanded={communitiesOpen}
          className={`group mt-1 flex h-11 w-full items-center rounded-full px-4 text-left text-[11px] font-bold transition-all duration-200 ${isCommunityActive ? "bg-gradient-to-r from-[#1267df] via-[#068fe9] to-[#10d9e7] text-white shadow-[0_8px_24px_rgba(0,145,235,0.28),inset_0_1px_0_rgba(255,255,255,0.25)]" : "text-slate-500 hover:translate-x-1 hover:bg-white/[0.035] hover:text-slate-200"}`}
        >
          <span className="flex min-w-0 flex-1 items-center gap-3">
            <NotebookTabs className={`h-4 w-4 shrink-0 ${isCommunityActive ? "text-white" : "text-slate-600 group-hover:text-cyan-300"}`} />
            <span>Topluluk</span>
          </span>
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${isCommunityActive ? "text-white" : "text-slate-600 group-hover:text-cyan-300"} ${communitiesOpen ? "rotate-0" : "-rotate-90"}`} />
        </button>

        {communitiesOpen && <div className="mt-1 pl-3">
          {groups.map((group) => {
            const isActive = workspaceMode === "community" && activeGroup?.id === group.id;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => chooseCommunity(group.id)}
                className={`group/community flex min-h-9 w-full items-center gap-3 rounded-full px-3 py-2 text-left transition-all duration-200 ${isActive ? "text-cyan-300" : "text-slate-600 hover:translate-x-1 hover:text-slate-200"}`}
              >
                <CircleDot className={`h-3 w-3 shrink-0 transition-colors ${isActive ? "fill-cyan-300/25 text-cyan-300" : "text-slate-700 group-hover/community:text-cyan-400"}`} />
                <span className="truncate text-[10px] font-bold uppercase tracking-wide">{group.name}</span>
              </button>
            );
          })}
          {groups.length === 0 && <p className="px-3 py-4 text-center text-[10px] font-bold text-slate-600">Henüz topluluk yok</p>}
        </div>}
      </nav>
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
