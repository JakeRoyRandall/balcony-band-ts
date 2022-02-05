"use strict";
/// <reference path="./logic.ts" />
const song = BalconyBand.emptySong();
const muted = BalconyBand.emptyMutes();
const velocities = { kick: 100, snare: 100, hat: 100 };
let tempo = 96;
let swing = 0;
let running = false;
let step = 0;
let timer;
let audio;
let starting = false;
let generation = 0;
let nextAudioTime = 0;
const activeNodes = new Set();
const $ = (id) => document.getElementById(id);
const feedback = $('feedback');
const grid = document.querySelector('.grid');
grid.setAttribute('aria-label', 'Sixteen step rhythm grid');
const labels = { kick: 'KICK', snare: 'SNARE', hat: 'HAT' };
const presetSelect = $('preset');
presetSelect.innerHTML = '<option value="">Load preset…</option>' + Object.keys(BalconyBand.PRESETS).map((name) => `<option>${name}</option>`).join('');
grid.innerHTML = '<div class="corner">VOICE / STEP</div>' + Array.from({ length: BalconyBand.STEP_COUNT }, (_, index) => `<div class="step-head">${index + 1}</div>`).join('') + Object.keys(labels).map((voice) => `<div class="voice-label"><span>${labels[voice]}</span><span class="voice-actions"><button type="button" class="rotate" data-rotate="left" data-rotate-voice="${voice}" aria-label="Shift ${labels[voice].toLowerCase()} left">←</button><button type="button" class="rotate" data-rotate="right" data-rotate-voice="${voice}" aria-label="Shift ${labels[voice].toLowerCase()} right">→</button><button type="button" class="mute" data-mute="${voice}" aria-label="Mute ${labels[voice].toLowerCase()}" aria-pressed="false">LIVE</button><input class="velocity" data-velocity="${voice}" type="range" min="0" max="100" value="100" aria-label="${labels[voice].toLowerCase()} velocity"><output class="velocity-value" data-velocity-value="${voice}">100%</output></span></div>${Array.from({ length: BalconyBand.STEP_COUNT }, (_, stepIndex) => `<button type="button" role="gridcell" data-voice="${voice}" data-step="${stepIndex}" aria-label="${labels[voice]} step ${stepIndex + 1}" aria-pressed="false" tabindex="-1"></button>`).join('')}`).join('');
let focusRow = 0;
let focusColumn = 0;
function focusCell(row, column, moveFocus) {
    var _a;
    focusRow = row;
    focusColumn = column;
    document.querySelectorAll('[data-voice][data-step]').forEach((button) => button.tabIndex = Number(button.dataset.step) === focusColumn && button.dataset.voice === BalconyBand.VOICES[focusRow] ? 0 : -1);
    if (moveFocus)
        (_a = document.querySelector(`[data-voice="${BalconyBand.VOICES[row]}"][data-step="${column}"]`)) === null || _a === void 0 ? void 0 : _a.focus();
}
const patternTools = document.createElement('div');
patternTools.className = 'pattern-tools';
patternTools.innerHTML = '<textarea id="pattern-json" aria-label="Pattern JSON" rows="3" placeholder="Pattern JSON lives here"></textarea><button id="export" class="transport">Export JSON</button><button id="import" class="transport">Import JSON</button><button id="undo" class="transport" disabled>Undo</button><button id="redo" class="transport" disabled>Redo</button><div class="euclidean-tools"><label for="euclidean-voice">EUCLIDEAN</label><select id="euclidean-voice" aria-label="Euclidean voice"><option value="kick">Kick</option><option value="snare">Snare</option><option value="hat">Hat</option></select><label for="euclidean-pulses">PULSES</label><input id="euclidean-pulses" type="number" min="0" max="16" value="3" required aria-label="Euclidean pulses"><label for="euclidean-rotation">ROTATION</label><input id="euclidean-rotation" type="number" min="0" max="15" value="0" required aria-label="Euclidean rotation"><button id="euclidean-generate" class="transport">Generate</button></div><div class="save-tools"><label for="save-name">SAVE NAME</label><input id="save-name" maxlength="40" placeholder="e.g. Tuesday kitchen" aria-label="Save name"><button id="save" class="transport">Save</button><select id="save-slot" aria-label="Saved pattern"><option value="">Choose saved pattern…</option></select><button id="load" class="transport">Load</button><button id="delete-save" class="transport">Delete</button></div>';
feedback.parentElement.insertBefore(patternTools, feedback);
const analysis = document.createElement('p');
analysis.className = 'analysis';
analysis.setAttribute('aria-live', 'polite');
feedback.parentElement.insertBefore(analysis, feedback);
let editHistoryState = BalconyBand.createHistory(song, tempo);
const saveKey = 'balcony-band:saves:v1';
function applySnapshot(snapshot) { Object.assign(song, BalconyBand.cloneSong(snapshot.song)); tempo = BalconyBand.validateTempo(snapshot.tempo); $('tempo').value = String(tempo); }
function commitPattern(next, nextTempo, message, stopPlayback = true) { const updated = BalconyBand.editHistory(editHistoryState, { song: next, tempo: nextTempo }); if (stopPlayback && (running || starting))
    stop(); if (updated === editHistoryState) {
    draw();
    return;
} editHistoryState = updated; applySnapshot(editHistoryState.present); feedback.textContent = message; draw(); }
function changePattern(next, nextTempo) { commitPattern(next, nextTempo === undefined ? tempo : BalconyBand.validateTempo(nextTempo), 'Pattern loaded. Press start when ready.'); }
function restoreHistory(next, message) { if (next === editHistoryState)
    return; if (running || starting)
    stop(); editHistoryState = next; applySnapshot(editHistoryState.present); feedback.textContent = message; draw(); }
