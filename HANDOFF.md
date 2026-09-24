# AssemblyAI integration — handoff from the AssemblyAI Agent

_Exported 2026-09-24. This folder contains a scoping conversation with AssemblyAI's onboarding agent and the starter code it produced._

## Instructions for the coding agent picking this up

1. Read the conversation below — it has the use case, the decisions already made, and working starter code (shipped as the files listed under **Files**).
2. Ground yourself in AssemblyAI's live docs before writing code — training data goes stale fast here:
   - Docs MCP server (streamable HTTP, no auth needed): `https://www.assemblyai.com/docs/mcp` — semantic docs search + full-page reads + OpenAPI queries.
   - Or install the official agent skill: `npx skills add AssemblyAI/assemblyai-skill`
3. Use the official SDKs (`pip install assemblyai==1.5.4` / `npm install assemblyai@4.41.1`). The API key comes from the `ASSEMBLYAI_API_KEY` environment variable (see `.env.example`). The auth header is the raw key — **no `Bearer` prefix** (except the Voice Agent API, which does use Bearer).
4. Continue from where the conversation leaves off.

## Files

- `snippet-1.txt`
- `__init__.py`
- `__init__-2.py`
- `database.py`
- `models.py`
- `services.py`
- `main.py`
- `publish.py`
- `sautiops.json`
- `pcm-processor.js`
- `index.html`
- `styles.css`
- `app.js`
- `test_api.py`
- `conftest.py`
- `requirements.txt`
- `env.example`
- `snippet-18.txt`
- `render.yaml`
- `README.md`
- `snippet-21.sh`

## The conversation

### You

You are the lead software engineer, voice-AI architect, AssemblyAI Voice Agent specialist, product engineer and hackathon engineer for this project.

Your job is to TAKE THE PROJECT FROM THE CURRENT REPO TO A WORKING, DEMONSTRABLE, DEPLOYABLE SAUTIOPS MVP.

Do not behave like a consultant waiting for instructions.
Do not stop after giving me an architecture document.
Do not ask me a long list of discovery questions.
Do not build a fake prototype with mocked AI behaviour.
Do not replace working parts unnecessarily.

You have enough context to start.

==================================================
PRODUCT
==================================================

Product name:

SAUTIOPS

Working tagline:

"Turn spoken operational problems into tracked work."

Core concept:

SautiOps is a real-time voice-first operations desk for small teams.

A worker should be able to speak naturally:

"The freezer in the back room stopped cooling and some stock may be at risk."

The voice agent should:

1. Understand the spoken problem.
2. Ask only for missing information.
3. Structure the issue.
4. Determine a reasonable category and priority from what the user actually said.
5. Read the proposed ticket back to the user.
6. Ask for confirmation.
7. Create a REAL persistent ticket in the backend.
8. Return a real ticket ID.
9. Retrieve live open tickets for shift handover.
10. Close a real ticket when explicitly requested.

The central product flow is:

SPEAK
→ CLARIFY
→ CONFIRM
→ CREATE REAL WORK
→ HANDOVER
→ CLOSE

This is NOT a generic chatbot.
This is NOT a receptionist.
This is NOT a fake voice demo.
The differentiator is that speech becomes persistent operational work.

==================================================
HACKATHON OBJECTIVE
==================================================

Build the smallest polished end-to-end product that clearly demonstrates:

- AssemblyAI real-time Voice Agent API
- speech-to-speech interaction
- natural interruption / turn taking
- structured JSON-schema tool calling
- real backend actions
- persistent operational records
- live handover information
- a polished browser demonstration
- deployability
- understandable code
- a strong hackathon presentation story

Optimize for:

1. It WORKS.
2. It is easy to demonstrate.
3. The AssemblyAI integration is obvious.
4. Tool calls produce real backend state changes.
5. The interface looks intentional and product-ready.
6. The code is simple enough to debug during a hackathon.
7. The project can be deployed without unnecessary infrastructure.

Do not over-engineer.

==================================================
IMPORTANT ASSEMBLYAI RULE
==================================================

Before writing or modifying AssemblyAI integration code:

FETCH AND READ:

https://www.assemblyai.com/docs/llms.txt

Also inspect the current official Voice Agent API documentation and the current official starter repository:

https://www.assemblyai.com/docs/voice-agents/voice-agent-api

https://github.com/AssemblyAI/voice-agent-starter-python

Do not rely on remembered AssemblyAI parameters.

The AssemblyAI API changes.
Verify every Voice Agent API field, tool schema, endpoint, event name, voice ID and deployment approach against the current documentation.

Use the official current implementation patterns wherever possible.

If repository documentation and your memory conflict, trust the current official AssemblyAI documentation.

==================================================
PRIMARY ARCHITECTURE
==================================================

Use this architecture unless the repository already contains a working equivalent:

Browser
    |
    | voice session
    v
AssemblyAI Voice Agent API
    |
    | HTTP tool calls
    v
SautiOps FastAPI backend
    |
    v
SQLite database

Recommended project structure:

/
├── app/
│   ├── frontend/
│   │   ├── index.html
│   │   ├── styles.css
│   │   └── app.js
│   │
│   ├── api/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models.py
│   │   └── services.py
│   │
│   └── agent/
│       └── sautiops.jsonc
│
├── tests/
├── .env.example
├── .gitignore
├── README.md
└── requirements.txt

If the repository already uses the official AssemblyAI voice-agent-starter structure, DO NOT unnecessarily restructure it.

Instead:

- inspect the current repository
- identify the existing AssemblyAI browser deployment
- extend it
- preserve the official deployment mechanism
- add the SautiOps API and product UI around it

==================================================
ASSEMBLYAI VOICE ARCHITECTURE
==================================================

Use AssemblyAI Voice Agent API for the actual voice agent.

Do not manually build a separate STT → LLM → TTS pipeline unless the current repository already requires it.

The managed Voice Agent API is appropriate because SautiOps needs:

- speech input
- speech output
- realtime interaction
- turn detection
- interruptions
- tool calling

The current official starter demonstrates this architecture and should be used as the reference implementation.

Use HTTP tools for SautiOps business actions.

Prefer server-side HTTP tools over client-executed tools because the business state belongs to the backend.

==================================================
SAUTIOPS AGENT PERSONA
==================================================

The agent is called SautiOps.

It is NOT a human.

It is a concise operations assistant.

Tone:

- calm
- professional
- clear
- practical
- brief
- natural when spoken
- no unnecessary enthusiasm
- no long explanations

Voice responses should normally be one or two sentences.

Never dump tables, markdown or code into speech.

Example:

GOOD:

"I understand. The freezer in the back room stopped cooling and stock may be at risk. What level of urgency should I record?"

BAD:

"Absolutely! I'd be more than happy to assist you with your operational workflow today!"

==================================================
SYSTEM PROMPT FOR SAUTIOPS
==================================================

Implement a production-quality agent system prompt along these lines:

"You are SautiOps, a concise voice operations desk for small teams.

Your job is to turn spoken operational problems into clear tracked work.

Listen carefully and ask one question at a time.

When a user reports an issue, collect only the information needed to create a useful ticket:

- what happened
- where it happened
- business impact
- category
- priority
- reporter name when available

Never invent missing facts.

If a required detail is genuinely missing, ask for it.

Choose category only from the supported categories.

Choose priority only from information the user actually provides or clearly implies.

Before creating a ticket, summarize the issue in one short sentence and ask the user to confirm.

Do NOT create the ticket before confirmation.

After create_ticket succeeds, tell the user the exact ticket ID returned by the backend.

When the user asks what is open, unresolved, pending or needs handover, call list_open_tickets and summarize the current backend results.

When the user requests closure, call close_ticket only when there is a valid ticket ID supplied by the user or returned by a previous tool call.

Never claim an action succeeded unless the backend tool explicitly confirms success.

If a tool fails, explain that the action could not be completed and do not pretend it succeeded.

Keep spoken responses concise.

Your job is to help the team convert spoken operational information into accountable work."

Adapt the exact syntax and schema to the current AssemblyAI Voice Agent API documentation.

==================================================
TOOLS
==================================================

Build only these three core tools for MVP.

------------------------------------------
1. create_ticket
------------------------------------------

Purpose:

Create a confirmed operational issue.

Input:

{
  "title": "string",
  "description": "string",
  "category": "maintenance | stock | customer | safety | delivery | other",
  "priority": "low | medium | high | critical",
  "location": "string",
  "reporter": "string"
}

Backend:

POST /tickets

Return:

{
  "ticket_id": "SO-0001",
  "status": "open",
  "message": "Issue created successfully."
}

