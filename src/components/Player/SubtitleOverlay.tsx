'use client';

import { useState, useEffect, useRef } from 'react';

export interface SubtitleSettings {
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  background: 'none' | 'semi' | 'solid';
  color: 'white' | 'yellow';
  position: 'bottom' | 'higher' | 'highest';
}

export const DEFAULT_SUBTITLE_SETTINGS: SubtitleSettings = {
  fontSize: 'medium',
  background: 'semi',
  color: 'white',
  position: 'higher',
};

const FONT_SIZE_MAP = {
  small: 'text-sm sm:text-base',
  medium: 'text-base sm:text-lg',
  large: 'text-lg sm:text-xl',
  xlarge: 'text-xl sm:text-2xl',
};

const BG_MAP = {
  none: '',
  semi: 'bg-black/60 px-3 py-1 rounded',
  solid: 'bg-black px-3 py-1 rounded',
};

const COLOR_MAP = {
  white: 'text-white',
  yellow: 'text-yellow-300',
};

const POSITION_MAP = {
  bottom: 'bottom-16 sm:bottom-20',
  higher: 'bottom-24 sm:bottom-28',
  highest: 'bottom-32 sm:bottom-36',
};

interface SubtitleOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  activeSubtitle: string | null;
  settings: SubtitleSettings;
}

export default function SubtitleOverlay({ videoRef, activeSubtitle, settings }: SubtitleOverlayProps) {
  const [cueText, setCueText] = useState('');

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeSubtitle) {
      setCueText('');
      return;
    }

    const handleCueChange = () => {
      let text = '';
      for (let i = 0; i < video.textTracks.length; i++) {
        const track = video.textTracks[i];
        if (track.mode === 'showing' || track.mode === 'hidden') {
          // Check if this is the active track
          const isActive = track.language === activeSubtitle ||
            track.label?.toLowerCase().includes(activeSubtitle.toLowerCase());
          if (isActive && track.activeCues && track.activeCues.length > 0) {
            const cue = track.activeCues[0] as VTTCue;
            text = cue.text || '';
            break;
          }
        }
      }
      setCueText(text);
    };

    // Set all tracks to hidden (we render manually) and listen for cue changes
    const setupTracks = () => {
      for (let i = 0; i < video.textTracks.length; i++) {
        const track = video.textTracks[i];
        const isActive = track.language === activeSubtitle ||
          track.label?.toLowerCase().includes(activeSubtitle.toLowerCase());
        // Use 'hidden' mode so cues fire but don't render natively
        track.mode = isActive ? 'hidden' : 'disabled';
        if (isActive) {
          track.addEventListener('cuechange', handleCueChange);
        }
      }
    };

    setupTracks();
    // Re-setup when tracks load
    video.textTracks.addEventListener('addtrack', setupTracks);

    return () => {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].removeEventListener('cuechange', handleCueChange);
      }
      video.textTracks.removeEventListener('addtrack', setupTracks);
      setCueText('');
    };
  }, [videoRef, activeSubtitle]);

  if (!cueText || !activeSubtitle) return null;

  return (
    <div className={`absolute left-0 right-0 z-25 flex justify-center pointer-events-none ${POSITION_MAP[settings.position]}`}>
      <div
        className={`text-center max-w-[85%] leading-relaxed font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${FONT_SIZE_MAP[settings.fontSize]} ${COLOR_MAP[settings.color]} ${BG_MAP[settings.background]}`}
        dangerouslySetInnerHTML={{ __html: cueText.replace(/\n/g, '<br/>') }}
      />
    </div>
  );
}
