const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const MAX_LINKS = 8;
const BUTTONS_PER_ROW = 5;

const data = new SlashCommandBuilder()
  .setName('link')
  .setDescription('Post one or more clickable link buttons');

for (let i = 1; i <= MAX_LINKS; i++) {
  data
    .addStringOption(o => o.setName(`url${i}`).setDescription(`Link ${i} URL`).setRequired(i === 1))
    .addStringOption(o => o.setName(`label${i}`).setDescription(`Link ${i} button text`).setMaxLength(80));
}

async function handleLink(interaction) {
  const buttons = [];

  for (let i = 1; i <= MAX_LINKS; i++) {
    const url = interaction.options.getString(`url${i}`);
    if (!url) continue;

    if (!/^https?:\/\//i.test(url)) {
      return interaction.reply({ content: `Link ${i} must start with http:// or https://`, ephemeral: true });
    }

    const label = interaction.options.getString(`label${i}`) ?? `Open Link ${i}`;
    buttons.push(new ButtonBuilder().setLabel(label).setStyle(ButtonStyle.Link).setURL(url));
  }

  // Discord allows max 5 buttons per row — split into multiple rows if needed
  const rows = [];
  for (let i = 0; i < buttons.length; i += BUTTONS_PER_ROW) {
    rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + BUTTONS_PER_ROW)));
  }

  // Reply privately, then post the actual buttons as a plain channel message
  // so Discord doesn't attach the "X used /link" header to it.
  await interaction.reply({ content: 'Posted.', ephemeral: true });
  return interaction.channel.send({ components: rows });
}

module.exports = { data, handleLink };
