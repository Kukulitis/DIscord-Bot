require('dotenv').config();
const http = require('http');
const { Client, GatewayIntentBits, REST, Routes, MessageFlags } = require('discord.js');

// Minimal HTTP server — keeps Render happy by holding an open port
http.createServer((_, res) => res.writeHead(200).end()).listen(process.env.PORT || 3000);
const itemCmd   = require('./commands/item');
const marketCmd = require('./commands/market');
const linkCmd   = require('./commands/link');
const claimCmd  = require('./commands/claim');
const perks     = require('./perks');
const { PERK_COOLDOWN_CHANNEL_ID } = require('./constants');

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;
const PERK_CHECK_INTERVAL_MS = 5 * 60 * 1000; // check every 5 minutes

if (!DISCORD_TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error('Missing DISCORD_TOKEN, CLIENT_ID, or GUILD_ID in .env');
  process.exit(1);
}

// ── register slash commands ───────────────────────────────────────────────────

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  console.log('Registering slash commands…');
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
    body: [
      itemCmd.data.toJSON(),
      marketCmd.buyData.toJSON(),
      marketCmd.sellData.toJSON(),
      linkCmd.data.toJSON(),
      claimCmd.data.toJSON(),
    ],
  });
  console.log('Slash commands registered.');
}

// ── perk cooldown checker ─────────────────────────────────────────────────────

async function checkPerkCooldowns() {
  try {
    const expired = perks.findExpired();
    if (expired.length === 0) return;

    const channel = await client.channels.fetch(PERK_COOLDOWN_CHANNEL_ID).catch(() => null);
    if (!channel) {
      console.error('Could not reach perk cooldown channel:', PERK_COOLDOWN_CHANNEL_ID);
      return;
    }

    for (const { userId, type } of expired) {
      await channel.send({
        content: `<@${userId}> your ${type} perk is ready to claim again.`,
        components: [claimCmd.readyRow(userId, type)],
      }).catch(() => {});
    }
  } catch (err) {
    // Never let this throw — an unhandled rejection inside a bare setInterval
    // callback can crash the whole process on Node, taking the bot down.
    console.error('[checkPerkCooldowns] error:', err);
  }
}

// ── client ────────────────────────────────────────────────────────────────────

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  await registerCommands();
  console.log(`Logged in as ${client.user.tag}`);
  checkPerkCooldowns();
  setInterval(checkPerkCooldowns, PERK_CHECK_INTERVAL_MS);
});

client.on('interactionCreate', async interaction => {
  try {

    // ── autocomplete ──────────────────────────────────────────────────────────
    if (interaction.isAutocomplete()) {
      if (interaction.commandName === 'item') {
        return await itemCmd.handleAutocomplete(interaction);
      }
      return;
    }

    // ── modal submits ─────────────────────────────────────────────────────────
    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('market:offermodal:')) {
        return await marketCmd.handleModal(interaction);
      }
      if (interaction.customId.startsWith('perk:editmodal:')) {
        return await claimCmd.handleModal(interaction);
      }
      return;
    }

    // ── buttons ───────────────────────────────────────────────────────────────
    if (interaction.isButton()) {
      if (interaction.customId.startsWith('market:')) {
        return await marketCmd.handleButton(interaction);
      }
      if (interaction.customId.startsWith('perk:')) {
        return await claimCmd.handleButton(interaction);
      }
      return;
    }

    // ── slash commands ────────────────────────────────────────────────────────
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'item') {
      const sub = interaction.options.getSubcommand();
      if (sub === 'add')    return await itemCmd.handleAdd(interaction);
      if (sub === 'remove') return await itemCmd.handleRemove(interaction);
      if (sub === 'edit')   return await itemCmd.handleEdit(interaction);
    }

    if (interaction.commandName === 'buy')  return await marketCmd.postListing(interaction, 'buy');
    if (interaction.commandName === 'sell') return await marketCmd.postListing(interaction, 'sell');
    if (interaction.commandName === 'link') return await linkCmd.handleLink(interaction);
    if (interaction.commandName === 'claim') return await claimCmd.handleClaim(interaction);

  } catch (err) {
    console.error('Interaction error:', err);
    const msg = { content: 'Something went wrong.', flags: MessageFlags.Ephemeral };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(msg).catch(() => {});
    } else {
      await interaction.reply(msg).catch(() => {});
    }
  }
});

client.login(DISCORD_TOKEN);
