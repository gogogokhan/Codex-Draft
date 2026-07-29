import { AssignedPlayer, Player, Position } from "@/types";

const FIELD_POSITIONS: Position[] = ["DEF", "MID", "FWD"];

export function getRatingForPosition(
  player: Player,
  position: Position
): number {
  return player.ratings[position] ?? 0;
}

export function getBestFieldPosition(player: Player): Position {
  let best: Position = "MID";
  let bestRating = 0;

  for (const pos of FIELD_POSITIONS) {
    const rating = player.ratings[pos] ?? 0;
    if (rating > bestRating) {
      bestRating = rating;
      best = pos;
    }
  }

  if (player.position.secondary && FIELD_POSITIONS.includes(player.position.secondary)) {
    const secondaryRating = player.ratings[player.position.secondary] ?? 0;
    if (secondaryRating >= bestRating) {
      return player.position.secondary;
    }
  }

  if (player.position.primary !== "GK" && FIELD_POSITIONS.includes(player.position.primary)) {
    const primaryRating = player.ratings[player.position.primary] ?? 0;
    if (primaryRating >= bestRating) {
      return player.position.primary;
    }
  }

  return best;
}

export function getOverallRating(player: Player): number {
  const primary = player.ratings[player.position.primary];
  if (primary) return primary;

  const values = Object.values(player.ratings).filter(
    (v): v is number => v !== undefined
  );
  return values.length > 0 ? Math.max(...values) : 50;
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
