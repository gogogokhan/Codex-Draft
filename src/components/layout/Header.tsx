"use client";

import React, { useState } from "react";
import { Users, Settings, LayoutGrid, Shield, Database, Sparkles, LogIn, LogOut, User, Plus } from "lucide-react";
import { useApp } from "@/context/AppContext";
import AuthModal from "@/components/auth/AuthModal";

interface HeaderProps {
  onOpenAddPlayerModal?: () => void;
}

export function Header({ onOpenAddPlayerModal }: HeaderProps) {
  const {
    currentStep, setCurrentStep, isAuthenticated, user, logout, players,
    setWarningMessage, canEditPlayers, draftResult, workspaceMode, activeGroupRole,
  } = useApp();
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const isPool = currentStep === "pool";
  const isBuilder = currentStep === "settings" || currentStep === "attendance" || currentStep === "squad";
  const hasReadyPlayers = players.some((player) => player.ratingStatus !== "pending");
  const isCommunityViewer = workspaceMode === "community" && activeGroupRole === "member";

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Kullanıcı";

  const handleBuilderClick = () => {
    if (!hasReadyPlayers) {
      setCurrentStep("pool");
      setWarningMessage("Maç Kurucusuna geçebilmek ve ayarlara başlamak için önce en az 1 oyuncu eklemelisiniz!");
      return;
    }
    setWarningMessage(null);
    setCurrentStep(currentStep === "pool" ? "settings" : currentStep);
  };

  return (
    <>
      <header className={`sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl ${isAuthenticated ? "lg:pl-60" : ""}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          
          {/* 1. SOL ÜST LOGO */}
          <div className={`flex flex-1 items-center gap-3 ${isAuthenticated ? "pl-11 lg:invisible lg:pl-0" : ""}`}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Shield className="h-5 w-5 fill-cyan-400/20 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-base font-black text-white tracking-wide">Codex Draft</h1>
              <p className="text-[10px] font-medium text-zinc-400">Akıllı Takım Kurucu</p>
            </div>
          </div>

          {/* 2. ANA MOD SEÇİMİ */}
          <div className="flex items-center gap-2 rounded-2xl bg-zinc-900/90 border border-zinc-800 p-1.5 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setWarningMessage(null);
                setCurrentStep("pool");
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
                isPool
                  ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                  : "text-zinc-400 border border-transparent hover:text-zinc-200"
              }`}
            >
              <Database className="h-4 w-4 text-cyan-400" />
              <span>Oyuncu Havuzu</span>
            </button>

            <button
              type="button"
              onClick={handleBuilderClick}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
                isBuilder
                  ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                  : "text-zinc-400 border border-transparent hover:text-zinc-200"
              }`}
            >
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <span>Maç Kurucu</span>
            </button>
          </div>

          {/* 3. SAĞ ALAN */}
          <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
            {onOpenAddPlayerModal && canEditPlayers && isPool && (
              <button
                type="button"
                onClick={onOpenAddPlayerModal}
                className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Oyuncu Ekle</span>
              </button>
            )}

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-xl">
                  <User className="h-3.5 w-3.5" />
                  {displayName}
                </span>
                <button
                  type="button"
                  onClick={logout}
                  className="flex items-center gap-1 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/20 transition cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Çıkış</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:border-zinc-700 hover:text-white transition cursor-pointer"
              >
                <LogIn className="h-3.5 w-3.5 text-cyan-400" />
                <span>Giriş Yap</span>
              </button>
            )}
          </div>

        </div>

        {/* 4. MAÇ KURUCU STEPPER */}
        {isBuilder && (
          <div className="border-t border-zinc-900 bg-zinc-950/60 py-2.5">
            <div className="mx-auto flex max-w-xl items-center justify-center gap-2 sm:gap-3 px-4">
              <button
                type="button"
                onClick={() => {
                  if (!hasReadyPlayers) {
                    setCurrentStep("pool");
                    setWarningMessage("Maç Kurucusuna geçebilmek ve ayarlara başlamak için önce en az 1 oyuncu eklemelisiniz!");
                    return;
                  }
                  setWarningMessage(null);
                  setCurrentStep("settings");
                }}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  currentStep === "settings"
                    ? "bg-cyan-400 text-black font-black shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                    : "text-zinc-400 bg-zinc-900/60 border border-zinc-800 hover:text-zinc-200"
                }`}
              >
                <Settings className="h-3.5 w-3.5" />
                <span>1. Maç Ayarları</span>
              </button>

              <div className={`h-0.5 w-6 sm:w-8 rounded-full ${currentStep !== "settings" ? "bg-cyan-500/60" : "bg-zinc-800"}`} />

              <button
                type="button"
                onClick={() => {
                  if (!hasReadyPlayers) {
                    setCurrentStep("pool");
                    setWarningMessage("Maç Kurucusuna geçebilmek ve ayarlara başlamak için önce en az 1 oyuncu eklemelisiniz!");
                    return;
                  }
                  setWarningMessage(null);
                  setCurrentStep("attendance");
                }}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  currentStep === "attendance"
                    ? "bg-cyan-400 text-black font-black shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                    : "text-zinc-400 bg-zinc-900/60 border border-zinc-800 hover:text-zinc-200"
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>2. Oyuncu Seçimi</span>
              </button>

              <div className={`h-0.5 w-6 sm:w-8 rounded-full ${currentStep === "squad" ? "bg-cyan-500/60" : "bg-zinc-800"}`} />

              <button
                type="button"
                disabled={!draftResult && !isCommunityViewer}
                onClick={() => {
                  if (!draftResult && !isCommunityViewer) return;
                  setWarningMessage(null);
                  setCurrentStep("squad");
                }}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                  currentStep === "squad"
                    ? "cursor-default bg-cyan-400 text-black font-black shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                    : draftResult || isCommunityViewer
                      ? "cursor-pointer border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200"
                      : "cursor-not-allowed border border-zinc-800 bg-zinc-900/40 text-zinc-600"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>3. Kadro & Saha</span>
              </button>
            </div>
          </div>
        )}
      </header>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}
