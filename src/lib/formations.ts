import { FormationSlots } from "@/types";

export interface FormationConfig {
  formation: string;
  slots: FormationSlots;
}

export const FORMATIONS: Record<number, FormationConfig> = {
  6: { formation: "1-2-2-1", slots: { GK: 1, DEF: 2, MID: 2, FWD: 1 } },
  7: { formation: "1-2-3-1", slots: { GK: 1, DEF: 2, MID: 3, FWD: 1 } },
  8: { formation: "1-3-3-1", slots: { GK: 1, DEF: 3, MID: 3, FWD: 1 } },
  9: { formation: "1-3-3-2", slots: { GK: 1, DEF: 3, MID: 3, FWD: 2 } },
  10: { formation: "1-4-3-2", slots: { GK: 1, DEF: 4, MID: 3, FWD: 2 } },
  11: { formation: "1-4-4-2", slots: { GK: 1, DEF: 4, MID: 4, FWD: 2 } },
};

export function getFormationForTeamSize(teamSize: number): FormationConfig {
  return FORMATIONS[teamSize] ?? FORMATIONS[7];
}

export function getTotalSlots(slots: FormationSlots): number {
  return slots.GK + slots.DEF + slots.MID + slots.FWD;
}