function draw() {
    $('tempo-value').textContent = `${tempo} BPM`;
    $('swing-value').textContent = `${swing}%`;
    $('swing').value = String(swing);
    $('swing').setAttribute('aria-valuenow', String(swing));
    $('transport').textContent = running ? 'Stop groove' : 'Start groove';
    document.querySelectorAll('[data-step]').forEach((button) => button.classList.toggle('current', running && Number(button.dataset.step) === step));
    document.querySelectorAll('[data-voice][data-step]').forEach((button) => { const on = song[button.dataset.voice][Number(button.dataset.step)]; button.classList.toggle('on', on); button.setAttribute('aria-pressed', String(on)); });
    document.querySelectorAll('[data-mute]').forEach((button) => { const voice = button.dataset.mute; const isMuted = muted[voice]; button.setAttribute('aria-pressed', String(isMuted)); button.setAttribute('aria-label', `${isMuted ? 'Unmute' : 'Mute'} ${labels[voice].toLowerCase()}`); button.textContent = isMuted ? 'MUTED' : 'LIVE'; button.classList.toggle('muted', isMuted); });
    document.querySelectorAll('[data-velocity]').forEach((input) => { const voice = input.dataset.velocity; input.value = String(velocities[voice]); input.setAttribute('aria-valuenow', String(velocities[voice])); const output = document.querySelector(`[data-velocity-value="${voice}"]`); if (output)
        output.value = `${velocities[voice]}%`; });
    const report = BalconyBand.analyzeSong(song);
    analysis.textContent = BalconyBand.VOICES.map((voice) => { const item = report.voices[voice]; const gap = item.hits === 0 ? `${item.longestGap} rests` : `${item.longestGap}-step gap`; return `${labels[voice]} ${item.hits} hits · ${item.density}% · ${gap}`; }).join('  /  ') + `  ·  ${report.sharedSteps} shared steps`;
    $('undo').disabled = editHistoryState.past.length === 0;
    $('redo').disabled = editHistoryState.future.length === 0;
}
function readSaves() {
    try {
        const raw = window.localStorage.getItem(saveKey);
        return raw ? BalconyBand.importSaveCollection(raw).slots : Object.create(null);
    }
    catch (error) {
        feedback.textContent = `Saved patterns unavailable: ${error.message}`;
        return undefined;
    }
}
function writeSaves(slots) {
    try {
        window.localStorage.setItem(saveKey, BalconyBand.exportSaveCollection(slots));
        return true;
    }
    catch (error) {
        feedback.textContent = `Could not save pattern: ${error.message}`;
        return false;
    }
}
function refreshSaves() {
    const select = $('save-slot');
    const current = select.value;
    const slots = readSaves();
    if (!slots) {
        select.innerHTML = '<option value="">Saved patterns unavailable</option>';
        return;
    }
    select.innerHTML = '<option value="">Choose saved pattern…</option>' + Object.keys(slots).sort((a, b) => a.localeCompare(b)).map((name) => `<option value="${name.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')}">${name.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</option>`).join('');
    if (Object.prototype.hasOwnProperty.call(slots, current))
        select.value = current;
}
function track(node) { activeNodes.add(node); node.addEventListener('ended', () => activeNodes.delete(node), { once: true }); }
function blip(kind, at) {
    if (!audio)
        return;
    const level = BalconyBand.velocityGain(kind === 'kick' ? 0.16 : 0.045, velocities[kind]);
    if (level === 0)
        return;
    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(level, at + 0.005);
    if (kind === 'kick') {
        const oscillator = audio.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(150, at);
        oscillator.frequency.exponentialRampToValueAtTime(55, at + 0.12);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
        oscillator.connect(gain).connect(audio.destination);
        track(oscillator);
        oscillator.start(at);
        oscillator.stop(at + 0.2);
        return;
    }
    const source = audio.createBufferSource();
    const buffer = audio.createBuffer(1, audio.sampleRate * 0.12, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++)
        data[i] = Math.random() * 2 - 1;
    source.buffer = buffer;
    const filter = audio.createBiquadFilter();
    filter.type = kind === 'hat' ? 'highpass' : 'bandpass';
    filter.frequency.value = kind === 'hat' ? 5000 : 1800;
    source.connect(filter).connect(gain).connect(audio.destination);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + (kind === 'hat' ? 0.045 : 0.11));
    track(source);
    source.start(at);
    source.stop(at + 0.12);
}
function tick() {
    if (!running)
        return;
    if (!audio)
        return;
    if (nextAudioTime < audio.currentTime - 0.1)
        nextAudioTime = audio.currentTime + 0.02;
    if (BalconyBand.voiceScheduled(muted, 'kick', velocities.kick) && song.kick[step])
        blip('kick', nextAudioTime);
    if (BalconyBand.voiceScheduled(muted, 'snare', velocities.snare) && song.snare[step])
        blip('snare', nextAudioTime);
    if (BalconyBand.voiceScheduled(muted, 'hat', velocities.hat) && song.hat[step])
        blip('hat', nextAudioTime);
    draw();
    nextAudioTime += BalconyBand.stepIntervalMs(tempo, step, swing) / 1000;
    step = (step + 1) % BalconyBand.STEP_COUNT;
    timer = window.setTimeout(tick, Math.max(8, (nextAudioTime - audio.currentTime) * 1000));
}
async function start() { if (running || starting)
    return; starting = true; const token = ++generation; try {
    audio = audio || new AudioContext();
    await audio.resume();
    if (token !== generation)
        return;
    running = true;
    starting = false;
    step = 0;
    nextAudioTime = audio.currentTime + 0.02;
    feedback.textContent = 'Balcony is live.';
    tick();
}
catch (_error) {
    if (token === generation) {
        starting = false;
        feedback.textContent = 'Audio could not start. Try again.';
    }
} }
function stop() { starting = false; generation++; running = false; if (timer !== undefined)
    window.clearTimeout(timer); timer = undefined; activeNodes.forEach((node) => { try {
    node.stop();
}
catch (_error) { /* already ended */ } }); activeNodes.clear(); if (audio)
    void audio.suspend(); feedback.textContent = 'Paused. The upstairs neighbour approves.'; draw(); }
