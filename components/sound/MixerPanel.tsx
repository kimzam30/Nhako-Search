'use client';

import { useAmbientAudio, type AudioVolumes } from '@/components/sound/AmbientAudioProvider';
import { PauseSvg, PlaySvg } from '@/components/ui/Icons';

const TRACKS: { id: keyof AudioVolumes; label: string }[] = [
  { id: 'master', label: 'Master volume' },
  { id: 'lofi', label: 'Lofi beats' },
  { id: 'rain', label: 'Rain' },
  { id: 'thunder', label: 'Thunder' },
  { id: 'wind', label: 'Wind' },
  { id: 'birds', label: 'Morning birds' },
  { id: 'sfx', label: 'Game sounds' },
];

/**
 * The one sound mixer, used by Settings and by the in-game Sound sheet, so
 * the two can never drift apart. Every slider carries a real label (axe
 * flagged all seven as unlabelled) and a live percentage.
 */
export function MixerPanel({ compact = false }: { compact?: boolean }) {
  const { volumes, setVolume, isPlaying, startAmbience, stopAmbience, applyPreset, presets } =
    useAmbientAudio();

  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={() => (isPlaying ? stopAmbience() : startAmbience())}
        aria-pressed={isPlaying}
        className={`press flex items-center justify-center gap-2 min-h-[48px] rounded-2xl border-2 border-line font-display font-bold text-lg ${
          isPlaying ? 'bg-surface text-ink' : 'bg-accent text-on-accent'
        }`}
      >
        {isPlaying ? <PauseSvg className="w-5 h-5" /> : <PlaySvg className="w-5 h-5" />}
        {isPlaying ? 'Pause ambience' : 'Play ambience'}
      </button>

      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Ambience presets">
        {presets.map(preset => (
          <button
            key={preset.id}
            type="button"
            onClick={() => applyPreset(preset.id)}
            className="press min-h-[44px] min-w-0 px-2 py-1 leading-tight break-words rounded-xl border-2 border-line bg-background font-body font-bold text-sm text-ink"
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className={`flex flex-col ${compact ? 'gap-3' : 'gap-4'}`}>
        {TRACKS.map(track => {
          const id = `mix-${track.id}`;
          return (
            <div key={track.id} className="flex flex-col gap-1">
              <div className="flex justify-between font-body text-sm font-bold">
                <label htmlFor={id} className="text-ink">
                  {track.label}
                </label>
                <span className="text-ink-2 tabular" aria-hidden="true">
                  {volumes[track.id]}%
                </span>
              </div>
              <input
                id={id}
                type="range"
                min={0}
                max={100}
                step={1}
                value={volumes[track.id]}
                onChange={e => setVolume(track.id, parseInt(e.target.value, 10))}
                aria-valuetext={`${volumes[track.id]} percent`}
                className="mixer-range w-full"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
