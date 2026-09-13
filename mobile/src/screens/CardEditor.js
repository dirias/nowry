/**
 * Card create and edit (MOB-023).
 *
 * One screen for both, on the shared `useCardForm`, so the required rules, the
 * type table, the disclosure rail and the payloads are the web's — not a second
 * opinion about what a valid card is.
 *
 * **Flashcard and quiz only.** A visual card's validity is decided by a
 * renderer: the web's preview IS its validation surface, and there is no
 * Mermaid renderer on the phone. Offering the type would mean letting someone
 * type diagram source blind and save something they cannot see. A visual card
 * opened here says where it is edited instead, and its diagram survives
 * untouched — every save is a PATCH, so a field the phone never sends is a
 * field the server never changes.
 *
 * **A full screen, not a sheet.** A quiz card is a question, four options and
 * an explanation. `Screen` already owns the keyboard inset, so the field being
 * typed into stays above the keyboard at any font scale; a bottom sheet would
 * have had to solve that a second time in less room.
 *
 * **Leaving with unsaved writing asks first.** The gesture that goes back is
 * the same one that goes back from a screen with nothing at stake, so the
 * screen has to be the thing that knows the difference.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, View } from 'react-native'
import { useNavigation, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import useCardForm from '@nowry/core/hooks/useCardForm'
import { RAIL_LABELS } from '@nowry/core/domain/cardTypes'
import { useDeckData } from '@nowry/core/hooks/useDeckData'
import {
  Button,
  Chip,
  Divider,
  FormField,
  Icon,
  IconButton,
  Input,
  Radio,
  Screen,
  Segmented,
  Select,
  Stack,
  TagField,
  Typography
} from '../ui'

/** The two types a phone can author. `visual` is read on the web. */
const TYPES = ['flashcard', 'quiz']

const OPTION_FLOOR = 2
const OPTION_CEILING = 6

