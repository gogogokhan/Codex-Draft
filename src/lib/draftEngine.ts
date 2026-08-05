import {
  calculateTeamPower,
  getBestFieldPosition,
  getRatingForPosition,
} from "@/lib/ratings";
import type {
  AssignedPlayer,
  DraftMode,
  DraftResult,
  FormationSlots,
  Player,
  Position,
  TeamConfig,
} from "@/types";
import { getMainPosition, getOverallRating, getPositionRating } from "@/lib/positions";

interface TeamState {
  players: AssignedPlayer[];
  slotCounts: FormationSlots;
}

export interface FormationCompatibilityIssue {
  position: Position;
  playerCount: number;
  availableSlots: number;
  overflowCount: number;
  blocking: boolean;
}

// --- GÜVENLİ YARDIMCI FONKSİYONLAR ---

function getPrimaryPosition(player: any): string {
  return player ? getMainPosition(player as Player) : "";
}

function getSecondaryPosition(player: any): string | undefined {
  return undefined;
}

function getRatingForPos(player: any, pos: string): number {
  return player && ["GK", "DEF", "MID", "FWD"].includes(pos)
    ? getPositionRating(player as Player, pos as Position)
    : 0;
}

function getPlayerStrength(player: any): number {
  return player ? getOverallRating(player as Player) : 50;
}

