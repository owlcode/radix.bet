# radix.bet Architecture

Polymarket-style prediction market on Radix DLT. Users create and trade prediction markets for real-world events using XRD on Stokenet (testnet). Mainnet blocked by Polish gambling law.

## Tech Stack

| Layer           | Technology                                   |
| --------------- | -------------------------------------------- |
| Frontend        | SvelteKit 2.0 + Svelte 4 + TypeScript + SCSS |
| Admin UI        | React 18 + React Router + Vite               |
| Event Processor | Express.js + BullMQ + Redis                  |
| Database        | PostgreSQL + Prisma ORM                      |
| Smart Contracts | Scrypto (Rust) on Radix Network              |
| Build System    | Turborepo + pnpm workspaces                  |

## Smart Contract (Scrypto)

Blueprint: `PublicBetMultipleWinners` in package `owl-bets`

**Bet lifecycle:**

```
create_bet() → [ACTIVE: voting open]
                    ↓ (deadline)
              [VOTING_CLOSED]
                    ↓ (owner calls mark_winning_option)
              [RESOLVED]
                    ↓ (winners call claim_prize)
              [Prizes distributed]
```

**Key design:**

- Each bet option has its own fungible resource (token) serving as receipt + redemption proof
- Owner badge: non-divisible fungible, burned when marking winner
- Prize ratio: `total_prize_pool / winning_option_total_supply`
- Royalties: 1 USD for `create` and `vote`

## Frontend (`apps/web/`)

| Route            | Purpose                                      |
| ---------------- | -------------------------------------------- |
| `/`              | Homepage with hero stats + featured markets  |
| `/bet/[address]` | Market view + voting modal                   |
| `/bet/create`    | Create new prediction market                 |
| `/bet/recurring` | Recurring bet template management            |
| `/me`            | User profile — linked accounts, created bets |

**Auth:** ROLA (Radix Off-Ledger Authentication) — server generates 32-byte hex challenge → user signs with Radix wallet → server verifies via `@radixdlt/rola` → issues JWT + refresh token cookies.

**API routes:**

| Endpoint                           | Method | Purpose                                  |
| ---------------------------------- | ------ | ---------------------------------------- |
| `/api/auth/challenge`              | GET    | Generate ROLA challenge                  |
| `/api/auth/login`                  | POST   | Verify signed challenge, issue JWT       |
| `/api/bets`                        | GET    | List bets with category/pagination       |
| `/api/bet`                         | POST   | Fetch transaction details after creation |
| `/api/gateway/bet-state/[address]` | GET    | On-chain state via transaction preview   |
| `/api/manifests/vote`              | POST   | Build vote transaction manifest          |
| `/api/manifests/mark-winner`       | POST   | Build mark-winner manifest               |

## Event Processor (`apps/event-processor/`)

**Ingestion:** `POST /api/webhook/events` — receives events from hookah.ing, validates HMAC signature.

**BullMQ queues:**

- `bet-created` → create Bet + BetOption records
- `bet-vote` → update BetOption.totalVotes
- `bet-winner` → set Bet.winningOptionId, status → RESOLVED
- `bet-claim` → log prize claims

**Admin API:**

| Endpoint                             | Purpose                        |
| ------------------------------------ | ------------------------------ |
| `GET /api/admin/queues`              | Queue stats                    |
| `POST /api/admin/queues/:name/clean` | Clean completed/failed jobs    |
| `GET /api/admin/events`              | Paginated event log            |
| `GET/PUT /api/admin/config`          | Runtime configuration          |
| `POST /api/admin/seed`               | Generate test data on Stokenet |
| `GET /api/admin/seed/status`         | Seed progress                  |

## Admin Dashboard (`apps/admin/`)

React SPA: Dashboard (queue stats), Queues (BullMQ management), Stream (start/stop), Events (log viewer), Config (runtime KV), Seed Data.

## Database Schema

See `packages/database/prisma/schema.prisma`.

## Network Configuration (Stokenet)

| Resource                  | Address                                                                    |
| ------------------------- | -------------------------------------------------------------------------- |
| XRD Resource              | `resource_tdx_2_1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxtfd2jc`   |
| Faucet                    | `component_tdx_2_1cptxxxxxxxxxfaboratxxxxxxxxx000527798379xxxxxxxxxtvj94g` |
| Gateway URL               | `https://stokenet.radixdlt.com`                                            |
| Package / dApp Definition | From ENV — changes over time                                               |

## Development

```bash
pnpm install
docker compose up -d          # PostgreSQL + Redis
pnpm db:generate
pnpm db:push
pnpm dev

# Scrypto
cd scrypto && cargo build --target wasm32-unknown-unknown --release
bun run scripts/deploy-scrypto.ts

# Tests (requires Stokenet)
pnpm test:integration
pnpm --filter @radix-bet/integration-tests test -- --testPathPattern lifecycle

# Seed
pnpm seed:bets                          # Stokenet + DB
pnpm --filter @radix-bet/web seed:db    # DB only
```
