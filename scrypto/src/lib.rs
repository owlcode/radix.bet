use scrypto::prelude::*;
use radix_common::time::Instant;

#[derive(ScryptoSbor, Debug, Clone)]
pub struct BetOptionState {
    name: String,
    total_supply: Decimal,
    icon_url: UncheckedUrl,
    address: ResourceAddress,
}

#[derive(ScryptoSbor, Debug, Clone)]
pub struct BetOptionInput {
    name: String,
    image_url: UncheckedUrl,
}

#[derive(ScryptoSbor, Debug, Clone)]
pub struct BetOptionCreated {
    pub name: String,
    pub address: ResourceAddress,
    pub icon_url: String,
}

#[derive(ScryptoSbor, ScryptoEvent)]
pub struct BetCreatedEvent {
    pub name: String,
    pub address: ComponentAddress,
    pub options: Vec<BetOptionCreated>,
    pub deadline: i64,
    pub currency: ResourceAddress,
}

#[derive(ScryptoSbor, ScryptoEvent)]
pub struct BetPrizeClaimedEvent {
    address: ComponentAddress,
    amount: Decimal,
}

#[derive(ScryptoSbor, ScryptoEvent)]
pub struct BetAllPrizesClaimedEvent {
    address: ComponentAddress,
}

#[derive(ScryptoSbor, ScryptoEvent)]
pub struct BetVoteEvent {
    address: ComponentAddress,
    option: ResourceAddress,
    amount: Decimal,
}

#[derive(ScryptoSbor, ScryptoEvent)]
pub struct BetMarkWinnerEvent {
    address: ComponentAddress,
    option: ResourceAddress,
}

#[derive(ScryptoSbor, ScryptoEvent)]
pub struct BetWinnerVoteEvent {
    address: ComponentAddress,
    option: ResourceAddress,
    voter: NonFungibleLocalId,
}

#[derive(ScryptoSbor, Debug, Clone)]
pub struct BetState {
    pub winner: String,
    pub winner_ratio: Decimal,
    pub is_active: bool,
    pub currency: ResourceAddress,
    pub owner_badge: ResourceAddress,
    pub options: Vec<BetOptionState>,
    pub deadline: Instant,
    pub required_verifications: u8,
    pub verifier_badge: ResourceAddress,
}

fn set_bet_dapp_metadata(
    account: Global<Account>,
    claimed_entities: Vec<GlobalAddress>,
    bet_name: String,
) {
    // let mut dapp_name: String = "radix.bet - ".to_owned();
    // dapp_name.push_str(&bet_name);
    account.set_metadata(
        "icon_url",
        UncheckedUrl("https://radix.bet/icons/dapp.webp".to_owned()),
    );
    account.set_metadata("info_url", UncheckedUrl("https://radix.bet/".to_owned()));
    account.set_metadata("claimed_entities", claimed_entities);
    account.set_metadata("tags", vec!["radix.bet".to_owned()]);
    account.set_metadata("name", bet_name);
    account.set_metadata("account_type", "dapp definition".to_owned());
}

#[blueprint]
#[events(BetCreatedEvent, BetVoteEvent, BetMarkWinnerEvent, BetPrizeClaimedEvent, BetAllPrizesClaimedEvent, BetWinnerVoteEvent)]
mod owlbets {
    enable_method_auth! {
        methods {
            vote => PUBLIC;
            get_state => PUBLIC;
            claim_prize => PUBLIC;
            mark_winning_option => PUBLIC;
            submit_winner_vote => PUBLIC;
        }
    }

    enable_package_royalties! {
        vote => Usd(dec!(0));
        get_state => Xrd(dec!(0));
        create_bet => Usd(dec!(1));
        claim_prize => Xrd(dec!(0));
        mark_winning_option => Usd(dec!(1));
        submit_winner_vote => Xrd(dec!(0));
    }

    struct PublicBetMultipleWinners {
        prize: Vault,
        winner: String,
        deadline: Instant,
        options: Vec<String>,
        winner_ratio: Decimal,
        owner_badge: ResourceAddress,
        option_vaults: KeyValueStore<ResourceAddress, Vault>,
        option_resource_managers: KeyValueStore<String, ResourceManager>,
        verifier_badge: ResourceAddress,
        required_verifications: u8,
        winner_votes: KeyValueStore<String, Vec<NonFungibleLocalId>>,
        verifiers_who_voted: KeyValueStore<NonFungibleLocalId, bool>,
    }

