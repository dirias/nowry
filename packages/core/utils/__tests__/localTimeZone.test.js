import { localTimeZone, timeZoneParam } from '../localTimeZone'

describe('localTimeZone', () => {
  const real = Intl.DateTimeFormat

  afterEach(() => {
    Intl.DateTimeFormat = real
  })

  const pretend = (timeZone) => {
    Intl.DateTimeFormat = function () {
      return { resolvedOptions: () => ({ timeZone }) }
    }
  }

  it('reports the zone the runtime resolves', () => {
    pretend('Asia/Tokyo')
    expect(localTimeZone()).toBe('Asia/Tokyo')
  })

  it('is nothing rather than UTC when the runtime will not say', () => {
    // The server already defaults to UTC. Sending it explicitly would claim to
    // know something we do not.
    pretend(undefined)
    expect(localTimeZone()).toBeNull()
    pretend('')
    expect(localTimeZone()).toBeNull()
  })

  it('is nothing rather than a throw when `Intl` is absent', () => {
    Intl.DateTimeFormat = function () {
      throw new Error('no Intl here')
    }
    expect(localTimeZone()).toBeNull()
  })
})

describe('timeZoneParam', () => {
  const real = Intl.DateTimeFormat

  afterEach(() => {
    Intl.DateTimeFormat = real
  })

  it('is a query string ready to append', () => {
    Intl.DateTimeFormat = function () {
      return { resolvedOptions: () => ({ timeZone: 'America/New_York' }) }
    }
    expect(timeZoneParam()).toBe('?tz=America%2FNew_York')
  })

  it('encodes the slash, because a zone name carries one', () => {
    Intl.DateTimeFormat = function () {
      return { resolvedOptions: () => ({ timeZone: 'Asia/Tokyo' }) }
    }
    expect(timeZoneParam()).not.toContain('Asia/Tokyo')
    expect(decodeURIComponent(timeZoneParam())).toBe('?tz=Asia/Tokyo')
  })

  it('adds nothing at all when the zone is unknown', () => {
    Intl.DateTimeFormat = function () {
      return { resolvedOptions: () => ({ timeZone: null }) }
    }
    expect(timeZoneParam()).toBe('')
  })
})
