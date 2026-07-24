"use client";

import { motion } from "framer-motion";
import { AssignedPlayer, POSITION_LABELS } from "@/types";

interface DraggablePlayerProps {
  player: AssignedPlayer;
  teamColor: "red" | "blue";
  draggable: boolean;
  onDragStart: (playerId: string) => void;
  onDragEnd: () => void;
  isDragging?: boolean;
}

export function DraggablePlayer({
  player,
  teamColor,
  draggable,
  onDragStart,
  onDragEnd,
  isDragging,
}: DraggablePlayerProps) {
  const borderColor =
    teamColor === "red" ? "border-red-500/50" : "border-blue-500/50";
  const bgColor =
    teamColor === "red" ? "bg-red-500/10" : "bg-blue-500/10";

  return (
    <motion.div
      layout
      draggable={draggable}
      onDragStart={() => draggable && onDragStart(player.id)}
      onDragEnd={onDragEnd}
      whileHover={draggable ? { scale: 1.05 } : undefined}
      className={`flex min-w-[72px] flex-col items-center rounded-xl border px-2 py-1.5 ${borderColor} ${bgColor} ${
        draggable ? "cursor-grab active:cursor-grabbing" : ""
      } ${isDragging ? "opacity-40" : "opacity-100"}`}
    >
      <span className="text-lg leading-none">{player.avatar}</span>
      <span className="mt-0.5 max-w-[68px] truncate text-[10px] font-semibold text-white">
        {player.name.split(" ")[0]}
      </span>
      <span className="text-xs font-black text-emerald-400">
        {player.effectiveRating}
      </span>
      <span className="text-[8px] uppercase text-zinc-500">
        {POSITION_LABELS[player.assignedPosition]}
      </span>
    </motion.div>
  );
}
