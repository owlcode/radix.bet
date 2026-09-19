<script lang="ts">
  import 'vanilla-cookieconsent/dist/cookieconsent.css';
  import { onMount } from 'svelte';

  // This build carries no analytics or third-party tracking, so the banner
  // only has essential cookies to declare. The category machinery is kept
  // because it is what makes the preferences modal work, and because adding a
  // category back is the point at which you would need consent again.
  onMount(async () => {
    const { run } = await import('vanilla-cookieconsent');

    run({
      guiOptions: {
        consentModal: {
          layout: 'bar',
          position: 'bottom',
          equalWeightButtons: false,
          flipButtons: false
        },
        preferencesModal: {
          layout: 'box',
          position: 'right',
          equalWeightButtons: true,
          flipButtons: false
        }
      },
      categories: {
        necessary: {
          enabled: true,
          readOnly: true
        }
      },
      language: {
        default: 'en',
        translations: {
          en: {
            consentModal: {
              title: 'We use cookies',
              description:
                'radix.bet uses only essential cookies, for authentication, wallet connection and core functionality. There is no analytics or third-party tracking.',
              acceptAllBtn: 'Got it',
              showPreferencesBtn: 'Manage preferences',
              footer: '<a href="/privacy" target="_blank">Privacy &amp; Cookie Policy</a>'
            },
            preferencesModal: {
              title: 'Cookie preferences',
              acceptAllBtn: 'Got it',
              savePreferencesBtn: 'Save preferences',
              closeIconLabel: 'Close',
              serviceCounterLabel: 'Service|Services',
              sections: [
                {
                  title: 'Your Privacy',
                  description:
                    'We use cookies only to make the platform work. Nothing here profiles you or leaves for a third party.'
                },
                {
                  title: 'Essential cookies <span class="pm__badge">Always on</span>',
                  description:
                    'Required for authentication, wallet connection, and core platform functionality. Cannot be disabled.',
                  linkedCategory: 'necessary'
                },
                {
                  title: 'More information',
                  description:
                    'For questions about our cookie use, read our <a href="/privacy">Privacy &amp; Cookie Policy</a>.'
                }
              ]
            }
          }
        }
      }
    });
  });
</script>
