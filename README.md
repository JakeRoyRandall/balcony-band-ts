# Balcony Band

Balcony Band is a fictional, 2020-inspired browser rhythm sequencer created retrospectively in September 2026. The project date is deliberate calendar art, not a historical work record.

It is a 16-step, three-voice (kick, snare, hat) sequencer with a 60–180 BPM tempo control, keyboard-accessible grid buttons, per-voice audition mutes, bounded undo/redo for pattern edits, start/stop transport, and synthesized WebAudio percussion. The grid uses one roving tab stop: arrows move between steps and voices, Home/End stay on the current voice, and Space/Enter toggles the focused cell. Playback never moves keyboard focus. Mute buttons preserve notes while skipping that voice in the scheduler. Undo/redo stores up to 50 song+tempo snapshots for cell edits, presets, imports, and clear; tempo-only and mute changes are not history actions. Audio begins only after the user clicks Start groove.

Build with the installed TypeScript compiler:

```sh
tsc
```

Then serve `app/` with any static server, for example `python3 -m http.server 4173 --directory app`, and open `http://localhost:4173`.

Run pure logic tests after compiling:

```sh
tsc
node test/logic.test.js
```