    impl PublicBetMultipleWinners {
        pub fn create_bet(
            currency: ResourceAddress,
            options: Vec<String>,
            options_image_urls: Vec<String>,
            bet_name: String,
            deadline: Instant,
            verifiers: u8,
        ) -> (Global<PublicBetMultipleWinners>, Bucket) {
            assert_eq!(options.len(), options_image_urls.len(), "Invalid options");
            let required_verifications = verifiers;

            // reserve an address for the component
            let (address_reservation, component_address) =
                Runtime::allocate_component_address(PublicBetMultipleWinners::blueprint_id());

            let mut claimed_entities: Vec<GlobalAddress> = vec![];

            let mut owner_badge_name: String = "radix.bet - ".to_owned();
            owner_badge_name.push_str(&bet_name);

            let badge_bucket: Bucket = if verifiers <= 1 {
                ResourceBuilder::new_fungible(OwnerRole::None)
                    .metadata(metadata!(
                        init {
                            "name" => owner_badge_name, locked;
                            "tags" => vec!["radix.bet".to_owned(), "badge".to_owned()], locked;
                            "dapp_definitions" => vec![GlobalAddress::from(component_address)], locked;
                            "icon_url" => UncheckedUrl("https://radix.bet/owner_badge_icon.webp".to_owned()), locked;
                            "info_url" => UncheckedUrl("https://radix.bet/dictionary/owner_badge".to_owned()), locked;
                        }
                    ))
                    .burn_roles(burn_roles! {
                        burner => rule!(require(global_caller(component_address)));
                        burner_updater => rule!(deny_all);
                    })
                    .recall_roles(recall_roles! {
                        recaller => rule!(deny_all);
                        recaller_updater => rule!(deny_all);
                    })
                    .freeze_roles(freeze_roles! {
                        freezer => rule!(deny_all);
                        freezer_updater => rule!(deny_all);
                    })
                    .divisibility(DIVISIBILITY_NONE)
                    .mint_initial_supply(1)
                    .into()
            } else {
                let initial_supply: Vec<(IntegerNonFungibleLocalId, ())> = (1..=verifiers as u64)
                    .map(|i| (IntegerNonFungibleLocalId::new(i), ()))
                    .collect();
                ResourceBuilder::new_integer_non_fungible::<()>(OwnerRole::None)
                    .metadata(metadata!(
                        init {
                            "name" => owner_badge_name, locked;
                            "tags" => vec!["radix.bet".to_owned(), "verifier".to_owned()], locked;
                            "dapp_definitions" => vec![GlobalAddress::from(component_address)], locked;
                            "icon_url" => UncheckedUrl("https://radix.bet/owner_badge_icon.webp".to_owned()), locked;
                            "info_url" => UncheckedUrl("https://radix.bet/dictionary/owner_badge".to_owned()), locked;
                        }
                    ))
                    .burn_roles(burn_roles! {
                        burner => rule!(require(global_caller(component_address)));
                        burner_updater => rule!(deny_all);
                    })
                    .recall_roles(recall_roles! {
                        recaller => rule!(deny_all);
                        recaller_updater => rule!(deny_all);
                    })
                    .freeze_roles(freeze_roles! {
                        freezer => rule!(deny_all);
                        freezer_updater => rule!(deny_all);
                    })
                    .mint_initial_supply(initial_supply)
                    .into()
            };

            let badge_address = badge_bucket.resource_address();

            let non_fungible_global_id = NonFungibleGlobalId::package_of_direct_caller_badge(
                PublicBetMultipleWinners::blueprint_id().package_address,
            );
            let account: Global<Account> = Blueprint::<Account>::create_advanced(
                OwnerRole::Fixed(rule!(require(non_fungible_global_id))),
                None::<GlobalAddressReservation>,
            );
            let managers = KeyValueStore::new();
            let vaults = KeyValueStore::new();
            let mut options_created: Vec<BetOptionCreated> = Vec::new();

            // create fungible resource manager for each option
            // amount of input currency is amount of returned option fungible token
            for (i, option) in options.iter().enumerate() {
                let manager = ResourceBuilder::new_fungible(OwnerRole::None)
                    .metadata(metadata!(
                        init {
                            "name" => option.to_owned(), locked;
                            "dapp_definitions" => vec![GlobalAddress::from(account.address())], locked;
                            "icon_url" => UncheckedUrl(options_image_urls.get(i).unwrap().to_owned()), locked;
                            "info_url" => UncheckedUrl("https://radix.bet/dictionary/receipt".to_owned()), locked;
                        }
                    ))
                    .mint_roles(mint_roles! {
                        minter => rule!(require(global_caller(component_address)));
                        minter_updater => rule!(deny_all);
                    })
                    .burn_roles(burn_roles! {
                        burner => rule!(deny_all);
                        burner_updater => rule!(deny_all);
                    })
                    .recall_roles(recall_roles! {
                        recaller => rule!(deny_all);
                        recaller_updater => rule!(deny_all);
                    })
                    .freeze_roles(freeze_roles! {
                        freezer => rule!(deny_all);
                        freezer_updater => rule!(deny_all);
                    })
                    .divisibility(DIVISIBILITY_NONE)
                    .create_with_no_initial_supply();
                claimed_entities.push(GlobalAddress::from(manager.address()));
                options_created.push(BetOptionCreated {
                    name: option.to_owned(),
                    address: manager.address(),
                    icon_url: options_image_urls.get(i).unwrap().to_owned(),
                });

                managers.insert(option.to_owned(), manager.into());
                vaults.insert(manager.address(), Vault::new(manager.address()));
            }

            let component = Self {
                options,
                deadline,
                owner_badge: badge_address,
                prize: Vault::new(currency),
                winner: "".to_string(),
                winner_ratio: 1.into(),
                option_vaults: vaults,
                option_resource_managers: managers,
                verifier_badge: badge_address,
                required_verifications,
                winner_votes: KeyValueStore::new(),
                verifiers_who_voted: KeyValueStore::new(),
            }
            .instantiate()
            .prepare_to_globalize(OwnerRole::Fixed(rule!(require(
                badge_address
            ))))
            .metadata(metadata! {
                init {
                    "name" => "radix.bet".to_owned(), locked;
                    "dapp_definition" => GlobalAddress::from(account.address()), locked;
                }
            })
            .enable_component_royalties(component_royalties! {
                init {
                    vote => Usd(dec!(1)), updatable;
                    get_state => Xrd(dec!(0)), updatable;
                    claim_prize => Xrd(dec!(0)), updatable;
                    mark_winning_option => Usd(dec!(0)), updatable;
                    submit_winner_vote => Xrd(dec!(0)), updatable;
                }
            })
            .with_address(address_reservation)
            .globalize();

            // Emit the event
            Runtime::emit_event(BetCreatedEvent {
                name: bet_name.clone(),
                address: component.address(),
                options: options_created,
                deadline: deadline.seconds_since_unix_epoch,
                currency: currency,
            });

            claimed_entities.push(GlobalAddress::from(component.address()));
            set_bet_dapp_metadata(account, claimed_entities, bet_name);

            (component, badge_bucket)
        }

