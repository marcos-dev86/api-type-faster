-- Execute este script no editor SQL do Neon antes do primeiro deploy.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(6) UNIQUE NOT NULL,
  host_id UUID NOT NULL,
  guest_id UUID,
  winner_id UUID,
  status VARCHAR(20) NOT NULL DEFAULT 'waiting', -- waiting | playing | finished
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
  used_words TEXT[] NOT NULL DEFAULT '{}', -- palavras que ESTE jogador já recebeu nesta partida
  PRIMARY KEY (room_id, player_id)
);

-- Acelera a busca de salas por código, que acontece em quase toda rota.
CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms (code);
