import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change';
const TOKEN_EXP = '1h';

router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username y password requeridos' });
    const raw = username.trim();
    if (raw.length < 3 || raw.length > 32) return res.status(400).json({ error: 'El usuario debe tener 3-32 caracteres' });
    if (!/^[a-zA-Z0-9_]+$/.test(raw)) return res.status(400).json({ error: 'Sólo letras, números y _' });
    // Búsqueda case-sensitive (SQLite) + normalización a lower para ver si existe variante distinta
    const lower = raw.toLowerCase();
    const existingExact = await prisma.user.findUnique({ where: { username: raw } });
    if (existingExact) return res.status(409).json({ error: 'Usuario ya existe' });
    // Revisión adicional case-insensitive rudimentaria (fetch posibles coincidencias en minúsculas)
    const possible = await prisma.user.findMany({ where: { username: { in: [lower, lower.toUpperCase(), raw.toUpperCase(), raw.toLowerCase()] } }, take: 1 });
    if (possible.length) return res.status(409).json({ error: 'Usuario ya existe (insensible a mayúsculas)' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { username: raw, passwordHash } });
    res.status(201).json({ id: user.id, username: user.username });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error en registro' });
  }
});

// Aclaración si alguien hace GET directo en el navegador
router.get('/register', (_req, res) => {
  res.status(405).json({ error: 'Usa POST /auth/register con JSON {"username","password"}' });
});

// Endpoint para verificar disponibilidad de username
router.get('/check-username', async (req, res) => {
  try {
    const u = (req.query.u || '').toString().trim();
    if (!u) return res.json({ available: false, reason: 'Vacío' });
    if (u.length < 3 || u.length > 32) return res.json({ available: false, reason: 'Largo inválido' });
    if (!/^[a-zA-Z0-9_]+$/.test(u)) return res.json({ available: false, reason: 'Formato inválido' });
    const existing = await prisma.user.findFirst({ where: { username: { equals: u } } });
    if (existing) return res.json({ available: false, reason: 'Ocupado' });
    // Revisión básica case-insensitive
    const lower = u.toLowerCase();
    const variant = await prisma.user.findFirst({ where: { username: { in: [lower, lower.toUpperCase()] } } });
    if (variant) return res.json({ available: false, reason: 'Ocupado' });
    return res.json({ available: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ available: false, reason: 'Error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username y password requeridos' });

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, { expiresIn: TOKEN_EXP });
    res.json({ token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error en login' });
  }
});

router.get('/login', (_req, res) => {
  res.status(405).json({ error: 'Usa POST /auth/login con JSON {"username","password"}' });
});

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No auth header' });
  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) return res.status(401).json({ error: 'Formato token inválido' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido/expirado' });
  }
}

export default router;