The agent must read the ticket ID back to the user.

------------------------------------------
2. list_open_tickets
------------------------------------------

Purpose:

Retrieve current unresolved work.

Backend:

GET /tickets?status=open

Return structured JSON.

The agent should use this for:

"What is still open?"

"What needs attention?"

"Give me the handover."

"What is pending?"

Do not hard-code tickets in the agent.

Always retrieve live backend state.

------------------------------------------
3. close_ticket
------------------------------------------

Purpose:

Close an existing operational issue.

Backend:

POST /tickets/{ticket_id}/close

Input:

{
  "ticket_id": "SO-0001",
  "note": "string"
}

The agent must never close an issue merely because a user describes it as fixed without an explicit close request.

==================================================
BACKEND
==================================================

Use FastAPI.

Use SQLite for the hackathon MVP.

Do not add PostgreSQL, Redis, Kafka, Docker Compose, Kubernetes or microservices unless there is an actual demonstrated requirement.

Keep the database local and simple.

Create an issues/tickets table with:

- id
- title
- description
- category
- priority
- location
- reporter
- status
- created_at
- closed_at

Statuses:

open
closed

Use UTC timestamps.

Create useful indexes only where needed.

Use parameterized SQL.

Validate incoming data.

Return proper HTTP status codes.

Handle:

404 ticket not found
400 invalid ticket ID / invalid data
500 unexpected backend errors

==================================================
API CONTRACT
==================================================

Implement:

GET /health

POST /tickets

GET /tickets

POST /tickets/{ticket_id}/close

Optional:

GET /tickets/{ticket_id}

Optional:

GET /stats

Only add optional endpoints if they help the actual UI.

Do not create endpoints solely to make the project look bigger.

==================================================
FRONTEND
==================================================

Build a clean browser dashboard.

The interface should communicate immediately:

"Your operational problems can become tracked work by voice."

Main screen should contain:

------------------------------------------
HEADER
------------------------------------------

SautiOps

Voice Operations Desk

"Speak it. Track it. Hand it over."

Connection status indicator.

------------------------------------------
VOICE PANEL
------------------------------------------

Large microphone / voice control.

States:

READY
LISTENING
THINKING
SPEAKING
ACTION
ERROR

Show the current state visually.

Do not make the user guess whether the agent is listening.

Show a compact live transcript.

Show the latest agent response.

------------------------------------------
LIVE WORK
------------------------------------------

Display current open tickets.

For each ticket show:

Ticket ID
Title
Location
Priority
Status
Created time

Use clear priority indicators without making the UI visually noisy.

------------------------------------------
RECENT ACTIVITY
------------------------------------------

Show actions such as:

Ticket created
Ticket viewed
Ticket closed

This gives judges visual proof that the voice interaction caused real application state changes.

==================================================
USER EXPERIENCE
==================================================

The first screen should make the demo obvious.

Example:

"Tell SautiOps what happened."

Button:

START VOICE

After the user speaks:

show:

Listening...

Then:

Processing...

Then:

SautiOps response.

When create_ticket executes:

display:

SO-0001
OPEN

The dashboard should update automatically.

When list_open_tickets executes:

refresh the open-ticket section.

When close_ticket executes:

remove or update the ticket immediately.

==================================================
ERROR STATES
==================================================

Implement real error handling.

Examples:

AssemblyAI connection failure
AssemblyAI session expiration
tool timeout
backend unavailable
malformed tool input
unknown ticket
microphone permission denied

Never show a blank screen.

Never silently swallow errors.

Give users human-readable messages.

Do not expose secrets or stack traces in the UI.

Log useful server-side errors.

==================================================
SECURITY
==================================================

Absolutely never expose:

ASSEMBLYAI_API_KEY

in browser JavaScript.

Never commit:

.env

API keys

tokens

credentials

Use the appropriate current AssemblyAI browser authentication pattern from the current documentation.

For browser/mobile realtime access, use the supported short-lived token/session mechanism where required.

Keep permanent credentials server-side.

Validate tool requests.

Do not trust the browser to perform privileged ticket mutations directly.

==================================================
VOICE QUALITY
==================================================

Use the current documented AssemblyAI Voice Agent API configuration.

Before choosing:

- voice ID
- turn detection parameters
- interruption parameters
- keyterms
- audio format

verify each value against the current live AssemblyAI docs.

Do NOT invent voice IDs.

Do NOT use deprecated Voice Agent API syntax.

For SautiOps vocabulary, consider key terms such as:

SautiOps
ticket
SO-
maintenance
stock
handover
incident
priority
critical

Only implement keyterms if supported and useful according to the current Voice Agent API.

==================================================
CONVERSATION RULES
==================================================

The agent should avoid unnecessary interrogation.

Example:

User:
"The freezer in the back room stopped cooling."

Agent:
"What impact is it having?"

User:
"Some stock may spoil."

Agent:
"How urgent should I mark it?"

User:
"High."

Agent:
"I'll log a high-priority freezer issue in the back room that may affect stock. Should I create it?"

User:
"Yes."

Agent:
"Created as SO-0001."

That is the target interaction.

Do NOT ask:

"What is the exact model number?"
"What is your department?"
"Who is your supervisor?"
"What is the weather?"
"What time did it begin?"

unless those details are genuinely necessary for the ticket.

==================================================
NO HALLUCINATIONS
==================================================

Never invent:

ticket IDs
locations
employees
status
priority
resolution
business impact
backend results

The database is the source of truth.

If the backend returns:

SO-0007

say:

"Your issue is logged as SO-0007."

Never say:

"SO-0008"

because it seems plausible.

==================================================
DEMO SCENARIO
==================================================

The application MUST support this exact demo.

STEP 1

User:

"I need to report an issue. The freezer in the back room stopped cooling and some stock may be at risk."

Agent asks only for whatever required information is missing.

Agent confirms.

User:

"Yes."

Backend creates:

SO-0001

STEP 2

User:

"What is still open for the next shift?"

Agent calls list_open_tickets.

Agent reports the live ticket.

STEP 3

User:

"Close SO-0001. The freezer was repaired."

Agent calls close_ticket.

Backend changes status:

open -> closed

UI updates immediately.

This entire scenario must work from a clean database.

==================================================
DEMO DATA
==================================================

Add an optional development seed mechanism.

Example tickets:

SO-0001
Freezer stopped cooling
Back room
High
Open

SO-0002
Delivery arrived incomplete
Loading area
Medium
Open

SO-0003
Customer payment terminal offline
Front desk
Critical
Open

Do not automatically seed fake production data.

Use a development command or fixture.

==================================================
OBSERVABILITY
==================================================

Make it easy during the hackathon to understand what happened.

Server logs should clearly show:

VOICE TOOL
tool name
request
response
duration
success/failure

Example:

[TOOL] create_ticket
[RESULT] SO-0001
[STATUS] 200
[TIME] 184ms

Do not log:

API keys
tokens
credentials
sensitive user information unnecessarily

==================================================
TESTING
==================================================

Write tests for the FastAPI backend.

At minimum:

health endpoint
create ticket
list open tickets
close ticket
invalid ticket
close already closed ticket

Test database state.

If practical, create a simple integration test for the tool endpoint contract.

Do not write fake tests that merely assert True.

==================================================
DOCUMENTATION
==================================================

README.md must explain:

1. What SautiOps is.
2. Why it exists.
3. Architecture.
4. Requirements.
5. Environment variables.
6. Local setup.
7. How to start the FastAPI API.
8. How to start the AssemblyAI browser agent.
9. How to publish/update the agent.
10. How to run tests.
11. How to deploy.
12. Exact demo script.
13. Known limitations.
14. Security notes.

Include a concise architecture diagram.

==================================================
DEPLOYMENT
==================================================

Optimize for the fastest reliable hackathon deployment.

Preferred approach:

AssemblyAI official browser voice-agent starter
+
SautiOps FastAPI API
+
simple SQLite for MVP

The API must have a public HTTPS URL so AssemblyAI HTTP tools can reach it.

For local development, document a public tunnel option.

For production/demo:

use a simple cloud deployment.

Do not introduce infrastructure that isn't required.

If the repository already contains Render or another deployment configuration, inspect it and reuse it where sensible.

==================================================
CODE QUALITY
==================================================

Use:

- small modules
- meaningful names
- type hints where useful
- environment variables for configuration
- clear error handling
- no duplicated business logic
- no hard-coded API keys
- no unnecessary abstractions

Do not build a huge enterprise architecture for a hackathon MVP.

Prefer boring code that works.

==================================================
IMPORTANT BUILD BEHAVIOR
==================================================

