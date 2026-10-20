/**
 * Numeric lookups transcribed from Cornell's February 2001 RULA worksheet.
 * https://ergo.human.cornell.edu/Pub/AHquest/RULAworksheet.pdf
 * This is a screening calculation, not clinical validation of image estimates.
 */
export const RULA_ALGORITHM_VERSION = 'cornell-worksheet-2001-tables-v1';
export const RULA_POSTURE_SCORE_LIMITS = { upperArm:6, lowerArm:3, wrist:4, wristTwist:2, neck:6, trunk:6, legs:2 } as const;

// A: rows = (upperArm - 1) * 3 + lowerArm - 1;
// columns = (wrist - 1) * 2 + wristTwist - 1.
export const RULA_TABLE_A = [
  [1,2,2,2,2,3,3,3], [2,2,2,2,3,3,3,3], [2,3,2,3,3,3,4,4],
  [2,2,2,3,3,3,4,4], [2,2,2,3,3,3,4,4], [2,3,3,3,3,4,4,5],
  [2,3,3,3,4,4,5,5], [2,3,3,3,4,4,5,5], [2,3,3,4,4,4,5,5],
  [3,4,4,4,4,4,5,5], [3,4,4,4,4,4,5,5], [3,4,4,5,5,5,6,6],
  [5,5,5,5,5,6,6,7], [5,6,6,6,6,7,7,7], [6,6,6,7,7,7,7,8],
  [7,7,7,7,7,8,8,9], [7,8,8,8,8,9,9,9], [9,9,9,9,9,9,9,9],
] as const;

// B: rows = neck - 1; columns = (trunk - 1) * 2 + legs - 1.
export const RULA_TABLE_B = [
  [1,3,2,3,3,4,5,5,6,6,7,7],
  [2,3,2,3,4,5,5,5,6,7,7,7],
  [3,3,3,4,4,5,5,6,6,7,7,7],
  [5,5,5,6,6,7,7,7,7,7,8,8],
  [7,7,7,7,7,8,8,8,8,8,8,8],
  [8,8,8,8,8,8,8,9,9,9,9,9],
] as const;

// C: adjusted A (8+ in final row), adjusted B (7+ in final column).
export const RULA_TABLE_C = [
  [1,2,3,3,4,5,5], [2,2,3,4,4,5,5],
  [3,3,3,4,4,5,6], [3,3,3,4,5,6,6],
  [4,4,4,5,6,7,7], [4,4,5,6,6,7,7],
  [5,5,6,6,7,7,7], [5,5,6,7,7,7,7],
] as const;
