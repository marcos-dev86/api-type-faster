import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ably } from '../lib/ably';
import { handleOptions } from '../lib/http';

/**
 * POST /api/ably-token
 * Gera um token temporário do Ably para o app usar no lugar da chave
 * privada (que nunca deve ir para o celular). Se "code" for enviado,
 * o token só terá permissão no canal daquela sala.
 * Body: { playerId: string, code?: string }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ erro: 'Método não permitido' });
    return;
  }

  const { playerId, code } = req.body ?? {};

  if (!playerId) {
    res.status(400).json({ erro: 'playerId é obrigatório' });
    return;
  }

  try {
    const tokenRequestData = await ably.auth.createTokenRequest({
      clientId: String(playerId),
      capability: code
        ? { [`room:${String(code).toUpperCase()}`]: ['subscribe', 'publish', 'presence'] }
        : { 'room:*': ['subscribe', 'publish', 'presence'] },
    });

    res.status(200).json(tokenRequestData);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao gerar token do Ably' });
  }
}
