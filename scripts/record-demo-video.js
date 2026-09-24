#!/usr/bin/env node
/**
 * Record a ~45s SautiOps demo video with Playwright.
 *
 * Prerequisites:
 *   1. API running:  .venv/bin/uvicorn app.api.main:app --host 127.0.0.1 --port 8000
 *   2. .env with API_BEARER_TOKEN (and TOOL_BEARER_TOKEN for handover tool call)
 *   3. npm install && npx playwright install chromium
 *
 * Output:
 *   demos/sautiops-demo.mp4
 *
 * Optional env:
 *   DEMO_BASE_URL   (default http://127.0.0.1:8000)
 *   DEMO_API_TOKEN  (defaults to API_BEARER_TOKEN from .env)
 */

import { spawn } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEMOS = join(ROOT, "demos");
const TMP = join(DEMOS, ".playwright-run");
const OUT_MP4 = join(DEMOS, "sautiops-demo.mp4");
const OUT_WEBM = join(DEMOS, "sautiops-demo.webm");
const BASE_URL = process.env.DEMO_BASE_URL || "http://127.0.0.1:8000";

function loadEnvFile() {
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) return {};
  const values = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    values[trimmed.slice(0, index)] = trimmed.slice(index + 1);
  }
  return values;
}

const envFile = loadEnvFile();
const API_TOKEN = process.env.DEMO_API_TOKEN || envFile.API_BEARER_TOKEN || "";
const TOOL_TOKEN = envFile.TOOL_BEARER_TOKEN || API_TOKEN;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function api(path, { method = "GET", auth = false, tool = false, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) headers.Authorization = `Bearer ${API_TOKEN}`;
  if (tool) headers.Authorization = `Bearer ${TOOL_TOKEN}`;

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body,
  });
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }
  if (!response.ok) {
    throw new Error(
      `${method} ${path} → ${response.status}: ${JSON.stringify(payload)}`,
    );
  }
  return payload;
}

async function ensureServer() {
  const health = await fetch(`${BASE_URL}/health`).catch(() => null);
  if (!health?.ok) {
    throw new Error(
      `SautiOps is not reachable at ${BASE_URL}. Start it with:\n` +
        `  .venv/bin/uvicorn app.api.main:app --host 127.0.0.1 --port 8000`,
    );
  }
  if (!API_TOKEN) {
    throw new Error("API_BEARER_TOKEN missing. Set it in .env or DEMO_API_TOKEN.");
  }
}