function getMainRatingStrength(player: Player): number {
  const mainPosition = getMainPosition(player);
  return getPositionRating(player, mainPosition) || player.overall || 50;
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

function getConfiguredSlots(config: TeamConfig): FormationSlots {
  const parts = String(config.formation ?? "")
    .split("-")
    .map((value) => Math.max(0, Number.parseInt(value, 10) || 0));

  if (parts.length === 4 && parts.reduce((sum, value) => sum + value, 0) === config.teamSize) {
    return { GK: parts[0], DEF: parts[1], MID: parts[2], FWD: parts[3] };
  }

  const fieldPlayers = Math.max(0, config.teamSize - 1);
  const def = Math.floor(fieldPlayers / 3);
  const fwd = Math.floor(fieldPlayers / 3);
  return { GK: 1, DEF: def, MID: fieldPlayers - def - fwd, FWD: fwd };
}

export function analyzeFormationCompatibility(
  players: Player[],
  config: TeamConfig
): FormationCompatibilityIssue[] {
  const perTeamSlots = getConfiguredSlots(config);
  const selected = players.slice(0, config.teamSize * 2);
  const slots = (["GK", "DEF", "MID", "FWD"] as Position[]).flatMap(
    (position) => Array<Position>(perTeamSlots[position] * 2).fill(position)
  );
  const eligiblePositions = (player: Player): Position[] => {
    const mainPosition = getPrimaryPosition(player) as Position;
    if (mainPosition === "GK") return ["GK"];
    return player.positions
      .filter((position) => position.rating > 0)
      .map((position) => position.code);
  };
  const orderedPlayers = [...selected].sort(
    (a, b) => eligiblePositions(a).length - eligiblePositions(b).length
  );
  const slotOwners = Array<number>(slots.length).fill(-1);

  const tryMatch = (playerIndex: number, visitedSlots: Set<number>): boolean => {
    const player = orderedPlayers[playerIndex];
    const eligible = eligiblePositions(player);
    const preferredSlots = slots
      .map((position, slotIndex) => ({ position, slotIndex }))
      .filter(({ position }) => eligible.includes(position))
      .sort((a, b) => {
        const main = getPrimaryPosition(player);
        if (a.position === main && b.position !== main) return -1;
        if (b.position === main && a.position !== main) return 1;
        return getRatingForPos(player, b.position) - getRatingForPos(player, a.position);
      });

    for (const { slotIndex } of preferredSlots) {
      if (visitedSlots.has(slotIndex)) continue;
      visitedSlots.add(slotIndex);
      if (slotOwners[slotIndex] === -1 || tryMatch(slotOwners[slotIndex], visitedSlots)) {
        slotOwners[slotIndex] = playerIndex;
        return true;
      }
    }
    return false;
  };

  const unmatchedPlayers = orderedPlayers.filter(
    (_, playerIndex) => !tryMatch(playerIndex, new Set())
  );
  const unmatchedByMainPosition = unmatchedPlayers.reduce<Partial<Record<Position, number>>>(
    (counts, player) => {
      const position = getPrimaryPosition(player) as Position;
      counts[position] = (counts[position] ?? 0) + 1;
      return counts;
    },
    {}
  );

  return (Object.entries(unmatchedByMainPosition) as [Position, number][]).map(
    ([position, overflowCount]) => ({
      position,
      playerCount: selected.filter((player) => getPrimaryPosition(player) === position).length,
      availableSlots: perTeamSlots[position] * 2,
      overflowCount,
      blocking: position === "GK",
    })
  );
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

  if (primaryPos === "GK") {
    if (canFillSlot(team, "GK", maxSlots)) return "GK";
    throw new Error("Ana mevkisi kaleci olan oyuncu saha mevkisine atanamaz.");
  }

  if (
    preferGk &&
    isGkCandidate &&
    canFillSlot(team, "GK", maxSlots) &&
    team.slotCounts.GK === 0
  ) {
    return "GK";
  }

  const candidates: Position[] = player.positions
    .filter((position) => position.code !== "GK" && position.rating > 0)
    .sort((a, b) => {
      if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;
      return b.rating - a.rating;
    })
    .map((position) => position.code);

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
  const tacticalDistance: Record<Position, Record<Position, number>> = {
    GK: { GK: 0, DEF: 1, MID: 2, FWD: 3 },
    DEF: { GK: 1, DEF: 0, MID: 1, FWD: 2 },
    MID: { GK: 2, DEF: 1, MID: 0, FWD: 1 },
    FWD: { GK: 3, DEF: 2, MID: 1, FWD: 0 },
  };
  const naturalPosition = validPositions.includes(primaryPos as Position)
    ? primaryPos as Position
    : bestPos;
  const bestAvailablePosition = fieldOrder
    .filter((pos) => canFillSlot(team, pos, maxSlots))
    .sort((a, b) => {
      const ratingDifference = getRatingForPos(player, b) - getRatingForPos(player, a);
      if (ratingDifference !== 0) return ratingDifference;
      return tacticalDistance[naturalPosition][a] - tacticalDistance[naturalPosition][b];
    })[0];

  if (bestAvailablePosition) return bestAvailablePosition;

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

function getPositionFitTier(
  player: Player,
  team: TeamState,
  maxSlots: FormationSlots
): number {
  const mainPosition = getPrimaryPosition(player) as Position;
  if (mainPosition === "GK") return canFillSlot(team, "GK", maxSlots) ? 2 : -1;
  if (canFillSlot(team, mainPosition, maxSlots)) return 2;

  const hasRegisteredAlternative = player.positions.some(
    (position) =>
      position.code !== "GK" &&
      position.code !== mainPosition &&
      position.rating > 0 &&
      canFillSlot(team, position.code, maxSlots)
  );
  if (hasRegisteredAlternative) return 1;

  return (["DEF", "MID", "FWD"] as Position[]).some((position) =>
    canFillSlot(team, position, maxSlots)
  ) ? 0 : -1;
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
  const gkCandidates = sorted
    .filter(isGoalkeeperCandidate)
    .sort((a, b) => {
      const aIsMain = getPrimaryPosition(a) === "GK";
      const bIsMain = getPrimaryPosition(b) === "GK";
      if (aIsMain !== bIsMain) return aIsMain ? -1 : 1;
      return getRatingForPos(b, "GK") - getRatingForPos(a, "GK");
    });
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

      if (
        getPositionFitTier(player, otherTeam, perTeamSlots) >
        getPositionFitTier(player, targetTeam, perTeamSlots)
      ) {
        targetTeam = otherTeam;
      }

      const fallbackTeam = targetTeam === teamA ? teamB : teamA;
      const assigned = tryAssignToTeam(targetTeam, player, perTeamSlots, false);
      if (!assigned) {
        tryAssignToTeam(fallbackTeam, player, perTeamSlots, false);
      }
    }
  }

  return [teamA, teamB];
}

