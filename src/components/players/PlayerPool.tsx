'use client';

import React, { useState, useMemo } from 'react';
import { ArrowUpDown, Trash2, AlertTriangle, Plus } from 'lucide-react';
import { PlayerCard } from './PlayerCard';

const SORT_OPTIONS = [
  { value: 'rating-desc', label: 'Reyting (En Yüksek)' },
  { value: 'rating-asc', label: 'Reyting (En Düşük)' },
  { value: 'name-asc', label: 'İsim (A ➔ Z)' },
  { value: 'name-desc', label: 'İsim (Z ➔ A)' },
  { value: 'pos-asc', label: 'Mevki (GK ➔ FWD)' },
  { value: 'pos-rating', label: 'Mevki, Sonra Reyting' },
  { value: 'rating-pos', label: 'Reyting, Sonra Mevki' },
];

interface PlayerPoolProps {
  players?: any[];
  onAddPlayerClick?: () => void;
  onClearAllPlayers?: () => void;
  onEditPlayer?: (player: any) => void;
  onDeletePlayer?: (playerId: string) => void;
}

// Mevki Sıralama Katmanı (GK: 1, DEF: 2, MID: 3, FWD: 4)
const getPrimaryPositionCode = (player: any): string => {
  if (!player) return '';

  const candidates: string[] = [];

  const pushCandidate = (value: unknown) => {
    if (typeof value === 'string' && value.trim()) {
      candidates.push(value.trim());
    } else if (typeof value === 'object' && value !== null) {
      const record = value as Record<string, unknown>;
      const nested = record.code ?? record.name ?? record.value ?? record.label ?? record.primary ?? record.main;
      if (typeof nested === 'string' && nested.trim()) {
        candidates.push(nested.trim());
      }
    }
  };

  pushCandidate(player.position);
  pushCandidate(player.mainPosition);
  pushCandidate(player.pos);
  pushCandidate(player.role);

  if (Array.isArray(player.positions) && player.positions.length > 0) {
    const mainPos = player.positions.find((p: any) => p?.isMain) || player.positions[0];
    pushCandidate(mainPos);
  }

  if (Array.isArray(player.position) && player.position.length > 0) {
    pushCandidate(player.position[0]);
  }

  const normalized = candidates
    .map((value) =>
      String(value)
        .trim()
        .toUpperCase()
        .replace(/İ/g, 'I')
        .replace(/ı/g, 'I')
        .replace(/[ç]/gi, 'C')
        .replace(/[ğ]/gi, 'G')
        .replace(/[ş]/gi, 'S')
        .replace(/[ö]/gi, 'O')
        .replace(/[ü]/gi, 'U')
    )
    .filter(Boolean);

  const cleanPos = normalized.find((value) => value.length > 0) ?? '';

  if (
    cleanPos === 'GK' ||
    cleanPos === 'KL' ||
    cleanPos.includes('GK') ||
    cleanPos.includes('KL') ||
    cleanPos.includes('KALECI') ||
    cleanPos.includes('GOALKEEPER') ||
    cleanPos.includes('KEEPER')
  ) {
    return 'GK';
  }

  if (
    cleanPos === 'DEF' ||
    cleanPos === 'DF' ||
    cleanPos === 'CB' ||
    cleanPos === 'LB' ||
    cleanPos === 'RB' ||
    cleanPos === 'LWB' ||
    cleanPos === 'RWB' ||
    cleanPos.includes('DEF') ||
    cleanPos.includes('DEFANS') ||
    cleanPos.includes('STOPPER') ||
    cleanPos.includes('BEK')
  ) {
    return 'DEF';
  }

  if (
    cleanPos === 'MID' ||
    cleanPos === 'OS' ||
    cleanPos === 'CM' ||
    cleanPos === 'CAM' ||
    cleanPos === 'CDM' ||
    cleanPos === 'LM' ||
    cleanPos === 'RM' ||
    cleanPos.includes('MID') ||
    cleanPos.includes('ORTA') ||
    cleanPos.includes('OS')
  ) {
    return 'MID';
  }

  if (
    cleanPos === 'FWD' ||
    cleanPos === 'FV' ||
    cleanPos === 'ST' ||
    cleanPos === 'CF' ||
    cleanPos === 'LW' ||
    cleanPos === 'RW' ||
    cleanPos === 'SNT' ||
    cleanPos.includes('FWD') ||
    cleanPos.includes('FORVET') ||
    cleanPos.includes('ATTACK') ||
    cleanPos.includes('FOR')
  ) {
    return 'FWD';
  }

  return 'MID';
};

