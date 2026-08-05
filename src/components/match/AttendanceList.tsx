"use client";

import React, { useState } from "react";
import {
  Users,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Zap,
  Shield,
  Shuffle,
} from "lucide-react";
import { PlayerCard } from "@/components/players/PlayerCard";
import { useApp } from "@/context/AppContext";
import { analyzeFormationCompatibility } from "@/lib/draftEngine";
import { POSITION_LABELS } from "@/lib/positions";

export function AttendanceList() {
  const {
    players,
    attendance = [],
    toggleAttendance,
    setAttendanceSelection,
    teamConfig,
    setActiveTab,
    draftMode,
    setDraftMode,
    draftResult,
    generateDraft,
    canManageMatch,
  } = useApp();

  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [requiresFormationConfirmation, setRequiresFormationConfirmation] = useState(false);
  const [hasBlockingFormationIssue, setHasBlockingFormationIssue] = useState(false);
  const [isRegenerateConfirmOpen, setIsRegenerateConfirmOpen] = useState(false);

  const teamSize = teamConfig?.teamSize || 0;
  const required = teamSize ? teamSize * 2 : 0;
  const eligiblePlayers = players.filter((player: any) => player.ratingStatus !== "pending");
  const pendingPlayerCount = players.length - eligiblePlayers.length;
  const topPlayerIds = eligiblePlayers.slice(0, required).map((player: any) => player.id);
  const isTopPlayerSelectionActive =
    topPlayerIds.length > 0 && topPlayerIds.every((playerId) => attendance.includes(playerId));
  const isEnough = teamSize ? attendance.length === required : false;
  const missingCount = teamSize ? required - attendance.length : 0;
  const draftModeDescription =
    draftMode === "overall"
      ? "Takımları kartlarda görünen ana rating değerlerine göre dengeler"
      : draftMode === "positional"
      ? "Tüm mevki ratinglerini ve takım bloklarını birlikte dengeler"
      : "Rating dengesi gözetmeden oynanabilir rastgele takımlar oluşturur";
  const previousDraftPlayerIds = draftResult
    ? [...draftResult.teamA, ...draftResult.teamB].map((player) => player.id)
    : [];
  const hasSameDraftSquad =
    previousDraftPlayerIds.length === attendance.length &&
    previousDraftPlayerIds.every((playerId) => attendance.includes(playerId));

  const requestTeamGeneration = () => {
    if (draftResult && hasSameDraftSquad) {
      setIsRegenerateConfirmOpen(true);
      return;
    }

    generateDraft();
  };

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

    if (isTopPlayerSelectionActive) {
      setAttendanceSelection([]);
      return;
    }

    setAttendanceSelection(topPlayerIds);
  };

  const handleGenerateTeams = () => {
    if (!isEnough) return;
    const attendingPlayers = eligiblePlayers.filter((player) => attendance.includes(player.id));
    const issues = analyzeFormationCompatibility(attendingPlayers, teamConfig);

    if (issues.length > 0) {
      const details = issues.map((issue) => {
        const label = POSITION_LABELS[issue.position];
        if (issue.blocking) {
          return `${issue.playerCount} ana mevkisi ${label} olan oyuncu için yalnızca ${issue.availableSlots} kontenjan var. Ana kaleciler farklı mevkide oynatılamaz.`;
        }
        return `${issue.playerCount} ana mevkisi ${label} olan oyuncu var; tüm kayıtlı alternatifler değerlendirildiğinde en az ${issue.overflowCount} oyuncu kayıtlı mevkileri dışında oynayacak.`;
      });
      setWarningMessage(details.join(" "));
      const hasBlockingIssue = issues.some((issue) => issue.blocking);
      setHasBlockingFormationIssue(hasBlockingIssue);
      setRequiresFormationConfirmation(!hasBlockingIssue);
      return;
    }

    setWarningMessage(null);
    setRequiresFormationConfirmation(false);
    setHasBlockingFormationIssue(false);
    requestTeamGeneration();
  };

  const handleGenerateDespiteWarning = () => {
    setWarningMessage(null);
    setRequiresFormationConfirmation(false);
    setHasBlockingFormationIssue(false);
    requestTeamGeneration();
  };

  const handleConfirmRegenerate = () => {
    setIsRegenerateConfirmOpen(false);
    generateDraft();
  };

  return (
    <section className={`relative rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 ${!canManageMatch ? "[&_button]:cursor-not-allowed [&_button]:opacity-55" : ""}`}>
      {!canManageMatch && <div className="mb-4 rounded-xl border border-violet-400/30 bg-violet-400/10 px-4 py-3 text-xs font-bold text-violet-100">Salt Okunur — Oyuncu seçimini ve takım oluşturmayı yalnızca Kurucu Admin, Admin ve Moderatör yönetebilir.</div>}
      <fieldset disabled={!canManageMatch} className="contents">
      {/* BAŞLIK VE HIZLI SEÇİM BUTONLARI */}
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

        <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSelectTopN}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                isTopPlayerSelectionActive
                  ? "border-cyan-300 bg-cyan-400 text-black shadow-[0_0_12px_rgba(34,211,238,0.45)]"
                  : "border-cyan-500/40 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/60"
              }`}
            >
              İlk {required || "?"} oyuncuyu Seç {teamSize ? `(${teamSize}v${teamSize})` : ""}
            </button>

        </div>
      </div>

      {warningMessage && (
        <div className="mb-3 rounded-xl bg-amber-500/15 border border-amber-500/40 px-4 py-3 text-xs font-bold text-amber-300">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <span>{warningMessage}</span>
          </div>
          {(requiresFormationConfirmation || hasBlockingFormationIssue) && (
            <div className="mt-3 flex flex-wrap gap-2 pl-6">
              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className="rounded-lg border border-amber-500/40 bg-zinc-900 px-3 py-2 text-amber-200 transition hover:bg-zinc-800"
              >
                Formasyonu Düzenle
              </button>
              {requiresFormationConfirmation && (
                <button
                  type="button"
                  onClick={handleGenerateDespiteWarning}
                  className="rounded-lg bg-amber-400 px-3 py-2 text-black transition hover:bg-amber-300"
                >
                  Yine de Oluştur
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 🎯 TAKIM DENGELEME KRİTERİ SEÇİM ALANI */}
      <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-zinc-200">Dengeleme Kriteri</h4>
            <p className="text-[11px] text-zinc-400">{draftModeDescription}</p>
          </div>
        </div>

        <div className="flex w-full sm:w-auto gap-2">
          <button
            type="button"
            onClick={() => setDraftMode("overall")}
            className={`flex flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
              draftMode === "overall"
                ? "bg-cyan-400 text-black shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Ana Rating</span>
          </button>

          <button
            type="button"
            onClick={() => setDraftMode("positional")}
            className={`flex flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
              draftMode === "positional"
                ? "bg-cyan-400 text-black shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            <span>Mevki Dağılımlı</span>
          </button>

          <button
            type="button"
            onClick={() => setDraftMode("random")}
            className={`flex flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
              draftMode === "random"
                ? "bg-cyan-400 text-black shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <Shuffle className="h-3.5 w-3.5" />
            <span>Rastgele Ata</span>
          </button>
        </div>
      </div>

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

      {/* OYUNCU KARTLARI GRİDİ */}
      {pendingPlayerCount > 0 && <p className="mb-3 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-xs font-bold text-amber-200">Rating bilgisi bekleyen {pendingPlayerCount} oyuncu takım seçimine dahil edilmedi.</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {eligiblePlayers.map((player: any) => (
          <PlayerCard
            key={player.id}
            player={player}
            selectable={canManageMatch}
            selected={attendance.includes(player.id)}
            onClick={canManageMatch ? () => handlePlayerClick(player.id) : undefined}
          />
        ))}
      </div>

      {isRegenerateConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-3xl border border-cyan-400/35 bg-gradient-to-br from-[#08244a] via-[#061127] to-[#020617] p-6 text-center text-white shadow-[0_0_28px_rgba(6,182,212,0.22),0_0_45px_rgba(212,175,55,0.12)]">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-red-400/70 bg-red-500/15 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.45)]">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <h3 className="mb-2 text-[15px] font-black uppercase tracking-wide text-[#F5D77F] drop-shadow-[0_1px_5px_rgba(212,175,55,0.35)] sm:whitespace-nowrap sm:text-base sm:tracking-wider">
              Takımlar Yeniden Oluşturulsun mu?
            </h3>
            <p className="mb-6 text-xs font-medium leading-relaxed text-cyan-100/65">
              Bu oyuncu kadrosuyla daha önce takım oluşturdunuz. Devam ederseniz mevcut takım dağılımı değiştirilecek ve takımlar yeniden dengelenecektir.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsRegenerateConfirmOpen(false)}
                className="flex-1 cursor-pointer rounded-xl border border-cyan-500/30 bg-[#081a35] py-3 text-xs font-bold uppercase tracking-wider text-cyan-100/80 transition hover:border-cyan-400/60 hover:bg-[#0b2850] hover:text-white"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleConfirmRegenerate}
                className="flex-1 cursor-pointer rounded-xl border border-[#F5D77F]/80 bg-gradient-to-r from-[#D4AF37] via-[#F5D77F] to-[#D4AF37] py-3 text-xs font-black uppercase tracking-wider text-[#061127] shadow-[0_0_18px_rgba(212,175,55,0.35)] transition hover:brightness-110"
              >
                Yeniden Oluştur
              </button>
            </div>
          </div>
        </div>
      )}
      </fieldset>
    </section>
  );
}
