import { canSend, chatFailureKey, chatHistory, messageBudget, parseReply, plainReply, replyText } from '../agentChat'

describe('messageBudget', () => {
  it('reads the month as the server reports it', () => {
    expect(messageBudget({ messages_used: 12, messages_limit: 50 })).toEqual({ used: 12, limit: 50 })
  })

  it('is nothing at all when the account is unlimited', () => {
    // The plan table spells unlimited -1, for Plus and Pro.
    expect(messageBudget({ messages_used: 900, messages_limit: -1 })).toBeNull()
  })

  it('is nothing when the payload never arrived', () => {
    expect(messageBudget(null)).toBeNull()
    expect(messageBudget({})).toBeNull()
  })

  it('counts an absent used as none used rather than as unknown', () => {
    expect(messageBudget({ messages_limit: 50 })).toEqual({ used: 0, limit: 50 })
  })
})

describe('canSend', () => {
  it('lets an account inside its budget send', () => {
    expect(canSend({ messages_used: 49, messages_limit: 50 })).toBe(true)
  })

  it('stops at the limit, not after it', () => {
    expect(canSend({ messages_used: 50, messages_limit: 50 })).toBe(false)
    expect(canSend({ messages_used: 51, messages_limit: 50 })).toBe(false)
  })

  it('never stops an unlimited account', () => {
    expect(canSend({ messages_used: 9000, messages_limit: -1 })).toBe(true)
  })

  it('does not stop an account whose budget is unknown', () => {
    // A missing payload must not lock the composer: the server is the
    // authority and it answers with a 429 if it disagrees.
    expect(canSend(null)).toBe(true)
  })
})

describe('replyText', () => {
  it('reads the reply', () => {
    expect(replyText({ reply: 'Sure — try this.' })).toBe('Sure — try this.')
  })

  it('is an empty string rather than undefined', () => {
    expect(replyText({})).toBe('')
    expect(replyText(null)).toBe('')
  })
})

describe('chatHistory', () => {
  const turns = [
    { from: 'user', text: 'hola' },
    { from: 'agent', text: 'hello' },
    { from: 'user', text: 'again' }
  ]

  it("uses the server's roles, which call the companion `model`", () => {
    expect(chatHistory(turns)).toEqual([
      { role: 'user', content: 'hola' },
      { role: 'model', content: 'hello' },
      { role: 'user', content: 'again' }
    ])
  })

  it('keeps the most recent turns when there are more than the cap', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ from: 'user', text: `m${i}` }))
    const sent = chatHistory(many, 5)
    expect(sent).toHaveLength(5)
    expect(sent[0].content).toBe('m25')
    expect(sent[4].content).toBe('m29')
  })

  it('drops a turn with nothing in it, including one still being typed', () => {
    expect(chatHistory([{ from: 'user', text: '' }, { from: 'agent' }, null])).toEqual([])
  })

  it('has nothing to send from nothing', () => {
    expect(chatHistory()).toEqual([])
  })
})

describe('plainReply', () => {
  it('shows the emphasis rather than its markers', () => {
    // What actually reached a phone screen, asterisks and all.
    expect(plainReply('**最前（ずいぶん）に立つ。**\n*Estar en la vanguardia.*')).toBe('最前（ずいぶん）に立つ。\nEstar en la vanguardia.')
  })

  it('keeps a list a list', () => {
    expect(plainReply('- one\n- two')).toBe('• one\n• two')
    expect(plainReply('* one\n+ two')).toBe('• one\n• two')
  })

  it('drops a heading marker and keeps the heading', () => {
    expect(plainReply('## Ejemplos\ntexto')).toBe('Ejemplos\ntexto')
  })

  it('unwraps code, inline and fenced', () => {
    expect(plainReply('use `ずいぶん` here')).toBe('use ずいぶん here')
    expect(plainReply('```js\nconst a = 1\n```')).toBe('const a = 1')
  })

  it('leaves an asterisk that wraps nothing alone', () => {
    expect(plainReply('3 * 4 = 12')).toBe('3 * 4 = 12')
    expect(plainReply('a_b_c and 2_000')).toBe('a_b_c and 2_000')
  })

  it('collapses a run of blank lines but keeps a paragraph break', () => {
    expect(plainReply('one\n\n\n\ntwo')).toBe('one\n\ntwo')
  })

  it('is an empty string for anything that is not one', () => {
    expect(plainReply(null)).toBe('')
    expect(plainReply(undefined)).toBe('')
  })
})

describe('chatFailureKey', () => {
  const failed = (status, detail) => ({ response: { status, data: { detail } } })

  it('says offline when the request never reached a server', () => {
    expect(chatFailureKey({ code: 'ERR_NETWORK', request: {} })).toBe('errors.offline')
  })

  it('says the companion cannot answer when no AI provider could', () => {
    expect(chatFailureKey(failed(503, 'ai_unavailable'))).toBe('agent.chat.unavailable')
  })

  it('says the month is spent when the budget is', () => {
    expect(chatFailureKey(failed(429, 'message_limit_reached'))).toBe('agent.chat.budgetSpent')
  })

  it('says wait a moment for the per-minute limit', () => {
    expect(chatFailureKey(failed(429, 'Rate limit exceeded: 20 per 1 minute'))).toBe('agent.chat.busy')
  })

  it('never hands the server detail to the screen', () => {
    expect(chatFailureKey(failed(502, 'AI service error. Please try again.'))).toBe('agent.chat.failed')
    expect(chatFailureKey(undefined)).toBe('agent.chat.failed')
  })
})

describe('parseReply', () => {
  it('turns example tags into rows between the prose', () => {
    const reply = '効果 (こうか): effect.\n[[EX|この薬はよく効果がある。|Kono kusuri wa yoku kōka ga aru.|This medicine works well.]]\n- [[EX|効果的な勉強法|kōkateki na benkyōhō|an effective way to study]]\nWant more?'
    expect(parseReply(reply)).toEqual([
      { type: 'text', text: '効果 (こうか): effect.' },
      { type: 'example', sentence: 'この薬はよく効果がある。', reading: 'Kono kusuri wa yoku kōka ga aru.', translation: 'This medicine works well.' },
      { type: 'example', sentence: '効果的な勉強法', reading: 'kōkateki na benkyōhō', translation: 'an effective way to study' },
      { type: 'text', text: 'Want more?' }
    ])
  })

  it('keeps an example with no reading', () => {
    expect(parseReply('[[EX|La casa es grande.||The house is big.]]')).toEqual([
      { type: 'example', sentence: 'La casa es grande.', reading: '', translation: 'The house is big.' }
    ])
  })

  it('leaves a reply with no tags as one block of prose', () => {
    expect(parseReply('Just an answer.\nTwo lines.')).toEqual([{ type: 'text', text: 'Just an answer.\nTwo lines.' }])
  })

  it('treats a malformed or empty tag as prose', () => {
    expect(parseReply('[[EX||x|y]]')).toEqual([{ type: 'text', text: '[[EX||x|y]]' }])
    expect(parseReply('see [[EX|a|b|c]] inline')).toEqual([{ type: 'text', text: 'see [[EX|a|b|c]] inline' }])
  })

  it('is nothing for nothing', () => {
    expect(parseReply('')).toEqual([])
    expect(parseReply(undefined)).toEqual([])
  })
})
