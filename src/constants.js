const STATUSES = {
  buying:  { label: 'Buying',  emoji: '🔵' },
  have:    { label: 'Have',    emoji: '🟢' },
  selling: { label: 'Selling', emoji: '🟡' },
};

const STATUS_CHOICES = Object.entries(STATUSES).map(([value, { label, emoji }]) => ({
  name: `${emoji} ${label}`,
  value,
}));

const CATEGORIES = {
  armor:    { label: 'Armor',    emoji: '🛡️' },
  tool:     { label: 'Tool',     emoji: '⛏️' },
  weapon:   { label: 'Weapon',   emoji: '⚔️' },
  cosmetic: { label: 'Cosmetic', emoji: '✨' },
  other:    { label: 'Other',    emoji: '📦' },
};

const CATEGORY_CHOICES = Object.entries(CATEGORIES).map(([value, { label, emoji }]) => ({
  name: `${emoji} ${label}`,
  value,
}));

const CURRENCIES = {
  coins: { label: 'Coins', emoji: '🪙' },
  money: { label: 'Money', emoji: '💵' },
};

const CURRENCY_CHOICES = Object.entries(CURRENCIES).map(([value, { label, emoji }]) => ({
  name: `${emoji} ${label}`,
  value,
}));

// Channel where perk-ready pings are posted
const PERK_COOLDOWN_CHANNEL_ID = '1518708280686543019';

const PERK_COOLDOWNS = {
  weekly:  7  * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};

const ITEMS_PER_PAGE = 8;

const COLORS = {
  buying:  0x3498db,
  have:    0x2ecc71,
  selling: 0xf1c40f,
  default: 0x9b59b6,
};

module.exports = {
  STATUSES, STATUS_CHOICES,
  CATEGORIES, CATEGORY_CHOICES,
  CURRENCIES, CURRENCY_CHOICES,
  ITEMS_PER_PAGE, COLORS,
  PERK_COOLDOWN_CHANNEL_ID, PERK_COOLDOWNS,
};
