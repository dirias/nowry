/**
 * A menu hands focus back to its button as it closes; an input opened from a
 * menu item waits for that, or the returning focus would blur it shut.
 */
export const AFTER_MENU = 120

export const afterMenu = (fn) => () => setTimeout(fn, AFTER_MENU)
