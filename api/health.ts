import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleOptions } from '../lib/http';

// Rota simples para testar se o deploy está no ar.
// GET /api/health
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  res.status(200).json({ status: 'ok', servico: 'typefaster-api' });
}
