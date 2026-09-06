import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../../../lib/db';
import { handleOptions } from '../../../lib/http';

/**
 * GET /api/players/:playerId/history?limit=10
 * Devolve as últimas partidas encerradas desse jogador, já do ponto de
 * vista dele (nome do adversário, se venceu/perdeu/empatou, XP ganho).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  if (req.method !== 'GET') {
    res.status(405).json({ erro: 'Método não permitido' });
    return;
  }

  const playerId = String(req.query.playerId ?? '');
  const limite = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);

  if (!playerId) {
    res.status(400).json({ erro: 'playerId é obrigatório' });
    return;
  }

  try {
    const linhas = await sql`
      SELECT *
      FROM matches
      WHERE host_id = ${playerId} OR guest_id = ${playerId}
      ORDER BY finished_at DESC
      LIMIT ${limite}
    `;

    const historico = linhas.map((partida: any) => {
      const souHost = partida.host_id === playerId;

      const meuScore = souHost ? partida.host_score : partida.guest_score;
      const scoreOponente = souHost ? partida.guest_score : partida.host_score;
      const nomeOponente = souHost ? partida.guest_name : partida.host_name;
      const xpGanho = souHost ? partida.host_xp_ganho : partida.guest_xp_ganho;

      const resultado = !partida.winner_id
        ? 'EMPATE'
        : partida.winner_id === playerId
          ? 'VITORIA'
          : 'DERROTA';

      return {
        codigo: partida.code,
        oponente: nomeOponente,
        meuScore,
        scoreOponente,
        resultado,
        xpGanho,
        data: partida.finished_at,
      };
    });

    res.status(200).json({ historico });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao buscar histórico' });
  }
}
