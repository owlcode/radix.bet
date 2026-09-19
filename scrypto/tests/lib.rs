use owl_bets::owlbets::*;
use owl_bets::BetCreatedEvent;
use scrypto_test::prelude::*;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

fn deadline_10_days_from_now() -> i64 {
    let start = SystemTime::now();
    let since_the_epoch = start
        .duration_since(UNIX_EPOCH)
        .expect("Time went backwards");
    let ten_days = Duration::from_secs(864000);
    (since_the_epoch + ten_days).as_secs() as i64
}

fn build_create_bet_manifest(
    package_address: PackageAddress,
    account: ComponentAddress,
    currency: ResourceAddress,
    deadline: i64,
) -> TransactionManifestV1 {
    ManifestBuilder::new()
        .lock_fee_from_faucet()
        .call_function(
            package_address,
            "PublicBetMultipleWinners",
            "create_bet",
            manifest_args!(
                currency,
                vec!["Option A".to_owned(), "Option B".to_owned()],
                vec![
                    "https://radix.bet/optionA.webp".to_owned(),
                    "https://radix.bet/optionB.webp".to_owned()
                ],
                "Test Bet".to_owned(),
                deadline,
                1u8,
            ),
        )
        .try_deposit_entire_worktop_or_abort(account, None)
        .build()
}

#[test]
fn test_init() {
    let mut ledger = LedgerSimulatorBuilder::new().build();
    let (public_key, _private_key, account) = ledger.new_allocated_account();
    let package_address = ledger.compile_and_publish(this_package!());

    let manifest = build_create_bet_manifest(package_address, account, XRD, deadline_10_days_from_now());

    let receipt = ledger.execute_manifest(
        manifest,
        vec![NonFungibleGlobalId::from_public_key(&public_key)],
    );

    println!("{:?}\n", receipt);
    receipt.expect_commit_success();

    let component_addresses = receipt.expect_commit(true).new_component_addresses();
    assert!(!component_addresses.is_empty(), "Component should be created");
}

#[test]
fn test_bet_created_event_contains_currency() {
    let mut ledger = LedgerSimulatorBuilder::new().build();
    let (public_key, _private_key, account) = ledger.new_allocated_account();
    let package_address = ledger.compile_and_publish(this_package!());

    let manifest = build_create_bet_manifest(package_address, account, XRD, deadline_10_days_from_now());

    let receipt = ledger.execute_manifest(
        manifest,
        vec![NonFungibleGlobalId::from_public_key(&public_key)],
    );
    let commit = receipt.expect_commit_success();

    // Extract BetCreatedEvent from application events
    let events: Vec<BetCreatedEvent> = commit
        .application_events
        .iter()
        .filter_map(|(_, event_data)| {
            scrypto_decode::<BetCreatedEvent>(event_data).ok()
        })
        .collect();

    assert_eq!(events.len(), 1, "Expected exactly one BetCreatedEvent");

    let event = &events[0];
    assert_eq!(event.currency, XRD, "BetCreatedEvent currency should match the input currency (XRD)");
    assert_eq!(event.name, "Test Bet");
    assert_eq!(event.options.len(), 2);
    assert_eq!(event.options[0].name, "Option A");
    assert_eq!(event.options[1].name, "Option B");
}
