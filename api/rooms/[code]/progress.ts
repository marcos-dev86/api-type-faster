import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../../../lib/db';
import { handleOptions } from '../../../lib/http';
import { publicarNaSala } from '../../../lib/ably';
import { sortearPalavra } from '../../../lib/palavras';

/**
 * POST /api/rooms/:code/progress
 * Salva a pontuação de um jogador e já devolve a próxima palavra DELE,
 * sorteada sem repetir nenhuma palavra que ele já recebeu nesta partida.
 * Body: { playerId: string (uuid), score: number, wordsCompleted: number }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ erro: 'Método não permitido' });
    return;
  }

  const codigo = String(req.query.code ?? '').toUpperCase();
  const { playerId, score, wordsCompleted } = req.body ?? {};

  if (!playerId || typeof score !== 'number' || typeof wordsCompleted !== 'number') {
    res.status(400).json({ erro: 'playerId, score e wordsCompleted são obrigatórios' });
    return;
  }

  try {
    const salas = await sql`SELECT id FROM rooms WHERE code = ${codigo}`;

    if (salas.length === 0) {
      res.status(404).json({ erro: 'Sala não encontrada' });
      return;
    }

    const sala = salas[0];

    const linhas = await sql`
      SELECT used_words
      FROM room_players
      WHERE room_id = ${sala.id} AND player_id = ${playerId}
    `;

    if (linhas.length === 0) {
      res.status(404).json({ erro: 'Jogador não encontrado nesta sala' });
      return;
    }

    const usadasPeloJogador: string[] = linhas[0].used_words ?? [];
    const novaPalavra = sortearPalavra(usadasPeloJogador);

    await sql`
      UPDATE room_players
      SET score = ${score},
          words_completed = ${wordsCompleted},
          current_word = ${novaPalavra},
          used_words = array_append(used_words, ${novaPalavra})
      WHERE room_id = ${sala.id} AND player_id = ${playerId}
    `;

    const jogadores = await sql`
      SELECT player_id, name, score, words_completed
      FROM room_players
      WHERE room_id = ${sala.id}
    `;

    // Publica só o placar — a palavra sorteada continua sendo só do jogador.
    await publicarNaSala(codigo, 'progresso-atualizado', { playerId, score, wordsCompleted });

    res.status(200).json({ jogadores, novaPalavra });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao salvar progresso' });
  }
}
