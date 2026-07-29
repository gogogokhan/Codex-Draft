import { getFormationForTeamSize } from "@/lib/formations";
import {
  calculateTeamPower,
  getBestFieldPosition,
  getRatingForPosition,
} from "@/lib/ratings";
import {
  AssignedPlayer,
  DraftResult,
  FormationSlots,
  Player,
  Position,
  TeamConfig,
} from "@/types";

interface TeamState {
  players: AssignedPlayer[];
  slotCounts: FormationSlots;
}

// --- GÜVENLİ YARDIMCI FONKSİYONLAR ---

function getPrimaryPosition(player: any): string {
  if (!player) return "";
  if (typeof player.position === "string") return player.position;
  if (Array.isArray(player.position)) return player.position[0] || "";
  if (player.position && typeof player.position === "object") {
    return player.position.primary || player.position.main || "";
  }
  return player.mainPosition || player.pos || player.role || "";
}

function getSecondaryPosition(player: any): string | undefined {
  if (!player || typeof player.position !== "object" || Array.isArray(player.position)) {
    return undefined;
  }
  return player.position?.secondary;
}

function getRatingForPos(player: any, pos: string): number {
  if (!player || !player.ratings || typeof player.ratings !== "object") {
    return 0;
  }
  return player.ratings[pos] ?? 0;
}

function getPlayerStrength(player: any): number {
  if (!player) return 50;

  if (typeof player.overall === "number") return player.overall;
  if (typeof player.rating === "number") return player.rating;
  if (typeof player.ovr === "number") return player.ovr;

  if (player.ratings && typeof player.ratings === "object") {
    const ratings = Object.values(player.ratings).filter(
      (v): v is number => typeof v === "number" && v !== undefined && !isNaN(v)
    );
    if (ratings.length > 0) {
      return Math.max(...ratings);
    }
  }

  return 50;
}

function isGoalkeeperCandidate(player: any): boolean {
  if (!player) return false;

  const primaryPos = getPrimaryPosition(player);
  const primary = (primaryPos || "").toUpperCase();
  const gkRating = getRatingForPos(player, "GK");

  return (
    primary === "GK" ||
    primary.includes("KALECİ") ||
    primary.includes("GOAL") ||
    primary.includes("KEEPER") ||
    gkRating >= 75
  );
}

// --- TASLAK MOTORU MANTIĞI ---

function cloneSlots(slots: FormationSlots): FormationSlots {
  return { ...slots };
}

function emptySlots(): FormationSlots {
  return { GK: 0, DEF: 0, MID: 0, FWD: 0 };
}

function canFillSlot(team: TeamState, position: Position, maxSlots: FormationSlots): boolean {
  if (!position || !team?.slotCounts || !maxSlots) return false;
  return (team.slotCounts[position] ?? 0) < (maxSlots[position] ?? 0);
}

function assignPlayer(
  team: TeamState,
  player: Player,
  position: Position
): AssignedPlayer {
  let effectiveRating = 50;
  try {
    effectiveRating = getRatingForPosition(player, position) || getPlayerStrength(player);
  } catch {
    effectiveRating = getPlayerStrength(player);
  }

  const assigned: AssignedPlayer = {
    ...player,
    assignedPosition: position,
    effectiveRating,
  };
  team.players.push(assigned);
  if (team.slotCounts[position] !== undefined) {
    team.slotCounts[position]++;
  }
  return assigned;
}

function resolvePositionForPlayer(
  player: Player,
  team: TeamState,
  maxSlots: FormationSlots,
  preferGk: boolean
): Position {
  const primaryPos = getPrimaryPosition(player);
  const secondaryPos = getSecondaryPosition(player);
  const gkRating = getRatingForPos(player, "GK");

  const isGkCandidate =
    primaryPos.toUpperCase() === "GK" ||
    primaryPos.toUpperCase().includes("KALECİ") ||
    gkRating >= 70;

  if (
    preferGk &&
    isGkCandidate &&
    canFillSlot(team, "GK", maxSlots) &&
    team.slotCounts.GK === 0
  ) {
    return "GK";
  }

  const candidates: Position[] = [];

  if (primaryPos && primaryPos.toUpperCase() !== "GK") {
    candidates.push(primaryPos as Position);
  }
  if (secondaryPos && secondaryPos.toUpperCase() !== "GK") {
    candidates.push(secondaryPos as Position);
  }

  let bestPos: Position = "MID";
  try {
    bestPos = getBestFieldPosition(player) as Position;
  } catch {
    bestPos = "MID";
  }
  candidates.push(bestPos);

  const validPositions: Position[] = ["DEF", "MID", "FWD"];
  const uniqueCandidates = Array.from(new Set(candidates)).filter((p) =>
    validPositions.includes(p)
  );

  for (const pos of uniqueCandidates) {
    if (canFillSlot(team, pos, maxSlots)) {
      return pos;
    }
  }

  const fieldOrder: Position[] = ["DEF", "MID", "FWD"];
  for (const pos of fieldOrder) {
    if (canFillSlot(team, pos, maxSlots)) {
      return pos;
    }
  }

  if (canFillSlot(team, "GK", maxSlots) && team.slotCounts.GK === 0 && isGkCandidate) {
    return "GK";
  }

  return bestPos || "MID";
}

