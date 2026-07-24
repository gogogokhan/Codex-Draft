export type Position = "GK" | "DEF" | "MID" | "FWD";
export type UserRole = "ADMIN" | "USER";
export type WizardStep = "players" | "match" | "draft";

export interface PlayerRatings {
  GK?: number;
  DEF?: number;
  MID?: number;
  FWD?: number;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  ratings: PlayerRatings;
  position: {
    primary: Position;
    secondary?: Position;
  };
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

export const POSITION_LABELS: Record<Position, string> = {
  GK: "Kaleci",
  DEF: "Defans",
  MID: "Orta Saha",
  FWD: "Forvet",
};

export const DEFAULT_TEAM_CONFIG: TeamConfig = {
  teamSize: 7,
  formation: "1-2-3-1",
  teamAName: "Codex Red",
  teamBName: "Codex Blue",
};
