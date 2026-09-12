import { bestLevelUp, levelUpFrom } from '../petLevelUp'

describe('levelUpFrom', () => {
  it('reads the level and the stage the grant reached', () => {
    expect(levelUpFrom({ level_up: true, new_level: 5, new_stage: 3, xp_awarded: 40 })).toEqual({ level: 5, stage: 3 })
  })

  it('is nothing when the grant did not cross a level', () => {
    expect(levelUpFrom({ level_up: false, new_level: 0, new_stage: 0, xp_awarded: 12 })).toBeNull()
  })

  it('is nothing when there was no reply at all — an offline grant announces nothing', () => {
    expect(levelUpFrom(null)).toBeNull()
    expect(levelUpFrom(undefined)).toBeNull()
  })

  it('refuses a level-up the server could not number', () => {
    expect(levelUpFrom({ level_up: true, new_level: 0, new_stage: 2 })).toBeNull()
    expect(levelUpFrom({ level_up: true, new_level: 4, new_stage: 0 })).toBeNull()
  })
})

describe('bestLevelUp', () => {
  it('takes the furthest of the session and the streak, never both', () => {
    const session = { level_up: true, new_level: 4, new_stage: 2 }
    const streak = { level_up: true, new_level: 5, new_stage: 3 }
    expect(bestLevelUp([session, streak])).toEqual({ level: 5, stage: 3 })
    expect(bestLevelUp([streak, session])).toEqual({ level: 5, stage: 3 })
  })

  it('takes the one that crossed when the other did not', () => {
    expect(bestLevelUp([{ level_up: false }, { level_up: true, new_level: 2, new_stage: 1 }])).toEqual({ level: 2, stage: 1 })
  })

  it('is nothing when neither crossed, or when nothing was sent', () => {
    expect(bestLevelUp([{ level_up: false }, null])).toBeNull()
    expect(bestLevelUp([])).toBeNull()
    expect(bestLevelUp()).toBeNull()
  })
})
