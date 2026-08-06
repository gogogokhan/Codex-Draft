'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { PlayerCard } from './PlayerCard';
import { Zap, Shield, Shuffle, RefreshCw, ArrowLeft, Trophy, Users, ArrowLeftRight, AlertTriangle, X } from 'lucide-react';
import { POSITION_LABELS } from '@/lib/positions';
import type { AssignedPlayer, Player, Position } from '@/types';

// Formasyon ister string ("1-2-2-2") ister obje ({gk:1, def:2...}) gelsin, metne dönüştüren güvenli yardımcı
const getFormationString = (formation: any): string => {
  if (!formation) return '1-2-2-2';
  if (typeof formation === 'string') return formation;
  if (typeof formation === 'object') {
    const f = formation.slots || formation;
    const gk = f.gk ?? f.GK ?? 1;
    const def = f.def ?? f.DEF ?? 2;
    const mid = f.mid ?? f.MID ?? 2;
    const fwd = f.fwd ?? f.FWD ?? 2;
    return `${gk}-${def}-${mid}-${fwd}`;
  }
  return String(formation);
};

interface SquadPitchProps {
  onPlayerClick?: (player: Player) => void;
}

const POSITION_ORDER: Record<Position, number> = {
  GK: 0,
  DEF: 1,
  MID: 2,
  FWD: 3,
};

