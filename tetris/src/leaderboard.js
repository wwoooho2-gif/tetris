export function canSubmitLeaderboard({ autoplay, score, gameState }) {
  const numericScore = Number(score) || 0;
  const isHumanRun = !Boolean(autoplay) && numericScore > 0;
  const validState = gameState === 'over' || gameState === 'beaten';
  return isHumanRun && validState;
}

export function normalizePlayerName(value) {
  const raw = String(value || '').trim();
  const cleaned = raw.replace(/[<>]/g, '').slice(0, 12);
  return cleaned || 'PLAYER';
}
