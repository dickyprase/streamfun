'use client';

import { Volume2, VolumeX, Volume1 } from 'lucide-react';

interface VolumeControlProps {
  volume: number;
  muted: boolean;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
}

export default function VolumeControl({ volume, muted, onVolumeChange, onToggleMute }: VolumeControlProps) {
  const displayVolume = muted ? 0 : volume;

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className="flex items-center gap-1 group/vol">
      {/* Mute button */}
      <button
        onClick={onToggleMute}
        className="p-1.5 text-white/80 hover:text-white transition-colors rounded-md hover:bg-white/10"
        title={muted ? 'Unmute' : 'Mute'}
      >
        <VolumeIcon size={18} />
      </button>

      {/* Volume slider (hidden on mobile, shown on hover on desktop) */}
      <div className="hidden sm:flex items-center w-0 overflow-hidden group-hover/vol:w-20 transition-all duration-300">
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={displayVolume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          className="w-full h-1 appearance-none bg-white/30 rounded-full cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-500 
            [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-purple-500/50
            [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full 
            [&::-moz-range-thumb]:bg-purple-500 [&::-moz-range-thumb]:border-0"
        />
      </div>
    </div>
  );
}