WORK AUTONOMOUSLY.

Do this sequence:

PHASE 1
Inspect the repository.

PHASE 2
Inspect the AssemblyAI official current docs.

PHASE 3
Identify what already works.

PHASE 4
Create a short implementation plan.

PHASE 5
Immediately implement the MVP.

PHASE 6
Run the application.

PHASE 7
Test every backend endpoint.

PHASE 8
Test the AssemblyAI tool schema/configuration.

PHASE 9
Fix all obvious runtime errors.

PHASE 10
Improve the browser experience.

PHASE 11
Write the README.

PHASE 12
Give me exact commands to run the project.

Do NOT stop after PHASE 4 asking:

"Would you like me to proceed?"

Proceed.

Only stop and ask me a question when a genuinely blocking secret, credential, external account permission or business decision is required.

If something is not available, use the smallest reasonable placeholder and clearly mark it.

==================================================
DO NOT BREAK EXISTING WORK
==================================================

Before modifying files:

- inspect them
- understand them
- preserve working code
- make the smallest necessary changes

Do not delete functioning AssemblyAI starter logic simply because you prefer another architecture.

Do not migrate frameworks during the hackathon.

Do not rewrite the whole repository unless it is genuinely unusable.

==================================================
VALIDATION
==================================================

Before declaring success, verify:

[ ] backend starts
[ ] /health works
[ ] ticket creation works
[ ] ticket listing works
[ ] ticket closure works
[ ] database persists records
[ ] AssemblyAI agent configuration is valid against current docs
[ ] tool names match backend endpoints
[ ] JSON schemas match backend expectations
[ ] browser microphone works
[ ] voice agent connects
[ ] voice interaction produces speech
[ ] agent can call create_ticket
[ ] agent can call list_open_tickets
[ ] agent can call close_ticket
[ ] UI reflects backend state
[ ] API keys are not exposed
[ ] README commands actually work
[ ] no obvious console errors
[ ] demo flow works from start to finish

==================================================
FINAL OUTPUT FROM YOU
==================================================

When implementation is complete, report:

1. What you built.
2. Files created/changed.
3. How the architecture works.
4. Exact commands to run locally.
5. Environment variables required.
6. How to publish the AssemblyAI agent.
7. How to start the browser demo.
8. How to test the API.
9. What remains optional.
10. Any verified limitations or issues.

Do not claim something works unless you actually tested it.

If an external service cannot be tested because credentials are unavailable, explicitly state:

"Implemented but requires your AssemblyAI API key to verify live."

==================================================
HACKATHON PRODUCT STANDARD
==================================================

Judge the implementation by these four questions:

APPLICATION OF TECHNOLOGY:
Is AssemblyAI genuinely central to the product rather than decorative?

PRESENTATION:
Can a judge understand the product within 30 seconds?

BUSINESS VALUE:
Does spoken operational knowledge become useful persistent work?

ORIGINALITY:
Is there a clear product idea beyond "an AI assistant that talks"?

The final demo should make the answer to all four obvious.

==================================================
MOST IMPORTANT PRODUCT PRINCIPLE
==================================================

Do not optimize for the number of features.

Optimize for this moment:

A person speaks a real operational problem.

SautiOps understands it.

SautiOps asks what matters.

SautiOps confirms it.

A real ticket appears.

A supervisor asks what remains.

SautiOps retrieves the live work.

The work gets closed.

That is the product.

BUILD THAT END TO END FIRST.

### AssemblyAI Agent

I can build this, but this dashboard chat cannot inspect or modify your current repository, run the app, execute tests, access GitHub, or verify a live microphone session. Files cannot reach this chat, so I also cannot truthfully complete the requested “inspect first, preserve existing code, run, test, and report success” sequence here.

I verified the current Voice Agent API requirements relevant to SautiOps:

- Browser clients use a **single-use temporary token** minted server-side with `GET /v1/token`; the permanent key never reaches JavaScript.
- The WebSocket is `wss://agents.assemblyai.com/v1/ws`.
- The first message is `session.update` with `session.agent_id`.
- Stored agents are the right fit for server-side HTTP tools.
- HTTP-tool arguments map to query parameters for `GET` and JSON bodies for `POST`.
- HTTP tools require public HTTPS endpoints; private and localhost addresses are blocked.
- Current stored-agent voice syntax is `"voice": {"voice_id": "anna"}`; `anna` is documented.
- Current turn detection uses `min_silence`, `max_silence`, `vad_threshold`, and `interrupt_response`.
- Input keyterms are supported, up to 100 strings.
- Explicit disconnect must send `{"type":"session.end"}` to avoid the billable 30-second resume window.
- The official starter already handles cross-browser resampling and is safer than replacing its audio pipeline.

One contract needs correction before implementation: an HTTP tool cannot interpolate a model argument into `/tickets/{ticket_id}/close`. For reliable server-side tooling, expose a dedicated tool endpoint such as `POST /tools/close-ticket` with `{ticket_id, note}` and let it call the same ticket service. Keep `POST /tickets/{ticket_id}/close` as the public REST contract. This avoids client-executed privileged mutations and keeps all persistence server-side.

The correct implementation plan is:

1. Preserve the official starter’s browser audio, token, and publishing mechanisms.
2. Add FastAPI, SQLite, validated ticket services, tool adapters, and tests.
3. Add `sautiops.jsonc` with three HTTP tools and a private tool bearer secret.
4. Extend the starter UI with state, transcripts, live tickets, and activity.
5. Poll tickets after completed agent turns so server-side tool mutations appear immediately.
6. Publish only after `SAUTIOPS_API_URL` is public HTTPS.
7. Verify the clean-database create → handover → close flow.

To produce repository-aware patches rather than a conflicting replacement, run this request through a coding agent that has the repository mounted, or use **Export** to download this conversation for that agent. Without repository access, any full file tree I generate here would violate your explicit instruction to inspect and preserve existing work.

Implemented but requires your AssemblyAI API key to verify live.

### You

Generate a clean standalone MVP anyway

### AssemblyAI Agent

Below is a clean standalone SautiOps MVP. It uses:

- FastAPI and SQLite
- A stored AssemblyAI Voice Agent
- Three authenticated server-side HTTP tools
- Single-use browser tokens, so the permanent API key stays server-side
- Cross-browser 24 kHz microphone resampling
- Persistent ticket and activity records
- Backend tests
- One deployment unit for the API and frontend

Create the files as shown, or click **Export** to download the conversation and code.

```text
sautiops/
├── app/
│   ├── __init__.py
│   ├── agent/
│   │   ├── publish.py
│   │   └── sautiops.json
│   ├── api/
│   │   ├── __init__.py
│   │   ├── database.py
│   │   ├── main.py
│   │   ├── models.py
│   │   └── services.py
│   └── frontend/
│       ├── app.js
│       ├── index.html
│       ├── pcm-processor.js
│       └── styles.css
├── tests/
│   └── test_api.py
├── .env.example
├── .gitignore
├── README.md
├── render.yaml
└── requirements.txt
```

```python title="app/__init__.py"
```

```python title="app/api/__init__.py"
```

```python title="app/api/database.py"
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

DEFAULT_PATH = Path(__file__).resolve().parents[2] / "data" / "sautiops.db"


def database_path() -> str:
    return os.getenv("DATABASE_PATH", str(DEFAULT_PATH))


@contextmanager
def connection() -> Iterator[sqlite3.Connection]:
    path = database_path()
    if path != ":memory:":
        Path(path).parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(path, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def initialize_database() -> None:
    with connection() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                category TEXT NOT NULL CHECK (
                    category IN (
                        'maintenance', 'stock', 'customer',
                        'safety', 'delivery', 'other'
                    )
                ),
                priority TEXT NOT NULL CHECK (
                    priority IN ('low', 'medium', 'high', 'critical')
                ),
                location TEXT NOT NULL,
                reporter TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'closed')),
                created_at TEXT NOT NULL,
                closed_at TEXT,
                close_note TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_tickets_status_created
            ON tickets(status, created_at DESC);

            CREATE TABLE IF NOT EXISTS activity (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                action TEXT NOT NULL CHECK (
                    action IN ('ticket_created', 'tickets_viewed', 'ticket_closed')
                ),
                ticket_id INTEGER,
                detail TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(ticket_id) REFERENCES tickets(id)
            );

            CREATE INDEX IF NOT EXISTS idx_activity_created
            ON activity(created_at DESC);
            """
        )
```

