# 🔥 English Streak

A **Duolingo-style Discord bot** for learning **technical English** for software
development. Users answer **5 daily questions**, earn points, keep a daily
**streak**, climb a **global leaderboard**, and automatically receive **🔥 milestone roles**.

Built to be **privileged-intent free** (no `MESSAGE_CONTENT`, no `PRESENCE`, no
continuous member monitoring) so it scales past Discord's verification gate
without complex justifications.

---

## ✨ Features

- **`/daily`** — 5 questions per day, the same for everyone, answerable **once per day**.
- **Private answers** — everything happens through **ephemeral** messages, buttons and modals. No one ever sees your answers.
- **Points** — 20 points per correct answer (max **100/day**).
- **Streaks** — consecutive days build a 🔥 streak; miss a day and it resets.
- **Automatic milestone roles** — at 10, 20, 30, 60, 100, 300, 600 and 1000 days. The bot **creates the roles itself** (orange), no hard-coded IDs.
- **Global Top 5 ranking** — by command and auto-updated in a dedicated channel.
- **~1000 technical-English questions** (multiple choice + text input), generated from maintainable datasets.
- **Lenient text answers** — case, extra spaces, trailing punctuation and accents are ignored.
- **Daily cron job** — rotates the questions at midnight and refreshes the ranking.

---

## 🧱 Tech stack

Node.js · TypeScript · discord.js v14 · PostgreSQL · Prisma ORM · node-cron · Docker · Docker Compose

---

## 📁 Project structure

```
src/
├── commands/      # Slash commands (/daily, /profile, /ranking, /help)
├── config/        # Env validation + gateway intents
├── constants/     # Channels, game rules, custom ids
├── data/          # questions.json + generator datasets
├── database/      # Prisma client lifecycle
├── events/        # ready + interactionCreate routers/handlers
├── interfaces/    # Shared contracts (Command, Event, Question)
├── jobs/          # node-cron daily rollover
├── loaders/       # Command registration + event wiring
├── middlewares/   # Interaction error boundary
├── repositories/  # Data-access layer (Prisma queries)
├── services/      # Business logic (daily, user, streak, role, ranking, question)
├── types/         # Internal types (sessions)
├── utils/         # Logger, normalization, dates, renderers
├── validators/    # Answer validation
└── index.ts       # Bootstrap
prisma/            # schema.prisma + seed.ts
scripts/           # generate-questions.ts, deploy-commands.ts, copy-data.js
```

---

## 🚀 Quick start (Docker — recommended)

This is the easiest path, both locally and on a VPS.

```bash
# 1. Clone and enter the project
git clone <your-repo-url> english-streak
cd english-streak

# 2. Create your .env from the template and fill it in
cp .env.example .env
nano .env

# 3. Build and start everything (bot + PostgreSQL)
docker compose up -d --build

# 4. Follow the logs
docker compose logs -f bot
```

On first boot the bot will:
1. apply the database schema,
2. register slash commands,
3. ensure today's questions exist,
4. create the milestone roles (where it has permission),
5. publish the initial ranking.

> The container entrypoint runs `prisma migrate deploy` if you have committed
> migrations, otherwise `prisma db push` to sync the schema automatically.

---

## ⚙️ Configuration — environment variables

Copy `.env.example` to `.env`. **You can paste the same file straight onto the VPS.**

| Variable | Required | Description |
| --- | --- | --- |
| `DISCORD_TOKEN` | ✅ | Bot token (Developer Portal → Bot → Token). The Client ID is auto-detected from it. |
| `CHANNEL_DAILY_QUESTIONS` | — | Channel ID for the "new challenge" announcement. |
| `CHANNEL_RANKING` | — | Channel ID where the live Top 5 is posted. |
| `POSTGRES_USER` | ✅ | Database user. |
| `POSTGRES_PASSWORD` | ✅ | Database password. |
| `POSTGRES_DB` | ✅ | Database name. |
| `POSTGRES_HOST` | — | `postgres` in Docker, `localhost` for local DB (default `localhost`). |
| `POSTGRES_PORT` | — | Database port (default `5432`). |
| `DATABASE_URL` | — | Full Prisma connection string. **Optional** — auto-assembled from the `POSTGRES_*` vars if omitted; set it only to override (or for local Prisma CLI commands). |
| `TZ` | — | Timezone for the cron job (e.g. `America/Sao_Paulo`). |
| `DAILY_CRON` | — | Cron expression for the daily reset (default `0 0 * * *`). |
| `LOG_LEVEL` | — | `debug` \| `info` \| `warn` \| `error`. |

### Discord bot setup

1. Go to <https://discord.com/developers/applications> → **New Application**.
2. **Bot** → **Reset Token** → copy into `DISCORD_TOKEN`.
3. **Installation / OAuth2 → URL Generator**: scopes `bot` + `applications.commands`.
   Permissions: **Manage Roles**, **Send Messages**, **Embed Links**, **Use Slash Commands**.
4. Invite the bot. **Important:** drag the bot's role **above** the milestone
   roles in *Server Settings → Roles* so it can assign them.

> ✅ No privileged intents need to be enabled in the Developer Portal.

### Replacing the channel IDs