document.querySelectorAll('[data-voice][data-step]').forEach((button) => {
    button.addEventListener('click', () => { const voice = button.dataset.voice; const column = Number(button.dataset.step); focusCell(BalconyBand.VOICES.indexOf(voice), column, false); const next = BalconyBand.cloneSong(song); next[voice] = BalconyBand.toggle(song, voice, column)[voice]; commitPattern(next, tempo, `${labels[voice]} step ${column + 1} changed.`, false); });
    button.addEventListener('keydown', (event) => {
        const key = event.key;
        if (key === ' ' || key === 'Enter') {
            event.preventDefault();
            button.click();
            return;
        }
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key))
            return;
        event.preventDefault();
        const next = BalconyBand.navigateGrid(focusRow, focusColumn, key);
        focusCell(next.row, next.column, true);
    });
});
document.querySelectorAll('[data-mute]').forEach((button) => button.addEventListener('click', () => { const voice = button.dataset.mute; const next = BalconyBand.toggleMute(muted, voice); Object.assign(muted, next); feedback.textContent = muted[voice] ? `${labels[voice]} muted for audition.` : `${labels[voice]} back in the mix.`; draw(); }));
document.querySelectorAll('[data-rotate]').forEach((button) => button.addEventListener('click', () => { const voice = button.dataset.rotateVoice; const direction = button.dataset.rotate; const next = BalconyBand.rotateVoice(song, voice, direction); commitPattern(next, tempo, `${labels[voice]} shifted ${direction}.`, false); }));
document.querySelectorAll('[data-velocity]').forEach((input) => input.addEventListener('input', () => { const voice = input.dataset.velocity; try {
    velocities[voice] = BalconyBand.validateVelocity(Number(input.value));
    feedback.textContent = `${labels[voice]} velocity ${velocities[voice]}%.`;
    draw();
}
catch (error) {
    feedback.textContent = `Velocity failed: ${error.message}`;
} }));
$('undo').addEventListener('click', () => restoreHistory(BalconyBand.undoHistory(editHistoryState), 'Undid pattern edit.'));
$('redo').addEventListener('click', () => restoreHistory(BalconyBand.redoHistory(editHistoryState), 'Redid pattern edit.'));
$('transport').addEventListener('click', () => { if (running || starting)
    stop();
else
    void start(); });