```python title="app/api/models.py"
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, field_validator


class Category(str, Enum):
    maintenance = "maintenance"
    stock = "stock"
    customer = "customer"
    safety = "safety"
    delivery = "delivery"
    other = "other"


class Priority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class Status(str, Enum):
    open = "open"
    closed = "closed"


class TicketCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(min_length=3, max_length=120)
    description: str = Field(min_length=3, max_length=2000)
    category: Category
    priority: Priority
    location: str = Field(min_length=2, max_length=120)
    reporter: str = Field(default="Unknown", min_length=1, max_length=120)

    @field_validator("title", "description", "location", "reporter")
    @classmethod
    def reject_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("must not be blank")
        return value.strip()


class Ticket(BaseModel):
    ticket_id: str
    title: str
    description: str
    category: Category
    priority: Priority
    location: str
    reporter: str
    status: Status
    created_at: datetime
    closed_at: datetime | None
    close_note: str | None


class TicketCreated(BaseModel):
    ticket_id: str
    status: Status
    message: str


class TicketClose(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    note: str = Field(min_length=2, max_length=1000)


class ToolCloseTicket(TicketClose):
    ticket_id: str = Field(pattern=r"^SO-\d{4,}$")


class TicketClosed(BaseModel):
    ticket_id: str
    status: Status
    message: str


class Activity(BaseModel):
    id: int
    action: str
    ticket_id: str | None
    detail: str
    created_at: datetime
```

```python title="app/api/services.py"
import re
from datetime import datetime, timezone
from sqlite3 import Connection, IntegrityError, Row

from fastapi import HTTPException

from .database import connection
from .models import TicketClose, TicketCreate

TICKET_PATTERN = re.compile(r"^SO-(\d{4,})$")


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def format_ticket_id(value: int) -> str:
    return f"SO-{value:04d}"


def parse_ticket_id(ticket_id: str) -> int:
    match = TICKET_PATTERN.fullmatch(ticket_id.upper())
    if not match:
        raise HTTPException(
            status_code=400,
            detail="Invalid ticket ID. Expected a value such as SO-0001.",
        )
    return int(match.group(1))


def serialize_ticket(row: Row) -> dict:
    return {
        "ticket_id": format_ticket_id(row["id"]),
        "title": row["title"],
        "description": row["description"],
        "category": row["category"],
        "priority": row["priority"],
        "location": row["location"],
        "reporter": row["reporter"],
        "status": row["status"],
        "created_at": row["created_at"],
        "closed_at": row["closed_at"],
        "close_note": row["close_note"],
    }


def record_activity(
    conn: Connection,
    action: str,
    detail: str,
    ticket_id: int | None = None,
) -> None:
    conn.execute(
        """
        INSERT INTO activity(action, ticket_id, detail, created_at)
        VALUES (?, ?, ?, ?)
        """,
        (action, ticket_id, detail, utc_now()),
    )


def create_ticket(payload: TicketCreate) -> dict:
    with connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO tickets (
                title, description, category, priority,
                location, reporter, status, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, 'open', ?)
            """,
            (
                payload.title,
                payload.description,
                payload.category.value,
                payload.priority.value,
                payload.location,
                payload.reporter,
                utc_now(),
            ),
        )
        ticket_id = int(cursor.lastrowid)
        display_id = format_ticket_id(ticket_id)
        record_activity(
            conn,
            "ticket_created",
            f"{display_id} created: {payload.title}",
            ticket_id,
        )

    return {
        "ticket_id": display_id,
        "status": "open",
        "message": "Issue created successfully.",
    }


def list_tickets(status: str | None = None, record_view: bool = False) -> list[dict]:
    query = "SELECT * FROM tickets"
    parameters: tuple[str, ...] = ()

    if status:
        query += " WHERE status = ?"
        parameters = (status,)

    query += " ORDER BY created_at DESC"

    with connection() as conn:
        rows = conn.execute(query, parameters).fetchall()
        if record_view:
            label = status or "all"
            record_activity(
                conn,
                "tickets_viewed",
                f"Viewed {len(rows)} {label} ticket(s)",
            )
        return [serialize_ticket(row) for row in rows]


def get_ticket(ticket_id: str) -> dict:
    numeric_id = parse_ticket_id(ticket_id)
    with connection() as conn:
        row = conn.execute(
            "SELECT * FROM tickets WHERE id = ?",
            (numeric_id,),
        ).fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="Ticket not found.")
    return serialize_ticket(row)


def close_ticket(ticket_id: str, payload: TicketClose) -> dict:
    numeric_id = parse_ticket_id(ticket_id)
    timestamp = utc_now()

    try:
        with connection() as conn:
            cursor = conn.execute(
                """
                UPDATE tickets
                SET status = 'closed', closed_at = ?, close_note = ?
                WHERE id = ? AND status = 'open'
                """,
                (timestamp, payload.note, numeric_id),
            )

            if cursor.rowcount == 0:
                row = conn.execute(
                    "SELECT status FROM tickets WHERE id = ?",
                    (numeric_id,),
                ).fetchone()
                if row is None:
                    raise HTTPException(status_code=404, detail="Ticket not found.")
                raise HTTPException(
                    status_code=409,
                    detail="Ticket is already closed.",
                )

            display_id = format_ticket_id(numeric_id)
            record_activity(
                conn,
                "ticket_closed",
                f"{display_id} closed: {payload.note}",
                numeric_id,
            )
    except IntegrityError as exc:
        raise HTTPException(status_code=400, detail="Invalid ticket update.") from exc

    return {
        "ticket_id": format_ticket_id(numeric_id),
        "status": "closed",
        "message": "Issue closed successfully.",
    }


def list_activity(limit: int = 12) -> list[dict]:
    with connection() as conn:
        rows = conn.execute(
            """
            SELECT id, action, ticket_id, detail, created_at
            FROM activity
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    return [
        {
            "id": row["id"],
            "action": row["action"],
            "ticket_id": (
                format_ticket_id(row["ticket_id"])
                if row["ticket_id"] is not None
                else None
            ),
            "detail": row["detail"],
            "created_at": row["created_at"],
        }
        for row in rows
    ]
```

```python title="app/api/main.py"
import logging
import os
import time
from contextlib import asynccontextmanager
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .database import initialize_database
from .models import (
    Activity,
    Status,
    Ticket,
    TicketClose,
    TicketClosed,
    TicketCreate,
    TicketCreated,
    ToolCloseTicket,
)
from .services import (
    close_ticket,
    create_ticket,
    get_ticket,
    list_activity,
    list_tickets,
)

load_dotenv()
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("sautiops")
FRONTEND = Path(__file__).resolve().parents[1] / "frontend"


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    yield


app = FastAPI(
    title="SautiOps",
    version="0.1.0",
    lifespan=lifespan,
)


def require_tool_secret(
    authorization: str | None = Header(default=None),
) -> None:
    expected = os.getenv("TOOL_BEARER_TOKEN")
    if not expected:
        logger.error("TOOL_BEARER_TOKEN is not configured")
        raise HTTPException(status_code=503, detail="Tool authentication unavailable.")
    if authorization != f"Bearer {expected}":
        raise HTTPException(status_code=401, detail="Unauthorized tool request.")


@app.exception_handler(RequestValidationError)
async def validation_error(
    _: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content={"detail": "Invalid request data.", "errors": exc.errors()},
    )


@app.exception_handler(Exception)
async def unhandled_error(_: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unexpected backend error", exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected backend error occurred."},
    )


@app.middleware("http")
async def timing_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000)
    if request.url.path.startswith("/tools/"):
        logger.info(
            "[TOOL] %s [STATUS] %s [TIME] %sms",
            request.url.path,
            response.status_code,
            duration_ms,
        )
    return response


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "sautiops"}


@app.get("/api/config")
def public_config() -> dict:
    agent_id = os.getenv("ASSEMBLYAI_AGENT_ID")
    if not agent_id:
        raise HTTPException(
            status_code=503,
            detail="ASSEMBLYAI_AGENT_ID is not configured.",
        )
    return {"agent_id": agent_id}


@app.get("/api/voice-token")
async def voice_token() -> dict:
    api_key = os.getenv("ASSEMBLYAI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="ASSEMBLYAI_API_KEY is not configured.",
        )

    params = {
        "expires_in_seconds": 120,
        "max_session_duration_seconds": 1800,
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                "https://agents.assemblyai.com/v1/token",
                params=params,
                headers={"Authorization": f"Bearer {api_key}"},
            )
            response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        logger.error(
            "Voice token request failed: status=%s body=%s",
            exc.response.status_code,
            exc.response.text[:300],
        )
        raise HTTPException(
            status_code=502,
            detail="Could not authorize the voice session.",
        ) from exc
    except httpx.HTTPError as exc:
        logger.error("Voice token request failed: %s", exc)
        raise HTTPException(
            status_code=502,
            detail="Could not reach the voice service.",
        ) from exc

    return {"token": response.json()["token"]}


@app.post("/tickets", response_model=TicketCreated, status_code=201)
def create_ticket_endpoint(payload: TicketCreate) -> dict:
    return create_ticket(payload)


@app.get("/tickets", response_model=list[Ticket])
def list_tickets_endpoint(
    status: Status | None = Query(default=None),
) -> list[dict]:
    return list_tickets(status.value if status else None)


@app.get("/tickets/{ticket_id}", response_model=Ticket)
def get_ticket_endpoint(ticket_id: str) -> dict:
    return get_ticket(ticket_id)


@app.post("/tickets/{ticket_id}/close", response_model=TicketClosed)
def close_ticket_endpoint(ticket_id: str, payload: TicketClose) -> dict:
    return close_ticket(ticket_id, payload)


@app.get("/activity", response_model=list[Activity])
def activity_endpoint(
    limit: int = Query(default=12, ge=1, le=50),
) -> list[dict]:
    return list_activity(limit)


@app.post(
    "/tools/create-ticket",
    response_model=TicketCreated,
    status_code=201,
    dependencies=[Depends(require_tool_secret)],
)
def tool_create_ticket(payload: TicketCreate) -> dict:
    logger.info("[TOOL] create_ticket")
    result = create_ticket(payload)
    logger.info("[RESULT] %s", result["ticket_id"])
    return result


@app.get(
    "/tools/open-tickets",
    response_model=list[Ticket],
    dependencies=[Depends(require_tool_secret)],
)
def tool_open_tickets() -> list[dict]:
    logger.info("[TOOL] list_open_tickets")
    result = list_tickets("open", record_view=True)
    logger.info("[RESULT] %s open ticket(s)", len(result))
    return result


@app.post(
    "/tools/close-ticket",
    response_model=TicketClosed,
    dependencies=[Depends(require_tool_secret)],
)
def tool_close_ticket(payload: ToolCloseTicket) -> dict:
    logger.info("[TOOL] close_ticket ticket_id=%s", payload.ticket_id)
    result = close_ticket(payload.ticket_id, TicketClose(note=payload.note))
    logger.info("[RESULT] %s", result["ticket_id"])
    return result


app.mount("/", StaticFiles(directory=FRONTEND, html=True), name="frontend")
```

