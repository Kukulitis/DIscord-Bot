const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const listings  = require('../listings');
const storage   = require('../storage');
const { CURRENCIES, CURRENCY_CHOICES } = require('../constants');
const { refreshPlayerMessage } = require('../playerMessage');

const BUYING_CHANNEL  = '1510366122464116776';
const SELLING_CHANNEL = '1510366148057759974';

// ── helpers ───────────────────────────────────────────────────────────────────

function priceStr(amount, currency) {
  const c = CURRENCIES[currency];
  return c ? `${amount} ${c.label}` : `${amount} ${currency}`;
}

function buildEmbed(listing) {
  const isBuy  = listing.type === 'buy';
  const status = listing.status ?? 'active';

  const color =
    status === 'sold'      ? 0x2ecc71 :
    status === 'cancelled' ? 0x95a5a6 :
    isBuy                  ? 0x3498db : 0xf39c12;

  const typeTag   = isBuy ? 'Buying' : 'Selling';
  const statusTag = status === 'sold' ? ' — Sold' : status === 'cancelled' ? ' — Cancelled' : '';
  const title     = `${listing.name}${statusTag}`;

  const priceLabel = isBuy ? 'Budget' : 'Price';
  const posterLabel = isBuy ? 'From' : 'Posted by';
  const posterValue = listing.posterName ?? `<@${listing.userId}>`;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: typeTag })
    .setTitle(title)
    .addFields(
      { name: priceLabel,   value: priceStr(listing.amount, listing.currency), inline: true },
      { name: posterLabel,  value: posterValue,                                inline: true },
    )
    .setFooter({ text: `ID: ${listing.id}` })
    .setTimestamp(new Date(listing.createdAt));

  if (listing.description) {
    embed.setDescription(listing.description);
  }

  // ── offers ────────────────────────────────────────────────────────────────
  const offers = listing.offers ?? [];
  if (offers.length > 0) {
    const MAX_DISPLAY = 10;
    const shown = offers.slice(-MAX_DISPLAY);
    const lines = shown.map(o => {
      const line = `${o.name ?? 'Unknown'} — ${priceStr(o.amount, o.currency)}`;
      return o.note ? `${line}\n"${o.note}"` : line;
    }).join('\n');

    const extra = offers.length > MAX_DISPLAY
      ? `\n+${offers.length - MAX_DISPLAY} more`
      : '';

    embed.addFields({ name: `Offers (${offers.length})`, value: lines + extra });
  }

  return embed;
}

function buildButtons(listingId, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`market:cancel:${listingId}`)
      .setLabel('Cancel')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`market:sold:${listingId}`)
      .setLabel('Sold')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`market:offer:${listingId}`)
      .setLabel('Add Offer')
      .setEmoji('💬')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled),
  );
}

// Fetch the listing's channel + message and edit it in-place
async function refreshMessage(client, listing) {
  const channel = await client.channels.fetch(listing.channelId).catch(() => null);
  if (!channel) return;
  const msg = await channel.messages.fetch(listing.messageId).catch(() => null);
  if (!msg) return;
  const disabled = listing.status !== 'active';
  await msg.edit({
    embeds:     [buildEmbed(listing)],
    components: [buildButtons(listing.id, disabled)],
  });
}

// ── /buy and /sell ────────────────────────────────────────────────────────────

async function postListing(interaction, type) {
  const name        = interaction.options.getString('name');
  const displayName = interaction.member?.displayName ?? interaction.user.globalName ?? interaction.user.username;
  const posterName  = type === 'buy' ? displayName : null;
  const description = interaction.options.getString('description');
  const amount      = interaction.options.getInteger('amount');
  const currency    = interaction.options.getString('currency');

  const channelId = type === 'buy' ? BUYING_CHANNEL : SELLING_CHANNEL;

  // Verify the bot can reach the channel before replying
  const channel = await interaction.client.channels.fetch(channelId).catch(() => null);
  if (!channel) {
    return interaction.reply({
      content: 'Could not find the target channel. Make sure the bot has access to it.',
      ephemeral: true,
    });
  }

  const me = interaction.guild?.members?.me;
  if (me) {
    const perms = channel.permissionsFor(me);
    if (!perms?.has('SendMessages') || !perms?.has('EmbedLinks')) {
      return interaction.reply({
        content: 'The bot is missing Send Messages or Embed Links permission in that channel.',
        ephemeral: true,
      });
    }
  }

  await interaction.reply({ content: 'Posted.', ephemeral: true });

  const now         = new Date().toISOString();
  const itemStatus  = type === 'buy' ? 'buying' : 'selling';
  const id          = listings.addListing({
    type, userId: interaction.user.id,
    channelId, messageId: null,
    name, posterName, description, amount, currency,
    status: 'active', createdAt: now,
  });

  // ── sync to personal item list ────────────────────────────────────────────
  const userId = interaction.user.id;
  if (storage.findItem(userId, name)) {
    storage.updateItem(userId, name, { status: itemStatus, updatedAt: now });
  } else {
    storage.addItem(userId, { name, category: 'other', status: itemStatus, createdAt: now, updatedAt: now });
  }
  await refreshPlayerMessage(interaction.client, userId, displayName);

  const listing = listings.getListing(id);

  try {
    const msg = await channel.send({
      embeds:     [buildEmbed(listing)],
      components: [buildButtons(id)],
    });
    listings.updateListing(id, { messageId: msg.id });
  } catch (err) {
    console.error('[postListing] channel.send failed:', err);
    await interaction.followUp({
      content: `Failed to post: ${err.message}`,
      ephemeral: true,
    });
  }
}