interface OverallPartitionOptions {
  previousDraft?: DraftResult | null;
}

interface OverallPartitionCandidate {
  selection: number[];
  goalkeeperPenalty: number;
  positionImbalance: number;
  ratingDifference: number;
}

function getCanonicalPartitionSignature(teamA: Player[], teamB: Player[]): string {
  const sides = [teamA, teamB]
    .map((team) => team.map((player) => player.id).sort().join(","))
    .sort();
  return sides.join("||");
}

function getCanonicalPositionPartitionSignature(
  teamA: Player[],
  teamB: Player[],
  position: Position
): string {
  const sides = [teamA, teamB]
    .map((team) =>
      team
        .filter((player) => getPrimaryPosition(player) === position)
        .map((player) => player.id)
        .sort()
        .join(",")
    )
    .sort();
  return sides.join("||");
}

function getRepeatedTeammatePairCount(
  teamA: Player[],
  teamB: Player[],
  previousDraft: DraftResult
): number {
  const previousPairKeys = new Set<string>();
  for (const team of [previousDraft.teamA, previousDraft.teamB]) {
    for (let first = 0; first < team.length; first++) {
      for (let second = first + 1; second < team.length; second++) {
        previousPairKeys.add([team[first].id, team[second].id].sort().join("|"));
      }
    }
  }

  let repeatedPairs = 0;
  for (const team of [teamA, teamB]) {
    for (let first = 0; first < team.length; first++) {
      for (let second = first + 1; second < team.length; second++) {
        if (previousPairKeys.has([team[first].id, team[second].id].sort().join("|"))) {
          repeatedPairs++;
        }
      }
    }
  }
  return repeatedPairs;
}