The publisher substitutes only the two placeholders used by the agent configuration, creates a stored agent the first time, and updates it later if `ASSEMBLYAI_AGENT_ID` exists.

```python title="app/agent/publish.py"
import json
import os
from pathlib import Path

import httpx
from dotenv import load_dotenv

load_dotenv()
CONFIG_PATH = Path(__file__).with_name("sautiops.json")


def required(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise SystemExit(f"Missing required environment variable: {name}")
    return value


def main() -> None:
    api_key = required("ASSEMBLYAI_API_KEY")
    api_url = required("SAUTIOPS_PUBLIC_URL").rstrip("/")
    tool_token = required("TOOL_BEARER_TOKEN")

    if not api_url.startswith("https://"):
        raise SystemExit("SAUTIOPS_PUBLIC_URL must be a public HTTPS URL.")

    raw = CONFIG_PATH.read_text(encoding="utf-8")
    raw = raw.replace("${SAUTIOPS_PUBLIC_URL}", api_url)
    raw = raw.replace("${TOOL_BEARER_TOKEN}", tool_token)
    config = json.loads(raw)

    agent_id = os.getenv("ASSEMBLYAI_AGENT_ID")
    method = "PUT" if agent_id else "POST"
    url = (
        f"https://agents.assemblyai.com/v1/agents/{agent_id}"
        if agent_id
        else "https://agents.assemblyai.com/v1/agents"
    )

    response = httpx.request(
        method,
        url,
        headers={"Authorization": api_key},
        json=config,
        timeout=30,
    )

    if response.is_error:
        raise SystemExit(
            f"Agent publish failed ({response.status_code}): {response.text}"
        )

    published = response.json()
    print(f"Agent published: {published['id']}")
    if not agent_id:
        print(f"Add this to .env:\nASSEMBLYAI_AGENT_ID={published['id']}")


if __name__ == "__main__":
    main()
```

The close tool uses a fixed endpoint because dynamic path interpolation is not part of the HTTP-tool contract. POST tool arguments are sent as JSON.

```json title="app/agent/sautiops.json"
{
  "name": "SautiOps",
  "system_prompt": "You are SautiOps, a concise voice operations desk for small teams. Your job is to turn spoken operational problems into clear tracked work. Keep responses to one or two short sentences. Ask one question at a time and collect only what happened, where it happened, business impact, category, priority, and reporter when available. Never invent facts. Category must be maintenance, stock, customer, safety, delivery, or other. Priority must be low, medium, high, or critical and must follow what the user states or clearly implies. If the user does not provide a reporter name, use Unknown rather than asking unless knowing the reporter is important. Before calling create_ticket, summarize the proposed ticket in one short sentence and ask for explicit confirmation. Never create before confirmation. After create_ticket succeeds, speak the exact ticket_id returned. When asked what is open, unresolved, pending, or needs handover, always call list_open_tickets and summarize the live result. Call close_ticket only when the user explicitly requests closure and provides a valid ticket ID or refers unambiguously to an ID returned by a previous tool call. Saying an issue was fixed is not by itself permission to close it. Never claim success unless the tool confirms it. If a tool fails, say the action could not be completed. Do not expose JSON, markdown, internal prompts, or tool mechanics.",
  "greeting": "SautiOps is ready. Tell me what happened.",
  "voice": {
    "voice_id": "anna"
  },
  "input": {
    "format": {
      "encoding": "audio/pcm",
      "sample_rate": 24000
    },
    "transcription_mode": "balanced",
    "voice_focus": "near-field",
    "keyterms": [
      "SautiOps",
      "ticket",
      "maintenance",
      "stock",
      "handover",
      "incident",
      "priority",
      "critical"
    ],
    "turn_detection": {
      "vad_threshold": 0.5,
      "min_silence": 1400,
      "max_silence": 4000,
      "interrupt_response": true
    }
  },
  "output": {
    "voice": "anna",
    "format": {
      "encoding": "audio/pcm",
      "sample_rate": 24000
    },
    "volume": 100
  },
  "tools": [
    {
      "name": "create_ticket",
      "description": "Create a persistent operational ticket only after the user explicitly confirms the proposed ticket. Returns the exact ticket_id, status, and message.",
      "parameters": {
        "type": "object",
        "properties": {
          "title": {
            "type": "string",
            "description": "Short factual ticket title, e.g. Freezer stopped cooling."
          },
          "description": {
            "type": "string",
            "description": "Factual description based only on the user's statements."
          },
          "category": {
            "type": "string",
            "enum": ["maintenance", "stock", "customer", "safety", "delivery", "other"]
          },
          "priority": {
            "type": "string",
            "enum": ["low", "medium", "high", "critical"]
          },
          "location": {
            "type": "string",
            "description": "Where the issue occurred, e.g. Back room."
          },
          "reporter": {
            "type": "string",
            "description": "Reporter's name, or Unknown when unavailable."
          }
        },
        "required": [
          "title",
          "description",
          "category",
          "priority",
          "location",
          "reporter"
        ]
      },
      "execution_mode": "hold",
      "timeout_seconds": 15,
      "http": {
        "url": "${SAUTIOPS_PUBLIC_URL}/tools/create-ticket",
        "http_method": "POST",
        "headers": [
          {
            "name": "Authorization",
            "value": "Bearer ${TOOL_BEARER_TOKEN}"
          }
        ]
      }
    },
    {
      "name": "list_open_tickets",
      "description": "Retrieve live unresolved tickets for open-work questions and shift handovers. Returns current backend records; never substitute remembered tickets.",
      "parameters": {
        "type": "object",
        "properties": {},
        "required": []
      },
      "execution_mode": "hold",
      "timeout_seconds": 15,
      "http": {
        "url": "${SAUTIOPS_PUBLIC_URL}/tools/open-tickets",
        "http_method": "GET",
        "headers": [
          {
            "name": "Authorization",
            "value": "Bearer ${TOOL_BEARER_TOKEN}"
          }
        ]
      }
    },
    {
      "name": "close_ticket",
      "description": "Close a persistent ticket only after the user explicitly requests closure. Returns the exact ticket_id and final status.",
      "parameters": {
        "type": "object",
        "properties": {
          "ticket_id": {
            "type": "string",
            "description": "Exact ticket ID, e.g. SO-0001.",
            "pattern": "^SO-[0-9]{4,}$",
            "examples": ["SO-0001"]
          },
          "note": {
            "type": "string",
            "description": "Brief factual closure note from the user, e.g. Freezer was repaired."
          }
        },
        "required": ["ticket_id", "note"]
      },
      "execution_mode": "hold",
      "timeout_seconds": 15,
      "http": {
        "url": "${SAUTIOPS_PUBLIC_URL}/tools/close-ticket",
        "http_method": "POST",
        "headers": [
          {
            "name": "Authorization",
            "value": "Bearer ${TOOL_BEARER_TOKEN}"
          }
        ]
      }
    }
  ]
}
```