        pub fn claim_prize(&mut self, bucket: Bucket) -> Bucket {
            assert_ne!(self.winner, "".to_string(), "Winner is not yet determined");
            let winning_resource = self.option_resource_managers.get(&self.winner).unwrap();
            let resource_address = &bucket.resource_manager().address();
            assert_eq!(
                resource_address.to_owned(),
                winning_resource.address(),
                "Trying to claim prize with invalid resource"
            );

            let mut claimed_prizes_vault = self.option_vaults.get_mut(resource_address).unwrap();

            let is_final_claim = (claimed_prizes_vault.amount() + bucket.amount())
                == winning_resource.total_supply().unwrap();

            let prize = if is_final_claim {
                claimed_prizes_vault.put(bucket);
                self.prize.take_all()
            } else {
                let reward = bucket.amount().checked_mul(self.winner_ratio).unwrap();
                claimed_prizes_vault.put(bucket);
                self.prize.take(reward)
            };

            Runtime::emit_event(BetPrizeClaimedEvent {
                address: Runtime::global_address().into(),
                amount: prize.amount(),
            });

            if is_final_claim {
                Runtime::emit_event(BetAllPrizesClaimedEvent {
                    address: Runtime::global_address().into(),
                });
            }

            prize
        }

        fn assume_current_time_before_deadline(&self) {
            let current_time = Clock::current_time_rounded_to_seconds();
            assert!(
                current_time.compare(self.deadline, TimeComparisonOperator::Lt),
                "Betting is finished"
            );
        }

        fn assume_current_time_after_deadline(&self) {
            let current_time = Clock::current_time_rounded_to_seconds();
            assert!(
                current_time.compare(self.deadline, TimeComparisonOperator::Gt),
                "Betting is still ongoing"
            );
        }

        fn assume_betting_correct_currency(&self, bucket: &Bucket) {
            assert_eq!(
                bucket.resource_manager().address(),
                self.prize.resource_address(),
                "You're trying to bet with invalid currency"
            );
        }

        fn assume_winner_is_not_selected(&self) {
            assert_eq!(self.winner, "".to_string(), "Winner is already determined");
        }