function findBestOverallPartition(
  players: Player[],
  teamSize: number,
  options: OverallPartitionOptions = {}
): [Player[], Player[]] {
  const strengths = players.map(getMainRatingStrength);
  const totalStrength = strengths.reduce((sum, rating) => sum + rating, 0);
  const mainGoalkeeperCount = players.filter(
    (player) => getPrimaryPosition(player) === "GK"
  ).length;
  const isPartitionGoalkeeper = (player: Player) =>
    mainGoalkeeperCount >= 2
      ? getPrimaryPosition(player) === "GK"
      : isGoalkeeperCandidate(player);
  const goalkeeperCount = players.filter(isPartitionGoalkeeper).length;
  const mainPositions = players.map((player) => getPrimaryPosition(player) as Position);
  const totalPositionCounts = mainPositions.reduce<FormationSlots>((counts, position) => {
    counts[position]++;
    return counts;
  }, emptySlots());
  let bestGoalkeeperPenalty = Number.POSITIVE_INFINITY;
  let bestPositionImbalance = Number.POSITIVE_INFINITY;
  let bestRatingDifference = Number.POSITIVE_INFINITY;
  let bestSelection: number[] = [];
  const candidates: OverallPartitionCandidate[] = [];
  const selectedIndices = [0];

  const getPositionImbalance = (selectedPositionCounts: FormationSlots) => {
    return (["GK", "DEF", "MID", "FWD"] as Position[]).reduce((total, position) => {
      const teamACount = selectedPositionCounts[position];
      return total + Math.abs(teamACount - (totalPositionCounts[position] - teamACount));
    }, 0);
  };

  const search = (
    index: number,
    selectedStrength: number,
    selectedGoalkeepers: number,
    selectedPositionCounts: FormationSlots
  ) => {
    if (selectedIndices.length === teamSize) {
      const otherTeamGoalkeepers = goalkeeperCount - selectedGoalkeepers;
      const goalkeeperPenalty =
        goalkeeperCount >= 2 && (selectedGoalkeepers === 0 || otherTeamGoalkeepers === 0)
          ? 1
          : 0;
      const positionImbalance = getPositionImbalance(selectedPositionCounts);
      const ratingDifference = Math.abs(selectedStrength - (totalStrength - selectedStrength));

      candidates.push({
        selection: [...selectedIndices],
        goalkeeperPenalty,
        positionImbalance,
        ratingDifference,
      });

      const isBetter =
        goalkeeperPenalty < bestGoalkeeperPenalty ||
        (goalkeeperPenalty === bestGoalkeeperPenalty && positionImbalance < bestPositionImbalance) ||
        (goalkeeperPenalty === bestGoalkeeperPenalty &&
          positionImbalance === bestPositionImbalance &&
          ratingDifference < bestRatingDifference);

      if (isBetter) {
        bestGoalkeeperPenalty = goalkeeperPenalty;
        bestPositionImbalance = positionImbalance;
        bestRatingDifference = ratingDifference;
        bestSelection = [...selectedIndices];
      }
      return;
    }

    const remainingNeeded = teamSize - selectedIndices.length;
    if (players.length - index < remainingNeeded || index >= players.length) return;

    selectedIndices.push(index);
    selectedPositionCounts[mainPositions[index]]++;
    search(
      index + 1,
      selectedStrength + strengths[index],
      selectedGoalkeepers + (isPartitionGoalkeeper(players[index]) ? 1 : 0),
      selectedPositionCounts
    );
    selectedPositionCounts[mainPositions[index]]--;
    selectedIndices.pop();

    search(index + 1, selectedStrength, selectedGoalkeepers, selectedPositionCounts);
  };

  const initialPositionCounts = emptySlots();
  initialPositionCounts[mainPositions[0]] = 1;
  search(1, strengths[0], isPartitionGoalkeeper(players[0]) ? 1 : 0, initialPositionCounts);

  let selected = bestSelection;
  if (options.previousDraft) {
    const previousSignature = getCanonicalPartitionSignature(
      options.previousDraft.teamA,
      options.previousDraft.teamB
    );
    const previousDefenderSignature = getCanonicalPositionPartitionSignature(
      options.previousDraft.teamA,
      options.previousDraft.teamB,
      "DEF"
    );
    let alternatives: Array<{
      candidate: OverallPartitionCandidate;
      defenderSignature: string;
      repeatedPairCount: number;
    }> = [];

    for (const averageTolerance of [0.5, 1, 1.5, 2, 3]) {
      const allowedRatingDifference = Math.max(
        bestRatingDifference,
        teamSize * averageTolerance
      );
      const candidatesWithinTolerance = candidates.flatMap((candidate) => {
        if (
          candidate.goalkeeperPenalty !== bestGoalkeeperPenalty ||
          candidate.positionImbalance !== bestPositionImbalance ||
          candidate.ratingDifference > allowedRatingDifference
        ) {
          return [];
        }

        const candidateSet = new Set(candidate.selection);
        const candidateTeamA = players.filter((_, index) => candidateSet.has(index));
        const candidateTeamB = players.filter((_, index) => !candidateSet.has(index));
        if (getCanonicalPartitionSignature(candidateTeamA, candidateTeamB) === previousSignature) {
          return [];
        }

        return [{
          candidate,
          defenderSignature: getCanonicalPositionPartitionSignature(
            candidateTeamA,
            candidateTeamB,
            "DEF"
          ),
          repeatedPairCount: getRepeatedTeammatePairCount(
            candidateTeamA,
            candidateTeamB,
            options.previousDraft!
          ),
        }];
      });
      const defenderAlternatives = candidatesWithinTolerance.filter(
        ({ defenderSignature }) => defenderSignature !== previousDefenderSignature
      );
      if (defenderAlternatives.length > 0) {
        alternatives = defenderAlternatives;
        break;
      }
      if (alternatives.length === 0 && candidatesWithinTolerance.length > 0) {
        alternatives = candidatesWithinTolerance;
      }
    }

    if (alternatives.length > 0) {
      const minimumRepeatedPairs = Math.min(
        ...alternatives.map(({ repeatedPairCount }) => repeatedPairCount)
      );
      const candidatePool = alternatives
        .filter(({ repeatedPairCount }) => repeatedPairCount === minimumRepeatedPairs)
        .sort((a, b) => a.candidate.ratingDifference - b.candidate.ratingDifference);
      const bestDifference = candidatePool[0].candidate.ratingDifference;
      const equallyBalanced = candidatePool.filter(
        ({ candidate }) => candidate.ratingDifference === bestDifference
      );
      selected = equallyBalanced[Math.floor(Math.random() * equallyBalanced.length)].candidate.selection;
    }
  }

  const selectedSet = new Set(selected);
  return [
    players.filter((_, index) => selectedSet.has(index)),
    players.filter((_, index) => !selectedSet.has(index)),
  ];
}

