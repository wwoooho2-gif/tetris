import { canSubmitLeaderboard, normalizePlayerName } from './src/leaderboard.js';

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
  console.log('leaderboard tests passed');
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
