"use strict";
var BalconyBand;
(function (BalconyBand) {
    BalconyBand.VOICES = ['kick', 'snare', 'hat'];
    BalconyBand.PRESETS = {
        'Quiet Neighbour': { tempo: 72, song: { kick: [true, false, false, false, true, false, false, false], snare: Array(8).fill(false), hat: [false, false, true, false, false, false, true, false] } },
        'Saucepan Parade': { tempo: 112, song: { kick: [true, false, true, false, true, false, true, false], snare: [false, false, true, false, false, false, true, false], hat: Array(8).fill(true) } },
        'Last Call Clap': { tempo: 128, song: { kick: [true, false, false, true, true, false, false, false], snare: [false, false, true, false, false, false, true, false], hat: [true, false, true, false, true, false, true, false] } }
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
            if (!Array.isArray(song[voice]) || song[voice].length !== 8 || song[voice].some((value) => typeof value !== 'boolean'))
                throw new TypeError('each voice must be eight booleans');
        }
        return { tempo: validateTempo(data.tempo), song: cloneSong(song) };
    }
    BalconyBand.importPattern = importPattern;
    function emptySong() { return { kick: Array(8).fill(false), snare: Array(8).fill(false), hat: Array(8).fill(false) }; }
    BalconyBand.emptySong = emptySong;
    function toggle(song, voice, step) {
        if (!Number.isInteger(step) || step < 0 || step > 7)
            throw new RangeError('step must be 0..7');
        return Object.assign(Object.assign({}, song), { [voice]: song[voice].map((on, index) => index === step ? !on : on) });
    }
    BalconyBand.toggle = toggle;
    function validateTempo(tempo) { if (!Number.isFinite(tempo) || tempo < 60 || tempo > 180)
        throw new RangeError('tempo must be 60..180'); return Math.round(tempo); }
    BalconyBand.validateTempo = validateTempo;
    function stepMs(tempo) { return 60000 / validateTempo(tempo) / 2; }
    BalconyBand.stepMs = stepMs;
})(BalconyBand || (BalconyBand = {}));
if (typeof module !== 'undefined')
    module.exports = BalconyBand;
