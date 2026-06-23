# 🔥 English Streak

Um **bot de Discord no estilo Duolingo** para aprender **inglês técnico** voltado
ao desenvolvimento de software. Os usuários respondem **5 perguntas diárias**,
ganham pontos, mantêm uma **sequência (streak)** diária, disputam um **ranking
por servidor** (além do **ranking global**) e recebem automaticamente **cargos de
marco 🔥**.

Construído para ser **livre de intents privilegiadas** (sem `MESSAGE_CONTENT`,
sem `PRESENCE`, sem monitoramento contínuo de membros), então escala além do
limite de verificação do Discord sem justificativas complexas.

---

## ✨ Funcionalidades

- **Desafio diário por botão** — no canal de perguntas há uma **mensagem fixa** com o botão **▶️ Start today’s challenge**. Não existe comando `/daily`: a pessoa clica no botão e responde no privado.
- **Só botões, sem modal** — todas as perguntas (inclusive as traduções) são apresentadas como **múltipla escolha**; basta clicar na opção certa. Não é preciso o intent privilegiado `MessageContent`.
- **Respostas privadas** — tudo acontece através de mensagens **efêmeras**. Ninguém vê as suas respostas.
- **Pontos** — 20 pontos por resposta correta (máximo de **100/dia**).
- **Streaks** — dias consecutivos formam uma sequência 🔥; se faltar um dia, ela reseta.
- **Cargos de marco automáticos** — em 10, 20, 30, 60, 100, 300, 600 e 1000 dias. O bot **cria os cargos sozinho** (cor laranja), sem IDs fixos no código.
- **Ranking do servidor Top 5** — uma única **mensagem permanente** no canal de ranking, atualizada automaticamente, mostrando **apenas os jogadores daquele servidor** (os pontos são atribuídos ao servidor de onde a pessoa jogou). `/ranking_global` mostra o Top 5 **somando todos os servidores** com as estatísticas e a sua posição; `/profile_duolingo` mostra os seus stats. Tudo em resposta **efêmera** (não polui o canal).
- **Comandos por servidor (nunca globais)** — os slash commands são registrados na guild (instantâneo). Para usar em outro servidor, defina `DISCORD_GUILD_ID` com o ID dele.
- **~1000 perguntas de inglês técnico**, geradas a partir de datasets fáceis de manter.
- **Job diário (cron)** — troca as perguntas à meia-noite e atualiza o ranking e o painel diário.

---

## 🧱 Stack

Node.js · TypeScript · discord.js v14 · PostgreSQL · Prisma ORM · node-cron · Docker · Docker Compose

---

## 📁 Estrutura do projeto

```
src/
├── commands/      # Slash commands (/profile_duolingo, /ranking_global, /help)
├── config/        # Validação de env + intents do gateway
├── constants/     # Canais, regras do jogo, custom ids
├── data/          # questions.json + datasets do gerador
├── database/      # Ciclo de vida do client Prisma
├── events/        # Roteadores/handlers de ready + interactionCreate
├── interfaces/    # Contratos compartilhados (Command, Event, Question)
├── jobs/          # Rotação diária via node-cron
├── loaders/       # Registro de comandos + ligação de eventos
├── middlewares/   # Tratamento de erros das interações
├── repositories/  # Camada de acesso a dados (queries Prisma)
├── services/      # Regras de negócio (daily, user, streak, role, ranking, question)
├── types/         # Tipos internos (sessões)
├── utils/         # Logger, normalização, datas, renderizadores
├── validators/    # Validação de respostas
└── index.ts       # Bootstrap
prisma/            # schema.prisma + seed.ts
scripts/           # generate-questions.ts, deploy-commands.ts, copy-data.js
```

---

## 🚀 Início rápido (Docker — recomendado)

É o caminho mais fácil, tanto localmente quanto na VPS.

```bash
# 1. Clone e entre no projeto
git clone <url-do-seu-repo> english-streak
cd english-streak

# 2. Crie seu .env a partir do template e preencha
cp .env.example .env
nano .env

# 3. Suba tudo (bot + PostgreSQL)
docker compose up -d --build

# 4. Acompanhe os logs
docker compose logs -f bot
```

Na primeira inicialização o bot vai:
1. aplicar o schema do banco de dados,
2. registrar os slash commands,
3. garantir que as perguntas do dia existam,
4. criar os cargos de marco (onde tiver permissão),
5. publicar o ranking inicial.