$('preset').addEventListener('change', (event) => { const name = event.target.value; if (name) {
    const selected = BalconyBand.preset(name);
    changePattern(selected.song, selected.tempo);
    feedback.textContent = `${selected.title}: ${selected.note}`;
    event.target.value = '';
} });
$('clear').addEventListener('click', () => changePattern(BalconyBand.clearSong()));
$('export').addEventListener('click', () => { $('pattern-json').value = BalconyBand.exportPattern(song, tempo); feedback.textContent = 'Pattern exported to the box below.'; });
$('import').addEventListener('click', () => { try {
    const loaded = BalconyBand.importPattern($('pattern-json').value);
    changePattern(loaded.song, loaded.tempo);
    feedback.textContent = 'Pattern imported. Press start when ready.';
}
catch (error) {
    feedback.textContent = `Import failed: ${error.message}`;
} });
$('tempo').addEventListener('input', (event) => { tempo = BalconyBand.validateTempo(Number(event.target.value)); editHistoryState = Object.assign(Object.assign({}, editHistoryState), { present: Object.assign(Object.assign({}, editHistoryState.present), { tempo }) }); draw(); });
$('swing').addEventListener('input', (event) => { swing = BalconyBand.validateSwing(Number(event.target.value)); feedback.textContent = `Swing ${swing}%.`; draw(); });
$('euclidean-generate').addEventListener('click', () => { try {
    const voice = $('euclidean-voice').value;
    const pulses = $('euclidean-pulses').valueAsNumber;
    const rotation = $('euclidean-rotation').valueAsNumber;
    const next = BalconyBand.cloneSong(song);
    next[voice] = BalconyBand.euclideanPattern(BalconyBand.STEP_COUNT, pulses, rotation);
    commitPattern(next, tempo, `${labels[voice]} generated with ${pulses} pulses, rotation ${rotation}.`, false);
}
catch (error) {
    feedback.textContent = `Generate failed: ${error.message}`;
} });
function selectedSaveName() { return BalconyBand.normalizeSaveName($('save-name').value); }
function selectedSlotName() { return $('save-slot').value; }
$('save').addEventListener('click', () => { try {
    const name = selectedSaveName();
    const slots = readSaves();
    if (!slots)
        return;
    if (!Object.prototype.hasOwnProperty.call(slots, name) && Object.keys(slots).length >= 10)
        throw new RangeError('save limit is 10 slots');
    slots[name] = BalconyBand.importSave(BalconyBand.exportSave(name, song, tempo));
    if (writeSaves(slots)) {
        $('save-slot').value = name;
        feedback.textContent = `Saved “${name}”.`;
        refreshSaves();
        $('save-slot').value = name;
    }
}
catch (error) {
    feedback.textContent = `Save failed: ${error.message}`;
} });
$('load').addEventListener('click', () => { try {
    const name = selectedSlotName();
    if (!name)
        throw new RangeError('choose a saved pattern');
    const slots = readSaves();
    if (!slots)
        return;
    const slot = slots[name];
    if (!slot)
        throw new Error('saved pattern was not found');
    changePattern(slot.song, slot.tempo);
    feedback.textContent = `Loaded “${name}”.`;
}
catch (error) {
    feedback.textContent = `Load failed: ${error.message}`;
} });
$('delete-save').addEventListener('click', () => { try {
    const name = selectedSlotName();
    if (!name)
        throw new RangeError('choose a saved pattern');
    const slots = readSaves();
    if (!slots)
        return;
    if (!slots[name])
        throw new Error('saved pattern was not found');
    delete slots[name];
    if (writeSaves(slots)) {
        refreshSaves();
        feedback.textContent = `Deleted “${name}”.`;
    }
}
catch (error) {
    feedback.textContent = `Delete failed: ${error.message}`;
} });
focusCell(0, 0, false);
refreshSaves();
draw();
