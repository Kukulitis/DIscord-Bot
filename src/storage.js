const { loadJSON, saveJSON } = require('./jsonStore');

const FILE = 'items.json';

function load() { return loadJSON(FILE, []); }
function save(data) { saveJSON(FILE, data); }

// ── player-level helpers ──────────────────────────────────────────────────────

function getPlayer(userId) {
  return load().find(p => p.userId === userId) ?? null;
}

function ensurePlayer(userId) {
  const data   = load();
  let   player = data.find(p => p.userId === userId);
  if (!player) {
    player = { userId, messageId: null, items: [] };
    data.push(player);
    save(data);
  }
  return player;
}

function setMessageId(userId, messageId) {
  const data = load();
  const idx  = data.findIndex(p => p.userId === userId);
  if (idx === -1) return;
  data[idx].messageId = messageId;
  save(data);
}

// ── item-level helpers ────────────────────────────────────────────────────────

function findItem(userId, name) {
  const player = getPlayer(userId);
  if (!player) return null;
  return player.items.find(i => i.name.toLowerCase() === name.toLowerCase()) ?? null;
}

function addItem(userId, item) {
  const data = load();
  let   idx  = data.findIndex(p => p.userId === userId);
  if (idx === -1) {
    data.push({ userId, messageId: null, items: [item] });
    idx = data.length - 1;
  } else {
    data[idx].items.push(item);
  }
  save(data);
  return data[idx];
}

function removeItem(userId, name) {
  const data     = load();
  const playerIdx = data.findIndex(p => p.userId === userId);
  if (playerIdx === -1) return null;
  const itemIdx = data[playerIdx].items.findIndex(i => i.name.toLowerCase() === name.toLowerCase());
  if (itemIdx === -1) return null;
  data[playerIdx].items.splice(itemIdx, 1);
  save(data);
  return data[playerIdx];
}

function updateItem(userId, name, patch) {
  const data     = load();
  const playerIdx = data.findIndex(p => p.userId === userId);
  if (playerIdx === -1) return null;
  const itemIdx = data[playerIdx].items.findIndex(i => i.name.toLowerCase() === name.toLowerCase());
  if (itemIdx === -1) return null;
  data[playerIdx].items[itemIdx] = { ...data[playerIdx].items[itemIdx], ...patch };
  save(data);
  return data[playerIdx];
}

module.exports = { getPlayer, ensurePlayer, setMessageId, findItem, addItem, removeItem, updateItem };
