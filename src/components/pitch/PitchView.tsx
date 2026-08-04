'use client';

import { SquadPitch } from '@/components/match/SquadPitch';
import type { Player } from '@/types';

interface PitchViewProps {
  onPlayerClick?: (player: Player) => void;
}

export function PitchView({ onPlayerClick }: PitchViewProps) {
  return <SquadPitch onPlayerClick={onPlayerClick} />;
}

export default PitchView;
