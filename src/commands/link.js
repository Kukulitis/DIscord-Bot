const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('link')
  .setDescription('Post a clickable link button')
  .addStringOption(o => o.setName('url').setDescription('The link URL').setRequired(true))
  .addStringOption(o => o.setName('label').setDescription('Button text').setMaxLength(80));

async function handleLink(interaction) {
  const url   = interaction.options.getString('url');
  const label = interaction.options.getString('label') ?? 'Open Link';

  if (!/^https?:\/\//i.test(url)) {
    return interaction.reply({ content: 'Link must start with http:// or https://', ephemeral: true });
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel(label).setStyle(ButtonStyle.Link).setURL(url),
  );

  return interaction.reply({ components: [row] });
}

module.exports = { data, handleLink };
