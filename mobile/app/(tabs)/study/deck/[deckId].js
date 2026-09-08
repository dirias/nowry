/** Deck detail and settings. Built in MOB-021. */
import { useLocalSearchParams } from 'expo-router'
import { Screen, Stack, Typography } from '../../../../src/ui'

export default function DeckDetail() {
  const { deckId } = useLocalSearchParams()
  return (
    <Screen>
      <Stack spacing={2}>
        <Typography level='h4'>Deck</Typography>
        <Typography level='body-md' color='text.secondary'>
          {String(deckId)}
        </Typography>
        <Typography level='body-sm' color='text.tertiary'>
          Placeholder for MOB-021.
        </Typography>
      </Stack>
    </Screen>
  )
}
