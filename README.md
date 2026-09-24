SautiOps turns spoken operational problems into persistent work.

Instead of mid-shift forms, a worker reports an issue conversationally. The voice agent asks only for missing details, confirms the proposed ticket, and invokes authenticated HTTP tools. FastAPI validates and stores the ticket via SQLModel (SQLite by default). The same agent can retrieve current open work for handover and explicitly close a ticket. The dashboard receives live ticket updates over Server-Sent Events — so the next shift sees tracked work, not a verbal dump.

Architecture:

    Browser microphone
          |
          | single-use token + PCM16 audio
          v
    AssemblyAI Voice Agent API
          |
          | authenticated HTTPS tools
          v
    FastAPI
          |
          +-- SQLModel --> SQLite (or Postgres via DATABASE_URL)
          |
          +-- SSE /events --> dashboard

Requirements:

- Python 3.11 or newer
- An AssemblyAI API key
- A public HTTPS URL before publishing HTTP tools
- A modern Chromium, Firefox, or Safari browser

Environment:

Copy `.env.example` to `.env`.

- `ASSEMBLYAI_API_KEY`: permanent server-side key
- `ASSEMBLYAI_AGENT_ID`: populated after first publish
- `SAUTIOPS_PUBLIC_URL`: public HTTPS root, without a trailing slash
- `TOOL_BEARER_TOKEN`: long random secret shared only with stored HTTP tools
- `API_BEARER_TOKEN`: long random secret for public REST ticket mutations
- `DATABASE_URL`: SQLAlchemy URL (default `sqlite:///./data/sautiops.db`); use `postgresql+psycopg://…` for Postgres
- `DATABASE_PATH`: legacy SQLite file path used only when `DATABASE_URL` is unset

Generate secrets:

    python -c "import secrets; print(secrets.token_urlsafe(32))"

Local setup:

    python -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    cp .env.example .env
    uvicorn app.api.main:app --reload --port 8000

On Windows PowerShell:

    .venv\Scripts\Activate.ps1

The dashboard is served at the same host as the API. Localhost is a secure browser context, so microphone access works locally.

Publishing the voice agent:

AssemblyAI's server-side HTTP tools require public HTTPS and cannot reach localhost. Start FastAPI and expose port 8000 through any HTTPS tunnel. Set that public origin as `SAUTIOPS_PUBLIC_URL`, then run:

    python -m app.agent.publish

The first run prints an agent ID. Put it into `.env` as `ASSEMBLYAI_AGENT_ID`, restart FastAPI, and publish again whenever the prompt or tool definitions change:

    python -m app.agent.publish

The publisher uses `POST /v1/agents` initially and `PUT /v1/agents/{id}` afterward. Tool secrets are stored as write-only encrypted headers. The browser never receives the API key or tool secret.

Run tests:

    pytest -q

API smoke test:

    curl http://localhost:8000/health

    curl -X POST http://localhost:8000/tickets \
      -H "Authorization: Bearer $API_BEARER_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "title":"Freezer stopped cooling",
        "description":"The back-room freezer stopped cooling and stock may be at risk.",
        "category":"maintenance",
        "priority":"high",
        "location":"Back room",
        "reporter":"Amina"
      }'

    curl "http://localhost:8000/tickets?status=open"

    curl -X POST http://localhost:8000/tickets/SO-0001/close \
      -H "Authorization: Bearer $API_BEARER_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"note":"The freezer was repaired."}'

Deployment:

Deploy this as one persistent Python web service. Set the environment variables above. SQLite requires a persistent disk; without one, tickets disappear on redeploy or instance replacement. After the public HTTPS deployment is live:

1. Set `SAUTIOPS_PUBLIC_URL` to the deployment origin.
2. Run the publisher locally using the same environment values.
3. Copy the resulting agent ID into the deployed `ASSEMBLYAI_AGENT_ID`.
4. Restart the web service.
5. Open the deployment in a browser and allow microphone access.

Exact demonstration:

1. Start voice.
2. Say: “I need to report an issue. The freezer in the back room stopped cooling and some stock may be at risk.”
3. Answer any missing priority or reporter question.
4. Confirm with: “Yes.”
5. Verify the real ticket appears and the spoken ID matches it.
6. Ask: “What is still open for the next shift?”
7. Say: “Close SO-0001. The freezer was repaired.”
8. Verify the ticket disappears from open work and closure appears in activity.

Security:

- The permanent API key remains on the FastAPI server.
- The browser gets a single-use token with a 120-second redemption window.
- Tool routes require `TOOL_BEARER_TOKEN`.
- Public ticket mutations require `API_BEARER_TOKEN`.
- Dashboard reads and SSE stay unauthenticated so the browser never holds a secret.
- Agent HTTP tools require public HTTPS.
- Explicit call termination sends `session.end`.
- Do not commit `.env` or the SQLite database.

Known MVP limitations:

- SQLite is appropriate for one persistent instance, not horizontally scaled replicas. Point `DATABASE_URL` at Postgres when you need a shared database.
- SSE live updates are in-process; multiple app replicas would need a shared pub/sub layer.
- Agent publishing requires a public backend because HTTP tool hosts are validated.
- Voice sessions need network access and account entitlement.
- Automatic seed data is omitted so a clean database always starts with SO-0001.
