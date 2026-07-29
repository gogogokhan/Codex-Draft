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

export default function HomePage() {
  const { currentStep, players, addPlayer, updatePlayer, deletePlayer } = useApp();
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
    for (const player of players) {
      await deletePlayer(player.id);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header onOpenAddPlayerModal={handleOpenAddModal} />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <AuthGuard>
          {/* OYUNCU HAVUZU */}
          {currentStep === "pool" && (
            <PlayerPool
              players={players}
              onAddPlayerClick={handleOpenAddModal}
              onEditPlayer={handleOpenEditModal}
              onDeletePlayer={deletePlayer}
              onClearAllPlayers={handleClearAllPlayers}
            />
          )}

          {/* MAÇ KURUCU - 1. ADIM: Maç Ayarları */}
          {currentStep === "settings" && <TeamConfigPanel />}

          {/* MAÇ KURUCU - 2. ADIM: Oyuncu Seçimi (Yoklama) */}
          {currentStep === "attendance" && <AttendanceList />}

          {/* MAÇ KURUCU - 3. ADIM: Kadro & Saha + WhatsApp Dışa Aktar */}
          {currentStep === "squad" && (
            <div className="space-y-6">
              <PitchView />
              <WhatsAppExport />
            </div>
          )}
        </AuthGuard>
      </main>

      {/* OYUNCU EKLEME / DÜZENLEME MODALI */}
      <PlayerModal
        isOpen={isAddPlayerModalOpen}
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