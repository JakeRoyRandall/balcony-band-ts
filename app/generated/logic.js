"use strict";
var BalconyBand;
(function (BalconyBand) {
    BalconyBand.STEP_COUNT = 16;
    BalconyBand.VOICES = ['kick', 'snare', 'hat'];
    function emptyMutes() { return { kick: false, snare: false, hat: false }; }
    BalconyBand.emptyMutes = emptyMutes;
    function toggleMute(muted, voice) { return Object.assign(Object.assign({}, muted), { [voice]: !muted[voice] }); }
    BalconyBand.toggleMute = toggleMute;
    function voiceAudible(muted, voice) { return !muted[voice]; }
    BalconyBand.voiceAudible = voiceAudible;
    function sameSnapshot(left, right) { return left.tempo === right.tempo && BalconyBand.VOICES.every((voice) => left.song[voice].every((on, index) => on === right.song[voice][index])); }
    function createHistory(song, tempo) { return { past: [], present: { song: cloneSong(song), tempo }, future: [] }; }
    BalconyBand.createHistory = createHistory;
    function editHistory(history, next) {
        if (sameSnapshot(history.present, next))
            return history;
        return { past: [...history.past, { song: cloneSong(history.present.song), tempo: history.present.tempo }].slice(-50), present: { song: cloneSong(next.song), tempo: next.tempo }, future: [] };
    }
    BalconyBand.editHistory = editHistory;
    function undoHistory(history) {
        if (history.past.length === 0)
            return history;
        const previous = history.past[history.past.length - 1];
        return { past: history.past.slice(0, -1), present: { song: cloneSong(previous.song), tempo: previous.tempo }, future: [{ song: cloneSong(history.present.song), tempo: history.present.tempo }, ...history.future] };
    }
    BalconyBand.undoHistory = undoHistory;
    function redoHistory(history) {
        if (history.future.length === 0)
            return history;
        const next = history.future[0];
        return { past: [...history.past, { song: cloneSong(history.present.song), tempo: history.present.tempo }].slice(-50), present: { song: cloneSong(next.song), tempo: next.tempo }, future: history.future.slice(1) };
    }
    BalconyBand.redoHistory = redoHistory;
    BalconyBand.PRESETS = {
        'Quiet Neighbour': { tempo: 72, song: { kick: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false], snare: Array(BalconyBand.STEP_COUNT).fill(false), hat: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false] } },
        'Saucepan Parade': { tempo: 112, song: { kick: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false], snare: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false], hat: Array(BalconyBand.STEP_COUNT).fill(true) } },
        'Last Call Clap': { tempo: 128, song: { kick: [true, false, false, true, true, false, false, false, true, false, false, true, true, false, false, false], snare: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false], hat: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false] } }
    };
    function cloneSong(source) { return { kick: [...source.kick], snare: [...source.snare], hat: [...source.hat] }; }
    BalconyBand.cloneSong = cloneSong;
    function preset(name) { const selected = BalconyBand.PRESETS[name]; if (!selected)
        throw new RangeError('unknown preset'); return { tempo: selected.tempo, song: cloneSong(selected.song) }; }
    BalconyBand.preset = preset;
    function clearSong() { return emptySong(); }
    BalconyBand.clearSong = clearSong;
    function exportPattern(song, tempo) { return JSON.stringify({ schema: 1, tempo: validateTempo(tempo), song: cloneSong(song) }); }
    BalconyBand.exportPattern = exportPattern;
    function importPattern(raw) {
        if (raw.length > 8192)
            throw new RangeError('pattern JSON is limited to 8192 characters');
        let data;
        try {
            data = JSON.parse(raw);
        }
        catch (_error) {
            throw new TypeError('pattern JSON is invalid');
        }
        if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).sort().join(',') !== 'schema,song,tempo' || data.schema !== 1)
            throw new TypeError('pattern schema must contain only schema, tempo, and song');
        if (!Number.isInteger(data.tempo))
            throw new TypeError('pattern tempo must be an integer');
        const song = { kick: data.song && data.song.kick, snare: data.song && data.song.snare, hat: data.song && data.song.hat };
        for (const voice of BalconyBand.VOICES) {
            if (!Array.isArray(song[voice]) || song[voice].length !== BalconyBand.STEP_COUNT || song[voice].some((value) => typeof value !== 'boolean'))
                throw new TypeError('each voice must be sixteen booleans');
        }
        return { tempo: validateTempo(data.tempo), song: cloneSong(song) };
    }
    BalconyBand.importPattern = importPattern;
    function emptySong() { return { kick: Array(BalconyBand.STEP_COUNT).fill(false), snare: Array(BalconyBand.STEP_COUNT).fill(false), hat: Array(BalconyBand.STEP_COUNT).fill(false) }; }
    BalconyBand.emptySong = emptySong;
    function toggle(song, voice, step) {
        if (!Number.isInteger(step) || step < 0 || step >= BalconyBand.STEP_COUNT)
            throw new RangeError(`step must be 0..${BalconyBand.STEP_COUNT - 1}`);
        return Object.assign(Object.assign({}, song), { [voice]: song[voice].map((on, index) => index === step ? !on : on) });
    }
    BalconyBand.toggle = toggle;
    function rotate(pattern, direction) {
        if (pattern.length === 0)
            return [];
        const offset = direction === 'left' ? 1 : pattern.length - 1;
        return pattern.map((_, index) => pattern[(index + offset) % pattern.length]);
    }
    BalconyBand.rotate = rotate;
    function rotateVoice(song, voice, direction) { return Object.assign(Object.assign({}, song), { [voice]: rotate(song[voice], direction) }); }
    BalconyBand.rotateVoice = rotateVoice;
    function navigateGrid(row, column, key, rows = 3, columns = BalconyBand.STEP_COUNT) {
        if (!Number.isInteger(row) || !Number.isInteger(column) || row < 0 || row >= rows || column < 0 || column >= columns)
            throw new RangeError('grid position is outside the grid');
        if (key === 'ArrowLeft')
            return { row, column: Math.max(0, column - 1) };
        if (key === 'ArrowRight')
            return { row, column: Math.min(columns - 1, column + 1) };
        if (key === 'ArrowUp')
            return { row: Math.max(0, row - 1), column };
        if (key === 'ArrowDown')
            return { row: Math.min(rows - 1, row + 1), column };
        if (key === 'Home')
            return { row, column: 0 };
        if (key === 'End')
            return { row, column: columns - 1 };
        return { row, column };
    }
    BalconyBand.navigateGrid = navigateGrid;
    function validateTempo(tempo) { if (!Number.isFinite(tempo) || tempo < 60 || tempo > 180)
        throw new RangeError('tempo must be 60..180'); return Math.round(tempo); }
    BalconyBand.validateTempo = validateTempo;
    function stepMs(tempo) { return 60000 / validateTempo(tempo) / 2; }
    BalconyBand.stepMs = stepMs;
})(BalconyBand || (BalconyBand = {}));
if (typeof module !== 'undefined')
    module.exports = BalconyBand;
