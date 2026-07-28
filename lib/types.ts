/** Shared row/record shapes, so callers stop reaching for `any`. */

/** A butterfly as stored locally for guests (mirrors butterfly_collection). */
export interface CollectionEntry {
  butterfly_style_id: string;
  earned_from: string;
  earned_at: string;
}

/** A row of level_progress, or its localStorage equivalent. */
export interface LevelProgressRow {
  level_id: string;
  stars: number;
  best_time_seconds?: number | null;
}
