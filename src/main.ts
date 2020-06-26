/// <reference path="./logic.ts" />
const song = BalconyBand.emptySong();
let tempo = 96;
let running = false;
let step = 0;
let timer: number | undefined;
let audio: AudioContext | undefined;
let starting = false;
let generation = 0;
let nextAudioTime = 0;
const activeNodes = new Set<AudioScheduledSourceNode>();
const $ = (id: string) => document.getElementById(id)!;
const feedback = $('feedback');
function changePattern(next: BalconyBand.Song, nextTempo?: number): void { if (running || starting) stop(); Object.assign(song, BalconyBand.cloneSong(next)); if (nextTempo !== undefined) { tempo = BalconyBand.validateTempo(nextTempo); ($('tempo') as HTMLInputElement).value = String(tempo); } feedback.textContent = 'Pattern loaded. Press start when ready.'; draw(); }
function draw(): void {
  $('tempo-value').textContent = `${tempo} BPM`;
  $('transport').textContent = running ? 'Stop groove' : 'Start groove';
  document.querySelectorAll<HTMLButtonElement>('[data-step]').forEach((button) => button.classList.toggle('current', running && Number(button.dataset.step) === step));
  document.querySelectorAll<HTMLButtonElement>('[data-voice][data-step]').forEach((button) => { const on = song[button.dataset.voice as keyof BalconyBand.Song][Number(button.dataset.step)]; button.classList.toggle('on', on); button.setAttribute('aria-pressed', String(on)); });
}
function track(node: AudioScheduledSourceNode): void { activeNodes.add(node); node.addEventListener('ended', () => activeNodes.delete(node), { once: true }); }
function blip(kind: 'kick' | 'snare' | 'hat', at: number): void {
  if (!audio) return;
  const gain = audio.createGain(); gain.gain.setValueAtTime(0.0001, at); gain.gain.exponentialRampToValueAtTime(kind === 'kick' ? 0.16 : 0.045, at + 0.005);
  if (kind === 'kick') { const oscillator = audio.createOscillator(); oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(150, at); oscillator.frequency.exponentialRampToValueAtTime(55, at + 0.12); gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.18); oscillator.connect(gain).connect(audio.destination); track(oscillator); oscillator.start(at); oscillator.stop(at + 0.2); return; }
  const source = audio.createBufferSource(); const buffer = audio.createBuffer(1, audio.sampleRate * 0.12, audio.sampleRate); const data = buffer.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1; source.buffer = buffer; const filter = audio.createBiquadFilter(); filter.type = kind === 'hat' ? 'highpass' : 'bandpass'; filter.frequency.value = kind === 'hat' ? 5000 : 1800; source.connect(filter).connect(gain).connect(audio.destination); gain.gain.exponentialRampToValueAtTime(0.0001, at + (kind === 'hat' ? 0.045 : 0.11)); track(source); source.start(at); source.stop(at + 0.12);
}
function tick(): void {
  if (!running) return;
  if (!audio) return;
  if (nextAudioTime < audio.currentTime - 0.1) nextAudioTime = audio.currentTime + 0.02;
  if (song.kick[step]) blip('kick', nextAudioTime); if (song.snare[step]) blip('snare', nextAudioTime); if (song.hat[step]) blip('hat', nextAudioTime);
  draw(); step = (step + 1) % 8; nextAudioTime += BalconyBand.stepMs(tempo) / 1000; timer = window.setTimeout(tick, Math.max(8, (nextAudioTime - audio.currentTime) * 1000));
}
async function start(): Promise<void> { if (running || starting) return; starting = true; const token = ++generation; try { audio = audio || new AudioContext(); await audio.resume(); if (token !== generation) return; running = true; starting = false; step = 0; nextAudioTime = audio.currentTime + 0.02; feedback.textContent = 'Balcony is live.'; tick(); } catch (_error) { if (token === generation) { starting = false; feedback.textContent = 'Audio could not start. Try again.'; } } }
function stop(): void { starting = false; generation++; running = false; if (timer !== undefined) window.clearTimeout(timer); timer = undefined; activeNodes.forEach((node) => { try { node.stop(); } catch (_error) { /* already ended */ } }); activeNodes.clear(); if (audio) void audio.suspend(); feedback.textContent = 'Paused. The upstairs neighbour approves.'; draw(); }
document.querySelectorAll<HTMLButtonElement>('[data-voice][data-step]').forEach((button) => button.addEventListener('click', () => { const voice = button.dataset.voice as keyof BalconyBand.Song; song[voice] = BalconyBand.toggle(song, voice, Number(button.dataset.step))[voice]; draw(); }));
$('transport').addEventListener('click', () => { if (running || starting) stop(); else void start(); });
$('preset').addEventListener('change', (event) => { const name = (event.target as HTMLSelectElement).value; if (name) { const selected = BalconyBand.preset(name); changePattern(selected.song, selected.tempo); (event.target as HTMLSelectElement).value = ''; } });
$('clear').addEventListener('click', () => changePattern(BalconyBand.clearSong()));
$('tempo').addEventListener('input', (event) => { tempo = BalconyBand.validateTempo(Number((event.target as HTMLInputElement).value)); draw(); });
draw();
