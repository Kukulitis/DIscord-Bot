const fs   = require('fs');
const path = require('path');

// Loads a JSON file from the project root, creating it with `defaultValue` if
// it doesn't exist yet. Falls back to an in-memory copy of `defaultValue`
// instead of crashing if the disk is unreadable/unwritable or the file is
// corrupted — e.g. Render's free tier wipes the filesystem on every restart.
function loadJSON(filename, defaultValue) {
  const file = path.join(__dirname, '..', filename);

  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(defaultValue, null, 2));
    }
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    console.error(`[jsonStore] Failed to load ${filename}, using empty default:`, err.message);
    return JSON.parse(JSON.stringify(defaultValue));
  }
}

function saveJSON(filename, data) {
  const file = path.join(__dirname, '..', filename);
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`[jsonStore] Failed to save ${filename}:`, err.message);
  }
}

module.exports = { loadJSON, saveJSON };
