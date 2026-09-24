const $ = (selector) => document.querySelector(selector);

const voiceButton = $("#voice-button");
const voiceButtonLabel = $("#voice-button-label");
const stateBadge = $("#state-badge");
const stateHint = $("#state-hint");
const errorBox = $("#error-box");
const userTranscript = $("#user-transcript");
const agentTranscript = $("#agent-transcript");
const connectionDot = $("#connection-dot");
const connectionLabel = $("#connection-label");
const feedDot = $("#feed-dot");
const feedLabel = $("#feed-label");
const ticketsContainer = $("#tickets");
const activityContainer = $("#activity");
const ticketCount = $("#ticket-count");
const copyToast = $("#copy-toast");
const demoSteps = $("#demo-steps");
const pipelineSteps = document.querySelectorAll("[data-pipe]");

const STATE_HINTS = {
  READY: "Press start, allow the mic, then describe what’s going wrong.",
  LISTENING: "Listening — speak naturally, interrupt anytime.",
  THINKING: "Working out the next question or action…",
  ACTION: "Calling the backend to create, list, or close work…",
  SPEAKING: "SautiOps is answering — you can interrupt.",
  ERROR: "Something broke. End voice if needed, then try again.",
};

let ws = null;
let audioContext = null;
let mediaStream = null;
let worklet = null;
let ready = false;
let ending = false;
let playbackTime = 0;
const playbackSources = new Set();
let knownTicketIds = new Set();
let eventSource = null;
let feedRetryMs = 1000;
let copyToastTimer = null;

function setState(state, detail = null) {
  stateBadge.textContent = state;
  stateBadge.className = `state ${state.toLowerCase()}`;
  if (stateHint) {
    stateHint.textContent = STATE_HINTS[state] || STATE_HINTS.READY;
  }
  updatePipeline(state);
  voiceButton.classList.toggle("listening-glow", state === "LISTENING");
  userTranscript.parentElement?.classList.toggle(
    "is-live",
    state === "LISTENING",
  );
  agentTranscript.parentElement?.classList.toggle(
    "is-live",
    state === "SPEAKING" || state === "ACTION",
  );
  if (detail) showError(detail);
}

function updatePipeline(state) {
  const order = ["speak", "confirm", "track", "handover"];
  let active = "speak";
  if (state === "THINKING" || state === "SPEAKING") active = "confirm";
  if (state === "ACTION") active = "track";
  if (state === "LISTENING" && knownTicketIds.size > 0) active = "handover";
  if (state === "READY" && knownTicketIds.size > 0) active = "handover";
  if (state === "READY" && knownTicketIds.size === 0) active = "speak";

  const activeIndex = order.indexOf(active);
  pipelineSteps.forEach((node) => {
    const key = node.getAttribute("data-pipe");
    const index = order.indexOf(key);
    node.classList.toggle("is-active", key === active);
    node.classList.toggle("is-done", index < activeIndex);
  });
}

function setConnected(connected) {
  connectionDot.classList.toggle("connected", connected);
  connectionDot.classList.remove("reconnecting");
  connectionLabel.textContent = connected ? "Voice live" : "Voice idle";
}

function setFeedStatus(status) {
  feedDot.classList.remove("connected", "reconnecting");
  if (status === "live") {
    feedDot.classList.add("connected");
    feedLabel.textContent = "Feed live";
  } else if (status === "reconnecting") {
    feedDot.classList.add("reconnecting");
    feedLabel.textContent = "Feed reconnecting";
  } else {
    feedLabel.textContent = "Feed idle";
  }
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

function formatAction(action) {
  return String(action || "event").replaceAll("_", " ");
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.detail || `Request failed (${response.status})`);
  }
  return body;
}

function updateDemoProgress(tickets, activity) {
  if (!demoSteps) return;
  const created = activity.some((item) => item.action === "ticket_created");
  const viewed = activity.some((item) => item.action === "tickets_viewed");
  const closed = activity.some((item) => item.action === "ticket_closed");

  let current = 1;
  if (created) current = 2;
  if (created && tickets.length > 0) current = 3;
  if (viewed) current = 4;
  if (closed) current = closed && tickets.length === 0 ? 1 : 4;

  demoSteps.querySelectorAll("li").forEach((item) => {
    const step = Number(item.dataset.step);
    item.classList.toggle("is-current", step === current);
    item.classList.toggle(
      "is-done",
      (step === 1 && created) ||
        (step === 2 && created) ||
        (step === 3 && viewed) ||
        (step === 4 && closed),
    );
  });
}

