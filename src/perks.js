const fs   = require('fs');
const path = require('path');
const { PERK_COOLDOWNS } = require('./constants');

const FILE = path.join(__dirname, '..', 'perks.json');

function load() {
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify([], null, 2));
  return JSON.parse(fs.readFileSync(FILE, 'utf8'));
}

function save(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function ensureUser(data, userId) {
  let user = data.find(u => u.userId === userId);
  if (!user) {
    user = { userId, weekly: null, monthly: null };
    data.push(user);
  }
  return user;
}

// Try to claim a perk. Returns { ok: true } on success,
// or { ok: false, msLeft } if still on cooldown.
function claim(userId, type) {
  const data  = load();
  const user  = ensureUser(data, userId);
  const entry = user[type];

  if (entry) {
    const elapsed = Date.now() - new Date(entry.claimedAt).getTime();
    const msLeft   = PERK_COOLDOWNS[type] - elapsed;
    if (msLeft > 0) {
      save(data);
      return { ok: false, msLeft };
    }
  }

  user[type] = { claimedAt: new Date().toISOString(), notified: false };
  save(data);
  return { ok: true };
}

// Find cooldowns that have just expired and haven't been notified yet.
// Marks them notified so each expiry only fires once.
function findExpired() {
  const data    = load();
  const expired = [];

  for (const user of data) {
    for (const type of Object.keys(PERK_COOLDOWNS)) {
      const entry = user[type];
      if (!entry || entry.notified) continue;

      const elapsed = Date.now() - new Date(entry.claimedAt).getTime();
      if (elapsed >= PERK_COOLDOWNS[type]) {
        entry.notified = true;
        expired.push({ userId: user.userId, type });
      }
    }
  }

  if (expired.length > 0) save(data);
  return expired;
}

function formatDuration(ms) {
  const totalMinutes = Math.max(1, Math.ceil(ms / 60000));
  const days    = Math.floor(totalMinutes / 1440);
  const hours   = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  const parts = [];
  if (days)  parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  if (hours) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (!days && minutes) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);

  return parts.join(', ');
}

// Clear a user's cooldown entirely — no further pings until they claim again
function turnOff(userId, type) {
  const data = load();
  const user = data.find(u => u.userId === userId);
  if (!user) return;
  user[type] = null;
  save(data);
}

// Rewrite a user's cooldown so exactly `msLeft` remains (clamped to the perk's full duration)
function setTimeLeft(userId, type, msLeft) {
  const data    = load();
  const user    = ensureUser(data, userId);
  const total   = PERK_COOLDOWNS[type];
  const clamped = Math.max(0, Math.min(msLeft, total));
  const elapsed = total - clamped;

  user[type] = { claimedAt: new Date(Date.now() - elapsed).toISOString(), notified: false };
  save(data);
}

module.exports = { claim, findExpired, formatDuration, turnOff, setTimeLeft };
