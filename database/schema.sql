
-- Enable Write-Ahead Logging mode for better concurrent database access
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,  -- Auto-incrementing unique identifier for each user
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    profile_image_url TEXT,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_online BOOLEAN DEFAULT FALSE,
    last_login DATETIME DEFAULT CURRENT_TIMESTAMP,
    token_version INTEGER NOT NULL DEFAULT 0,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    language TEXT DEFAULT 'en' CHECK(language IN ('en', 'cs', 'jp'))
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS two_factor_challenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    code_hash TEXT NOT NULL,
    purpose TEXT NOT NULL,
    payload TEXT,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE --Enforces referential integrity so deleting a user automatically removes their dependent rows (no orphan records).
);

CREATE INDEX IF NOT EXISTS idx_two_factor_challenges_user ON two_factor_challenges(user_id);

CREATE TABLE IF NOT EXISTS user_friends (
    user_id INTEGER NOT NULL,
    friend_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, friend_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_friends_user ON user_friends(user_id);
CREATE INDEX IF NOT EXISTS idx_user_friends_friend ON user_friends(friend_id);

CREATE TABLE IF NOT EXISTS game_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    match_type TEXT NOT NULL DEFAULT 'quick',
    tournament_id INTEGER,
    tournament_name TEXT,
    tournament_round TEXT,
    teammate TEXT,
    my_score INTEGER,
    opponent_score INTEGER,
    is_winner BOOLEAN,
    opponent_info TEXT,
    finished_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_game_history_user ON game_history(user_id);
CREATE INDEX IF NOT EXISTS idx_game_history_tournament ON game_history(tournament_id);
CREATE INDEX IF NOT EXISTS idx_game_history_finished_at ON game_history(finished_at DESC);