function sortPlayersByStrength(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    const powerA = getPlayerStrength(a);
    const powerB = getPlayerStrength(b);

    if (Math.abs(powerA - powerB) <= 2) {
      return Math.random() - 0.5;
    }

    return powerB - powerA;
  });
}

function createEmptyTeam(maxSlots: FormationSlots): TeamState {
  return {
    players: [],
    slotCounts: emptySlots(),
  };
}

function teamTotalPower(team: TeamState): number {
  if (team.players.length === 0) return 0;
  return team.players.reduce((sum, p) => sum + p.effectiveRating, 0);
}

function tryAssignToTeam(
  team: TeamState,
  player: Player,
  maxSlots: FormationSlots,
  preferGk: boolean
): boolean {
  if (team.players.length >= maxSlots.GK + maxSlots.DEF + maxSlots.MID + maxSlots.FWD) {
    return false;
  }

  const position = resolvePositionForPlayer(player, team, maxSlots, preferGk);
  assignPlayer(team, player, position);
  return true;
}

// 🎯 POZİSYON DENGELİ DRAFT MOTORU
function balanceTeams(
  players: Player[],
  perTeamSlots: FormationSlots
): [TeamState, TeamState] {
  const teamA = createEmptyTeam(perTeamSlots);
  const teamB = createEmptyTeam(perTeamSlots);
  const sorted = sortPlayersByStrength(players);

  // 1. Kalecileri Ayır ve Dağıt
  const gkCandidates = sorted.filter(isGoalkeeperCandidate);
  const others = sorted.filter((p) => !gkCandidates.includes(p));

  if (gkCandidates.length >= 2) {
    const firstTarget = teamTotalPower(teamA) <= teamTotalPower(teamB) ? teamA : teamB;
    const secondTarget = firstTarget === teamA ? teamB : teamA;

    tryAssignToTeam(firstTarget, gkCandidates[0], perTeamSlots, true);
    tryAssignToTeam(secondTarget, gkCandidates[1], perTeamSlots, true);

    const remainingGks = gkCandidates.slice(2);
    others.unshift(...remainingGks);
  } else if (gkCandidates.length === 1) {
    const target = teamTotalPower(teamA) <= teamTotalPower(teamB) ? teamA : teamB;
    tryAssignToTeam(target, gkCandidates[0], perTeamSlots, true);
  }

  // 2. Oyuncuları Ana Pozisyonlarına Göre Grupla (DEF, FWD, MID, DİĞER)
  const defs: Player[] = [];
  const mids: Player[] = [];
  const fwds: Player[] = [];
  const rest: Player[] = [];

  for (const p of others) {
    const mainPos = (getPrimaryPosition(p) || "").toUpperCase();
    if (mainPos === "DEF" || mainPos.includes("DEF") || mainPos.includes("STOPER") || mainPos.includes("BEK")) {
      defs.push(p);
    } else if (mainPos === "FWD" || mainPos.includes("FOR") || mainPos.includes("FORVET") || mainPos.includes("SNT")) {
      fwds.push(p);
    } else if (mainPos === "MID" || mainPos.includes("ORT") || mainPos.includes("OS")) {
      mids.push(p);
    } else {
      rest.push(p);
    }
  }

  // Her grubu kendi içinde sırala
  const sortedDefs = sortPlayersByStrength(defs);
  const sortedFwds = sortPlayersByStrength(fwds);
  const sortedMids = sortPlayersByStrength(mids);
  const sortedRest = sortPlayersByStrength(rest);

  // Grupları sırayla (Defanslar, Forvetler, Orta Sahalar) iki takıma adil dağıt
  const positionalGroups = [sortedDefs, sortedFwds, sortedMids, sortedRest];

  for (const group of positionalGroups) {
    for (const player of group) {
      const powerA = teamTotalPower(teamA);
      const powerB = teamTotalPower(teamB);
      const countA = teamA.players.length;
      const countB = teamB.players.length;
      const maxPerTeam =
        perTeamSlots.GK + perTeamSlots.DEF + perTeamSlots.MID + perTeamSlots.FWD;

      let targetTeam: TeamState;
      if (countA >= maxPerTeam) targetTeam = teamB;
      else if (countB >= maxPerTeam) targetTeam = teamA;
      else if (countA !== countB) targetTeam = countA < countB ? teamA : teamB;
      else targetTeam = powerA <= powerB ? teamA : teamB;

      const otherTeam = targetTeam === teamA ? teamB : teamA;

      const assigned = tryAssignToTeam(targetTeam, player, perTeamSlots, false);
      if (!assigned) {
        tryAssignToTeam(otherTeam, player, perTeamSlots, false);
      }
    }
  }

  return [teamA, teamB];
}

