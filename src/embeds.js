const { EmbedBuilder } = require('discord.js');
const { STATUSES, CATEGORIES, COLORS } = require('./constants');

function statusLabel(status) {
  return STATUSES[status]?.label ?? status;
}

function categoryLabel(category) {
  return CATEGORIES[category]?.label ?? category;
}

// Build (or rebuild) a player's full item-list embed
function playerListEmbed(player, displayName) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.default)
    .setTitle(`${displayName}'s Items`)
    .setFooter({ text: `${player.items.length} item${player.items.length !== 1 ? 's' : ''}  ·  Updated ${new Date().toLocaleString()}` });

  if (player.items.length === 0) {
    return embed.setDescription('No items yet. Use `/item add` to add one.');
  }

  const order = ['buying', 'have', 'selling'];
  const groups = {};
  for (const s of order) groups[s] = [];
  for (const item of player.items) {
    const key = groups[item.status] ? item.status : 'have';
    groups[key].push(item);
  }

  for (const status of order) {
    const items = groups[status];
    if (items.length === 0) continue;

    const lines = items
      .map(item => `${item.name}  ·  ${categoryLabel(item.category)}`)
      .join('\n');

    embed.addFields({
      name:  statusLabel(status),
      value: lines.slice(0, 1024),
    });
  }

  return embed;
}

module.exports = { playerListEmbed, statusLabel, categoryLabel };
