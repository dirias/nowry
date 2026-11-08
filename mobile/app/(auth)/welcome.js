/**
 * Welcome — the phone's front door (docs/prd-public-site.md D-M1 as amended by
 * D-M9 and D-M13, SITE-009, MOB-124, MOB-128).
 *
 * The first cut was the landing's first view with the wordmark in the body and
 * the loop as four rows, and it asked a stranger to trust a reading list. This
 * is the web's hero order: the headline first (the bar above names the product
 * now, so no wordmark here), the sentence, then the product itself, drawn from
 * the same tokens, with its caption, and the loop under it for whoever scrolls.
 *
 * **One frame, so the one claim nobody else makes.** The web has five frames,
 * one per step of the loop; this screen has one above the fold. It showed Home
 * on the phone first, which on a phone proves what the visitor already holds
 * and reads as a to-do list (PRD E-M15). It shows a card with its source now:
 * a book, a card made from it, and the schedule's four keys in one object.
 *
 * **The door is a slot, not a position in the scroll.** The two actions used to
 * be "pinned" by being last, and on a 1080 × 2400 screen the Sign in key was
 * cut to a sliver at the fold. They sit in a View outside the ScrollView now,
 * on the body ground with a hairline above, and the screen's own bottom inset
 * puts the home indicator under them — the tab bar's rule, one screen earlier.
 */
import { Fragment } from 'react'
import { ScrollView, View } from 'react-native'
import { Link } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../src/theme'
import { Button, CardFrame, Divider, Screen, Stack, Typography } from '../../src/ui'

/** The product's own order (PRD D3): the same keys the web's loop reads. */
const STEPS = ['read', 'cards', 'study', 'plan']

export default function Welcome() {
  const { t } = useTranslation()
  const theme = useTheme()

  return (
    // No keyboard on this screen and no companion bubble over a guest, so the
    // screen is a plain frame: the scroll above, the slot below.
    <Screen scroll={false} padding={0} keyboard='ignore'>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: theme.spacing[3] }}>
        <Stack spacing={3}>
          <Stack spacing={1.5}>
            <Typography level='h1' accessibilityRole='header'>
              {t('landing.hero.title')}
            </Typography>
            <Typography level='body-md' color='text.secondary'>
              {t('landing.hero.lead')}
            </Typography>
          </Stack>

          <Stack spacing={1}>
            <CardFrame />
            <Typography level='body-xs' color='text.tertiary'>
              {t('landing.hero.cardCaption')}
            </Typography>
          </Stack>

          <Stack accessibilityRole='list'>
            {STEPS.map((step, index) => (
              <Fragment key={step}>
                <Divider />
                <Stack direction='row' spacing={1.5} alignItems='flex-start' style={{ paddingVertical: theme.spacing[1.5] }}>
                  <Typography level='title-sm' color='text.tertiary' style={{ width: 22, fontVariant: ['tabular-nums'] }}>
                    {String(index + 1).padStart(2, '0')}
                  </Typography>
                  <Stack spacing={0.5} flex={1}>
                    <Typography level='title-md'>{t(`landing.loop.${step}.title`)}</Typography>
                    <Typography level='body-sm' color='text.secondary'>
                      {t(`landing.loop.${step}.desc`)}
                    </Typography>
                  </Stack>
                </Stack>
              </Fragment>
            ))}
          </Stack>
        </Stack>
      </ScrollView>

      <View>
        <Divider />
        <Stack
          spacing={1.5}
          style={{ paddingHorizontal: theme.spacing[3], paddingTop: theme.spacing[2], paddingBottom: theme.spacing[1.5] }}
        >
          <Link href='/register' asChild>
            <Button size='lg' accessibilityLabel={t('landing.hero.cta')}>
              {t('landing.hero.cta')}
            </Button>
          </Link>
          <Link href='/login' asChild>
            <Button variant='secondary' size='lg' accessibilityLabel={t('auth.signIn')}>
              {t('auth.signIn')}
            </Button>
          </Link>
          <Typography level='body-xs' color='text.tertiary'>
            {t('auth.createAccountSubtitle')}
          </Typography>
        </Stack>
      </View>
    </Screen>
  )
}
