# OneBlocky Item Registry Bot

A Discord slash-command bot for managing a shared item registry across your OneBlocky SkyBlock team island.

---

## Features

| Command | What it does |
|---|---|
| `/item add` | Add a new item with name, amount, currency (Coins/Money), description, and status |
| `/item remove` | Remove an item by exact name |
| `/item edit` | Edit name, price, description, or status of an existing item |
| `/item search` | Search items by name or description |
| `/item list [page]` | Paginated list of all items with ◀ ▶ buttons |
| `/item filter <status>` | Show only Needed / Have / Selling items |

### Status tags
- 🔵 **Needed** — the team wants this item
- 🟢 **Have** — already obtained
- 🟡 **Selling** — available for trade

---

## Setup

### 1. Create a Discord application

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications) and click **New Application**.
2. Give it a name (e.g. `OneBlocky Bot`).
3. Go to **Bot** → click **Add Bot**.
4. Under **Token**, click **Reset Token** and copy it — this is your `DISCORD_TOKEN`.
5. Under **Privileged Gateway Intents**, no extra intents are needed.
6. Go to **OAuth2 → General** and copy the **Application ID** — this is your `CLIENT_ID`.

### 2. Invite the bot to your server

Go to **OAuth2 → URL Generator**:
- Scopes: `bot`, `applications.commands`
- Bot permissions: `Send Messages`, `Embed Links`, `Use Slash Commands`

Open the generated URL and invite the bot to your server.

### 3. Get your Guild ID

Enable Developer Mode in Discord (**User Settings → Advanced → Developer Mode**), then right-click your server and click **Copy Server ID** — this is your `GUILD_ID`.

### 4. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in the three values:

```
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_here
```

### 5. Install dependencies

```bash
npm install
```

---

## Running the bot

### Local / Windows (development)

```bash
npm start
```

Or with auto-restart on file changes:

```bash
npm run dev
```

### Linux VPS with PM2 (24/7 production)

Install PM2 globally once:

```bash
npm install -g pm2
```

Start the bot:

```bash
pm2 start ecosystem.config.js
```

Useful PM2 commands:

```bash
pm2 status          # see if the bot is running
pm2 logs dc-bot     # tail live logs
pm2 restart dc-bot  # restart after config changes
pm2 stop dc-bot     # stop the bot
pm2 save            # save process list so it survives reboots
pm2 startup         # generate the startup command for your OS (run the printed command as root)
```

---

## File structure

```
DC Bot/
├── src/
│   ├── index.js          # entry point, client setup, command router
│   ├── storage.js        # read/write items.json
│   ├── embeds.js         # Discord embed builders
│   ├── constants.js      # statuses, colours, page size
│   └── commands/
│       └── item.js       # all /item subcommands
├── items.json            # created automatically on first run
├── ecosystem.config.js   # PM2 config
├── package.json
├── .env                  # secrets — never commit this
└── .env.example
```

---

## Item data format (`items.json`)

```json
[
  {
    "name": "Diamond Sword",
    "amount": 3,
    "currency": "coins",
    "description": "For the boss fight on layer 50",
    "status": "needed",
    "addedBy": "123456789012345678",
    "lastEditedBy": "123456789012345678",
    "createdAt": "2026-05-30T12:00:00.000Z",
    "updatedAt": "2026-05-30T12:00:00.000Z"
  }
]
```
