export type Position = "GK" | "DEF" | "MID" | "FWD";
export type DraftMode = "overall" | "positional" | "random";
export type UserRole = "ADMIN" | "USER";
export type GroupRole = "owner" | "admin" | "editor" | "member";
export type WizardStep = "players" | "match" | "draft";

export interface PlayerPosition {
  code: Position;
  rating: number;
  isMain: boolean;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  positions: PlayerPosition[];
  overall?: number;
  ratingStatus?: "pending" | "ready";
  linkedUserId?: string | null;
}

export interface Group {
  id: string;
  name: string;
  owner_id: string;
  invite_code: string;
  created_at: string;
  player_count?: number;
  member_count?: number;
}

export interface GroupMembership {
  group_id: string;
  user_id: string;
  role: GroupRole;
  display_name: string;
  joined_at: string;
}

export interface TeamConfig {
  teamSize: number;
  formation: string;
  teamAName: string;
  teamBName: string;
}

export interface AssignedPlayer extends Player {
  assignedPosition: Position;
  effectiveRating: number;
}

export interface DraftResult {
  teamA: AssignedPlayer[];
  teamB: AssignedPlayer[];
  teamAPower: number;
  teamBPower: number;
}

export interface FormationSlots {
  GK: number;
  DEF: number;
  MID: number;
  FWD: number;
}

export const POSITIONS: Position[] = ["GK", "DEF", "MID", "FWD"];
export { POSITION_LABELS } from "@/lib/positions";

export const DEFAULT_TEAM_CONFIG: TeamConfig = {
  teamSize: 7,
  formation: "1-2-3-1",
  teamAName: "Codex Red",
  teamBName: "Codex Blue",
};
