# SautiOps

**Turn spoken operational problems into persistent work.**

SautiOps is a real-time voice operations desk that lets workers report issues conversationally. The agent asks for missing details, confirms the report and creates a real ticket. Teams can then check open work for shift handover and close completed tickets by voice.

**Flow:** Speak → Clarify → Confirm → Track → Handover → Close

### Stack
- AssemblyAI Voice Agent API
- FastAPI
- SQLModel
- SQLite / PostgreSQL
- Server-Sent Events (SSE)

### Quick start

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.api.main:app --reload --port 8000
```

Set your `ASSEMBLYAI_API_KEY`, `SAUTIOPS_PUBLIC_URL`, tool secrets, and database configuration in `.env`.

Publish the agent:

```bash
python -m app.agent.publish
```

Run tests:

```bash
pytest -q
```

### Demo

Say:

> “The freezer in the back room stopped cooling and some stock may be at risk.”

Confirm the ticket, then ask:

> “What is still open for the next shift?”

Finally:

> “Close SO-0001. The freezer was repaired.”

### Security

Permanent API keys stay server-side. Tool routes are authenticated, browser sessions use temporary tokens and secrets are never committed.

### One-line pitch

**SautiOps turns spoken operational problems into trackable work, so the next shift inherits the work—not just the story.**
