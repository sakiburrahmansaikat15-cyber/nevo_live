// Spin/ball physics: compute the wheel target rotation so the winning pocket
// lands under the top pointer, and generate ball keyframes that orbit
// opposite the wheel and decay inward.

import { POCKET_ANGLE } from '../utils/wheel';

export const SPIN_TURNS = 6; // full rotations of the wheel before landing
export const BALL_TURNS = 8; // ball orbits counter to the wheel

/**
 * Wheel rotation (deg) that brings pocket `winningIndex` to the top pointer.
 * Pockets are laid out starting at the top (pointer) going clockwise: pocket i
 * spans [i*angle, (i+1)*angle) with center at i*angle + angle/2 measured
 * clockwise from the top. The wheel group rotates clockwise by R (SVG y-down),
 * so a pocket at angle A lands at the top when A + R ≡ 360 → R = 360 - A.
 */
export function wheelTargetRotation(winningIndex: number, turns = SPIN_TURNS): number {
  const pocketCenter = winningIndex * POCKET_ANGLE + POCKET_ANGLE / 2;
  return 360 * turns + (360 - pocketCenter);
}

/** Normalized angle (deg) of the pocket center under the pointer after rotation. */
export function pocketAngleFromRotation(rotation: number, winningIndex: number): number {
  const normalized = ((rotation % 360) + 360) % 360;
  const center = winningIndex * POCKET_ANGLE + POCKET_ANGLE / 2;
  return Math.abs(normalized - center);
}

export interface BallKeyframe {
  rotation: number; // absolute wheel-relative rotation (deg) at time t
  radius: number; // distance from wheel center (px in viewBox units)
}

/**
 * Ball path: starts at the outer ring (r≈158), orbits OPPOSITE to the wheel
 * (negative rotation), slows, and decays inward to the winning pocket
 * (r≈110) at the end of the spin.
 */
export function generateBallKeyframes(totalMs: number, pocketRadius = 110, outerRadius = 158, steps = 60): BallKeyframe[] {
  const frames: BallKeyframe[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    // Decay: fast at first, settles smoothly inward (ease-out).
    const eased = 1 - Math.pow(1 - t, 2.2);
    const radius = outerRadius - (outerRadius - pocketRadius) * eased;
    // Rotation: start fast opposite, decelerate, and stop aligned with the pocket.
    const rotation = -BALL_TURNS * 360 * (1 - Math.pow(1 - t, 1.9));
    frames.push({ rotation, radius });
  }
  return frames;
}