Set them in `.env` (`CHANNEL_DAILY_QUESTIONS`, `CHANNEL_RANKING`) **or** edit
`src/constants/channels.ts`. To copy an ID, enable *Developer Mode* in Discord,
right-click a channel → **Copy Channel ID**.

---

## 🗄️ Prisma & migrations

The schema lives in `prisma/schema.prisma` (models: `User`, `DailyQuestion`,
`UserAnswer`).

```bash
# Generate the Prisma client
npm run prisma:generate

# Create + apply a migration during development
npm run prisma:migrate:dev -- --name init

# Apply existing migrations in production
npm run prisma:migrate

# Open Prisma Studio (DB GUI)
npm run prisma:studio
```

Inside Docker the schema is applied automatically by the entrypoint. To create a
**versioned migration** (recommended before going live), run once locally
against your database:

```bash
npx prisma migrate dev --name init
```

and commit the generated `prisma/migrations/` folder.

---

## 🧩 The question bank

- ~1000 questions live in `src/data/questions.json`.
- They are **generated**, not hand-written, from small datasets in
  `src/data/generators/` (acronyms, vocabulary, grammar, translations, etc.).

To expand or regenerate the bank:

```bash
# 1. Edit any file under src/data/generators/
# 2. Regenerate questions.json (deterministic)
npm run generate:questions
```

Question formats:

```jsonc
{ "id": 1, "type": "multiple_choice",
  "question": "What does API stand for?",
  "options": ["Application Programming Interface", "..."],
  "answer": "Application Programming Interface" }

{ "id": 501, "type": "text_input",
  "question": "Translate to English: Eu trabalho com banco de dados.",
  "answer": "I work with databases.",
  "acceptedAnswers": ["I work with database."] }
```

Text answers are normalized before comparison (case-insensitive, trims spaces,
ignores trailing punctuation and accents).

---

## 💻 Local development (without Docker)

Requires **Node.js 20+** and a running **PostgreSQL**.

```bash
npm install
cp .env.example .env          # set your local POSTGRES_* (host = localhost) and,
                              # for the Prisma CLI, uncomment DATABASE_URL

npm run prisma:generate
npm run prisma:migrate:dev -- --name init
npm run generate:questions    # (already shipped, run to refresh)
npm run db:seed               # optional: sets today's questions

# Register slash commands
# (optional: export DISCORD_GUILD_ID=<server id> for instant guild-scoped updates)
npm run deploy:commands

# Run in watch mode
npm run dev
```

Build & run the compiled output:

```bash
npm run build
npm start
```

---

## 🖥️ Deploying on a VPS (Linux)

```bash
# 1. Install Docker + Compose plugin (Debian/Ubuntu)
curl -fsSL https://get.docker.com | sh

# 2. Get the code
git clone <your-repo-url> english-streak && cd english-streak

# 3. Configure (paste your .env)
cp .env.example .env && nano .env

# 4. Launch
docker compose up -d --build

# 5. Verify
docker compose ps
docker compose logs -f bot
```

The bot and database are isolated on a private Docker network. PostgreSQL is only
published on `127.0.0.1:5432` (edit/remove that in `docker-compose.yml` to keep
it fully internal).

### Updating to a new version

```bash
cd english-streak
git pull
docker compose up -d --build      # rebuilds the bot image
docker compose logs -f bot
```

Slash commands re-register automatically on startup. Schema changes are applied
by the entrypoint (or run `docker compose run --rm bot npx prisma migrate deploy`).

---

## 💾 PostgreSQL backup & restore

**Backup** (creates a timestamped dump on the host):

```bash
docker compose exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup_$(date +%F).sql
```

**Restore**:

```bash
cat backup_2026-06-21.sql | docker compose exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

**Automated daily backup** (host crontab example):

```cron
0 3 * * * cd /opt/english-streak && docker compose exec -T postgres pg_dump -U english_streak english_streak | gzip > /opt/backups/es_$(date +\%F).sql.gz
```

The Postgres data also persists in the named volume `postgres_data` across
restarts and rebuilds.

---

## 🔒 Privacy & intents

- **No `MESSAGE_CONTENT`**, **no `PRESENCE`**, **no continuous `GUILD_MEMBERS`** monitoring.
- Only the base `Guilds` intent is used (see `src/config/intents.ts`).
- Role assignment uses the member object that already comes inside each interaction.
- Stored data is limited to: Discord user ID, username, points, game stats,
  streak and the bot's own answer history. **No messages, presence or
  conversation content are ever stored.**

---

## 🧰 Available scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Run with hot reload (ts-node-dev). |
| `npm run build` | Compile TypeScript + copy data into `dist/`. |
| `npm start` | Run the compiled bot. |
| `npm run generate:questions` | Regenerate `questions.json` from the datasets. |
| `npm run deploy:commands` | Register slash commands with Discord. |
| `npm run db:seed` | Seed today's daily questions. |
| `npm run prisma:generate` | Generate the Prisma client. |
| `npm run prisma:migrate` | Apply migrations (production). |
| `npm run prisma:migrate:dev` | Create & apply a migration (dev). |
| `npm run prisma:studio` | Open Prisma Studio. |

---

## 📜 License

MIT.