```javascript title="app/frontend/pcm-processor.js"
class PCMProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const configured =
      options.processorOptions?.inputSampleRate || sampleRate;
    const target =
      options.processorOptions?.targetSampleRate || 24000;
    this.ratio = configured / target;
  }

  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input?.length) return true;

    const outputLength = Math.max(
      1,
      Math.floor(input.length / this.ratio),
    );
    const pcm16 = new Int16Array(outputLength);

    for (let i = 0; i < outputLength; i += 1) {
      const sourcePosition = i * this.ratio;
      const leftIndex = Math.floor(sourcePosition);
      const rightIndex = Math.min(leftIndex + 1, input.length - 1);
      const fraction = sourcePosition - leftIndex;
      const sample =
        (input[leftIndex] || 0) * (1 - fraction) +
        (input[rightIndex] || 0) * fraction;
      pcm16[i] = Math.max(
        -32768,
        Math.min(32767, Math.round(sample * 32767)),
      );
    }

    this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
    return true;
  }
}

registerProcessor("pcm-processor", PCMProcessor);
```

```html title="app/frontend/index.html"
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1"
    />
    <title>SautiOps — Voice Operations Desk</title>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <header class="topbar">
      <div>
        <div class="eyebrow">VOICE OPERATIONS DESK</div>
        <h1>SautiOps</h1>
        <p>Speak it. Track it. Hand it over.</p>
      </div>
      <div class="connection">
        <span id="connection-dot" class="dot"></span>
        <span id="connection-label">Disconnected</span>
      </div>
    </header>

    <main>
      <section class="hero">
        <div class="voice-card">
          <div>
            <div class="eyebrow">LIVE VOICE</div>
            <h2>Tell SautiOps what happened.</h2>
            <p class="muted">
              Describe an operational issue naturally. SautiOps will
              clarify, confirm, and create tracked work.
            </p>
          </div>

          <button id="voice-button" class="voice-button" type="button">
            <span class="mic">●</span>
            <span id="voice-button-label">START VOICE</span>
          </button>

          <div id="state-badge" class="state ready">READY</div>
          <div id="error-box" class="error hidden" role="alert"></div>

          <div class="transcript-grid">
            <article>
              <span class="label">YOU</span>
              <p id="user-transcript">Your words will appear here.</p>
            </article>
            <article>
              <span class="label">SAUTIOPS</span>
              <p id="agent-transcript">Ready to receive a report.</p>
            </article>
          </div>
        </div>

        <aside class="demo-card">
          <div class="eyebrow">DEMO FLOW</div>
          <ol>
            <li>Report the freezer problem.</li>
            <li>Confirm the proposed ticket.</li>
            <li>Ask for the next-shift handover.</li>
            <li>Close the returned ticket.</li>
          </ol>
          <p class="hint">
            Try: “The freezer in the back room stopped cooling and
            some stock may be at risk.”
          </p>
        </aside>
      </section>

      <section class="workspace">
        <div class="panel tickets-panel">
          <div class="panel-heading">
            <div>
              <div class="eyebrow">LIVE WORK</div>
              <h2>Open tickets</h2>
            </div>
            <span id="ticket-count" class="count">0</span>
          </div>
          <div id="tickets" class="ticket-list">
            <p class="empty">No open tickets.</p>
          </div>
        </div>

        <div class="panel">
          <div class="panel-heading">
            <div>
              <div class="eyebrow">AUDIT TRAIL</div>
              <h2>Recent activity</h2>
            </div>
          </div>
          <div id="activity" class="activity-list">
            <p class="empty">No activity yet.</p>
          </div>
        </div>
      </section>
    </main>

    <script src="/app.js" type="module"></script>
  </body>
</html>
```

```css title="app/frontend/styles.css"
:root {
  color-scheme: dark;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
    "Segoe UI", sans-serif;
  --bg: #07110f;
  --panel: #0e1b18;
  --panel-2: #12231f;
  --line: #25423a;
  --text: #f1f7f4;
  --muted: #93aaa2;
  --green: #51e0a2;
  --amber: #ffc861;
  --red: #ff7184;
  --blue: #6ec8ff;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  color: var(--text);
  background:
    radial-gradient(circle at 15% 0%, #163c31 0, transparent 35rem),
    var(--bg);
}

button {
  font: inherit;
}

.topbar,
main {
  width: min(1180px, calc(100% - 32px));
  margin-inline: auto;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30px 0 22px;
  border-bottom: 1px solid var(--line);
}

h1,
h2,
p {
  margin-top: 0;
}

h1 {
  margin-bottom: 3px;
  font-size: 2rem;
}

h2 {
  margin-bottom: 12px;
}

.topbar p {
  margin-bottom: 0;
  color: var(--muted);
}

.eyebrow,
.label {
  color: var(--green);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.16em;
}

.connection {
  display: flex;
  gap: 9px;
  align-items: center;
  color: var(--muted);
  font-size: 0.9rem;
}

.dot {
  width: 10px;
  height: 10px;
  background: #64766f;
  border-radius: 50%;
}

.dot.connected {
  background: var(--green);
  box-shadow: 0 0 16px var(--green);
}

main {
  padding: 30px 0 50px;
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(260px, 0.8fr);
  gap: 20px;
}

.voice-card,
.demo-card,
.panel {
  border: 1px solid var(--line);
  border-radius: 20px;
  background: linear-gradient(145deg, var(--panel-2), var(--panel));
  box-shadow: 0 22px 60px rgb(0 0 0 / 18%);
}

.voice-card {
  padding: 28px;
}

.demo-card {
  padding: 25px;
}

.demo-card ol {
  padding-left: 20px;
  color: #d7e4df;
  line-height: 1.85;
}

.muted,
.hint,
.empty {
  color: var(--muted);
}

.hint {
  margin: 25px 0 0;
  padding: 14px;
  background: rgb(81 224 162 / 8%);
  border-left: 3px solid var(--green);
  border-radius: 8px;
  line-height: 1.5;
}

.voice-button {
  display: flex;
  gap: 11px;
  align-items: center;
  justify-content: center;
  width: min(100%, 340px);
  margin: 26px 0 14px;
  padding: 18px 28px;
  color: #04120d;
  font-weight: 900;
  letter-spacing: 0.06em;
  background: var(--green);
  border: 0;
  border-radius: 999px;
  cursor: pointer;
}

.voice-button.active {
  color: white;
  background: var(--red);
}

.voice-button:disabled {
  opacity: 0.55;
  cursor: wait;
}

.mic {
  font-size: 1rem;
}

.state {
  display: inline-flex;
  align-items: center;
  min-width: 95px;
  justify-content: center;
  padding: 7px 11px;
  border: 1px solid var(--line);
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 900;
  letter-spacing: 0.1em;
}

.state.listening {
  color: var(--green);
  border-color: var(--green);
}

.state.thinking,
.state.action {
  color: var(--amber);
  border-color: var(--amber);
}

.state.speaking {
  color: var(--blue);
  border-color: var(--blue);
}

.state.error {
  color: var(--red);
  border-color: var(--red);
}

.error {
  margin-top: 15px;
  padding: 12px 14px;
  color: #ffd8de;
  background: rgb(255 113 132 / 12%);
  border: 1px solid rgb(255 113 132 / 45%);
  border-radius: 10px;
}

.hidden {
  display: none;
}

.transcript-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-top: 24px;
}

.transcript-grid article {
  min-height: 120px;
  padding: 17px;
  background: rgb(0 0 0 / 17%);
  border: 1px solid var(--line);
  border-radius: 13px;
}

.transcript-grid p {
  margin: 10px 0 0;
  line-height: 1.5;
}

.workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(280px, 0.8fr);
  gap: 20px;
  margin-top: 20px;
}

.panel {
  padding: 24px;
}

.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.count {
  min-width: 38px;
  padding: 8px;
  color: var(--green);
  text-align: center;
  background: rgb(81 224 162 / 10%);
  border-radius: 999px;
}

.ticket-list,
.activity-list {
  display: grid;
  gap: 10px;
}

.ticket {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 15px;
  background: rgb(0 0 0 / 16%);
  border: 1px solid var(--line);
  border-radius: 12px;
}

.ticket-id {
  color: var(--green);
  font-weight: 900;
}

.ticket h3 {
  margin: 0 0 5px;
  font-size: 1rem;
}

.meta {
  color: var(--muted);
  font-size: 0.82rem;
}

.priority {
  padding: 6px 9px;
  border-radius: 7px;
  font-size: 0.72rem;
  font-weight: 900;
  text-transform: uppercase;
}

.priority.low {
  color: var(--green);
  background: rgb(81 224 162 / 10%);
}

.priority.medium {
  color: var(--blue);
  background: rgb(110 200 255 / 10%);
}

.priority.high {
  color: var(--amber);
  background: rgb(255 200 97 / 12%);
}

.priority.critical {
  color: var(--red);
  background: rgb(255 113 132 / 12%);
}

.activity {
  position: relative;
  padding: 3px 0 13px 18px;
  border-left: 1px solid var(--line);
}

.activity::before {
  position: absolute;
  top: 6px;
  left: -5px;
  width: 9px;
  height: 9px;
  content: "";
  background: var(--green);
  border-radius: 50%;
}

.activity p {
  margin-bottom: 4px;
  font-size: 0.9rem;
}

.activity time {
  color: var(--muted);
  font-size: 0.75rem;
}

@media (max-width: 800px) {
  .hero,
  .workspace,
  .transcript-grid {
    grid-template-columns: 1fr;
  }

  .topbar {
    align-items: flex-start;
    gap: 20px;
  }

  .ticket {
    grid-template-columns: 1fr auto;
  }

  .ticket-id {
    grid-column: 1 / -1;
  }
}
```

