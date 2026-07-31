import type { Player, PlayerPosition, Position } from "@/types";

export const POSITION_CODES: Position[] = ["GK", "DEF", "MID", "FWD"];

export const POSITION_LABELS: Record<Position, string> = {
  GK: "Kaleci",
  DEF: "Defans",
  MID: "Orta Saha",
  FWD: "Forvet",
};

export function isPosition(value: unknown): value is Position {
  return typeof value === "string" && POSITION_CODES.includes(value as Position);
}

export function getMainPosition(player: Player): Position {
  return player.positions.find((position) => position.isMain)?.code ?? player.positions[0]?.code ?? "MID";
}

export function getPositionRating(player: Player, code: Position): number {
  return player.positions.find((position) => position.code === code)?.rating ?? 0;
}

export function getOverallRating(player: Player): number {
  return getPositionRating(player, getMainPosition(player)) || player.overall || 50;
}

export function normalizePositions(value: unknown, fallbackOverall = 50, fallbackPosition: Position = "MID"): PlayerPosition[] {
  let source = value;
  if (typeof source === "string") {
    try { source = JSON.parse(source); } catch { source = []; }
  }

  const entries = Array.isArray(source)
    ? source.map((item) => {
        let parsedItem = item;
        if (typeof parsedItem === "string") {
          try { parsedItem = JSON.parse(parsedItem); } catch { return [undefined, undefined, false]; }
        }
        return [parsedItem?.code ?? parsedItem?.primary, parsedItem?.rating, parsedItem?.isMain];
      })
    : source && typeof source === "object"
    ? Object.entries(source).map(([code, rating]) => [code, rating, false])
    : [];

  const positions = entries.reduce<PlayerPosition[]>((result, [rawCode, rawRating, rawMain]) => {
    if (!isPosition(rawCode) || result.some((position) => position.code === rawCode)) return result;
    result.push({
      code: rawCode,
      rating: Math.min(99, Math.max(50, Number(rawRating) || fallbackOverall)),
      isMain: Boolean(rawMain),
    });
    return result;
  }, []);

  if (positions.length === 0) {
    return [{ code: fallbackPosition, rating: Math.min(99, Math.max(50, fallbackOverall)), isMain: true }];
  }

  if (!positions.some((position) => position.isMain)) positions[0].isMain = true;
  return positions.map((position, index) => ({ ...position, isMain: position.isMain && index === positions.findIndex((item) => item.isMain) }));
}
