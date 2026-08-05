"use client";

import { useState } from "react";
import { ChevronDown, CircleDot, Menu, Monitor, NotebookTabs, Shield, X } from "lucide-react";
import { useApp } from "@/context/AppContext";

export function WorkspaceSidebar() {
  const {
    groups,
    activeGroup,
    workspaceMode,
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

  const openCommunityManagement = () => {
    setCurrentStep("community");
    setMobileOpen(false);
  };

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

      <nav className="flex-1 overflow-y-auto py-2">
        <button
          type="button"
          onClick={choosePersonal}
          className={`flex h-12 w-full items-center gap-4 border-l-2 px-3 text-left text-sm font-black uppercase tracking-wide transition ${workspaceMode === "personal" ? "border-cyan-400 bg-[#1b3039] text-white" : "border-transparent text-zinc-300 hover:bg-white/5 hover:text-white"}`}
        >
          <Monitor className="h-4 w-4 shrink-0 text-cyan-200" />
          <span>Kişisel Alan</span>
        </button>

        <div className={`flex h-11 border-l-2 transition ${workspaceMode === "community" ? "border-cyan-400 bg-[#17282f]" : "border-transparent hover:bg-white/5"}`}>
          <button
            type="button"
            onClick={openCommunityManagement}
            className="flex min-w-0 flex-1 items-center gap-4 px-3 text-left text-sm font-black uppercase tracking-wide text-white"
          >
            <NotebookTabs className="h-4 w-4 shrink-0 text-cyan-100" />
            <span>Topluluk</span>
          </button>
          <button
            type="button"
            onClick={() => setCommunitiesOpen((open) => !open)}
            className="flex w-11 items-center justify-center text-cyan-100 transition hover:bg-white/5"
            aria-label={communitiesOpen ? "Topluluk listesini kapat" : "Topluluk listesini aç"}
            aria-expanded={communitiesOpen}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${communitiesOpen ? "rotate-0" : "-rotate-90"}`} />
          </button>
        </div>

        {communitiesOpen && <div className="bg-[#20343c] py-1">
          {groups.map((group) => {
            const isActive = workspaceMode === "community" && activeGroup?.id === group.id;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => chooseCommunity(group.id)}
                className={`flex min-h-8 w-full items-center gap-4 border-l-2 py-1.5 pl-5 pr-3 text-left transition ${isActive ? "border-cyan-300 bg-cyan-300/10 text-white" : "border-transparent text-zinc-100 hover:bg-white/5"}`}
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
