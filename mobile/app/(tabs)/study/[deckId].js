/**
 * An active study session. Built in MOB-022.
 *
 * This is the deep-link target: `nowry://study/<deckId>` lands here, which is
 * the same path the web serves at `/study/:deckId`.
 */
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Button, Screen, Stack, Typography } from '../../../src/ui'

export default function StudySession() {
  const { deckId } = useLocalSearchParams()
  const router = useRouter()

  return (
    <Screen>
      <Stack spacing={2}>
        <Typography level='h4'>Session</Typography>
        <Typography level='body-md' color='text.secondary'>
          deck: {String(deckId)}
        </Typography>
        <Typography level='body-sm' color='text.tertiary'>
          Placeholder for MOB-022. Reached by nowry://study/{String(deckId)}.
        </Typography>
        {/* Completing a session returns to the Study tab root, never to a cards route. */}
        <Button size='sm' variant='secondary' onPress={() => router.replace('/study')}>
          Finish
        </Button>
      </Stack>
    </Screen>
  )
}
