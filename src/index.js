require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const itemCmd   = require('./commands/item');
const marketCmd = require('./commands/market');

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

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
    ],
  });
  console.log('Slash commands registered.');
}

// ── client ────────────────────────────────────────────────────────────────────

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  await registerCommands();
  console.log(`Logged in as ${client.user.tag}`);
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
      return;
    }

    // ── buttons ───────────────────────────────────────────────────────────────
    if (interaction.isButton()) {
      if (interaction.customId.startsWith('market:')) {
        return await marketCmd.handleButton(interaction);
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

  } catch (err) {
    console.error('Interaction error:', err);
    const msg = { content: 'Something went wrong.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(msg).catch(() => {});
    } else {
      await interaction.reply(msg).catch(() => {});
    }
  }
});

client.login(DISCORD_TOKEN);
