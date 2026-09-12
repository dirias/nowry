import { petPortrait } from '../petPortrait'

describe('petPortrait', () => {
  it('wears a generated portrait when the account has one', () => {
    expect(petPortrait({ avatarUrl: 'https://cdn/x.png', isDefaultCompanion: false, stage: 4 })).toEqual({
      kind: 'generated',
      url: 'https://cdn/x.png'
    })
  })

  it('prefers the generated portrait over the bundled art', () => {
    expect(petPortrait({ avatarUrl: 'https://cdn/x.png', isDefaultCompanion: true, stage: 2 }).kind).toBe('generated')
  })

  it('falls back to the default companion at its stage', () => {
    expect(petPortrait({ isDefaultCompanion: true, stage: 5 })).toEqual({ kind: 'default', stage: 5 })
  })

  it('draws nobody else’s owl on a personalised companion with no art', () => {
    expect(petPortrait({ isDefaultCompanion: false, stage: 3 })).toBeNull()
  })

  it('assumes the default companion at stage one when told nothing', () => {
    expect(petPortrait()).toEqual({ kind: 'default', stage: 1 })
  })
})
