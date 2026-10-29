/**
 * ttsService.segmentText — TTS-002 (ADR-050). Pins the body the segment call
 * sends: the hint only when there is one, so the server's old contract holds.
 */
const mockPost = jest.fn()
jest.mock('../client', () => ({
  apiClient: { post: (...args) => mockPost(...args) }
}))

const { ttsService } = require('./tts.ai.service')

beforeEach(() => {
  mockPost.mockReset().mockResolvedValue({ data: { segments: [{ text: '学生', lang_code: 'ja' }] } })
})

describe('segmentText', () => {
  it('sends the hint beside the text', async () => {
    await expect(ttsService.segmentText('学生', 'ja')).resolves.toEqual([{ text: '学生', lang_code: 'ja' }])
    expect(mockPost.mock.calls[0][1]).toEqual({ text: '学生', lang_hint: 'ja' })
  })

  it('sends the text alone when there is no hint', async () => {
    await ttsService.segmentText('学生')
    expect(mockPost.mock.calls[0][1]).toEqual({ text: '学生' })
  })
})
