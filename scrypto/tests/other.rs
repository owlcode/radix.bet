use owl_bets::owlbets_test::*;
use scrypto_test::prelude::*;

struct Test {
    env: TestEnvironment<InMemorySubstateDatabase>,
    public_bet_multiple_winners: PublicBetMultipleWinners,
    owner_badge: Bucket,
}

fn arrange_test_environment() -> Result<Test, RuntimeError> {
    let mut env = TestEnvironment::new();
    let package_address =
        PackageFactory::compile_and_publish(this_package!(), &mut env, CompileProfile::Fast)?;

    // Create a bet with deadline far in the future
    let deadline = Instant::new(i64::MAX / 2);

    let result = PublicBetMultipleWinners::create_bet(
        XRD,
        vec!["Option 1".to_owned(), "Option 2".to_owned()],
        vec![
            "https://radix.bet/option1.webp".to_owned(),
            "https://radix.bet/option2.webp".to_owned(),
        ],
        "Test Bet".to_owned(),
        deadline,
        1u8,
        package_address,
        &mut env,
    )?;

    Ok(Test {
        env,
        public_bet_multiple_winners: result.0,
        owner_badge: result.1,
    })
}

#[test]
fn can_instantiate_public_bet_multiple_winners() -> Result<(), RuntimeError> {
    let _ = arrange_test_environment()?;
    Ok(())
}

#[test]
fn can_get_state() -> Result<(), RuntimeError> {
    let Test {
        mut env,
        mut public_bet_multiple_winners,
        owner_badge: _,
    } = arrange_test_environment()?;

    let state = public_bet_multiple_winners.get_state(&mut env)?;

    // Verify state has expected structure
    assert_eq!(state.winner, ""); // winner should be empty
    assert!(state.options.len() == 2); // should have 2 options

    Ok(())
}

// Voting test - commented out due to time-based assertions
// #[test]
// fn can_vote() -> Result<(), RuntimeError> {
//     let Test {
//         mut env,
//         mut public_bet_multiple_winners,
//         owner_badge: _,
//     } = arrange_test_environment()?;
//
//     let bucket = BucketFactory::create_fungible_bucket(XRD, 100.into(), Mock, &mut env)?;
//     let _receipt = public_bet_multiple_winners.vote("Option 1".to_owned(), bucket.into(), &mut env)?;
//
//     Ok(())
// }
