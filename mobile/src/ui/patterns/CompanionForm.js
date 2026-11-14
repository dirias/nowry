/**
 * One of Nowry's six forms, in its stage's colour (EVO-018, ADR-051).
 *
 * The web's `CompanionArt`, on the phone. The painted form ships with the app;
 * the first time a stage is shown in a colour it is recoloured on the device
 * (`companionArt.recolorPng`, the shared rule) and kept as a file in the cache,
 * so after that it is a plain image. Until it is ready, and if anything in that
 * fails, the painted original shows: the companion is never missing, only
 * briefly in the painted teal.
 *
 * Only `PetOrb` draws this. Everywhere the phone shows the companion goes
 * through the orb, so a form is the same form on every screen.
 */
import { useEffect, useState } from 'react'
import { Image, View } from 'react-native'
import { Asset } from 'expo-asset'
import { File, Paths } from 'expo-file-system'
import { artColor, artFileName, artShare, recolorPng } from './companionArt'

const PAINTED = {
  1: require('../../../assets/companion/stage-1.png'),
  2: require('../../../assets/companion/stage-2.png'),
  3: require('../../../assets/companion/stage-3.png'),
  4: require('../../../assets/companion/stage-4.png'),
  5: require('../../../assets/companion/stage-5.png'),
  6: require('../../../assets/companion/stage-6.png')
}

/** Recoloured files already on this device, by name, for this run of the app. */
const ready = new Map()
/** Recolourings under way, so two orbs on one screen share one. */
const pending = new Map()

async function recolored(stage, color) {
  const name = artFileName(stage, color)
  if (ready.has(name)) return ready.get(name)
  if (!pending.has(name)) {
    pending.set(
      name,
      (async () => {
        const file = new File(Paths.cache, name)
        if (!file.exists) {
          const [asset] = await Asset.loadAsync(PAINTED[stage])
          const painted = await new File(asset.localUri ?? asset.uri).bytes()
          file.create({ overwrite: true })
          file.write(recolorPng(painted, color))
        }
        ready.set(name, file.uri)
        return file.uri
      })().finally(() => pending.delete(name))
    )
  }
  return pending.get(name)
}

/** The form's image in its stage's colour, or the painted original until that is ready. */
export function useCompanionArt(stage, accent) {
  const form = PAINTED[stage] ? stage : 1
  const color = artColor(accent, form)
  const name = artFileName(form, color)
  const [uri, setUri] = useState(() => ready.get(name) ?? null)

  useEffect(() => {
    let live = true
    setUri(ready.get(name) ?? null)
    recolored(form, color)
      .then((result) => live && setUri(result))
      .catch(() => {
        // The painted original stays: a companion in teal, never a hole.
      })
    return () => {
      live = false
    }
  }, [form, color, name])

  return uri ? { uri } : PAINTED[form]
}

/** The form, `size` points square, filling its stage's share of that square, or `fill` of it. */
export function CompanionForm({ stage = 1, accent = null, size = 56, fill = null }) {
  const source = useCompanionArt(stage, accent)
  const art = Math.round(size * (fill ?? artShare(PAINTED[stage] ? stage : 1)))
  return (
    <View
      importantForAccessibility='no-hide-descendants'
      accessible={false}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <Image source={source} style={{ width: art, height: art }} resizeMode='contain' accessible={false} />
    </View>
  )
}

export default CompanionForm
