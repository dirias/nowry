/**
 * The three surfaces a bulk verb needs before it runs (MOB-036).
 *
 * Move and Tag ask which one; Delete asks whether. `useBulkCardActions` holds
 * which ids are waiting on each, so the bar and this file only ever ask and
 * answer — the verb itself runs in one place, shared with the web.
 *
 * **Delete is the platform alert, not a sheet.** A sheet is for choosing; a
 * stop is for reading. `Alert` is modal, cancel-by-default and announced,
 * without any of our own code — the same reasoning as archiving a deck.
 */
import { useEffect } from 'react'
import { Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { BottomSheet, Button, Divider, ListRow, Stack, Typography } from '../ui'

export function BulkOverlays({ bulk, decks = [], tags = [] }) {
  const { t } = useTranslation()
  const { deleteIds, cancelDelete, confirmDelete } = bulk

  /*
   * The confirm is an effect rather than a render, because `Alert` is a call
   * and not a component. Cancelling has to clear the pending ids or the alert
   * would never open a second time.
   */
  useEffect(() => {
    if (!deleteIds || deleteIds.length === 0) return
    const count = deleteIds.length
    Alert.alert(t('cards.select.deleteTitle', { count }), t('cards.select.deleteDescription', { count }), [
      { text: t('common.cancel'), style: 'cancel', onPress: cancelDelete },
      { text: t('cards.select.deleteConfirm', { count }), style: 'destructive', onPress: confirmDelete }
    ])
  }, [deleteIds, t, cancelDelete, confirmDelete])

  const moving = Boolean(bulk.moveIds && bulk.moveIds.length > 0)

  return (
    <>
      <BottomSheet visible={moving} onClose={bulk.cancelMove} title={t('cards.select.moveTo')}>
        <Stack spacing={0}>
          {decks.length === 0 ? (
            <Typography level='body-sm' color='text.tertiary'>
              {t('form.deckEmpty')}
            </Typography>
          ) : (
            decks.map((deck) => (
              <ListRow key={deck._id ?? deck.id} name={deck.name} onPress={() => bulk.confirmMove(deck._id ?? deck.id)} />
            ))
          )}
        </Stack>
      </BottomSheet>

      <BottomSheet visible={bulk.tagging} onClose={bulk.cancelTag} title={t('cards.select.tag')}>
        <Stack spacing={0}>
          {tags.length === 0 ? (
            <Typography level='body-sm' color='text.tertiary'>
              {t('groups.emptyTags')}
            </Typography>
          ) : (
            tags.map((tag) => <ListRow key={tag} name={tag} onPress={() => bulk.confirmTag(tag)} />)
          )}
        </Stack>
      </BottomSheet>

      {bulk.error ? (
        <BottomSheet visible onClose={bulk.clearError} title={t('cards.select.error')}>
          <Stack spacing={2}>
            <Typography level='body-md' color='text.secondary'>
              {bulk.error}
            </Typography>
            <Divider />
            <Button variant='secondary' onPress={bulk.clearError}>
              {t('common.close')}
            </Button>
          </Stack>
        </BottomSheet>
      ) : null}
    </>
  )
}

export default BulkOverlays
