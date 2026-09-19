import i18next from 'i18next';
import { createI18nStore } from 'svelte-i18next';

i18next.init({
  lng: 'en',
  resources: {
    en: {
      main: {
        featured: 'Featured Bets'
      },
      nav: {
        menu: 'Menu',
        search_markets: 'Search markets...',
        create_bet: 'Create Bet',
        my_account: 'My Account',
        leaderboard: 'Leaderboard',
        browse_markets: 'Browse Markets',
        me: 'My Account',
        how_it_works: 'How It Works'
      },
      bet: {
        betting_complete: 'Congratulations! Transaction complete!',
        clean_up: 'Clean Up',
        total_amount: 'Total Bet: {{amount}}',
        claim: 'Claim Prize',
        create: 'Create Bet',
        mark_winner: 'Mark Winner',
        your_bets: 'Your Bets',
        add_option: 'Add option',
        manage: 'Manage Bet',
        betting_disabled: 'Betting is disabled',
        winner_already_selected: 'Winner already selected',
        timeline: 'Timeline',
        bet_cta: 'Bet!',
        currently_betting:
          "You're betting <strong>{{option}}</strong> in <strong>{{name}}</strong> bet",
        if_right:
          'If you were right and bet closed right now, you would <strong>win {{amount}} XRD</strong>!',
        no_bets_found: 'No bets found',
        be_first: 'Be the first to create a bet in this category!',
        loading: 'Loading bets...',
        load_more: 'Load More Markets',
        see_your_bets: 'See your bets'
      },
      account: {
        empty_linked_accounts: 'Please link accounts',
        link_accounts: 'Link accounts',
        my_account: 'My Account',
        linked_accounts: 'Linked Accounts',
        link_account: 'Link Account',
        link_first: 'Link your first account',
        no_accounts: 'No accounts linked yet.',
        my_bets: 'My Bets',
        create_new: 'Create New',
        no_bets_created: "You haven't created any bets yet.",
        create_first: 'Create your first bet',
        placed_bets: 'Placed Bets',
        no_placed_bets: "You haven't placed any bets yet.",
        no_filtered_bets: 'No {{tab}} bets.',
        browse_markets: 'Browse markets',
        active_bets: 'Active Bets',
        total_volume: 'Total Volume',
        bets_created: 'Bets Created',
        connect_wallet: 'Connect your wallet to view your account'
      },
      bet_timeline_title: {
        end: 'Winning bet registered on-ledger',
        start: 'Betting begins',
        betting_closed: 'Betting component stops accepting bets'
      },
      bet_timeline_description: {
        end: 'The results are in. Collect your winnings or prepare for the next challenge.',
        start: 'Place your bets now. Predict the outcome before the clock runs out.',
        betting_closed: 'The window to place bets has closed. Sit back and await the results.'
      },
      wallet: {
        submit: 'Submit',
        check_wallet: 'Please check your Radix Wallet'
      },
      dictionary: {
        receipt: 'Receipt'
      },
      footer: {
        tagline:
          'Decentralized Voting on Radix DLT. Mint token, give it to your peers and let voting begin!',
        markets: 'Markets',
        all_markets: 'All Markets',
        community: 'Community',
        how_it_works: 'How It Works'
      },
      common: {
        all: 'All',
        active: 'Active',
        won: 'Won',
        lost: 'Lost',
        newest: 'Newest',
        top_volume: 'Top Volume',
        market: 'Market',
        position: 'Position',
        amount: 'Amount',
        status: 'Status',
        recent_activity: 'Recent Activity',
        no_activity: 'No activity yet',
        view_all: 'View all bets',
        clear_search: 'Clear search',
        results_for: 'Results for "{{query}}"'
      }
    }
  },
  interpolation: {
    escapeValue: false
  }
});

export const i18n = createI18nStore(i18next);
