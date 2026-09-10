/**
 * The tab bar: Home, Study, Plan, Focus.
 *
 * Four. The web has fourteen routes; a phone's bar holds three to five
 * top-level destinations before each becomes a target you aim at rather than
 * press, which is where both platforms' own guidance puts it. What is not in
 * the bar is not hidden behind a "more" tab, which is where features go to be
 * forgotten.
 *
 * **Profile is not a destination here, and it never needed to be.** The app bar
 * carries the account at the head of every screen, and that control already
 * opened this exact route: two controls, one destination, everywhere in the app
 * (MOB-048). The account belongs in the app bar on both platforms' guidance and
 * that is where this product's own web client puts it. The route stays; only
 * its button is gone.
 *
 * Plan holds two views — the calendar and the year's plan — on one segment,
 * which is the Study Center's own arrangement. Books, when it lands, needs a
 * decision about where it lives rather than an edit here.
 *
 * Route names mirror the web's, so `nowry://study/<deckId>` and
 * `https://nowry.app/study/<deckId>` are the same path with no translation
 * table between them.
 *
 * **Two bars, and they carry different things.** The app bar at the head is
 * identity — the mark and the account — exactly as every phone artboard draws
 * it. Navigation is at the foot, where a thumb reaches. The web puts both in
 * its header because a mouse has a pointer and a wide screen; splitting them is
 * why a phone can have two bars without one being redundant.
 *
 * **Each bar holds the inset at its own edge**, because each is the chrome
 * closest to it. Android draws this app under the system bars (edge-to-edge in
 * `app.config.js`), and nothing was holding the bottom one: the last tab sat
 * against the system navigation. Screens between the two defer both insets
 * through `ScreenChromeProvider`, so each is held exactly once.
 */
import { Tabs } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../src/theme'
import { AppBar } from '../../src/ui'
import { ScreenChromeProvider } from '../../src/ui/screenChrome'
import { Icon } from '../../src/ui'
import { NAV_ICONS } from '../../src/ui/icons'
import { resolveColor } from '../../src/ui/Typography'

/** The bar's own height, before the system navigation is added under it. */
const TAB_BAR_HEIGHT = 56

export default function TabsLayout() {
  const { t } = useTranslation()
  const theme = useTheme()
  const insets = useSafeAreaInsets()

  return (
    <ScreenChromeProvider top bottom>
      <Tabs
        screenOptions={{
          // The board's bar, not a navigator's: it is the same on every tab and
          // on every screen pushed above them.
          header: () => <AppBar />,
          tabBarActiveTintColor: resolveColor(theme, 'primary.plainColor'),
          tabBarInactiveTintColor: resolveColor(theme, 'text.tertiary'),
          tabBarStyle: {
            backgroundColor: resolveColor(theme, 'background.surface'),
            borderTopColor: resolveColor(theme, 'divider'),
            // The bar grows by the inset rather than moving up by it, so its
            // ground still reaches the bottom of the window and the system
            // navigation sits on the app's own surface rather than a seam.
            height: TAB_BAR_HEIGHT + insets.bottom,
            paddingBottom: insets.bottom
          }
        }}
      >
        <Tabs.Screen
          name='index'
          options={{ title: t('nav.home'), tabBarIcon: ({ color }) => <TabIcon name={NAV_ICONS.home} color={color} /> }}
        />
        <Tabs.Screen
          name='study'
          options={{ title: t('nav.study'), tabBarIcon: ({ color }) => <TabIcon name={NAV_ICONS.study} color={color} /> }}
        />
        <Tabs.Screen
          name='calendar'
          options={{ title: t('annualPlanning.title'), tabBarIcon: ({ color }) => <TabIcon name={NAV_ICONS.plan} color={color} /> }}
        />
        {/* A redirect into the Plan tab, kept because it is the web's own path
            and Home's next-steps row uses it. `href: null` is how Expo Router
            says "a route here, no button for it". */}
        <Tabs.Screen name='annual-planning' options={{ href: null }} />
        <Tabs.Screen
          name='pomodoro'
          options={{ title: t('nav.focus'), tabBarIcon: ({ color }) => <TabIcon name={NAV_ICONS.focus} color={color} /> }}
        />
        {/* A route, not a tab: the app bar's account opens it from anywhere,
            and inside the group so the bar stays under it. */}
        <Tabs.Screen name='profile' options={{ href: null }} />
      </Tabs>
    </ScreenChromeProvider>
  )
}

/**
 * The tab bar hands us a resolved colour rather than a token, because it
 * interpolates between active and inactive. This is the one place a literal is
 * correct, and it is React Navigation's literal, not ours.
 */
function TabIcon({ name, color }) {
  return <Icon name={name} size='md' literalColor={color} />
}
