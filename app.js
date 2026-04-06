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
// STORAGE HELPERS
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
// TOAST NOTIFICATION
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
      return;
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
window.retrySyncNow = retrySyncNow;

// ===============================
// PLAYERS & PLACES
// ===============================
function getPlayers() {
  return loadJSON(STORAGE_KEYS.players, []);
}

function getPlaces() {
  return loadJSON(STORAGE_KEYS.places, []);
}

// ===============================
// HISTORY
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
  } catch {}
}

function addGameToHistory(game) {
  const history = getLocalHistory();
  history.unshift(game);
  saveLocalHistory(history);
  renderHistory(history);
}

// ===============================
// SAVE GAME
// ===============================
function saveFinishedGame(game) {
  addGameToHistory(game);
  addToSyncQueue(game);
}

// ===============================
// RENDER HISTORY
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
    div.className = "glass p-3 mb-3 text-white text-sm";

    div.innerHTML = `
      <div class="flex justify-between mb-1">
        <span>${game.date} - ${game.time}</span>
        <span>${game.place}</span>
      </div>
      <div class="flex justify-between mt-1">
        <span>تیم A: ${game.teamA.players} (${game.teamA.score})</span>
        <span>تیم B: ${game.teamB.players} (${game.teamB.score})</span>
      </div>
      <div class="mt-1">
        برنده: <strong>${game.winner}</strong>
      </div>
    `;
    container.appendChild(div);
  });
}

// ===============================
// UI STATE
// ===============================
let currentTeam = null;

// ===============================
// TAB SWITCHING
// ===============================
function showTab(tab) {
  document.getElementById("panel-game").classList.add("hidden");
  document.getElementById("panel-stats").classList.add("hidden");
  document.getElementById("panel-history").classList.add("hidden");

  document.getElementById(`panel-${tab}`).classList.remove("hidden");

  document.getElementById("tab-game").classList.remove("tab-active");
  document.getElementById("tab-stats").classList.remove("tab-active");
  document.getElementById("tab-history").classList.remove("tab-active");

  document.getElementById("tab-game").classList.add("tab-inactive");
  document.getElementById("tab-stats").classList.add("tab-inactive");
  document.getElementById("tab-history").classList.add("tab-inactive");

  document.getElementById(`tab-${tab}`).classList.add("tab-active");
  document.getElementById(`tab-${tab}`).classList.remove("tab-inactive");

  if (tab === "history") {
    renderHistory(getLocalHistory());
  }
}
window.showTab = showTab;

// ===============================
// BOTTOM SHEETS
// ===============================
function openSheet(id) {
  document.getElementById("overlay").classList.add("show");
  document.getElementById(id).classList.add("show");
}

function closeSheet(id) {
  document.getElementById("overlay").classList.remove("show");
  document.getElementById(id).classList.remove("show");
}

// ===============================
// PLAYER SHEET
// ===============================
function openPlayerSheet(team) {
  currentTeam = team;

  const players = getPlayers();
  const list = document.getElementById("player-list");
  list.innerHTML = "";

  players.forEach(p => {
    const btn = document.createElement("button");
    btn.className = "w-full bg-white/10 text-white py-2 rounded-lg mb-2 touch-btn";
    btn.textContent = p;
    btn.onclick = () => selectPlayer(p);
    list.appendChild(btn);
  });

  openSheet("player-sheet");
}

function closePlayerSheet() {
  closeSheet("player-sheet");
}

function selectPlayer(playerName) {
  const el = document.getElementById(`selected-${currentTeam}`);
  if (el) el.textContent = playerName;

  closePlayerSheet();
}

window.openPlayerSheet = openPlayerSheet;
window.closePlayerSheet = closePlayerSheet;

// ===============================
// PLACE SHEET
// ===============================
function openPlaceSheet() {
  const places = getPlaces();
  const list = document.getElementById("place-list");
  list.innerHTML = "";

  places.forEach(p => {
    const btn = document.createElement("button");
    btn.className = "w-full bg-white/10 text-white py-2 rounded-lg mb-2 touch-btn";
    btn.textContent = p;
    btn.onclick = () => selectPlace(p);
    list.appendChild(btn);
  });

  openSheet("place-sheet");
}

function closePlaceSheet() {
  closeSheet("place-sheet");
}

function selectPlace(placeName) {
  const el = document.getElementById("selected-place");
  if (el) el.textContent = placeName;

  closePlaceSheet();
}

window.openPlaceSheet = openPlaceSheet;
window.closePlaceSheet = closePlaceSheet;

// ===============================
// SAVE GAME
// ===============================
function saveGame() {
  const place = document.getElementById("selected-place").textContent.trim();
  const scoreA = parseInt(document.getElementById("scoreA").value || 0);
  const scoreB = parseInt(document.getElementById("scoreB").value || 0);

  const teamAPlayers = document.getElementById("selected-A")?.textContent || "";
  const teamBPlayers = document.getElementById("selected-B")?.textContent || "";

  if (!place || !teamAPlayers || !teamBPlayers) {
    showNotification("لطفاً محل و بازیکنان را انتخاب کنید.", "error");
    return;
  }

  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "/");
  const time = now.toTimeString().slice(0, 5);

  const winner =
    scoreA > scoreB ? "تیم A" :
    scoreB > scoreA ? "تیم B" :
    "مساوی";

  saveFinishedGame({
    date,
    time,
    place,
    teamA: { players: teamAPlayers, score: scoreA },
    teamB: { players: teamBPlayers, score: scoreB },
    winner
  });

  showNotification("بازی با موفقیت ثبت شد.", "success");

  document.getElementById("scoreA").value = "";
  document.getElementById("scoreB").value = "";
}

window.saveGame = saveGame;

// ===============================
// OVERLAY CLICK CLOSE
// ===============================
document.getElementById("overlay").addEventListener("click", () => {
  closePlayerSheet();
  closePlaceSheet();
});

// ===============================
// INIT
// ===============================
window.addEventListener("load", () => {
  initUITexts();
  updateSyncStatus();
  renderHistory(getLocalHistory());

  if (navigator.onLine) {
    processSyncQueue();
    fetchRemoteHistory();
  }
});

function initUITexts() {
  const titleEl = document.getElementById("app-title");
  const subtitleEl = document.getElementById("app-subtitle");

  if (titleEl) titleEl.textContent = "🃏 " + UI_TEXT.app.title;
  if (subtitleEl) subtitleEl.textContent = UI_TEXT.app.subtitle;
}
