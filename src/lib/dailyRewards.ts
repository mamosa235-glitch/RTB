// ============================================================
// DAILY REWARDS LOGIC — 14-day monthly calendar
// Players claim once per day for 14 days each month.
// After all 14 days claimed, must wait until next month.
// Coins range: min 5, max 100
// ============================================================

export type DayReward = {
  day: number;
  coins: number;
  label: string;
};

export type RewardState = {
  claimedDays: number[];        // which day numbers (1-14) have been claimed this month
  lastClaimDate: string | null; // ISO date string (YYYY-MM-DD)
  lastClaimMonth: string | null; // YYYY-MM string to track which month
  claimedToday: boolean;
  totalClaimed: number;         // lifetime coins claimed from daily rewards
};

/** 14-day progressive reward schedule — coins min 5, max 100 */
export const DAILY_REWARDS: DayReward[] = [
  { day: 1,  coins: 5,   label: 'Day 1' },
  { day: 2,  coins: 10,  label: 'Day 2' },
  { day: 3,  coins: 15,  label: 'Day 3' },
  { day: 4,  coins: 20,  label: 'Day 4' },
  { day: 5,  coins: 25,  label: 'Day 5' },
  { day: 6,  coins: 30,  label: 'Day 6' },
  { day: 7,  coins: 35,  label: 'Day 7' },
  { day: 8,  coins: 40,  label: 'Day 8' },
  { day: 9,  coins: 50,  label: 'Day 9' },
  { day: 10, coins: 55,  label: 'Day 10' },
  { day: 11, coins: 60,  label: 'Day 11' },
  { day: 12, coins: 70,  label: 'Day 12' },
  { day: 13, coins: 80,  label: 'Day 13' },
  { day: 14, coins: 100, label: 'Day 14' },
];

const REWARD_KEY = 'ridethebus_monthly_reward_v2';

/** Get today's date as YYYY-MM-DD string */
export function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Get current month as YYYY-MM string */
export function getCurrentMonthString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/** Load reward state from localStorage */
export function loadRewardState(): RewardState {
  if (typeof window === 'undefined') {
    return { claimedDays: [], lastClaimDate: null, lastClaimMonth: null, claimedToday: false, totalClaimed: 0 };
  }
  try {
    const raw = localStorage.getItem(REWARD_KEY);
    if (!raw) return { claimedDays: [], lastClaimDate: null, lastClaimMonth: null, claimedToday: false, totalClaimed: 0 };
    const parsed = JSON.parse(raw) as RewardState;
    const today = getTodayString();
    const currentMonth = getCurrentMonthString();

    // If it's a new month, reset claimed days
    if (parsed.lastClaimMonth !== currentMonth) {
      return {
        claimedDays: [],
        lastClaimDate: null,
        lastClaimMonth: null,
        claimedToday: false,
        totalClaimed: parsed.totalClaimed ?? 0,
      };
    }

    return {
      ...parsed,
      claimedToday: parsed.lastClaimDate === today,
    };
  } catch {
    return { claimedDays: [], lastClaimDate: null, lastClaimMonth: null, claimedToday: false, totalClaimed: 0 };
  }
}

/** Save reward state to localStorage */
export function saveRewardState(state: RewardState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(REWARD_KEY, JSON.stringify(state));
  } catch {}
}

/**
 * Claim today's reward.
 * Returns the updated state and the coins awarded.
 * Throws if already claimed today or all 14 days claimed this month.
 */
export function claimDailyReward(state: RewardState): { newState: RewardState; coinsAwarded: number } {
  const today = getTodayString();
  const currentMonth = getCurrentMonthString();

  if (state.lastClaimDate === today) {
    throw new Error('Already claimed today');
  }

  if (state.claimedDays.length >= 14) {
    throw new Error('All 14 days claimed this month. Wait until next month.');
  }

  // Next day to claim is the next unclaimed day
  const nextDay = state.claimedDays.length + 1;
  const reward = DAILY_REWARDS[nextDay - 1];
  const coinsAwarded = reward.coins;

  const newState: RewardState = {
    claimedDays: [...state.claimedDays, nextDay],
    lastClaimDate: today,
    lastClaimMonth: currentMonth,
    claimedToday: true,
    totalClaimed: state.totalClaimed + coinsAwarded,
  };

  saveRewardState(newState);
  return { newState, coinsAwarded };
}

/**
 * Get the day number (1–14) that will be claimed next.
 * Returns null if already claimed today or all 14 days claimed.
 */
export function getNextClaimDay(state: RewardState): number | null {
  const today = getTodayString();
  if (state.lastClaimDate === today) return null;
  if (state.claimedDays.length >= 14) return null;
  return state.claimedDays.length + 1;
}

/**
 * Get display status for each day in the calendar.
 */
export type DayStatus = 'claimed' | 'available' | 'upcoming' | 'missed';

export function getDayStatuses(state: RewardState): DayStatus[] {
  const today = getTodayString();
  const claimedToday = state.lastClaimDate === today;
  const claimedCount = state.claimedDays.length;

  return DAILY_REWARDS.map((reward) => {
    const dayIndex = reward.day; // 1-indexed

    if (dayIndex <= claimedCount) return 'claimed';

    // If all 14 claimed, rest are upcoming (for next month display)
    if (claimedCount >= 14) return 'upcoming';

    // Next claimable day
    const nextDay = claimedCount + 1;
    if (dayIndex === nextDay && !claimedToday) return 'available';

    return 'upcoming';
  });
}

/** Format coin amount */
export function formatCoins(coins: number): string {
  if (coins >= 1000) return `${(coins / 1000).toFixed(coins % 1000 === 0 ? 0 : 1)}K`;
  return String(coins);
}

/** Check if all 14 days have been claimed this month */
export function isMonthComplete(state: RewardState): boolean {
  return state.claimedDays.length >= 14;
}

/** Get days until next month (approximate) */
export function getDaysUntilNextMonth(): number {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const diff = nextMonth.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/** Legacy export for compatibility */
export function computeActiveStreak(state: RewardState): number {
  return state.claimedDays.length;
}
