import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../../../lib/db';
import { handleOptions } from '../../../lib/http';
import { publicarNaSala } from '../../../lib/ably';

/**
 * POST /api/rooms/:code/finish
 * Fecha a partida e calcula o vencedor com base na pontuação salva
 * no banco (nunca confie apenas no placar local do celular).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ erro: 'Método não permitido' });
    return;
  }

  const codigo = String(req.query.code ?? '').toUpperCase();

  try {
    const salas = await sql`SELECT * FROM rooms WHERE code = ${codigo}`;

    if (salas.length === 0) {
      res.status(404).json({ erro: 'Sala não encontrada' });
      return;
    }

    const sala = salas[0];

    const jogadores = await sql`
      SELECT player_id, name, score, words_completed
      FROM room_players
      WHERE room_id = ${sala.id}
      ORDER BY score DESC
    `;

    const vencedor = jogadores[0] ?? null;
    const empate = jogadores.length === 2 && jogadores[0].score === jogadores[1].score;

    await sql`
      UPDATE rooms
      SET status = 'finished', winner_id = ${empate ? null : vencedor?.player_id ?? null}
      WHERE id = ${sala.id}
    `;

    const resultado = { jogadores, vencedor: empate ? null : vencedor, empate };

    await publicarNaSala(codigo, 'partida-finalizada', resultado);

    res.status(200).json(resultado);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao finalizar partida' });
  }
}
