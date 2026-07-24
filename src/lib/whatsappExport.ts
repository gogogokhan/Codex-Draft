import { groupByPosition } from "@/lib/ratings";
import { AssignedPlayer, DraftResult, Position, TeamConfig } from "@/types";

const POSITION_EMOJI: Record<Position, string> = {
  GK: "🧤",
  DEF: "🛡️",
  MID: "⚙️",
  FWD: "⚡",
};

function formatPositionGroup(
  position: Position,
  players: AssignedPlayer[]
): string {
  if (players.length === 0) return "";
  const list = players
    .map((p) => `${p.name} (${p.effectiveRating})`)
    .join(", ");
  return `${POSITION_EMOJI[position]} ${position} — ${list}`;
}

function formatTeam(name: string, power: number, players: AssignedPlayer[]): string {
  const grouped = groupByPosition(players);
  const lines = (["GK", "DEF", "MID", "FWD"] as Position[])
    .map((pos) => formatPositionGroup(pos, grouped[pos]))
    .filter(Boolean);

  return [`*${name}* (Ort: ${power.toFixed(1)})`, ...lines].join("\n");
}

export function generateWhatsAppText(
  draft: DraftResult,
  config: TeamConfig
): string {
  const date = new Date().toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const diff = Math.abs(draft.teamAPower - draft.teamBPower).toFixed(1);

  return [
    "⚽ *CODEX DRAFT — Maç Kadroları*",
    `📅 ${date}`,
    `📋 Formasyon: ${config.formation} (${config.teamSize}v${config.teamSize})`,
    "",
    `🔴 ${formatTeam(config.teamAName, draft.teamAPower, draft.teamA)}`,
    "",
    `🔵 ${formatTeam(config.teamBName, draft.teamBPower, draft.teamB)}`,
    "",
    `⚖️ Fark: ${diff}`,
  ].join("\n");
}
