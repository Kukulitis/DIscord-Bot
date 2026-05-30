const fs   = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'listings.json');

function load() {
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify([], null, 2));
  return JSON.parse(fs.readFileSync(FILE, 'utf8'));
}

function save(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function addListing(listing) {
  const data = load();
  const id   = genId();
  data.push({ id, offers: [], ...listing });
  save(data);
  return id;
}

function getListing(id) {
  return load().find(l => l.id === id) ?? null;
}

function updateListing(id, patch) {
  const data = load();
  const idx  = data.findIndex(l => l.id === id);
  if (idx === -1) return null;
  data[idx] = { ...data[idx], ...patch };
  save(data);
  return data[idx];
}

function addOffer(listingId, offer) {
  const data = load();
  const idx  = data.findIndex(l => l.id === listingId);
  if (idx === -1) return null;
  if (!Array.isArray(data[idx].offers)) data[idx].offers = [];
  data[idx].offers.push(offer);
  save(data);
  return data[idx];
}

module.exports = { addListing, getListing, updateListing, addOffer };
