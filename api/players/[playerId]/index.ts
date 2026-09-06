import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../../../lib/db';
import { handleOptions } from '../../../lib/http';
import { progressoDoNivel } from '../../../lib/nivel';

function montarPerfil(playerId: string, linha: any) {
  const { nivel, xpNoNivelAtual, xpParaProximoNivel, progresso } = progressoDoNivel(linha?.xp ?? 0);

  return {
    id: playerId,
    name: linha?.name ?? null,
    avatar: linha?.avatar ?? null,
    xp: linha?.xp ?? 0,
    nivel,
    xpNoNivelAtual,
    xpParaProximoNivel,
    progressoNivel: progresso,
    partidas: linha?.matches_played ?? 0,
    vitorias: linha?.wins ?? 0,
    derrotas: linha?.losses ?? 0,
    winrate:
      linha?.matches_played > 0
        ? Math.round((linha.wins / linha.matches_played) * 1000) / 10
        : 0,
  };
}

/**
 * GET  /api/players/:playerId  -> devolve o perfil (com valores zerados se o
 *      jogador ainda não jogou nenhuma partida — nunca dá 404).
 * POST /api/players/:playerId  -> atualiza nome e/ou avatar (base64 ou URL).
 *      Body: { name?: string, avatar?: string }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  const playerId = String(req.query.playerId ?? '');

  if (!playerId) {
    res.status(400).json({ erro: 'playerId é obrigatório' });
    return;
  }

  if (req.method === 'GET') {
    try {
      const linhas = await sql`SELECT * FROM players WHERE id = ${playerId}`;
      res.status(200).json(montarPerfil(playerId, linhas[0] ?? null));
    } catch (erro) {
      console.error(erro);
      res.status(500).json({ erro: 'Erro ao buscar perfil' });
    }
    return;
  }

  if (req.method === 'POST') {
    const { name, avatar } = req.body ?? {};

    if (name === undefined && avatar === undefined) {
      res.status(400).json({ erro: 'Envie name e/ou avatar para atualizar' });
      return;
    }

    try {
      const nomeFinal = typeof name === 'string' && name.trim() ? name.trim().slice(0, 30) : null;
      const avatarFinal = typeof avatar === 'string' && avatar.length > 0 ? avatar : null;

      const [linha] = await sql`
        INSERT INTO players (id, name, avatar)
        VALUES (${playerId}, COALESCE(${nomeFinal}, 'NOME'), ${avatarFinal})
        ON CONFLICT (id) DO UPDATE SET
          name = COALESCE(${nomeFinal}, players.name),
          avatar = COALESCE(${avatarFinal}, players.avatar),
          updated_at = NOW()
        RETURNING *
      `;

      res.status(200).json(montarPerfil(playerId, linha));
    } catch (erro) {
      console.error(erro);
      res.status(500).json({ erro: 'Erro ao atualizar perfil' });
    }
    return;
  }

  res.status(405).json({ erro: 'Método não permitido' });
}
