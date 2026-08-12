import { usePageMeta } from '../../lib/usePageMeta'
import './privacy.css'

export default function PrivacyPage() {
  usePageMeta(
    'Privacy Policy — The Cursed Apple',
    'Privacy policy for The Cursed Apple, a Deadlock companion for web and Android.',
  )
  return (
    <div className="narrow privacy">
      <p className="privacy-updated">
        The Cursed Apple — a Deadlock companion (web and Android app). Last updated: August
        12, 2026.
      </p>

      <section>
        <h2>The short version</h2>
        <p>
          The Cursed Apple does not collect, store, or sell your personal data. There are no
          accounts in the Android app, no analytics, and no ads.
        </p>
      </section>

      <section>
        <h2>Data stored on your device</h2>
        <p>
          Your preferences and boards — match-clock state, spawn-alert settings, your My Match
          prep board, and favorited players — are stored locally on your device and never
          leave it. Uninstalling the app deletes them.
        </p>
      </section>

      <section>
        <h2>Notifications</h2>
        <p>
          If you enable spawn alerts, the app schedules local notifications on your device.
          Nothing is sent to any server to make this work.
        </p>
      </section>

      <section>
        <h2>Requests to third-party services</h2>
        <p>
          To show game statistics, the app requests data from these services. Requests include
          what you searched for (for example a hero, item, or a Steam profile name/ID you
          typed) and your IP address, as any internet request does:
        </p>
        <ul>
          <li>
            <a href="https://deadlock-api.com" target="_blank" rel="noreferrer">
              deadlock-api.com
            </a>{' '}
            — community-run Deadlock statistics API (heroes, items, matches, player stats).
          </li>
          <li>
            thecursedapple.app — our own endpoint that resolves Steam vanity URLs via the
            Steam Web API. Queries are not logged or stored by us.
          </li>
          <li>
            Steam profile data shown in the app (names, avatars, ranks) is public information
            from the services above.
          </li>
        </ul>
      </section>

      <section>
        <h2>Steam sign-in (website only)</h2>
        <p>
          The website offers optional Steam sign-in to find your own profile faster. It uses
          Steam's standard OpenID flow — we never see your password, and we store only a
          signed session cookie containing your public Steam account ID. The Android app has
          no sign-in.
        </p>
      </section>

      <section>
        <h2>Children</h2>
        <p>
          The app is a game-statistics reference and is not directed at children under 13.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>If this policy changes, the updated version will be posted at this address.</p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions? Open an issue at{' '}
          <a
            href="https://github.com/jarekjar/deadlock-companion/issues"
            target="_blank"
            rel="noreferrer"
          >
            github.com/jarekjar/deadlock-companion
          </a>
          .
        </p>
      </section>

      <p className="privacy-disclaimer">
        The Cursed Apple is an unofficial fan project. It is not affiliated with or endorsed
        by Valve Corporation. Deadlock and Steam are trademarks of Valve Corporation.
      </p>
    </div>
  )
}
