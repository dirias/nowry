/**
 * The placeholder screen, and the proof that the shared package works here.
 *
 * MOB-005 proved Metro could resolve @nowry/core. This proves the platform port
 * is actually wired: a synchronous storage round-trip through MMKV, the API URL
 * the build was given, the language i18next settled on, and whether Firebase
 * restored a session. Those are the four things MOB-006 and MOB-007 claim, and
 * each is visible rather than asserted.
 *
 * Replaced by the real Home in MOB-018.
 */
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useTranslation } from 'react-i18next'
import { auth, env, notify, storage } from '@nowry/core'
import { useTheme } from '../src/theme'
import { apiClient } from '@nowry/core/api/client'

const PROBE_KEY = 'nowry.platformProbe'

export default function Index() {
  const { t, i18n } = useTranslation()
  const theme = useTheme()
  const [roundTrip, setRoundTrip] = useState('not run')
  const [session, setSession] = useState('checking…')
  const [apiResult, setApiResult] = useState('not called')

  useEffect(() => {
    // Synchronous by contract (ADR-027): written and read back on one tick.
    const stamp = String(Date.now())
    storage.set(PROBE_KEY, stamp)
    setRoundTrip(storage.get(PROBE_KEY) === stamp ? 'synchronous, same tick' : 'FAILED')

    const unsubscribe = auth.instance().onAuthStateChanged((user) => {
      setSession(user ? `restored: ${user.email ?? user.uid}` : 'no session')
    })
    return unsubscribe
  }, [])

  /*
   * The whole chain in one press: the shared axios client, the request
   * interceptor reading the token through the port, the base URL from
   * expo-constants, and the response interceptor reporting failures through the
   * notification sink. This is what makes MOB-006's "reaches the API with a
   * valid bearer token" checkable on a device rather than asserted.
   */
  const callApi = async () => {
    setApiResult('calling…')
    try {
      const { data } = await apiClient.get('/users/me')
      setApiResult(`200 — ${data?.email ?? data?.username ?? 'ok'}`)
    } catch (error) {
      setApiResult(`failed — ${error?.response?.status ?? error?.message ?? 'unknown'}`)
    }
  }

  return (
    <ScrollView contentContainerStyle={[styles.screen, { backgroundColor: theme.palette.background.body }]}>
      <StatusBar style='auto' />
      <Text style={[styles.title, { color: theme.palette.text.primary }]}>Nowry</Text>
      <Text style={[styles.label, { color: theme.palette.text.tertiary }]}>
        scheme {theme.scheme} · accent {theme.palette.primary.solidBg} · level1 {theme.palette.background.level1}
      </Text>

      <Row label='storage (MMKV)' value={roundTrip} />
      <Row label='api url' value={env.apiUrl} />
      <Row label='language' value={i18n.language} />
      <Row label='a translated string' value={t('common.save', 'common.save missing')} />
      <Row label='firebase session' value={session} />

      <Row label='api call' value={apiResult} />

      <Pressable
        style={[styles.button, { backgroundColor: theme.palette.primary.solidBg, borderRadius: theme.radius.md, ...theme.elevation.sm }]}
        onPress={() => notify('Notifications reach the client', 'info')}
      >
        <Text style={[styles.buttonText, { color: theme.palette.primary.solidColor }]}>Test the notification sink</Text>
      </Pressable>

      <Pressable
        style={[styles.button, { backgroundColor: theme.palette.primary.solidBg, borderRadius: theme.radius.md, ...theme.elevation.sm }]}
        onPress={callApi}
      >
        <Text style={[styles.buttonText, { color: theme.palette.primary.solidColor }]}>Call the API through the shared client</Text>
      </Pressable>

      <Text style={[styles.footnote, { color: theme.palette.text.tertiary }]}>
        Placeholder for MOB-018. Everything above travels through the shared package and the platform port.
      </Text>
    </ScrollView>
  )
}

function Row({ label, value }) {
  const theme = useTheme()
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: theme.palette.text.tertiary }]}>{label}</Text>
      <Text style={[styles.value, { color: theme.palette.text.primary }]}>{String(value)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: '600', marginBottom: 8 },
  row: { gap: 2 },
  label: { fontSize: 12, opacity: 0.6 },
  value: { fontSize: 15 },
  button: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 16 },
  buttonText: { fontSize: 14, textAlign: 'center' },
  footnote: { marginTop: 24, fontSize: 12 }
})
