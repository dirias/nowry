/** Built in MOB-016 (email) and MOB-017 (Google). */
import { useRouter } from 'expo-router'
import { Button, Screen, Stack, Typography } from '../../src/ui'

export default function Screen_login() {
  const router = useRouter()
  return (
    <Screen>
      <Stack spacing={2}>
        <Typography level='h4'>login</Typography>
        <Typography level='body-sm' color='text.tertiary'>
          Placeholder for MOB-016.
        </Typography>
        <Button size='sm' variant='tertiary' onPress={() => router.replace('/login')}>
          Back to sign in
        </Button>
      </Stack>
    </Screen>
  )
}
