"use client";

import React, { useState } from "react";
import { User, Trash2, AlertTriangle, Check } from "lucide-react";

interface PositionItem {
  code: string;
  label: string;
  rating: number;
  isMain: boolean;
}

interface PlayerCardProps {
  player: any;
  compact?: boolean;
  isAdmin?: boolean;
  selected?: boolean;
  selectable?: boolean;
  onClick?: (player?: any, e?: React.MouseEvent) => void;
  onEdit?: (player: any) => void;
  onDelete?: (player: any) => void;
}

// 🎯 SAHA DİZİLİMİ MEVKİ SIRALAMA ÖNCELİĞİ (GK -> DEF -> MID -> FWD)
const POSITION_ORDER: Record<string, number> = {
  GK: 1,
  DEF: 2,
  MID: 3,
  FWD: 4,
};

const extractPosCode = (val: any): string => {
  if (!val) return "ST";
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    if (typeof val.primary === "string") return val.primary;
    if (typeof val.code === "string") return val.code;
    if (typeof val.label === "string") return val.label;
  }
  return "ST";
};

export function PlayerCard({
  player,
  compact = false,
  isAdmin = true,
  selected = false,
  selectable = false,
  onClick,
  onEdit,
  onDelete,
}: PlayerCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!player) return null;

  // 🎯 TIKLAMA OLAYI FIX: Hem player objesini hem de olayı güvenle fırlatır
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick(player, e);
    } else if (onEdit) {
      onEdit(player);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(false);
    if (onDelete) {
      onDelete(player);
    }
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(false);
  };

  const name = String(player.name || player.fullName || "OYUNCU").toUpperCase();

  // 1. MEVKİ VERİLERİNİ ÇEK
  let rawPosList: PositionItem[] = [];

  if (Array.isArray(player.positions) && player.positions.length > 0) {
    rawPosList = player.positions.map((p: any) => ({
      code: extractPosCode(p.code || p.primary || p),
      label: typeof p.label === "string" ? p.label : extractPosCode(p),
      rating: Number(p.rating || player.overall || player.rating || 80),
      isMain: Boolean(p.isMain),
    }));
  } else {
    const mainCode = extractPosCode(player.mainPosition || player.position);
    const mainRating = Number(player.overall || player.rating || 80);
    rawPosList = [
      {
        code: mainCode,
        label: mainCode,
        rating: mainRating,
        isMain: true,
      },
    ];
  }

  // 2. ANA MEVKİ VE REYTİNG
  const mainPosItem = rawPosList.find((p) => p.isMain) || rawPosList[0];
  const overallRating = mainPosItem ? mainPosItem.rating : 80;
  const mainPosCode = mainPosItem ? mainPosItem.code : "DEF";

  // 3. MEVKİLERİ SIRALA (GK -> DEF -> MID -> FWD)
  const posList = [...rawPosList].sort((a, b) => {
    const orderA = POSITION_ORDER[a.code.toUpperCase()] || 99;
    const orderB = POSITION_ORDER[b.code.toUpperCase()] || 99;
    return orderA - orderB;
  });

  // 4. DİNAMİK GRID
  const gridColsClass =
    posList.length === 1
      ? "grid-cols-1"
      : posList.length === 2
      ? "grid-cols-2"
      : posList.length === 3
      ? "grid-cols-3"
      : "grid-cols-4";

  // 🎨 TOTY MAVİ SEÇİM VE PARLAMA STİLLERİ
  const isDimmed = selectable && !selected;

  const containerStyle = `
    group relative w-60 h-[360px] select-none font-sans transition-all duration-300 cursor-pointer
    ${selected ? "scale-105 z-20 drop-shadow-[0_0_25px_rgba(59,130,246,0.95)]" : ""}
    ${isDimmed ? "opacity-35 grayscale-[50%] hover:opacity-85 hover:grayscale-0 hover:scale-100 drop-shadow-md" : ""}
    ${!selectable && !selected ? "hover:scale-105 hover:z-30 drop-shadow-[0_12px_24px_rgba(0,0,0,0.8)]" : ""}
  `;

  const CardContent = (
    <div onClick={handleClick} className={containerStyle}>
      
      {/* 🔵 TOTY MAVİ SEÇİM ROZETİ */}
      {selectable && (
        <div
          className={`absolute top-[18px] left-[18px] z-40 p-1.5 rounded-lg border backdrop-blur-md transition-all duration-300 ${
            selected
              ? "bg-blue-950/90 text-cyan-300 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.8)] scale-110"
              : "bg-black/60 text-zinc-500 border-zinc-700/60 opacity-60 group-hover:opacity-100"
          }`}
        >
          <Check className={`w-4 h-4 stroke-[3] ${selected ? "text-cyan-300" : "text-zinc-500"}`} />
        </div>
      )}

      {/* 🔴 SİLME BUTONU */}
      {isAdmin && onDelete && !selectable && (
        <button
          type="button"
          onClick={handleDeleteClick}
          title="Oyuncuyu Sil"
          className="absolute top-[18px] right-[18px] z-40 p-1.5 bg-black/70 hover:bg-red-950/90 text-[#D4AF37] hover:text-red-400 rounded-lg shadow-2xl border border-[#D4AF37]/30 hover:border-red-500/60 backdrop-blur-md transition-all duration-200 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto hover:scale-105 active:scale-95"
        >
          <Trash2 className="w-4 h-4 stroke-[2]" />
        </button>
      )}

      {/* ŞABLON ARKA PLAN */}
      <img
        src="/card-template.png"
        alt="TOTY Card Template"
        className="absolute inset-0 w-full h-full object-contain z-0 pointer-events-none"
      />

      {/* 1. SOL ÜST REYTİNG VE MEVKİ */}
      <div className="absolute top-[24%] left-[15%] z-20 text-center flex flex-col items-center justify-center pointer-events-none">
        <span className="font-black tracking-tighter block text-[#F5D77F] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] leading-none text-[28px]">
          {overallRating}
        </span>
        <span className="font-black block text-[#D4AF37] uppercase tracking-wider leading-none mt-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] text-[13px]">
          {String(mainPosCode)}
        </span>
      </div>

      {/* 2. OYUNCU AVATARI */}
      <div className="absolute top-[18%] left-1/2 -translate-x-1/2 w-[60%] h-[41%] z-10 flex items-end justify-center overflow-hidden pointer-events-none">
        {player.imageUrl ? (
          <img
            src={player.imageUrl}
            alt={name}
            className="w-full h-full object-contain object-bottom transition-transform duration-300"
          />
        ) : (
          <User className="text-[#D4AF37]/40 stroke-[1.2] drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] w-20 h-20" />
        )}
      </div>

      {/* 3. OYUNCU İSMİ */}
      <div className="absolute top-[66%] inset-x-[12%] z-20 text-center flex items-center justify-center h-[6%] pointer-events-none">
        <span className="font-black text-[#D4AF37] tracking-wider uppercase block truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] text-base">
          {name}
        </span>
      </div>

      {/* 4. POZİSYON BAŞLIKLARI */}
      <div className="absolute top-[72.5%] inset-x-[15%] z-20 text-center pointer-events-none">
        <div className={`grid ${gridColsClass} text-center font-black text-[#D4AF37] uppercase tracking-wider text-[12px]`}>
          {posList.map((item, idx) => (
            <span key={idx}>{String(item.code)}</span>
          ))}
        </div>
      </div>

      {/* 5. POZİSYON PUANLARI */}
      <div className="absolute top-[75.5%] inset-x-[15%] z-20 text-center pointer-events-none">
        <div className={`grid ${gridColsClass} text-center font-black text-[#F5D77F] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] text-[14px]`}>
          {posList.map((item, idx) => (
            <span key={idx}>{String(item.rating)}</span>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {compact ? (
        <div className="group relative w-[110px] h-[165px] flex items-center justify-center shrink-0 cursor-pointer">
          <div className="scale-[0.4583] origin-center pointer-events-none">
            {CardContent}
          </div>
        </div>
      ) : (
        <div className="relative inline-block cursor-pointer select-none">
          {CardContent}
        </div>
      )}

      {/* ⚠️ SİLME ONAY MODALI */}
      {showDeleteConfirm && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
          <div className="relative w-full max-w-sm bg-[#18181b] border border-zinc-800 rounded-xl p-6 shadow-2xl text-center text-white space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-zinc-100">Oyuncuyu Sil</h3>
              <p className="text-xs text-zinc-400 mt-1">
                <strong className="text-amber-400">{name}</strong> isimli oyuncuyu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancelDelete}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs rounded-lg transition"
              >
                HAYIR
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg shadow-lg shadow-red-600/30 transition"
              >
                EVET, SİL
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}