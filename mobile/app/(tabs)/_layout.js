/**
 * The tab bar: Home, Study, Focus, Profile.
 *
 * Four, deliberately. The web has fourteen routes; a phone's tab bar holds four
 * or five before each one becomes a target you aim at rather than press. What is
 * not here — Books, Calendar, Annual Planning — is out of v1 by ADR-030, not
 * hidden behind a "more" tab, which is where features go to be forgotten.
 *
 * Route names mirror the web's, so `nowry://study/<deckId>` and
 * `https://nowry.app/study/<deckId>` are the same path with no translation
 * table between them.
 */
import { Tabs } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../src/theme'
import { Icon } from '../../src/ui'
import { NAV_ICONS } from '../../src/ui/icons'
import { resolveColor } from '../../src/ui/Typography'

export default function TabsLayout() {
  const { t } = useTranslation()
  const theme = useTheme()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: resolveColor(theme, 'primary.plainColor'),
        tabBarInactiveTintColor: resolveColor(theme, 'text.tertiary'),
        tabBarStyle: {
          backgroundColor: resolveColor(theme, 'background.surface'),
          borderTopColor: resolveColor(theme, 'divider')
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
        name='pomodoro'
        options={{ title: t('nav.focus'), tabBarIcon: ({ color }) => <TabIcon name={NAV_ICONS.focus} color={color} /> }}
      />
      <Tabs.Screen
        name='profile'
        options={{ title: t('nav.profile'), tabBarIcon: ({ color }) => <TabIcon name={NAV_ICONS.profile} color={color} /> }}
      />
    </Tabs>
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
