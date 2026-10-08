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
 *
 * **The deck's existing tags are offered under the line (MOB-106).** The web
 * suggests them as it is typed; the phone showed nothing, so a tag had to be
 * remembered and retyped exactly, and "Japan" next to "japan" was the usual
 * result. `suggestions` is the same pool `useCardForm` already fetches; the
 * chips narrow by the tag being typed and a tap writes it into the line.
 */
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { parseTagInput } from '@nowry/core/utils/formUtils'
import { Chip } from '../Chip'
import { FormField } from '../FormField'
import { Input } from '../Input'
import { Stack } from '../Stack'
import { suggestTags, withPickedTag } from './tagSuggestions'

const sameTags = (a = [], b = []) => a.length === b.length && a.every((tag, index) => tag === b[index])

export function TagField({
  value = [],
  onChange,
  labelKey = 'form.tagsLabel',
  helperKey = 'form.tagsCommaHelper',
  errorKey = null,
  required = false,
  suggestions = []
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

  const offered = suggestTags(suggestions, text)

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
      {offered.length > 0 ? (
        <Stack direction='row' spacing={1} flexWrap='wrap' accessibilityLabel={t('form.tagAddAria')}>
          {offered.map((tag) => (
            <Chip key={tag} onPress={() => change(withPickedTag(text, tag))}>
              {tag}
            </Chip>
          ))}
        </Stack>
      ) : null}
    </FormField>
  )
}

export default TagField