const getPositionOrder = (positionCode: string): number => {
  switch (positionCode) {
    case 'GK':
      return 1;
    case 'DEF':
      return 2;
    case 'MID':
      return 3;
    case 'FWD':
      return 4;
    default:
      return 99;
  }
};

export function PlayerPool({
  players = [],
  onAddPlayerClick,
  onClearAllPlayers,
  onEditPlayer,
  onDeletePlayer,
}: PlayerPoolProps) {
  const [sortOption, setSortOption] = useState<string>('rating-desc');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const getPlayerRating = (player: any, positionCode?: string): number => {
    const resolvedPosition = positionCode ?? getPrimaryPositionCode(player);

    // PRIMARY POSITION RATING'İNİ AL
    if (resolvedPosition && player?.ratings && typeof player.ratings === "object") {
      const rating = player.ratings[resolvedPosition];
      if (typeof rating === "number" && rating > 0) {
        return rating;
      }
    }

    // FALLBACK: OVERALL RATING
    return Number(player?.overall ?? player?.rating ?? 50);
  };

  const sortedPlayers = useMemo(() => {
    if (!Array.isArray(players)) return [];

    return [...players].sort((a, b) => {
      const positionCodeA = getPrimaryPositionCode(a);
      const positionCodeB = getPrimaryPositionCode(b);
      const posOrderA = getPositionOrder(positionCodeA);
      const posOrderB = getPositionOrder(positionCodeB);
      const ratingA = getPlayerRating(a, positionCodeA);
      const ratingB = getPlayerRating(b, positionCodeB);
      const nameA = (a.name || '').localeCompare(b.name || '', 'tr');

      switch (sortOption) {
        // 1. REYTİNG EN YÜKSEK: 99 > 98 > ... > 50
        // Aynı rating'de: GK > DEF > MID > FWD
        case 'rating-desc': {
          if (ratingB !== ratingA) {
            return ratingB - ratingA;
          }
          return posOrderA - posOrderB;
        }

        // 2. REYTİNG EN DÜŞÜK: 50 < 51 < ... < 99
        // Aynı rating'de: GK > DEF > MID > FWD
        case 'rating-asc': {
          if (ratingA !== ratingB) {
            return ratingA - ratingB;
          }
          return posOrderA - posOrderB;
        }

        // 3. İSİM A-Z
        case 'name-asc':
          return nameA;

        // 4. İSİM Z-A
        case 'name-desc':
          return (b.name || '').localeCompare(a.name || '', 'tr');

        // 5. MEVKİ (GK ➔ FWD)
        // İçinde: Rating büyükten küçüğe
        case 'pos-asc': {
          if (posOrderA !== posOrderB) {
            return posOrderA - posOrderB;
          }
          // Aynı position'da rating yüksekten düşüğe
          return ratingB - ratingA;
        }

        // 6. MEVKİ, SONRA REYTİNG
        // Önce mevki (GK > DEF > MID > FWD), sonra rating (99 > 50)
        case 'pos-rating': {
          if (posOrderA !== posOrderB) {
            return posOrderA - posOrderB;
          }
          // Aynı mevkide rating yüksekten düşüğe
          return ratingB - ratingA;
        }

        // 7. REYTİNG, SONRA MEVKİ
        // Önce rating (99 > 50), sonra mevki (GK > DEF > MID > FWD)
        case 'rating-pos': {
          if (ratingB !== ratingA) {
            return ratingB - ratingA;
          }
          // Aynı rating'de mevki sırası
          return posOrderA - posOrderB;
        }

        default:
          return 0;
      }
    });
  }, [players, sortOption]);

  const handleConfirmClearAll = () => {
    if (onClearAllPlayers) {
      onClearAllPlayers();
    }
    setIsDeleteModalOpen(false);
  };

  return (
    <div className="w-full space-y-6">
      {/* ÜST BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2">
            Oyuncu Havuzu
          </h1>
          <p className="text-xs text-cyan-200/60 font-medium">
            {players.length} oyuncu kayıtlı
          </p>
        </div>

        {/* SAĞ ÜST BUTONLAR */}
        <div className="flex flex-wrap items-center gap-3">
          {/* SIRALAMA COMBOBOX */}
          <div className="relative flex items-center">
            <ArrowUpDown className="absolute left-3.5 w-4 h-4 text-[#00d2ff] pointer-events-none" />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="pl-10 pr-8 py-2.5 bg-[#061427] border border-[#00d2ff]/40 rounded-xl text-xs font-bold text-cyan-100 focus:outline-none focus:border-[#00d2ff] transition cursor-pointer appearance-none uppercase tracking-wider shadow-[0_0_12px_rgba(0,210,255,0.15)]"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#091734] text-white">
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="absolute right-3 pointer-events-none text-cyan-400/60 text-[10px]">▼</div>
          </div>

          {/* OYUNCU EKLE BUTONU */}
          <button
            type="button"
            onClick={onAddPlayerClick}
            className="px-4 py-2.5 bg-[#0a2332]/80 hover:bg-[#0e3045] border border-[#00d2ff]/50 hover:border-[#00d2ff] rounded-2xl text-xs font-bold text-[#00d2ff] uppercase tracking-wider flex items-center gap-2 transition cursor-pointer shadow-[0_0_15px_rgba(0,210,255,0.2)] active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Oyuncu Ekle
          </button>

          {/* TÜMÜNÜ SİL BUTONU */}
          {players.length > 0 && (
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="px-4 py-2.5 bg-red-950/60 hover:bg-red-900 border border-red-500/40 hover:border-red-400 rounded-xl text-xs font-black text-red-200 uppercase tracking-wider flex items-center gap-2 transition shadow-[0_0_15px_rgba(239,68,68,0.15)] cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-red-400" /> Tümünü Sil
            </button>
          )}
        </div>
      </div>

      {/* GRİD ALANI */}
      {sortedPlayers.length === 0 ? (
        <div className="text-center py-16 bg-[#061127]/40 rounded-3xl border border-cyan-900/30">
          <p className="text-sm text-cyan-300/60 font-medium">Henüz oyuncu eklenmemiş.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {sortedPlayers.map((playerItem) => (
            <div
              key={playerItem.id}
              onClick={() => {
                if (onEditPlayer) {
                  onEditPlayer(playerItem);
                }
              }}
              className="cursor-pointer transition transform hover:-translate-y-1 hover:scale-[1.02]"
            >
              <PlayerCard
                player={playerItem}
                onCardClick={() => {
                  if (onEditPlayer) {
                    onEditPlayer(playerItem);
                  }
                }}
                onEdit={
                  onEditPlayer
                    ? () => onEditPlayer(playerItem)
                    : undefined
                }
                onDelete={
                  onDeletePlayer
                    ? (e?: any) => {
                        if (e && typeof e.stopPropagation === 'function') {
                          e.stopPropagation();
                        }
                        onDeletePlayer(playerItem.id);
                      }
                    : undefined
                }
              />
            </div>
          ))}
        </div>
      )}

      {/* SİLME MODALI */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
          <div className="relative w-full max-w-sm bg-gradient-to-br from-[#1a0909] via-[#0f0404] to-[#050101] border border-red-500/30 rounded-3xl p-6 text-center text-white shadow-[0_0_35px_rgba(239,68,68,0.35)]">
            <div className="w-12 h-12 mx-auto mb-4 bg-red-500/20 border border-red-500/40 rounded-full flex items-center justify-center text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-black uppercase text-red-200 tracking-wider mb-2">
              Tüm Havuz Silinsin mi?
            </h3>
            <p className="text-xs text-zinc-400 mb-6 font-medium leading-relaxed">
              Havuzdaki <span className="text-white font-bold">{players.length} oyuncunun tümü</span> kalıcı olarak silinecek. Bu işlem geri alınamaz!
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-3 bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-600/40 text-zinc-300 font-bold text-xs rounded-xl uppercase tracking-wider transition cursor-pointer"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 border border-red-400/80 text-white font-black text-xs rounded-xl uppercase tracking-wider transition shadow-[0_0_15px_rgba(239,68,68,0.4)] cursor-pointer"
              >
                Evet, Hepsini Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}