function arrangeFixedTeam(players: Player[], perTeamSlots: FormationSlots): TeamState {
  const slotPositions = (["GK", "DEF", "MID", "FWD"] as Position[]).flatMap(
    (position) => Array<Position>(perTeamSlots[position]).fill(position)
  );
  if (players.length !== slotPositions.length) {
    throw new Error("Takım oyuncu sayısı formasyon slotlarıyla eşleşmiyor.");
  }

  const tacticalDistance: Record<Position, Record<Position, number>> = {
    GK: { GK: 0, DEF: 1, MID: 2, FWD: 3 },
    DEF: { GK: 1, DEF: 0, MID: 1, FWD: 2 },
    MID: { GK: 2, DEF: 1, MID: 0, FWD: 1 },
    FWD: { GK: 3, DEF: 2, MID: 1, FWD: 0 },
  };
  const scoreAssignment = (player: Player, position: Position): number => {
    const mainPosition = getPrimaryPosition(player) as Position;
    const rating = getRatingForPos(player, position);

    if (mainPosition === "GK" && position !== "GK") return Number.NEGATIVE_INFINITY;
    if (position === "GK" && rating <= 0) return Number.NEGATIVE_INFINITY;
    if (position === mainPosition) return 100_000 + rating;
    if (rating > 0) return 10_000 + rating;
    return -1_000 - tacticalDistance[mainPosition][position] * 100;
  };

  const memo = new Map<number, { score: number; slots: number[] }>();
  const findBestAssignment = (usedMask: number): { score: number; slots: number[] } => {
    const playerIndex = usedMask.toString(2).replace(/0/g, "").length;
    if (playerIndex === players.length) return { score: 0, slots: [] };

    const cached = memo.get(usedMask);
    if (cached) return cached;

    let best = { score: Number.NEGATIVE_INFINITY, slots: [] as number[] };
    for (let slotIndex = 0; slotIndex < slotPositions.length; slotIndex++) {
      if ((usedMask & (1 << slotIndex)) !== 0) continue;
      const assignmentScore = scoreAssignment(players[playerIndex], slotPositions[slotIndex]);
      if (!Number.isFinite(assignmentScore)) continue;

      const remainder = findBestAssignment(usedMask | (1 << slotIndex));
      const totalScore = assignmentScore + remainder.score;
      if (totalScore > best.score) {
        best = { score: totalScore, slots: [slotIndex, ...remainder.slots] };
      }
    }

    memo.set(usedMask, best);
    return best;
  };

  const optimal = findBestAssignment(0);
  if (!Number.isFinite(optimal.score) || optimal.slots.length !== players.length) {
    throw new Error("Oyuncular formasyona geçerli şekilde yerleştirilemedi.");
  }

  const team = createEmptyTeam(perTeamSlots);
  players.forEach((player, playerIndex) => {
    assignPlayer(team, player, slotPositions[optimal.slots[playerIndex]]);
  });
  return team;
}

function calculateOverallPower(players: Player[]): number {
  if (players.length === 0) return 0;
  const total = players.reduce((sum, player) => sum + getMainRatingStrength(player), 0);
  return Math.round((total / players.length) * 10) / 10;
}

