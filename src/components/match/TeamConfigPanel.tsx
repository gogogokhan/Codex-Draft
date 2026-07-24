"use client";

import React, { useState, useEffect } from "react";
import { Swords, Plus, Minus, Check, Users } from "lucide-react";
import { useApp } from "@/context/AppContext";

export function TeamConfigPanel() {
  const {
    teamConfig,
    setTeamConfig,
    attendance = [],
    generateTeams,
    setActiveTab,
  } = useApp();

  // 🎯 DEFAULT SEÇİLMEMİŞ GELMESİ İÇİN LOCAL STATE (null Başlangıç)
  const [selectedSize, setSelectedSize] = useState<number | null>(
    teamConfig?.teamSize || null
  );

  useEffect(() => {
    if (teamConfig?.teamSize) {
      setSelectedSize(teamConfig.teamSize);
    }
  }, [teamConfig?.teamSize]);

  const teamSize = selectedSize;
  const required = teamSize ? teamSize * 2 : 0;
  const isEnough = teamSize ? attendance.length === required : false;
  const missingCount = teamSize ? required - attendance.length : 0;

  const teamAName = teamConfig?.teamAName || teamConfig?.team1Name || "Codex Red";
  const teamBName = teamConfig?.teamBName || teamConfig?.team2Name || "Codex Blue";

  // Formasyon mevki değerleri
  const positions = teamConfig?.positions || teamConfig?.formation || {
    gk: 1,
    def: 2,
    mid: 3,
    fwd: 1,
  };

  // 🎯 TIKLANDIĞINDA ANINDA SEÇİMİ GÜNCELLEYEN FONKSİYON
  const handleTeamSizeChange = (newSize: number) => {
    setSelectedSize(newSize);
    if (setTeamConfig) {
      setTeamConfig((prev: any) => ({
        ...prev,
        teamSize: newSize,
      }));
    }
  };

  const handleNameChange = (key: string, value: string) => {
    if (setTeamConfig) {
      setTeamConfig((prev: any) => ({
        ...prev,
        [key]: value,
      }));
    }
  };

  const handlePosChange = (posKey: string, delta: number) => {
    if (!setTeamConfig) return;
    const currentVal = positions[posKey] || 0;
    const newVal = Math.max(0, currentVal + delta);

    setTeamConfig((prev: any) => {
      const updatedPositions = {
        ...(prev.positions || prev.formation || positions),
        [posKey]: newVal,
      };
      return {
        ...prev,
        positions: updatedPositions,
        formation: updatedPositions,
      };
    });
  };

  const currentFormationSum =
    (positions.gk || 1) +
    (positions.def || 0) +
    (positions.mid || 0) +
    (positions.fwd || 0);

  const handleGenerate = () => {
    if (!isEnough) return;
    if (generateTeams) generateTeams();
    if (setActiveTab) setActiveTab("squad");
  };

  // Takım boyutu buton seçenekleri
  const SIZES = [5, 6, 7, 8, 9, 10, 11];

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 mt-6 space-y-6">
      {/* BAŞLIK */}
      <div className="border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2 text-lg font-bold text-white">
          <span className="text-xl">⚙️</span>
          <h3>Maç Ayarları</h3>
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          Takım boyutu, formasyon ve takım isimlerini belirleyin
        </p>
      </div>

      {/* 1. TOTY MAVİSİ TAKIM BOYUTU BUTONLARI (DEFAULT SEÇİLMEMİŞ) */}
      <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold text-zinc-200 flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            Takım Boyutu
          </span>

          {/* SAĞ ÜST ROZET */}
          {teamSize ? (
            <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.25)]">
              Toplam {teamSize * 2} Oyuncu ({teamSize}v{teamSize})
            </span>
          ) : (
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/60">
              Takım Boyutu Seçiniz
            </span>
          )}
        </div>

        {/* 🎮 5v5 -> 11v11 TOTY MAVİSİ BUTON GRUBU */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 pt-1">
          {SIZES.map((size) => {
            const isActive = selectedSize === size;
            return (
              <button
                key={size}
                type="button"
                onClick={() => handleTeamSizeChange(size)}
                className={`py-2.5 px-2 rounded-xl text-xs font-black transition-all duration-200 flex flex-col items-center justify-center gap-0.5 border cursor-pointer ${
                  isActive
                    ? "bg-cyan-400 text-black border-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.6)] scale-105 z-10 font-black"
                    : "bg-zinc-900/90 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-white hover:border-zinc-700"
                }`}
              >
                <span className="text-sm font-extrabold">{size}v{size}</span>
                <span className={`text-[10px] font-semibold ${isActive ? "text-black" : "text-zinc-500"}`}>
                  {size * 2} Kişi
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. FORMASYON VE MEVKİ DAĞILIMI */}
      <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold text-zinc-200">Formasyon & Mevki Dağılımı</span>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${
              teamSize && currentFormationSum === teamSize
                ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            Tam Kadro ({currentFormationSum}/{teamSize || "?"})
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* KALECİ */}
          <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-2.5 text-center flex flex-col justify-between">
            <span className="text-[11px] text-zinc-400 font-medium">Kaleci</span>
            <div className="text-sm font-black text-cyan-400 my-1">1</div>
            <span className="text-[10px] text-zinc-500">Sabit</span>
          </div>

          {/* DEFANS */}
          <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-2.5 text-center flex flex-col justify-between">
            <span className="text-[11px] text-zinc-400 font-medium">Defans</span>
            <div className="flex items-center justify-center gap-2 my-1">
              <button
                type="button"
                onClick={() => handlePosChange("def", -1)}
                className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center text-xs font-bold transition"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-sm font-black text-white w-4 text-center">
                {positions.def ?? 2}
              </span>
              <button
                type="button"
                onClick={() => handlePosChange("def", 1)}
                className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center text-xs font-bold transition"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* ORTA SAHA */}
          <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-2.5 text-center flex flex-col justify-between">
            <span className="text-[11px] text-zinc-400 font-medium">Orta Saha</span>
            <div className="flex items-center justify-center gap-2 my-1">
              <button
                type="button"
                onClick={() => handlePosChange("mid", -1)}
                className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center text-xs font-bold transition"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-sm font-black text-white w-4 text-center">
                {positions.mid ?? 3}
              </span>
              <button
                type="button"
                onClick={() => handlePosChange("mid", 1)}
                className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center text-xs font-bold transition"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* FORVET */}
          <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-2.5 text-center flex flex-col justify-between">
            <span className="text-[11px] text-zinc-400 font-medium">Forvet</span>
            <div className="flex items-center justify-center gap-2 my-1">
              <button
                type="button"
                onClick={() => handlePosChange("fwd", -1)}
                className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center text-xs font-bold transition"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-sm font-black text-white w-4 text-center">
                {positions.fwd ?? 1}
              </span>
              <button
                type="button"
                onClick={() => handlePosChange("fwd", 1)}
                className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center text-xs font-bold transition"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. TAKIM İSİMLERİ INPUTLARI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-400">A Takımı İsmi</label>
          <input
            type="text"
            value={teamAName}
            onChange={(e) => {
              handleNameChange("teamAName", e.target.value);
              handleNameChange("team1Name", e.target.value);
            }}
            placeholder="Codex Red"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 transition"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-400">B Takımı İsmi</label>
          <input
            type="text"
            value={teamBName}
            onChange={(e) => {
              handleNameChange("teamBName", e.target.value);
              handleNameChange("team2Name", e.target.value);
            }}
            placeholder="Codex Blue"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 transition"
          />
        </div>
      </div>

      {/* 4. 🚀 EN ALTTAKİ TOTY MAVİSİ DİNAMİK TAKIMLARI OLUŞTUR BUTONU */}
      <div className="pt-2">
        <button
          type="button"
          disabled={!isEnough}
          onClick={handleGenerate}
          className={`w-full py-4 rounded-xl font-black uppercase tracking-wider text-sm flex items-center justify-center gap-2.5 transition-all duration-300 ${
            isEnough
              ? "bg-cyan-400 hover:bg-cyan-300 text-black shadow-[0_0_25px_rgba(6,182,212,0.5)] cursor-pointer scale-100 hover:scale-[1.01] active:scale-[0.99]"
              : "bg-zinc-800/80 text-zinc-500 border border-zinc-700/50 cursor-not-allowed opacity-60"
          }`}
        >
          <Swords className={`h-5 w-5 ${isEnough ? "text-black" : "text-zinc-500"}`} />
          <span>
            {!teamSize
              ? "Lütfen Önce Takım Boyutu Seçiniz"
              : isEnough
              ? "Takımları Oluştur"
              : `Takımları Oluştur (${missingCount > 0 ? `${missingCount} Oyuncu Eksik` : "Kadro Sınırı Aşıldı"})`}
          </span>
        </button>
      </div>
    </div>
  );
}