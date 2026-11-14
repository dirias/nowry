/**
 * The companion's six forms, recoloured on the phone (EVO-018, ADR-051).
 *
 * The web moves each painted form onto the learner's accent in a canvas. The
 * phone has no canvas, so it decodes the PNG itself (`upng-js`, pure
 * JavaScript) and hands the pixels to the same shared rule the web uses,
 * `recolorArt`. One form is 256 × 256, so this is quick, and it is done once
 * per stage and colour and kept as a file (`useCompanionArt`).
 *
 * This module is the pure part, tested on its own: the colour a form wears,
 * the share of its frame it fills, the file it is kept in, and the
 * recolouring itself. No React Native, no file system.
 */
import UPNG from 'upng-js'
import { recolorArt } from '@nowry/core/tokens/recolorArt'
import { resolveColor } from '@nowry/core/utils/petColor'
import { stageConfig } from '@nowry/core/domain/petStages'

/** Bumped whenever the recolouring or the art changes, so no device keeps an old file. */
export const COMPANION_ART_VERSION = 1

/** The colour a form wears: the accent shaded for its stage, exactly as the web's companion does. */
export const artColor = (accent, stage) => resolveColor(accent, stage)

/** How much of its frame a form fills: each stage stands bigger than the one before. */
export const artShare = (stage) => stageConfig(stage).artFill

/** The file one stage in one colour is kept in. */
export const artFileName = (stage, color) =>
  `companion-v${COMPANION_ART_VERSION}-${stage}-${String(color).replace('#', '').toLowerCase()}.png`

/** A painted form, as PNG bytes, moved onto `color`, as PNG bytes. */
export function recolorPng(bytes, color) {
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  const image = UPNG.decode(buffer)
  const rgba = new Uint8ClampedArray(UPNG.toRGBA8(image)[0])
  const moved = recolorArt(rgba, color)
  return new Uint8Array(UPNG.encode([moved.buffer], image.width, image.height, 0))
}
