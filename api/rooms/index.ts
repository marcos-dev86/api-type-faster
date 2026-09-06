import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../../lib/db';
import { handleOptions } from '../../lib/http';

const CARACTERES = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem caracteres ambíguos (0/O, 1/I)

function gerarCodigo(): string {
  let codigo = '';
  for (let i = 0; i < 6; i++) {
    codigo += CARACTERES[Math.floor(Math.random() * CARACTERES.length)];
  }
  return codigo;
}

/**
 * POST /api/rooms
 * Cria uma sala nova. O jogador que cria vira o "host".
 * Body: { playerId: string (uuid), playerName: string }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ erro: 'Método não permitido' });
    return;
  }

  const { playerId, playerName } = req.body ?? {};

  if (!playerId || !playerName) {
    res.status(400).json({ erro: 'playerId e playerName são obrigatórios' });
    return;
  }

  try {
    let codigo = gerarCodigo();
    let tentativas = 0;

    // Garante que o código gerado ainda não está em uso.
    while (tentativas < 5) {
      const existente = await sql`SELECT id FROM rooms WHERE code = ${codigo}`;
      if (existente.length === 0) break;
      codigo = gerarCodigo();
      tentativas++;
    }

    const [sala] = await sql`
      INSERT INTO rooms (code, host_id, status)
      VALUES (${codigo}, ${playerId}, 'waiting')
      RETURNING id, code, status, created_at
    `;

    await sql`
      INSERT INTO room_players (room_id, player_id, name)
      VALUES (${sala.id}, ${playerId}, ${playerName})
    `;

    res.status(201).json({ sala });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao criar sala' });
  }
}
