import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../../../lib/db';
import { handleOptions } from '../../../lib/http';
import { publicarNaSala } from '../../../lib/ably';

/**
 * POST /api/rooms/:code/progress
 * Salva a pontuação e palavras concluídas de um jogador,
 * e publica a atualização para o outro celular ver na hora.
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

    await sql`
      UPDATE room_players
      SET score = ${score}, words_completed = ${wordsCompleted}
      WHERE room_id = ${sala.id} AND player_id = ${playerId}
    `;

    const jogadores = await sql`
      SELECT player_id, name, score, words_completed
      FROM room_players
      WHERE room_id = ${sala.id}
    `;

    await publicarNaSala(codigo, 'progresso-atualizado', { playerId, score, wordsCompleted });

    res.status(200).json({ jogadores });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao salvar progresso' });
  }
}
