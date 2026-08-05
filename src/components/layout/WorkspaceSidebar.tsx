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
    <div className="flex h-full flex-col bg-[#05070b]">
      <div className="flex h-[72px] items-center gap-3 border-b border-white/10 px-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-500/35 bg-cyan-500/10 text-cyan-300 shadow-[0_0_18px_rgba(6,182,212,0.2)]">
          <Shield className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-black tracking-wide text-white">Codex Draft</p>
          <p className="text-[10px] font-bold text-zinc-500">Akıllı Takım Kurucu</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 lg:pt-[18vh]">
        <button
          type="button"
          onClick={choosePersonal}
          className={`flex h-12 w-full items-center gap-4 border-l-2 px-3 text-left text-sm font-black uppercase tracking-wide transition-all duration-200 ${workspaceMode === "personal" && currentStep !== "community" ? "border-cyan-300 bg-gradient-to-r from-[#173746] to-[#0a1d2c] text-white shadow-[inset_0_0_22px_rgba(0,210,255,0.12),0_0_16px_rgba(0,210,255,0.08)]" : "border-transparent text-zinc-300 hover:border-cyan-400/70 hover:bg-gradient-to-r hover:from-[#102d3c] hover:to-[#081724] hover:text-cyan-100 hover:shadow-[inset_0_0_18px_rgba(0,210,255,0.1)]"}`}
        >
          <Monitor className="h-4 w-4 shrink-0 text-cyan-200" />
          <span>Kişisel Alan</span>
        </button>

        <button
          type="button"
          onClick={toggleCommunities}
          aria-expanded={communitiesOpen}
          className={`flex h-11 w-full items-center border-l-2 px-3 text-left text-sm font-black uppercase tracking-wide transition-all duration-200 ${isCommunityActive ? "border-cyan-300 bg-gradient-to-r from-[#173746] to-[#0a1d2c] text-white shadow-[inset_0_0_22px_rgba(0,210,255,0.12),0_0_16px_rgba(0,210,255,0.08)]" : "border-transparent text-zinc-300 hover:border-cyan-400/70 hover:bg-gradient-to-r hover:from-[#102d3c] hover:to-[#081724] hover:text-cyan-100 hover:shadow-[inset_0_0_18px_rgba(0,210,255,0.1)]"}`}
        >
          <span className="flex min-w-0 flex-1 items-center gap-4">
            <NotebookTabs className="h-4 w-4 shrink-0 text-cyan-100" />
            <span>Topluluk</span>
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-cyan-100 transition-transform ${communitiesOpen ? "rotate-0" : "-rotate-90"}`} />
        </button>

        {communitiesOpen && <div className="bg-[#20343c] py-1">
          {groups.map((group) => {
            const isActive = workspaceMode === "community" && activeGroup?.id === group.id;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => chooseCommunity(group.id)}
                className={`flex min-h-8 w-full items-center gap-4 border-l-2 py-1.5 pl-5 pr-3 text-left transition-all ${isActive ? "border-cyan-200 bg-gradient-to-r from-cyan-400/20 to-cyan-950/20 text-white shadow-[inset_0_0_16px_rgba(0,210,255,0.1)]" : "border-transparent text-zinc-100 hover:border-cyan-400/60 hover:bg-cyan-400/10 hover:text-cyan-100"}`}
              >
                <CircleDot className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-cyan-200" : "text-cyan-400/65"}`} />
                <span className="truncate text-xs font-black uppercase tracking-wide">{group.name}</span>
              </button>
            );
          })}
          {groups.length === 0 && <p className="px-12 py-3 text-xs font-bold text-zinc-500">Henüz topluluk yok</p>}
        </div>}
      </nav>
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