function fillMissingSlots(team: TeamState, perTeamSlots: FormationSlots): void {
  const positions: Position[] = ["DEF", "MID", "FWD"];

  for (const pos of positions) {
    while (team.slotCounts[pos] < perTeamSlots[pos]) {
      const flexible = team.players.find(
        (p) =>
          p.assignedPosition !== pos &&
          p.assignedPosition !== "GK" &&
          (p.ratings?.[pos] ?? 0) > 0
      );

      if (flexible) {
        team.slotCounts[flexible.assignedPosition]--;
        flexible.assignedPosition = pos;
        flexible.effectiveRating =
          getRatingForPosition(flexible, pos) || flexible.effectiveRating;
        team.slotCounts[pos]++;
      } else {
        break;
      }
    }
  }
}

export function generateBalancedTeams(
  players: Player[],
  config: TeamConfig
): DraftResult {
  const formation = getFormationForTeamSize(config.teamSize);
  const perTeamSlots = cloneSlots(formation.slots);
  const requiredTotal = config.teamSize * 2;

  if (players.length < requiredTotal) {
    throw new Error(
      `En az ${requiredTotal} oyuncu seçilmeli (${config.teamSize}v${config.teamSize} maç için).`
    );
  }

  const selected = sortPlayersByStrength(players).slice(0, requiredTotal);
  const [teamAState, teamBState] = balanceTeams(selected, perTeamSlots);

  fillMissingSlots(teamAState, perTeamSlots);
  fillMissingSlots(teamBState, perTeamSlots);

  const teamA = teamAState.players;
  const teamB = teamBState.players;

  return {
    teamA,
    teamB,
    teamAPower: calculateTeamPower(teamA),
    teamBPower: calculateTeamPower(teamB),
  };
}

export function swapPlayers(
  draft: DraftResult,
  playerIdA: string,
  playerIdB: string
): DraftResult {
  const teamA = [...draft.teamA];
  const teamB = [...draft.teamB];

  const idxAInA = teamA.findIndex((p) => p.id === playerIdA);
  const idxAInB = teamB.findIndex((p) => p.id === playerIdA);
  const idxBInA = teamA.findIndex((p) => p.id === playerIdB);
  const idxBInB = teamB.findIndex((p) => p.id === playerIdB);

  if (idxAInA >= 0 && idxBInB >= 0) {
    const temp = teamA[idxAInA];
    teamA[idxAInA] = {
      ...teamB[idxBInB],
      assignedPosition: temp.assignedPosition,
      effectiveRating:
        getRatingForPosition(teamB[idxBInB], temp.assignedPosition) ||
        teamB[idxBInB].effectiveRating,
    };
    teamB[idxBInB] = {
      ...temp,
      assignedPosition: teamB[idxBInB].assignedPosition,
      effectiveRating:
        getRatingForPosition(temp, teamB[idxBInB].assignedPosition) ||
        temp.effectiveRating,
    };
  } else if (idxAInB >= 0 && idxBInA >= 0) {
    const temp = teamB[idxAInB];
    teamB[idxAInB] = {
      ...teamA[idxBInA],
      assignedPosition: temp.assignedPosition,
      effectiveRating:
        getRatingForPosition(teamA[idxBInA], temp.assignedPosition) ||
        teamA[idxBInA].effectiveRating,
    };
    teamA[idxBInA] = {
      ...temp,
      assignedPosition: teamB[idxAInB].assignedPosition,
      effectiveRating:
        getRatingForPosition(temp, teamB[idxAInB].assignedPosition) ||
        temp.effectiveRating,
    };
  } else if (idxAInA >= 0 && idxBInA >= 0) {
    const posA = teamA[idxAInA].assignedPosition;
    const posB = teamA[idxBInA].assignedPosition;
    const temp = teamA[idxAInA];
    teamA[idxAInA] = {
      ...teamA[idxBInA],
      assignedPosition: posA,
      effectiveRating:
        getRatingForPosition(teamA[idxBInA], posA) ||
        teamA[idxBInA].effectiveRating,
    };
    teamA[idxBInA] = {
      ...temp,
      assignedPosition: posB,
      effectiveRating:
        getRatingForPosition(temp, posB) || temp.effectiveRating,
    };
  } else if (idxAInB >= 0 && idxBInB >= 0) {
    const posA = teamB[idxAInB].assignedPosition;
    const posB = teamB[idxBInB].assignedPosition;
    const temp = teamB[idxAInB];
    teamB[idxAInB] = {
      ...teamB[idxBInB],
      assignedPosition: posA,
      effectiveRating:
        getRatingForPosition(teamB[idxBInB], posA) ||
        teamB[idxBInB].effectiveRating,
    };
    teamB[idxBInB] = {
      ...temp,
      assignedPosition: posB,
      effectiveRating:
        getRatingForPosition(temp, posB) || temp.effectiveRating,
    };
  }

  return {
    teamA,
    teamB,
    teamAPower: calculateTeamPower(teamA),
    teamBPower: calculateTeamPower(teamB),
  };
}