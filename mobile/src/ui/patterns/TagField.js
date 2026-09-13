/**
 * Tags, typed as a comma-separated line (MOB-102).
 *
 * The card editor's tag field bound its value to the PARSED array joined back
 * together — `tags.join(', ')` — and re-parsed on every keystroke. Parsing
 * trims and drops empties, so typing "japan," parsed to ["japan"] and rendered
 * back as "japan": the comma vanished the instant it was typed, and a second
 * tag could never be started. Nothing failed; the field simply would not accept
 * a separator.
 *
 * So the text shown is the text TYPED, held here, and the parsed list is what
 * the caller receives. The two only meet when the caller's list changes from
 * outside — a form reopening on a different document — which is when the line
 * is rebuilt from it.
 *
 * A chip-and-Enter input like the web's is the richer answer and a native
 * build of it is its own piece of work. A phone keyboard makes a comma one tap
 * away, and the helper line says to use one.
 */
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { parseTagInput } from '@nowry/core/utils/formUtils'
import { FormField } from '../FormField'
import { Input } from '../Input'

const sameTags = (a = [], b = []) => a.length === b.length && a.every((tag, index) => tag === b[index])

export function TagField({
  value = [],
  onChange,
  labelKey = 'form.tagsLabel',
  helperKey = 'form.tagsCommaHelper',
  errorKey = null,
  required = false
}) {
  const { t } = useTranslation()
  const [text, setText] = useState(() => value.join(', '))
  // What this field last reported, so a change it caused is not mistaken for
  // one that came from outside and the typing is not overwritten mid-word.
  const reported = useRef(value)

  useEffect(() => {
    if (sameTags(value, reported.current)) return
    reported.current = value
    setText(value.join(', '))
  }, [value])

  const change = (next) => {
    setText(next)
    const parsed = parseTagInput(next)
    reported.current = parsed
    onChange?.(parsed)
  }

  return (
    <FormField labelKey={labelKey} helperKey={helperKey} errorKey={errorKey} required={required}>
      <Input
        value={text}
        onChangeText={change}
        invalid={Boolean(errorKey)}
        accessibilityLabel={t(labelKey)}
        autoCapitalize='none'
        autoCorrect={false}
      />
    </FormField>
  )
}

export default TagField
