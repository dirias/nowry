/**
 * The scheduling contract, which is the part of `alerts.js` that is ours
 * rather than the OS's.
 *
 * The focus alarm: one at a time, never a zero-or-past one, whole seconds, and
 * — since the block reminders stand beside it (PLAN-007) — withdrawn by its
 * OWN identifier, never by clearing everything. The block reminders: one dated
 * notification per item, only with permission, cancelled by their own kind.
 */
const mockSchedule = jest.fn()
const mockCancelOne = jest.fn()
const mockCancelAll = jest.fn()
const mockGetAll = jest.fn()
const mockChannel = jest.fn()
const mockPermissions = jest.fn()

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: (...args) => mockSchedule(...args),
  cancelScheduledNotificationAsync: (...args) => mockCancelOne(...args),
  cancelAllScheduledNotificationsAsync: (...args) => mockCancelAll(...args),
  getAllScheduledNotificationsAsync: (...args) => mockGetAll(...args),
  setNotificationChannelAsync: (...args) => mockChannel(...args),
  getPermissionsAsync: (...args) => mockPermissions(...args),
  requestPermissionsAsync: jest.fn(),
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval', DATE: 'date' }
}))

const mockPlatform = { OS: 'ios' }
jest.mock('react-native', () => ({ Platform: mockPlatform }))

const { scheduleEndAlarm, cancelEndAlarm, scheduleBlockReminders, cancelBlockReminders } = require('../alerts')

const blockRequest = (identifier, blockId) => ({ identifier, content: { data: { kind: 'block', blockId, date: '2026-10-15' } } })
const alarmRequest = (identifier) => ({ identifier, content: { title: 'Focus' } })

beforeEach(() => {
  mockPlatform.OS = 'ios'
  let ids = 0
  mockSchedule.mockReset().mockImplementation(async () => `id-${(ids += 1)}`)
  mockCancelOne.mockReset().mockResolvedValue(undefined)
  mockCancelAll.mockReset().mockResolvedValue(undefined)
  mockGetAll.mockReset().mockResolvedValue([])
  mockChannel.mockReset().mockResolvedValue(undefined)
  mockPermissions.mockReset().mockResolvedValue({ granted: true })
})

afterEach(async () => {
  // The standing alarm is module state; leave none for the next test.
  await cancelEndAlarm()
})

describe('the focus alarm', () => {
  it('withdraws the standing alarm by its own identifier before setting a new one', async () => {
    await scheduleEndAlarm({ seconds: 60, title: 'T', body: 'B' })
    expect(mockCancelOne).not.toHaveBeenCalled()

    await scheduleEndAlarm({ seconds: 90, title: 'T', body: 'B' })
    expect(mockCancelOne).toHaveBeenCalledTimes(1)
    expect(mockCancelOne).toHaveBeenCalledWith('id-1')
    expect(mockCancelAll).not.toHaveBeenCalled()

    const [{ content, trigger }] = mockSchedule.mock.calls[0]
    expect(content).toEqual({ title: 'T', body: 'B', sound: 'default' })
    expect(trigger.seconds).toBe(60)
  })

  it('rounds a fractional delay up, never down into the past', async () => {
    await scheduleEndAlarm({ seconds: 0.2, title: 'T', body: 'B' })
    expect(mockSchedule.mock.calls[0][0].trigger.seconds).toBe(1)
  })

  it('schedules nothing for a session with no time left, but still clears the standing one', async () => {
    await scheduleEndAlarm({ seconds: 60, title: 'T', body: 'B' })
    await scheduleEndAlarm({ seconds: 0, title: 'T', body: 'B' })

    expect(mockCancelOne).toHaveBeenCalledWith('id-1')
    expect(mockSchedule).toHaveBeenCalledTimes(1)
  })

  it('cancelling is only ever a withdrawal of the alarm, never of the week', async () => {
    await scheduleEndAlarm({ seconds: 60, title: 'T', body: 'B' })
    await cancelEndAlarm()
    expect(mockCancelOne).toHaveBeenCalledTimes(1)
    expect(mockCancelOne).toHaveBeenCalledWith('id-1')
    expect(mockCancelAll).not.toHaveBeenCalled()

    await cancelEndAlarm()
    expect(mockCancelOne).toHaveBeenCalledTimes(1)
  })

  it('asks Android for a channel with no custom sound', async () => {
    // A channel's `sound` is a bundled filename, not a mode. Asking for one
    // called "default" logs an error on every call and selects nothing.
    mockPlatform.OS = 'android'

    await scheduleEndAlarm({ seconds: 60, title: 'T', body: 'B' })

    const [id, options] = mockChannel.mock.calls[0]
    expect(id).toBe('nowry-focus')
    expect(options).not.toHaveProperty('sound')
    expect(mockSchedule.mock.calls[0][0].trigger.channelId).toBe('nowry-focus')
  })

  it('a silent session asks for the quiet channel and a silent content', async () => {
    mockPlatform.OS = 'android'

    await scheduleEndAlarm({ seconds: 60, title: 'T', body: 'B', sound: false })

    const [id, options] = mockChannel.mock.calls[0]
    expect(id).toBe('nowry-focus-quiet')
    expect(options.sound).toBeNull()
    expect(mockSchedule.mock.calls[0][0].content.sound).toBeNull()
  })
})

describe('the block reminders', () => {
  const items = [
    { blockId: 'b1', date: '2026-10-15', fireAt: new Date(2026, 9, 15, 7, 25), title: 'Morning review in 5 min', body: '20 min · Study' },
    { blockId: 'b2', date: '2026-10-15', fireAt: new Date(2026, 9, 15, 21, 30), title: 'Plan tomorrow · now', body: '5 min · Routine' }
  ]

  it('withdraws only its own kind, then stands one dated notification per item', async () => {
    mockGetAll.mockResolvedValue([alarmRequest('alarm-1'), blockRequest('old-1', 'b9')])

    const count = await scheduleBlockReminders(items)

    expect(count).toBe(2)
    expect(mockCancelOne).toHaveBeenCalledTimes(1)
    expect(mockCancelOne).toHaveBeenCalledWith('old-1')
    expect(mockCancelAll).not.toHaveBeenCalled()
    const [{ content, trigger }] = mockSchedule.mock.calls[0]
    expect(content).toEqual({
      title: 'Morning review in 5 min',
      body: '20 min · Study',
      sound: 'default',
      data: { kind: 'block', id: 'b1', blockId: 'b1', date: '2026-10-15' }
    })
    expect(trigger).toEqual({ type: 'date', date: items[0].fireAt, channelId: 'nowry-blocks' })
  })

  it('stands nothing without permission, and says so with 0', async () => {
    mockPermissions.mockResolvedValue({ granted: false })

    expect(await scheduleBlockReminders(items)).toBe(0)
    expect(mockSchedule).not.toHaveBeenCalled()
  })

  it('cancelling the reminders leaves the focus alarm standing', async () => {
    mockGetAll.mockResolvedValue([alarmRequest('alarm-1'), blockRequest('r-1', 'b1'), blockRequest('r-2', 'b2')])

    await cancelBlockReminders()

    expect(mockCancelOne.mock.calls.map(([id]) => id).sort()).toEqual(['r-1', 'r-2'])
  })
})