interface RoleAssignment {
  player: Player;
  position: Position;
  rating: number;
}

function assignFormationRoles(
  players: Player[],
  totalSlots: FormationSlots
): RoleAssignment[] {
  const positions: Position[] = ["GK", "DEF", "MID", "FWD"];
  const tacticalDistance: Record<Position, Record<Position, number>> = {
    GK: { GK: 0, DEF: 1, MID: 2, FWD: 3 },
    DEF: { GK: 1, DEF: 0, MID: 1, FWD: 2 },
    MID: { GK: 2, DEF: 1, MID: 0, FWD: 1 },
    FWD: { GK: 3, DEF: 2, MID: 1, FWD: 0 },
  };
  const memo = new Map<string, { score: number; position?: Position }>();

  const scorePosition = (player: Player, position: Position): number => {
    const mainPosition = getPrimaryPosition(player) as Position;
    const rating = getRatingForPos(player, position);
    if (mainPosition === "GK" && position !== "GK") return Number.NEGATIVE_INFINITY;
    if (position === "GK" && rating <= 0) return Number.NEGATIVE_INFINITY;
    if (rating > 0) return 10_000 + rating * 100 + (position === mainPosition ? 25 : 0);
    return -10_000 - tacticalDistance[mainPosition][position] * 1_000;
  };

  const solve = (
    playerIndex: number,
    counts: FormationSlots
  ): number => {
    if (playerIndex === players.length) {
      return positions.every((position) => counts[position] === totalSlots[position])
        ? 0
        : Number.NEGATIVE_INFINITY;
    }

    const key = `${playerIndex}|${counts.GK}|${counts.DEF}|${counts.MID}|${counts.FWD}`;
    const cached = memo.get(key);
    if (cached) return cached.score;

    let bestScore = Number.NEGATIVE_INFINITY;
    let bestPosition: Position | undefined;
    for (const position of positions) {
      if (counts[position] >= totalSlots[position]) continue;
      const assignmentScore = scorePosition(players[playerIndex], position);
      if (!Number.isFinite(assignmentScore)) continue;

      counts[position]++;
      const remainderScore = solve(playerIndex + 1, counts);
      counts[position]--;
      const totalScore = assignmentScore + remainderScore;
      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestPosition = position;
      }
    }

    memo.set(key, { score: bestScore, position: bestPosition });
    return bestScore;
  };

  const counts = emptySlots();
  const optimalScore = solve(0, counts);
  if (!Number.isFinite(optimalScore)) {
    throw new Error("Oyuncular kayıtlı mevkileriyle formasyona yerleştirilemedi.");
  }

  return players.map((player, playerIndex) => {
    const key = `${playerIndex}|${counts.GK}|${counts.DEF}|${counts.MID}|${counts.FWD}`;
    const position = memo.get(key)?.position;
    if (!position) throw new Error("Formasyon rolü oluşturulamadı.");
    counts[position]++;
    return {
      player,
      position,
      rating: getRatingForPos(player, position) || getPlayerStrength(player),
    };
  });
}

