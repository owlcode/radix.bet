# Integration Tests

End-to-end integration tests for programmatic transaction submission to Radix Stokenet.

## Prerequisites

1. Node.js >= 18
2. pnpm package manager
3. (Optional) Running PostgreSQL database with proper schema
4. (Optional) Running event-processor for database sync tests

## Setup

From the repository root:

```bash
# Install all dependencies
pnpm install

# Generate Prisma client (if testing database integration)
pnpm db:generate
```

## Running Tests

```bash
# Run all integration tests
pnpm test:integration

# Run with verbose output
pnpm --filter @radix-bet/integration-tests test

# Run in watch mode (for development)
pnpm --filter @radix-bet/integration-tests test:watch
```

## What the Tests Do

### 1. Wallet and Faucet Tests

- Creates a new test wallet (Ed25519 keypair)
- Derives a Stokenet account address
- Requests XRD from the Stokenet faucet
- Verifies the transaction confirms and balance increases

### 2. Bet Creation Tests

- Submits a `create_bet` transaction to the deployed package
- Waits for transaction confirmation
- Verifies the component address was created
- Verifies option resource addresses were created
- Checks the component exists on-chain via Gateway API

### 3. Event Processor Integration Tests (Optional)

- Waits for the event-processor to sync the bet to the database
- Verifies the bet record exists with correct data
- Skipped automatically if database is not available

## Environment Variables

The tests use Stokenet by default. Key addresses are configured in `src/utils/radix-client.ts`:

- `PACKAGE_ADDRESS`: The deployed PublicBetMultipleWinners package
- `XRD_ADDRESS`: Stokenet XRD resource address
- `FAUCET_ADDRESS`: Stokenet faucet component

For database tests, ensure `DATABASE_URL` is set in your `.env` file.

## Test Timeouts

- Faucet funding: 90 seconds
- Bet creation: 90 seconds
- Database sync: 120 seconds

Blockchain operations can take time due to consensus, so timeouts are set accordingly.

## Troubleshooting

### Tests timeout waiting for transaction

- Stokenet may be congested; try again later
- Check Stokenet status at https://stokenet-dashboard.radixdlt.com/

### Database tests are skipped

- Ensure PostgreSQL is running
- Check `DATABASE_URL` in your environment
- Run `pnpm db:generate` to generate Prisma client

### Faucet fails

- Faucet has rate limits; wait a few minutes and retry
- Account may already have sufficient funds
