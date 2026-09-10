/**
 * The device registry's client half (MOB-028). Pins the request shapes, because
 * both are 204s with no body: nothing downstream would notice a wrong path or a
 * dropped field until a push failed to arrive months later.
 */
const mockPost = jest.fn()
const mockDelete = jest.fn()
jest.mock('../client', () => ({
  apiClient: { post: (...args) => mockPost(...args), delete: (...args) => mockDelete(...args) }
}))

const { userService } = require('./user.service')

beforeEach(() => {
  mockPost.mockReset().mockResolvedValue({ data: null })
  mockDelete.mockReset().mockResolvedValue({ data: null })
})

describe('registerDevice', () => {
  it('sends the token, the platform and the device locale', async () => {
    await userService.registerDevice({ token: 'ExponentPushToken[abc]', platform: 'android', locale: 'es-ES' })

    expect(mockPost).toHaveBeenCalledWith('/users/me/devices', {
      token: 'ExponentPushToken[abc]',
      platform: 'android',
      locale: 'es-ES'
    })
  })
})

describe('deregisterDevice', () => {
  it('puts the token in the path, escaped', async () => {
    // An Expo token carries brackets, which are legal in a path segment but not
    // worth betting on; a slash in one would silently address another route.
    await userService.deregisterDevice('ExponentPushToken[a/b]')

    expect(mockDelete).toHaveBeenCalledWith('/users/me/devices/ExponentPushToken%5Ba%2Fb%5D')
  })
})
