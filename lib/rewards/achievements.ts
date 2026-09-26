import { supabase } from '@/lib/multiplayer/supabase';
import { getCurrentUser } from '@/lib/auth/session';
import { CHAPTERS, wordsFoundForLevels } from '@/lib/levels/data';
import { patchSummary, refreshSummary, type PlayerSummary } from '@/lib/data/player';
import { readJournal, type Journal } from '@/lib/rewards/journal';
import { ACHIEVEMENT_BONUS } from '@/lib/rewards/economy';
import { earnTokens } from '@/lib/rewards/wallet';
import { WING as W, type SpeciesSpec } from '@/lib/rewards/species';
import { FREE_PLAY_THEME_IDS } from '@/lib/words/themes';
import { readJSON, writeJSON } from '@/lib/storage';
import type { CollectionEntry } from '@/lib/types';

/*
 * The butterfly album is the achievement list. Every achievement is a species
 * with its own design, so the album doubles as a record of what you have done
 * and a reason to try something new. Locked ones show as outlines with how to
 * catch them and how close you are.
 *
 * Unlocks are stored as `ach-<id>` rows in butterfly_collection (same table,
 * same unique index and guest merge path as every other butterfly).
 */

export type Tier = 'common' | 'rare' | 'legendary';
export type Category = 'Journey' | 'Daily' | 'Skill' | 'Race' | 'Explorer';

export interface Achievement {
  id: string;
  species: string;
  title: string;
  description: string;
  category: Category;
  tier: Tier;
  spec: SpeciesSpec;
  progress: (ctx: AchievementContext) => [number, number];
}

export interface AchievementContext {
  summary: PlayerSummary;
  journal: Journal;
}

const WORDS_PER_DAILY = 8;

export function wordsFound(ctx: AchievementContext): number {
  const s = ctx.summary;
  return (
    wordsFoundForLevels(s.levels.filter(l => (l.stars ?? 0) > 0).map(l => l.level_id)) +
    s.dailyDates.length * WORDS_PER_DAILY +
    ctx.journal.freeWords
  );
}

function totalStars(ctx: AchievementContext) {
  return ctx.summary.levels.reduce((n, l) => n + (l.stars ?? 0), 0);
}

function chapterDone(ctx: AchievementContext, chapterId: string): number {
  const ch = CHAPTERS.find(c => c.id === chapterId);
  if (!ch) return 0;
  const done = new Set(ctx.summary.levels.filter(l => (l.stars ?? 0) > 0).map(l => l.level_id));
  return ch.levels.filter(id => done.has(id)).length;
}

const count = (n: number, target: number): [number, number] => [Math.min(n, target), target];
const flag = (b: boolean): [number, number] => [b ? 1 : 0, 1];