async function seedForSo0003() {
  const open = await api("/tickets?status=open");
  for (const ticket of open) {
    await api(`/tickets/${ticket.ticket_id}/close`, {
      method: "POST",
      auth: true,
      body: JSON.stringify({ note: "Cleared before demo recording." }),
    }).catch(() => {});
  }

  const listed = await api("/tickets");
  const maxId = listed.reduce((max, ticket) => {
    const match = /^SO-(\d+)$/.exec(ticket.ticket_id || "");
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);

  for (let next = maxId + 1; next < 3; next += 1) {
    const created = await api("/tickets", {
      method: "POST",
      auth: true,
      body: JSON.stringify({
        title: `Seed ticket ${next}`,
        description: "Pre-seeded so the demo ticket is SO-0003.",
        category: "other",
        priority: "low",
        location: "Back office",
        reporter: "Demo",
      }),
    });
    await api(`/tickets/${created.ticket_id}/close`, {
      method: "POST",
      auth: true,
      body: JSON.stringify({ note: "Seed closed for a clean open-work board." }),
    });
  }
}

async function typeInto(page, selector, text, charDelay = 28) {
  await page.evaluate(
    async ({ selector, text, charDelay }) => {
      const node = document.querySelector(selector);
      if (!node) return;
      node.textContent = "";
      for (const char of text) {
        node.textContent += char;
        await new Promise((resolve) => setTimeout(resolve, charDelay));
      }
    },
    { selector, text, charDelay },
  );
}

async function setDemoUi(page, patch) {
  await page.evaluate((patch) => {
    const $ = (id) => document.getElementById(id);
    const setText = (id, value) => {
      const node = $(id);
      if (node && value != null) node.textContent = value;
    };

    if (patch.voiceConnected) {
      $("connection-dot")?.classList.add("connected");
      $("connection-dot")?.classList.remove("reconnecting");
      setText("connection-label", "Voice live");
    }
    if (patch.voiceConnected === false) {
      $("connection-dot")?.classList.remove("connected", "reconnecting");
      setText("connection-label", "Voice idle");
    }
    if (patch.feedConnected) {
      $("feed-dot")?.classList.add("connected");
      $("feed-dot")?.classList.remove("reconnecting");
      setText("feed-label", "Feed live");
    }
    if (patch.state) {
      const badge = $("state-badge");
      if (badge) {
        badge.textContent = patch.state;
        badge.className = `state ${String(patch.state).toLowerCase()}`;
      }
    }
    if (patch.stateHint) setText("state-hint", patch.stateHint);
    if (patch.user != null) setText("user-transcript", patch.user);
    if (patch.agent != null) setText("agent-transcript", patch.agent);
    if (patch.buttonActive != null) {
      const button = $("voice-button");
      const label = $("voice-button-label");
      button?.classList.toggle("active", patch.buttonActive);
      button?.classList.toggle("listening-glow", patch.state === "LISTENING");
      if (label) {
        label.textContent = patch.buttonActive ? "END VOICE" : "START VOICE";
      }
    }
    if (patch.pipeline) {
      const order = ["speak", "confirm", "track", "handover"];
      const activeIndex = order.indexOf(patch.pipeline);
      document.querySelectorAll("[data-pipe]").forEach((node) => {
        const key = node.getAttribute("data-pipe");
        const index = order.indexOf(key);
        node.classList.toggle("is-active", key === patch.pipeline);
        node.classList.toggle("is-done", index > -1 && index < activeIndex);
      });
    }
    if (patch.hideError) $("error-box")?.classList.add("hidden");
    if (patch.demoStep) {
      document.querySelectorAll("#demo-steps li").forEach((item) => {
        const step = Number(item.dataset.step);
        item.classList.toggle("is-current", step === patch.demoStep);
        item.classList.toggle("is-done", step < patch.demoStep);
      });
    }
  }, patch);
}

function runFfmpeg(input, output) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "ffmpeg",
      [
        "-y",
        "-i",
        input,
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        "-an",
        output,
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg failed (${code}): ${stderr.slice(-800)}`));
    });
  });
}

function findWebm(dir) {
  if (!existsSync(dir)) return null;
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.name.endsWith(".webm")) return full;
    }
  }
  return null;
}

async function main() {
  console.log("Checking SautiOps…");
  await ensureServer();
  console.log("Seeding so the live create lands on SO-0003…");
  await seedForSo0003();

  mkdirSync(DEMOS, { recursive: true });
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      "--autoplay-policy=no-user-gesture-required",
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: {
      dir: TMP,
      size: { width: 1440, height: 900 },
    },
    permissions: ["microphone"],
  });

  const page = await context.newPage();

  await page.route("**/api/voice-token", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ token: "demo-token" }),
    });
  });
  await page.route("**/api/config", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ agent_id: "demo-agent" }),
    });
  });

  await page.addInitScript(() => {
    class FakeWebSocket {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;
      readyState = FakeWebSocket.CONNECTING;
      constructor() {
        queueMicrotask(() => {
          this.readyState = FakeWebSocket.OPEN;
          this.onopen?.({ type: "open" });
          this.onmessage?.({
            data: JSON.stringify({ type: "session.ready" }),
          });
        });
      }
      send() {}
      close() {
        this.readyState = FakeWebSocket.CLOSED;
        this.onclose?.({ type: "close" });
      }
      addEventListener(type, handler) {
        if (type === "open") this.onopen = handler;
        if (type === "close") this.onclose = handler;
        if (type === "message") this.onmessage = handler;
        if (type === "error") this.onerror = handler;
      }
      removeEventListener() {}
    }
    window.WebSocket = FakeWebSocket;

    const fakeStream = {
      getTracks: () => [{ stop() {}, kind: "audio", enabled: true }],
    };
    if (navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia = async () => fakeStream;
    }

    window.AudioContext = class {
      sampleRate = 48000;
      state = "running";
      currentTime = 0;
      async resume() {
        this.state = "running";
      }
      async close() {
        this.state = "closed";
      }
      createMediaStreamSource() {
        return { connect() {} };
      }
      createGain() {
        return {
          gain: { value: 0 },
          connect() {
            return this;
          },
        };
      }
      get audioWorklet() {
        return { addModule: async () => {} };
      }
      createBuffer() {
        return { duration: 0.01, copyToChannel() {} };
      }
      createBufferSource() {
        return {
          buffer: null,
          connect() {},
          start() {},
          stop() {},
          onended: null,
        };
      }
      get destination() {
        return {};
      }
    };
    window.AudioWorkletNode = class {
      port = { onmessage: null };
      connect() {
        return this;
      }
      disconnect() {}
    };
  });

  // Scene 1 — Introduction (0–8s)
  console.log("Scene 1 — load & connect");
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.waitForSelector("#voice-button");
  await setDemoUi(page, {
    feedConnected: true,
    hideError: true,
    state: "READY",
    stateHint: "Press start, allow the mic, then describe what’s going wrong.",
    demoStep: 1,
    pipeline: "speak",
  });
  await sleep(3500);
  await setDemoUi(page, {
    voiceConnected: true,
    feedConnected: true,
    state: "READY",
  });
  await sleep(4500);

  // Scene 2 — Conversation (8–22s)
  console.log("Scene 2 — conversational report");
  await page.click("#voice-button");
  await sleep(1000);
  await setDemoUi(page, {
    voiceConnected: true,
    feedConnected: true,
    buttonActive: true,
    state: "LISTENING",
    stateHint: "Listening — speak naturally, interrupt anytime.",
    agent: "Hey, SautiOps here. What's going on?",
    user: "",
    pipeline: "speak",
    demoStep: 1,
    hideError: true,
  });
  await sleep(1100);

  await typeInto(
    page,
    "#user-transcript",
    "The freezer in the back room stopped cooling and some stock may be at risk.",
    22,
  );
  await sleep(700);

  await setDemoUi(page, {
    state: "THINKING",
    stateHint: "Working out the next question or action…",
    pipeline: "confirm",
  });
  await sleep(900);

  await setDemoUi(page, {
    state: "SPEAKING",
    stateHint: "SautiOps is answering — you can interrupt.",
    pipeline: "confirm",
    agent:
      "Got it — back-room freezer lost cooling and stock may be at risk. I’ll log that as maintenance, high priority, location Back room. Should I create that ticket?",
    demoStep: 2,
  });
  await sleep(3200);

  await setDemoUi(page, { state: "LISTENING", user: "" });
  await typeInto(page, "#user-transcript", "Yes, create that ticket.", 30);
  await sleep(600);

  await setDemoUi(page, {
    state: "ACTION",
    stateHint: "Calling the backend to create, list, or close work…",
    pipeline: "track",
    agent: "Creating that ticket now…",
    demoStep: 2,
  });

  const created = await api("/tickets", {
    method: "POST",
    auth: true,
    body: JSON.stringify({
      title: "Freezer stopped cooling",
      description:
        "The back-room freezer stopped cooling and some stock may be at risk.",
      category: "maintenance",
      priority: "high",
      location: "Back room",
      reporter: "Amina",
    }),
  });
  const ticketId = created.ticket_id;
  console.log(`Created ${ticketId}`);
  await sleep(1800);

  await setDemoUi(page, {
    state: "SPEAKING",
    pipeline: "track",
    agent: `Done — ${ticketId} is open as high-priority maintenance in the back room.`,
    demoStep: 3,
  });
  await page
    .waitForFunction((id) => document.body.innerText.includes(id), ticketId, {
      timeout: 10000,
    })
    .catch(() => {});
  await sleep(2200);

  // Scene 3 — Handover & close (22–35s)
  console.log("Scene 3 — handover & close");
  await setDemoUi(page, {
    state: "LISTENING",
    user: "",
    pipeline: "handover",
    demoStep: 3,
  });
  await typeInto(
    page,
    "#user-transcript",
    "What is still open for the next shift?",
    26,
  );
  await sleep(500);
  await setDemoUi(page, {
    state: "ACTION",
    agent: "Checking live open work…",
  });
  await api("/tools/open-tickets", { tool: true }).catch(() =>
    api("/tickets?status=open"),
  );
  await sleep(1000);
  await setDemoUi(page, {
    state: "SPEAKING",
    agent: `${ticketId} is still open — freezer cooling failure in the back room, high priority. That’s the handover for next shift.`,
    demoStep: 3,
  });
  await sleep(2800);

  await setDemoUi(page, { state: "LISTENING", user: "", demoStep: 4 });
  await typeInto(
    page,
    "#user-transcript",
    `Close ${ticketId}. The freezer was repaired.`,
    24,
  );
  await sleep(500);
  await setDemoUi(page, {
    state: "ACTION",
    agent: `Closing ${ticketId}…`,
    pipeline: "handover",
  });
  await api(`/tickets/${ticketId}/close`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ note: "The freezer was repaired." }),
  });
  await sleep(1600);
  await setDemoUi(page, {
    state: "SPEAKING",
    agent: `${ticketId} is closed. Repair noted in the audit trail.`,
    demoStep: 4,
  });
  await sleep(2500);

  // Scene 4 — closing hold (35–45s)
  console.log("Scene 4 — closing hold");
  await setDemoUi(page, {
    buttonActive: false,
    voiceConnected: false,
    feedConnected: true,
    state: "READY",
    stateHint: "Speak it. Track it. Hand it over.",
    user: "Your words will appear here.",
    agent: "Ready when you are — just start talking.",
    pipeline: "handover",
    demoStep: 4,
  });
  await sleep(2500);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await sleep(4500);

  const videoHandle = page.video();
  await context.close();
  await browser.close();

  const recorded =
    (videoHandle ? await videoHandle.path() : null) || findWebm(TMP);
  if (!recorded || !existsSync(recorded)) {
    throw new Error("Playwright did not produce a video file.");
  }

  copyFileSync(recorded, OUT_WEBM);
  console.log("Transcoding to mp4…");
  await runFfmpeg(OUT_WEBM, OUT_MP4);
  rmSync(TMP, { recursive: true, force: true });

  console.log(`\nDemo ready:\n  ${OUT_MP4}\n  ${OUT_WEBM}`);
  console.log("Adding narrated voiceover…");
  await new Promise((resolve, reject) => {
    const child = spawn(
      join(ROOT, ".venv/bin/python"),
      [join(ROOT, "scripts/add-demo-voiceover.py")],
      { stdio: "inherit" },
    );
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Voiceover step failed with code ${code}`));
    });
  }).catch((error) => {
    console.warn(
      `Video saved without narration (${error.message}). ` +
        `Install edge-tts in the venv and run:\n` +
        `  .venv/bin/python scripts/add-demo-voiceover.py`,
    );
  });
  console.log("Narrate cues also live in demos/VOICEOVER.md if you prefer live VO.");
}

main().catch((error) => {
  console.error(`\nDemo recording failed:\n${error.stack || error.message}`);
  process.exit(1);
});
