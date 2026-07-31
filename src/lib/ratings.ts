import { AssignedPlayer, Player, Position } from "@/types";
import { getMainPosition, getOverallRating as getCanonicalOverallRating, getPositionRating } from "@/lib/positions";

const FIELD_POSITIONS: Position[] = ["DEF", "MID", "FWD"];

export function getRatingForPosition(
  player: Player,
  position: Position
): number {
  return getPositionRating(player, position);
}

export function getBestFieldPosition(player: Player): Position {
  let best: Position = "MID";
  let bestRating = 0;

  for (const pos of FIELD_POSITIONS) {
    const rating = getPositionRating(player, pos);
    if (rating > bestRating) {
      bestRating = rating;
      best = pos;
    }
  }

  const primaryPosition = getMainPosition(player);
  if (primaryPosition !== "GK" && FIELD_POSITIONS.includes(primaryPosition)) {
    const primaryRating = getPositionRating(player, primaryPosition);
    if (primaryRating >= bestRating) {
      return primaryPosition;
    }
  }

  return best;
}

export function getOverallRating(player: Player): number {
  return getCanonicalOverallRating(player);
}

export function getCardTier(overall: number): "gold" | "silver" | "bronze" {
  if (overall >= 85) return "gold";
  if (overall >= 75) return "silver";
  return "bronze";
}

export function calculateTeamPower(players: AssignedPlayer[]): number {
  if (players.length === 0) return 0;
  const total = players.reduce((sum, p) => sum + p.effectiveRating, 0);
  return Math.round((total / players.length) * 10) / 10;
}

export function recalculateDraftPower(
  teamA: AssignedPlayer[],
  teamB: AssignedPlayer[]
): { teamAPower: number; teamBPower: number } {
  return {
    teamAPower: calculateTeamPower(teamA),
    teamBPower: calculateTeamPower(teamB),
  };
}

export function groupByPosition(
  players: AssignedPlayer[]
): Record<Position, AssignedPlayer[]> {
  return {
    GK: players.filter((p) => p.assignedPosition === "GK"),
    DEF: players.filter((p) => p.assignedPosition === "DEF"),
    MID: players.filter((p) => p.assignedPosition === "MID"),
    FWD: players.filter((p) => p.assignedPosition === "FWD"),
  };
}
