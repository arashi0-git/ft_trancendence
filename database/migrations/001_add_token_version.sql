-- Migration: Add token_version column to users table
-- This allows invalidating JWT tokens on logout

ALTER TABLE users ADD COLUMN token_version INTEGER DEFAULT 0;

-- Update existing users to have token_version = 0
UPDATE users SET token_version = 0 WHERE token_version IS NULL;