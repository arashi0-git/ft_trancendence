CREATE TABLE IF NOT EXISTS game_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    tournament_id INTEGER,
    teammate TEXT,
    my_score INTEGER,
    opponent_score INTEGER,
    is_winner BOOLEAN,
    opponent_info TEXT,
    finished_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
);

CREATE INDEX IF NOT EXISTS idx_game_history_user ON game_history(user_id);
CREATE INDEX IF NOT EXISTS idx_game_history_tournament ON game_history(tournament_id);
CREATE INDEX IF NOT EXISTS idx_game_history_finished_at ON game_history(finished_at DESC);
