/**
 * The companion, answering (MOB-085, `docs/prd-mobile-agent.md`).
 *
 * The phone has shown a creature that grows and never speaks since MOB-050:
 * a name, a level, six stages and a bar. Everything the companion is FOR lives
 * on the web behind a floating chat panel. This is the half of that a phone
 * should carry — it answers — and the PRD's dividing line is not size: what is
 * kept works on a free account and answers a question the learner asked, and
 * what is cut is either a browser affordance with no phone meaning or a paid
 * feature ADR-030 forbids this client from showing.
 *
 * **A screen, not a thing that floats.** The web renders through a portal at
 * `document.body`, is dragged with the pointer, docks to a corner and argues
 * with the Pomodoro widget about which one. A phone has one corner and no
 * pointer. MOB-050 already answered this for the companion itself — it has a
 * place rather than a position — and the chat takes the same answer, so the
 * back gesture and the tab bar behave the way they do everywhere else (D1).
 *
 * **The provider is not mounted.** `AgentProvider` carries the quiz, avatar
 * generation, a nudge fetch and the intervention machinery; its own note says
 * mounting it to draw an orb runs all of that. This screen holds its own turns
 * and calls the service directly, and the budget rides on the companion state
 * Home already caches, so opening the chat costs one request — the reply (D10).
 *
 * **The budget is stated, never sold.** The web's own strings for this offer an
 * upgrade in both of them. Under ADR-030 no screen here may name a plan, a
 * price or an offer, so the phone says the limit is spent and when it returns,
 * and nothing else (D8).
 *
 * Not here, each for a reason the PRD records: the quiz, the portrait, the
 * animation, the personality editor, the settings page, and the proactive
 * nudge. The grounding — asking about the card in front of you — is the next
 * part and is where the value is.
 */
import { useCallback, useRef, useState } from 'react'
import { BackHandler, ScrollView, View } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { agentService } from '@nowry/core/api/services'
import { chatHistory, plainReply, replyText } from '@nowry/core/domain/agentChat'
import { usePetState } from '@nowry/core/hooks/usePetState'
import { isOfflineError } from '@nowry/core/utils/formUtils'
import { takeAskContext } from './askContext'
import { useAppearance, useTheme } from '../theme'
import { Button, Card, Icon, IconButton, Input, PetOrb, Screen, Stack, Typography, useKeyboardClearance, useKeyboardHeight } from '../ui'

/** Whose turn a bubble is. `agent` is the server's `model`; see `chatHistory`. */
const USER = 'user'
const AGENT = 'agent'

/**
 * Which card a context is about, as a value two contexts can be compared by.
 * The front is what the learner is looking at and what the empty state names;
 * two contexts for the same card differ only in whether it has been turned,
 * which is not a new conversation.
 */
const cardOf = (context) => context?.front ?? null

