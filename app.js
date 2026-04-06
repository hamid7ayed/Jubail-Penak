// ===============================
// CONFIG
// ===============================
const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwA2PgUDBa0d8lmGR_Wnk2NeaQlHLGSxOpKWnK11NL5i8shPTF-7TIMTGDvgyJEQ3ZU/exec";

// ===============================
// UI TEXT
// ===============================
const UI_TEXT = {
  app: {
    title: "پینک",
    subtitle: "سامانه ثبت و مدیریت امتیاز"
  },
  notifications: {
    syncPending: "در انتظار همگام‌سازی…",
    syncSuccess: "همگام‌سازی با موفقیت انجام شد.",
    syncError: "خطا در همگام‌سازی. بعداً دوباره تلاش می‌شود."
  }
};

// ===============================
// STATE & STORAGE HELPERS
// ===============================
const STORAGE_KEYS = {
  players: "penak_players",
  places: "penak_places",
  history: "penak_history",
  syncQueue: "penak_sync_queue"
};

function loadJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ===============================
// TOAST / NOTIFICATION
// ===============================
let toastTimeout = null;

function showNotification(message, type = "info") {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;

  toast.style.background =
    type === "success"
      ? "rgba(22,163,74,0.9)"
      : type === "error"
      ? "rgba(220,38,38,0.9)"
      : "rgba(0,0,0,0.8)";

  toast.classList.add("show");

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

// ===============================
// SYNC QUEUE
// ===============================
function getQueue() {
  return loadJSON(STORAGE_KEYS.syncQueue, []);
}

function setQueue(queue) {
  saveJSON(STORAGE_KEYS.syncQueue, queue);
  updateSyncStatus();
}

function addToSyncQueue(item) {
  const queue = getQueue();
  queue.push(item);
  setQueue(queue);
  showNotification(UI_TEXT.notifications.syncPending, "info");
}

async function processSyncQueue() {
  const queue = getQueue();
  if (queue.length === 0) return;

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify(item)
      });
    } catch (err) {
      showNotification(UI_TEXT.notifications.syncError, "error");
      return; // stop, retry later
    }
  }

  setQueue([]);
  showNotification(UI_TEXT.notifications.syncSuccess, "success");
}

window.addEventListener("online", processSyncQueue);

function updateSyncStatus() {
  const el = document.getElementById("sync-status");
  if (!el) return;
  const queue = getQueue();
  if (queue.length > 0) el.classList.remove("hidden");
  else el.classList.add("hidden");
}

function retrySyncNow() {
  processSyncQueue();
}

// ===============================
// PLAYERS & PLACES (CONFIG SYNC)
// ===============================
function getPlayers() {
  return loadJSON(STORAGE_KEYS.players, []);
}

function savePlayers(players) {
  saveJSON(STORAGE_KEYS.players, players);
  syncConfig();
}

function getPlaces() {
  return loadJSON(STORAGE_KEYS.places, []);
}

function savePlaces(places) {
  saveJSON(STORAGE_KEYS.places, places);
  syncConfig();
}

function syncConfig() {
  const players = getPlayers();
  const locations = getPlaces();

  addToSyncQueue({
    type: "config",
    players,
    locations
  });
}

// ===============================
// HISTORY (LOCAL + REMOTE)
// ===============================
function getLocalHistory() {
  return loadJSON(STORAGE_KEYS.history, []);
}

function saveLocalHistory(history) {
  saveJSON(STORAGE_KEYS.history, history);
}

async function fetchRemoteHistory() {
  try {
    const res = await fetch(GOOGLE_SCRIPT_URL);
    const data = await res.json();
    if (Array.isArray(data)) {
      saveLocalHistory(data);
      renderHistory(data);
    }
  } catch (err) {
    // ignore, offline or error
  }
}

function addGameToHistory(game) {
  const history = getLocalHistory();
  history.unshift(game);
  saveLocalHistory(history);
  renderHistory(history);
}

// ===============================
// GAME SAVE
// ===============================
// Call this when a game finishes
function saveFinishedGame({ date, time, place, teamA, teamB, winner }) {
  const payload = {
    type: "game",
    date,
    time,
    place,
    teamA,
    teamB,
    winner
  };

  // local history
  addGameToHistory(payload);

  // queue for sync
  addToSyncQueue(payload);
}

// ===============================
// RENDERING (HOOK INTO YOUR UI)
// ===============================
function renderHistory(history) {
  const container = document.getElementById("history-list");
  if (!container) return;

  container.innerHTML = "";

  if (!history.length) {
    container.innerHTML =
      '<p class="text-white text-sm opacity-80 text-center mt-4">هنوز بازی ثبت نشده است.</p>';
    return;
  }

  history.forEach(game => {
    const div = document.createElement("div");
    div.className = "history-item text-white text-sm";

    div.innerHTML = `
      <div class="flex justify-between mb-1">
        <span>${game.date || ""} - ${game.time || ""}</span>
        <span>${game.place || ""}</span>
      </div>
      <div class="flex justify-between mt-1">
        <span>تیم A: ${game.teamA?.players || ""} (${game.teamA?.score ?? 0})</span>
        <span>تیم B: ${game.teamB?.players || ""} (${game.teamB?.score ?? 0})</span>
      </div>
      <div class="mt-1">
        برنده: <strong>${game.winner || "-"}</strong>
      </div>
    `;
    container.appendChild(div);
  });
}

// ===============================
// INIT UI
// ===============================
function initUITexts() {
  const titleEl = document.getElementById("app-title");
  const subtitleEl = document.getElementById("app-subtitle");

  if (titleEl) titleEl.textContent = "🃏 " + UI_TEXT.app.title;
  if (subtitleEl) subtitleEl.textContent = UI_TEXT.app.subtitle;
}

// ===============================
// ON LOAD
// ===============================
window.addEventListener("load", () => {
  initUITexts();
  updateSyncStatus();

  // render local history immediately
  renderHistory(getLocalHistory());

  // try to refresh from server if online
  if (navigator.onLine) {
    processSyncQueue();
    fetchRemoteHistory();
  }
});

// ===============================
// EXPORTS FOR INLINE HANDLERS (OPTIONAL)
// ===============================
// Example usage from HTML:
// <button onclick="debugAddFakeGame()">تست</button>
function debugAddFakeGame() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "/");
  const time = now.toTimeString().slice(0, 5);

  saveFinishedGame({
    date,
    time,
    place: "محل تست",
    teamA: { players: "الف۱، الف۲", score: 102 },
    teamB: { players: "ب۱، ب۲", score: 98 },
    winner: "تیم الف"
  });
}

window.retrySyncNow = retrySyncNow;
window.debugAddFakeGame = debugAddFakeGame;
// You can also expose other functions here as needed
