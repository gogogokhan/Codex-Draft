"use client";

import React, { useState, useEffect } from "react";
import { Plus, Minus, Check, Users, AlertCircle } from "lucide-react";
import { useApp } from "@/context/AppContext";

export function TeamConfigPanel() {
  const {
    teamConfig,
    setTeamConfig,
    setCurrentStep,
    setActiveTab,
    canManageMatch,
  } = useApp();

  // LOCAL STATE (null Başlangıç)
  const [selectedSize, setSelectedSize] = useState<number | null>(
    teamConfig?.teamSize || null
  );

  useEffect(() => {
    if (teamConfig?.teamSize) {
      setSelectedSize(teamConfig.teamSize);
    }
  }, [teamConfig?.teamSize]);

  const teamSize = selectedSize;

  // Takım İsimleri (Default Boş)
  const rawAName = teamConfig?.teamAName ?? "";
  const teamAName = rawAName === "Codex Red" ? "" : rawAName;

  const rawBName = teamConfig?.teamBName ?? "";
  const teamBName = rawBName === "Codex Blue" ? "" : rawBName;

  // Formasyon mevki değerleri
  const positions = (() => {
    const formation = teamConfig?.formation;
    if (typeof formation === "object" && formation !== null) {
      return {
        gk: Number((formation as any).gk ?? (formation as any).GK ?? 1),
        def: Number((formation as any).def ?? (formation as any).DEF ?? 0),
        mid: Number((formation as any).mid ?? (formation as any).MID ?? 0),
        fwd: Number((formation as any).fwd ?? (formation as any).FWD ?? 0),
      };
    }

    if (typeof formation === "string") {
      const [gk = 1, def = 0, mid = 0, fwd = 0] = formation
        .split("-")
        .map((value) => Math.max(0, Number.parseInt(value, 10) || 0));

      return { gk: 1, def, mid, fwd };
    }

    return {
      gk: 1,
      def: 0,
      mid: 0,
      fwd: 0,
    };
  })();

  // 🎯 TOPLAM HESAPLAMA (1 KALECİ SABİT + DİĞER MEVKİLER)
  const currentFormationSum =
    1 +
    (Number(positions.def) || 0) +
    (Number(positions.mid) || 0) +
    (Number(positions.fwd) || 0);

  // 🎯 TAKIM BOYUTU SEÇİLDİĞİNDE FORMASYONU TEMİZLE (KALECİ 1 KALIR, DİĞERLERİ 0)
  const handleTeamSizeChange = (newSize: number) => {
    setSelectedSize(newSize);

    if (setTeamConfig) {
      setTeamConfig({
        teamSize: newSize,
        formation: "1-0-0-0",
      });
    }
  };

  const handleNameChange = (key: "teamAName" | "teamBName", value: string) => {
    if (setTeamConfig) {
      if (key === "teamAName") {
        setTeamConfig({ teamAName: value });
      } else {
        setTeamConfig({ teamBName: value });
      }
    }
  };

  // 🎯 DİNAMİK MAX KONTROL YARDIMCISI (Diğer Mevkilerin Toplamını Çıkararak Boş Kontenjanı Bulur)
  const getMaxAllowedForPos = (posKey: "def" | "mid" | "fwd") => {
    if (!teamSize) return 0;
    const otherSum =
      (posKey !== "def" ? Number(positions.def) || 0 : 0) +
      (posKey !== "mid" ? Number(positions.mid) || 0 : 0) +
      (posKey !== "fwd" ? Number(positions.fwd) || 0 : 0);

    return Math.max(0, teamSize - 1 - otherSum); // Kaleci (1) çıkartılıyor
  };

  // 🎯 BUTONLAR İLE ARTTIRMA / AZALTMA KONTROLÜ
  const handlePosChange = (posKey: "def" | "mid" | "fwd", delta: number) => {
    if (!setTeamConfig) return;
    const currentVal = Number(positions[posKey]) || 0;
    const maxAllowed = getMaxAllowedForPos(posKey);

    if (delta > 0 && currentVal >= maxAllowed) return;

    const newVal = Math.max(0, Math.min(currentVal + delta, maxAllowed));

    const updatedPositions = {
      ...positions,
      gk: 1,
      [posKey]: newVal,
    };

    setTeamConfig({
      formation: `${updatedPositions.gk}-${updatedPositions.def}-${updatedPositions.mid}-${updatedPositions.fwd}`,
    });
  };

  // 🎯 KLAVYEDEN MANUEL SAYI GİRİŞİ KONTROLÜ (Sıfır Temizleme + Kısıtlama Sınırı)
  const handlePosInputChange = (posKey: "def" | "mid" | "fwd", rawValue: string) => {
    if (!setTeamConfig) return;

    // Baştaki sıfırları ayıkla ('01' -> '1', '005' -> '5')
    const cleanValue = rawValue.replace(/^0+(?=\d)/, "");
    let parsed = parseInt(cleanValue, 10);
    if (isNaN(parsed)) parsed = 0;

    // Kalan maks kontanjanı hesapla ve girilen değeri sınırla
    const maxAllowed = getMaxAllowedForPos(posKey);
    const clampedValue = Math.min(Math.max(0, parsed), maxAllowed);

    const updatedPositions = {
      ...positions,
      gk: 1,
      [posKey]: clampedValue,
    };

    setTeamConfig({
      formation: `${updatedPositions.gk}-${updatedPositions.def}-${updatedPositions.mid}-${updatedPositions.fwd}`,
    });
  };

  const handleNextStep = () => {
    if (!selectedSize || currentFormationSum !== selectedSize) return;
    if (setCurrentStep) {
      setCurrentStep("attendance");
    } else if (setActiveTab) {
      setActiveTab("attendance");
    }
  };

  const SIZES = [5, 6, 7, 8, 9, 10, 11];

  // Limit doldu mu kontrolü
  const isMaxReached = Boolean(teamSize && currentFormationSum >= teamSize);

  return (
    <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-6">
      {!canManageMatch && <><div className="relative z-30 rounded-xl border border-violet-400/30 bg-violet-400/10 px-4 py-3 text-xs font-bold text-violet-100">Salt Okunur — Bu toplulukta maç ayarlarını yalnızca Kurucu Admin, Admin ve Moderatör değiştirebilir.</div><div className="absolute inset-0 z-20 cursor-not-allowed rounded-2xl bg-transparent" aria-hidden="true" /></>}
      {/* BAŞLIK */}
      <div className="border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2 text-lg font-bold text-white">
          <span className="text-xl">⚙️</span>
          <h3>1. Maç Ayarları</h3>
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          Takım boyutu, formasyon ve takım isimlerini belirleyin
        </p>
      </div>

      {/* 1. TAKIM BOYUTU BUTONLARI */}
      <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold text-zinc-200 flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            Takım Boyutu
          </span>

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

          {/* ROZET */}
          {teamSize && currentFormationSum === teamSize ? (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              <Check className="w-3.5 h-3.5 text-cyan-400" />
              Mevki Toplamı ({currentFormationSum}/{teamSize})
            </span>
          ) : (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 bg-red-500/15 text-red-400 border border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.2)] animate-pulse">
              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
              Mevki Toplamı ({currentFormationSum}/{teamSize || "?"})
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* KALECİ (SABİT 1) */}
          <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-2.5 text-center flex flex-col justify-between">
            <span className="text-[11px] text-zinc-400 font-medium">KL</span>
            <div className="text-sm font-black text-cyan-400 my-1">1</div>
            <span className="text-[10px] text-zinc-500">Sabit</span>
          </div>

          {/* DEFANS */}
          <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-2.5 text-center flex flex-col justify-between">
            <span className="text-[11px] text-zinc-400 font-medium">DEF</span>
            <div className="flex items-center justify-center gap-2 my-1">
              <button
                type="button"
                onClick={() => handlePosChange("def", -1)}
                disabled={(positions.def ?? 0) <= 0}
                className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center text-xs font-bold transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Minus className="w-3 h-3" />
              </button>

              {/* 🎯 SIFIR SİLME VE MAX SINIROLU INPUT */}
              <input
                type="number"
                min={0}
                max={getMaxAllowedForPos("def")}
                value={positions.def === 0 ? "" : positions.def}
                placeholder="0"
                onChange={(e) => handlePosInputChange("def", e.target.value)}
                className="w-10 text-center bg-zinc-950 border border-zinc-800 rounded py-0.5 text-xs font-black text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />

              <button
                type="button"
                onClick={() => handlePosChange("def", 1)}
                disabled={(positions.def ?? 0) >= getMaxAllowedForPos("def")}
                className={`w-6 h-6 rounded text-xs font-bold transition flex items-center justify-center ${
                  (positions.def ?? 0) >= getMaxAllowedForPos("def")
                    ? "bg-zinc-800/40 text-zinc-600 cursor-not-allowed opacity-40"
                    : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
                }`}
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* ORTA SAHA */}
          <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-2.5 text-center flex flex-col justify-between">
            <span className="text-[11px] text-zinc-400 font-medium">ORT</span>
            <div className="flex items-center justify-center gap-2 my-1">
              <button
                type="button"
                onClick={() => handlePosChange("mid", -1)}
                disabled={(positions.mid ?? 0) <= 0}
                className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center text-xs font-bold transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Minus className="w-3 h-3" />
              </button>

              {/* 🎯 SIFIR SİLME VE MAX SINIROLU INPUT */}
              <input
                type="number"
                min={0}
                max={getMaxAllowedForPos("mid")}
                value={positions.mid === 0 ? "" : positions.mid}
                placeholder="0"
                onChange={(e) => handlePosInputChange("mid", e.target.value)}
                className="w-10 text-center bg-zinc-950 border border-zinc-800 rounded py-0.5 text-xs font-black text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />

              <button
                type="button"
                onClick={() => handlePosChange("mid", 1)}
                disabled={(positions.mid ?? 0) >= getMaxAllowedForPos("mid")}
                className={`w-6 h-6 rounded text-xs font-bold transition flex items-center justify-center ${
                  (positions.mid ?? 0) >= getMaxAllowedForPos("mid")
                    ? "bg-zinc-800/40 text-zinc-600 cursor-not-allowed opacity-40"
                    : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
                }`}
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* FORVET */}
          <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-2.5 text-center flex flex-col justify-between">
            <span className="text-[11px] text-zinc-400 font-medium">FV</span>
            <div className="flex items-center justify-center gap-2 my-1">
              <button
                type="button"
                onClick={() => handlePosChange("fwd", -1)}
                disabled={(positions.fwd ?? 0) <= 0}
                className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center text-xs font-bold transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Minus className="w-3 h-3" />
              </button>

              {/* 🎯 SIFIR SİLME VE MAX SINIROLU INPUT */}
              <input
                type="number"
                min={0}
                max={getMaxAllowedForPos("fwd")}
                value={positions.fwd === 0 ? "" : positions.fwd}
                placeholder="0"
                onChange={(e) => handlePosInputChange("fwd", e.target.value)}
                className="w-10 text-center bg-zinc-950 border border-zinc-800 rounded py-0.5 text-xs font-black text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />

              <button
                type="button"
                onClick={() => handlePosChange("fwd", 1)}
                disabled={(positions.fwd ?? 0) >= getMaxAllowedForPos("fwd")}
                className={`w-6 h-6 rounded text-xs font-bold transition flex items-center justify-center ${
                  (positions.fwd ?? 0) >= getMaxAllowedForPos("fwd")
                    ? "bg-zinc-800/40 text-zinc-600 cursor-not-allowed opacity-40"
                    : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
                }`}
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
            onChange={(e) => handleNameChange("teamAName", e.target.value)}
            placeholder="Örn: Kırmızı Takım"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-400 transition"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-400">B Takımı İsmi</label>
          <input
            type="text"
            value={teamBName}
            onChange={(e) => handleNameChange("teamBName", e.target.value)}
            placeholder="Örn: Mavi Takım"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-400 transition"
          />
        </div>
      </div>

      {/* 4. 🚀 DEVAM ET BUTONU */}
      <div className="pt-2">
        <button
          type="button"
          disabled={!selectedSize || currentFormationSum !== selectedSize}
          onClick={handleNextStep}
          className={`w-full py-4 rounded-xl font-black uppercase tracking-wider text-sm flex items-center justify-center gap-2.5 transition-all duration-300 ${
            selectedSize && currentFormationSum === selectedSize
              ? "bg-cyan-400 hover:bg-cyan-300 text-black shadow-[0_0_25px_rgba(6,182,212,0.5)] cursor-pointer scale-100 hover:scale-[1.01] active:scale-[0.99]"
              : "bg-zinc-800/80 text-zinc-500 border border-zinc-700/50 cursor-not-allowed opacity-60"
          }`}
        >
          <Users className={`h-5 w-5 ${selectedSize && currentFormationSum === selectedSize ? "text-black" : "text-zinc-500"}`} />
          <span>
            {!selectedSize
              ? "Lütfen Önce Takım Boyutu Seçiniz"
              : currentFormationSum !== selectedSize
              ? `Mevki Toplamı ${teamSize} Olmalıdır (${currentFormationSum}/${teamSize})`
              : "Devam Et (Oyuncu Seçimine Geç) ➔"}
          </span>
        </button>
      </div>
    </div>
  );
}
