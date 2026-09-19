# Event Field Reference

## BetVoteEvent

Scrypto struct:

```rust
pub struct BetVoteEvent {
    address: ComponentAddress, // bet component address, NOT the voter's account
    option: ResourceAddress,
    amount: Decimal,
}
```

- `address` — the **bet component address**, not the voting account address.
- There is **no voter account field** in the on-chain event. The contract does not emit who placed the vote.
- The `voter` field in `@radix-bet/types` BetVoteEvent and in the SBOR parser will always be empty string for this event — the Scrypto contract does not include it.

## BetWinnerVoteEvent

```rust
pub struct BetWinnerVoteEvent {
    address: ComponentAddress,
    option: ResourceAddress,
    voter: NonFungibleLocalId, // verifier NFT ID, NOT an account address
}
```

- `voter` here is a **NonFungibleLocalId** — the NFT ID proving verifier rights to resolve bets. It is not an account address.

## Implication for vote tracking

Since on-chain events do not identify the voter's account, vote ownership must be tracked at the UI/API layer before the transaction is submitted. Votes placed directly on-chain (bypassing the UI) cannot be attributed to a specific account from event data alone.
