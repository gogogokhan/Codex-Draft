"use client";

import React, { useState } from "react";
import { CheckSquare, Square, Users, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { PlayerCard } from "@/components/players/PlayerCard";
import { useApp } from "@/context/AppContext";

export function AttendanceList() {
  const {
    players,
    attendance = [],
    toggleAttendance,
    clearAttendance,
    teamConfig,
    isAdmin,
    setActiveTab,
  } = useApp();

  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const teamSize = teamConfig?.teamSize || 0;
  const required = teamSize ? teamSize * 2 : 0;
  const isEnough = teamSize ? attendance.length === required : false;
  const missingCount = teamSize ? required - attendance.length : 0;

  const handlePlayerClick = (playerId: string) => {
    if (!teamSize) {
      setWarningMessage("Lütfen önce sayfanın altından Takım Boyutunu (5v5, 6v6...) seçiniz!");
      setTimeout(() => setWarningMessage(null), 4000);
      return;
    }

    const isSelected = attendance.includes(playerId);

    if (!isSelected && attendance.length >= required) {
      setWarningMessage(
        `Maksimum ${required} oyuncu seçebilirsiniz! Başka birini eklemek için önce listeden birini çıkarın.`
      );
      setTimeout(() => setWarningMessage(null), 4000);
      return;
    }

    setWarningMessage(null);
    toggleAttendance(playerId);
  };

  const handleSelectTopN = () => {
    if (!teamSize) {
      setWarningMessage("Lütfen önce sayfanın altından Takım Boyutunu (5v5, 6v6...) seçiniz!");
      setTimeout(() => setWarningMessage(null), 4000);
      return;
    }
    setWarningMessage(null);
    clearAttendance();

    const topPlayers = players.slice(0, required);
    topPlayers.forEach((player: any) => {
      toggleAttendance(player.id);
    });
  };

  const handleGenerateTeams = () => {
    if (!isEnough) return;
    if (setActiveTab) setActiveTab("squad");
  };

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold text-white">
            <Users className="h-5 w-5 text-cyan-400" />
            Yoklama Listesi
          </h3>
          <p className="mt-1 text-sm text-zinc-400">
            Bu hafta maça gelecek oyuncuları seçin
          </p>
        </div>

        {isAdmin && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSelectTopN}
              className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/40 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/60 transition"
            >
              <CheckSquare className="h-3.5 w-3.5 text-cyan-400" />
              İlk {required || "?"}'i Seç {teamSize ? `(${teamSize}v${teamSize})` : ""}
            </button>

            <button
              type="button"
              onClick={() => {
                setWarningMessage(null);
                clearAttendance();
              }}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-red-400 transition"
            >
              <Square className="h-3.5 w-3.5" />
              Temizle
            </button>
          </div>
        )}
      </div>

      {warningMessage && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-amber-500/15 border border-amber-500/40 px-4 py-2.5 text-xs font-bold text-amber-300 animate-pulse">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
          <span>{warningMessage}</span>
        </div>
      )}

      {/* TOTY MAVİSİ - KIRMIZI DURUM ÇUBUĞU */}
      <div
        className={`mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl p-3.5 text-sm font-semibold transition-all duration-300 ${
          isEnough
            ? "bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-500/30"
            : "bg-red-500/10 text-red-400 ring-1 ring-red-500/30"
        }`}
      >
        <div className="flex items-center gap-3">
          <div>
            Seçili: <strong className="text-base font-black">{attendance.length}</strong> / Gerekli:{" "}
            <strong className="text-base font-black">{required || "?"}</strong> {teamSize ? `(${teamSize}v${teamSize})` : "(Seçilmedi)"}
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-xs font-bold pl-3 border-l border-zinc-700/50">
            {isEnough ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                <span>Kadro Tamam!</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <span>
                  {!teamSize
                    ? "Takım Boyutu Seçiniz"
                    : missingCount > 0
                    ? `${missingCount} Oyuncu Eksik`
                    : "Kadro Sınırı Aşıldı!"}
                </span>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          disabled={!isEnough}
          onClick={handleGenerateTeams}
          className={`flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-300 ${
            isEnough
              ? "bg-cyan-400 hover:bg-cyan-300 text-black shadow-[0_0_20px_rgba(6,182,212,0.5)] cursor-pointer scale-100 hover:scale-105 active:scale-95"
              : "bg-zinc-800 text-zinc-500 border border-zinc-700/60 cursor-not-allowed opacity-60"
          }`}
        >
          <span>Takımları Oluştur</span>
          <ArrowRight className={`h-4 w-4 ${isEnough ? "text-black" : "text-zinc-500"}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {players.map((player: any) => (
          <PlayerCard
            key={player.id}
            player={player}
            isAdmin={isAdmin}
            selectable={isAdmin}
            selected={attendance.includes(player.id)}
            onClick={() => handlePlayerClick(player.id)}
          />
        ))}
      </div>
    </section>
  );
}