import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não configurada. Defina essa variável de ambiente na Vercel.');
}

// Cliente do Neon para consultas SQL via tagged template.
// Documentação: https://neon.tech/docs/serverless/serverless-driver
export const sql = neon(process.env.DATABASE_URL);
