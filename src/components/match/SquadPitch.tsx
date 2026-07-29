'use client';

import React, { useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { PlayerCard } from './PlayerCard';
import { Zap, Shield, RefreshCw, ArrowLeft, Trophy, Users } from 'lucide-react';

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

export function SquadPitch() {
  const {
    draftResult,
    teamConfig,
    generateDraft,
    draftMode,
    attendance = [],
    setActiveTab,
  } = useApp();

  // Eğer ilk kez bu sayfaya gelindiyse ve yoklamadaki oyuncular seçiliyse otomatik draft oluştur
  useEffect(() => {
    if (!draftResult && attendance.length > 0) {
      generateDraft();
    }
  }, [draftResult, attendance.length, generateDraft]);

  // Akıllı Mevki Dizilim Algoritması
  const arrangePlayersByFormation = (playersList: any[]) => {
    if (!playersList || playersList.length === 0) {
      return { gk: [], def: [], mid: [], fwd: [] };
    }

    // Güvenli şekilde formasyon metnini alıp dizilimi parçalıyoruz
    const formationStr = getFormationString(teamConfig?.formation);
    const parts = formationStr.split('-').map((n) => parseInt(n, 10) || 0);

    const targetDef = parts.length === 4 ? parts[1] : parts[0] || 2;
    const targetMid = parts.length === 4 ? parts[2] : parts[1] || 2;
    const targetFwd = parts.length === 4 ? parts[3] : parts[2] || 2;

    const pool = [...playersList];
    const result = { gk: [] as any[], def: [] as any[], mid: [] as any[], fwd: [] as any[] };

    const getRawPos = (p: any) => {
      const raw = p.position || p.mainPosition || p.pos || p.role || '';
      return Array.isArray(raw) ? raw.join(' ') : String(raw);
    };

    const pullByPosition = (targetPosStr: string) => {
      const idx = pool.findIndex((p) =>
        getRawPos(p).toUpperCase().includes(targetPosStr.toUpperCase())
      );
      if (idx !== -1) return pool.splice(idx, 1)[0];
      return null;
    };

    // Kaleci
    const gk = pullByPosition('KALECİ') || pullByPosition('GK') || pool.shift();
    if (gk) result.gk.push(gk);

    // Defans
    for (let i = 0; i < targetDef; i++) {
      const p = pullByPosition('DEFANS') || pullByPosition('DEF');
      if (p) result.def.push(p);
    }

    // Orta Saha
    for (let i = 0; i < targetMid; i++) {
      const p = pullByPosition('ORTA') || pullByPosition('MID');
      if (p) result.mid.push(p);
    }

    // Forvet
    for (let i = 0; i < targetFwd; i++) {
      const p = pullByPosition('FORVET') || pullByPosition('FWD');
      if (p) result.fwd.push(p);
    }

    // Artan oyuncuları yerleştir
    while (pool.length > 0) {
      const leftover = pool.shift();
      if (result.def.length < targetDef) result.def.push(leftover);
      else if (result.mid.length < targetMid) result.mid.push(leftover);
      else result.fwd.push(leftover);
    }

    return result;
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
          <button
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
          </button>
        </div>
      </div>
    );
  }

  // Takım verileri
  const teamAPlayers = draftResult?.teamA?.players || draftResult?.teamA || [];
  const teamBPlayers = draftResult?.teamB?.players || draftResult?.teamB || [];

  const teamAName = teamConfig?.teamAName || 'CODEX BLUE';
  const teamBName = teamConfig?.teamBName || 'CODEX RED';

  // Takım Ortalama Hesaplama
  const calcAvgRating = (players: any[]) => {
    if (!players || players.length === 0) return 0;
    const sum = players.reduce((acc, p) => acc + (p.overall || p.rating || p.ovr || 80), 0);
    return (sum / players.length).toFixed(1);
  };

  const teamAAvg = calcAvgRating(teamAPlayers);
  const teamBAvg = calcAvgRating(teamBPlayers);

  // Mevki Rozeti Yardımcısı
  const getPosBadge = (player: any) => {
    const rawStr = Array.isArray(player.position || player.mainPosition || player.pos || player.role)
      ? (player.position || player.mainPosition || player.pos || player.role).join(' ')
      : String(player.position || player.mainPosition || player.pos || player.role || '');
    
    const upper = rawStr.toUpperCase();
    if (upper.includes('KALECİ') || upper.includes('GK')) return { text: 'KL', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
    if (upper.includes('DEFANS') || upper.includes('DEF')) return { text: 'DEF', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' };
    if (upper.includes('ORTA') || upper.includes('MID')) return { text: 'ORT', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
    if (upper.includes('FORVET') || upper.includes('FWD')) return { text: 'FOR', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
    return { text: 'OYO', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' };
  };

  // Tekil Takım Görünümü
  const SingleTeamSection = ({
    teamName,
    players,
    avgRating,
  }: {
    teamName: string;
    players: any[];
    avgRating: string;
  }) => {
    const layout = arrangePlayersByFormation(players);

    return (
      <div className="flex flex-col lg:flex-row gap-6 items-stretch w-full max-w-7xl mx-auto">
        
        {/* SOL PANEL: TAKIM ADI & KADRO LİSTESİ */}
        <div className="w-full lg:w-80 flex flex-col justify-between gap-4 bg-slate-950/80 backdrop-blur-md border border-cyan-500/30 rounded-3xl p-6 shadow-2xl shadow-cyan-950/20">
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-sky-300 to-indigo-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
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
                {players.map((player: any, idx: number) => {
                  const badge = getPosBadge(player);
                  const rating = player.overall || player.rating || player.ovr || 80;

                  return (
                    <div
                      key={player.id || idx}
                      className="flex items-center justify-between bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/40 rounded-xl px-3 py-2 transition-all"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badge.color}`}>
                          {badge.text}
                        </span>
                        <span className="text-xs font-bold text-zinc-200 truncate max-w-[140px]">
                          {player.name || player.fullName}
                        </span>
                      </div>

                      <span className="text-xs font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                        {rating}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="text-[10px] text-center font-bold text-cyan-500/50 uppercase tracking-widest pt-2 border-t border-cyan-500/10">
            Codex Tactical Board
          </div>
        </div>

        {/* SAĞ TARAF: 2D SAHA */}
        <div className="flex-1 w-full relative min-h-[660px] flex items-center justify-center p-2 sm:p-4 overflow-hidden">
          
          <div className="relative w-full h-[640px] bg-gradient-to-b from-blue-950/90 via-slate-950/95 to-blue-950/90 rounded-3xl border-2 border-cyan-400/40 shadow-[0_0_50px_rgba(34,211,238,0.2)]">
            
            {/* SAHA ÇİZGİLERİ */}
            <div className="absolute inset-4 border-2 border-cyan-300/30 rounded-2xl pointer-events-none">
              <div className="absolute top-1/2 inset-x-0 h-0.5 bg-cyan-300/30" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-44 border-2 border-cyan-300/30 rounded-full" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 border-b-2 border-x-2 border-cyan-300/30" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-32 border-t-2 border-x-2 border-cyan-300/30" />
            </div>

            {/* OYUNCU KARTLARI */}
            <div className="absolute inset-0 z-20 pointer-events-auto">
              
              {/* 1. FORVET BLOĞU */}
              <div className="absolute top-[25px] inset-x-0 flex justify-around items-center h-[128px] w-full max-w-3xl mx-auto px-6">
                {layout.fwd.map((player: any, idx: number) => (
                  <div
                    key={player.id || idx}
                    className="w-24 h-32 flex-shrink-0 flex items-center justify-center transform hover:scale-105 transition-all"
                  >
                    <PlayerCard player={player} compact />
                  </div>
                ))}
              </div>

              {/* 2. ORTA SAHA BLOĞU */}
              <div className="absolute top-[180px] inset-x-0 flex justify-around items-center h-[128px] w-full max-w-3xl mx-auto px-6">
                {layout.mid.map((player: any, idx: number) => (
                  <div
                    key={player.id || idx}
                    className="w-24 h-32 flex-shrink-0 flex items-center justify-center transform hover:scale-105 transition-all"
                  >
                    <PlayerCard player={player} compact />
                  </div>
                ))}
              </div>

              {/* 3. DEFANS BLOĞU */}
              <div className="absolute top-[345px] inset-x-0 flex justify-around items-center h-[128px] w-full max-w-3xl mx-auto px-6">
                {layout.def.map((player: any, idx: number) => (
                  <div
                    key={player.id || idx}
                    className="w-24 h-32 flex-shrink-0 flex items-center justify-center transform hover:scale-105 transition-all"
                  >
                    <PlayerCard player={player} compact />
                  </div>
                ))}
              </div>

              {/* 4. KALECİ BLOĞU */}
              <div className="absolute top-[490px] inset-x-0 flex justify-center items-center h-[128px] w-full px-6">
                {layout.gk.map((player: any, idx: number) => (
                  <div
                    key={player.id || idx}
                    className="w-24 h-32 flex-shrink-0 flex items-center justify-center transform hover:scale-105 transition-all"
                  >
                    <PlayerCard player={player} compact />
                  </div>
                ))}
              </div>

            </div>

          </div>

        </div>

      </div>
    );
  };

  return (
    <div className="w-full space-y-8 py-2">
      {/* 🎯 KONTROL VE BİLGİ BARI */}
      <div className="max-w-7xl mx-auto rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* AKTİF DENGELEME MODU ROZETİ */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            {draftMode === 'overall' ? <Zap className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-400">Aktif Kriter:</span>
              <span className="text-xs font-black uppercase text-cyan-300 bg-cyan-950/80 border border-cyan-500/30 px-2.5 py-0.5 rounded-md">
                {draftMode === 'overall' ? '⚡ Genel Rating (OVR)' : '🛡️ Mevki Dağılımlı'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Takımlar bu kritere göre dengelenmiştir.
            </p>
          </div>
        </div>

        {/* YENİDEN OLUŞTUR VE DÜZENLE BUTONLARI */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
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
          </button>
        </div>
      </div>

      {/* 1. TAKIM */}
      <SingleTeamSection teamName={teamAName} players={teamAPlayers} avgRating={teamAAvg} />

      {/* İKİ TAKIM AYIRACI */}
      <div className="relative flex py-2 items-center justify-center max-w-7xl mx-auto">
        <div className="flex-grow border-t border-cyan-500/20"></div>
        <span className="flex-shrink mx-4 text-cyan-400 font-black text-xs tracking-widest uppercase bg-slate-900 border border-cyan-500/30 px-5 py-2 rounded-full shadow-lg shadow-cyan-950/50">
          VS
        </span>
        <div className="flex-grow border-t border-cyan-500/20"></div>
      </div>

      {/* 2. TAKIM */}
      <SingleTeamSection teamName={teamBName} players={teamBPlayers} avgRating={teamBAvg} />
    </div>
  );
}