const CHAPTER_SPECIES: [string, string, SpeciesSpec, Tier][] = [
  ['c1', 'Garden Skimmer', { shape: 0, pattern: 'spots', colors: [W.mint, W.lime, W.cream] }, 'common'],
  ['c2', 'Rainy Blue', { shape: 3, pattern: 'veins', colors: [W.sky, W.lav, W.cream], antenna: 'curl' }, 'common'],
  ['c3', 'Cottage Moth', { shape: 2, pattern: 'marble', colors: [W.peach, W.butter, W.ink], antenna: 'feather' }, 'common'],
  ['c4', 'Nightwing', { shape: 1, pattern: 'dots', colors: [W.lav, W.orchid, W.cream], tail: true }, 'common'],
  ['c5', 'Heartwing', { shape: 5, pattern: 'eyes', colors: [W.pink, W.rose, W.cream] }, 'common'],
  ['c6', 'Swallowtail', { shape: 1, pattern: 'bands', colors: [W.butter, W.peach, W.ink], tail: true }, 'rare'],
  ['c7', 'Clover Queen', { shape: 4, pattern: 'tips', colors: [W.lime, W.mint, W.gold] }, 'rare'],
  ['c8', 'Puddle Jumper', { shape: 2, pattern: 'dots', colors: [W.sky, W.mint, W.cream], antenna: 'curl' }, 'rare'],
  ['c9', 'Hearth Emperor', { shape: 5, pattern: 'bands', colors: [W.peach, W.rose, W.gold] }, 'rare'],
  ['c10', 'Moonlit Luna', { shape: 1, pattern: 'eyes', colors: [W.mint, W.sky, W.butter], tail: true, antenna: 'feather' }, 'rare'],
  ['c11', 'Rose Admiral', { shape: 4, pattern: 'stripes', colors: [W.rose, W.pink, W.ink] }, 'rare'],
  ['c12', 'Grand Monarch', { shape: 0, pattern: 'veins', colors: [W.peach, W.butter, W.ink], antenna: 'curl' }, 'legendary'],
];

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-flight',
    species: 'Meadow Sprite',
    title: 'First flight',
    description: 'Finish your first puzzle.',
    category: 'Journey',
    tier: 'common',
    spec: { shape: 0, pattern: 'plain', colors: [W.pink, W.lav, W.cream] },
    progress: ctx => flag(ctx.journal.puzzles > 0 || ctx.summary.levels.length > 0 || ctx.summary.dailyDates.length > 0),
  },
  ...CHAPTER_SPECIES.map(([chId, species, spec, tier]): Achievement => {
    const ch = CHAPTERS.find(c => c.id === chId)!;
    return {
      id: `chapter-${chId}`,
      species,
      title: `${ch.name} complete`,
      description: `Finish all ${ch.levels.length} levels of ${ch.name}.`,
      category: 'Journey',
      tier,
      spec,
      progress: ctx => count(chapterDone(ctx, chId), ch.levels.length),
    };
  }),
  {
    id: 'stars-50',
    species: 'Stardust Blue',
    title: 'Star collector',
    description: 'Earn 50 stars on the level map.',
    category: 'Journey',
    tier: 'common',
    spec: { shape: 3, pattern: 'dots', colors: [W.sky, W.butter, W.cream] },
    progress: ctx => count(totalStars(ctx), 50),
  },
  {
    id: 'stars-250',
    species: 'Comet Tail',
    title: 'Constellation',
    description: 'Earn 250 stars on the level map.',
    category: 'Journey',
    tier: 'rare',
    spec: { shape: 1, pattern: 'stripes', colors: [W.lav, W.gold, W.cream], tail: true },
    progress: ctx => count(totalStars(ctx), 250),
  },
  {
    id: 'stars-1000',
    species: 'Aurora Emperor',
    title: 'Galaxy',
    description: 'Earn 1,000 stars on the level map.',
    category: 'Journey',
    tier: 'legendary',
    spec: { shape: 5, pattern: 'marble', colors: [W.orchid, W.mint, W.gold], antenna: 'feather' },
    progress: ctx => count(totalStars(ctx), 1000),
  },
  {
    id: 'daily-first',
    species: 'Morning Dew',
    title: 'Good morning',
    description: 'Finish your first daily puzzle.',
    category: 'Daily',
    tier: 'common',
    spec: { shape: 2, pattern: 'spots', colors: [W.sky, W.cream, W.butter] },
    progress: ctx => count(ctx.summary.dailyDates.length, 1),
  },
  {
    id: 'streak-3',
    species: 'Ember Wing',
    title: 'On a roll',
    description: 'Reach a 3-day daily streak.',
    category: 'Daily',
    tier: 'common',
    spec: { shape: 0, pattern: 'bands', colors: [W.peach, W.rose, W.butter] },
    progress: ctx => count(ctx.summary.bestStreak, 3),
  },
  {
    id: 'streak-7',
    species: 'Week Warden',
    title: 'Week of wings',
    description: 'Reach a 7-day daily streak.',
    category: 'Daily',
    tier: 'rare',
    spec: { shape: 4, pattern: 'eyes', colors: [W.butter, W.peach, W.ink], antenna: 'curl' },
    progress: ctx => count(ctx.summary.bestStreak, 7),
  },
  {
    id: 'streak-30',
    species: 'Phoenix Tail',
    title: 'Unbroken',
    description: 'Reach a 30-day daily streak.',
    category: 'Daily',
    tier: 'legendary',
    spec: { shape: 1, pattern: 'tips', colors: [W.rose, W.gold, W.butter], tail: true, antenna: 'curl' },
    progress: ctx => count(ctx.summary.bestStreak, 30),
  },
  {
    id: 'daily-25',
    species: 'Almanac Moth',
    title: 'Almanac',
    description: 'Finish 25 daily puzzles.',
    category: 'Daily',
    tier: 'rare',
    spec: { shape: 2, pattern: 'stripes', colors: [W.butter, W.lav, W.ink], antenna: 'feather' },
    progress: ctx => count(ctx.summary.dailyDates.length, 25),
  },
  {
    id: 'no-hint-10',
    species: 'Clear Sight',
    title: 'Sharp eyes',
    description: 'Finish 10 puzzles without a hint.',
    category: 'Skill',
    tier: 'rare',
    spec: { shape: 3, pattern: 'eyes', colors: [W.lav, W.sky, W.cream] },
    progress: ctx => count(ctx.journal.noHintClears, 10),
  },
  {
    id: 'swift-hard',
    species: 'Hawk Moth',
    title: 'Swift',
    description: 'Finish a hard puzzle in 2 minutes or less.',
    category: 'Skill',
    tier: 'rare',
    spec: { shape: 3, pattern: 'stripes', colors: [W.peach, W.lav, W.ink], antenna: 'feather' },
    progress: ctx => flag((ctx.journal.best.hard ?? Infinity) <= 120),
  },
  {
    id: 'blitz-easy',
    species: 'Flicker',
    title: 'Blink and done',
    description: 'Finish an easy puzzle in 25 seconds or less.',
    category: 'Skill',
    tier: 'common',
    spec: { shape: 0, pattern: 'tips', colors: [W.lime, W.sky, W.gold] },
    progress: ctx => flag((ctx.journal.best.easy ?? Infinity) <= 25),
  },
  {
    id: 'combo-5',
    species: 'Chain Lightning',
    title: 'Combo master',
    description: 'Chain a 5-word combo (each find within 8 seconds).',
    category: 'Skill',
    tier: 'rare',
    spec: { shape: 4, pattern: 'bands', colors: [W.butter, W.sky, W.rose] },
    progress: ctx => count(ctx.journal.maxCombo, 4),
  },
  {
    id: 'race-1',
    species: 'Dash Sulphur',
    title: 'First to the flag',
    description: 'Win a race.',
    category: 'Race',
    tier: 'common',
    spec: { shape: 3, pattern: 'plain', colors: [W.gold, W.butter, W.ink] },
    progress: ctx => count(ctx.summary.raceWins, 1),
  },
  {
    id: 'race-10',
    species: 'Racing Fritillary',
    title: 'Front runner',
    description: 'Win 10 races.',
    category: 'Race',
    tier: 'rare',
    spec: { shape: 4, pattern: 'dots', colors: [W.peach, W.gold, W.ink] },
    progress: ctx => count(ctx.summary.raceWins, 10),
  },
  {
    id: 'race-50',
    species: 'Champion Birdwing',
    title: 'Champion',
    description: 'Win 50 races.',
    category: 'Race',
    tier: 'legendary',
    spec: { shape: 1, pattern: 'marble', colors: [W.mint, W.lime, W.gold], tail: true, antenna: 'feather' },
    progress: ctx => count(ctx.summary.raceWins, 50),
  },
  {
    id: 'together-1',
    species: 'Twin Hearts',
    title: 'Better together',
    description: 'Clear a board together in co-op.',
    category: 'Race',
    tier: 'common',
    spec: { shape: 5, pattern: 'spots', colors: [W.orchid, W.pink, W.cream] },
    progress: ctx =>
      flag(ctx.journal.together > 0 || ctx.summary.collection.some(c => c.butterfly_style_id.startsWith('together-'))),
  },
  {
    id: 'friend-1',
    species: 'Kindred Spirit',
    title: 'Kindred spirit',
    description: 'Add a friend.',
    category: 'Race',
    tier: 'common',
    spec: { shape: 5, pattern: 'dots', colors: [W.pink, W.mint, W.cream], antenna: 'curl' },
    progress: ctx => count(ctx.summary.friends, 1),
  },
  {
    id: 'explorer',
    species: 'Wanderer',
    title: 'Explorer',
    description: `Finish a free-play puzzle in all ${FREE_PLAY_THEME_IDS.length} themes.`,
    category: 'Explorer',
    tier: 'rare',
    spec: { shape: 5, pattern: 'veins', colors: [W.mint, W.peach, W.gold] },
    progress: ctx => count(ctx.journal.themes.filter(t => FREE_PLAY_THEME_IDS.includes(t)).length, FREE_PLAY_THEME_IDS.length),
  },
  {
    id: 'night-owl',
    species: 'Owl Moth',
    title: 'Night owl',
    description: 'Finish a puzzle between midnight and 4 am.',
    category: 'Explorer',
    tier: 'common',
    spec: { shape: 2, pattern: 'eyes', colors: [W.lav, W.orchid, W.butter], antenna: 'feather' },
    progress: ctx => flag(ctx.journal.nightOwl),
  },
  {
    id: 'early-bird',
    species: 'Dawn Glider',
    title: 'Early bird',
    description: 'Finish a puzzle between 5 and 7 am.',
    category: 'Explorer',
    tier: 'common',
    spec: { shape: 0, pattern: 'marble', colors: [W.butter, W.pink, W.cream] },
    progress: ctx => flag(ctx.journal.earlyBird),
  },
  {
    id: 'words-100',
    species: 'Letter Leaf',
    title: 'Wordsmith',
    description: 'Find 100 words.',
    category: 'Explorer',
    tier: 'common',
    spec: { shape: 0, pattern: 'stripes', colors: [W.mint, W.butter, W.cream] },
    progress: ctx => count(wordsFound(ctx), 100),
  },
  {
    id: 'words-1000',
    species: 'Scribe Wing',
    title: 'Bookworm',
    description: 'Find 1,000 words.',
    category: 'Explorer',
    tier: 'rare',
    spec: { shape: 2, pattern: 'veins', colors: [W.lav, W.sky, W.gold] },
    progress: ctx => count(wordsFound(ctx), 1000),
  },
  {
    id: 'words-5000',
    species: 'Lexicon Emperor',
    title: 'Living dictionary',
    description: 'Find 5,000 words.',
    category: 'Explorer',
    tier: 'legendary',
    spec: { shape: 4, pattern: 'marble', colors: [W.pink, W.lav, W.gold], antenna: 'curl' },
    progress: ctx => count(wordsFound(ctx), 5000),
  },
  {
    id: 'tokens-500',
    species: 'Golden Hoard',
    title: 'Treasure keeper',
    description: 'Earn 500 butterfly tokens in total.',
    category: 'Explorer',
    tier: 'rare',
    spec: { shape: 5, pattern: 'tips', colors: [W.gold, W.butter, W.peach] },
    progress: ctx => count(ctx.summary.tokensLifetime, 500),
  },
];

