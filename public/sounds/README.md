# Alert sounds

## `critical-alert.mp3`

The pharmacist critical-alert banner plays `critical-alert.mp3` from this folder
when a new `critical_alerts` row arrives in real time.

Requirements for the file:

- A short alert tone, roughly 2 seconds long.
- A CC0 / public-domain or otherwise license-clear source so it can ship with the app.
- Encoded as MP3 and named exactly `critical-alert.mp3`, placed in `public/sounds/`.

### Graceful fallback

If `critical-alert.mp3` is missing (or the browser rejects playback), the app does
not fail. `CriticalAlertSound` automatically falls back to a Web Audio oscillator
that emits two short ~880Hz bursts, so an audible alert still fires.

### Browser autoplay note

Browsers block audio until a user gesture occurs. The banner arms audio on the
first click of the "Enable alert sound" pill, and on the first document
pointerdown as a fallback. No code change is needed once the file is added.

### Generate a placeholder tone with ffmpeg

You can create a temporary 2-second 880Hz tone for local testing:

```sh
ffmpeg -f lavfi -i "sine=frequency=880:duration=2" -ac 1 -ar 44100 -q:a 4 critical-alert.mp3
```

Replace this placeholder with a properly licensed alert tone before release.
