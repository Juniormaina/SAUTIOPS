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

function connectLiveUpdates() {
  const source = new EventSource("/events");
  const refresh = () => {
    refreshDashboard();
  };
  source.addEventListener("ticket.created", refresh);
  source.addEventListener("ticket.closed", refresh);
  source.addEventListener("connected", refresh);
  source.onerror = () => {
    refreshDashboard();
  };
}

refreshDashboard();
connectLiveUpdates();