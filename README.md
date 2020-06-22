# Balcony Band

Balcony Band is a fictional, 2020-inspired browser rhythm sequencer created retrospectively in September 2026. The project date is deliberate calendar art, not a historical work record.

It is an 8-step, three-voice (kick, snare, hat) sequencer with a 60–180 BPM tempo control, keyboard-accessible grid buttons, start/stop transport, and synthesized WebAudio percussion. Audio begins only after the user clicks Start groove. Core scope has no presets or export.

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