```javascript title="app/frontend/app.js"
const $ = (selector) => document.querySelector(selector);

const voiceButton = $("#voice-button");
const voiceButtonLabel = $("#voice-button-label");
const stateBadge = $("#state-badge");
const errorBox = $("#error-box");
const userTranscript = $("#user-transcript");
const agentTranscript = $("#agent-transcript");
const connectionDot = $("#connection-dot");
const connectionLabel = $("#connection-label");
const ticketsContainer = $("#tickets");
const activityContainer = $("#activity");
const ticketCount = $("#ticket-count");

let ws = null;
let audioContext = null;
let mediaStream = null;
let worklet = null;
let ready = false;
let ending = false;
let playbackTime = 0;
const playbackSources = new Set();

function setState(state, detail = null) {
  stateBadge.textContent = state;
  stateBadge.className = `state ${state.toLowerCase()}`;
  if (detail) showError(detail);
}

function setConnected(connected) {
  connectionDot.classList.toggle("connected", connected);
  connectionLabel.textContent = connected ? "Connected" : "Disconnected";
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
  setState("ERROR");
}

function clearError() {
  errorBox.classList.add("hidden");
  errorBox.textContent = "";
}

function formatTime(value) {
  return new Intl.DateTimeFormat([], {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.detail || `Request failed (${response.status})`);
  }
  return body;
}

async function refreshDashboard() {
  try {
    const [tickets, activity] = await Promise.all([
      fetchJson("/tickets?status=open"),
      fetchJson("/activity?limit=12"),
    ]);

    ticketCount.textContent = tickets.length;
    ticketsContainer.innerHTML = tickets.length
      ? tickets
          .map(
            (ticket) => `
              <article class="ticket">
                <div class="ticket-id">${escapeHtml(ticket.ticket_id)}</div>
                <div>
                  <h3>${escapeHtml(ticket.title)}</h3>
                  <div class="meta">
                    ${escapeHtml(ticket.location)} ·
                    OPEN · ${escapeHtml(formatTime(ticket.created_at))}
                  </div>
                </div>
                <span class="priority ${ticket.priority}">
                  ${escapeHtml(ticket.priority)}
                </span>
              </article>
            `,
          )
          .join("")
      : '<p class="empty">No open tickets.</p>';

    activityContainer.innerHTML = activity.length
      ? activity
          .map(
            (item) => `
              <article class="activity">
                <p>${escapeHtml(item.detail)}</p>
                <time>${escapeHtml(formatTime(item.created_at))}</time>
              </article>
            `,
          )
          .join("")
      : '<p class="empty">No activity yet.</p>';
  } catch (error) {
    showError(`Dashboard refresh failed: ${error.message}`);
  }
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function flushPlayback() {
  playbackSources.forEach((source) => {
    try {
      source.stop();
    } catch {
      // A source may already have ended.
    }
  });
  playbackSources.clear();
  if (audioContext) playbackTime = audioContext.currentTime;
}

function playPcm16(base64) {
  if (!audioContext) return;

  const binary = atob(base64);
  const length = Math.floor(binary.length / 2);
  const floats = new Float32Array(length);

  for (let i = 0; i < length; i += 1) {
    let sample =
      binary.charCodeAt(i * 2) |
      (binary.charCodeAt(i * 2 + 1) << 8);
    if (sample >= 0x8000) sample -= 0x10000;
    floats[i] = sample / 32768;
  }

  const buffer = audioContext.createBuffer(1, length, 24000);
  buffer.copyToChannel(floats, 0);

  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  source.onended = () => playbackSources.delete(source);

  playbackTime = Math.max(playbackTime, audioContext.currentTime);
  source.start(playbackTime);
  playbackTime += buffer.duration;
  playbackSources.add(source);
}

async function cleanup() {
  ready = false;
  setConnected(false);
  flushPlayback();

  mediaStream?.getTracks().forEach((track) => track.stop());
  mediaStream = null;

  try {
    worklet?.disconnect();
  } catch {
    // Already disconnected.
  }
  worklet = null;

  if (audioContext && audioContext.state !== "closed") {
    await audioContext.close();
  }
  audioContext = null;
  ws = null;
  ending = false;

  voiceButton.disabled = false;
  voiceButton.classList.remove("active");
  voiceButtonLabel.textContent = "START VOICE";
  if (!errorBox.classList.contains("hidden")) return;
  setState("READY");
}

function handleMessage(message) {
  switch (message.type) {
    case "session.ready":
      ready = true;
      setConnected(true);
      setState("LISTENING");
      voiceButton.disabled = false;
      break;

    case "input.speech.started":
      flushPlayback();
      setState("LISTENING");
      break;

    case "input.speech.stopped":
      setState("THINKING");
      break;

    case "transcript.user.delta":
      userTranscript.textContent = message.text || "Listening…";
      break;

    case "transcript.user":
      userTranscript.textContent = message.text || "";
      setState("THINKING");
      break;

    case "reply.started":
      setState(
        message.reply_id?.startsWith("fc-") ? "ACTION" : "SPEAKING",
      );
      break;

    case "reply.audio":
      setState("SPEAKING");
      playPcm16(message.data);
      break;

    case "transcript.agent":
      agentTranscript.textContent = message.text || "";
      break;

    case "reply.done":
      if (message.status === "interrupted") flushPlayback();
      setState("LISTENING");
      refreshDashboard();
      break;

    case "session.error":
    case "error":
      showError(
        message.message || "The voice session encountered an error.",
      );
      break;

    case "session.ended":
      cleanup();
      refreshDashboard();
      break;

    default:
      break;
  }
}

async function startVoice() {
  voiceButton.disabled = true;
  clearError();
  setState("THINKING");
  agentTranscript.textContent = "Connecting to SautiOps…";

  try {
    const [{ token }, { agent_id: agentId }] = await Promise.all([
      fetchJson("/api/voice-token"),
      fetchJson("/api/config"),
    ]);

    audioContext = new AudioContext();
    await audioContext.resume();
    await audioContext.audioWorklet.addModule("/pcm-processor.js");

    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: false,
        autoGainControl: true,
      },
    });

    const source = audioContext.createMediaStreamSource(mediaStream);
    worklet = new AudioWorkletNode(
      audioContext,
      "pcm-processor",
      {
        processorOptions: {
          inputSampleRate: audioContext.sampleRate,
          targetSampleRate: 24000,
        },
      },
    );

    const silentGain = audioContext.createGain();
    silentGain.gain.value = 0;
    source.connect(worklet);
    worklet.connect(silentGain).connect(audioContext.destination);

    worklet.port.onmessage = (event) => {
      if (ready && ws?.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "input.audio",
            audio: arrayBufferToBase64(event.data),
          }),
        );
      }
    };

    const wsUrl = new URL("wss://agents.assemblyai.com/v1/ws");
    wsUrl.searchParams.set("token", token);
    ws = new WebSocket(wsUrl);

    ws.addEventListener("open", () => {
      ws.send(
        JSON.stringify({
          type: "session.update",
          session: { agent_id: agentId },
        }),
      );
    });

    ws.addEventListener("message", (event) => {
      handleMessage(JSON.parse(event.data));
    });

    ws.addEventListener("error", () => {
      showError("The voice connection failed. Try starting a new session.");
    });

    ws.addEventListener("close", async () => {
      if (!ending && ready) {
        showError("The voice session disconnected.");
      }
      await cleanup();
    });

    voiceButton.classList.add("active");
    voiceButtonLabel.textContent = "END VOICE";
  } catch (error) {
    if (error.name === "NotAllowedError") {
      showError(
        "Microphone permission was denied. Allow microphone access and try again.",
      );
    } else {
      showError(error.message || "Could not start the voice session.");
    }
    await cleanup();
  }
}

function endVoice() {
  ending = true;
  ready = false;
  voiceButton.disabled = true;
  setState("THINKING");
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "session.end" }));
    window.setTimeout(cleanup, 3000);
  } else {
    cleanup();
  }
}

voiceButton.addEventListener("click", () => {
  if (ws) endVoice();
  else startVoice();
});

window.addEventListener("pagehide", () => {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "session.end" }));
  }
});

refreshDashboard();
window.setInterval(refreshDashboard, 4000);
```

