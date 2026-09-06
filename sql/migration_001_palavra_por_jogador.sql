-- Rode isso no editor SQL do Neon (na base que você já criou).
-- Adiciona o controle de palavra individual por jogador.

ALTER TABLE room_players
  ADD COLUMN IF NOT EXISTS current_word VARCHAR(10),
  ADD COLUMN IF NOT EXISTS used_words TEXT[] NOT NULL DEFAULT '{}';
