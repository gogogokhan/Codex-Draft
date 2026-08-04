"use client";

import { usePersistentState } from "@/lib/usePersistentState";
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
import {
  DEFAULT_TEAM_CONFIG,
  DraftResult,
  Player,
  TeamConfig,
  type DraftMode,
  type Group,
  type GroupMembership,
  type GroupRole,
  type Position,
} from "@/types";
import { supabase } from "@/lib/supabaseClient";
import { getOverallRating, getPositionRating, normalizePositions } from "@/lib/positions";
import { calculateTeamPower } from "@/lib/ratings";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export type StepType = "pool" | "settings" | "attendance" | "squad" | string;
export type WorkspaceMode = "personal" | "community";
export interface AuthResponse {
  success: boolean;
  error?: string;
}

interface AppContextValue {
  players: Player[];
  addPlayer: (player: Omit<Player, "id">) => Promise<void>;
  updatePlayer: (player: Player) => Promise<void>;
  deletePlayer: (id: string) => Promise<void>;
  deletePlayers: (ids: string[]) => Promise<void>;
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
  groups: Group[];
  activeGroup: Group | null;
  activeGroupRole: GroupRole | null;
  groupMembers: GroupMembership[];
  isGroupsLoading: boolean;
  canEditPlayers: boolean;
  workspaceMode: WorkspaceMode;
  selectPersonalWorkspace: () => void;
  createGroup: (name: string) => Promise<AuthResponse>;
  joinGroup: (code: string) => Promise<AuthResponse>;
  selectGroup: (groupId: string) => void;
  refreshGroupMembers: () => Promise<void>;
  updateGroupMemberRole: (userId: string, role: Exclude<GroupRole, "owner">) => Promise<AuthResponse>;
  renameGroup: (name: string) => Promise<AuthResponse>;
  deleteGroup: () => Promise<AuthResponse>;
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

  const legacyPrimary = normalizePositionCode(
    player?.position?.primary ?? player?.position ?? player?.mainPosition ?? player?.pos ?? player?.role ?? "MID"
  );
  const overall = Number(player?.overall ?? player?.rating ?? player?.ovr ?? 50) || 50;

  return {
    id: String(player.id ?? ""),
    name: String(player.name ?? ""),
    avatar: String(player.avatar ?? ""),
    overall,
    positions: normalizePositions(player.positions ?? player.ratings, overall, legacyPrimary),
  };

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

  const processSource = (source: any) => {
    if (typeof source === 'object' && source !== null) {
      // Kaynak bir ratings nesnesi ise (örn: { GK: 80, DEF: 75 })
      if (!Array.isArray(source)) {
        Object.entries(source).forEach(([key, value]) => {
          const code = normalizePositionCode(key);
          if (code in ratings && typeof value === 'number' && value > 0) {
            ratings[code] = Math.min(99, Math.max(50, value));
          }
        });
      }
      // Kaynak bir positions dizisi ise (örn: [{ code: 'DEF', rating: 85 }])
      else if (Array.isArray(source)) {
        source.forEach((item: any) => {
          if (item && typeof item === 'object') {
            const code = normalizePositionCode(item.code ?? item.primary);
            const rating = Number(item.rating ?? 0);
            if (code in ratings && rating > 0) {
              ratings[code] = Math.min(99, Math.max(50, rating));
            }
          }
        });
      }
    }
  };

  // Önce `ratings` nesnesini işle (daha spesifik veri)
  processSource(player.ratings);
  // Sonra `positions` dizisini işle (daha genel veya eski veri olabilir)
  processSource(player.positions);

  // C. Eğer tüm ratings hala 0 ise, overall'dan fill et
  const overallRating = Number(player?.overall ?? player?.rating ?? player?.ovr ?? 0) || 0;
  const hasAnyRating = Object.values(ratings).some(r => r > 0);
  