```python title="tests/test_api.py"
import os

os.environ["TOOL_BEARER_TOKEN"] = "test-tool-token"

from fastapi.testclient import TestClient  # noqa: E402

from app.api.database import initialize_database  # noqa: E402
from app.api.main import app  # noqa: E402

AUTH = {"Authorization": "Bearer test-tool-token"}


def ticket_payload(title: str = "Freezer stopped cooling") -> dict:
    return {
        "title": title,
        "description": "The back-room freezer stopped cooling.",
        "category": "maintenance",
        "priority": "high",
        "location": "Back room",
        "reporter": "Amina",
    }


def setup_function() -> None:
    initialize_database()


def test_health(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_create_and_list_open_ticket(client: TestClient) -> None:
    created = client.post("/tickets", json=ticket_payload())
    assert created.status_code == 201
    assert created.json()["ticket_id"] == "SO-0001"

    listed = client.get("/tickets?status=open")
    assert listed.status_code == 200
    assert len(listed.json()) == 1
    assert listed.json()[0]["status"] == "open"


def test_close_ticket_persists(client: TestClient) -> None:
    client.post("/tickets", json=ticket_payload())
    response = client.post(
        "/tickets/SO-0001/close",
        json={"note": "The freezer was repaired."},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "closed"
    assert client.get("/tickets?status=open").json() == []
    assert client.get("/tickets/SO-0001").json()["closed_at"] is not None


def test_unknown_ticket(client: TestClient) -> None:
    response = client.post(
        "/tickets/SO-9999/close",
        json={"note": "Resolved."},
    )
    assert response.status_code == 404


def test_invalid_ticket_id(client: TestClient) -> None:
    response = client.post(
        "/tickets/not-a-ticket/close",
        json={"note": "Resolved."},
    )
    assert response.status_code == 400


def test_cannot_close_ticket_twice(client: TestClient) -> None:
    client.post("/tickets", json=ticket_payload())
    client.post(
        "/tickets/SO-0001/close",
        json={"note": "Repaired."},
    )
    response = client.post(
        "/tickets/SO-0001/close",
        json={"note": "Closing again."},
    )
    assert response.status_code == 409


def test_tool_contract_and_authentication(client: TestClient) -> None:
    unauthorized = client.post(
        "/tools/create-ticket",
        json=ticket_payload(),
    )
    assert unauthorized.status_code == 401

    created = client.post(
        "/tools/create-ticket",
        headers=AUTH,
        json=ticket_payload(),
    )
    assert created.status_code == 201

    opened = client.get("/tools/open-tickets", headers=AUTH)
    assert opened.status_code == 200
    assert opened.json()[0]["ticket_id"] == "SO-0001"

    closed = client.post(
        "/tools/close-ticket",
        headers=AUTH,
        json={
            "ticket_id": "SO-0001",
            "note": "The freezer was repaired.",
        },
    )
    assert closed.status_code == 200
    assert closed.json()["status"] == "closed"
```

```python title="tests/conftest.py"
import os

import pytest
from fastapi.testclient import TestClient

from app.api.database import initialize_database
from app.api.main import app


@pytest.fixture
def client(tmp_path, monkeypatch):
    database = tmp_path / "test.db"
    monkeypatch.setenv("DATABASE_PATH", str(database))
    monkeypatch.setenv("TOOL_BEARER_TOKEN", "test-tool-token")
    initialize_database()
    with TestClient(app) as test_client:
        yield test_client
```

```text title="requirements.txt"
fastapi==0.116.1
httpx==0.28.1
pydantic==2.11.7
python-dotenv==1.1.1
uvicorn[standard]==0.35.0
pytest==8.4.1
```

```dotenv title=".env.example"
ASSEMBLYAI_API_KEY=replace_me
ASSEMBLYAI_AGENT_ID=
SAUTIOPS_PUBLIC_URL=https://your-public-host.example
TOOL_BEARER_TOKEN=replace_with_a_long_random_secret
DATABASE_PATH=./data/sautiops.db
LOG_LEVEL=INFO
```

```gitignore title=".gitignore"
.env
__pycache__/
*.py[cod]
.pytest_cache/
.venv/
venv/
data/
.DS_Store
```

```yaml title="render.yaml"
services:
  - type: web
    name: sautiops
    runtime: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.api.main:app --host 0.0.0.0 --port $PORT
    healthCheckPath: /health
    envVars:
      - key: PYTHON_VERSION
        value: 3.12.7
      - key: DATABASE_PATH
        value: /var/data/sautiops.db
      - key: ASSEMBLYAI_API_KEY
        sync: false
      - key: ASSEMBLYAI_AGENT_ID
        sync: false
      - key: SAUTIOPS_PUBLIC_URL
        sync: false
      - key: TOOL_BEARER_TOKEN
        generateValue: true
    disk:
      name: sautiops-data
      mountPath: /var/data
      sizeGB: 1
```

```markdown title="README.md"
SautiOps turns spoken operational problems into persistent work.

A worker reports an issue conversationally. The managed voice agent asks only for missing details, confirms the proposed ticket, and invokes authenticated HTTP tools. FastAPI validates and stores the ticket in SQLite. The same agent can retrieve current open work for handover and explicitly close a ticket.

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
          v
    SQLite

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
- `DATABASE_PATH`: SQLite location

Generate a tool secret:

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
      -H "Content-Type: application/json" \
      -d '{"note":"The freezer was repaired."}'

Deployment:

Deploy this as one persistent Python web service. Set all five environment variables. SQLite requires a persistent disk; without one, tickets disappear on redeploy or instance replacement. After the public HTTPS deployment is live:

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
- Tool routes require a bearer secret not used by public ticket routes.
- Agent HTTP tools require public HTTPS.
- Explicit call termination sends `session.end`.
- Do not commit `.env` or the SQLite database.

Known MVP limitations:

- SQLite is appropriate for one persistent instance, not horizontally scaled replicas.
- Public REST mutation endpoints are intentionally unauthenticated for a hackathon demo. Add application authentication before production use.
- The browser polls dashboard state every four seconds because server-side HTTP tools do not execute in the browser.
- Agent publishing requires a public backend because HTTP tool hosts are validated.
- Voice sessions need network access and account entitlement.
- Automatic seed data is omitted so a clean database always starts with SO-0001.
```

Run it locally:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -c "import secrets; print(secrets.token_urlsafe(32))"
uvicorn app.api.main:app --reload --port 8000
```

Then:

1. Put your API key and generated tool secret in `.env`.
2. Expose port `8000` through a public HTTPS tunnel.
3. Set `SAUTIOPS_PUBLIC_URL` to that public origin.
4. Publish the stored agent:

```bash
python -m app.agent.publish
```

5. Copy the printed ID into `ASSEMBLYAI_AGENT_ID` in `.env`.
6. Restart FastAPI and open the local browser app.
7. Run tests:

```bash
pytest -q
```

I generated the complete standalone implementation but cannot execute it in this chat. The backend and tests are ready to run; the live voice path is implemented but requires your AssemblyAI API key, public HTTPS URL, and browser microphone to verify live.
