/**
 * The scheduling contract, which is the part of `alerts.js` that is ours
 * rather than the OS's: one alarm at a time, never a zero-or-past one, and
 * whole seconds.
 */
const mockSchedule = jest.fn()
const mockCancelAll = jest.fn()
const mockChannel = jest.fn()

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: (...args) => mockSchedule(...args),
  cancelAllScheduledNotificationsAsync: (...args) => mockCancelAll(...args),
  setNotificationChannelAsync: (...args) => mockChannel(...args),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' }
}))

const mockPlatform = { OS: 'ios' }
jest.mock('react-native', () => ({ Platform: mockPlatform }))

const { scheduleEndAlarm, cancelEndAlarm } = require('../alerts')

beforeEach(() => {
  mockPlatform.OS = 'ios'
  mockSchedule.mockReset().mockResolvedValue('id')
  mockCancelAll.mockReset().mockResolvedValue(undefined)
  mockChannel.mockReset().mockResolvedValue(undefined)
})

it('withdraws the standing alarm before setting a new one', async () => {
  await scheduleEndAlarm({ seconds: 60, title: 'T', body: 'B' })

  expect(mockCancelAll).toHaveBeenCalledTimes(1)
  expect(mockSchedule).toHaveBeenCalledTimes(1)
  const [{ content, trigger }] = mockSchedule.mock.calls[0]
  expect(content).toEqual({ title: 'T', body: 'B', sound: 'default' })
  expect(trigger.seconds).toBe(60)
})

it('rounds a fractional delay up, never down into the past', async () => {
  await scheduleEndAlarm({ seconds: 0.2, title: 'T', body: 'B' })
  expect(mockSchedule.mock.calls[0][0].trigger.seconds).toBe(1)
})

it('schedules nothing for a session with no time left, but still clears', async () => {
  await scheduleEndAlarm({ seconds: 0, title: 'T', body: 'B' })

  expect(mockCancelAll).toHaveBeenCalledTimes(1)
  expect(mockSchedule).not.toHaveBeenCalled()
})

it('cancelling is only ever a withdrawal', async () => {
  await cancelEndAlarm()
  expect(mockCancelAll).toHaveBeenCalledTimes(1)
  expect(mockSchedule).not.toHaveBeenCalled()
})

it('asks Android for a channel with no custom sound', async () => {
  // A channel's `sound` is a bundled filename, not a mode. Asking for one
  // called "default" logs an error on every call and selects nothing.
  mockPlatform.OS = 'android'

  await scheduleEndAlarm({ seconds: 60, title: 'T', body: 'B' })

  const [id, options] = mockChannel.mock.calls[0]
  expect(id).toBe('nowry-focus')
  expect(options).not.toHaveProperty('sound')
})