function chooseBalancedRoleSplit(
  assignments: RoleAssignment[],
  teamA: TeamState,
  teamB: TeamState,
  countPerTeam: number,
  position: Position,
  previousDraft?: DraftResult | null
): Set<string> {
  const candidates: Array<{
    selection: Set<string>;
    cumulativeDifference: number;
    roleDifference: number;
    repeatedPairCount: number;
    positionSignature: string;
  }> = [];
  const selected: RoleAssignment[] = [];
  const totalRolePower = assignments.reduce((sum, assignment) => sum + assignment.rating, 0);
  const teamACurrentPower = teamTotalPower(teamA);
  const teamBCurrentPower = teamTotalPower(teamB);
  const previousPositionSignature = previousDraft
    ? [previousDraft.teamA, previousDraft.teamB]
        .map((team) =>
          team
            .filter((player) => player.assignedPosition === position)
            .map((player) => player.id)
            .sort()
            .join(",")
        )
        .sort()
        .join("||")
    : null;

  const search = (index: number, selectedPower: number) => {
    if (selected.length === countPerTeam) {
      const otherPower = totalRolePower - selectedPower;
      const cumulativeDifference = Math.abs(
        teamACurrentPower + selectedPower - (teamBCurrentPower + otherPower)
      );
      const roleDifference = Math.abs(selectedPower - otherPower);
      const selection = new Set(selected.map((assignment) => assignment.player.id));
      const selectedPlayers = assignments
        .filter((assignment) => selection.has(assignment.player.id))
        .map((assignment) => assignment.player);
      const otherPlayers = assignments
        .filter((assignment) => !selection.has(assignment.player.id))
        .map((assignment) => assignment.player);
      const candidateTeamA = [...teamA.players, ...selectedPlayers];
      const candidateTeamB = [...teamB.players, ...otherPlayers];
      const positionSignature = [selectedPlayers, otherPlayers]
        .map((team) => team.map((player) => player.id).sort().join(","))
        .sort()
        .join("||");
      candidates.push({
        selection,
        cumulativeDifference,
        roleDifference,
        repeatedPairCount: previousDraft
          ? getRepeatedTeammatePairCount(candidateTeamA, candidateTeamB, previousDraft)
          : 0,
        positionSignature,
      });
      return;
    }

    const remainingNeeded = countPerTeam - selected.length;
    if (assignments.length - index < remainingNeeded || index >= assignments.length) return;

    selected.push(assignments[index]);
    search(index + 1, selectedPower + assignments[index].rating);
    selected.pop();
    search(index + 1, selectedPower);
  };

  search(0, 0);
  const bestCumulativeDifference = Math.min(
    ...candidates.map((candidate) => candidate.cumulativeDifference)
  );
  const allowedDifference = bestCumulativeDifference + (position === "DEF" ? 10 : 0);
  let candidatePool = candidates.filter(
    (candidate) => candidate.cumulativeDifference <= allowedDifference
  );
  if (previousPositionSignature && position === "DEF") {
    const differentPositionPairs = candidatePool.filter(
      (candidate) => candidate.positionSignature !== previousPositionSignature
    );
    if (differentPositionPairs.length > 0) candidatePool = differentPositionPairs;
  }
  const minimumRepeatedPairs = Math.min(
    ...candidatePool.map((candidate) => candidate.repeatedPairCount)
  );
  candidatePool = candidatePool.filter(
    (candidate) => candidate.repeatedPairCount === minimumRepeatedPairs
  );
  candidatePool.sort(
    (a, b) =>
      a.cumulativeDifference - b.cumulativeDifference ||
      a.roleDifference - b.roleDifference
  );
  return candidatePool[0]?.selection ?? new Set<string>();
}

function balanceTeamsByAssignedPosition(
  players: Player[],
  perTeamSlots: FormationSlots,
  previousDraft?: DraftResult | null
): [TeamState, TeamState] {
  const totalSlots: FormationSlots = {
    GK: perTeamSlots.GK * 2,
    DEF: perTeamSlots.DEF * 2,
    MID: perTeamSlots.MID * 2,
    FWD: perTeamSlots.FWD * 2,
  };
  const assignments = assignFormationRoles(players, totalSlots);
  const teamA = createEmptyTeam(perTeamSlots);
  const teamB = createEmptyTeam(perTeamSlots);

  for (const position of ["GK", "DEF", "MID", "FWD"] as Position[]) {
    const roleAssignments = assignments.filter(
      (assignment) => assignment.position === position
    );
    const teamAIds = chooseBalancedRoleSplit(
      roleAssignments,
      teamA,
      teamB,
      perTeamSlots[position],
      position,
      previousDraft
    );

    for (const assignment of roleAssignments) {
      const targetTeam = teamAIds.has(assignment.player.id) ? teamA : teamB;
      assignPlayer(targetTeam, assignment.player, position);
    }
  }

  return [teamA, teamB];
}

