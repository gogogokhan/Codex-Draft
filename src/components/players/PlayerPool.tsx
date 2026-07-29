"use client";

import { UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { PlayerCard } from "@/components/players/PlayerCard";
import { PlayerModal } from "@/components/players/PlayerModal";
import { useApp } from "@/context/AppContext";
import { Player } from "@/types";

export function PlayerPool() {
  const { players, isAdmin, addPlayer, updatePlayer, deletePlayer, setCurrentStep } =
    useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Player | null>(null);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (player: Player) => {
    setEditing(player);
    setModalOpen(true);
  };

  const handleSave = (player: Player) => {
    if (editing) updatePlayer(player);
    else addPlayer(player);
  };

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black text-white tracking-wide">
            <Users className="h-5 w-5 text-cyan-400" />
            Oyuncu Havuzu
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            {players.length} oyuncu kayıtlı — EA FC tarzı kartlar
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-bold text-black transition-all hover:bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95 cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>Oyuncu Ekle</span>
          </button>
          
          <button
            type="button"
            onClick={() => setCurrentStep("settings")}
            className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-2.5 text-xs font-bold text-zinc-300 transition-all hover:border-zinc-700 hover:bg-zinc-800 hover:text-white cursor-pointer"
          >
            Maç Ayarları →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {players.map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            isAdmin={isAdmin}
            onEdit={openEdit}
            onDelete={(p) => deletePlayer(p.id)}
          />
        ))}
      </div>

      <PlayerModal
        open={modalOpen}
        player={editing}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </section>
  );
}