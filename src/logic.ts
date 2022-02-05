namespace BalconyBand {
  export type Pattern = boolean[];
  export type Song = { kick: Pattern; snare: Pattern; hat: Pattern };
  export type MuteState = Record<typeof VOICES[number], boolean>;
  export type PatternSnapshot = { song: Song; tempo: number };
  export type HistoryState = { past: PatternSnapshot[]; present: PatternSnapshot; future: PatternSnapshot[] };
  export type SaveSlot = { schema: 1; name: string; tempo: number; song: Song };
  export type SaveCollection = { schema: 1; slots: Record<string, SaveSlot> };
  export type VelocityState = Record<typeof VOICES[number], number>;
  export type GroovePreset = { title: string; note: string; tempo: number; song: Song };
  export type PatternVoiceAnalysis = { hits: number; density: number; longestGap: number };
  export type SongAnalysis = { voices: Record<typeof VOICES[number], PatternVoiceAnalysis>; sharedSteps: number };
  export const STEP_COUNT = 16;
  export const VOICES = ['kick', 'snare', 'hat'] as const;
  export function emptyMutes(): MuteState { return { kick: false, snare: false, hat: false }; }
  export function toggleMute(muted: MuteState, voice: typeof VOICES[number]): MuteState { return { ...muted, [voice]: !muted[voice] }; }
  export function voiceAudible(muted: MuteState, voice: typeof VOICES[number]): boolean { return !muted[voice]; }
  export function validateVelocity(velocity: number): number { if (!Number.isFinite(velocity) || velocity < 0 || velocity > 100) throw new RangeError('velocity must be 0..100'); return Math.round(velocity); }
  export function velocityGain(baseGain: number, velocity: number): number { if (!Number.isFinite(baseGain) || baseGain < 0) throw new RangeError('base gain must be nonnegative'); return baseGain * validateVelocity(velocity) / 100; }
  export function voiceScheduled(muted: MuteState, voice: typeof VOICES[number], velocity: number): boolean { return voiceAudible(muted, voice) && validateVelocity(velocity) > 0; }
  export function validateSwing(swing: number): number { if (!Number.isFinite(swing) || swing < 0 || swing > 45) throw new RangeError('swing must be 0..45'); return Math.round(swing); }
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
  export function loadGrooveLibrary(raw: string): Record<string, GroovePreset> {
    if (raw.length > 65536) throw new RangeError('groove library is limited to 65536 characters');
    let data: any; try { data = JSON.parse(raw); } catch (_error) { throw new TypeError('groove library is invalid JSON'); }
    if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).sort().join(',') !== 'grooves,schema' || data.schema !== 1 || !Array.isArray(data.grooves) || data.grooves.length < 1 || data.grooves.length > 32) throw new TypeError('groove library schema is invalid');
    const result: Record<string, GroovePreset> = Object.create(null);
    for (const item of data.grooves) {
      if (!item || typeof item !== 'object' || Array.isArray(item) || Object.keys(item).sort().join(',') !== 'note,song,tempo,title' || typeof item.title !== 'string' || item.title.trim().length < 1 || item.title.length > 60 || typeof item.note !== 'string' || item.note.trim().length < 1 || item.note.length > 180) throw new TypeError('groove entry metadata is invalid');
      const title = item.title.trim(); if (Object.prototype.hasOwnProperty.call(result, title)) throw new TypeError('groove titles must be unique');
      const loaded = importPattern(JSON.stringify({ schema: 1, tempo: item.tempo, song: item.song }));
      result[title] = { title, note: item.note.trim(), tempo: loaded.tempo, song: loaded.song };
    }
    return result;
  }
  export const PRESETS: Record<string, GroovePreset> = {
    'Quiet Neighbour': { title: 'Quiet Neighbour', note: 'A soft four-corner pulse for late balcony practice.', tempo: 72, song: { kick: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false], snare: Array(STEP_COUNT).fill(false), hat: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false] } },
    'Saucepan Parade': { title: 'Saucepan Parade', note: 'Bright straight eighths with a kitchen-counter backbeat.', tempo: 112, song: { kick: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false], snare: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false], hat: Array(STEP_COUNT).fill(true) } },
    'Last Call Clap': { title: 'Last Call Clap', note: 'A clipped late-night stomp with a generous clap.', tempo: 128, song: { kick: [true, false, false, true, true, false, false, false, true, false, false, true, true, false, false, false], snare: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false], hat: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false] } }
  };
  Object.assign(PRESETS, loadGrooveLibrary(`{"schema":1,"grooves":[
    {"title":"Midnight Halftime","note":"A roomy half-time march with one patient backbeat at the bar midpoint.","tempo":78,"song":{"kick":[true,false,false,false,false,false,false,false,true,false,false,false,false,false,true,false],"snare":[false,false,false,false,false,false,false,false,true,false,false,false,false,false,false,false],"hat":[true,false,false,true,false,false,true,false,true,false,false,true,false,false,true,false]}},
    {"title":"Shuffle Cart","note":"Uneven hat chatter and a rolling kick for a supermarket aisle strut.","tempo":104,"song":{"kick":[true,false,false,true,false,false,true,false,true,false,false,false,true,false,false,true],"snare":[false,false,false,false,true,false,false,false,false,false,false,false,true,false,false,false],"hat":[false,true,false,true,false,false,true,false,false,true,false,true,false,false,true,false]}},
    {"title":"Window Clave","note":"A syncopated clave sketch with space around the hand percussion.","tempo":96,"song":{"kick":[true,false,false,true,false,false,true,false,false,true,false,false,true,false,false,false],"snare":[false,false,true,false,false,true,false,false,false,false,true,false,false,false,true,false],"hat":[true,false,true,false,true,false,false,true,true,false,true,false,true,false,false,true]}},
    {"title":"Three-Three-Two Tea","note":"A clear 3-3-2 grouping across eight eighth-notes, served in a square 4/4 bar.","tempo":90,"song":{"kick":[true,false,false,false,false,false,true,false,false,false,false,false,true,false,false,false],"snare":[false,false,false,false,false,false,false,false,true,false,false,false,false,false,false,false],"hat":[true,false,false,true,false,false,true,false,false,true,false,false,true,false,false,true]}},
    {"title":"Laundry Disco","note":"A bright four-on-the-floor pattern for sorting socks by moonlight.","tempo":118,"song":{"kick":[true,false,false,false,true,false,false,false,true,false,false,false,true,false,false,false],"snare":[false,false,false,false,true,false,false,false,false,false,false,false,true,false,false,false],"hat":[false,true,false,true,false,true,false,true,false,true,false,true,false,true,false,true]}},
    {"title":"Quiet Tapping","note":"Sparse fingertip percussion for the hour when every wall is thin.","tempo":66,"song":{"kick":[true,false,false,false,false,false,false,true,false,false,false,false,true,false,false,false],"snare":[false,false,false,false,false,true,false,false,false,false,false,false,false,true,false,false],"hat":[false,false,true,false,false,false,false,false,true,false,false,true,false,false,false,true]}}
  ]}`));
  export function cloneSong(source: Song): Song { return { kick: [...source.kick], snare: [...source.snare], hat: [...source.hat] }; }
  export function preset(name: string): GroovePreset { if (!Object.prototype.hasOwnProperty.call(PRESETS, name)) throw new RangeError('unknown preset'); const selected = PRESETS[name]; return { title: selected.title, note: selected.note, tempo: selected.tempo, song: cloneSong(selected.song) }; }
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
  export function normalizeSaveName(raw: string): string {
    if (typeof raw !== 'string') throw new TypeError('save name must be text');
    const name = raw.trim();
    if (name.length < 1 || name.length > 40) throw new RangeError('save name must be 1..40 characters');
    return name;
  }
  export function exportSave(name: string, song: Song, tempo: number): string {
    return JSON.stringify({ schema: 1, name: normalizeSaveName(name), tempo: validateTempo(tempo), song: cloneSong(song) });
  }
  export function importSave(raw: string): SaveSlot {
    if (raw.length > 8192) throw new RangeError('save is limited to 8192 characters');
    let data: any; try { data = JSON.parse(raw); } catch (_error) { throw new TypeError('save data is invalid'); }
    if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).sort().join(',') !== 'name,schema,song,tempo' || data.schema !== 1) throw new TypeError('save schema is invalid');
    const imported = importPattern(JSON.stringify({ schema: 1, tempo: data.tempo, song: data.song }));
    return { schema: 1, name: normalizeSaveName(data.name), tempo: imported.tempo, song: imported.song };
  }
  export function exportSaveCollection(slots: Record<string, SaveSlot>): string {
    const names = Object.keys(slots);
    if (names.length > 10) throw new RangeError('save limit is 10 slots');
    const clean: Record<string, SaveSlot> = Object.create(null);
    for (const key of names) {
      const slot = importSave(exportSave(key, slots[key].song, slots[key].tempo));
      if (slot.name !== key) throw new TypeError('save slot name mismatch');
      clean[key] = slot;
    }
    return JSON.stringify({ schema: 1, slots: clean });
  }
  export function importSaveCollection(raw: string): SaveCollection {
    if (raw.length > 65536) throw new RangeError('save library is too large');
    let data: any; try { data = JSON.parse(raw); } catch (_error) { throw new TypeError('save library is invalid'); }
    if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).sort().join(',') !== 'schema,slots' || data.schema !== 1 || !data.slots || typeof data.slots !== 'object' || Array.isArray(data.slots)) throw new TypeError('save library schema is invalid');
    const names = Object.keys(data.slots);
    if (names.length > 10) throw new RangeError('save limit is 10 slots');
    const slots: Record<string, SaveSlot> = Object.create(null);
    for (const key of names) {
      const slot = importSave(JSON.stringify(data.slots[key]));
      if (slot.name !== key) throw new TypeError('save slot name mismatch');
      slots[key] = slot;
    }
    return { schema: 1, slots };
  }
  export function emptySong(): Song { return { kick: Array(STEP_COUNT).fill(false), snare: Array(STEP_COUNT).fill(false), hat: Array(STEP_COUNT).fill(false) }; }
  export function toggle(song: Song, voice: keyof Song, step: number): Song {
    if (!Number.isInteger(step) || step < 0 || step >= STEP_COUNT) throw new RangeError(`step must be 0..${STEP_COUNT - 1}`);
    return { ...song, [voice]: song[voice].map((on, index) => index === step ? !on : on) };
  }
  export function rotate(pattern: Pattern, direction: 'left' | 'right'): Pattern {
    if (pattern.length === 0) return [];
    const offset = direction === 'left' ? 1 : pattern.length - 1;
    return pattern.map((_, index) => pattern[(index + offset) % pattern.length]);
  }
  export function rotateVoice(song: Song, voice: keyof Song, direction: 'left' | 'right'): Song { return { ...song, [voice]: rotate(song[voice], direction) }; }
  export function analyzePattern(pattern: Pattern): PatternVoiceAnalysis {
    const hits = pattern.filter(Boolean).length; const density = pattern.length ? Math.round((hits / pattern.length) * 1000) / 10 : 0;
    if (hits === 0) return { hits, density, longestGap: pattern.length };
    let longestGap = 0; let current = 0;
    for (let index = 0; index < pattern.length * 2; index++) { if (pattern[index % pattern.length]) current = 0; else { current++; longestGap = Math.max(longestGap, current); } }
    return { hits, density, longestGap: Math.min(longestGap, pattern.length - 1) };
  }
  export function analyzeSong(song: Song): SongAnalysis {
    const voices = { kick: analyzePattern(song.kick), snare: analyzePattern(song.snare), hat: analyzePattern(song.hat) };
    let sharedSteps = 0; for (let index = 0; index < STEP_COUNT; index++) { let voicesOn = 0; for (const voice of VOICES) if (song[voice][index]) voicesOn++; if (voicesOn > 1) sharedSteps++; }
    return { voices, sharedSteps };
  }
  export function euclideanPattern(steps: number, pulses: number, rotation: number): Pattern {
    if (!Number.isInteger(steps) || steps < 1 || steps > 128) throw new RangeError('steps must be 1..128');
    if (!Number.isInteger(pulses) || pulses < 0 || pulses > steps) throw new RangeError(`pulses must be 0..${steps}`);
    if (!Number.isInteger(rotation) || rotation < 0 || rotation >= steps) throw new RangeError(`rotation must be 0..${steps - 1}`);
    return Array.from({ length: steps }, (_, index) => ((index - rotation + steps) % steps) * pulses % steps < pulses);
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
  export function stepIntervalMs(tempo: number, step: number, swing: number): number { if (!Number.isInteger(step) || step < 0) throw new RangeError('step must be nonnegative'); const base = stepMs(tempo); const amount = validateSwing(swing) / 100; return base * (step % 2 === 0 ? 1 + amount : 1 - amount); }
}
declare const module: any;
if (typeof module !== 'undefined') module.exports = BalconyBand;
