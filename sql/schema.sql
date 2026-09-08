CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(6) UNIQUE NOT NULL,
  host_id UUID NOT NULL,
  guest_id UUID,
  winner_id UUID,
  status VARCHAR(20) NOT NULL DEFAULT 'waiting', -- ele guarda o status da partida, waiting | playing | finished
  word VARCHAR(20),
  started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS room_players (
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL,
  name VARCHAR(30) NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  words_completed INTEGER NOT NULL DEFAULT 0,
  current_word VARCHAR(10),        -- palavra que este jogador está digitando agora
  used_words TEXT[] NOT NULL DEFAULT '{}', -- palavras que ele já recebeu nesta partida, para não repitir
  PRIMARY KEY (room_id, player_id)
);

-- Acelera a busca de salas por código, que acontece em quase toda rota.
-- INDEX que já foi explicado nas aulas
CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms (code);

-- Perfil persistente do jogador (sobrevive entre partidas e salas).
-- O id é o mesmo playerId (UUID) que o celular já gera e guarda localmente.
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY,
  name VARCHAR(30) NOT NULL DEFAULT 'NOME',
  avatar TEXT, -- aceita URL de imagem, mesmo que sejam gigantes (ex: "data:image/jpeg")
  xp INTEGER NOT NULL DEFAULT 0,
  matches_played INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Histórico de partidas já encerradas (fica guardado mesmo depois que a sala em si não é mais usada).
-- é umado para guardar o historico do jogador
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
  winner_id UUID, --se NULL = empate
  finished_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_host ON matches (host_id);
CREATE INDEX IF NOT EXISTS idx_matches_guest ON matches (guest_id);
CREATE INDEX IF NOT EXISTS idx_matches_room ON matches (room_id);

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

ALTER TABLE room_players
  ADD COLUMN IF NOT EXISTS current_word VARCHAR(10),
  ADD COLUMN IF NOT EXISTS used_words TEXT[] NOT NULL DEFAULT '{}';
