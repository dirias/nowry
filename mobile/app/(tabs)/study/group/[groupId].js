/**
 * A tag or a system group, opened (MOB-035).
 *
 * `tag:<name>` reaches a tag; `marked` and `struggling` reach the two system
 * groups. One route, because they are one screen — which is the point of
 * treating marked and struggling as groups at all (PRD D3).
 */
import { useLocalSearchParams } from 'expo-router'
import { GroupDetail } from '../../../../src/screens/GroupDetail'

export default function GroupScreen() {
  const { groupId } = useLocalSearchParams()
  return <GroupDetail groupId={groupId} />
}
