-- DBの初期化（PRAGMA）＋認証に必要なテーブル定義＋便利なインデックスやトリガ-

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    is_online BOOLEAN DEFAULT FALSE,
    last_login DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tournaments (
    id PRIMARY KEY AUTOINCREMENT,
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

CREATE TABLE IF NOT EXISTS matches (
    id PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER,
    player1_id INTEGER,
    FOREIGN KEY (player1_id) REFERENCES users(id),
    player2_id INTEGER,
    FOREIGN KEY (player2_id) REFERENCES users(id),
    player1_score INTEGER DEFAULT 0,
    player2_score INTEGER DEFAULT 0,
    winner_id INTEGER,
    status TEXT CHECK(status IN ('in_progress', 'completed', 'abandoned')) DEFAULT 'in_progress',
    duration INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
    FOREIGN KEY (winner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS friendships (
    id PRIMARY KEY AUTOINCREMENT,
    requester_id INTEGER,
    FOREIGN KEY (requester_id) REFERENCES users(id),
    addressee_id INTEGER,
    FOREIGN KEY (addressee_id) REFERENCES users(id),
    status TEXT CHECK(status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending'
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);