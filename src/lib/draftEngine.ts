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

function cloneSlots(slots: FormationSlots): FormationSlots {
  return { ...slots };
}

function emptySlots(): FormationSlots {
  return { GK: 0, DEF: 0, MID: 0, FWD: 0 };
}

function canFillSlot(team: TeamState, position: Position, maxSlots: FormationSlots): boolean {
  return team.slotCounts[position] < maxSlots[position];
}

function assignPlayer(
  team: TeamState,
  player: Player,
  position: Position
): AssignedPlayer {
  const assigned: AssignedPlayer = {
    ...player,
    assignedPosition: position,
    effectiveRating: getRatingForPosition(player, position) || 50,
  };
  team.players.push(assigned);
  team.slotCounts[position]++;
  return assigned;
}

function resolvePositionForPlayer(
  player: Player,
  team: TeamState,
  maxSlots: FormationSlots,
  preferGk: boolean
): Position {
  const isGkCandidate =
    player.position.primary === "GK" || (player.ratings.GK ?? 0) >= 70;

  if (
    preferGk &&
    isGkCandidate &&
    canFillSlot(team, "GK", maxSlots) &&
    team.slotCounts.GK === 0
  ) {
    return "GK";
  }

  const candidates: Position[] = [];

  if (player.position.primary !== "GK") {
    candidates.push(player.position.primary);
  }
  if (player.position.secondary && player.position.secondary !== "GK") {
    candidates.push(player.position.secondary);
  }
  candidates.push(getBestFieldPosition(player));

  const uniqueCandidates = [...new Set(candidates)];

  for (const pos of uniqueCandidates) {
    if (pos !== "GK" && canFillSlot(team, pos, maxSlots)) {
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

  return getBestFieldPosition(player);
}

function getPlayerStrength(player: Player): number {
  const ratings = Object.values(player.ratings).filter(
    (v): v is number => v !== undefined
  );
  return ratings.length > 0 ? Math.max(...ratings) : 50;
}

function sortPlayersByStrength(players: Player[]): Player[] {
  return [...players].sort((a, b) => getPlayerStrength(b) - getPlayerStrength(a));
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

function balanceTeams(
  players: Player[],
  perTeamSlots: FormationSlots
): [TeamState, TeamState] {
  const teamA = createEmptyTeam(perTeamSlots);
  const teamB = createEmptyTeam(perTeamSlots);
  const sorted = sortPlayersByStrength(players);

  const gkCandidates = sorted.filter(
    (p) => p.position.primary === "GK" || (p.ratings.GK ?? 0) >= 75
  );
  const others = sorted.filter((p) => !gkCandidates.includes(p));

  if (gkCandidates.length >= 2) {
    tryAssignToTeam(teamA, gkCandidates[0], perTeamSlots, true);
    tryAssignToTeam(teamB, gkCandidates[1], perTeamSlots, true);
    const remainingGks = gkCandidates.slice(2);
    others.unshift(...remainingGks);
  } else if (gkCandidates.length === 1) {
    const target = teamTotalPower(teamA) <= teamTotalPower(teamB) ? teamA : teamB;
    tryAssignToTeam(target, gkCandidates[0], perTeamSlots, true);
  }

  const pool = others.sort((a, b) => getPlayerStrength(b) - getPlayerStrength(a));

  for (const player of pool) {
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

  return [teamA, teamB];
}

function fillMissingSlots(team: TeamState, perTeamSlots: FormationSlots): void {
  const positions: Position[] = ["GK", "DEF", "MID", "FWD"];

  for (const pos of positions) {
    while (team.slotCounts[pos] < perTeamSlots[pos]) {
      const flexible = team.players.find(
        (p) =>
          p.assignedPosition !== pos &&
          p.assignedPosition !== "GK" &&
          (p.ratings[pos] ?? 0) > 0
      );

      if (flexible) {
        team.slotCounts[flexible.assignedPosition]--;
        flexible.assignedPosition = pos;
        flexible.effectiveRating = getRatingForPosition(flexible, pos) || flexible.effectiveRating;
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
    teamA[idxAInA] = { ...teamB[idxBInB], assignedPosition: temp.assignedPosition, effectiveRating: getRatingForPosition(teamB[idxBInB], temp.assignedPosition) || teamB[idxBInB].effectiveRating };
    teamB[idxBInB] = { ...temp, assignedPosition: teamB[idxBInB].assignedPosition, effectiveRating: getRatingForPosition(temp, teamB[idxBInB].assignedPosition) || temp.effectiveRating };
  } else if (idxAInB >= 0 && idxBInA >= 0) {
    const temp = teamB[idxAInB];
    teamB[idxAInB] = { ...teamA[idxBInA], assignedPosition: temp.assignedPosition, effectiveRating: getRatingForPosition(teamA[idxBInA], temp.assignedPosition) || teamA[idxBInA].effectiveRating };
    teamA[idxBInA] = { ...temp, assignedPosition: teamA[idxBInA].assignedPosition, effectiveRating: getRatingForPosition(temp, teamA[idxBInA].assignedPosition) || temp.effectiveRating };
  } else if (idxAInA >= 0 && idxBInA >= 0) {
    const posA = teamA[idxAInA].assignedPosition;
    const posB = teamA[idxBInA].assignedPosition;
    const temp = teamA[idxAInA];
    teamA[idxAInA] = {
      ...teamA[idxBInA],
      assignedPosition: posA,
      effectiveRating: getRatingForPosition(teamA[idxBInA], posA) || teamA[idxBInA].effectiveRating,
    };
    teamA[idxBInA] = {
      ...temp,
      assignedPosition: posB,
      effectiveRating: getRatingForPosition(temp, posB) || temp.effectiveRating,
    };
  } else if (idxAInB >= 0 && idxBInB >= 0) {
    const posA = teamB[idxAInB].assignedPosition;
    const posB = teamB[idxBInB].assignedPosition;
    const temp = teamB[idxAInB];
    teamB[idxAInB] = {
      ...teamB[idxBInB],
      assignedPosition: posA,
      effectiveRating: getRatingForPosition(teamB[idxBInB], posA) || teamB[idxBInB].effectiveRating,
    };
    teamB[idxBInB] = {
      ...temp,
      assignedPosition: posB,
      effectiveRating: getRatingForPosition(temp, posB) || temp.effectiveRating,
    };
  }

  return {
    teamA,
    teamB,
    teamAPower: calculateTeamPower(teamA),
    teamBPower: calculateTeamPower(teamB),
  };
}
