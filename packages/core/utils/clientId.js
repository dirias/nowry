/**
 * An id a client mints for something the server has not seen yet (ADR-058 §2).
 *
 * A session is logged when it ends, and the phone's outbox may send that log
 * twice: the server wrote it, the response was lost, the entry stayed queued.
 * The id is minted when the session STARTS and travels with the resume
 * record, so every attempt to log the same session carries the same id and
 * the server keeps one record.
 *
 * Not a UUID on purpose: `crypto.randomUUID` is a browser global, and this
 * package has none (ADR-026). Time plus two random words is unique enough for
 * one user's own sessions, which is the only space the server checks it in.
 */
const word = () => Math.random().toString(36).slice(2, 10)

export const newClientId = () => `${Date.now().toString(36)}-${word()}${word()}`
