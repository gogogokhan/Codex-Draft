"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { PlayerPool } from "@/components/players/PlayerPool";
import { TeamConfigPanel } from "@/components/match/TeamConfigPanel";
import { AttendanceList } from "@/components/match/AttendanceList";
import { PitchView } from "@/components/pitch/PitchView";
import { WhatsAppExport } from "@/components/export/WhatsAppExport";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { PlayerModal } from "@/components/players/PlayerModal"; // <-- Burası PlayerModal olarak düzeltildi
import { useApp } from "@/context/AppContext";

export default function HomePage() {
  const { currentStep } = useApp();
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header onOpenAddPlayerModal={() => setIsAddPlayerModalOpen(true)} />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <AuthGuard>
          {/* OYUNCU HAVUZU */}
          {currentStep === "pool" && <PlayerPool />}

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
        onClose={() => setIsAddPlayerModalOpen(false)}
      />
    </div>
  );
}