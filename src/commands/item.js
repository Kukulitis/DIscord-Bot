const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const storage = require('../storage');
const { STATUS_CHOICES, STATUSES, CATEGORY_CHOICES, CATEGORIES } = require('../constants');
const { refreshPlayerMessage } = require('../playerMessage');

function getDisplayName(interaction) {
  return interaction.member?.displayName ?? interaction.user.globalName ?? interaction.user.username;
}

// ── /item add ─────────────────────────────────────────────────────────────────

async function handleAdd(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const name     = interaction.options.getString('name');
    const category = interaction.options.getString('category');
    const status   = interaction.options.getString('status');
    const userId   = interaction.user.id;

    if (storage.findItem(userId, name)) {
      return interaction.editReply(`You already have an item called ${name}. Use /item edit to change it.`);
    }

    const now = new Date().toISOString();
    storage.addItem(userId, { name, category, status, createdAt: now, updatedAt: now });

    await refreshPlayerMessage(interaction.client, userId, getDisplayName(interaction));

    return interaction.editReply(`${name} added.`);
  } catch (err) {
    console.error('[item add] error:', err);
    return interaction.editReply('Something went wrong adding that item.').catch(() => {});
  }
}

// ── /item remove ──────────────────────────────────────────────────────────────

async function handleRemove(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const name   = interaction.options.getString('name');
    const userId = interaction.user.id;

    const updated = storage.removeItem(userId, name);
    if (!updated) {
      return interaction.editReply(`You don't have an item called ${name}.`);
    }

    await refreshPlayerMessage(interaction.client, userId, getDisplayName(interaction));

    return interaction.editReply(`${name} removed.`);
  } catch (err) {
    console.error('[item remove] error:', err);
    return interaction.editReply('Something went wrong removing that item.').catch(() => {});
  }
}

// ── /item edit ────────────────────────────────────────────────────────────────

async function handleEdit(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const name   = interaction.options.getString('name');
    const field  = interaction.options.getString('field');
    const value  = interaction.options.getString('value');
    const userId = interaction.user.id;

    if (!storage.findItem(userId, name)) {
      return interaction.editReply(`You don't have an item called ${name}.`);
    }

    let patch = { updatedAt: new Date().toISOString() };

    switch (field) {
      case 'name':
        if (storage.findItem(userId, value)) {
          return interaction.editReply(`You already have an item called ${value}.`);
        }
        patch.name = value;
        break;

      case 'category':
        if (!CATEGORIES[value]) {
          return interaction.editReply(`Invalid category. Choose from: ${Object.keys(CATEGORIES).join(', ')}`);
        }
        patch.category = value;
        break;

      case 'status':
        if (!STATUSES[value]) {
          return interaction.editReply(`Invalid status. Choose from: ${Object.keys(STATUSES).join(', ')}`);
        }
        patch.status = value;
        break;

      default:
        return interaction.editReply(`Unknown field: ${field}`);
    }

    storage.updateItem(userId, name, patch);
    await refreshPlayerMessage(interaction.client, userId, getDisplayName(interaction));

    return interaction.editReply(`${name} updated.`);
  } catch (err) {
    console.error('[item edit] error:', err);
    return interaction.editReply('Something went wrong updating that item.').catch(() => {});
  }
}

// ── autocomplete — only the caller's own items ────────────────────────────────

async function handleAutocomplete(interaction) {
  try {
    const focused = interaction.options.getFocused().toLowerCase();
    const player  = storage.getPlayer(interaction.user.id);
    if (!player) return interaction.respond([]);

    const matches = player.items
      .filter(i => i.name.toLowerCase().includes(focused))
      .slice(0, 25)
      .map(i => ({ name: i.name, value: i.name }));

    return interaction.respond(matches);
  } catch (err) {
    console.error('[item autocomplete] error:', err);
    return interaction.respond([]).catch(() => {});
  }
}

// ── command definition ────────────────────────────────────────────────────────

const FIELD_CHOICES = [
  { name: 'Name',     value: 'name'     },
  { name: 'Category', value: 'category' },
  { name: 'Status',   value: 'status'   },
];

const data = new SlashCommandBuilder()
  .setName('item')
  .setDescription('Manage your personal item list')

  .addSubcommand(sub => sub
    .setName('add')
    .setDescription('Add an item to your list')
    .addStringOption(o => o.setName('name').setDescription('Item name').setRequired(true))
    .addStringOption(o => o.setName('category').setDescription('Item category').setRequired(true).addChoices(...CATEGORY_CHOICES))
    .addStringOption(o => o.setName('status').setDescription('Current status').setRequired(true).addChoices(...STATUS_CHOICES))
  )

  .addSubcommand(sub => sub
    .setName('remove')
    .setDescription('Remove an item from your list')
    .addStringOption(o => o.setName('name').setDescription('Item name').setRequired(true).setAutocomplete(true))
  )

  .addSubcommand(sub => sub
    .setName('edit')
    .setDescription('Edit one of your items')
    .addStringOption(o => o.setName('name').setDescription('Item name').setRequired(true).setAutocomplete(true))
    .addStringOption(o => o.setName('field').setDescription('Field to change').setRequired(true).addChoices(...FIELD_CHOICES))
    .addStringOption(o => o.setName('value').setDescription('New value  (for limited: yes / no)').setRequired(true))
  );

module.exports = { data, handleAdd, handleRemove, handleEdit, handleAutocomplete };
