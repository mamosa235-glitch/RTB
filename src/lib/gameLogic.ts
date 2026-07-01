// ============================================================
// GAME LOGIC — Pure functions, no React state
// All randomization happens here, never in render
// ============================================================

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Color = 'red' | 'black';

export type Card = {
  id: string;
  suit: Suit;
  rank: number; // 2–14 (Ace = 14)
  rankLabel: string; // '2'–'10', 'J', 'Q', 'K', 'A'
  color: Color;
};

export type GameStage =
  | 'idle' |'stage1-choose' |'stage1-reveal' |'stage2-choose' |'stage2-reveal' |'stage3-choose' |'stage3-reveal' |'stage4-choose' |'stage4-reveal' |'game-over';

export type StageResult = 'win' | 'loss' | null;

export type GameState = {
  stage: GameStage;
  deck: Card[];
  drawnCards: (Card | null)[];
  stageResults: StageResult[];
  overallResult: 'win' | 'loss' | null;
  isAnimating: boolean;
};

export type Stats = {
  gamesPlayed: number;
  wins: number;
  losses: number;
  currentStreak: number;
  bestStreak: number;
  winHistory: boolean[]; // last 20 games
};

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANK_LABELS: Record<number, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
  8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A',
};

/** Build a fresh 52-card deck */
export function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 2; rank <= 14; rank++) {
      deck.push({
        id: `${suit}-${rank}`,
        suit,
        rank,
        rankLabel: RANK_LABELS[rank],
        color: suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black',
      });
    }
  }
  return deck;
}

/** Fisher-Yates shuffle — always called in event handlers, never in render */
export function shuffleDeck(deck: Card[]): Card[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

/** Draw the top card from the deck; returns [card, remainingDeck] */
export function drawCard(deck: Card[]): [Card, Card[]] {
  if (deck.length === 0) throw new Error('Deck is empty');
  const card = deck[0];
  const rest = deck.slice(1);
  return [card, rest];
}

// ── Stage 1 ──────────────────────────────────────────────
/** Evaluate Stage 1: Red or Black */
export function evaluateRedBlack(guess: Color, card: Card): StageResult {
  return card.color === guess ? 'win' : 'loss';
}

// ── Stage 2 ──────────────────────────────────────────────
/** Evaluate Stage 2: Higher or Lower than card1 */
export function evaluateHigherLower(
  guess: 'higher' | 'lower',
  card1: Card,
  card2: Card
): StageResult {
  if (guess === 'higher') return card2.rank >= card1.rank ? 'win' : 'loss';
  return card2.rank < card1.rank ? 'win' : 'loss';
}

// ── Stage 3 ──────────────────────────────────────────────
/**
 * Evaluate Stage 3: Inside or Outside
 * Inside = between the two card values (inclusive)
 * Outside = lower than the lower or higher than the higher
 */
export function evaluateInsideOutside(
  guess: 'inside' | 'outside',
  card1: Card,
  card2: Card,
  card3: Card
): StageResult {
  const lo = Math.min(card1.rank, card2.rank);
  const hi = Math.max(card1.rank, card2.rank);

  const isInside = card3.rank >= lo && card3.rank <= hi;
  if (guess === 'inside') return isInside ? 'win' : 'loss';
  return !isInside ? 'win' : 'loss';
}

/** Returns true if inside is possible */
export function canBeInside(card1: Card, card2: Card): boolean {
  // Con la nueva regla de que los bordes son "inside",
  // siempre es posible que sea inside (si sale cualquiera de las dos cartas).
  return true;
}

// ── Stage 4 ──────────────────────────────────────────────
/** Evaluate Stage 4: Suit guess */
export function evaluateSuit(guess: Suit, card: Card): StageResult {
  return card.suit === guess ? 'win' : 'loss';
}

// ── Overall result ────────────────────────────────────────
/** All 4 stages must be 'win' for overall win */
export function evaluateOverall(results: StageResult[]): 'win' | 'loss' | null {
  if (results.length < 4) return null;
  return results.every((r) => r === 'win') ? 'win' : 'loss';
}

// ── Stats (localStorage) ─────────────────────────────────
const STATS_KEY = 'redorblack_stats_v1';

export function loadStats(): Stats {
  if (typeof window === 'undefined') {
    return { gamesPlayed: 0, wins: 0, losses: 0, currentStreak: 0, bestStreak: 0, winHistory: [] };
  }
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { gamesPlayed: 0, wins: 0, losses: 0, currentStreak: 0, bestStreak: 0, winHistory: [] };
    return JSON.parse(raw) as Stats;
  } catch {
    return { gamesPlayed: 0, wins: 0, losses: 0, currentStreak: 0, bestStreak: 0, winHistory: [] };
  }
}

