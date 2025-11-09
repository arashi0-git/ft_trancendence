ALTER TABLE game_history
ADD COLUMN IF NOT EXISTS match_type TEXT NOT NULL DEFAULT 'quick';

ALTER TABLE game_history
ADD COLUMN IF NOT EXISTS tournament_round TEXT;

UPDATE game_history
SET match_type =
  CASE
    WHEN tournament_id IS NOT NULL THEN 'tournament'
    ELSE 'quick'
  END;