function createRandomTeams(
  players: Player[],
  perTeamSlots: FormationSlots,
  previousDraft?: DraftResult | null
): [TeamState, TeamState] {
  const teamSize = players.length / 2;
  const goalkeeperCandidates = [...players]
    .filter(isGoalkeeperCandidate)
    .sort((a, b) => {
      const mainDifference = Number(getPrimaryPosition(b) === "GK") - Number(getPrimaryPosition(a) === "GK");
      if (mainDifference !== 0) return mainDifference;
      return getRatingForPos(b, "GK") - getRatingForPos(a, "GK");
    });
  if (goalkeeperCandidates.length < 2) {
    throw new Error("Rastgele takım oluşturmak için en az iki kaleci adayı gereklidir.");
  }

  const fixedGoalkeepers = goalkeeperCandidates.slice(0, 2);
  const remaining = players.filter((player) => !fixedGoalkeepers.includes(player));
  let teamAPlayers: Player[] = [];
  let teamBPlayers: Player[] = [];
  const previousSignature = previousDraft
    ? getCanonicalPartitionSignature(previousDraft.teamA, previousDraft.teamB)
    : null;

  for (let attempt = 0; attempt < 12; attempt++) {
    const randomized = [...remaining];
    for (let index = randomized.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [randomized[index], randomized[swapIndex]] = [randomized[swapIndex], randomized[index]];
    }
    teamAPlayers = [fixedGoalkeepers[0], ...randomized.slice(0, teamSize - 1)];
    teamBPlayers = [fixedGoalkeepers[1], ...randomized.slice(teamSize - 1)];
    if (
      !previousSignature ||
      getCanonicalPartitionSignature(teamAPlayers, teamBPlayers) !== previousSignature
    ) {
      break;
    }
  }

  return [
    arrangeFixedTeam(teamAPlayers, perTeamSlots),
    arrangeFixedTeam(teamBPlayers, perTeamSlots),
  ];
}

export function generateBalancedTeams(
  players: Player[],
  config: TeamConfig,
  mode: DraftMode = "positional",
  options: OverallPartitionOptions = {}
): DraftResult {
  const perTeamSlots = cloneSlots(getConfiguredSlots(config));
  const requiredTotal = config.teamSize * 2;

  if (players.length < requiredTotal) {
    throw new Error(
      `En az ${requiredTotal} oyuncu seçilmeli (${config.teamSize}v${config.teamSize} maç için).`
    );
  }

  const selected = players.slice(0, requiredTotal);
  const mainGoalkeeperCount = selected.filter(
    (player) => getPrimaryPosition(player) === "GK"
  ).length;
  const goalkeeperSlots = perTeamSlots.GK * 2;
  if (mainGoalkeeperCount > goalkeeperSlots) {
    throw new Error(
      `Ana mevkisi kaleci olan ${mainGoalkeeperCount} oyuncu var, ancak yalnızca ${goalkeeperSlots} kaleci kontenjanı bulunuyor.`
    );
  }

  let teamAState: TeamState;
  let teamBState: TeamState;

  if (mode === "overall") {
    const [teamAPlayers, teamBPlayers] = findBestOverallPartition(
      selected,
      config.teamSize,
      options
    );
    teamAState = arrangeFixedTeam(teamAPlayers, perTeamSlots);
    teamBState = arrangeFixedTeam(teamBPlayers, perTeamSlots);
  } else if (mode === "positional") {
    [teamAState, teamBState] = balanceTeamsByAssignedPosition(
      selected,
      perTeamSlots,
      options.previousDraft
    );
  } else {
    [teamAState, teamBState] = createRandomTeams(
      selected,
      perTeamSlots,
      options.previousDraft
    );
  }

  const teamA = teamAState.players;
  const teamB = teamBState.players;

  return {
    teamA,
    teamB,
    teamAPower: mode === "overall" ? calculateOverallPower(teamA) : calculateTeamPower(teamA),
    teamBPower: mode === "overall" ? calculateOverallPower(teamB) : calculateTeamPower(teamB),
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
