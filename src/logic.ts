namespace BalconyBand {
  export type Pattern = boolean[];
  export type Song = { kick: Pattern; snare: Pattern; hat: Pattern };
  export const VOICES = ['kick', 'snare', 'hat'] as const;
  export const PRESETS: Record<string, { tempo: number; song: Song }> = {
    'Quiet Neighbour': { tempo: 72, song: { kick: [true, false, false, false, true, false, false, false], snare: Array(8).fill(false), hat: [false, false, true, false, false, false, true, false] } },
    'Saucepan Parade': { tempo: 112, song: { kick: [true, false, true, false, true, false, true, false], snare: [false, false, true, false, false, false, true, false], hat: Array(8).fill(true) } },
    'Last Call Clap': { tempo: 128, song: { kick: [true, false, false, true, true, false, false, false], snare: [false, false, true, false, false, false, true, false], hat: [true, false, true, false, true, false, true, false] } }
  };
  export function cloneSong(source: Song): Song { return { kick: [...source.kick], snare: [...source.snare], hat: [...source.hat] }; }
  export function preset(name: string): { tempo: number; song: Song } { const selected = PRESETS[name]; if (!selected) throw new RangeError('unknown preset'); return { tempo: selected.tempo, song: cloneSong(selected.song) }; }
  export function clearSong(): Song { return emptySong(); }
  export function emptySong(): Song { return { kick: Array(8).fill(false), snare: Array(8).fill(false), hat: Array(8).fill(false) }; }
  export function toggle(song: Song, voice: keyof Song, step: number): Song {
    if (!Number.isInteger(step) || step < 0 || step > 7) throw new RangeError('step must be 0..7');
    return { ...song, [voice]: song[voice].map((on, index) => index === step ? !on : on) };
  }
  export function validateTempo(tempo: number): number { if (!Number.isFinite(tempo) || tempo < 60 || tempo > 180) throw new RangeError('tempo must be 60..180'); return Math.round(tempo); }
  export function stepMs(tempo: number): number { return 60000 / validateTempo(tempo) / 2; }
}
declare const module: any;
if (typeof module !== 'undefined') module.exports = BalconyBand;
