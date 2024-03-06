# Balcony Band

Balcony Band is a fictional, 2020-inspired browser rhythm sequencer created retrospectively in September 2026. The project date is deliberate calendar art, not a historical work record.

It is a 16-step, three-voice (kick, snare, hat) sequencer with a 60–180 BPM tempo control, 0–45% paired swing timing, keyboard-accessible grid buttons, per-voice audition mutes and 0–100 velocity controls, one-step wrapping voice rotation, per-voice Euclidean generation, internal voice copy/paste, bounded undo/redo for pattern edits, named local browser saves, and a bundled library of six annotated grooves. Tempo BPM is the quarter-note pulse. The sixteen grid positions are eighth-notes spanning two 4/4 bars; the count-in clicks quarter-notes. The optional playback metronome clicks every two grid steps, with a higher bar-start accent; it is separate from count-in and only sounds after Start groove. The grid uses one roving tab stop: arrows move between steps and voices, Home/End stay on the current voice, and Space/Enter toggles the focused cell. Each voice has clear left/right rotation controls that preserve note count and enter history. Playback never moves keyboard focus. Swing lengthens even-to-odd intervals and shortens odd-to-even intervals by the same percentage, preserving each two-step duration; 0% retains straight timing. Mute buttons preserve notes while skipping that voice in the scheduler; velocity scales its existing synth level live, with 0% silent and 100% unchanged. Undo/redo stores up to 50 song+tempo snapshots for cell edits, rotations, presets, imports, loads, generation, and clear; tempo, swing, mute, velocity, and metronome changes are session mix settings and are not history actions or part of the pattern/save schema. Invert toggles all hits and rests in a selected voice; Reverse flips its sixteen-step order. Each is one undoable live-safe edit. Copy captures an immutable voice pattern in an internal clipboard; Paste replaces only the chosen target voice as one undoable edit, while mutes, velocities, and tempo remain untouched. The readout reports each voice’s hits, share of the grid, longest gap in steps, or total rests when empty, plus shared steps. The save shelf has ten explicit, versioned localStorage slots with trimmed 1–40 character names; Save, Load, and Delete never autosave, and corrupt or unavailable storage is reported without changing the current pattern. Euclidean generation distributes 0–16 pulses across the sixteen steps with a 0–15 rotation and commits one undoable edit while preserving the other voices and live playback. The pattern shelf also supports downloading the validated pattern JSON and uploading a local JSON file capped at 64 KiB; malformed uploads are rejected before state changes, successful uploads enter undo history, and neither action starts audio. The bundled groove loader validates its schema, titles, notes, tempos, and sixteen-step voices at runtime; the listed groove names and notes are deliberately small hand-authored material. Audio begins only after the user clicks Start groove. The optional count-in uses quiet quarter-note clicks and a visible bar countdown; Stop cancels it before pattern playback begins.

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
