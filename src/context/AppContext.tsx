"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { generateBalancedTeams, swapPlayers } from "@/lib/draftEngine";
import { getFormationForTeamSize } from "@/lib/formations";
import { MOCK_PLAYERS } from "@/lib/mockData";
import {
  DEFAULT_TEAM_CONFIG,
  DraftResult,
  Player,
  TeamConfig,
  UserRole,
  WizardStep,
} from "@/types";

const STORAGE_KEY = "codex-draft-v1";

interface PersistedState {
  role: UserRole;
  players: Player[];
  attendance: string[];
  teamConfig: TeamConfig;
}

interface AppContextValue {
  role: UserRole;
  isAdmin: boolean;
  setRole: (role: UserRole) => void;
  players: Player[];
  addPlayer: (player: Player) => void;
  updatePlayer: (player: Player) => void;
  deletePlayer: (id: string) => void;
  attendance: string[];
  toggleAttendance: (id: string) => void;
  selectAllAttendance: () => void;
  clearAttendance: () => void;
  teamConfig: TeamConfig;
  setTeamConfig: (config: Partial<TeamConfig>) => void;
  draftResult: DraftResult | null;
  generateDraft: () => void;
  swapDraftPlayers: (playerIdA: string, playerIdB: string) => void;
  clearDraft: () => void;
  currentStep: WizardStep;
  setCurrentStep: (step: WizardStep) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function loadState(): PersistedState {
  if (typeof window === "undefined") {
    return {
      role: "ADMIN",
      players: MOCK_PLAYERS,
      attendance: [],
      teamConfig: DEFAULT_TEAM_CONFIG,
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        role: "ADMIN",
        players: MOCK_PLAYERS,
        attendance: [],
        teamConfig: DEFAULT_TEAM_CONFIG,
      };
    }
    const parsed = JSON.parse(raw) as PersistedState;
    return {
      role: parsed.role ?? "ADMIN",
      players: parsed.players?.length ? parsed.players : MOCK_PLAYERS,
      attendance: parsed.attendance ?? [],
      teamConfig: parsed.teamConfig ?? DEFAULT_TEAM_CONFIG,
    };
  } catch {
    return {
      role: "ADMIN",
      players: MOCK_PLAYERS,
      attendance: [],
      teamConfig: DEFAULT_TEAM_CONFIG,
    };
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [role, setRoleState] = useState<UserRole>("ADMIN");
  const [players, setPlayers] = useState<Player[]>(MOCK_PLAYERS);
  const [attendance, setAttendance] = useState<string[]>([]);
  const [teamConfig, setTeamConfigState] = useState<TeamConfig>(DEFAULT_TEAM_CONFIG);
  const [draftResult, setDraftResult] = useState<DraftResult | null>(null);
  const [currentStep, setCurrentStep] = useState<WizardStep>("players");

  useEffect(() => {
    const state = loadState();
    setRoleState(state.role);
    setPlayers(state.players);
    setAttendance(state.attendance);
    setTeamConfigState(state.teamConfig);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const payload: PersistedState = { role, players, attendance, teamConfig };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [hydrated, role, players, attendance, teamConfig]);

  const setRole = useCallback((next: UserRole) => setRoleState(next), []);

  const addPlayer = useCallback((player: Player) => {
    setPlayers((prev) => [...prev, player]);
  }, []);

  const updatePlayer = useCallback((player: Player) => {
    setPlayers((prev) => prev.map((p) => (p.id === player.id ? player : p)));
  }, []);

  const deletePlayer = useCallback((id: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== id));
    setAttendance((prev) => prev.filter((pid) => pid !== id));
  }, []);

  const toggleAttendance = useCallback((id: string) => {
    setAttendance((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  }, []);

  const selectAllAttendance = useCallback(() => {
    setPlayers((current) => {
      setAttendance(current.map((p) => p.id));
      return current;
    });
  }, []);

  const clearAttendance = useCallback(() => setAttendance([]), []);

  const setTeamConfig = useCallback((partial: Partial<TeamConfig>) => {
    setTeamConfigState((prev) => {
      const teamSize = partial.teamSize ?? prev.teamSize;
      const formation =
        partial.formation ??
        (partial.teamSize
          ? getFormationForTeamSize(partial.teamSize).formation
          : prev.formation);
      return { ...prev, ...partial, teamSize, formation };
    });
  }, []);

  const generateDraft = useCallback(() => {
    const attending = players.filter((p) => attendance.includes(p.id));
    const result = generateBalancedTeams(attending, teamConfig);
    setDraftResult(result);
    setCurrentStep("draft");
  }, [players, attendance, teamConfig]);

  const swapDraftPlayers = useCallback(
    (playerIdA: string, playerIdB: string) => {
      setDraftResult((prev) =>
        prev ? swapPlayers(prev, playerIdA, playerIdB) : null
      );
    },
    []
  );

  const clearDraft = useCallback(() => setDraftResult(null), []);

  const value = useMemo<AppContextValue>(
    () => ({
      role,
      isAdmin: role === "ADMIN",
      setRole,
      players,
      addPlayer,
      updatePlayer,
      deletePlayer,
      attendance,
      toggleAttendance,
      selectAllAttendance,
      clearAttendance,
      teamConfig,
      setTeamConfig,
      draftResult,
      generateDraft,
      swapDraftPlayers,
      clearDraft,
      currentStep,
      setCurrentStep,
    }),
    [
      role,
      players,
      addPlayer,
      updatePlayer,
      deletePlayer,
      attendance,
      toggleAttendance,
      selectAllAttendance,
      clearAttendance,
      teamConfig,
      setTeamConfig,
      draftResult,
      generateDraft,
      swapDraftPlayers,
      clearDraft,
      currentStep,
    ]
  );

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        Yükleniyor...
      </div>
    );
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
