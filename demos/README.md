# SautiOps demo assets

## Record the 45-second walkthrough

1. Start the API:

```bash
source .venv/bin/activate
uvicorn app.api.main:app --host 127.0.0.1 --port 8000
```

2. Install recorder deps (once):

```bash
npm install
npx playwright install chromium
```

3. Record:

```bash
npm run demo:record
```

Outputs:

- `demos/sautiops-demo.mp4` — presentation file **with narration**
- `demos/sautiops-demo.webm` — Playwright source capture

If you already have a silent mp4, add audio only:

```bash
.venv/bin/pip install edge-tts
.venv/bin/python scripts/add-demo-voiceover.py
```

The script seeds closed tickets so the live create lands on **SO-0003**, drives a simulated voice conversation in the UI, and creates/closes real tickets through the API so Open Work and the Audit Trail update live.

## Voiceover

See [VOICEOVER.md](./VOICEOVER.md) for the synchronized narration.
