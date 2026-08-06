'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Star, Trash2, Plus, UserPlus, UserCheck, Ban, Loader2 } from 'lucide-react';
import { formatPlayerName } from '@/lib/playerName';
import { POSITION_LABELS } from '@/lib/positions';

export interface PositionItem {
  code: 'GK' | 'DEF' | 'MID' | 'FWD';
  label: string;
  rating: number;
  isMain: boolean;
}

export interface PlayerModalProps {
  isOpen?: boolean;
  open?: boolean;
  show?: boolean;
  onClose: () => void;
  onSave?: (playerData: any) => Promise<void> | void;
  onSubmit?: (playerData: any) => Promise<void> | void;
  initialPlayer?: any;
  player?: any;
  editingPlayer?: any;
  playerToEdit?: any;
  readOnly?: boolean;
}

const POSITIONS = [
  { code: 'GK', label: POSITION_LABELS.GK },
  { code: 'DEF', label: POSITION_LABELS.DEF },
  { code: 'MID', label: POSITION_LABELS.MID },
  { code: 'FWD', label: POSITION_LABELS.FWD },
] as const;

export function PlayerModal({
  isOpen,
  open,
  show,
  onClose,
  onSave,
  onSubmit,
  initialPlayer,
  player,
  editingPlayer,
  playerToEdit,
  readOnly = false,
}: PlayerModalProps) {
  const isModalOpen = Boolean(isOpen ?? open ?? show);
  const activePlayer = initialPlayer || player || editingPlayer || playerToEdit || null;
  const handleSaveCallback = onSave || onSubmit;

  const [name, setName] = useState('');
  const [positions, setPositions] = useState<PositionItem[]>([]);
  const [selectedPosCode, setSelectedPosCode] = useState<string>('');
  const [ratingInput, setRatingInput] = useState<number | string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getLabelByCode = useCallback((codeStr: string): string => {
    const found = POSITIONS.find((p) => p.code === codeStr);
    if (found) return found.label;
    if (codeStr === 'GK' || codeStr === 'KL') return POSITION_LABELS.GK;
    if (codeStr === 'DEF') return POSITION_LABELS.DEF;
    if (codeStr === 'MID' || codeStr === 'ORT') return POSITION_LABELS.MID;
    if (codeStr === 'FWD' || codeStr === 'FV' || codeStr === 'ST') return POSITION_LABELS.FWD;
    return codeStr || POSITION_LABELS.GK;
  }, []);

  const handleModalClose = useCallback(() => {
    setSelectedPosCode('');
    setRatingInput('');
    setErrorMsg(null);
    setIsSubmitting(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isModalOpen) return;

    setSelectedPosCode('');
    setRatingInput('');
    setErrorMsg(null);
    setIsSubmitting(false);

    if (activePlayer) {
      setName(activePlayer.name || activePlayer.fullName || '');

      const isPending = activePlayer.ratingStatus === 'pending' || activePlayer.rating_status === 'pending';
      if (isPending) {
        setPositions([]);
        return;
      }

      let rawPositions = activePlayer.positions || activePlayer.ratings;
      if (typeof rawPositions === 'string') {
        try {
          rawPositions = JSON.parse(rawPositions);
        } catch {
          rawPositions = [];
        }
      }

      if (typeof rawPositions === 'object' && rawPositions !== null && !Array.isArray(rawPositions)) {
        // Bu bir ratings nesnesi: { GK: 80, DEF: 75 }
        const mainPos = activePlayer?.position?.primary || 'MID';
        const formatted: PositionItem[] = Object.entries(rawPositions)
          .filter(([code, rating]) => ['GK', 'DEF', 'MID', 'FWD'].includes(code) && Number(rating) > 0)
          .map(([code, rating]) => ({
            code: code as 'GK' | 'DEF' | 'MID' | 'FWD',
            label: getLabelByCode(code),
            rating: Math.min(99, Math.max(50, Number(rating))),
            isMain: code === mainPos,
          }));
        setPositions(formatted);
      }
      else if (Array.isArray(rawPositions) && rawPositions.length > 0) {
        const formatted: PositionItem[] = rawPositions.map((p: any, idx: number) => {
          let item = p;
          if (typeof item === 'string' && item.trim().startsWith('{')) {
            try { item = JSON.parse(item); } catch {}
          }

          const codeVal = typeof item === 'object'
            ? (item.code || item.CODE || item.primary || 'GK')
            : String(item || 'GK');

          const upperCode = String(codeVal).toUpperCase();
          const cleanCode = (upperCode.includes('GK') || upperCode === 'KL')
            ? 'GK'
            : upperCode.includes('DEF')
            ? 'DEF'
            : upperCode.includes('MID')
            ? 'MID'
            : 'FWD';

          const labelVal = typeof item === 'object'
            ? (item.label || item.LABEL || getLabelByCode(cleanCode))
            : getLabelByCode(cleanCode);

          const ratingVal = typeof item === 'object'
            ? (item.rating ?? item.RATING ?? activePlayer.overall ?? activePlayer.rating ?? 50)
            : (activePlayer.overall ?? activePlayer.rating ?? 50);

          let numericRating = Number(ratingVal) || 50;
          numericRating = Math.min(99, Math.max(50, numericRating));

          const isMainVal = typeof item === 'object'
            ? Boolean(item.isMain ?? item.ISMAIN ?? idx === 0)
            : idx === 0;

          return {
            code: cleanCode as any,
            label: labelVal,
            rating: numericRating,
            isMain: isMainVal,
          };
        });

        setPositions(formatted);
      } else {
        const rawPos = activePlayer.mainPosition || activePlayer.position || 'GK';
        const posStr = typeof rawPos === 'object' && rawPos !== null
          ? String(rawPos.code || rawPos.label || rawPos.name || 'GK')
          : String(rawPos || 'GK');

        let ovr = Number(activePlayer.overall || activePlayer.rating || 50);
        ovr = Math.min(99, Math.max(50, ovr));

        const posUpper = posStr.toUpperCase();
        const cleanCode = (posUpper.includes('GK') || posUpper === 'KL')
          ? 'GK'
          : posUpper.includes('DEF')
          ? 'DEF'
          : posUpper.includes('MID')
          ? 'MID'
          : 'FWD';

        setPositions([
          {
            code: cleanCode as any,
            label: getLabelByCode(cleanCode),
            rating: ovr,
            isMain: true,
          },
        ]);
      }
    } else {
      setName('');
      setPositions([]);
    }
  }, [activePlayer, isModalOpen, getLabelByCode]);

  if (!isModalOpen) return null;

  const handleRatingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      setRatingInput('');
      return;
    }
    let num = parseInt(val, 10);
    if (isNaN(num)) return;

    if (num > 99) num = 99;
    if (val.length >= 2 && num < 50) num = 50;

    setRatingInput(num);
  };

  const handleRatingBlur = () => {
    if (ratingInput === '' || Number(ratingInput) < 50) {
      setRatingInput(50);
    }
  };

  const handleAddPosition = () => {
    setErrorMsg(null);
    if (!selectedPosCode) {
      setErrorMsg('Lütfen bir pozisyon seçin!');
      return;
    }
    if (positions.some((p) => p.code === selectedPosCode)) {
      setErrorMsg('Bu mevki zaten eklenmiş!');
      return;
    }

    let currentRating = typeof ratingInput === 'number' ? ratingInput : Number(ratingInput) || 50;
    currentRating = Math.min(99, Math.max(50, currentRating));

    const posMeta = POSITIONS.find((p) => p.code === selectedPosCode)!;

    const newPosItem: PositionItem = {
      code: posMeta.code as any,
      label: posMeta.label,
      rating: currentRating,
      isMain: positions.length === 0,
    };

    setPositions((prev) => [...prev, newPosItem]);
    setSelectedPosCode('');
    setRatingInput('');
  };

  const handleUpdatePositionRating = (code: string, rawVal: string) => {
    if (rawVal === '') {
      setPositions((prev) =>
        prev.map((item) => (item.code === code ? { ...item, rating: 0 } : item))
      );
      return;
    }

    let num = parseInt(rawVal, 10);
    if (isNaN(num)) return;

    if (num > 99) num = 99;
    if (rawVal.length >= 2 && num < 50) num = 50;

    setPositions((prev) =>
      prev.map((item) => (item.code === code ? { ...item, rating: num } : item))
    );
  };

  const handlePositionRatingBlur = (code: string, currentVal: number | string) => {
    if (!currentVal || Number(currentVal) < 50) {
      setPositions((prev) =>
        prev.map((item) => (item.code === code ? { ...item, rating: 50 } : item))
      );
    }
  };

  const handleSetMain = (code: string) => {
    setPositions((prev) =>
      prev.map((item) => ({
        ...item,
        isMain: item.code === code,
      }))
    );
  };

  const handleDeletePosition = (code: string) => {
    setPositions((prev) => {
      const filtered = prev.filter((item) => item.code !== code);
      if (filtered.length > 0 && !filtered.some((p) => p.isMain)) {
        return filtered.map((p, idx) => (idx === 0 ? { ...p, isMain: true } : p));
      }
      return filtered;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    if (isSubmitting) return;

    if (!name.trim()) {
      setErrorMsg('Lütfen oyuncu ismini giriniz.');
      return;
    }
    if (positions.length === 0) {
      setErrorMsg('En az bir mevki girmelisiniz!');
      return;
    }

    try {
      setIsSubmitting(true);
      const mainPosItem = positions.find((p) => p.isMain) || positions[0];

      const normalizedPositions = positions.map((p) => ({
        ...p,
        code: p.code,
        rating: Math.max(50, Number(p.rating) || 50),
      }));

      const playerData = {
        ...(activePlayer?.id ? { id: activePlayer.id } : {}),
        name: formatPlayerName(name),
        avatar: activePlayer?.avatar || "🧤",
        overall: Math.max(50, Number(mainPosItem.rating) || 50),
        positions: normalizedPositions,
      };

      if (handleSaveCallback) {
        await handleSaveCallback(playerData);
      }
      handleModalClose();
    } catch (err: any) {
      setErrorMsg('Oyuncu kaydedilirken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
      <div 
        className="relative w-full max-w-md bg-gradient-to-br from-[#122853] via-[#091734] to-[#040a1b] border border-[#00d2ff]/20 rounded-3xl overflow-hidden text-white"
        style={{
          boxShadow: '0 0 30px rgba(0, 210, 255, 0.45), 0 0 70px rgba(0, 102, 255, 0.35), 0 0 100px rgba(0, 50, 180, 0.25)',
        }}
      >
        {/* Üst Başlık Şeridi */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#00d2ff]/25 bg-[#061127]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#D4AF37] rounded-xl text-black flex items-center justify-center">
              {activePlayer ? <UserCheck className="w-5 h-5 stroke-[2.5]" /> : <UserPlus className="w-5 h-5 stroke-[2.5]" />}
            </div>
            <h2 className="text-base font-black tracking-wider text-[#F5D77F] uppercase">
              {readOnly ? 'Oyuncu Detayı' : activePlayer ? 'Oyuncu Düzenle' : 'Yeni Oyuncu Ekle'}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleModalClose}
            className="p-2 rounded-xl text-zinc-300 hover:text-[#00d2ff] hover:bg-blue-900/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-950/90 border border-red-500/50 rounded-xl text-red-200 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* İsim Alanı */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-[#F5D77F] mb-1.5">
              İsim
            </label>
            <input
              type="text"
              autoFocus={!activePlayer && !readOnly}
              value={name}
              onChange={(e) => setName(e.target.value)}
              readOnly={readOnly}
              placeholder="Örn: Ahmet Yılmaz"
              className={`w-full px-4 py-3 bg-[#061127] border border-[#00d2ff]/30 rounded-xl text-sm text-white placeholder-blue-300/40 focus:outline-none transition font-medium ${readOnly ? "cursor-default text-cyan-50/85" : "focus:border-[#00d2ff]"}`}
            />
          </div>

          {/* Pozisyon Ekleme Alanı */}
          {!readOnly && <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-[#F5D77F] mb-1.5">
              Pozisyon & Reyting
            </label>
            <div className="flex items-center gap-2.5">
              <select
                value={selectedPosCode}
                onChange={(e) => setSelectedPosCode(e.target.value)}
                className={`flex-1 px-3.5 py-3 bg-[#061127] border border-[#00d2ff]/30 rounded-xl text-sm focus:outline-none focus:border-[#00d2ff] transition cursor-pointer font-medium ${
                  selectedPosCode ? 'text-white' : 'text-blue-300/40'
                }`}
              >
                <option value="" disabled className="bg-[#0f274e] text-blue-300/40">
                  Mevki Seçin
                </option>
                {POSITIONS.map((pos) => (
                  <option key={pos.code} value={pos.code} className="bg-[#0f274e] text-white">
                    {pos.label}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min={50}
                max={99}
                value={ratingInput}
                onChange={handleRatingChange}
                onBlur={handleRatingBlur}
                placeholder="OVR"
                title="Bu mevkideki oyuncu ratingini girin (50-99)."
                aria-label="Bu mevkideki oyuncu ratingini girin (50-99)."
                className="w-20 px-3 py-3 bg-[#061127] border border-[#00d2ff]/30 rounded-xl text-sm font-black text-center text-[#F5D77F] placeholder-blue-300/40 focus:outline-none focus:border-[#00d2ff] transition"
              />
            </div>

            <button
              type="button"
              onClick={handleAddPosition}
              className="w-full mt-3 py-3 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/60 font-black text-xs rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Pozisyon Ekle
            </button>
          </div>}

          {/* Eklenen Mevkiler Listesi */}
          {positions.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[#00d2ff]/25">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-blue-200/70">
                Eklenen Mevkiler (🌟 Yıldız: Ana Mevki)
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {positions.map((item) => (
                  <div
                    key={item.code}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                      item.isMain
                        ? 'bg-[#00d2ff]/15 border-[#00d2ff]/60'
                        : 'bg-[#061127]/60 border-blue-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => handleSetMain(item.code)}
                        title={item.isMain ? 'Ana Mevki' : readOnly ? 'Alternatif Mevki' : 'Ana Mevki Yap'}
                        className={`p-1 rounded-lg transition ${readOnly ? "cursor-default" : "hover:bg-blue-900/40"}`}
                      >
                        <Star
                          className={`w-4 h-4 ${
                            item.isMain
                              ? 'text-[#F5D77F] fill-[#F5D77F]'
                              : 'text-blue-300/40 hover:text-blue-200'
                          }`}
                        />
                      </button>
                      <span className="text-xs font-bold text-zinc-100">
                        {item.label || getLabelByCode(item.code)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={50}
                        max={99}
                        value={item.rating || ''}
                        onChange={(e) => handleUpdatePositionRating(item.code, e.target.value)}
                        onBlur={() => handlePositionRatingBlur(item.code, item.rating)}
                        readOnly={readOnly}
                        placeholder="OVR"
                        title="Bu mevkideki oyuncu ratingini girin (50-99)."
                        aria-label="Bu mevkideki oyuncu ratingini girin (50-99)."
                        className={`w-14 px-2 py-1 bg-[#040a1b] border border-[#00d2ff]/40 rounded-lg text-xs font-black text-center text-[#F5D77F] placeholder-blue-300/40 focus:outline-none transition ${readOnly ? "cursor-default" : "focus:border-white"}`}
                      />
                      {!readOnly && <button
                        type="button"
                        onClick={() => handleDeletePosition(item.code)}
                        className="text-blue-300/50 hover:text-red-400 transition p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alt Butonlar */}
          <div className="flex items-center gap-3 pt-3 border-t border-[#00d2ff]/25">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleModalClose}
              className={`flex-1 py-3 font-bold text-xs rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 ${readOnly ? "border border-cyan-500/40 bg-cyan-950/70 text-cyan-100 hover:bg-cyan-900/70" : "bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-500/50"}`}
            >
              {readOnly ? <X className="w-4 h-4 stroke-[2.5]" /> : <Ban className="w-4 h-4 stroke-[2.5]" />}
              {readOnly ? 'Kapat' : 'İptal'}
            </button>
            {!readOnly && <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/80 font-black text-xs rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserCheck className="w-4 h-4 stroke-[2.5]" />
              )}
              {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
            </button>}
          </div>
        </form>
      </div>
    </div>
  );
}
