/**
 * The placeholder screen, and the mobile half of the ADR-031 guard.
 *
 * It imports the shared package's boundary module — the same one the web client
 * asserts against — so that "the app launched" also means "Metro resolved
 * @nowry/core across the workspace, transformed its createElement provider, and
 * ran it". Those are separate claims everywhere else; here one screen proves
 * both.
 */
import { StatusBar } from 'expo-status-bar'
import { StyleSheet, Text, View } from 'react-native'
import { CORE_BOUNDARY, readBoundary } from '@nowry/core'
import { FONT_SIZE } from '@nowry/core/tokens/tokens'
import { useEffect, useState } from 'react'

export default function Index() {
  const [asyncToken, setAsyncToken] = useState('…')

  useEffect(() => {
    readBoundary({}).then(setAsyncToken)
  }, [])

  return (
    <View style={styles.screen}>
      <StatusBar style='auto' />
      <Text style={styles.title}>Nowry</Text>
      <Text style={styles.line}>shared package: {CORE_BOUNDARY}</Text>
      <Text style={styles.line}>async through it: {asyncToken}</Text>
      <Text style={styles.line}>a token it carries: body {String(FONT_SIZE?.md ?? 'missing')}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  title: { fontSize: 28, fontWeight: '600' },
  line: { fontSize: 14, opacity: 0.7 }
})
