"use client";

import Image from "next/image";
import { Trash2, Edit } from "lucide-react";
import { Player } from "@/types";
import { getOverallRating } from "@/lib/ratings";

interface PlayerCardProps {
  player: Player;
  onEdit: (player: Player) => void;
  onDelete: (id: string) => void;
}

export function PlayerCard({ player, onEdit, onDelete }: PlayerCardProps) {
  const overall = getOverallRating(player);

  // Güvenli Mevki String Okuma (JSON nesnesi yerine temiz metin alır)
  const primaryPos =
    typeof player?.position === "string"
      ? player.position
      : player?.position?.primary || "MID";

  return (
    <div className="group relative pt-6 transition-all duration-300 hover:-translate-y-2 select-none">
      {/* MOUSE ILE ÜZERİNE GELİNCE ÇIKAN AKSİYON BUTONLARI (Hover Efekti) */}
      <div className="absolute top-0 right-2 z-30 flex items-center gap-1.5 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:-translate-y-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(player);
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800/90 text-amber-400 border border-amber-400/40 shadow-lg hover:bg-amber-500 hover:text-black transition cursor-pointer"
          title="Oyuncuyu Düzenle"
        >
          <Edit className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(player.id);
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-red-950/90 text-red-400 border border-red-500/40 shadow-lg hover:bg-red-600 hover:text-white transition cursor-pointer"
          title="Oyuncuyu Sil"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* KARTIN KENDİSİ (Tıklayınca Düzenleme Ekranı Açılır) */}
      <div
        onClick={() => onEdit(player)}
        className="relative flex h-[350px] w-[240px] flex-col justify-between p-4 cursor-pointer"
      >
        {/* TOTY Kart PNG Şablonu */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/card-template.png"
            alt="TOTY Card"
            fill
            priority
            className="object-contain pointer-events-none drop-shadow-[0_10px_25px_rgba(0,0,0,0.7)]"
          />
        </div>

        {/* Üst Alan: Sol Üst OVR Reytingi */}
        <div className="relative z-10 pt-7 pl-6">
          <div className="flex flex-col items-center w-max">
            <span className="text-3xl font-black tracking-tight text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              {overall}
            </span>
            <span className="text-[11px] font-black text-amber-200/90 uppercase tracking-wider">
              {primaryPos}
            </span>
          </div>
        </div>

        {/* Orta Alan: Oyuncu İsmi & Mevki */}
        <div className="relative z-10 text-center my-auto pt-4">
          <h3 className="truncate text-lg font-black tracking-wider text-amber-300 uppercase drop-shadow-[0_2px_6px_rgba(0,0,0,1)]">
            {player?.name || "İsimsiz"}
          </h3>
          <div className="mt-0.5">
            <span className="text-xs font-bold text-amber-200/80 uppercase">
              {primaryPos}
            </span>
          </div>
        </div>

        {/* Alt Alan: Reyting Değerleri */}
        <div className="relative z-10 pb-7 px-4 flex justify-around text-center">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-extrabold text-amber-200/70">GK</span>
            <span className="text-sm font-black text-amber-300">{player?.ratings?.GK ?? 50}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-extrabold text-amber-200/70">DEF</span>
            <span className="text-sm font-black text-amber-300">{player?.ratings?.DEF ?? 50}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-extrabold text-amber-200/70">MID</span>
            <span className="text-sm font-black text-amber-300">{player?.ratings?.MID ?? 50}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-extrabold text-amber-200/70">FWD</span>
            <span className="text-sm font-black text-amber-300">{player?.ratings?.FWD ?? 50}</span>
          </div>
        </div>
      </div>
    </div>
  );
}