export function saveStats(stats: Stats): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {}
}

export function updateStats(stats: Stats, won: boolean): Stats {
  const newStreak = won ? stats.currentStreak + 1 : 0;
  const updated: Stats = {
    gamesPlayed: stats.gamesPlayed + 1,
    wins: won ? stats.wins + 1 : stats.wins,
    losses: won ? stats.losses : stats.losses + 1,
    currentStreak: newStreak,
    bestStreak: Math.max(stats.bestStreak, newStreak),
    winHistory: [...stats.winHistory.slice(-19), won],
  };
  saveStats(updated);
  return updated;
}

export function getWinRate(stats: Stats): number {
  if (stats.gamesPlayed === 0) return 0;
  return Math.round((stats.wins / stats.gamesPlayed) * 100);
}

// ── Balance (localStorage) ────────────────────────────────
const BALANCE_KEY = 'ridethebus_balance_v1';
const STARTING_BALANCE = 1000;

export function loadBalance(): number {
  if (typeof window === 'undefined') return STARTING_BALANCE;
  try {
    const raw = localStorage.getItem(BALANCE_KEY);
    if (raw === null) return STARTING_BALANCE;
    const val = parseInt(raw, 10);
    return isNaN(val) ? STARTING_BALANCE : val;
  } catch {
    return STARTING_BALANCE;
  }
}

export function saveBalance(balance: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BALANCE_KEY, String(balance));
  } catch {}
}

export function formatBalance(amount: number): string {
  if (amount >= 1000000) {
    return (amount / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  return amount.toLocaleString();
}

export function addToBalance(amount: number): number {
  const current = loadBalance();
  const next = current + amount;
  saveBalance(next);
  return next;
}

// ── Suit display helpers ─────────────────────────────────
export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

export const SUIT_LABELS: Record<Suit, string> = {
  hearts: 'Hearts',
  diamonds: 'Diamonds',
  clubs: 'Clubs',
  spades: 'Spades',
};

export const SUIT_COLORS: Record<Suit, string> = {
  hearts: 'text-card-red',
  diamonds: 'text-card-red',
  clubs: 'text-foreground',
  spades: 'text-foreground',
};

/** Initial game state — used on mount and "New Game" */
export function createInitialGameState(): GameState {
  return {
    stage: 'idle',
    deck: [],
    drawnCards: [null, null, null, null],
    stageResults: [],
    overallResult: null,
    isAnimating: false,
  };
}

/**
 * Payout multipliers per stage:
 * Stage 1 win: ×2 of initial bet
 * Stage 2 win: ×3 of initial bet
 * Stage 3 win: ×4 of initial bet
 * Stage 4 win (all): ×20 of initial bet
 */
export function getStageMultiplier(stageIndex: number): number {
  const multipliers = [2, 3, 4, 20];
  return multipliers[stageIndex] ?? 1;
}

/** Calculate current payout given initial bet and stages won so far */
export function calculatePayout(initialBet: number, stagesWon: number): number {
  return initialBet * getStageMultiplier(stagesWon - 1);
}