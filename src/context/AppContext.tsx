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
import { DEFAULT_TEAM_CONFIG, DraftResult, Player, TeamConfig, type Position } from "@/types";
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
  isAdmin: boolean;
  setIsAdmin: (value: boolean) => void;
  isAuthenticated: boolean;
  user: SupabaseUser | null;
  login: (email: string, password?: string) => Promise<AuthResponse>;
  register: (email: string, password?: string, name?: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  warningMessage: string | null;
  setWarningMessage: (message: string | null) => void;
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

const normalizePositionCode = (value: unknown): Position => {
  // Türkçe karakterleri normalize et
  const raw = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/İ/g, "I")    // Türkçe İ → I
    .replace(/ı/g, "I")    // Türkçe ı → I
    .replace(/[ç]/gi, "C")
    .replace(/[ğ]/gi, "G")
    .replace(/[ş]/gi, "S")
    .replace(/[ö]/gi, "O")
    .replace(/[ü]/gi, "U");

  // GK: Kaleci
  if (
    raw.includes("GK") ||
    raw === "KL" ||
    raw.includes("KALECI") ||
    raw.includes("KALECI") ||
    raw.includes("GOALKEEPER") ||
    raw.includes("KEEPER") ||
    raw.includes("GOEL")
  ) {
    return "GK";
  }

  // DEF: Defans / Bek
  if (
    raw.includes("DEF") ||
    raw.includes("BEK") ||
    raw.includes("STOPPER") ||
    raw.includes("DEFANS") ||
    raw.includes("DF") ||
    raw.includes("CB") ||
    raw.includes("LB") ||
    raw.includes("RB") ||
    raw.includes("LWB") ||
    raw.includes("RWB")
  ) {
    return "DEF";
  }

  // MID: Orta saha
  if (
    raw.includes("MID") ||
    raw.includes("ORTA") ||
    raw.includes("OS") ||
    raw.includes("CM") ||
    raw.includes("CAM") ||
    raw.includes("CDM") ||
    raw.includes("LM") ||
    raw.includes("RM")
  ) {
    return "MID";
  }

  // FWD: Forvet
  if (
    raw.includes("FWD") ||
    raw.includes("FORVET") ||
    raw.includes("FOR") ||
    raw.includes("ST") ||
    raw.includes("CF") ||
    raw.includes("LW") ||
    raw.includes("RW") ||
    raw.includes("STRIKER")
  ) {
    return "FWD";
  }

  // Default MID
  return "MID";
};

const normalizePlayer = (player: any): Player => {
  if (!player) return null as any;

  // 1. PRIMARY POSITION'U BEL
  const primaryPosition = normalizePositionCode(
    player?.position?.primary ?? player?.position?.code ?? player?.position ?? 
    player?.mainPosition ?? player?.pos ?? player?.role ?? 'MID'
  );

  // 2. RATINGS OBJECT'İNİ OLUŞTUR
  const ratings: { GK: number; DEF: number; MID: number; FWD: number } = {
    GK: 0,
    DEF: 0,
    MID: 0,
    FWD: 0,
  };

  // A. Eğer player.positions array'i varsa, oradan ratingleri çıkar
  if (Array.isArray(player?.positions) && player.positions.length > 0) {
    player.positions.forEach((item: any) => {
      if (item && typeof item === "object") {
        const code = normalizePositionCode(item.code ?? item.primary ?? item.name ?? item.value ?? item.label);
        const rating = Number(item.rating ?? item.RATING ?? item.value ?? 0);
        if (rating > 0) {
          ratings[code] = rating;
        }
      }
    });
  }

  // B. Sonra player.ratings object'ini override et (bu, DB'den direct gelmiş olabilir)
  if (typeof player?.ratings === "object" && player?.ratings !== null) {
    Object.entries(player.ratings).forEach(([key, value]) => {
      if (key in ratings && typeof value === "number" && value > 0) {
        ratings[key as keyof typeof ratings] = value;
      }
    });
  }

  // C. Eğer tüm ratings hala 0 ise, overall'dan fill et
  const overallRating = Number(player?.overall ?? player?.rating ?? player?.ovr ?? 0) || 0;
  const primaryPositionHasRating = ratings[primaryPosition] > 0;
  
  if (!primaryPositionHasRating && overallRating > 0) {
    // Overall rating'i primary position'a ata
    ratings[primaryPosition] = overallRating;
    // Eğer diğer ratings da 0 ise, overall'dan fill et (muhafazakar)
    Object.keys(ratings).forEach((key) => {
      if (ratings[key as keyof typeof ratings] === 0 && key !== primaryPosition) {
        ratings[key as keyof typeof ratings] = Math.max(50, overallRating - 5);
      }
    });
  }

  return {
    id: String(player?.id ?? ""),
    name: String(player?.name ?? ""),
    avatar: String(player?.avatar ?? ""),
    ratings,
    position: {
      primary: primaryPosition,
      secondary: undefined,
    },
    overall: overallRating || ratings[primaryPosition] || 50,
  } as Player;
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // Oyuncuları Supabase'den çek
  const fetchPlayers = useCallback(async () => {
    const { data, error } = await supabase.from("players").select("*");
    if (!error && data) {
      setPlayers(data.map((p) => normalizePlayer(p)));
    }
  }, []);

  // Oturum durumunu ve değişiklikleri dinle
  useEffect(() => {
    let hydrationTimeout: NodeJS.Timeout;
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          await fetchPlayers();
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        if (mounted) {
          setHydrated(true);
        }
      }
    };

    // 5 saniye sonra yine de hydrate et
    hydrationTimeout = setTimeout(() => {
      if (mounted && !hydrated) {
        setHydrated(true);
      }
    }, 5000);

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchPlayers();
      } else {
        setPlayers([]);
        setAttendance([]);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(hydrationTimeout);
      subscription.unsubscribe();
    };
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

      const { data: userExists } = await supabase.rpc("check_email_exists", {
        email_input: cleanEmail,
      });

      if (!userExists) {
        return {
          success: false,
          error: "Böyle bir hesap bulunamadı. Lütfen kayıt olun.",
        };
      }

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
          overall: (player as any).overall ?? 80,
          positions: (player as any).positions ?? [],
        })
        .select()
        .single();

      if (!error && data) {
        setPlayers((prev) => [...prev, normalizePlayer(data)]);
      } else if (error) {
        console.error("Oyuncu eklenirken hata:", error.message);
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
        overall: (player as any).overall ?? 80,
        positions: (player as any).positions ?? [],
      })
      .eq("id", player.id);

    if (!error) {
      const normalizedPlayer = normalizePlayer(player);
      setPlayers((prev) => prev.map((p) => (p.id === player.id ? normalizedPlayer : p)));
    } else {
      console.error("Oyuncu güncellenirken hata:", error.message);
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
      isAdmin,
      setIsAdmin,
      isAuthenticated: !!user,
      user,
      login,
      register,
      logout,
      warningMessage,
      setWarningMessage,
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
      isAdmin,
      user,
      login,
      register,
      logout,
      warningMessage,
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