> O entrypoint do container roda `prisma migrate deploy` se você tiver migrations
> commitadas; caso contrário, usa `prisma db push` para sincronizar o schema
> automaticamente.

---

## ⚙️ Configuração — variáveis de ambiente

Copie `.env.example` para `.env`. **Você pode colar o mesmo arquivo direto na VPS.**

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DISCORD_TOKEN` | ✅ | Token do bot (Developer Portal → Bot → Token). O Client ID é detectado automaticamente a partir dele. |
| `DISCORD_GUILD_ID` | — | ID do servidor onde registrar os comandos. Os comandos são **sempre por servidor (nunca globais)**, então aparecem na hora. Defina para registrar só no **seu** servidor; se deixar em branco, o bot registra em **todos** os servidores em que estiver. |
| `CHANNEL_DAILY_QUESTIONS` | — | ID do canal onde fica a mensagem fixa com o botão de iniciar o desafio. |
| `CHANNEL_RANKING` | — | ID do canal onde a mensagem permanente do Top 5 é publicada. |
| `POSTGRES_USER` | ✅ | Usuário do banco. |
| `POSTGRES_PASSWORD` | ✅ | Senha do banco. |
| `POSTGRES_DB` | ✅ | Nome do banco. |
| `POSTGRES_HOST` | — | `postgres` no Docker, `localhost` para banco local (padrão `localhost`). |
| `POSTGRES_PORT` | — | Porta do banco (padrão `5432`). |
| `DATABASE_URL` | — | Connection string completa do Prisma. **Opcional** — montada automaticamente a partir das variáveis `POSTGRES_*` se omitida; defina apenas para sobrescrever (ou para comandos do Prisma CLI localmente). |
| `TZ` | — | Fuso horário do cron (ex.: `America/Sao_Paulo`). |
| `DAILY_CRON` | — | Expressão cron do reset diário (padrão `0 0 * * *`). |
| `LOG_LEVEL` | — | `debug` \| `info` \| `warn` \| `error`. |

### Configuração do bot no Discord

1. Acesse <https://discord.com/developers/applications> → **New Application**.
2. **Bot** → **Reset Token** → copie para `DISCORD_TOKEN`.
3. **Installation / OAuth2 → URL Generator**: escopos `bot` + `applications.commands`.
   Permissões: **Manage Roles**, **Send Messages**, **Embed Links**, **Use Slash Commands**.
4. Convide o bot. **Importante:** arraste o cargo do bot para **acima** dos cargos
   de marco em *Configurações do Servidor → Cargos*, para que ele consiga atribuí-los.

> ✅ Nenhuma intent privilegiada precisa ser ativada no Developer Portal.

### Substituindo os IDs dos canais

Defina-os no `.env` (`CHANNEL_DAILY_QUESTIONS`, `CHANNEL_RANKING`) **ou** edite
`src/constants/channels.ts`. Para copiar um ID, ative o *Modo Desenvolvedor* no
Discord, clique com o botão direito no canal → **Copiar ID do Canal**.

> 💡 **Mantenha os dois canais "só do bot".** Como o bot mantém uma única
> mensagem permanente em cada um (o painel do desafio e o Top 5), configure as
> permissões do canal para **negar "Enviar Mensagens" ao `@everyone`** e permitir
> apenas ao cargo do bot. Assim o canal nunca é poluído — a interação dos usuários
> acontece pelo botão e pelo comando efêmero (`/profile_duolingo`), que
> ninguém mais vê.

---

## 🗄️ Prisma & migrations

O schema fica em `prisma/schema.prisma` (modelos: `User`, `DailyQuestion`,
`UserAnswer`).

```bash
# Gerar o client Prisma
yarn prisma:generate

# Criar + aplicar uma migration em desenvolvimento
yarn prisma:migrate:dev --name init

# Aplicar migrations existentes em produção
yarn prisma:migrate