async function refreshDashboard({ flashNew = false } = {}) {
  try {
    const [tickets, activity] = await Promise.all([
      fetchJson("/tickets?status=open"),
      fetchJson("/activity?limit=12"),
    ]);

    const nextIds = new Set(tickets.map((ticket) => ticket.ticket_id));
    const brandNew = [...nextIds].filter((id) => !knownTicketIds.has(id));
    knownTicketIds = nextIds;

    ticketCount.textContent = tickets.length;
    if (flashNew && brandNew.length) {
      ticketCount.classList.add("bump");
      window.setTimeout(() => ticketCount.classList.remove("bump"), 280);
    }

    ticketsContainer.innerHTML = tickets.length
      ? tickets
          .map(
            (ticket) => `
              <article class="ticket${
                flashNew && brandNew.includes(ticket.ticket_id)
                  ? " is-flash"
                  : ""
              }">
                <div class="ticket-id">${escapeHtml(ticket.ticket_id)}</div>
                <div>
                  <h3>${escapeHtml(ticket.title)}</h3>
                  <div class="meta">
                    ${escapeHtml(ticket.category)} ·
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
      : '<p class="empty">No open tickets — report one by voice.</p>';

    activityContainer.innerHTML = activity.length
      ? activity
          .map(
            (item) => `
              <article class="activity">
                <span class="activity-action">${escapeHtml(
                  formatAction(item.action),
                )}</span>
                <p>${escapeHtml(item.detail)}</p>
                <time>${escapeHtml(formatTime(item.created_at))}</time>
              </article>
            `,
          )
          .join("")
      : '<p class="empty">No activity yet.</p>';

    updateDemoProgress(tickets, activity);
    updatePipeline(stateBadge.textContent || "READY");
  } catch (error) {
    console.warn("Dashboard refresh failed:", error);
    setFeedStatus("reconnecting");
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

  if (ws) {
    ws.onopen = null;
    ws.onmessage = null;
    ws.onerror = null;
    ws.onclose = null;
    if (
      ws.readyState === WebSocket.OPEN ||
      ws.readyState === WebSocket.CONNECTING
    ) {
      try {
        ws.close();
      } catch {
        // Ignore close races.
      }
    }
  }
  ws = null;
  ending = false;

  voiceButton.disabled = false;
  voiceButton.classList.remove("active", "listening-glow");
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
      refreshDashboard({ flashNew: true });
      break;

    case "session.error":
    case "error":
      showError(
        message.message || "The voice session encountered an error.",
      );
      break;

    case "session.ended":
      cleanup();
      refreshDashboard({ flashNew: true });
      break;

    default:
      break;
  }
}

async function startVoice() {
  if (ws) return;

  voiceButton.disabled = true;
  clearError();
  setState("THINKING");
  setConnected(false);
  connectionDot.classList.add("reconnecting");
  connectionLabel.textContent = "Voice connecting…";
  agentTranscript.textContent = "Connecting to SautiOps…";

  try {
    const [{ token }, { agent_id: agentId }] = await Promise.all([
      fetchJson("/api/voice-token"),
      fetchJson("/api/config"),
    ]);

    audioContext = new AudioContext({ sampleRate: 48000 });
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
    worklet = new AudioWorkletNode(audioContext, "pcm-processor", {
      processorOptions: {
        inputSampleRate: audioContext.sampleRate,
        targetSampleRate: 24000,
      },
    });

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
      try {
        handleMessage(JSON.parse(event.data));
      } catch (error) {
        console.warn("Ignoring malformed voice message", error);
      }
    });

    ws.addEventListener("error", () => {
      if (!ending) {
        showError("The voice connection failed. Try starting a new session.");
      }
    });

    ws.addEventListener("close", async () => {
      if (!ending && ready) {
        showError(
          "The voice session disconnected. Press START VOICE to reconnect.",
        );
      } else if (!ending && !ready) {
        showError(
          "Could not finish connecting to the voice agent. Check the agent ID and try again.",
        );
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
    } else if (error.name === "NotFoundError") {
      showError("No microphone was found on this device.");
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
    try {
      ws.send(JSON.stringify({ type: "session.end" }));
    } catch {
      // Fall through to cleanup timeout.
    }
    window.setTimeout(() => {
      cleanup();
    }, 3000);
  } else {
    cleanup();
  }
}

function showCopyToast(message) {
  if (!copyToast) return;
  copyToast.textContent = message;
  copyToast.classList.remove("hidden");
  window.clearTimeout(copyToastTimer);
  copyToastTimer = window.setTimeout(() => {
    copyToast.classList.add("hidden");
  }, 2200);
}

demoSteps?.addEventListener("click", async (event) => {
  const button = event.target.closest(".demo-step-btn");
  if (!button) return;
  const text = button.dataset.copy || "";
  try {
    await navigator.clipboard.writeText(text);
    showCopyToast("Copied — say it to SautiOps, or keep it as a prompt.");
  } catch {
    showCopyToast(text);
  }
});

voiceButton.addEventListener("click", () => {
  if (ws) endVoice();
  else startVoice();
});

window.addEventListener("pagehide", () => {
  ending = true;
  if (ws?.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify({ type: "session.end" }));
    } catch {
      // Best-effort end on unload.
    }
  }
  mediaStream?.getTracks().forEach((track) => track.stop());
});

function connectLiveUpdates() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }

  setFeedStatus("reconnecting");
  eventSource = new EventSource("/events");

  const onUpdate = () => {
    setFeedStatus("live");
    feedRetryMs = 1000;
    refreshDashboard({ flashNew: true });
  };

  eventSource.addEventListener("ticket.created", onUpdate);
  eventSource.addEventListener("ticket.closed", onUpdate);
  eventSource.addEventListener("connected", () => {
    setFeedStatus("live");
    feedRetryMs = 1000;
    refreshDashboard();
  });

  eventSource.onerror = () => {
    setFeedStatus("reconnecting");
    eventSource?.close();
    eventSource = null;
    window.setTimeout(connectLiveUpdates, feedRetryMs);
    feedRetryMs = Math.min(feedRetryMs * 2, 15000);
    refreshDashboard();
  };
}

refreshDashboard();
connectLiveUpdates();
setState("READY");
