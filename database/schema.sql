-- DBの初期化（PRAGMA）＋認証に必要なテーブル定義＋便利なインデックスやトリガ-

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    profile_image_url TEXT,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    is_online BOOLEAN DEFAULT FALSE,
    last_login DATETIME DEFAULT CURRENT_TIMESTAMP,
    token_version INTEGER DEFAULT 0,
    two_factor_enabled BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS two_factor_challenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    code_hash TEXT NOT NULL,
    purpose TEXT NOT NULL,
    payload TEXT,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_two_factor_challenges_user ON two_factor_challenges(user_id);

CREATE TABLE IF NOT EXISTS tournaments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    status TEXT CHECK(status IN ('waiting', 'in_progress', 'completed')) DEFAULT 'waiting',
    max_players INTEGER NOT NULL,
    current_players INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME,
    winner_id INTEGER
);


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

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Game History table
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
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_game_history_user ON game_history(user_id);
CREATE INDEX IF NOT EXISTS idx_game_history_tournament ON game_history(tournament_id);
CREATE INDEX IF NOT EXISTS idx_game_history_finished_at ON game_history(finished_at DESC);
