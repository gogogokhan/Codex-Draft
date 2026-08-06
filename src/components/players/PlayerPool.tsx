'use client';

import React, { useState, useMemo } from 'react';
import { ArrowUpDown, Trash2, AlertTriangle, Plus, ListChecks, CheckCheck, Settings, X } from 'lucide-react';
import { PlayerCard } from './PlayerCard';

const SORT_OPTIONS = [
  { value: 'newest', label: 'En Yeni Eklenen' },
  { value: 'rating-desc', label: 'Reyting (En Yüksek)' },
  { value: 'rating-asc', label: 'Reyting (En Düşük)' },
  { value: 'name-asc', label: 'İsim (A ➔ Z)' },
  { value: 'name-desc', label: 'İsim (Z ➔ A)' },
  { value: 'pos-asc', label: 'Mevki (KL ➔ FV)' },
  { value: 'pos-rating', label: 'Mevki, Sonra Reyting' },
  { value: 'rating-pos', label: 'Reyting, Sonra Mevki' },
];

interface PlayerPoolProps {
  players?: any[];
  title?: string;
  onAddPlayerClick?: () => void;
  onClearAllPlayers?: () => void;
  onEditPlayer?: (player: any) => void;
  onDeletePlayer?: (playerId: string) => void;
  onDeletePlayers?: (playerIds: string[]) => Promise<void>;
  onOpenCommunitySettings?: () => void;
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
  title = 'Oyuncu Havuzu',
  onAddPlayerClick,
  onClearAllPlayers,
  onEditPlayer,
  onDeletePlayer,
  onDeletePlayers,
  onOpenCommunitySettings,
}: PlayerPoolProps) {
  const [sortOption, setSortOption] = useState<string>('newest');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null);

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
        // Oyuncu dizisi kayıt zamanına göre yeni -> eski tutulur.
        case 'newest':
          return 0;

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

  const selectedPlayers = players.filter((player) => selectedPlayerIds.has(player.id));
  const areAllPlayersSelected =
    players.length > 0 && selectedPlayerIds.size === players.length;
  const selectedPlayerNames = selectedPlayers.map((player) => player.name || player.fullName);
  const selectedPlayerSummary = selectedPlayerNames.length <= 3
    ? selectedPlayerNames.join(', ')
    : `${selectedPlayerNames.slice(0, 3).join(', ')} ve ${selectedPlayerNames.length - 3} oyuncu daha`;

  const togglePlayerSelection = (playerId: string) => {
    setSelectedPlayerIds((current) => {
      const next = new Set(current);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedPlayerIds(new Set());
    setBulkDeleteError(null);
  };

  const handleConfirmBulkDelete = async () => {
    if (!onDeletePlayers || selectedPlayerIds.size === 0) return;
    setIsBulkDeleting(true);
    setBulkDeleteError(null);
    try {
      await onDeletePlayers(Array.from(selectedPlayerIds));
      setIsBulkDeleteModalOpen(false);
      exitSelectionMode();
    } catch (error) {
      setBulkDeleteError(
        error instanceof Error ? error.message : 'Oyuncular silinirken bir hata oluştu.'
      );
    } finally {
      setIsBulkDeleting(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* ÜST BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2">
            {title}
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

          {!isSelectionMode ? (
            <>
              {onAddPlayerClick && (
                <button
                  type="button"
                  onClick={onAddPlayerClick}
                  className="px-4 py-2.5 bg-[#0a2332]/80 hover:bg-[#0e3045] border border-[#00d2ff]/50 hover:border-[#00d2ff] rounded-2xl text-xs font-bold text-[#00d2ff] uppercase tracking-wider flex items-center gap-2 transition cursor-pointer shadow-[0_0_15px_rgba(0,210,255,0.2)] active:scale-95"
                >
                  <Plus className="w-4 h-4 stroke-[3]" /> Oyuncu Ekle
                </button>
              )}

              {players.length > 0 && onDeletePlayers && (
                <button
                  type="button"
                  onClick={() => setIsSelectionMode(true)}
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-950/40 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-cyan-200 transition hover:border-cyan-400 hover:bg-cyan-900/60"
                >
                  <ListChecks className="h-4 w-4 text-cyan-400" /> Toplu Seçim
                </button>
              )}

              {players.length > 0 && onClearAllPlayers && (
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="px-4 py-2.5 bg-red-950/60 hover:bg-red-900 border border-red-500/40 hover:border-red-400 rounded-xl text-xs font-black text-red-200 uppercase tracking-wider flex items-center gap-2 transition shadow-[0_0_15px_rgba(239,68,68,0.15)] cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-red-400" /> Tümünü Sil
                </button>
              )}

              {onOpenCommunitySettings && (
                <button
                  type="button"
                  onClick={onOpenCommunitySettings}
                  className="flex items-center gap-2 rounded-xl border border-amber-300/45 bg-gradient-to-r from-[#172b4d] to-[#101d39] px-4 py-2.5 text-xs font-black uppercase tracking-wider text-amber-200 shadow-[0_0_15px_rgba(245,190,70,0.12)] transition hover:border-amber-200 hover:text-amber-100 hover:shadow-[0_0_20px_rgba(0,210,255,0.18)]"
                >
                  <Settings className="h-4 w-4" /> Ayarlar
                </button>
              )}
            </>
          ) : (
            <>
              <span className="rounded-xl border border-cyan-500/30 bg-cyan-950/40 px-3 py-2 text-xs font-black text-cyan-200">
                {selectedPlayerIds.size} Oyuncu Seçildi
              </span>
              <button
                type="button"
                aria-pressed={areAllPlayersSelected}
                onClick={() =>
                  setSelectedPlayerIds(
                    areAllPlayersSelected
                      ? new Set()
                      : new Set(players.map((player) => player.id))
                  )
                }
                className={`flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                  areAllPlayersSelected
                    ? "border-cyan-300 bg-cyan-400 text-[#061127] shadow-[0_0_14px_rgba(34,211,238,0.4)] hover:bg-cyan-300"
                    : "border-cyan-500/30 bg-[#081a35] text-cyan-200 hover:border-cyan-400/70"
                }`}
              >
                {areAllPlayersSelected ? (
                  <X className="h-4 w-4" />
                ) : (
                  <CheckCheck className="h-4 w-4" />
                )}
                {areAllPlayersSelected ? "Seçimi Temizle" : "Tümünü Seç"}
              </button>
              <button
                type="button"
                disabled={selectedPlayerIds.size === 0}
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-red-500/50 bg-red-950/60 px-3 py-2.5 text-xs font-black uppercase text-red-200 transition hover:bg-red-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4 text-red-400" /> Seçilenleri Sil
              </button>
              <button
                type="button"
                onClick={exitSelectionMode}
                className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-xs font-bold text-zinc-300 transition hover:bg-zinc-800"
              >
                <X className="h-4 w-4" /> Çık
              </button>
            </>
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
              className="cursor-pointer transition transform hover:-translate-y-1 hover:scale-[1.02]"
            >
              <PlayerCard
                player={playerItem}
                reduced
                selectable={isSelectionMode}
                selected={selectedPlayerIds.has(playerItem.id)}
                isAdmin={!isSelectionMode}
                onClick={
                  isSelectionMode
                    ? () => togglePlayerSelection(playerItem.id)
                    : onEditPlayer
                      ? () => onEditPlayer(playerItem)
                      : undefined
                }
                onDelete={
                  !isSelectionMode && onDeletePlayer
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

      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-3xl border border-red-500/35 bg-gradient-to-br from-[#15102d] via-[#061127] to-[#020617] p-6 text-center text-white shadow-[0_0_35px_rgba(239,68,68,0.25),0_0_50px_rgba(6,182,212,0.12)]">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-red-400/60 bg-red-500/15 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.4)]">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <h3 className="mb-2 text-base font-black uppercase tracking-wider text-red-200">
              {selectedPlayerIds.size} Oyuncu Silinsin mi?
            </h3>
            <p className="text-xs font-medium leading-relaxed text-zinc-400">
              <span className="font-bold text-cyan-100">{selectedPlayerSummary}</span> kalıcı olarak silinecek. Bu işlem geri alınamaz.
            </p>

            {bulkDeleteError && (
              <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300">
                {bulkDeleteError}
              </div>
            )}

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                disabled={isBulkDeleting}
                onClick={() => {
                  setIsBulkDeleteModalOpen(false);
                  setBulkDeleteError(null);
                }}
                className="flex-1 cursor-pointer rounded-xl border border-cyan-500/25 bg-[#081a35] py-3 text-xs font-bold uppercase tracking-wider text-cyan-100/80 transition hover:bg-[#0b2850] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={isBulkDeleting}
                onClick={handleConfirmBulkDelete}
                className="flex-1 cursor-pointer rounded-xl border border-red-400/70 bg-red-600 py-3 text-xs font-black uppercase tracking-wider text-white shadow-[0_0_16px_rgba(239,68,68,0.35)] transition hover:bg-red-500 disabled:cursor-wait disabled:opacity-60"
              >
                {isBulkDeleting ? 'Siliniyor...' : `${selectedPlayerIds.size} Oyuncuyu Sil`}
              </button>
            </div>
          </div>
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
