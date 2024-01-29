namespace BalconyBand {
  export type Pattern = boolean[];
  export type Song = { kick: Pattern; snare: Pattern; hat: Pattern };
  export type MuteState = Record<typeof VOICES[number], boolean>;
  export type PatternSnapshot = { song: Song; tempo: number };
  export type HistoryState = { past: PatternSnapshot[]; present: PatternSnapshot; future: PatternSnapshot[] };
  export const STEP_COUNT = 16;
  export const VOICES = ['kick', 'snare', 'hat'] as const;
  export function emptyMutes(): MuteState { return { kick: false, snare: false, hat: false }; }
  export function toggleMute(muted: MuteState, voice: typeof VOICES[number]): MuteState { return { ...muted, [voice]: !muted[voice] }; }
  export function voiceAudible(muted: MuteState, voice: typeof VOICES[number]): boolean { return !muted[voice]; }
  function sameSnapshot(left: PatternSnapshot, right: PatternSnapshot): boolean { return left.tempo === right.tempo && VOICES.every((voice) => left.song[voice].every((on, index) => on === right.song[voice][index])); }
  export function createHistory(song: Song, tempo: number): HistoryState { return { past: [], present: { song: cloneSong(song), tempo }, future: [] }; }
  export function editHistory(history: HistoryState, next: PatternSnapshot): HistoryState {
    if (sameSnapshot(history.present, next)) return history;
    return { past: [...history.past, { song: cloneSong(history.present.song), tempo: history.present.tempo }].slice(-50), present: { song: cloneSong(next.song), tempo: next.tempo }, future: [] };
  }
  export function undoHistory(history: HistoryState): HistoryState {
    if (history.past.length === 0) return history;
    const previous = history.past[history.past.length - 1];
    return { past: history.past.slice(0, -1), present: { song: cloneSong(previous.song), tempo: previous.tempo }, future: [{ song: cloneSong(history.present.song), tempo: history.present.tempo }, ...history.future] };
  }
  export function redoHistory(history: HistoryState): HistoryState {
    if (history.future.length === 0) return history;
    const next = history.future[0];
    return { past: [...history.past, { song: cloneSong(history.present.song), tempo: history.present.tempo }].slice(-50), present: { song: cloneSong(next.song), tempo: next.tempo }, future: history.future.slice(1) };
  }
  export const PRESETS: Record<string, { tempo: number; song: Song }> = {
    'Quiet Neighbour': { tempo: 72, song: { kick: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false], snare: Array(STEP_COUNT).fill(false), hat: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false] } },
    'Saucepan Parade': { tempo: 112, song: { kick: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false], snare: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false], hat: Array(STEP_COUNT).fill(true) } },
    'Last Call Clap': { tempo: 128, song: { kick: [true, false, false, true, true, false, false, false, true, false, false, true, true, false, false, false], snare: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false], hat: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false] } }
  };
  export function cloneSong(source: Song): Song { return { kick: [...source.kick], snare: [...source.snare], hat: [...source.hat] }; }
  export function preset(name: string): { tempo: number; song: Song } { const selected = PRESETS[name]; if (!selected) throw new RangeError('unknown preset'); return { tempo: selected.tempo, song: cloneSong(selected.song) }; }
  export function clearSong(): Song { return emptySong(); }
  export function exportPattern(song: Song, tempo: number): string { return JSON.stringify({ schema: 1, tempo: validateTempo(tempo), song: cloneSong(song) }); }
  export function importPattern(raw: string): { tempo: number; song: Song } {
    if (raw.length > 8192) throw new RangeError('pattern JSON is limited to 8192 characters');
    let data: any; try { data = JSON.parse(raw); } catch (_error) { throw new TypeError('pattern JSON is invalid'); }
    if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).sort().join(',') !== 'schema,song,tempo' || data.schema !== 1) throw new TypeError('pattern schema must contain only schema, tempo, and song');
    if (!Number.isInteger(data.tempo)) throw new TypeError('pattern tempo must be an integer');
    const song: Song = { kick: data.song && data.song.kick, snare: data.song && data.song.snare, hat: data.song && data.song.hat };
    for (const voice of VOICES) { if (!Array.isArray(song[voice]) || song[voice].length !== STEP_COUNT || song[voice].some((value) => typeof value !== 'boolean')) throw new TypeError('each voice must be sixteen booleans'); }
    return { tempo: validateTempo(data.tempo), song: cloneSong(song) };
  }
  export function emptySong(): Song { return { kick: Array(STEP_COUNT).fill(false), snare: Array(STEP_COUNT).fill(false), hat: Array(STEP_COUNT).fill(false) }; }
  export function toggle(song: Song, voice: keyof Song, step: number): Song {
    if (!Number.isInteger(step) || step < 0 || step >= STEP_COUNT) throw new RangeError(`step must be 0..${STEP_COUNT - 1}`);
    return { ...song, [voice]: song[voice].map((on, index) => index === step ? !on : on) };
  }
  export function navigateGrid(row: number, column: number, key: string, rows = 3, columns = STEP_COUNT): { row: number; column: number } {
    if (!Number.isInteger(row) || !Number.isInteger(column) || row < 0 || row >= rows || column < 0 || column >= columns) throw new RangeError('grid position is outside the grid');
    if (key === 'ArrowLeft') return { row, column: Math.max(0, column - 1) };
    if (key === 'ArrowRight') return { row, column: Math.min(columns - 1, column + 1) };
    if (key === 'ArrowUp') return { row: Math.max(0, row - 1), column };
    if (key === 'ArrowDown') return { row: Math.min(rows - 1, row + 1), column };
    if (key === 'Home') return { row, column: 0 };
    if (key === 'End') return { row, column: columns - 1 };
    return { row, column };
  }
  export function validateTempo(tempo: number): number { if (!Number.isFinite(tempo) || tempo < 60 || tempo > 180) throw new RangeError('tempo must be 60..180'); return Math.round(tempo); }
  export function stepMs(tempo: number): number { return 60000 / validateTempo(tempo) / 2; }
}
declare const module: any;
if (typeof module !== 'undefined') module.exports = BalconyBand;
