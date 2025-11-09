ALTER TABLE users ADD COLUMN language TEXT DEFAULT 'en' CHECK(language IN ('en', 'cs', 'jp'));
