const storage          = require('./storage');
const { playerListEmbed } = require('./embeds');

const ITEMS_CHANNEL = '1510372916636946462';

async function refreshPlayerMessage(client, userId, displayName) {
  const player = storage.getPlayer(userId);
  if (!player) return;

  const channel = await client.channels.fetch(ITEMS_CHANNEL).catch(() => null);
  if (!channel) return;

  const embed = playerListEmbed(player, displayName);

  if (player.messageId) {
    const existing = await channel.messages.fetch(player.messageId).catch(() => null);
    if (existing) {
      await existing.edit({ embeds: [embed] });
      return;
    }
  }

  // No message yet (or was deleted) — post a fresh one
  const msg = await channel.send({ embeds: [embed] });
  storage.setMessageId(userId, msg.id);
}

module.exports = { refreshPlayerMessage, ITEMS_CHANNEL };
