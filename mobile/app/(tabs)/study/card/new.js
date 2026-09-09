/**
 * A new card (MOB-023). `?deckId=` preselects the deck it is made in.
 *
 * A static segment, so it is matched before `[cardId]` and no card can ever be
 * called "new".
 */
import { useLocalSearchParams } from 'expo-router'
import { CardEditor } from '../../../../src/screens/CardEditor'

export default function NewCard() {
  const { deckId } = useLocalSearchParams()
  return <CardEditor deckId={deckId ? String(deckId) : null} />
}
