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
    function validateVelocity(velocity) { if (!Number.isFinite(velocity) || velocity < 0 || velocity > 100)
        throw new RangeError('velocity must be 0..100'); return Math.round(velocity); }
    BalconyBand.validateVelocity = validateVelocity;
    function velocityGain(baseGain, velocity) { if (!Number.isFinite(baseGain) || baseGain < 0)
        throw new RangeError('base gain must be nonnegative'); return baseGain * validateVelocity(velocity) / 100; }
    BalconyBand.velocityGain = velocityGain;
    function voiceScheduled(muted, voice, velocity) { return voiceAudible(muted, voice) && validateVelocity(velocity) > 0; }
    BalconyBand.voiceScheduled = voiceScheduled;
    function validateSwing(swing) { if (!Number.isFinite(swing) || swing < 0 || swing > 45)
        throw new RangeError('swing must be 0..45'); return Math.round(swing); }
    BalconyBand.validateSwing = validateSwing;
    function validateCountInBars(bars) { if (!Number.isInteger(bars) || bars < 0 || bars > 2)
        throw new RangeError('count-in must be 0..2 bars'); return bars; }
    BalconyBand.validateCountInBars = validateCountInBars;
    function countInBeats(bars) { return validateCountInBars(bars) * 4; }
    BalconyBand.countInBeats = countInBeats;
    function countInIntervalMs(tempo) { return stepMs(tempo) * 2; }
    BalconyBand.countInIntervalMs = countInIntervalMs;
    function metronomeBeat(step) { if (!Number.isInteger(step) || step < 0 || step >= BalconyBand.STEP_COUNT)
        throw new RangeError('metronome step must be 0..15'); return { quarter: step % 2 === 0, barStart: step === 0 || step === 8 }; }
    BalconyBand.metronomeBeat = metronomeBeat;
    function advanceCountIn(remainingBeats) { if (!Number.isInteger(remainingBeats) || remainingBeats < 0)
        throw new RangeError('remaining count-in beats must be nonnegative'); const remaining = Math.max(0, remainingBeats - 1); return { remainingBeats: remaining, complete: remaining === 0 }; }
    BalconyBand.advanceCountIn = advanceCountIn;
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
    function loadGrooveLibrary(raw) {
        if (raw.length > 65536)
            throw new RangeError('groove library is limited to 65536 characters');
        let data;
        try {
            data = JSON.parse(raw);
        }
        catch (_error) {
            throw new TypeError('groove library is invalid JSON');
        }
        if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).sort().join(',') !== 'grooves,schema' || data.schema !== 1 || !Array.isArray(data.grooves) || data.grooves.length < 1 || data.grooves.length > 32)
            throw new TypeError('groove library schema is invalid');
        const result = Object.create(null);
        for (const item of data.grooves) {
            if (!item || typeof item !== 'object' || Array.isArray(item) || Object.keys(item).sort().join(',') !== 'note,song,tempo,title' || typeof item.title !== 'string' || item.title.trim().length < 1 || item.title.length > 60 || typeof item.note !== 'string' || item.note.trim().length < 1 || item.note.length > 180)
                throw new TypeError('groove entry metadata is invalid');
            const title = item.title.trim();
            if (Object.prototype.hasOwnProperty.call(result, title))
                throw new TypeError('groove titles must be unique');
            const loaded = importPattern(JSON.stringify({ schema: 1, tempo: item.tempo, song: item.song }));
            result[title] = { title, note: item.note.trim(), tempo: loaded.tempo, song: loaded.song };
        }
        return result;
    }
    BalconyBand.loadGrooveLibrary = loadGrooveLibrary;
    BalconyBand.PRESETS = {
        'Quiet Neighbour': { title: 'Quiet Neighbour', note: 'A soft four-corner pulse for late balcony practice.', tempo: 72, song: { kick: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false], snare: Array(BalconyBand.STEP_COUNT).fill(false), hat: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false] } },
        'Saucepan Parade': { title: 'Saucepan Parade', note: 'Bright straight eighths with a kitchen-counter backbeat.', tempo: 112, song: { kick: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false], snare: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false], hat: Array(BalconyBand.STEP_COUNT).fill(true) } },
        'Last Call Clap': { title: 'Last Call Clap', note: 'A clipped late-night stomp with a generous clap.', tempo: 128, song: { kick: [true, false, false, true, true, false, false, false, true, false, false, true, true, false, false, false], snare: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false], hat: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false] } }
    };
    Object.assign(BalconyBand.PRESETS, loadGrooveLibrary(`{"schema":1,"grooves":[
    {"title":"Midnight Halftime","note":"A roomy half-time march with patient backbeats at the midpoint of each bar.","tempo":78,"song":{"kick":[true,false,false,false,false,false,false,false,true,false,false,false,false,false,true,false],"snare":[false,false,false,false,true,false,false,false,false,false,false,false,true,false,false,false],"hat":[true,false,false,true,false,false,true,false,true,false,false,true,false,false,true,false]}},
    {"title":"Shuffle Cart","note":"Uneven hat chatter and a rolling kick for a supermarket aisle strut.","tempo":104,"song":{"kick":[true,false,false,true,false,false,true,false,true,false,false,false,true,false,false,true],"snare":[false,false,false,false,true,false,false,false,false,false,false,false,true,false,false,false],"hat":[false,true,false,true,false,false,true,false,false,true,false,true,false,false,true,false]}},
    {"title":"Window Clave","note":"A syncopated clave sketch with space around the hand percussion.","tempo":96,"song":{"kick":[true,false,false,true,false,false,true,false,false,true,false,false,true,false,false,false],"snare":[false,false,true,false,false,true,false,false,false,false,true,false,false,false,true,false],"hat":[true,false,true,false,true,false,false,true,true,false,true,false,true,false,false,true]}},
    {"title":"Three-Three-Two Tea","note":"A clear 3-3-2 grouping across eight eighth-notes, served in a square 4/4 bar.","tempo":90,"song":{"kick":[true,false,false,false,false,false,true,false,false,false,false,false,true,false,false,false],"snare":[false,false,false,false,false,false,false,false,true,false,false,false,false,false,false,false],"hat":[true,false,false,true,false,false,true,false,true,false,false,true,false,false,true,false]}},
    {"title":"Laundry Disco","note":"A bright four-on-the-floor pattern for sorting socks by moonlight.","tempo":118,"song":{"kick":[true,false,true,false,true,false,true,false,true,false,true,false,true,false,true,false],"snare":[false,false,true,false,false,false,true,false,false,false,true,false,false,false,true,false],"hat":[false,true,false,true,false,true,false,true,false,true,false,true,false,true,false,true]}},
    {"title":"Quiet Tapping","note":"Sparse fingertip percussion for the hour when every wall is thin.","tempo":66,"song":{"kick":[true,false,false,false,false,false,false,true,false,false,false,false,true,false,false,false],"snare":[false,false,false,false,false,true,false,false,false,false,false,false,false,true,false,false],"hat":[false,false,true,false,false,false,false,false,true,false,false,true,false,false,false,true]}}
  ]}`));
    function cloneSong(source) { return { kick: [...source.kick], snare: [...source.snare], hat: [...source.hat] }; }
    BalconyBand.cloneSong = cloneSong;
    function preset(name) { if (!Object.prototype.hasOwnProperty.call(BalconyBand.PRESETS, name))
        throw new RangeError('unknown preset'); const selected = BalconyBand.PRESETS[name]; return { title: selected.title, note: selected.note, tempo: selected.tempo, song: cloneSong(selected.song) }; }
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
    function normalizeSaveName(raw) {
        if (typeof raw !== 'string')
            throw new TypeError('save name must be text');
        const name = raw.trim();
        if (name.length < 1 || name.length > 40)
            throw new RangeError('save name must be 1..40 characters');
        return name;
    }
    BalconyBand.normalizeSaveName = normalizeSaveName;
    function exportSave(name, song, tempo) {
        return JSON.stringify({ schema: 1, name: normalizeSaveName(name), tempo: validateTempo(tempo), song: cloneSong(song) });
    }
    BalconyBand.exportSave = exportSave;
    function importSave(raw) {
        if (raw.length > 8192)
            throw new RangeError('save is limited to 8192 characters');
        let data;
        try {
            data = JSON.parse(raw);
        }
        catch (_error) {
            throw new TypeError('save data is invalid');
        }
        if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).sort().join(',') !== 'name,schema,song,tempo' || data.schema !== 1)
            throw new TypeError('save schema is invalid');
        const imported = importPattern(JSON.stringify({ schema: 1, tempo: data.tempo, song: data.song }));
        return { schema: 1, name: normalizeSaveName(data.name), tempo: imported.tempo, song: imported.song };
    }
    BalconyBand.importSave = importSave;
    function exportSaveCollection(slots) {
        const names = Object.keys(slots);
        if (names.length > 10)
            throw new RangeError('save limit is 10 slots');
        const clean = Object.create(null);
        for (const key of names) {
            const slot = importSave(exportSave(key, slots[key].song, slots[key].tempo));
            if (slot.name !== key)
                throw new TypeError('save slot name mismatch');
            clean[key] = slot;
        }
        return JSON.stringify({ schema: 1, slots: clean });
    }
    BalconyBand.exportSaveCollection = exportSaveCollection;
    function importSaveCollection(raw) {
        if (raw.length > 65536)
            throw new RangeError('save library is too large');
        let data;
        try {
            data = JSON.parse(raw);
        }
        catch (_error) {
            throw new TypeError('save library is invalid');
        }
        if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).sort().join(',') !== 'schema,slots' || data.schema !== 1 || !data.slots || typeof data.slots !== 'object' || Array.isArray(data.slots))
            throw new TypeError('save library schema is invalid');
        const names = Object.keys(data.slots);
        if (names.length > 10)
            throw new RangeError('save limit is 10 slots');
        const slots = Object.create(null);
        for (const key of names) {
            const slot = importSave(JSON.stringify(data.slots[key]));
            if (slot.name !== key)
                throw new TypeError('save slot name mismatch');
            slots[key] = slot;
        }
        return { schema: 1, slots };
    }
    BalconyBand.importSaveCollection = importSaveCollection;
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
    function copyVoice(song, voice) { return [...song[voice]]; }
    BalconyBand.copyVoice = copyVoice;
    function pasteVoice(song, voice, pattern) { if (pattern.length !== BalconyBand.STEP_COUNT || pattern.some((value) => typeof value !== 'boolean'))
        throw new TypeError('copied voice must be sixteen booleans'); return Object.assign(Object.assign({}, song), { [voice]: [...pattern] }); }
    BalconyBand.pasteVoice = pasteVoice;
    function invertVoice(song, voice) { return Object.assign(Object.assign({}, song), { [voice]: song[voice].map((on) => !on) }); }
    BalconyBand.invertVoice = invertVoice;
    function reverseVoice(song, voice) { return Object.assign(Object.assign({}, song), { [voice]: [...song[voice]].reverse() }); }
    BalconyBand.reverseVoice = reverseVoice;
    function analyzePattern(pattern) {
        const hits = pattern.filter(Boolean).length;
        const density = pattern.length ? Math.round((hits / pattern.length) * 1000) / 10 : 0;
        if (hits === 0)
            return { hits, density, longestGap: pattern.length };
        let longestGap = 0;
        let current = 0;
        for (let index = 0; index < pattern.length * 2; index++) {
            if (pattern[index % pattern.length])
                current = 0;
            else {
                current++;
                longestGap = Math.max(longestGap, current);
            }
        }
        return { hits, density, longestGap: Math.min(longestGap, pattern.length - 1) };
    }
    BalconyBand.analyzePattern = analyzePattern;
    function analyzeSong(song) {
        const voices = { kick: analyzePattern(song.kick), snare: analyzePattern(song.snare), hat: analyzePattern(song.hat) };
        let sharedSteps = 0;
        for (let index = 0; index < BalconyBand.STEP_COUNT; index++) {
            let voicesOn = 0;
            for (const voice of BalconyBand.VOICES)
                if (song[voice][index])
                    voicesOn++;
            if (voicesOn > 1)
                sharedSteps++;
        }
        return { voices, sharedSteps };
    }
    BalconyBand.analyzeSong = analyzeSong;
    function euclideanPattern(steps, pulses, rotation) {
        if (!Number.isInteger(steps) || steps < 1 || steps > 128)
            throw new RangeError('steps must be 1..128');
        if (!Number.isInteger(pulses) || pulses < 0 || pulses > steps)
            throw new RangeError(`pulses must be 0..${steps}`);
        if (!Number.isInteger(rotation) || rotation < 0 || rotation >= steps)
            throw new RangeError(`rotation must be 0..${steps - 1}`);
        return Array.from({ length: steps }, (_, index) => ((index - rotation + steps) % steps) * pulses % steps < pulses);
    }
    BalconyBand.euclideanPattern = euclideanPattern;
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
    function stepIntervalMs(tempo, step, swing) { if (!Number.isInteger(step) || step < 0)
        throw new RangeError('step must be nonnegative'); const base = stepMs(tempo); const amount = validateSwing(swing) / 100; return base * (step % 2 === 0 ? 1 + amount : 1 - amount); }
    BalconyBand.stepIntervalMs = stepIntervalMs;
})(BalconyBand || (BalconyBand = {}));
if (typeof module !== 'undefined')
    module.exports = BalconyBand;