export function SquadPitch({ onPlayerClick }: SquadPitchProps) {
  const {
    draftResult,
    teamConfig,
    generateDraft,
    draftMode,
    attendance = [],
    setActiveTab,
    canManageMatch,
    communityMatchUpdatedAt,
    swapDraftPlayers,
  } = useApp();

  const [swapSource, setSwapSource] = useState<AssignedPlayer | null>(null);
  const [swapTarget, setSwapTarget] = useState<AssignedPlayer | null>(null);
  const [draggingPlayerId, setDraggingPlayerId] = useState<string | null>(null);
  const [dragOverPlayerId, setDragOverPlayerId] = useState<string | null>(null);
  const suppressClickRef = useRef(false);

  // Eğer ilk kez bu sayfaya gelindiyse ve yoklamadaki oyuncular seçiliyse otomatik draft oluştur
  useEffect(() => {
    if (canManageMatch && !draftResult && attendance.length > 0) {
      generateDraft();
    }
  }, [canManageMatch, draftResult, attendance.length, generateDraft]);

  useEffect(() => {
    if (!swapSource) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSwapSource(null);
        setSwapTarget(null);
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [swapSource]);

  // Draft motorunun kesin atamalarını saha gruplarına dönüştürür.
  const arrangePlayersByFormation = (playersList: any[]) => {
    if (!playersList || playersList.length === 0) {
      return { gk: [], def: [], mid: [], fwd: [] };
    }

    return {
      gk: playersList.filter((player) => player.assignedPosition === 'GK'),
      def: playersList.filter((player) => player.assignedPosition === 'DEF'),
      mid: playersList.filter((player) => player.assignedPosition === 'MID'),
      fwd: playersList.filter((player) => player.assignedPosition === 'FWD'),
    };
  };

  // Henüz draft yapılmadıysa gösterilecek boş durum paneli
  if (!draftResult) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-12 text-center max-w-2xl mx-auto my-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mb-4">
          <Users className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Takımlar Henüz Oluşturulmadı</h3>
        <p className="text-zinc-400 text-sm mb-6">
          Yoklama listesinden yeterli sayıda oyuncu seçtikten sonra takımları otomatik olarak dengeli şekilde oluşturabilirsiniz.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {canManageMatch && <><button
            type="button"
            onClick={() => setActiveTab && setActiveTab('attendance')}
            className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-5 py-2.5 text-xs font-bold text-zinc-200 hover:bg-zinc-700 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Yoklama Listesine Dön</span>
          </button>
          
          <button
            type="button"
            onClick={() => generateDraft()}
            disabled={attendance.length === 0}
            className="flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-xs font-black text-black shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:bg-cyan-300 transition disabled:opacity-50"
          >
            <Zap className="h-4 w-4 fill-black" />
            <span>Takımları Şimdi Oluştur</span>
          </button></>}
        </div>
      </div>
    );
  }

  // Takım verileri
  const teamAPlayers = draftResult.teamA;
  const teamBPlayers = draftResult.teamB;
  const allDraftPlayers = [...teamAPlayers, ...teamBPlayers];

  const getPlayerById = (playerId: string) =>
    allDraftPlayers.find((player) => player.id === playerId);

  const isTeamAPlayer = (playerId: string) =>
    teamAPlayers.some((player) => player.id === playerId);

  const getOpponentPlayers = (playerId: string) =>
    isTeamAPlayer(playerId) ? teamBPlayers : teamAPlayers;

  const closeSwap = () => {
    setSwapSource(null);
    setSwapTarget(null);
  };

  const openPlayerDetails = (player: AssignedPlayer) => {
    if (suppressClickRef.current) return;
    onPlayerClick?.(player);
  };

  const beginDrag = (event: React.DragEvent<HTMLElement>, player: AssignedPlayer) => {
    if (!canManageMatch) return;
    suppressClickRef.current = true;
    setDraggingPlayerId(player.id);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', player.id);
  };

  const dragOverPlayer = (event: React.DragEvent<HTMLElement>, player: AssignedPlayer) => {
    if (!canManageMatch || !draggingPlayerId || draggingPlayerId === player.id) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverPlayerId(player.id);
  };

  const dropOnPlayer = (event: React.DragEvent<HTMLElement>, target: AssignedPlayer) => {
    if (!canManageMatch) return;
    event.preventDefault();
    const sourceId = event.dataTransfer.getData('text/plain') || draggingPlayerId;
    const source = sourceId ? getPlayerById(sourceId) : undefined;
    setDraggingPlayerId(null);
    setDragOverPlayerId(null);
    if (!source || source.id === target.id) return;
    setSwapSource(source);
    setSwapTarget(target);
  };

  const finishDrag = () => {
    setDraggingPlayerId(null);
    setDragOverPlayerId(null);
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 150);
  };

  const swapStateClass = (playerId: string) => {
    if (dragOverPlayerId === playerId) {
      return 'ring-2 ring-cyan-300 ring-offset-2 ring-offset-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.55)]';
    }
    if (draggingPlayerId === playerId) return 'opacity-40';
    return '';
  };

  const confirmSwap = () => {
    if (!swapSource || !swapTarget) return;
    swapDraftPlayers(swapSource.id, swapTarget.id);
    closeSwap();
  };

  const teamAName = teamConfig?.teamAName || 'CODEX BLUE';
  const teamBName = teamConfig?.teamBName || 'CODEX RED';

  // Rozetler, takım oluşturma algoritmasının hesapladığı kesin güç değerlerini kullanır.
  const teamAAvg = Number(draftResult.teamAPower ?? 0).toFixed(1);
  const teamBAvg = Number(draftResult.teamBPower ?? 0).toFixed(1);
  const draftModePresentation =
    draftMode === 'overall'
      ? {
          icon: <Zap className="h-5 w-5" />,
          label: '⚡ Ana Rating',
          description: 'Takımlar kartlarda görünen ana rating değerlerine göre dengelenmiştir.',
        }
      : draftMode === 'positional'
      ? {
          icon: <Shield className="h-5 w-5" />,
          label: '🛡️ Mevki Dağılımlı',
          description: 'Takımlar atanmış mevki ratingleri ve blok güçlerine göre dengelenmiştir.',
        }
      : {
          icon: <Shuffle className="h-5 w-5" />,
          label: '🔀 Rastgele Ata',
          description: 'Takımlar rating dengesi gözetilmeden rastgele oluşturulmuştur.',
        };

  // Mevki Rozeti Yardımcısı
  const getPosBadge = (player: any) => {
    const position = String(
      player.assignedPosition || player.positions?.find((position: any) => position.isMain)?.code || ''
    ).toUpperCase() as Position;

    if (position === 'GK') return { text: POSITION_LABELS.GK, color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
    if (position === 'DEF') return { text: POSITION_LABELS.DEF, color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' };
    if (position === 'MID') return { text: POSITION_LABELS.MID, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
    if (position === 'FWD') return { text: POSITION_LABELS.FWD, color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
    return { text: 'OYO', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' };
  };

  const sortPlayersBySquadOrder = (players: AssignedPlayer[]) =>
    [...players].sort((a, b) => {
      const positionDifference =
        (POSITION_ORDER[a.assignedPosition] ?? 99) -
        (POSITION_ORDER[b.assignedPosition] ?? 99);
      if (positionDifference !== 0) return positionDifference;
      return a.name.localeCompare(b.name, 'tr');
    });

  const TeamPanel = ({
    teamName,
    players,
    avgRating,
  }: {
    teamName: string;
    players: any[];
    avgRating: string;
  }) => {
    const sortedPlayers = sortPlayersBySquadOrder(players);

    return (
      <aside className="flex min-h-[420px] w-full flex-col justify-between gap-4 rounded-3xl border border-cyan-500/30 bg-slate-950/80 p-4 shadow-2xl shadow-cyan-950/20 backdrop-blur-md xl:min-h-[1100px]">
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="truncate text-xl font-black tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-sky-300 to-indigo-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                  {teamName}
                </h2>
                <div className="flex items-center gap-1 bg-amber-400/10 border border-amber-400/30 text-amber-300 px-2 py-0.5 rounded-lg text-xs font-black">
                  <Trophy className="h-3 w-3" />
                  <span>{avgRating}</span>
                </div>
              </div>
              <div className="mt-2">
                <span className="inline-block text-[11px] font-black tracking-widest uppercase px-3 py-1 rounded-full border text-cyan-300 bg-cyan-950/80 border-cyan-400/40 shadow-inner">
                  FORMASYON: {getFormationString(teamConfig?.formation)}
                </span>
              </div>
            </div>

            {/* OYUNCU LİSTESİ */}
            <div className="bg-slate-900/90 border border-cyan-500/20 rounded-2xl p-4 flex flex-col gap-2.5">
              <h3 className="text-xs font-black tracking-wider text-cyan-400 uppercase border-b border-cyan-500/20 pb-2">
                Kadro Listesi ({players.length} Oyuncu)
              </h3>
              
              <div className="flex flex-col gap-2 max-h-[480px] overflow-y-auto pr-1">
                {sortedPlayers.map((player: any, idx: number) => {
                  const badge = getPosBadge(player);
                  const rating = player.overall || player.rating || player.ovr || 80;

                  return (
                    <div
                      key={player.id || idx}
                      role="button"
                      tabIndex={0}
                      draggable={canManageMatch}
                      onDragStart={(event) => beginDrag(event, player)}
                      onDragOver={(event) => dragOverPlayer(event, player)}
                      onDragLeave={() => setDragOverPlayerId((current) => current === player.id ? null : current)}
                      onDrop={(event) => dropOnPlayer(event, player)}
                      onDragEnd={finishDrag}
                      onClick={() => openPlayerDetails(player)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openPlayerDetails(player);
                        }
                      }}
                      className={`flex w-full items-center justify-between bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/60 hover:bg-slate-900 rounded-xl px-3 py-2 transition-all cursor-pointer text-left focus:outline-none focus:ring-1 focus:ring-cyan-400/70 ${swapStateClass(player.id)}`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badge.color}`}>
                          {badge.text}
                        </span>
                        <span className="max-w-[120px] truncate text-xs font-bold text-zinc-200">
                          {player.name || player.fullName}
                        </span>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="text-xs font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                          {rating}
                        </span>
                        {canManageMatch && (
                          <button
                            type="button"
                            title="Rakip takımdan oyuncuyla takas et"
                            aria-label={`${player.name} için takas oyuncusu seç`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setSwapSource(player);
                              setSwapTarget(null);
                            }}
                            onPointerDown={(event) => event.stopPropagation()}
                            className="flex h-6 w-6 items-center justify-center rounded-md border border-cyan-500/25 bg-cyan-950/50 text-cyan-300 transition hover:border-cyan-300/70 hover:bg-cyan-500/20 hover:text-cyan-100 focus:outline-none focus:ring-1 focus:ring-cyan-300"
                          >
                            <ArrowLeftRight className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="text-[10px] text-center font-bold text-cyan-500/50 uppercase tracking-widest pt-2 border-t border-cyan-500/10">
            Codex Tactical Board
          </div>
      </aside>
    );
  };

  const getPitchLineWidthClass = (playerCount: number) => {
    if (playerCount === 1) return 'max-w-[180px] px-0';
    if (playerCount === 2) return 'max-w-[62%] px-0';
    if (playerCount === 3) return 'max-w-[90%] px-5';
    return 'max-w-none px-5 sm:px-10';
  };

  const PitchLine = ({ players, className }: { players: any[]; className: string }) => (
    <div
      className={`absolute inset-x-0 mx-auto flex h-[158px] w-full items-center justify-around ${getPitchLineWidthClass(players.length)} ${className}`}
    >
      {players.map((player: any, idx: number) => (
        <div
          key={player.id || idx}
          draggable={canManageMatch}
          onDragStart={(event) => beginDrag(event, player)}
          onDragOver={(event) => dragOverPlayer(event, player)}
          onDragLeave={() => setDragOverPlayerId((current) => current === player.id ? null : current)}
          onDrop={(event) => dropOnPlayer(event, player)}
          onDragEnd={finishDrag}
          className={`flex h-[158px] w-[110px] shrink-0 cursor-pointer items-center justify-center rounded-xl transition-all hover:scale-105 ${swapStateClass(player.id)}`}
        >
          <div className="scale-[0.96]">
            <PlayerCard player={player} compact onClick={() => openPlayerDetails(player)} />
          </div>
        </div>
      ))}
    </div>
  );

  const SharedPitch = () => {
    const teamA = arrangePlayersByFormation(teamAPlayers);
    const teamB = arrangePlayersByFormation(teamBPlayers);

    return (
      <div className="relative h-[1100px] w-full min-w-0 overflow-hidden rounded-3xl border-2 border-cyan-400/40 bg-gradient-to-b from-emerald-800 via-green-900 to-emerald-950 shadow-[0_0_50px_rgba(16,185,129,0.22)]">
        <div className="pointer-events-none absolute inset-0 opacity-20 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.10)_0,rgba(255,255,255,0.10)_12.5%,rgba(0,0,0,0.08)_12.5%,rgba(0,0,0,0.08)_25%)]" />
        <div className="pointer-events-none absolute inset-4 rounded-2xl border-2 border-cyan-200/40">
          <div className="absolute inset-x-0 top-1/2 h-0.5 bg-cyan-200/40" />
          <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-200/40" />
          <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-200/50" />
          <div className="absolute left-1/2 top-0 h-28 w-[42%] -translate-x-1/2 border-b-2 border-l-2 border-r-2 border-cyan-200/40" />
          <div className="absolute bottom-0 left-1/2 h-28 w-[42%] -translate-x-1/2 border-l-2 border-r-2 border-t-2 border-cyan-200/40" />
        </div>

        <div className="absolute inset-0 z-20">
          <PitchLine players={teamA.gk} className="top-[0px]" />
          <PitchLine players={teamA.def} className="top-[138px]" />
          <PitchLine players={teamA.mid} className="top-[275px]" />
          <PitchLine players={teamA.fwd} className="top-[413px]" />

          <PitchLine players={teamB.fwd} className="top-[529px]" />
          <PitchLine players={teamB.mid} className="top-[667px]" />
          <PitchLine players={teamB.def} className="top-[804px]" />
          <PitchLine players={teamB.gk} className="top-[942px]" />
        </div>
      </div>
    );
  };

  const hasRegisteredPosition = (player: AssignedPlayer, position: Position) =>
    player.positions.some((item) => item.code === position && item.rating > 0);

  const hasPositionMismatch = Boolean(
    swapSource &&
    swapTarget &&
    (!hasRegisteredPosition(swapSource, swapTarget.assignedPosition) ||
      !hasRegisteredPosition(swapTarget, swapSource.assignedPosition))
  );

  const getDisplayRating = (player: AssignedPlayer) =>
    player.overall || player.positions.find((position) => position.isMain)?.rating || player.effectiveRating;

  return (
    <div className="w-full space-y-8 py-2">
      {/* 🎯 KONTROL VE BİLGİ BARI */}
      <div className="max-w-7xl mx-auto rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* AKTİF DENGELEME MODU ROZETİ */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            {draftModePresentation.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-400">Aktif Kriter:</span>
              <span className="text-xs font-black uppercase text-cyan-300 bg-cyan-950/80 border border-cyan-500/30 px-2.5 py-0.5 rounded-md">
                {draftModePresentation.label}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {draftModePresentation.description}
            </p>
            {communityMatchUpdatedAt && <p className="mt-1 text-[10px] font-bold text-violet-300">Son güncelleme: {new Date(communityMatchUpdatedAt).toLocaleString("tr-TR")}</p>}
          </div>
        </div>

        {/* YENİDEN OLUŞTUR VE DÜZENLE BUTONLARI */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {canManageMatch && <><button
            type="button"
            onClick={() => setActiveTab && setActiveTab('attendance')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs font-bold text-zinc-300 hover:bg-zinc-800 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Oyuncu Seçimi</span>
          </button>

          <button
            type="button"
            onClick={() => generateDraft()}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-950/60 px-4 py-2 text-xs font-black text-cyan-300 hover:bg-cyan-900/80 shadow-[0_0_15px_rgba(6,182,212,0.25)] transition"
          >
            <RefreshCw className="h-3.5 w-3.5 text-cyan-400" />
            <span>Yeniden Dengelle</span>
          </button></>}
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[1380px] grid-cols-1 items-stretch gap-4 xl:grid-cols-[260px_minmax(620px,1fr)_260px]">
        <TeamPanel teamName={teamAName} players={teamAPlayers} avgRating={teamAAvg} />
        <SharedPitch />
        <TeamPanel teamName={teamBName} players={teamBPlayers} avgRating={teamBAvg} />
      </div>

      {canManageMatch && swapSource && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeSwap();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="swap-dialog-title"
            className="w-full max-w-md overflow-hidden rounded-3xl border border-cyan-500/35 bg-gradient-to-b from-slate-900 to-slate-950 shadow-[0_0_45px_rgba(6,182,212,0.25)]"
          >
            <header className="flex items-start justify-between border-b border-cyan-500/20 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/35 bg-cyan-500/10 text-cyan-300">
                  <ArrowLeftRight className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">Oyuncu Takası</p>
                  <h2 id="swap-dialog-title" className="mt-1 text-lg font-black text-white">
                    {swapTarget ? 'Oyuncuların Yeri Değiştirilsin mi?' : 'Rakip Oyuncuyu Seç'}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={closeSwap}
                aria-label="Takas penceresini kapat"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            {!swapTarget ? (
              <div className="p-6">
                <p className="mb-4 text-sm text-slate-300">
                  <strong className="text-amber-300">{swapSource.name}</strong> ile yer değiştirecek rakip takım oyuncusunu seç.
                </p>
                <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {sortPlayersBySquadOrder(getOpponentPlayers(swapSource.id)).map((player) => {
                    const badge = getPosBadge(player);
                    return (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => setSwapTarget(player)}
                        className="flex w-full items-center justify-between rounded-xl border border-slate-700/70 bg-slate-950/70 px-4 py-3 text-left transition hover:border-cyan-400/60 hover:bg-cyan-950/30 focus:outline-none focus:ring-1 focus:ring-cyan-300"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <span className={`rounded border px-2 py-0.5 text-[10px] font-black ${badge.color}`}>{badge.text}</span>
                          <span className="truncate text-sm font-bold text-slate-100">{player.name}</span>
                        </div>
                        <span className="rounded-md border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-xs font-black text-amber-300">
                          {getDisplayRating(player)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-5 p-6">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  {[swapSource, swapTarget].map((player, index) => (
                    <React.Fragment key={player.id}>
                      {index === 1 && <ArrowLeftRight className="h-5 w-5 text-cyan-300" />}
                      <div className="rounded-2xl border border-slate-700/70 bg-slate-950/70 p-4 text-center">
                        <div className="text-sm font-black text-white">{player.name}</div>
                        <div className="mt-1 text-xs font-bold text-cyan-300">
                          {POSITION_LABELS[player.assignedPosition]} · {getDisplayRating(player)}
                        </div>
                      </div>
                    </React.Fragment>
                  ))}
                </div>

                {hasPositionMismatch && (
                  <div className="flex gap-3 rounded-xl border border-amber-400/35 bg-amber-400/10 p-3 text-xs leading-relaxed text-amber-200">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Oyunculardan en az birinin hedef mevkisi kayıtlı değil. Takas yapılabilir; ilgili oyuncu hedef slota mevcut ratingiyle yerleştirilecektir.</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSwapTarget(null)}
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-xs font-black text-slate-200 transition hover:bg-slate-700"
                  >
                    GERİ
                  </button>
                  <button
                    type="button"
                    onClick={confirmSwap}
                    className="flex-1 rounded-xl border border-cyan-300/50 bg-cyan-400 px-4 py-3 text-xs font-black text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.35)] transition hover:bg-cyan-300"
                  >
                    TAKASI ONAYLA
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
