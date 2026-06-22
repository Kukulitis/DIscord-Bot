const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const perks = require('../perks');
const { PERK_COOLDOWN_CHANNEL_ID } = require('../constants');

const data = new SlashCommandBuilder()
  .setName('claim')
  .setDescription('Claim a recurring perk')
  .addSubcommand(sub => sub.setName('weekly').setDescription('Claim your weekly perk'))
  .addSubcommand(sub => sub.setName('monthly').setDescription('Claim your monthly perk'));

// Shown under "still on cooldown" replies
function cooldownRow(userId, type) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`perk:edit:${userId}:${type}`).setLabel('Edit time left').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`perk:turnoff:${userId}:${type}`).setLabel('Turn off timer').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`perk:cancel:${userId}:${type}`).setLabel('Cancel').setStyle(ButtonStyle.Secondary),
  );
}

// Shown on the "perk ready" ping in the cooldown channel
function readyRow(userId, type) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`perk:restart:${userId}:${type}`).setLabel('Restart timer').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`perk:turnoff:${userId}:${type}`).setLabel('Turn off timer').setStyle(ButtonStyle.Danger),
  );
}

async function handleClaim(interaction) {
  const type   = interaction.options.getSubcommand(); // 'weekly' or 'monthly'
  const userId = interaction.user.id;
  const result = perks.claim(userId, type);

  if (!result.ok) {
    return interaction.reply({
      content: `You can claim your ${type} perk in ${perks.formatDuration(result.msLeft)}.`,
      components: [cooldownRow(userId, type)],
      ephemeral: true,
    });
  }

  return interaction.reply({
    content: `Your ${type} perk has been claimed. You'll be pinged in <#${PERK_COOLDOWN_CHANNEL_ID}> when it's ready again.`,
    ephemeral: true,
  });
}

async function handleButton(interaction) {
  const [, action, userId, type] = interaction.customId.split(':');

  if (interaction.user.id !== userId) {
    return interaction.reply({ content: 'Only the owner of this timer can do that.', ephemeral: true });
  }

  if (action === 'cancel') {
    return interaction.update({ content: 'Cancelled.', components: [] });
  }

  if (action === 'turnoff') {
    perks.turnOff(userId, type);
    return interaction.update({ content: `Your ${type} timer has been turned off.`, components: [] });
  }

  if (action === 'restart') {
    const result = perks.claim(userId, type);
    if (!result.ok) {
      return interaction.update({
        content: `You can claim your ${type} perk in ${perks.formatDuration(result.msLeft)}.`,
        components: [],
      });
    }
    return interaction.update({ content: `Your ${type} timer has been restarted.`, components: [] });
  }

  if (action === 'edit') {
    const modal = new ModalBuilder()
      .setCustomId(`perk:editmodal:${userId}:${type}`)
      .setTitle(`Edit ${type} timer`);

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('edit_days')
          .setLabel('Days left')
          .setPlaceholder('e.g. 3')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(4),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('edit_hours')
          .setLabel('Hours left')
          .setPlaceholder('e.g. 4')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(3),
      ),
    );

    return interaction.showModal(modal);
  }
}

async function handleModal(interaction) {
  const [, , userId, type] = interaction.customId.split(':');

  if (interaction.user.id !== userId) {
    return interaction.reply({ content: 'Only the owner of this timer can do that.', ephemeral: true });
  }

  const rawDays  = interaction.fields.getTextInputValue('edit_days').trim();
  const rawHours = interaction.fields.getTextInputValue('edit_hours').trim();
  const days     = rawDays  ? parseInt(rawDays, 10)  : 0;
  const hours    = rawHours ? parseInt(rawHours, 10) : 0;

  if (isNaN(days) || isNaN(hours) || days < 0 || hours < 0) {
    return interaction.reply({ content: 'Days and hours must be 0 or positive numbers.', ephemeral: true });
  }

  const msLeft = (days * 24 * 60 * 60 * 1000) + (hours * 60 * 60 * 1000);
  perks.setTimeLeft(userId, type, msLeft);

  return interaction.reply({
    content: msLeft > 0
      ? `Your ${type} timer now has ${perks.formatDuration(msLeft)} left.`
      : `Your ${type} timer has been set to 0 — you can claim it again now.`,
    ephemeral: true,
  });
}

module.exports = { data, handleClaim, handleButton, handleModal, readyRow };