# Abrir o Prisma Studio (interface gráfica do banco)
yarn prisma:studio
```

Dentro do Docker o schema é aplicado automaticamente pelo entrypoint. Para criar
uma **migration versionada** (recomendado antes de ir para produção), rode uma
vez localmente contra o seu banco:

```bash
yarn prisma migrate dev --name init
```

e commite a pasta `prisma/migrations/` gerada.

---

## 🧩 Banco de perguntas

- ~1000 perguntas ficam em `src/data/questions.json`.
- Elas são **geradas**, não escritas à mão, a partir de pequenos datasets em
  `src/data/generators/` (siglas, vocabulário, gramática, traduções, etc.).

Para expandir ou regerar o banco:

```bash
# 1. Edite qualquer arquivo em src/data/generators/
# 2. Regere o questions.json (determinístico)
yarn generate:questions
```

Formatos de pergunta:

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

As respostas de texto são normalizadas antes da comparação (ignora
maiúsculas/minúsculas, remove espaços extras, ignora pontuação no final e acentos).

---

## 💻 Desenvolvimento local (sem Docker)

Requer **Node.js 20+** e um **PostgreSQL** rodando. O projeto usa **yarn 4**
(fixado em `package.json`); ative-o com `corepack enable` (o corepack já vem com
o Node 20+).

```bash
yarn install
cp .env.example .env          # defina as POSTGRES_* locais (host = localhost) e,
                              # para o Prisma CLI, descomente DATABASE_URL

yarn prisma:generate
yarn prisma:migrate:dev --name init
yarn generate:questions       # (já vem pronto, rode para atualizar)
yarn db:seed                  # opcional: define as perguntas de hoje

# Registrar os slash commands (já roda automaticamente no boot do bot).
# Use DISCORD_GUILD_ID no .env para registrar só no seu servidor (recomendado).
yarn deploy:commands

# Rodar em modo watch
yarn dev
```

Buildar e rodar a saída compilada:

```bash
yarn build
yarn start
```

---

## 🖥️ Deploy em uma VPS (Linux)

```bash
# 1. Instale o Docker + plugin Compose (Debian/Ubuntu)
curl -fsSL https://get.docker.com | sh

# 2. Pegue o código
git clone <url-do-seu-repo> english-streak && cd english-streak

# 3. Configure (cole o seu .env)
cp .env.example .env && nano .env

# 4. Suba
docker compose up -d --build

# 5. Verifique
docker compose ps
docker compose logs -f bot
```

O bot e o banco ficam isolados em uma rede Docker privada. O PostgreSQL é
publicado apenas em `127.0.0.1:5432` (edite/remova isso no `docker-compose.yml`
para mantê-lo totalmente interno).

### Atualizando para uma nova versão

```bash
cd english-streak
git pull
docker compose up -d --build      # reconstrói a imagem do bot
docker compose logs -f bot
```

Os slash commands são re-registrados automaticamente na inicialização. As
mudanças de schema são aplicadas pelo entrypoint (ou rode
`docker compose run --rm bot yarn prisma migrate deploy`).

---

## 💾 Backup & restauração do PostgreSQL

**Backup** (cria um dump com data no host):

```bash
docker compose exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup_$(date +%F).sql
```

**Restauração**:

```bash
cat backup_2026-06-21.sql | docker compose exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

**Backup diário automatizado** (exemplo de crontab no host):

```cron
0 3 * * * cd /opt/english-streak && docker compose exec -T postgres pg_dump -U english_streak english_streak | gzip > /opt/backups/es_$(date +\%F).sql.gz
```

Os dados do Postgres também persistem no volume nomeado `postgres_data` entre
reinícios e rebuilds.

---

## 🔒 Privacidade & intents

- **Sem `MESSAGE_CONTENT`**, **sem `PRESENCE`**, **sem monitoramento contínuo de `GUILD_MEMBERS`**.
- Apenas a intent base `Guilds` é usada (veja `src/config/intents.ts`).
- A atribuição de cargos usa o objeto de membro que já vem dentro de cada interação.
- Os dados armazenados se limitam a: ID do usuário no Discord, username, pontos,
  estatísticas do jogo, streak e o histórico de respostas do próprio sistema.
  **Mensagens, presença ou conteúdo de conversas nunca são armazenados.**

---

## 🧰 Scripts disponíveis

| Script | Descrição |
| --- | --- |
| `yarn dev` | Roda com hot reload (ts-node-dev). |
| `yarn build` | Compila o TypeScript + copia os dados para `dist/`. |
| `yarn start` | Roda o bot compilado. |
| `yarn generate:questions` | Regera o `questions.json` a partir dos datasets. |
| `yarn deploy:commands` | Registra os slash commands no Discord. |
| `yarn db:seed` | Popula as perguntas do dia. |
| `yarn prisma:generate` | Gera o client Prisma. |
| `yarn prisma:migrate` | Aplica migrations (produção). |
| `yarn prisma:migrate:dev` | Cria & aplica uma migration (dev). |
| `yarn prisma:studio` | Abre o Prisma Studio. |

---

## 📜 Licença

MIT.
