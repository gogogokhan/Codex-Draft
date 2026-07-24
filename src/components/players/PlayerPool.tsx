"use client";

import { Plus, Users } from "lucide-react";
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
          <h2 className="flex items-center gap-2 text-xl font-bold text-white">
            <Users className="h-5 w-5 text-emerald-400" />
            Oyuncu Havuzu
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            {players.length} oyuncu kayıtlı — EA FC tarzı kartlar
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <button
              type="button"
              onClick={openCreate}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400"
            >
              <Plus className="h-4 w-4" />
              Oyuncu Ekle
            </button>
          )}
          <button
            type="button"
            onClick={() => setCurrentStep("match")}
            className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800"
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
            onDelete={(p) => deletePlayer(p.id)} // 👈 Oyuncunun ID'sini güvenle Context'e gönderiyoruz
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