export const ACHIEVEMENT_BY_ID = new Map(ACHIEVEMENTS.map(a => [a.id, a]));
export const achievementStyleId = (id: string) => `ach-${id}`;

export function unlockedIds(collection: CollectionEntry[]): Set<string> {
  return new Set(
    collection.filter(c => c.butterfly_style_id?.startsWith('ach-')).map(c => c.butterfly_style_id.slice(4))
  );
}

/** Achievements whose progress is complete but that are not yet stored. */
export function newlyEarned(summary: PlayerSummary, journal: Journal = readJournal()): Achievement[] {
  const have = unlockedIds(summary.collection);
  const ctx = { summary, journal };
  return ACHIEVEMENTS.filter(a => {
    if (have.has(a.id)) return false;
    const [v, t] = a.progress(ctx);
    return v >= t;
  });
}

let syncing: Promise<Achievement[]> | null = null;
/**
 * Ids already sent to the server this session. A row the server did not
 * insert (it already existed, or was refused) must not be retried on every
 * summary refresh, which fed back into itself: sync -> refresh -> sync.
 */
const attempted = new Set<string>();

/**
 * Stores any achievements the player has earned, pays the bonus, and returns
 * the new ones so the caller can celebrate them. Safe to call often; runs one
 * at a time and the unique index stops double awards across devices.
 */
