# EarSteps

A small, zero-install solfege ear trainer with a companion Setar practice mode.

> **Status: Beta.** EarSteps is being tested and refined during regular practice sessions.

## Run it

Open `index.html` in a modern browser, or serve this folder locally:

```powershell
python -m http.server 8080
```

Then visit `http://localhost:8080`.

No packages or build step are required. Audio is generated in the browser with the Web Audio API.

## Install on a phone

EarSteps is an installable Progressive Web App (PWA). After it is published on an **HTTPS** static host:

1. Open the HTTPS address on the phone while online.
2. On Android, press **Install app** in EarSteps or use the browser's **Install app / Add to Home screen** command.
3. On iPhone or iPad, open the address in Safari, press **Share**, and choose **Add to Home Screen**.
4. Launch EarSteps once from its home-screen icon. The quiz, Distance Lab, Setar practice, settings, and synthesized audio then work offline.

The laptop LAN address (`http://192.168...`) is useful for testing, but phone browsers require HTTPS before they allow service-worker installation. Any static HTTPS host can serve this folder; there is no backend or database to configure.

While online, EarSteps requests current app files and refreshes its cache. If the network is unavailable, it falls back to the last successfully cached version. The hosted beta also asks search engines not to index it through page metadata and `robots.txt`; this reduces discovery but is not access control.

## What is included

- Ear quizzes with 2-, 3-, or 4-note sequences
- Rising, falling, up-then-down, and down-then-up contours
- An optional second challenge after a correct shape answer: identify one highlighted interval from four choices
- Plain-language interval feedback (`2 scale steps`) alongside the standard musical name (`a 3rd`)
- Configurable solfege note set and playback speed
- Low (`Fa3–Fa4`) and high (`Fa4–Fa5`) Setar registers covering approximately 175–700 Hz
- A warm plucked-string synthesizer, plus an optional clean comparison tone
- Immediate feedback, note reveal, score, and streak tracking
- Revealed sequences use octave-qualified solfege (`Fa3`, `Sol4`, `Do5`) with exact frequencies, so pitch class and register remain distinct
- Setar practice phrases with reference playback and self-assessment
- An interactive **Distance Lab** with seven Do-based distances, upward/downward playback, interval names, and semitone references
- Upward Do–Re versus Mi–Fa and downward Re–Do versus Fa–Mi comparisons explaining why neighboring solfege notes do not always have the same acoustic width
- Keyboard shortcuts and a responsive layout

Run the sequence-generation tests with:

```powershell
node --test logic.test.js
```

## Pitch and sound

The pitches use twelve-tone equal temperament with `La4/A4 = 440 Hz`. In this standard, `Fa3/F3 = 174.61 Hz`, `Fa4/F4 = 349.23 Hz`, and `Fa5/F5 = 698.46 Hz`, closely matching the Setar range supplied for this project. The note picker divides that two-octave range into overlapping low and high registers so interval questions remain within one octave.

**Warm pluck** is generated in the browser with a damped-string model: a short noisy excitation is fed back at the pitch period and shaped with body and brightness filters. It has a sharp attack and natural decay closer to a plucked instrument. **Clean tone** uses soft sine partials and can be easier when comparing difficult intervals.

The current pitches are equal-tempered reference notes, not a complete model of Setar tuning. A later tuning editor could store exact frequencies for a particular instrument, tuning, or dastgah—including koron notes.

## Suggested learning progression

Begin with two-note rising/falling sequences and the notes Do, Re, and Mi. Once the direction feels reliable, enable **Guess the distance**. The app counts the gaps between scale degrees: Do to Re is one scale step (a 2nd), while Do to Mi is two scale steps (a 3rd). For longer sequences, it highlights and replays only one adjacent pair so the exercise tests pitch distance rather than short-term memory.

Use **Distance Lab** before or after a quiz session. Start by comparing 1, 2, and 3 scale steps, sing the target note before replaying it, and practice the same pair upward and downward. The lab uses Do as a consistent reference and also shows the exact semitone size. This distinction matters: Do–Re and Mi–Fa are both neighboring solfege notes (a 2nd), but Do–Re spans two semitones while Mi–Fa spans one.

## Copyright

Copyright © 2026 Amir Feghahati. All rights reserved.
