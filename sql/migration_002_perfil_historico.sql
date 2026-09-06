-- Rode isso no editor SQL do Neon (adiciona o que falta, sem apagar nada).

CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY,
  name VARCHAR(30) NOT NULL DEFAULT 'NOME',
  avatar TEXT,
  xp INTEGER NOT NULL DEFAULT 0,
  matches_played INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  code VARCHAR(6) NOT NULL,
  host_id UUID NOT NULL,
  guest_id UUID NOT NULL,
  host_name VARCHAR(30) NOT NULL,
  guest_name VARCHAR(30) NOT NULL,
  host_score INTEGER NOT NULL,
  guest_score INTEGER NOT NULL,
  host_xp_ganho INTEGER NOT NULL DEFAULT 0,
  guest_xp_ganho INTEGER NOT NULL DEFAULT 0,
  winner_id UUID,
  finished_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_host ON matches (host_id);
CREATE INDEX IF NOT EXISTS idx_matches_guest ON matches (guest_id);
CREATE INDEX IF NOT EXISTS idx_matches_room ON matches (room_id);
