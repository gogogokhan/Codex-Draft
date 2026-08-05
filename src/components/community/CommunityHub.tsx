"use client";

import { useEffect, useState } from "react";
import {
  Check,
  ChevronRight,
  Copy,
  Crown,
  Database,
  KeyRound,
  Pencil,
  Plus,
  Settings,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import type { GroupRole } from "@/types";

type View = "communities" | "overview" | "members" | "settings";
type FormMode = "create" | "join" | null;

const ROLE_LABELS: Record<GroupRole, string> = {
  owner: "Kurucu Admin",
  admin: "Admin",
  editor: "Moderatör",
  member: "Üye",
};

export function CommunityHub() {
  const {
    groups,
    activeGroup,
    activeGroupRole,
    groupMembers,
    isGroupsLoading,
    createGroup,
    joinGroup,
    selectGroup,
    updateGroupMemberRole,
    removeGroupMember,
    renameGroup,
    deleteGroup,
    setCurrentStep,
    selectPersonalWorkspace,
    user,
  } = useApp();
  const [view, setView] = useState<View>("communities");
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [value, setValue] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [deleteValue, setDeleteValue] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setRenameValue(activeGroup?.name ?? "");
    setDeleteValue("");
    setMessage(null);
  }, [activeGroup?.id, activeGroup?.name]);

  const openForm = (mode: Exclude<FormMode, null>) => {
    setFormMode(mode);
    setValue("");
    setMessage(null);
  };

  const submitForm = async () => {
    if (!formMode) return;
    setLoading(true);
    setMessage(null);
    const result = formMode === "create" ? await createGroup(value) : await joinGroup(value);
    setLoading(false);
    if (!result.success) {
      setMessage(result.error ?? "İşlem tamamlanamadı.");
      return;
    }
    setFormMode(null);
    setValue("");
    setView("overview");
  };

  const copyInviteCode = async () => {
    if (!activeGroup) return;
    await navigator.clipboard.writeText(activeGroup.invite_code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const saveName = async () => {
    setLoading(true);
    setMessage(null);
    const result = await renameGroup(renameValue);
    setLoading(false);
    if (!result.success) setMessage(result.error ?? "Topluluk adı güncellenemedi.");
    else setMessage("Topluluk adı güncellendi.");
  };

  const removeCommunity = async () => {
    setLoading(true);
    setMessage(null);
    const result = await deleteGroup();
    setLoading(false);
    if (!result.success) {
      setMessage(result.error ?? "Topluluk silinemedi.");
      return;
    }
    setView("communities");
    setDeleteValue("");
  };

  const removeMember = async (userId: string, displayName: string) => {
    if (!window.confirm(`${displayName} topluluktan çıkarılsın mı? Bağlı oyuncu kartı da kaldırılacaktır.`)) return;
    setLoading(true);
    setMessage(null);
    const result = await removeGroupMember(userId);
    setLoading(false);
    if (!result.success) setMessage(result.error ?? "Üye topluluktan çıkarılamadı.");
  };

  if (isGroupsLoading) {
    return <div className="py-20 text-center text-sm font-bold text-zinc-400">Topluluklar yükleniyor...</div>;
  }

  const renderCommunities = () => (
    <>
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-400">Codex Draft</p>
          <button type="button" onClick={selectPersonalWorkspace} className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-black text-cyan-200 hover:bg-cyan-500/20">Kişisel Alana Dön</button>
        </div>
        <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">Topluluklarım</h2>
        <p className="mt-2 text-sm text-zinc-400">Ortak oyuncu havuzuna erişmek için bir topluluk seç.</p>
      </div>

      {groups.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {groups.map((group) => {
            const isActive = group.id === activeGroup?.id;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => {
                  selectGroup(group.id);
                  setView("overview");
                }}
                className={`group relative overflow-hidden rounded-3xl border p-5 text-left transition ${
                  isActive
                    ? "border-cyan-400/60 bg-gradient-to-br from-cyan-500/15 via-[#07162d] to-[#030817] shadow-[0_0_28px_rgba(6,182,212,0.14)]"
                    : "border-zinc-800 bg-[#071126] hover:border-cyan-500/35"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-300">
                      <UsersRound className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-black text-white">{group.name}</h3>
                      {isActive && <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-cyan-300">Aktif Topluluk</p>}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-zinc-600 transition group-hover:translate-x-1 group-hover:text-cyan-300" />
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/5 bg-black/20 px-3 py-2.5">
                    <p className="text-lg font-black text-white">{group.player_count ?? 0}</p>
                    <p className="text-[10px] font-bold uppercase text-zinc-500">Oyuncu</p>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-black/20 px-3 py-2.5">
                    <p className="text-lg font-black text-white">{group.member_count ?? 0}</p>
                    <p className="text-[10px] font-bold uppercase text-zinc-500">Üye</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-cyan-500/30 bg-cyan-500/5 px-6 py-12 text-center">
          <UsersRound className="mx-auto h-10 w-10 text-cyan-300" />
          <h3 className="mt-4 text-lg font-black text-white">Henüz bir topluluğun yok</h3>
          <p className="mt-2 text-sm text-zinc-400">Yeni bir topluluk oluşturabilir veya davet koduyla katılabilirsin.</p>
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button type="button" disabled={groups.length >= 3} onClick={() => openForm("create")} className="flex items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-black text-[#04101f] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-35">
          <Plus className="h-4 w-4" /> Topluluk Oluştur
        </button>
        <button type="button" disabled={groups.length >= 3} onClick={() => openForm("join")} className="flex items-center justify-center gap-2 rounded-2xl border border-violet-400/35 bg-violet-400/10 px-4 py-3 text-sm font-black text-violet-200 transition hover:bg-violet-400/20 disabled:cursor-not-allowed disabled:opacity-35">
          <KeyRound className="h-4 w-4" /> Davet Koduyla Katıl
        </button>
      </div>
      {groups.length >= 3 && <p className="mt-3 text-center text-xs font-bold text-amber-300">En fazla 3 toplulukta bulunabilirsiniz.</p>}
    </>
  );

  const renderActiveCommunity = () => {
    if (!activeGroup) return renderCommunities();
    const tabs: { id: View; label: string; icon: typeof UsersRound }[] = [
      { id: "overview", label: "Genel Bakış", icon: UsersRound },
      { id: "members", label: "Üyeler", icon: UserRound },
      { id: "settings", label: "Ayarlar", icon: Settings },
    ];

    return (
      <>
        <button type="button" onClick={() => setView("communities")} className="mb-5 text-xs font-black text-cyan-300 hover:text-cyan-200">← Topluluklarım</button>
        <div className="rounded-3xl border border-cyan-500/25 bg-gradient-to-br from-[#0a1b39] via-[#061127] to-[#020617] p-5 shadow-[0_0_32px_rgba(6,182,212,0.1)] sm:p-7">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-cyan-300"><ShieldCheck className="h-4 w-4" /> {activeGroupRole ? ROLE_LABELS[activeGroupRole] : "Üye"}</div>
              <h2 className="mt-2 text-2xl font-black text-white">{activeGroup.name}</h2>
            </div>
            <button type="button" onClick={() => setCurrentStep("pool")} className="flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-black text-[#04101f] hover:bg-cyan-300">
              <Database className="h-4 w-4" /> Oyuncu Havuzuna Git
            </button>
          </div>
          <div className="mt-6 flex gap-2 overflow-x-auto border-b border-white/10 pb-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return <button key={tab.id} type="button" onClick={() => { setView(tab.id); setMessage(null); }} className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-black ${view === tab.id ? "bg-cyan-400 text-[#04101f]" : "bg-white/5 text-zinc-400 hover:text-white"}`}><Icon className="h-4 w-4" />{tab.label}</button>;
            })}
          </div>

          {view === "overview" && (
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/5 p-4"><p className="text-2xl font-black text-white">{activeGroup.player_count ?? 0}</p><p className="mt-1 text-xs font-bold text-zinc-400">Oyuncu Havuzu</p></div>
              <div className="rounded-2xl border border-violet-400/15 bg-violet-400/5 p-4"><p className="text-2xl font-black text-white">{activeGroup.member_count ?? groupMembers.length}</p><p className="mt-1 text-xs font-bold text-zinc-400">Topluluk Üyesi</p></div>
              <div className="rounded-2xl border border-amber-400/15 bg-amber-400/5 p-4"><p className="text-sm font-black text-white">Henüz maç yok</p><p className="mt-1 text-xs font-bold text-zinc-400">Son Maç</p></div>
              <div className="sm:col-span-3 rounded-2xl border border-violet-400/20 bg-violet-400/10 p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-violet-200">Davet Kodu</p>
                <div className="mt-2 flex items-center justify-between gap-3"><code className="text-lg font-black tracking-[0.2em] text-white">{activeGroup.invite_code}</code><button type="button" onClick={copyInviteCode} className="flex items-center gap-2 rounded-xl bg-violet-300 px-3 py-2 text-xs font-black text-[#170b32]">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Kopyalandı" : "Kopyala"}</button></div>
              </div>
            </div>
          )}

          {view === "members" && (
            <div className="mt-6 space-y-3">
              {groupMembers.map((member) => (
                <div key={member.user_id} className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-black/20 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300">{member.role === "owner" ? <Crown className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}</div><div className="min-w-0"><p className="truncate text-sm font-black text-white">{member.display_name}</p><p className="text-[10px] font-bold uppercase text-zinc-500">{ROLE_LABELS[member.role]}</p></div></div>
                  <div className="flex items-center gap-2">
                    {(activeGroupRole === "owner" || activeGroupRole === "admin") && member.role !== "owner" && member.user_id !== user?.id && <select value={member.role} onChange={(event) => updateGroupMemberRole(member.user_id, event.target.value as "admin" | "editor" | "member")} className="rounded-xl border border-cyan-500/25 bg-[#061127] px-3 py-2 text-xs font-black text-cyan-200 outline-none"><option value="member">Üye</option><option value="editor">Moderatör</option><option value="admin">Admin</option></select>}
                    {member.role !== "owner" && member.user_id !== user?.id && (activeGroupRole === "owner" || activeGroupRole === "admin" || (activeGroupRole === "editor" && member.role === "member")) && <button type="button" disabled={loading} onClick={() => removeMember(member.user_id, member.display_name)} className="rounded-lg border border-red-500/25 bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20" title="Üyeyi topluluktan çıkar"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === "settings" && (
            <div className="mt-6 space-y-5">
              {activeGroupRole === "owner" || activeGroupRole === "admin" || activeGroupRole === "editor" ? (
                <>
                  <div className="rounded-2xl border border-zinc-800 bg-black/20 p-4">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Topluluk Adı</label>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row"><input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-[#020817] px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-cyan-400"/><button type="button" disabled={loading || renameValue.trim() === activeGroup.name} onClick={saveName} className="flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-black text-[#04101f] disabled:opacity-40"><Pencil className="h-4 w-4" /> Kaydet</button></div>
                  </div>
                  {(activeGroupRole === "owner" || activeGroupRole === "admin") && <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
                    <div className="flex items-center gap-2 text-sm font-black text-red-300"><Trash2 className="h-4 w-4" /> Topluluğu Kalıcı Olarak Sil</div>
                    <p className="mt-2 text-xs leading-relaxed text-red-200/75"><strong>{activeGroup.player_count ?? 0} oyuncu</strong> ve <strong>{activeGroup.member_count ?? groupMembers.length} üyelik</strong> kalıcı olarak silinecek. Bu işlem geri alınamaz.</p>
                    <label className="mt-4 block text-[10px] font-black uppercase tracking-wider text-red-300">Onaylamak için “{activeGroup.name}” yaz</label>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row"><input value={deleteValue} onChange={(event) => setDeleteValue(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-red-500/30 bg-[#160509] px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-red-400"/><button type="button" disabled={loading || deleteValue !== activeGroup.name} onClick={removeCommunity} className="rounded-xl bg-red-500 px-4 py-2.5 text-xs font-black text-white disabled:opacity-35">Topluluğu Sil</button></div>
                  </div>}
                </>
              ) : <p className="rounded-2xl border border-zinc-800 bg-black/20 p-4 text-sm text-zinc-400">Topluluk ayarlarını değiştirme yetkiniz bulunmuyor.</p>}
              {message && <p className={`rounded-xl border px-3 py-2 text-xs font-bold ${message.includes("güncellendi") ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>{message}</p>}
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <section className="mx-auto max-w-5xl py-4">
      {view === "communities" ? renderCommunities() : renderActiveCommunity()}
      {formMode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onMouseDown={() => setFormMode(null)}>
          <div className="w-full max-w-md rounded-3xl border border-cyan-500/30 bg-[#071126] p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between"><h3 className="text-lg font-black text-white">{formMode === "create" ? "Topluluk Oluştur" : "Davet Koduyla Katıl"}</h3><button type="button" onClick={() => setFormMode(null)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"><X className="h-5 w-5" /></button></div>
            <label className="mt-5 block text-[10px] font-black uppercase tracking-wider text-cyan-200">{formMode === "create" ? "Topluluk Adı" : "Davet Kodu"}</label>
            <input autoFocus value={value} onChange={(event) => setValue(formMode === "join" ? event.target.value.toUpperCase() : event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && value.trim()) submitForm(); }} placeholder={formMode === "create" ? "Örn. Codex Halı Saha" : "Örn. AB12CD34"} className="mt-2 w-full rounded-xl border border-cyan-500/30 bg-[#020817] px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-300"/>
            {message && <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300">{message}</p>}
            <button type="button" disabled={loading || !value.trim()} onClick={submitForm} className="mt-5 w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-black text-[#04101f] disabled:opacity-40">{loading ? "İşleniyor..." : formMode === "create" ? "Topluluğu Oluştur" : "Topluluğa Katıl"}</button>
          </div>
        </div>
      )}
    </section>
  );
}
