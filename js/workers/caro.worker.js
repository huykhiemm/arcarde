import { DIFFICULTY_DEPTH, PLAYER_AI, findBestMove } from '../engines/caro.engine.js';

self.onmessage = (event) => {
  const { requestId, board, difficulty = 'medium', aiPlayer = PLAYER_AI } = event.data;
  const depth = DIFFICULTY_DEPTH[difficulty] || DIFFICULTY_DEPTH.medium;

  const t0 = performance.now();
  const { move, telemetry } = findBestMove(board, depth, aiPlayer);
  const durationMs = Math.round((performance.now() - t0) * 10) / 10;

  self.postMessage({
    requestId,
    move,
    telemetry: {
      depth: telemetry.depth,
      nodesVisited: telemetry.nodesVisited,
      prunedBranches: telemetry.prunedBranches,
      evalScore: telemetry.evalScore,
      durationMs,
    },
  });
};
