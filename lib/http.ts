import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Libera o acesso da API para o app Expo (que roda em outra origem)
 * e trata a requisição de preflight (OPTIONS) do CORS.
 * Retorna true quando a requisição já foi respondida (era um OPTIONS).
 */
export function handleOptions(req: VercelRequest, res: VercelResponse): boolean {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}