        fn assume_correct_admin_badge_bucket(&self, bucket: &Bucket) {
            assert_eq!(
                bucket.resource_manager().address(),
                self.owner_badge,
                "Invalid owner badge for burning"
            );
            assert_eq!(bucket.amount(), 1.into(), "Invalid amount for burning");
        }

        pub fn vote(&mut self, option: String, bucket: Bucket) -> FungibleBucket {
            self.assume_current_time_before_deadline();
            self.assume_betting_correct_currency(&bucket);
            assert!(
                self.option_resource_managers.get(&option).is_some(),
                "Option does not exist"
            );

            let amount = bucket.amount();
            self.prize.put(bucket);
            let manager = self.option_resource_managers.get(&option).unwrap();
            let fungible_manager: FungibleResourceManager = manager.address().into();
            let minted = fungible_manager.mint(amount);

            Runtime::emit_event(BetVoteEvent {
                address: Runtime::global_address().into(),
                option: manager.address(),
                amount,
            });

            minted
        }

        pub fn mark_winning_option(&mut self, option: String, bucket: Bucket) {
            self.assume_winner_is_not_selected();
            self.assume_current_time_after_deadline();
            self.assume_correct_admin_badge_bucket(&bucket);
            assert!(
                self.option_resource_managers.get(&option).is_some(),
                "Option does not exist"
            );

            self.winner = option.to_owned();
            let manager = self.option_resource_managers.get(&option).unwrap();
            let manager_address = manager.address();
            let winning_supply = manager.total_supply().unwrap();
            let winner_ratio = self.prize.amount().checked_div(winning_supply).unwrap();
            self.winner_ratio = winner_ratio;
            bucket.burn();

            Runtime::emit_event(BetMarkWinnerEvent {
                address: Runtime::global_address().into(),
                option: manager_address,
            });
        }

        pub fn submit_winner_vote(&mut self, option: String, proof: Proof) {
            self.assume_current_time_after_deadline();
            self.assume_winner_is_not_selected();
            assert!(
                self.required_verifications > 1,
                "MultipleVerifier is not enabled for this bet"
            );
            assert!(
                self.option_resource_managers.get(&option).is_some(),
                "Option does not exist"
            );

            let checked_proof = proof.check(self.verifier_badge);
            let voter = checked_proof.as_non_fungible().non_fungible_local_id();

            // Global dedup: each verifier can only vote once across all options
            assert!(
                self.verifiers_who_voted.get(&voter).is_none(),
                "This verifier has already submitted a vote"
            );
            self.verifiers_who_voted.insert(voter.clone(), true);

            let votes_exist = self.winner_votes.get(&option);
            let mut votes: Vec<NonFungibleLocalId> = match votes_exist {
                Some(v) => v.clone(),
                None => Vec::new(),
            };

            votes.push(voter.clone());

            let manager = self.option_resource_managers.get(&option).unwrap();
            let manager_address = manager.address();

            Runtime::emit_event(BetWinnerVoteEvent {
                address: Runtime::global_address().into(),
                option: manager_address,
                voter: voter.clone(),
            });

            if votes.len() as u8 >= self.required_verifications {
                // Threshold met — finalize winner
                self.winner = option.to_owned();
                let winning_supply = manager.total_supply().unwrap();
                let winner_ratio = self.prize.amount().checked_div(winning_supply).unwrap();
                self.winner_ratio = winner_ratio;

                Runtime::emit_event(BetMarkWinnerEvent {
                    address: Runtime::global_address().into(),
                    option: manager_address,
                });
            }

            self.winner_votes.insert(option, votes);
        }

        pub fn get_state(&self) -> BetState {
            let opts: Vec<BetOptionState> = self
                .options
                .iter()
                .map(|x| {
                    let manager = self.option_resource_managers.get(x).unwrap();
                    let icon_url = manager.get_metadata("icon_url").unwrap().unwrap();
                    BetOptionState {
                        name: x.to_owned(),
                        icon_url,
                        address: manager.address(),
                        total_supply: manager.total_supply().unwrap(),
                    }
                })
                .collect();

            BetState {
                winner: self.winner.to_owned(),
                winner_ratio: self.winner_ratio.to_owned(),
                is_active: self.deadline.compare(
                    Clock::current_time_rounded_to_seconds(),
                    TimeComparisonOperator::Gt,
                ),
                currency: self.prize.resource_address(),
                owner_badge: self.owner_badge,
                options: opts,
                deadline: self.deadline,
                required_verifications: self.required_verifications,
                verifier_badge: self.verifier_badge,
            }
        }
    }
}