// ── button handler ────────────────────────────────────────────────────────────

async function handleButton(interaction) {
  const [, action, listingId] = interaction.customId.split(':');
  const listing = listings.getListing(listingId);

  if (!listing) {
    return interaction.reply({ content: 'This listing no longer exists.', ephemeral: true });
  }
  if (listing.status !== 'active') {
    return interaction.reply({ content: `This listing is already ${listing.status}.`, ephemeral: true });
  }

  // ── Add Offer — open modal ────────────────────────────────────────────────
  if (action === 'offer') {
    const modal = new ModalBuilder()
      .setCustomId(`market:offermodal:${listingId}`)
      .setTitle(`Offer on: ${listing.name}`);

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('offer_name')
          .setLabel('Who is offering?')
          .setPlaceholder('e.g. Steve')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(32),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('offer_amount')
          .setLabel('Offered amount (number)')
          .setPlaceholder('e.g. 45')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(10),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('offer_currency')
          .setLabel('Currency  (coins  or  money)')
          .setPlaceholder('coins')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(10),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('offer_note')
          .setLabel('Note (optional)')
          .setPlaceholder('e.g. Can deliver right now')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setMaxLength(200),
      ),
    );
    return interaction.showModal(modal);
  }

  // ── Cancel / Sold — poster only ───────────────────────────────────────────
  if (interaction.user.id !== listing.userId) {
    return interaction.reply({
      content: 'Only the person who posted this listing can do that.',
      ephemeral: true,
    });
  }

  const newStatus   = action === 'cancel' ? 'cancelled' : 'sold';
  const updated     = listings.updateListing(listingId, { status: newStatus });
  const displayName = interaction.member?.displayName ?? interaction.user.globalName ?? interaction.user.username;

  await refreshMessage(interaction.client, updated);

  // ── remove from personal item list ────────────────────────────────────────
  storage.removeItem(listing.userId, listing.name);
  await refreshPlayerMessage(interaction.client, listing.userId, displayName);

  const reply = newStatus === 'sold'
    ? `${listing.name} marked as sold.`
    : `${listing.name} cancelled.`;

  return interaction.reply({ content: reply, ephemeral: true });
}

// ── modal submit handler ──────────────────────────────────────────────────────

async function handleModal(interaction) {
  const [, , listingId] = interaction.customId.split(':');
  const listing = listings.getListing(listingId);

  if (!listing) {
    return interaction.reply({ content: 'This listing no longer exists.', ephemeral: true });
  }
  if (listing.status !== 'active') {
    return interaction.reply({
      content: `This listing is already ${listing.status}.`,
      ephemeral: true,
    });
  }

  const offererName = interaction.fields.getTextInputValue('offer_name').trim();
  const rawAmount   = interaction.fields.getTextInputValue('offer_amount').trim();
  const rawCurrency = interaction.fields.getTextInputValue('offer_currency').trim().toLowerCase();
  const note        = interaction.fields.getTextInputValue('offer_note').trim();

  if (!offererName) {
    return interaction.reply({ content: 'Please enter a name.', ephemeral: true });
  }
  const amount = parseInt(rawAmount, 10);
  if (isNaN(amount) || amount < 1) {
    return interaction.reply({ content: 'Amount must be a positive number.', ephemeral: true });
  }
  if (!CURRENCIES[rawCurrency]) {
    return interaction.reply({ content: 'Currency must be coins or money.', ephemeral: true });
  }

  // Add offer to listing and edit the original message
  const updated = listings.addOffer(listingId, {
    name:      offererName,
    userId:    interaction.user.id,
    amount,
    currency:  rawCurrency,
    note:      note || null,
    createdAt: new Date().toISOString(),
  });

  await refreshMessage(interaction.client, updated);

  // DM the poster so they're notified without cluttering the channel
  try {
    const poster = await interaction.client.users.fetch(listing.userId);
    const dmLines = [
      `💬 **New offer on your listing: ${listing.name}**`,
      `From: **${offererName}**`,
      `Offer: **${priceStr(amount, rawCurrency)}**`,
    ];
    if (note) dmLines.push(`Note: *"${note}"*`);
    await poster.send(dmLines.join('\n'));
  } catch {
    // User has DMs disabled — silently skip
  }

  return interaction.reply({
    content: `Offer of ${priceStr(amount, rawCurrency)} added.`,
    ephemeral: true,
  });
}

// ── command definitions ───────────────────────────────────────────────────────

const buyData = new SlashCommandBuilder()
  .setName('buy')
  .setDescription('Post a buying request to the buying channel')
  .addStringOption(o => o.setName('name').setDescription('Item you are looking for').setRequired(true))
  .addStringOption(o => o.setName('description').setDescription('Describe what you need').setRequired(true))
  .addIntegerOption(o => o.setName('amount').setDescription('How much you are willing to pay').setRequired(true).setMinValue(1))
  .addStringOption(o => o.setName('currency').setDescription('Currency type').setRequired(true).addChoices(...CURRENCY_CHOICES));

const sellData = new SlashCommandBuilder()
  .setName('sell')
  .setDescription('Post a selling offer to the selling channel')
  .addStringOption(o => o.setName('name').setDescription('Item you are selling').setRequired(true))
  .addStringOption(o => o.setName('description').setDescription('Describe what you are selling').setRequired(true))
  .addIntegerOption(o => o.setName('amount').setDescription('Your asking price').setRequired(true).setMinValue(1))
  .addStringOption(o => o.setName('currency').setDescription('Currency type').setRequired(true).addChoices(...CURRENCY_CHOICES));

module.exports = { buyData, sellData, postListing, handleButton, handleModal };
