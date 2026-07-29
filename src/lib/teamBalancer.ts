export interface Player {
    id: string;
    name: string;
    overall: number;
    positions: {
      gk: number;
      def: number;
      mid: number;
      fwd: number;
    };
    mainPosition?: "gk" | "def" | "mid" | "fwd";
  }
  
  export interface Formation {
    gk: number;
    def: number;
    mid: number;
    fwd: number;
  }
  
  export type DraftMode = "overall" | "positional";
  
  export interface TeamBalancerInput {
    players: Player[];
    teamSize: number;
    formation: Formation;
    mode: DraftMode;
  }
  
  export interface BalancedTeamsResult {
    teamA: Player[];
    teamB: Player[];
    stats: {
      teamAAvg: number;
      teamBAvg: number;
      diff: number;
    };
  }
  
  /**
    * 🧠 AKILLI TAKIM OLUŞTURMA ALGORİTMASI
    */
  export function generateSmartTeams({
    players,
    teamSize,
    formation,
    mode,
  }: TeamBalancerInput): BalancedTeamsResult {
    if (players.length < teamSize * 2) {
      throw new Error(`Yetersiz oyuncu! En az ${teamSize * 2} oyuncu seçilmelidir.`);
    }
  
    const pool = [...players];
  
    // 1. AŞAMA: KALECİLERİ AYIR VE DAĞIT
    // Kaleci yeteneği en yüksek 2 kişiyi buluyoruz
    pool.sort((a, b) => (b.positions?.gk || b.overall) - (a.positions?.gk || a.overall));
    
    const teamA: Player[] = [];
    const teamB: Player[] = [];
  
    if (pool.length >= 2) {
      teamA.push(pool.shift()!); // En iyi kaleci A takımına
      teamB.push(pool.shift()!); // İkinci en iyi kaleci B takımına
    }
  
    // 2. AŞAMA: KALAN OYUNCULARI DRAFT MODUNA GÖRE SIRALA & YILAN (SNAKE) DRAFT
    if (mode === "overall") {
      // ⚡ GENEL RATING MODU: Oyuncuları sadece genel OVR puanına göre sırala
      pool.sort((a, b) => b.overall - a.overall);
  
      // Yılan Sıralaması: A -> B -> B -> A -> A -> B...
      pool.forEach((player, index) => {
        const cycle = index % 4;
        if (cycle === 0 || cycle === 3) {
          teamA.push(player);
        } else {
          teamB.push(player);
        }
      });
  
    } else {
      // 🛡️ MEVKİ RATINGİ MODU: Defans, Orta Saha ve Forvetleri kendi mevkilerine göre dağıt
      const remainingDef = formation.def;
      const remainingMid = formation.mid;
      const remainingFwd = formation.fwd;
  
      // Mevki bazlı sıralayıp snake draft uygula
      const distributeByPosition = (
        posKey: "def" | "mid" | "fwd",
        countPerTeam: number
      ) => {
        pool.sort((a, b) => (b.positions?.[posKey] || b.overall) - (a.positions?.[posKey] || a.overall));
  
        let added = 0;
        const targetToAdd = countPerTeam * 2;
  
        for (let i = 0; i < pool.length && added < targetToAdd; i++) {
          const player = pool[i];
          if (!teamA.includes(player) && !teamB.includes(player)) {
            // Yılan sırası
            if (added % 4 === 0 || added % 4 === 3) {
              teamA.push(player);
            } else {
              teamB.push(player);
            }
            added++;
          }
        }
      };
  
      // Sırasıyla Defans, Orta Saha ve Forvetleri adil dağıt
      distributeByPosition("def", remainingDef);
      distributeByPosition("mid", remainingMid);
      distributeByPosition("fwd", remainingFwd);
  
      // Eşleşmeyen kalan oyuncu varsa OVR'a göre tamamla
      pool.forEach((player) => {
        if (!teamA.includes(player) && !teamB.includes(player)) {
          if (teamA.length <= teamB.length) {
            teamA.push(player);
          } else {
            teamB.push(player);
          }
        }
      });
    }
  
    // 3. AŞAMA: SWAP (TAKAS İNCE AYAR) OPTİMİZASYONU
    // Kaleciler dışındaki oyuncuların yerlerini değiştirerek güç farkını minimuma indir
    optimizeWithSwaps(teamA, teamB, mode);
  
    // STATİSTİK HESAPLAMA
    const teamAAvg = calculateTeamAvg(teamA);
    const teamBAvg = calculateTeamAvg(teamB);
    const diff = Number(Math.abs(teamAAvg - teamBAvg).toFixed(1));
  
    return {
      teamA,
      teamB,
      stats: {
        teamAAvg,
        teamBAvg,
        diff,
      },
    };
  }
  
  /**
    * 🔄 TAKAS OPTİMİZASYON FONKSİYONU
    * A ve B takımındaki oyuncuları 1v1 takas ederek güç farkını 0'a yaklaştırır.
    */
  function optimizeWithSwaps(teamA: Player[], teamB: Player[], mode: DraftMode) {
    let improved = true;
  
    // Kaleciler sabit kalsın diye 1. indeksten (index 0 kaleci) itibaren takas deniyoruz
    while (improved) {
      improved = false;
      let currentDiff = Math.abs(calculateTeamAvg(teamA) - calculateTeamAvg(teamB));
  
      for (let i = 1; i < teamA.length; i++) {
        for (let j = 1; j < teamB.length; j++) {
          // Geçici takas yap
          const tempA = teamA[i];
          const tempB = teamB[j];
  
          teamA[i] = tempB;
          teamB[j] = tempA;
  
          const newDiff = Math.abs(calculateTeamAvg(teamA) - calculateTeamAvg(teamB));
  
          // Eğer takas farkı düşürdüyse koru, düşürmediyse geri al
          if (newDiff < currentDiff - 0.05) {
            currentDiff = newDiff;
            improved = true;
          } else {
            // Geri al
            teamA[i] = tempA;
            teamB[j] = tempB;
          }
        }
      }
    }
  }
  
  /**
    * 📊 TAKIM ORTALAMA HESAPLAMA
    */
  function calculateTeamAvg(team: Player[]): number {
    if (team.length === 0) return 0;
    const total = team.reduce((sum, p) => sum + (p.overall || 0), 0);
    return Number((total / team.length).toFixed(1));
  }