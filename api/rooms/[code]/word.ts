import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../../../lib/db';
import { handleOptions } from '../../../lib/http';

/**
 * GET /api/rooms/:code/word?playerId=...
 * Devolve a palavra atual DESTE jogador. Cada jogador só recebe a própria
 * palavra — a do adversário não aparece aqui.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  if (req.method !== 'GET') {
    res.status(405).json({ erro: 'Método não permitido' });
    return;
  }

  const codigo = String(req.query.code ?? '').toUpperCase();
  const playerId = String(req.query.playerId ?? '');

  if (!playerId) {
    res.status(400).json({ erro: 'playerId é obrigatório' });
    return;
  }

  try {
    const salas = await sql`SELECT id, status FROM rooms WHERE code = ${codigo}`;

    if (salas.length === 0) {
      res.status(404).json({ erro: 'Sala não encontrada' });
      return;
    }

    const sala = salas[0];

    if (sala.status !== 'playing') {
      res.status(409).json({ erro: 'A partida ainda não começou' });
      return;
    }

    const jogadores = await sql`
      SELECT current_word
      FROM room_players
      WHERE room_id = ${sala.id} AND player_id = ${playerId}
    `;

    if (jogadores.length === 0) {
      res.status(404).json({ erro: 'Jogador não encontrado nesta sala' });
      return;
    }

    res.status(200).json({ word: jogadores[0].current_word });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao buscar palavra' });
  }
}
