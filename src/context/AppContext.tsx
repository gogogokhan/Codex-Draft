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
import { DEFAULT_TEAM_CONFIG, DraftResult, Player, TeamConfig } from "@/types";
import { supabase } from "@/lib/supabaseClient";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export type StepType = "pool" | "settings" | "attendance" | "squad" | string;
export type DraftMode = "overall" | "positional";

export interface AuthResponse {
  success: boolean;
  error?: string;
}

interface AppContextValue {
  players: Player[];
  addPlayer: (player: Omit<Player, "id">) => Promise<void>;
  updatePlayer: (player: Player) => Promise<void>;
  deletePlayer: (id: string) => Promise<void>;
  attendance: string[];
  toggleAttendance: (id: string) => void;
  selectAllAttendance: () => void;
  clearAttendance: () => void;
  teamConfig: TeamConfig;
  setTeamConfig: (config: Partial<TeamConfig>) => void;
  draftResult: DraftResult | null;
  generateDraft: () => void;
  generateTeams: () => void;
  swapDraftPlayers: (playerIdA: string, playerIdB: string) => void;
  clearDraft: () => void;
  currentStep: StepType;
  setCurrentStep: (step: StepType) => void;
  setActiveTab: (step: StepType) => void;
  draftMode: DraftMode;
  setDraftMode: (mode: DraftMode) => void;
  isAuthenticated: boolean;
  user: SupabaseUser | null;
  login: (email: string, password?: string) => Promise<AuthResponse>;
  register: (email: string, password?: string, name?: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

const shuffleArray = <T,>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);

  const [players, setPlayers] = useState<Player[]>([]);
  const [attendance, setAttendance] = useState<string[]>([]);
  const [teamConfig, setTeamConfigState] = useState<TeamConfig>(DEFAULT_TEAM_CONFIG);

  const [draftResult, setDraftResult] = useState<DraftResult | null>(null);
  const [currentStep, setCurrentStepState] = useState<StepType>("pool");
  const [draftMode, setDraftMode] = useState<DraftMode>("overall");

  // Oyuncuları Supabase'den çek
  const fetchPlayers = useCallback(async () => {
    const { data, error } = await supabase.from("players").select("*");
    if (!error && data) {
      setPlayers(
        data.map((p) => ({
          id: p.id,
          name: p.name,
          overall: p.overall,
          positions: p.positions,
        }))
      );
    }
  }, []);

  // Oturum durumunu ve değişiklikleri dinle
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchPlayers();
      }
      setHydrated(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchPlayers();
      } else {
        setPlayers([]);
        setAttendance([]);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchPlayers]);

  // SUPABASE KAYIT
  const register = useCallback(
    async (email: string, password?: string, name?: string): Promise<AuthResponse> => {
      if (!password) return { success: false, error: "Şifre zorunludur." };

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: name },
        },
      });

      if (error) {
        let message = error.message;
        if (message.includes("User already registered")) {
          message = "Bu e-posta adresiyle zaten bir hesap mevcut.";
        } else if (message.includes("Password should be at least")) {
          message = "Şifre en az 6 karakter olmalıdır.";
        }
        return { success: false, error: message };
      }

      const activeUser = data.session?.user || data.user;
      if (activeUser) {
        setUser(activeUser);
        await fetchPlayers();
      }

      return { success: true };
    },
    [fetchPlayers]
  );

  // SUPABASE GİRİŞ
const login = useCallback(
  async (email: string, password?: string): Promise<AuthResponse> => {
    if (!password) return { success: false, error: "Lütfen şifrenizi giriniz." };

    const cleanEmail = email.trim();

    // 1. Önce e-postanın kayıtlı olup olmadığını RPC ile kontrol et
    const { data: userExists } = await supabase.rpc("check_email_exists", {
      email_input: cleanEmail,
    });

    if (!userExists) {
      return {
        success: false,
        error: "Böyle bir hesap bulunamadı. Lütfen kayıt olun.",
      };
    }

    // 2. E-posta varsa şifre ile giriş yapmayı dene
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      let message = "Girdiğiniz şifre hatalı. Lütfen tekrar deneyin.";
      
      if (error.message.includes("Email not confirmed")) {
        message = "E-posta adresiniz henüz onaylanmamış.";
      }

      return { success: false, error: message };
    }

    if (data.session?.user || data.user) {
      setUser(data.session?.user || data.user);
      await fetchPlayers();
    }

    return { success: true };
  },
  [fetchPlayers]
);

  // SUPABASE ÇIKIŞ
  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setPlayers([]);
    setAttendance([]);
    setDraftResult(null);
  }, []);

  // OYUNCU EKLEME (DB Insert)
  const addPlayer = useCallback(
    async (player: Omit<Player, "id">) => {
      if (!user) return;
      const { data, error } = await supabase
        .from("players")
        .insert({
          user_id: user.id,
          name: player.name,
          overall: player.overall,
          positions: player.positions,
        })
        .select()
        .single();

      if (!error && data) {
        setPlayers((prev) => [
          ...prev,
          { id: data.id, name: data.name, overall: data.overall, positions: data.positions },
        ]);
      }
    },
    [user]
  );

  // OYUNCU GÜNCELLEME (DB Update)
  const updatePlayer = useCallback(async (player: Player) => {
    const { error } = await supabase
      .from("players")
      .update({
        name: player.name,
        overall: player.overall,
        positions: player.positions,
      })
      .eq("id", player.id);

    if (!error) {
      setPlayers((prev) => prev.map((p) => (p.id === player.id ? player : p)));
    }
  }, []);

  // OYUNCU SİLME (DB Delete)
  const deletePlayer = useCallback(async (id: string) => {
    const { error } = await supabase.from("players").delete().eq("id", id);

    if (!error) {
      setPlayers((prev) => prev.filter((p) => p.id !== id));
      setAttendance((prev) => prev.filter((pid) => pid !== id));
    }
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

  const setCurrentStep = useCallback((step: StepType) => {
    setCurrentStepState(step);
  }, []);

  const generateDraft = useCallback(() => {
    const attending = players.filter((p) => attendance.includes(p.id));
    if (attending.length === 0) return;

    const randomized = shuffleArray(attending);
    const result = generateBalancedTeams(randomized, teamConfig);

    setDraftResult({ ...result });
    setCurrentStepState("squad");
  }, [players, attendance, teamConfig]);

  const swapDraftPlayers = useCallback(
    (playerIdA: string, playerIdB: string) => {
      setDraftResult((prev) =>
        prev ? { ...swapPlayers(prev, playerIdA, playerIdB) } : null
      );
    },
    []
  );

  const clearDraft = useCallback(() => setDraftResult(null), []);

  const value = useMemo<AppContextValue>(
    () => ({
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
      generateTeams: generateDraft,
      swapDraftPlayers,
      clearDraft,
      currentStep,
      setCurrentStep,
      setActiveTab: setCurrentStep,
      draftMode,
      setDraftMode,
      isAuthenticated: !!user,
      user,
      login,
      register,
      logout,
    }),
    [
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
      draftMode,
      setDraftMode,
      user,
      login,
      register,
      logout,
    ]
  );

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400 font-bold">
        Codex Draft Yükleniyor...
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