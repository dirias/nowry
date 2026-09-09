/**
 * Create a deck (MOB-021).
 *
 * A bottom sheet over the library, on the shared `useDeckForm` — the same hook
 * the web's create sheet uses, so the fields, the validation, the tier limit and
 * the payload sent to the server are identical. Import is out of scope; this
 * creates one deck.
 *
 * **Only `description` is offered on the rail.** The form system reveals
 * description, tags and image behind chips. Tags need a tag input and image
 * needs a picker, and the mobile kit has neither yet; a chip that reveals a
 * field we cannot draw is worse than no chip. Both come with card creation
 * (MOB-023), which needs the same two controls, and this list grows then.
 *
 * `focusControl` is not passed: moving focus is the client's job (MOB-003B) and
 * a phone has no keyboard focus to move. The hook defaults to a no-op, which is
 * the right answer here rather than an omission.
 */
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import useDeckForm from '@nowry/core/hooks/useDeckForm'
import { BottomSheet, Button, Chip, FormField, Input, Stack, Typography } from '../ui'

/** The rail groups this client can actually draw. See the note above. */
const PHONE_GROUPS = { description: 'cards.create.addDescription' }

export function DeckCreateSheet({ visible, onClose, onCreated }) {
  const { t } = useTranslation()
  const router = useRouter()
  const form = useDeckForm({ open: visible, onSaved: onCreated, onClose })
  const created = form.createdDeck

  /*
   * The web keeps the sheet open on success and offers "Add cards", because a
   * deck's value moment is its first card. There is no card screen on the phone
   * until MOB-023, so the continuation here is the deck itself — where the
   * name, pace and audio are — rather than a button that leads nowhere.
   */
  const finish = () => {
    const deck = created
    form.dismiss()
    if (deck?.id) router.push(`/study/deck/${deck.id}`)
  }

  return (
    <BottomSheet visible={visible} onClose={form.dismiss} title={t(created ? 'cards.create.createdTitle' : 'cards.create.newTitle')}>
      {created ? (
        <Stack spacing={2}>
          <Typography level='title-md'>{created.name}</Typography>
          <Button onPress={finish} accessibilityLabel={t('cards.create.done')}>
            {t('cards.create.done')}
          </Button>
        </Stack>
      ) : (
        <Stack spacing={2}>
          <FormField labelKey='cards.create.fields.name' errorKey={form.errors.name} required>
            <Input
              value={form.values.name}
              onChangeText={(v) => form.setField('name', v)}
              placeholder={t('cards.create.fields.namePlaceholder')}
              accessibilityLabel={t('cards.create.fields.name')}
              invalid={Boolean(form.errors.name)}
              returnKeyType='next'
            />
          </FormField>

          {form.revealed.has('description') ? (
            <FormField labelKey='cards.create.fields.description'>
              <Input
                value={form.values.description}
                onChangeText={(v) => form.setField('description', v)}
                placeholder={t('cards.create.fields.descriptionPlaceholder')}
                accessibilityLabel={t('cards.create.fields.description')}
                multiline
              />
            </FormField>
          ) : null}

          <Stack direction='row' spacing={1}>
            {form.availableChips
              .filter((group) => PHONE_GROUPS[group])
              .map((group) => (
                <Chip key={group} size='sm' onPress={() => form.reveal(group)} accessibilityLabel={t(PHONE_GROUPS[group])}>
                  {t(PHONE_GROUPS[group])}
                </Chip>
              ))}
          </Stack>

          {/* The plan limit is not a validation failure, so it says what it is
              and points at the page that can change it. */}
          {form.saveError ? (
            <Typography level='body-sm' color='danger.plainColor' accessibilityLiveRegion='polite'>
              {form.limitReached ? t('subscription.errors.limitReached') : form.saveError}
            </Typography>
          ) : null}

          {form.limitReached ? (
            <Button
              variant='secondary'
              onPress={() => {
                form.dismiss()
                router.push('/profile')
              }}
              accessibilityLabel={t('subscription.upgrade')}
            >
              {t('subscription.upgrade')}
            </Button>
          ) : null}

          <Button onPress={form.create} loading={form.saving} accessibilityLabel={t('cards.create.create')}>
            {t('cards.create.create')}
          </Button>
        </Stack>
      )}
    </BottomSheet>
  )
}

export default DeckCreateSheet
