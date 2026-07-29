'use client';

import React, { useState, useEffect } from 'react';
import { X, Star, Trash2, Plus } from 'lucide-react';

interface PositionItem {
  code: 'GK' | 'DEF' | 'MID' | 'FWD';
  label: string;
  rating: number;
  isMain: boolean;
}

interface PlayerModalProps {
  isOpen?: boolean;
  open?: boolean;
  show?: boolean;
  onClose: () => void;
  onSave?: (playerData: any) => void;
  onSubmit?: (playerData: any) => void;
  initialPlayer?: any;
  player?: any;
  editingPlayer?: any;
  playerToEdit?: any;
}

const POSITIONS = [
  { code: 'GK', label: 'Kaleci' },
  { code: 'DEF', label: 'Defans' },
  { code: 'MID', label: 'Orta Saha' },
  { code: 'FWD', label: 'Forvet' },
];

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
}: PlayerModalProps) {
  const isModalOpen = isOpen ?? open ?? show ?? false;
  const activePlayer = initialPlayer || player || editingPlayer || playerToEdit || null;
  const handleSaveCallback = onSave || onSubmit;

  const [name, setName] = useState('');
  const [positions, setPositions] = useState<PositionItem[]>([]);
  const [selectedPosCode, setSelectedPosCode] = useState<string>('GK');
  const [ratingInput, setRatingInput] = useState<number | string>(50);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 🛡️ KOD -> ETİKET EŞLEŞTİRME YARDIMCISI
  const getLabelByCode = (codeStr: string): string => {
    const found = POSITIONS.find((p) => p.code === codeStr);
    if (found) return found.label;
    if (codeStr === 'GK' || codeStr === 'KL') return 'Kaleci';
    if (codeStr === 'DEF') return 'Defans';
    if (codeStr === 'MID') return 'Orta Saha';
    if (codeStr === 'FWD' || codeStr === 'ST') return 'Forvet';
    return codeStr || 'Kaleci';
  };

  useEffect(() => {
    if (activePlayer) {
      setName(activePlayer.name || activePlayer.fullName || '');

      let rawPositions = activePlayer.positions;

      // JSON String olarak geldiyse parse et
      if (typeof rawPositions === 'string') {
        try {
          rawPositions = JSON.parse(rawPositions);
        } catch {}
      }

      if (Array.isArray(rawPositions) && rawPositions.length > 0) {
        // 🎯 MEVKİ LİSTESİNİ GÜVENLE FORMATLA VE REYTİNG/LABEL UYUŞMAZLIĞINI DÜZELT
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

          const isMainVal = typeof item === 'object'
            ? Boolean(item.isMain ?? item.ISMAIN ?? idx === 0)
            : idx === 0;

          return {
            code: cleanCode as any,
            label: labelVal,
            rating: Number(ratingVal) || 50,
            isMain: isMainVal,
          };
        });

        setPositions(formatted);
      } else {
        // GÜVENLİ MEVKİ DÖNÜŞTÜRME
        const rawPos = activePlayer.mainPosition || activePlayer.position || 'GK';
        const posStr =
          typeof rawPos === 'object' && rawPos !== null
            ? String(rawPos.code || rawPos.label || rawPos.name || 'GK')
            : String(rawPos || 'GK');

        const ovr = Number(activePlayer.overall || activePlayer.rating || 50);
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
      setRatingInput(50);
      setSelectedPosCode('GK');
    }
    setErrorMsg(null);
  }, [activePlayer, isModalOpen]);

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
    setRatingInput(num);
  };

  const handleRatingBlur = () => {
    if (typeof ratingInput === 'string' || ratingInput < 50) {
      setRatingInput(50);
    }
  };

  const handleAddPosition = () => {
    setErrorMsg(null);
    const existing = positions.find((p) => p.code === selectedPosCode);
    if (existing) {
      setErrorMsg('Bu mevki zaten eklenmiş!');
      return;
    }

    const currentRating = typeof ratingInput === 'number' && ratingInput >= 50 ? ratingInput : 50;
    const posMeta = POSITIONS.find((p) => p.code === selectedPosCode)!;

    const newPosItem: PositionItem = {
      code: posMeta.code as any,
      label: posMeta.label,
      rating: currentRating,
      isMain: positions.length === 0,
    };

    setPositions([...positions, newPosItem]);
    setRatingInput(50);
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
        filtered[0].isMain = true;
      }
      return filtered;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Lütfen oyuncu ismini giriniz.');
      return;
    }
    if (positions.length === 0) {
      setErrorMsg('En az bir mevki girmelisiniz!');
      return;
    }

    const mainPosItem = positions.find((p) => p.isMain) || positions[0];

    const playerData = {
      ...activePlayer,
      id: activePlayer?.id || Date.now().toString(),
      name: name.trim(),
      overall: mainPosItem.rating,
      position: mainPosItem.code,
      mainPosition: mainPosItem.code,
      positions: positions,
    };

    if (handleSaveCallback) {
      handleSaveCallback(playerData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-[#18181b] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden text-white">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-bold text-zinc-100">
            {activePlayer ? 'Oyuncu Düzenle' : 'Yeni Oyuncu Ekle'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">İsim</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Ahmet Yılmaz"
              className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700/60 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-red-500 mb-1.5">Pozisyon</label>
            <div className="flex items-center gap-2">
              <select
                value={selectedPosCode}
                onChange={(e) => setSelectedPosCode(e.target.value)}
                className="flex-1 px-3 py-2.5 bg-zinc-900 border border-zinc-700/60 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                {POSITIONS.map((pos) => (
                  <option key={pos.code} value={pos.code}>
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
                placeholder="50"
                className="w-20 px-3 py-2.5 bg-zinc-900 border border-zinc-700/60 rounded-lg text-sm text-center text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="button"
              onClick={handleAddPosition}
              className="w-full mt-2.5 py-2.5 bg-red-600/90 hover:bg-red-600 text-white font-bold text-xs rounded-lg uppercase tracking-wider flex items-center justify-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" /> Pozisyon Ekle
            </button>
          </div>

          {positions.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <span className="block text-[11px] font-semibold text-zinc-400">
                Eklenen Mevkiler (Yıldız: Ana Mevki)
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {positions.map((item) => (
                  <div
                    key={item.code}
                    className={`flex items-center justify-between p-2.5 rounded-lg border transition ${
                      item.isMain
                        ? 'bg-amber-500/10 border-amber-500/40'
                        : 'bg-zinc-900/60 border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleSetMain(item.code)}
                        title={item.isMain ? 'Ana Mevki' : 'Ana Mevki Yap'}
                        className="p-1 rounded hover:bg-zinc-800 transition"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            item.isMain
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-zinc-500 hover:text-amber-300'
                          }`}
                        />
                      </button>
                      <span className="text-xs font-bold text-zinc-200">
                        {item.label || getLabelByCode(item.code)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                        {item.rating || 50}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeletePosition(item.code)}
                        className="text-zinc-500 hover:text-red-400 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs rounded-lg transition"
            >
              İptal
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition"
            >
              Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}