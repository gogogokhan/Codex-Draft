"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { PlayerPool } from "@/components/players/PlayerPool";
import { TeamConfigPanel } from "@/components/match/TeamConfigPanel";
import { AttendanceList } from "@/components/match/AttendanceList";
import { PitchView } from "@/components/pitch/PitchView";
import { WhatsAppExport } from "@/components/export/WhatsAppExport";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { PlayerModal } from "@/components/players/PlayerModal";
import { useApp } from "@/context/AppContext";
import { CommunityHub } from "@/components/community/CommunityHub";
import { WorkspaceSidebar } from "@/components/layout/WorkspaceSidebar";

export default function HomePage() {
  const {
    currentStep, setCurrentStep, players, addPlayer, updatePlayer, deletePlayer, deletePlayers,
    canEditPlayers, canManageMatch, workspaceMode, activeGroup, isAuthenticated,
  } = useApp();
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<any>(null);
  const [communityInitialView, setCommunityInitialView] = useState<"communities" | "settings">("communities");
  const [communityNavigationKey, setCommunityNavigationKey] = useState(0);
  const isWideContentPage =
    currentStep === "pool" || currentStep === "community" || currentStep === "attendance";
  const isCommunityReadOnly = workspaceMode === "community" && !canEditPlayers;

  const openCommunities = () => {
    setCommunityInitialView("communities");
    setCommunityNavigationKey((key) => key + 1);
    setCurrentStep("community");
  };

  const openCommunitySettings = () => {
    setCommunityInitialView("settings");
    setCommunityNavigationKey((key) => key + 1);
    setCurrentStep("community");
  };

  const handleOpenAddModal = () => {
    setEditingPlayer(null);
    setIsAddPlayerModalOpen(true);
  };

  const handleOpenEditModal = (player: any) => {
    setEditingPlayer(player);
    setIsAddPlayerModalOpen(true);
  };

  const handleSavePlayer = async (playerData: any) => {
    if (editingPlayer) {
      if (updatePlayer) await updatePlayer(playerData);
    } else {
      if (addPlayer) await addPlayer(playerData);
    }
    setIsAddPlayerModalOpen(false);
    setEditingPlayer(null);
  };

  const handleClearAllPlayers = async () => {
    await deletePlayers(players.map((player) => player.id));
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <WorkspaceSidebar onOpenCommunities={openCommunities} />
      <Header />

      <div className={isAuthenticated ? "lg:pl-72" : ""}>
      <main className={`px-4 py-6 sm:px-6 sm:py-8 ${
        currentStep === "squad"
          ? "mx-auto max-w-[1800px]"
          : isWideContentPage
            ? "w-full max-w-none lg:px-14"
            : "mx-auto max-w-7xl"
      }`}>
        <AuthGuard>
          {currentStep === "community" ? (
            <CommunityHub key={communityNavigationKey} initialView={communityInitialView} />
          ) : (
          <>
          {/* OYUNCU HAVUZU */}
          {currentStep === "pool" && (
            <PlayerPool
              players={players}
              title={workspaceMode === "community" && activeGroup ? `${activeGroup.name} Oyuncu Havuzu` : "Oyuncu Havuzu"}
              onAddPlayerClick={canEditPlayers ? handleOpenAddModal : undefined}
              onEditPlayer={canEditPlayers || isCommunityReadOnly ? handleOpenEditModal : undefined}
              onDeletePlayer={canEditPlayers ? deletePlayer : undefined}
              onDeletePlayers={canEditPlayers ? deletePlayers : undefined}
              onClearAllPlayers={canEditPlayers ? handleClearAllPlayers : undefined}
              onOpenCommunitySettings={workspaceMode === "community" && activeGroup ? openCommunitySettings : undefined}
            />
          )}

          {/* MAÇ KURUCU - 1. ADIM: Maç Ayarları */}
          {currentStep === "settings" && <TeamConfigPanel />}

          {/* MAÇ KURUCU - 2. ADIM: Oyuncu Seçimi (Yoklama) */}
          {currentStep === "attendance" && (
            <AttendanceList onPlayerClick={isCommunityReadOnly ? handleOpenEditModal : undefined} />
          )}

          {/* MAÇ KURUCU - 3. ADIM: Kadro & Saha + WhatsApp Dışa Aktar */}
          {currentStep === "squad" && (
            <div className="space-y-6">
              <PitchView onPlayerClick={handleOpenEditModal} />
              <WhatsAppExport />
            </div>
          )}
          </>
          )}
        </AuthGuard>
      </main>
      </div>

      {/* OYUNCU EKLEME / DÜZENLEME MODALI */}
      <PlayerModal
        isOpen={isAddPlayerModalOpen && (canEditPlayers || isCommunityReadOnly)}
        initialPlayer={editingPlayer}
        onSave={canEditPlayers ? handleSavePlayer : undefined}
        readOnly={isCommunityReadOnly}
        onClose={() => {
          setIsAddPlayerModalOpen(false);
          setEditingPlayer(null);
        }}
      />
    </div>
  );
}
