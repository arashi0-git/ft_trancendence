ALTER TABLE game_history
ADD COLUMN IF NOT EXISTS tournament_name TEXT;
