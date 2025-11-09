ALTER TABLE game_history
ADD COLUMN match_type TEXT NOT NULL DEFAULT 'quick';

ALTER TABLE game_history
ADD COLUMN tournament_round TEXT;

UPDATE game_history
SET match_type =
  CASE
    WHEN tournament_id IS NOT NULL THEN 'tournament'
    ELSE 'quick'
  END;