export function syncAchievements(summary: PlayerSummary): Promise<Achievement[]> {
  if (!syncing) syncing = runSync(summary).finally(() => (syncing = null));
  return syncing;
}

async function runSync(summary: PlayerSummary): Promise<Achievement[]> {
  const fresh = newlyEarned(summary).filter(a => !attempted.has(`${summary.scope}:${a.id}`));
  if (fresh.length === 0) return [];
  fresh.forEach(a => attempted.add(`${summary.scope}:${a.id}`));
  const now = new Date().toISOString();
  const rows = fresh.map(a => ({
    butterfly_style_id: achievementStyleId(a.id),
    earned_from: a.title,
    earned_at: now,
  }));

  const user = await getCurrentUser();
  if (user) {
    const { data, error } = await supabase
      .from('butterfly_collection')
      .upsert(
        rows.map(r => ({ ...r, user_id: user.id })),
        { onConflict: 'user_id,butterfly_style_id', ignoreDuplicates: true }
      )
      .select('butterfly_style_id');
    if (error) {
      console.error('Award achievements failed:', error);
      return [];
    }
    // Only celebrate (and pay for) rows this call actually inserted: another
    // device may have awarded the same butterfly a moment ago.
    const inserted = new Set((data ?? []).map(r => r.butterfly_style_id as string));
    const won = fresh.filter(a => inserted.has(achievementStyleId(a.id)));
    if (won.length === 0) return [];
    await patchSummary(s => ({ ...s, collection: [...s.collection, ...rows.filter(r => inserted.has(r.butterfly_style_id))] }));
    await earnTokens(won.length * ACHIEVEMENT_BONUS);
    refreshSummary();
    return won;
  }

  const local = readJSON<CollectionEntry[]>('nhako_collection', []);
  const have = new Set(local.map(c => c.butterfly_style_id));
  const add = rows.filter(r => !have.has(r.butterfly_style_id));
  if (add.length === 0) return [];
  writeJSON('nhako_collection', [...local, ...add]);
  await patchSummary(s => ({ ...s, collection: [...s.collection, ...add] }));
  const won = fresh.filter(a => add.some(r => r.butterfly_style_id === achievementStyleId(a.id)));
  if (won.length) await earnTokens(won.length * ACHIEVEMENT_BONUS);
  return won;
}
