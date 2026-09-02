import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../../../lib/db';
import { handleOptions } from '../../../lib/http';
import { publicarNaSala } from '../../../lib/ably';

/**
 * POST /api/rooms/:code/join
 * Segundo jogador entra na sala usando o código.
 * Body: { playerId: string (uuid), playerName: string }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ erro: 'Método não permitido' });
    return;
  }

  const codigo = String(req.query.code ?? '').toUpperCase();
  const { playerId, playerName } = req.body ?? {};

  if (!playerId || !playerName) {
    res.status(400).json({ erro: 'playerId e playerName são obrigatórios' });
    return;
  }

  try {
    const salas = await sql`SELECT * FROM rooms WHERE code = ${codigo}`;

    if (salas.length === 0) {
      res.status(404).json({ erro: 'Sala não encontrada' });
      return;
    }

    const sala = salas[0];

    if (sala.host_id === playerId) {
      res.status(409).json({ erro: 'Você já é o host desta sala' });
      return;
    }

    if (sala.guest_id && sala.guest_id !== playerId) {
      res.status(409).json({ erro: 'Sala já está cheia' });
      return;
    }

    if (!sala.guest_id) {
      await sql`UPDATE rooms SET guest_id = ${playerId} WHERE id = ${sala.id}`;
      await sql`
        INSERT INTO room_players (room_id, player_id, name)
        VALUES (${sala.id}, ${playerId}, ${playerName})
        ON CONFLICT (room_id, player_id) DO NOTHING
      `;
    }

    const [salaAtualizada] = await sql`SELECT * FROM rooms WHERE id = ${sala.id}`;
    const jogadores = await sql`
      SELECT player_id, name, score, words_completed
      FROM room_players
      WHERE room_id = ${sala.id}
    `;

    // Avisa em tempo real que a sala agora tem dois jogadores.
    await publicarNaSala(codigo, 'jogador-entrou', { sala: salaAtualizada, jogadores });

    res.status(200).json({ sala: salaAtualizada, jogadores });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao entrar na sala' });
  }
}
