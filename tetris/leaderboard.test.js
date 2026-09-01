import { canSubmitLeaderboard, normalizePlayerName } from './src/leaderboard.js';
import { Input } from './src/input.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

try {
  assert(canSubmitLeaderboard({ autoplay: false, score: 100, gameState: 'over' }) === true, 'human over score should be submitable');
  assert(canSubmitLeaderboard({ autoplay: false, score: 0, gameState: 'over' }) === false, 'zero score should not submit');
  assert(canSubmitLeaderboard({ autoplay: true, score: 100, gameState: 'over' }) === false, 'auto mode should never submit');
  assert(canSubmitLeaderboard({ autoplay: false, score: 100, gameState: 'playing' }) === false, 'non-finished runs should not submit');
  assert(normalizePlayerName('  cool-guy  ') === 'cool-guy', 'names should trim and preserve text');
  assert(normalizePlayerName('<bad>') === 'bad', 'unsafe characters should be stripped');

  const vrForLeft = Input.decodeVrGamepad({ axes: [-0.9, 0], buttons: [{ pressed: false }, { pressed: false }, { pressed: false }, { pressed: false }, { pressed: false }, { pressed: false }] });
  assert(vrForLeft.left === true, 'left stick should trigger left movement');
  assert(vrForLeft.right === false, 'left stick should not also trigger right movement');

  const vrForActions = Input.decodeVrGamepad({ axes: [0, -0.8], buttons: [{ pressed: true }, { pressed: false }, { pressed: true }, { pressed: true }, { pressed: false }, { pressed: false }, { pressed: false }, { pressed: true }, { pressed: false }] });
  assert(vrForActions.soft === true, 'thumbstick down or trigger should trigger soft drop');
  assert(vrForActions.cw === true, 'primary button should rotate clockwise');
  assert(vrForActions.ccw === true, 'secondary button should rotate counter-clockwise');
  assert(vrForActions.hold === true, 'grip button should hold piece');

  console.log('leaderboard tests passed');
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