  if (!hasAnyRating && overallRating > 0) {
    ratings[primaryPosition] = overallRating;
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
    positions: normalizePositions(player.positions ?? player.ratings, overallRating || 50, primaryPosition),
    overall: overallRating || ratings[primaryPosition] || 50,
  } as Player;
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupRoles, setGroupRoles] = useState<Record<string, GroupRole>>({});
  const [groupMembers, setGroupMembers] = useState<GroupMembership[]>([]);
  const [isGroupsLoading, setIsGroupsLoading] = useState(true);
  const [activeGroupId, setActiveGroupId] = usePersistentState<string | null>('codex-activeGroupId', null);
  const [workspaceMode, setWorkspaceMode] = usePersistentState<WorkspaceMode>('codex-workspaceMode', "personal");

  const [players, setPlayers] = usePersistentState<Player[]>('codex-players', []);
  const [attendance, setAttendance] = usePersistentState<string[]>('codex-attendance', []);
  const [teamConfig, setTeamConfigState] = usePersistentState<TeamConfig>('codex-teamConfig', DEFAULT_TEAM_CONFIG);
  const [draftResult, setDraftResult] = usePersistentState<DraftResult | null>('codex-draftResult', null);
  const [currentStep, setCurrentStepState] = usePersistentState<StepType>('codex-currentStep', "pool");
  const [draftMode, setDraftMode] = usePersistentState<DraftMode>('codex-draftMode', "overall");
  const [isAdmin, setIsAdmin] = usePersistentState<boolean>('codex-isAdmin', false);

  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const activeGroup = groups.find((group) => group.id === activeGroupId) ?? null;
  const activeGroupRole = activeGroup ? groupRoles[activeGroup.id] ?? null : null;
  const canEditPlayers = workspaceMode === "personal" || activeGroupRole === "owner" || activeGroupRole === "editor";

  const fetchGroups = useCallback(async () => {
    setIsGroupsLoading(true);
    const { data, error } = await supabase
      .from("group_members")
      .select("group_id, role, groups(*)")
      .order("joined_at", { ascending: true });

    if (error) {
      setGroups([]);
      setGroupRoles({});
      setIsGroupsLoading(false);
      throw new Error(error.message);
    }

    const groupMap = new Map<string, Group>();
    const nextRoles: Record<string, GroupRole> = {};
    for (const row of data ?? []) {
      const rawGroup = Array.isArray(row.groups) ? row.groups[0] : row.groups;
      if (!rawGroup) continue;
      const group = rawGroup as Group;
      groupMap.set(group.id, group);
      nextRoles[group.id] = row.role as GroupRole;
    }

    const baseGroups = Array.from(groupMap.values());
    const groupIds = baseGroups.map((group) => group.id);
    const playerCounts: Record<string, number> = {};
    const memberCounts: Record<string, number> = {};

    if (groupIds.length > 0) {
      const [{ data: playerRows }, { data: memberRows }] = await Promise.all([
        supabase.from("players").select("group_id").in("group_id", groupIds),
        supabase.from("group_members").select("group_id").in("group_id", groupIds),
      ]);
      for (const row of playerRows ?? []) {
        if (row.group_id) playerCounts[row.group_id] = (playerCounts[row.group_id] ?? 0) + 1;
      }
      for (const row of memberRows ?? []) {
        memberCounts[row.group_id] = (memberCounts[row.group_id] ?? 0) + 1;
      }
    }

    const nextGroups = baseGroups.map((group) => ({
      ...group,
      player_count: playerCounts[group.id] ?? 0,
      member_count: memberCounts[group.id] ?? 0,
    }));

    setGroups(nextGroups);
    setGroupRoles(nextRoles);
    setActiveGroupId((currentId) =>
      currentId && nextGroups.some((group) => group.id === currentId)
        ? currentId
        : nextGroups[0]?.id ?? null
    );
    setIsGroupsLoading(false);
    return nextGroups;
  }, [setActiveGroupId]);

  // Oyuncuları aktif gruba göre Supabase'den çek
  const fetchPlayers = useCallback(async (groupId: string | null) => {
    let query = supabase.from("players").select("*");
    query = groupId
      ? query.eq("group_id", groupId)
      : query.is("group_id", null).eq("user_id", user?.id ?? "");
    const { data, error } = await query.order("created_at", { ascending: false });
    if (!error && data) {
      setPlayers(data.map((p) => normalizePlayer(p)));
    }
  }, [user?.id, setPlayers]);

  const refreshGroupMembers = useCallback(async () => {
    if (!activeGroupId) {
      setGroupMembers([]);
      return;
    }
    const { data, error } = await supabase
      .from("group_members")
      .select("group_id, user_id, role, display_name, joined_at")
      .eq("group_id", activeGroupId)
      .order("joined_at", { ascending: true });
    if (error) throw new Error(error.message);
    setGroupMembers((data ?? []) as GroupMembership[]);
  }, [activeGroupId]);

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
          await fetchGroups();
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
      if (mounted) {
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
        fetchGroups().catch((error) => console.error("Group fetch error:", error));
      } else {
        setGroups([]);
        setGroupRoles({});
        setGroupMembers([]);
        setActiveGroupId(null);
        setPlayers([]);
        setAttendance([]);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(hydrationTimeout);
      subscription.unsubscribe();
    };
  }, [fetchGroups, setActiveGroupId, setPlayers, setAttendance]);

  useEffect(() => {
    const selectedGroupId = workspaceMode === "community" ? activeGroupId : null;
    if (!user || (workspaceMode === "community" && !selectedGroupId)) {
      setPlayers([]);
      setGroupMembers([]);
      return;
    }

    fetchPlayers(selectedGroupId).catch((error) => console.error("Player fetch error:", error));
    if (selectedGroupId) refreshGroupMembers().catch((error) => console.error("Member fetch error:", error));
    else setGroupMembers([]);

    const channel = supabase
      .channel(selectedGroupId ? `group-players-${selectedGroupId}` : `personal-players-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: selectedGroupId ? `group_id=eq.${selectedGroupId}` : `user_id=eq.${user.id}`,
        },
        () => {
          fetchPlayers(selectedGroupId).catch((error) => console.error("Player refresh error:", error));
          if (selectedGroupId) fetchGroups().catch((error) => console.error("Community stats refresh error:", error));
        }
      );
    if (selectedGroupId) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_members", filter: `group_id=eq.${selectedGroupId}` },
        () => {
          fetchGroups().catch((error) => console.error("Group role refresh error:", error));
          refreshGroupMembers().catch((error) => console.error("Member refresh error:", error));
        }
      );
    }
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeGroupId, workspaceMode, fetchGroups, fetchPlayers, refreshGroupMembers, setPlayers]);

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
        await fetchGroups();
      }

      return { success: true };
    },
    [fetchGroups]
  );

  // SUPABASE GİRİŞ
  const login = useCallback(
    async (email: string, password?: string): Promise<AuthResponse> => {
      if (!password) return { success: false, error: "Lütfen şifrenizi giriniz." };

      const cleanEmail = email.trim();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        let message = "E-posta adresi veya parola hatalı. Lütfen tekrar deneyin.";
        
        if (error.message.includes("Email not confirmed")) {
          message = "E-posta adresiniz henüz onaylanmamış.";
        }

        return { success: false, error: message };
      }

      if (data.session?.user || data.user) {
        setUser(data.session?.user || data.user);
        await fetchGroups();
      }

      return { success: true };
    },
    [fetchGroups]
  );

  // SUPABASE ÇIKIŞ
  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setGroups([]);
    setGroupRoles({});
    setGroupMembers([]);
    setActiveGroupId(null);
    setPlayers([]);
    setAttendance([]);
    setDraftResult(null);
    setTeamConfigState(DEFAULT_TEAM_CONFIG);
    setCurrentStepState("pool");
    setWorkspaceMode("personal");
    setDraftMode("overall");
    setIsAdmin(false);
  }, [setActiveGroupId, setPlayers, setAttendance, setDraftResult, setTeamConfigState, setCurrentStepState, setWorkspaceMode, setDraftMode, setIsAdmin]);

  const createGroup = useCallback(async (name: string): Promise<AuthResponse> => {
    const cleanName = name.trim();
    if (cleanName.length < 2) return { success: false, error: "Grup adı en az 2 karakter olmalıdır." };
    if (groups.some((group) => group.name.trim().toLocaleLowerCase("tr-TR") === cleanName.toLocaleLowerCase("tr-TR"))) {
      return { success: false, error: "Bu isimde bir gruba zaten üyesiniz. Lütfen farklı bir grup adı kullanın." };
    }
    const { data, error } = await supabase.rpc("create_group", { group_name: cleanName });
    if (error) return { success: false, error: error.message };
    const createdGroup = data as Group;
    await fetchGroups();
    if (createdGroup?.id) {
      setActiveGroupId(createdGroup.id);
      setWorkspaceMode("community");
    }
    return { success: true };
  }, [groups, fetchGroups, setActiveGroupId, setWorkspaceMode]);

  const joinGroup = useCallback(async (code: string): Promise<AuthResponse> => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return { success: false, error: "Davet kodunu giriniz." };
    const { data, error } = await supabase.rpc("join_group_by_code", { join_code: cleanCode });
    if (error) return { success: false, error: error.message };
    const joinedGroup = data as Group;
    await fetchGroups();
    if (joinedGroup?.id) {
      setActiveGroupId(joinedGroup.id);
      setWorkspaceMode("community");
    }
    return { success: true };
  }, [fetchGroups, setActiveGroupId, setWorkspaceMode]);

  const selectGroup = useCallback((groupId: string) => {
    if (!groups.some((group) => group.id === groupId)) return;
    setActiveGroupId(groupId);
    setWorkspaceMode("community");
    setAttendance([]);
    setDraftResult(null);
  }, [groups, setActiveGroupId, setWorkspaceMode, setAttendance, setDraftResult]);

  const selectPersonalWorkspace = useCallback(() => {
    setWorkspaceMode("personal");
    setAttendance([]);
    setDraftResult(null);
    setCurrentStepState("pool");
  }, [setWorkspaceMode, setAttendance, setDraftResult, setCurrentStepState]);

  const updateGroupMemberRole = useCallback(async (
    userId: string,
    role: Exclude<GroupRole, "owner">
  ): Promise<AuthResponse> => {
    if (!activeGroupId) return { success: false, error: "Aktif grup bulunamadı." };
    const { error } = await supabase.rpc("set_group_member_role", {
      target_group_id: activeGroupId,
      target_user_id: userId,
      new_role: role,
    });
    if (error) return { success: false, error: error.message };
    await refreshGroupMembers();
    return { success: true };
  }, [activeGroupId, refreshGroupMembers]);

  const renameGroup = useCallback(async (name: string): Promise<AuthResponse> => {
    if (!activeGroupId) return { success: false, error: "Aktif topluluk bulunamadı." };
    const cleanName = name.trim();
    if (cleanName.length < 2) return { success: false, error: "Topluluk adı en az 2 karakter olmalıdır." };
    const { error } = await supabase.rpc("rename_group", {
      target_group_id: activeGroupId,
      new_name: cleanName,
    });
    if (error) return { success: false, error: error.message };
    await fetchGroups();
    return { success: true };
  }, [activeGroupId, fetchGroups]);

  const deleteGroup = useCallback(async (): Promise<AuthResponse> => {
    if (!activeGroupId) return { success: false, error: "Aktif grup bulunamadı." };
    const { error } = await supabase.rpc("delete_group", { target_group_id: activeGroupId });
    if (error) return { success: false, error: error.message };
    setAttendance([]);
    setDraftResult(null);
    setCurrentStepState("pool");
    await fetchGroups();
    return { success: true };
  }, [activeGroupId, fetchGroups, setAttendance, setDraftResult, setCurrentStepState]);

  // OYUNCU EKLEME (DB Insert)
  const addPlayer = useCallback(
    async (player: Omit<Player, "id">) => {
      if (!user || !canEditPlayers || (workspaceMode === "community" && !activeGroup)) {
        throw new Error("Bu alanda oyuncu ekleme yetkiniz bulunmuyor.");
      }
      const { data, error } = await supabase
        .from("players")
        .insert({
          user_id: user.id,
          group_id: workspaceMode === "community" ? activeGroup?.id : null,
          created_by: user.id,
          updated_by: user.id,
          name: player.name,
          overall: (player as any).overall ?? 80,
          positions: player.positions.map((position) => JSON.stringify(position)),
        })
        .select()
        .single();

      if (!error && data) {
        // Yeni eklenen oyuncu havuzun en başında görünmelidir.
        setPlayers((prev) => [normalizePlayer(data), ...prev]);
      } else if (error) {
        throw new Error(error.message);
      }
    },
    [user, activeGroup, workspaceMode, canEditPlayers, setPlayers]
  );

  // OYUNCU GÜNCELLEME (DB Update)
  const updatePlayer = useCallback(async (player: Player) => {
    if (!user || !canEditPlayers || (workspaceMode === "community" && !activeGroup)) {
      throw new Error("Bu alanda oyuncu düzenleme yetkiniz bulunmuyor.");
    }
    let updateQuery = supabase
      .from("players")
      .update({
        name: player.name,
        overall: (player as any).overall ?? 80,
        positions: player.positions.map((position) => JSON.stringify(position)),
        updated_by: user.id,
      })
      .eq("id", player.id);
    updateQuery = workspaceMode === "community"
      ? updateQuery.eq("group_id", activeGroup?.id ?? "")
      : updateQuery.is("group_id", null).eq("user_id", user.id);
    const { error } = await updateQuery;

    if (!error) {
      const normalizedPlayer = normalizePlayer(player);
      setPlayers(currentPlayers => {
        return currentPlayers.map((p) => (p.id === player.id ? normalizedPlayer : p));
      });

      setDraftResult((currentDraft) => {
        if (!currentDraft) return null;

        const updateDraftTeam = (team: DraftResult["teamA"]) =>
          team.map((draftPlayer) => {
            if (draftPlayer.id !== player.id) return draftPlayer;

            return {
              ...normalizedPlayer,
              assignedPosition: draftPlayer.assignedPosition,
              effectiveRating:
                getPositionRating(normalizedPlayer, draftPlayer.assignedPosition) ||
                getOverallRating(normalizedPlayer),
            };
          });

        const teamA = updateDraftTeam(currentDraft.teamA);
        const teamB = updateDraftTeam(currentDraft.teamB);
        const calculateOverallPower = (team: DraftResult["teamA"]) => {
          if (team.length === 0) return 0;
          const total = team.reduce((sum, item) => sum + getOverallRating(item), 0);
          return Math.round((total / team.length) * 10) / 10;
        };

        return {
          teamA,
          teamB,
          teamAPower:
            draftMode === "overall" ? calculateOverallPower(teamA) : calculateTeamPower(teamA),
          teamBPower:
            draftMode === "overall" ? calculateOverallPower(teamB) : calculateTeamPower(teamB),
        };
      });
    } else {
      throw new Error(error.message);
    }
  }, [user, activeGroup, workspaceMode, canEditPlayers, draftMode, setDraftResult, setPlayers]);

  // OYUNCU SİLME (tek veya toplu DB Delete)
  const deletePlayers = useCallback(async (ids: string[]) => {
    if (!user || !canEditPlayers || (workspaceMode === "community" && !activeGroup)) {
      throw new Error("Bu alanda oyuncu silme yetkiniz bulunmuyor.");
    }
    const uniqueIds = Array.from(new Set(ids)).filter(Boolean);
    if (uniqueIds.length === 0) return;

    let deleteQuery = supabase
      .from("players")
      .delete()
      .in("id", uniqueIds);
    deleteQuery = workspaceMode === "community"
      ? deleteQuery.eq("group_id", activeGroup?.id ?? "")
      : deleteQuery.is("group_id", null).eq("user_id", user.id);
    const { error } = await deleteQuery;
    if (error) throw new Error(error.message);

    const deletedIds = new Set(uniqueIds);
    setPlayers((prev) => prev.filter((player) => !deletedIds.has(player.id)));
    setAttendance((prev) => prev.filter((playerId) => !deletedIds.has(playerId)));
    setDraftResult((currentDraft) => {
      if (!currentDraft) return null;
      const containsDeletedPlayer = [...currentDraft.teamA, ...currentDraft.teamB].some(
        (player) => deletedIds.has(player.id)
      );
      return containsDeletedPlayer ? null : currentDraft;
    });
  }, [user, activeGroup, workspaceMode, canEditPlayers, setPlayers, setAttendance, setDraftResult]);

  const deletePlayer = useCallback(
    async (id: string) => deletePlayers([id]),
    [deletePlayers]
  );

  const toggleAttendance = useCallback((id: string) => {
    setAttendance((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  }, [setAttendance]);

  const selectAllAttendance = useCallback(() => {
    setPlayers((current) => {
      setAttendance(current.map((p) => p.id));
      return current;
    });
  }, [setPlayers, setAttendance]);

  const clearAttendance = useCallback(() => setAttendance([]), [setAttendance]);

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
  }, [setTeamConfigState]);

  const setCurrentStep = useCallback((step: StepType) => {
    setCurrentStepState(step);
  }, [setCurrentStepState]);

  const generateDraft = useCallback(() => {
    const attending = players.filter((p) => attendance.includes(p.id));
    if (attending.length === 0) return;

    const randomized = shuffleArray(attending);
    const result = generateBalancedTeams(randomized, teamConfig, draftMode, {
      previousDraft: draftResult,
    });

    setDraftResult({ ...result });
    setCurrentStepState("squad");
  }, [players, attendance, teamConfig, draftMode, draftResult, setDraftResult, setCurrentStepState]);

  const swapDraftPlayers = useCallback(
    (playerIdA: string, playerIdB: string) => {
      setDraftResult((prev) =>
        prev ? { ...swapPlayers(prev, playerIdA, playerIdB) } : null
      );
    },
    [setDraftResult]
  );

  const clearDraft = useCallback(() => {
    setDraftResult(null);
  }, [setDraftResult]);

  const value = useMemo<AppContextValue>(
    () => ({
      players,
      addPlayer,
      updatePlayer,
      deletePlayer,
      deletePlayers,
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
      groups,
      activeGroup,
      activeGroupRole,
      groupMembers,
      isGroupsLoading,
      canEditPlayers,
      workspaceMode,
      selectPersonalWorkspace,
      createGroup,
      joinGroup,
      selectGroup,
      refreshGroupMembers,
      updateGroupMemberRole,
      renameGroup,
      deleteGroup,
    }),
    [
      players,
      addPlayer,
      updatePlayer,
      deletePlayer,
      deletePlayers,
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
      setIsAdmin,
      user,
      login,
      register,
      logout,
      warningMessage,
      groups,
      activeGroup,
      activeGroupRole,
      groupMembers,
      isGroupsLoading,
      canEditPlayers,
      workspaceMode,
      selectPersonalWorkspace,
      createGroup,
      joinGroup,
      selectGroup,
      refreshGroupMembers,
      updateGroupMemberRole,
      renameGroup,
      deleteGroup,
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
