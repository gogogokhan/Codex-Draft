"use client";

import { useState } from "react";
import { Check, ChevronDown, Copy, Settings2, UsersRound, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import type { GroupRole } from "@/types";

const ROLE_LABELS: Record<GroupRole, string> = { owner: "Grup Sahibi", editor: "Editör", member: "Üye" };

export function GroupMenu() {
  const {
    groups, activeGroup, activeGroupRole, groupMembers, selectGroup,
    createGroup, joinGroup, updateGroupMemberRole,
  } = useApp();
  const [open, setOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "join">("join");
  const [value, setValue] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!activeGroup) return null;

  const submit = async () => {
    setLoading(true);
    setMessage(null);
    const result = mode === "create" ? await createGroup(value) : await joinGroup(value);
    if (!result.success) setMessage(result.error ?? "İşlem tamamlanamadı.");
    else { setValue(""); setManageOpen(false); }
    setLoading(false);
  };

  const copyInvite = async () => {
    await navigator.clipboard.writeText(activeGroup.invite_code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const changeRole = async (userId: string, role: "editor" | "member") => {
    const result = await updateGroupMemberRole(userId, role);
    if (!result.success) setMessage(result.error ?? "Rol güncellenemedi.");
  };

  return (
    <>
      <div className="relative">
        <button type="button" onClick={() => setOpen((current) => !current)} className="flex max-w-[190px] items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-400/10 px-3 py-1.5 text-xs font-black text-violet-200 transition hover:bg-violet-400/20">
          <UsersRound className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{activeGroup.name}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        </button>
        {open && (
          <div className="absolute right-0 top-full z-[70] mt-2 w-64 rounded-2xl border border-zinc-700 bg-[#071126] p-2 shadow-2xl">
            <p className="px-2 pb-2 pt-1 text-[10px] font-black uppercase tracking-wider text-zinc-500">Gruplarım</p>
            {groups.map((group) => (
              <button key={group.id} type="button" onClick={() => { selectGroup(group.id); setOpen(false); }} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-bold text-zinc-200 hover:bg-cyan-500/10">
                <span className="truncate">{group.name}</span>
                {group.id === activeGroup.id && <Check className="h-4 w-4 text-cyan-300" />}
              </button>
            ))}
            <button type="button" onClick={() => { setManageOpen(true); setOpen(false); }} className="mt-2 flex w-full items-center gap-2 border-t border-zinc-800 px-3 pt-3 text-xs font-black text-cyan-300">
              <Settings2 className="h-4 w-4" /> Grup Yönetimi
            </button>
          </div>
        )}
      </div>

      {manageOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-[#101633] via-[#061127] to-[#020617] p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between">
              <div><h3 className="text-lg font-black text-white">{activeGroup.name}</h3><p className="text-xs text-zinc-400">Rolün: {activeGroupRole ? ROLE_LABELS[activeGroupRole] : "-"}</p></div>
              <button type="button" onClick={() => setManageOpen(false)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"><X className="h-5 w-5" /></button>
            </div>

            <div className="mb-5 rounded-2xl border border-violet-400/25 bg-violet-400/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-violet-200">Davet Kodu</p>
              <div className="mt-2 flex items-center justify-between gap-3"><code className="text-lg font-black tracking-[0.22em] text-white">{activeGroup.invite_code}</code><button type="button" onClick={copyInvite} className="flex items-center gap-1 rounded-lg bg-violet-300 px-3 py-2 text-xs font-black text-[#130b2b]">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Kopyalandı" : "Kopyala"}</button></div>
            </div>

            <div className="mb-5">
              <h4 className="mb-2 text-xs font-black uppercase tracking-wider text-cyan-200">Üyeler</h4>
              <div className="space-y-2">
                {groupMembers.map((member) => (
                  <div key={member.user_id} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                    <span className="truncate text-xs font-bold text-white">{member.display_name}</span>
                    {activeGroupRole === "owner" && member.role !== "owner" ? (
                      <select value={member.role} onChange={(event) => changeRole(member.user_id, event.target.value as "editor" | "member")} className="rounded-lg border border-cyan-500/25 bg-[#061127] px-2 py-1 text-xs font-bold text-cyan-200 outline-none">
                        <option value="member">Üye</option><option value="editor">Editör</option>
                      </select>
                    ) : <span className="text-[10px] font-black uppercase text-zinc-500">{ROLE_LABELS[member.role]}</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-1">
              <button type="button" onClick={() => { setMode("join"); setMessage(null); }} className={`rounded-xl px-3 py-2 text-xs font-black ${mode === "join" ? "bg-cyan-400 text-[#061127]" : "text-zinc-400"}`}>Gruba Katıl</button>
              <button type="button" onClick={() => { setMode("create"); setMessage(null); }} className={`rounded-xl px-3 py-2 text-xs font-black ${mode === "create" ? "bg-cyan-400 text-[#061127]" : "text-zinc-400"}`}>Yeni Grup</button>
            </div>
            <div className="mt-3 flex gap-2"><input value={value} onChange={(event) => setValue(mode === "join" ? event.target.value.toUpperCase() : event.target.value)} placeholder={mode === "join" ? "Davet kodu" : "Grup adı"} className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-cyan-400"/><button type="button" disabled={loading || !value.trim()} onClick={submit} className="rounded-xl bg-cyan-400 px-4 text-xs font-black text-[#061127] disabled:opacity-40">{loading ? "..." : "Devam"}</button></div>
            {message && <p className="mt-3 text-xs font-bold text-red-300">{message}</p>}
          </div>
        </div>
      )}
    </>
  );
}
