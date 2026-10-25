import { bestOf, languageBase, languageOptions, readsScriptOf, resolveVoice, voiceForSegment } from '../voiceMatch'

const VOICES = [
  { name: 'Samantha', lang: 'en-US' },
  { name: 'Google US English', lang: 'en-US' },
  { name: 'Kyoko', lang: 'ja-JP' },
  { name: 'Android Speech Recognition and Synthesis ja', lang: 'ja_JP' }
]

describe('languageBase', () => {
  it("normalises Android's underscore", () => {
    expect(languageBase('ja_JP')).toBe('ja')
    expect(languageBase('ja-JP')).toBe('ja')
    expect(languageBase('JA')).toBe('ja')
  })

  it('has no answer for nothing', () => {
    expect(languageBase(null)).toBe('')
    expect(languageBase(undefined)).toBe('')
  })
})

describe('bestOf', () => {
  it("takes the engine's own word for quality", () => {
    expect(bestOf(VOICES.filter((v) => v.lang === 'en-US')).name).toBe('Google US English')
  })

  it('takes the first when none of them claim anything', () => {
    expect(bestOf([{ name: 'Kyoko', lang: 'ja-JP' }]).name).toBe('Kyoko')
  })

  it('has nothing to take from nothing', () => {
    expect(bestOf([])).toBeNull()
  })
})

describe('resolveVoice', () => {
  it('matches the language before the name, so a deck travels', () => {
    const found = resolveVoice(VOICES, { targetLang: 'ja-JP', targetName: 'Google US English' })
    expect(found.lang).toMatch(/^ja/)
  })

  it('matches a language the device spells with an underscore', () => {
    const android = [{ name: 'ja-jp-x-htd', lang: 'ja_JP' }]
    expect(resolveVoice(android, { targetLang: 'ja-JP' }).name).toBe('ja-jp-x-htd')
  })

  it('falls back to the exact name on the device that chose it', () => {
    expect(resolveVoice(VOICES, { targetName: 'Kyoko' }).name).toBe('Kyoko')
  })

  it('learns the language of a name it cannot serve, and serves that', () => {
    const phone = [{ name: 'ja-jp-x-htd', lang: 'ja-JP' }]
    const found = resolveVoice(phone, { targetName: 'Kyoko' }, VOICES)
    expect(found.name).toBe('ja-jp-x-htd')
  })

  it('returns nothing rather than the wrong language', () => {
    expect(resolveVoice(VOICES, { targetLang: 'de-DE' })).toBeNull()
    expect(resolveVoice(VOICES, { targetName: 'Nobody' })).toBeNull()
    expect(resolveVoice([], { targetLang: 'ja' })).toBeNull()
  })

  it('asks for nothing and gets nothing', () => {
    expect(resolveVoice(VOICES, {})).toBeNull()
    expect(resolveVoice()).toBeNull()
  })
})

describe('languageOptions', () => {
  it('lists each language once, best voice first', () => {
    expect(languageOptions(VOICES)).toEqual([
      { langBase: 'en', langCode: 'en-US', bestVoice: { name: 'Google US English', lang: 'en-US' } },
      { langBase: 'ja', langCode: 'ja-JP', bestVoice: { name: 'Kyoko', lang: 'ja-JP' } }
    ])
  })

  it('ignores a voice with no language at all', () => {
    expect(languageOptions([{ name: 'Broken' }])).toEqual([])
  })
})

describe('voiceForSegment (ADR-050)', () => {
  const kyoko = { name: 'Kyoko', lang: 'ja-JP' }
  const voices = [kyoko, { name: 'Google 日本語', lang: 'ja-JP' }, { name: 'Samantha', lang: 'en-US' }]

  it('keeps the selected voice for its own language, even beside a "better" one', () => {
    expect(voiceForSegment(voices, kyoko, 'ja')).toBe(kyoko)
  })

  it('finds a voice for another script', () => {
    expect(voiceForSegment(voices, kyoko, 'en-US').name).toBe('Samantha')
  })

  it('keeps a Spanish voice for any Latin segment, whatever the detector called it', () => {
    const paulina = { name: 'Paulina', lang: 'es-MX' }
    const withSpanish = [...voices, paulina, { name: 'Luciana', lang: 'pt-BR' }]
    expect(voiceForSegment(withSpanish, paulina, 'pt')).toBe(paulina)
    expect(voiceForSegment(withSpanish, paulina, 'en')).toBe(paulina)
    expect(voiceForSegment(withSpanish, paulina, 'ja').lang).toBe('ja-JP')
  })

  it('keeps the selected voice when the device has nothing for the language, or none is given', () => {
    expect(voiceForSegment(voices, kyoko, 'zh')).toBe(kyoko)
    expect(voiceForSegment(voices, kyoko, null)).toBe(kyoko)
  })
})

describe('readsScriptOf (ADR-050)', () => {
  it('matches by script, not by language', () => {
    expect(readsScriptOf('es-ES', 'pt')).toBe(true)
    expect(readsScriptOf('es-ES', 'en')).toBe(true)
    expect(readsScriptOf('ru-RU', 'ru')).toBe(true)
    expect(readsScriptOf('es-ES', 'ja')).toBe(false)
    expect(readsScriptOf('ja-JP', 'en')).toBe(false)
  })

  it('lets a Japanese voice read kanji labelled Chinese, never the reverse for kana', () => {
    expect(readsScriptOf('ja_JP', 'zh')).toBe(true)
    expect(readsScriptOf('zh-CN', 'ja')).toBe(false)
    expect(readsScriptOf('zh-CN', 'zh')).toBe(true)
  })

  it('says no when either language is missing', () => {
    expect(readsScriptOf(null, 'en')).toBe(false)
    expect(readsScriptOf('en-US', null)).toBe(false)
  })
})
