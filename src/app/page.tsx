"use client";

import { Header } from "@/components/layout/Header";
import { StepNav } from "@/components/layout/StepNav";
import { AttendanceList } from "@/components/match/AttendanceList";
import { TeamConfigPanel } from "@/components/match/TeamConfigPanel";
import { PlayerPool } from "@/components/players/PlayerPool";
import { PitchView } from "@/components/pitch/PitchView";
import { WhatsAppExport } from "@/components/export/WhatsAppExport";
import { useApp } from "@/context/AppContext";

export default function HomePage() {
  const { currentStep } = useApp();

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <StepNav />

        {currentStep === "players" && <PlayerPool />}

        {currentStep === "match" && (
          <div className="space-y-6">
            <AttendanceList />
            <TeamConfigPanel />
          </div>
        )}

        {currentStep === "draft" && (
          <div className="space-y-6">
            <PitchView />
            <WhatsAppExport />
          </div>
        )}
      </main>
    </div>
  );
}
