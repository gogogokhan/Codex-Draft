"use client";

import { AssignedPlayer, POSITION_LABELS, Position } from "@/types";
import { DraggablePlayer } from "./DraggablePlayer";

interface PitchSlotProps {
  position: Position;
  players: AssignedPlayer[];
  teamColor: "red" | "blue";
  draggable: boolean;
  draggingId: string | null;
  onDragStart: (playerId: string) => void;
  onDragEnd: () => void;
  onDrop: (targetPlayerId: string) => void;
}

export function PitchSlot({
  position,
  players,
  teamColor,
  draggable,
  draggingId,
  onDragStart,
  onDragEnd,
  onDrop,
}: PitchSlotProps) {
  return (
    <div
      className="flex min-h-[80px] flex-wrap items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-500/20 bg-black/20 p-2"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (players[0]) onDrop(players[0].id);
      }}
    >
      <span className="w-full text-center text-[9px] font-bold uppercase tracking-widest text-emerald-500/60">
        {POSITION_LABELS[position]}
      </span>
      {players.length === 0 ? (
        <span className="text-[10px] text-zinc-600">Boş</span>
      ) : (
        players.map((player) => (
          <div
            key={player.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDrop(player.id);
            }}
          >
            <DraggablePlayer
              player={player}
              teamColor={teamColor}
              draggable={draggable}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              isDragging={draggingId === player.id}
            />
          </div>
        ))
      )}
    </div>
  );
}
