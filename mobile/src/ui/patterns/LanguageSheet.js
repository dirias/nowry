/**
 * The language switch a guest gets in the app bar (MOB-123, ADR-061 §2).
 *
 * The web's header has always offered the five bundles to a visitor; the
 * phone's guest screens offered nothing, so a stranger whose device speaks a
 * sixth language read English with no way out. The switch sits in the bar's
 * right slot — the slot that says whose screen this is — and is drawn only
 * when there is no account to put there.
 *
 * It is a bottom sheet, not a dropdown, for the reason `ChoiceSheet` gives: a
 * phone has nothing to anchor a menu to. Choosing calls `changeLanguage` on the
 * shared singleton; the detector's `cacheUserLanguage` remembers it, so the
 * choice survives a restart and is the one the account inherits at sign-up.
 *
 * `LANGUAGES` lives here rather than in Settings because two screens now list
 * the same five, and a list written twice is a list that disagrees once.
 */
import { useState } from 'react'
import { Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Icon } from '../icons'
import { MIN_TOUCH_TARGET } from '../buttonSpec'
import { ChoiceSheet } from './ChoiceSheet'

/** The five bundles that ship. Each label is in its own language, on purpose. */
export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ja', label: '日本語' }
]

/** The bundle code i18next is actually using, trimmed of any region. */
const current = (language) => LANGUAGES.find(({ code }) => code === String(language ?? '').slice(0, 2))?.code ?? 'en'

/**
 * @param {string} [color='bar.fg'] - the glyph's token, which is the bar's own
 *   foreground (ADR-082: the bar is not always the accent).
 */
export function LanguageSwitch({ color = 'bar.fg' }) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole='button'
        accessibilityLabel={t('common.language')}
        hitSlop={8}
        style={({ pressed }) => ({
          width: MIN_TOUCH_TARGET,
          height: MIN_TOUCH_TARGET,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.7 : 1
        })}
      >
        <Icon name='Languages' size='md' color={color} />
      </Pressable>

      <ChoiceSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={t('common.language')}
        options={LANGUAGES.map(({ code, label }) => ({ value: code, label }))}
        value={current(i18n.language)}
        onChange={(code) => i18n.changeLanguage(code)}
      />
    </>
  )
}

export default LanguageSwitch