export function AgentChat() {
  const { t, i18n } = useTranslation()
  const theme = useTheme()
  const { accent } = useAppearance()
  const pet = usePetState()
  const router = useRouter()

  /*
   * What this conversation is ABOUT, and where it came from (MOB-086).
   *
   * Taken rather than read, so the card belongs to this opening of the chat:
   * coming back later from Home must not inherit a card someone was looking at
   * then. Held in state so the same card grounds every turn, not only the first
   * — the web's `viewContext` follows the screen for the same reason.
   */
  const [handoff, setHandoff] = useState(takeAskContext)
  const { context, from } = handoff
  const [turns, setTurns] = useState([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [failure, setFailure] = useState(null)
  const scroller = useRef(null)
  // The composer is pinned to the bottom of a screen that does not scroll, so
  // it is exactly where the keyboard opens.
  const keyboard = useKeyboardClearance(useKeyboardHeight())

  const name = pet.name || t('agent.defaultName')
  /*
   * The server is the authority on the budget and answers 429 when it
   * disagrees, so an unknown budget never locks the composer — but a KNOWN
   * spent one does, because sending into it would spend a request to be told
   * what the screen already knows.
   */
  const spent = !pet.canSend

  /*
   * Taken again every time the screen is shown, and this is not belt and
   * braces — it is the whole of MOB-087's second half. `/agent` is a route in
   * the TAB group, so its component is mounted once and kept: closing it does
   * not unmount it, and opening it a second time hands the user the first
   * opening's state. Read only on mount, a chat opened from a card and closed
   * would open from Home still showing that card, and still returning to that
   * session. Focus is when an opening begins, so focus is when the handoff is
   * taken.
   *
   * A focus with nothing pending is the screen coming back to itself — the
   * keyboard closing, the app resuming — and changes nothing.
   */
  useFocusEffect(
    useCallback(() => {
      const next = takeAskContext()
      if (!next.context && !next.from) return

      setHandoff(next)
      // A different card is a different conversation. The same card reopened is
      // the one you stepped out of, and its turns are still the answer.
      if (cardOf(next.context) !== cardOf(context)) {
        setTurns([])
        setDraft('')
        setFailure(null)
      }
    }, [context])
  )

  /*
   * The way out, and the only one (MOB-087). `/agent` is a sibling route in the
   * tab group, so the app bar's shared arrow and the hardware gesture both pop
   * the TAB navigator rather than the screen that pushed this one — asking
   * about a card and closing landed on Home. The opener says where it wants to
   * be put back and this goes there; `navigate` pops to a screen already in the
   * stack rather than mounting a second one, so the session is the same session
   * on the same card.
   */
  const close = useCallback(() => {
    if (from) router.navigate(from)
    else router.back()
  }, [from, router])

  /*
   * The gesture has to agree with the control, or one of them is a trap — and
   * only while this screen is the one being looked at. Registered on mount it
   * would outlive the closing, because the tab screen stays mounted, and then
   * the back gesture ON THE SESSION would be answered by the chat.
   */
  useFocusEffect(
    useCallback(() => {
      const listener = BackHandler.addEventListener('hardwareBackPress', () => {
        close()
        return true
      })
      return () => listener.remove()
    }, [close])
  )

  const send = useCallback(async () => {
    const message = draft.trim()
    if (!message || sending || spent) return

    setSending(true)
    setFailure(null)
    // The turn appears immediately and the field empties: a chat that waits for
    // the server before showing what you typed reads as a dropped message.
    const asked = [...turns, { from: USER, text: message }]
    setTurns(asked)
    setDraft('')

    try {
      const response = await agentService.chat(message, chatHistory(turns), context, i18n?.language ?? 'en')
      /* The companion answers in markdown and this client has no renderer for
         it, so the markers come off rather than onto the screen. */
      setTurns([...asked, { from: AGENT, text: plainReply(replyText(response)) }])
      // The reply carries the month's count, so the footer is right without a
      // second read of the companion state.
      await pet.reload?.()
    } catch (error) {
      // The question stays on screen and the text comes back to the field, so
      // nothing the user wrote is lost to a tunnel.
      setTurns(turns)
      setDraft(message)
      setFailure(isOfflineError(error) ? t('errors.offline') : t('agent.chat.failed'))
    } finally {
      setSending(false)
    }
  }, [draft, sending, spent, turns, context, i18n, t, pet])

  return (
    /*
     * `keyboard='ignore'`, and the keyboard measured instead.
     *
     * `KeyboardAvoidingView` is what `Screen` gives every screen and it is the
     * right answer for fields that sit in the flow and scroll. It is not the
     * answer for a composer pinned to the bottom edge under edge-to-edge — the
     * bottom sheet had to solve exactly this by measuring, and its own note
     * says why. Wrapping in a second one hid the composer; leaving Screen's on
     * AND padding compensated twice, and the composer landed halfway up an
     * empty screen. One mechanism, chosen deliberately.
     */
    <Screen scroll={false} keyboard='ignore'>
      <Stack spacing={2} style={{ flex: 1, paddingBottom: keyboard }}>
        {/* Who you are talking to, drawn at the stage they have reached —
              the same orb Home carries, so the chat is plainly the same
              companion and not a second one. */}
        <Stack direction='row' spacing={2} style={{ alignItems: 'center' }}>
          <PetOrb stage={pet.stage} accent={accent} size={40} />
          <View style={{ flex: 1 }}>
            <Typography level='title-md'>{name}</Typography>
            {pet.budget ? (
              <Typography level='body-xs' color='text.tertiary'>
                {t('agent.chat.remaining', { count: Math.max(0, pet.budget.limit - pet.budget.used) })}
              </Typography>
            ) : null}
          </View>

          {/* The chat's own way out, because the app bar's is not this
              screen's to aim. */}
          <IconButton variant='tertiary' onPress={close} accessibilityLabel={t('agent.aria.closeBuddy')}>
            <Icon name='X' size='sm' color='text.secondary' />
          </IconButton>
        </Stack>

        <ScrollView
          ref={scroller}
          style={{ flex: 1 }}
          contentContainerStyle={{ gap: theme.spacing[1.5], paddingBottom: theme.spacing[1] }}
          onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps='handled'
        >
          {turns.length === 0 ? (
            <Stack spacing={1} style={{ paddingTop: theme.spacing[3] }}>
              <Typography level='title-sm'>{t('agent.chat.empty.title')}</Typography>
              {/* Said, when there is a card. A chat that is silently grounded
                  is one whose answers read as guesses. */}
              <Typography level='body-sm' color='text.tertiary'>
                {context?.front ? t('agent.chat.about', { card: context.front }) : t('agent.chat.empty.body')}
              </Typography>
            </Stack>
          ) : (
            turns.map((turn, index) => <Bubble key={index} turn={turn} theme={theme} />)
          )}

          {sending ? (
            <Typography level='body-sm' color='text.tertiary' accessibilityLiveRegion='polite'>
              {t('agent.chat.thinking')}
            </Typography>
          ) : null}
        </ScrollView>

        {failure ? (
          <Typography level='body-sm' color='danger.plainColor' accessibilityLiveRegion='polite'>
            {failure}
          </Typography>
        ) : null}

        {/* Said, and nothing offered (D8). */}
        {spent ? (
          <Typography level='body-sm' color='text.tertiary' accessibilityLiveRegion='polite'>
            {t('agent.chat.budgetSpent')}
          </Typography>
        ) : (
          <Stack direction='row' spacing={1} style={{ alignItems: 'flex-end' }}>
            <Input
              value={draft}
              onChangeText={setDraft}
              placeholder={t('agent.inputPlaceholder')}
              accessibilityLabel={t('agent.inputAriaLabel')}
              multiline
              style={{ flex: 1 }}
            />
            {/* The return key makes a new line on a touch keyboard, which is
                  what its users expect, so sending is the key's job (PET-019
                  takes the same branch on a coarse pointer). */}
            <Button size='md' loading={sending} disabled={!draft.trim()} onPress={send} accessibilityLabel={t('agent.aria.sendMessage')}>
              <Icon name='ArrowUp' size='sm' color='primary.solidColor' />
            </Button>
          </Stack>
        )}
      </Stack>
    </Screen>
  )
}

/**
 * One turn.
 *
 * The learner's own words sit on `level1` — the ground that means a control,
 * which is what a thing you wrote and sent is — and the companion's answer sits
 * on the page with no ground at all, because it is the content this screen is
 * for. Neither is a coloured speech bubble: a hue here would be a grade
 * somewhere else in this app (§15.5).
 */
function Bubble({ turn, theme }) {
  const mine = turn.from === USER

  if (!mine) {
    return (
      <Typography level='body-md' accessibilityLiveRegion='polite'>
        {turn.text}
      </Typography>
    )
  }

  return (
    <Card padding={1.5} radius='md' style={{ alignSelf: 'flex-end', maxWidth: '85%' }}>
      <Typography level='body-md'>{turn.text}</Typography>
    </Card>
  )
}

export default AgentChat
