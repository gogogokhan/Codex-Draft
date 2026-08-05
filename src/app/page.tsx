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
    currentStep, players, addPlayer, updatePlayer, deletePlayer, deletePlayers,
    canEditPlayers, canManageMatch, workspaceMode, activeGroup, isAuthenticated,
  } = useApp();
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<any>(null);

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
      <WorkspaceSidebar />
      <Header onOpenAddPlayerModal={handleOpenAddModal} />

      <div className={isAuthenticated ? "lg:pl-60" : ""}>
      <main className={`mx-auto px-4 py-6 sm:px-6 sm:py-8 ${currentStep === "squad" ? "max-w-[1800px]" : "max-w-7xl"}`}>
        <AuthGuard>
          {currentStep === "community" ? (
            <CommunityHub />
          ) : (
          <>
          {/* OYUNCU HAVUZU */}
          {currentStep === "pool" && (
            <PlayerPool
              players={players}
              title={workspaceMode === "community" && activeGroup ? `${activeGroup.name} Oyuncu Havuzu` : "Oyuncu Havuzu"}
              onAddPlayerClick={canEditPlayers ? handleOpenAddModal : undefined}
              onEditPlayer={canEditPlayers ? handleOpenEditModal : undefined}
              onDeletePlayer={canEditPlayers ? deletePlayer : undefined}
              onDeletePlayers={canEditPlayers ? deletePlayers : undefined}
              onClearAllPlayers={canEditPlayers ? handleClearAllPlayers : undefined}
            />
          )}

          {/* MAÇ KURUCU - 1. ADIM: Maç Ayarları */}
          {currentStep === "settings" && <TeamConfigPanel />}

          {/* MAÇ KURUCU - 2. ADIM: Oyuncu Seçimi (Yoklama) */}
          {currentStep === "attendance" && <AttendanceList />}

          {/* MAÇ KURUCU - 3. ADIM: Kadro & Saha + WhatsApp Dışa Aktar */}
          {currentStep === "squad" && (
            <div className="space-y-6">
              <PitchView onPlayerClick={canManageMatch ? handleOpenEditModal : undefined} />
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
        isOpen={isAddPlayerModalOpen && canEditPlayers}
        initialPlayer={editingPlayer}
        onSave={handleSavePlayer}
        onClose={() => {
          setIsAddPlayerModalOpen(false);
          setEditingPlayer(null);
        }}
      />
    </div>
  );
}
