"use client";

import { AssignedPlayer } from "@/types";

interface TeamPowerBarProps {
  teamAName: string;
  teamBName: string;
  teamAPower: number;
  teamBPower: number;
}

export function TeamPowerBar({
  teamAName,
  teamBName,
  teamAPower,
  teamBPower,
}: TeamPowerBarProps) {
  const maxPower = Math.max(teamAPower, teamBPower, 1);
  const powerAWidth = (teamAPower / maxPower) * 100;
  const powerBWidth = (teamBPower / maxPower) * 100;
  const diff = Math.abs(teamAPower - teamBPower).toFixed(1);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
      <div className="mb-3 flex flex-col gap-1 text-center sm:flex-row sm:justify-center sm:gap-6">
        <span className="text-sm">
          <span className="font-semibold text-red-400">{teamAName}</span>
          <span className="text-zinc-400"> Ort. Reyting: </span>
          <span className="font-bold text-white">{teamAPower.toFixed(1)}</span>
        </span>
        <span className="hidden text-zinc-600 sm:inline">|</span>
        <span className="text-sm">
          <span className="font-semibold text-blue-400">{teamBName}</span>
          <span className="text-zinc-400"> Ort. Reyting: </span>
          <span className="font-bold text-white">{teamBPower.toFixed(1)}</span>
        </span>
      </div>

      <div className="space-y-2">
        <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-500"
            style={{ width: `${powerAWidth}%` }}
          />
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500"
            style={{ width: `${powerBWidth}%` }}
          />
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-zinc-500">
        Güç farkı: <span className="font-semibold text-emerald-400">{diff}</span>
      </p>
    </div>
  );
}