export function CardEditor({ card = null, deckId = null }) {
  const { t } = useTranslation()
  const router = useRouter()
  const navigation = useNavigation()
  const decks = useDeckData()

  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(0)

  // `card` doubles as the preset when it carries only a deck: `useCardForm`
  // reads `deck_id` off it and leaves `isEdit` false, which is how the web
  // opens a create sheet from inside a deck.
  const seed = card ?? (deckId ? { deck_id: deckId } : null)

  const form = useCardForm({
    open: true,
    card: seed,
    onSaved: () => {
      setDirty(false)
      setSaved((n) => n + 1)
    },
    onClose: () => router.back()
  })

  const setField = useCallback(
    (field, value) => {
      setDirty(true)
      form.setField(field, value)
    },
    [form]
  )

  /*
   * `beforeRemove` rather than a header button: the back gesture, the back
   * button and the header arrow all arrive here, and guarding only one of them
   * guards nothing.
   */
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (event) => {
        if (!dirtyRef.current) return
        event.preventDefault()
        Alert.alert(t('cards.common.discardTitle'), t('cards.common.discardBody'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('settings.learning.discard'), style: 'destructive', onPress: () => navigation.dispatch(event.data.action) }
        ])
      }),
    [navigation, t]
  )

  const isVisual = form.cardType === 'visual'
  const options = form.values.options ?? []

  const setOption = (index, value) =>
    setField(
      'options',
      options.map((option, i) => (i === index ? value : option))
    )

  if (isVisual) {
    return (
      <Screen>
        <Stack spacing={2}>
          <Typography level='h4'>{t('cards.common.typeVisual')}</Typography>
          <Typography level='body-md' color='text.secondary'>
            {t('cards.visual.editOnWeb')}
          </Typography>
          <Typography level='body-lg'>{form.values.title}</Typography>
          <Button variant='secondary' onPress={() => router.back()}>
            {t('cards.session.goBack')}
          </Button>
        </Stack>
      </Screen>
    )
  }

  return (
    <Screen>
      <Stack spacing={2}>
        <Typography level='h4'>{t(form.isEdit ? form.spec.editTitleKey : form.spec.createTitleKey)}</Typography>

        {/* Edit states the type rather than offering it: a card's type cannot
            change once it holds fields the other type has no room for. */}
        {form.isEdit ? (
          <Typography level='body-sm' color='text.tertiary'>
            {t(form.spec.nameKey)}
          </Typography>
        ) : (
          <Segmented
            accessibilityLabel={t('cards.common.typeSelectorAria')}
            value={form.cardType}
            onChange={form.requestType}
            options={TYPES.map((type) => ({ value: type, label: t(`cards.common.type${type[0].toUpperCase()}${type.slice(1)}`) }))}
          />
        )}

        {/* Inline, not a second surface over this one: the question is about
            the form the user is looking at. */}
        {form.pendingType ? (
          <Stack spacing={1}>
            <Typography level='body-sm' color='warning.plainColor' accessibilityLiveRegion='polite'>
              {t('cards.common.switchTypeWarning')}
            </Typography>
            <Stack direction='row' spacing={1}>
              <Button size='sm' variant='secondary' onPress={form.confirmTypeChange}>
                {t('cards.common.switchTypeConfirm')}
              </Button>
              <Button size='sm' variant='tertiary' onPress={form.cancelTypeChange}>
                {t('common.cancel')}
              </Button>
            </Stack>
          </Stack>
        ) : null}

        <FormField
          labelKey={form.cardType === 'quiz' ? 'cards.quiz.questionLabel' : 'cards.flashcard.frontLabel'}
          errorKey={form.errors.title}
          required
        >
          <Input
            value={form.values.title}
            onChangeText={(value) => setField('title', value)}
            placeholder={t(form.cardType === 'quiz' ? 'cards.quiz.questionPlaceholder' : 'cards.flashcard.frontPlaceholder')}
            accessibilityLabel={t(form.cardType === 'quiz' ? 'cards.quiz.questionLabel' : 'cards.flashcard.frontLabel')}
            invalid={Boolean(form.errors.title)}
            multiline
          />
        </FormField>

        {form.cardType === 'flashcard' ? (
          <FormField labelKey='cards.flashcard.backLabel' errorKey={form.errors.content} required>
            <Input
              value={form.values.content}
              onChangeText={(value) => setField('content', value)}
              placeholder={t('cards.flashcard.backPlaceholder')}
              accessibilityLabel={t('cards.flashcard.backLabel')}
              invalid={Boolean(form.errors.content)}
              multiline
            />
          </FormField>
        ) : (
          <FormField labelKey='cards.quiz.optionsLabel' errorKey={form.errors.options || form.errors.correctIndex}>
            <Stack spacing={1}>
              {options.map((option, index) => (
                <Stack key={index} direction='row' spacing={1} style={{ alignItems: 'center' }}>
                  {/* The mark IS the answer: which option is correct is not a
                      separate field the user has to find. */}
                  <Radio
                    checked={form.values.correctIndex === index}
                    onPress={() => setField('correctIndex', index)}
                    accessibilityLabel={t('cards.quiz.correctAria', { number: index + 1 })}
                  />
                  <View style={{ flex: 1 }}>
                    <Input
                      value={option}
                      onChangeText={(value) => setOption(index, value)}
                      placeholder={t('cards.quiz.optionPlaceholder', { number: index + 1 })}
                      accessibilityLabel={t('cards.quiz.optionPlaceholder', { number: index + 1 })}
                    />
                  </View>
                  {options.length > OPTION_FLOOR ? (
                    <IconButton
                      accessibilityLabel={t('cards.quiz.removeOptionAria', { number: index + 1 })}
                      onPress={() => {
                        setField(
                          'options',
                          options.filter((_, i) => i !== index)
                        )
                        // The index names a position, so removing one above the
                        // answer would silently move the answer.
                        if (form.values.correctIndex === index) setField('correctIndex', null)
                        else if (form.values.correctIndex > index) setField('correctIndex', form.values.correctIndex - 1)
                      }}
                    >
                      <Icon name='X' size='sm' />
                    </IconButton>
                  ) : null}
                </Stack>
              ))}
              {options.length < OPTION_CEILING ? (
                <Button size='sm' variant='tertiary' onPress={() => setField('options', [...options, ''])}>
                  {t('cards.quiz.addOption')}
                </Button>
              ) : null}
            </Stack>
          </FormField>
        )}

        {form.revealed.has('explanation') ? (
          <FormField labelKey='cards.quiz.explanationLabel'>
            <Input
              value={form.values.explanation}
              onChangeText={(value) => setField('explanation', value)}
              placeholder={t('cards.quiz.explanationPlaceholder')}
              accessibilityLabel={t('cards.quiz.explanationLabel')}
              multiline
            />
          </FormField>
        ) : null}

        {form.revealed.has('tags') ? (
          // The field that let a comma vanish as it was typed; see TagField (MOB-102).
          <TagField value={form.values.tags ?? []} onChange={(tags) => setField('tags', tags)} helperKey='form.tagsCommaHelper' />
        ) : null}

        {form.revealed.has('deck') ? (
          <FormField labelKey='form.deckLabel'>
            <Select
              accessibilityLabel={t('form.deckLabel')}
              value={form.values.deckId ?? ''}
              onChange={(value) => setField('deckId', value)}
              placeholderKey='form.deckPlaceholder'
              options={[
                { value: '', label: t('form.deckNone') },
                ...(decks.decks ?? []).map((deck) => ({ value: deck._id ?? deck.id, label: deck.name }))
              ]}
            />
          </FormField>
        ) : null}

        <Stack direction='row' spacing={1}>
          {form.availableChips.map((group) => (
            <Chip key={group} size='sm' onPress={() => form.reveal(group)} accessibilityLabel={t(RAIL_LABELS[group])}>
              {t(RAIL_LABELS[group])}
            </Chip>
          ))}
        </Stack>

        {/* The limit is stated, not sold against: ADR-030 keeps purchase off
            the phone, so there is no Upgrade button here as there is on web. */}
        {form.saveError ? (
          <Typography level='body-sm' color='danger.plainColor' accessibilityLiveRegion='polite'>
            {form.saveErrorOffline ? t('errors.offline') : form.limitReached ? t('subscription.errors.limitReached') : form.saveError}
          </Typography>
        ) : null}

        <Divider />

        {/* Create keeps the screen and clears the fields, because nobody makes
            one flashcard; edit is done when it is saved. */}
        <Button onPress={form.primaryAction} loading={form.saving}>
          {t(form.isEdit ? 'common.save' : 'form.saveAndNext')}
        </Button>

        {saved > 0 && !form.isEdit ? (
          <Typography level='body-sm' color='text.tertiary' accessibilityLiveRegion='polite'>
            {t('form.addedCount', { count: saved })}
          </Typography>
        ) : null}
      </Stack>
    </Screen>
  )
}

export default CardEditor
