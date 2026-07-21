# VAL Track — Valorant Aim Tracking Trainer

A lightweight browser aim trainer designed around Valorant sensitivity settings.

## Features

- Valorant DPI and sensitivity input with live eDPI calculation
- Smooth Tracking, Valorant Strafes, Micro-Corrections, and Unpredictable Movement drills
- 10 difficulty levels
- Adjustable target size and round duration
- Pointer-lock mouse tracking
- Live score, on-target percentage, and smoothness rating
- Post-round coaching report and progress rank
- Responsive tactical UI
- No installation, backend, or external libraries required

## Run locally

Open `index.html` directly, or run a small local server:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Publish to GitHub Pages

The included GitHub Actions workflow deploys the site automatically from `main`.

1. Create a public GitHub repository named `valorant-aim-trainer`.
2. Run `publish.ps1` from PowerShell.
3. Open the repository's **Settings → Pages**.
4. Set **Source** to **GitHub Actions**.

The public URL will be:

`https://mohammadeiad.github.io/valorant-aim-trainer/`

## Disclaimer

This is an independent practice tool. It is not affiliated with Riot Games or VALORANT and does not interact with the game client.
