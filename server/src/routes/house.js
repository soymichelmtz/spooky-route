import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from './auth.js';

const prisma = new PrismaClient();
const router = express.Router();

// Crear o actualizar casa del usuario autenticado
router.post('/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { givingCandy, address } = req.body; // address será un objeto estructurado
    /* address shape esperado:
      {
        fullText: string (obligatorio - resultado elegido),
        street?: string,
        number?: string,
        suburb?: string,
        city?: string,
        municipality?: string,
        state?: string,
        postcode?: string,
        country?: string,
        lat?: number,
        lng?: number
      }
    */
    if (!address || !address.fullText) return res.status(400).json({ error: 'address.fullText requerido' });

    // Asegurar lat/lng si vienen; si no, error (por ahora obligamos a que el front use autocompletado que incluye coords)
    if (typeof address.lat !== 'number' || typeof address.lng !== 'number') {
      return res.status(400).json({ error: 'address.lat y address.lng requeridos (elige sugerencia válida)' });
    }

    // Permitir que el usuario agregue manualmente houseNumber si no viene en provider
    const lat = address.lat;
    const lng = address.lng;
    const houseNumber = (address.houseNumber || address.number || (address.address && address.address.house_number)) || null;
    const street = address.street || (address.address && (address.address.road || address.address.street)) || null;
    const suburb = address.suburb || (address.address && (address.address.suburb || address.address.neighbourhood || address.address.colony)) || null;
    const city = address.city || (address.address && (address.address.city || address.address.town)) || null;
    const municipality = address.municipality || (address.address && (address.address.county || address.address.municipality)) || null;
    const state = address.state || (address.address && address.address.state) || null;
    const postcode = address.postcode || (address.address && address.address.postcode) || null;
    const country = address.country || (address.address && (address.address.country || address.address.country_code)) || null;

    // Reconstruir addressText de forma determinista a partir de campos disponibles.
    // Regla: si tenemos al menos street o houseNumber, generamos "<street> <houseNumber>, <suburb>, <city/municipality>, <state>, <postcode>, <country>"
    // Caso contrario usamos address.fullText (resultado de la sugerencia original)
    let addressText;
    if (street || houseNumber) {
      const line1 = [street, houseNumber].filter(Boolean).join(' ').trim();
      const tail = [suburb, city || municipality, state, postcode, country].filter(Boolean);
      addressText = [line1, ...tail].filter(Boolean).join(', ');
      // fallback si quedó vacío por algún motivo
      if (!addressText.trim()) addressText = address.fullText;
    } else {
      addressText = address.fullText;
    }

    const existing = await prisma.house.findUnique({ where: { userId } });

    // Si ya hay casa y no se envía address (o viene igual) permitimos update; si no hay cambios relevantes podemos devolver early
    const data = { lat, lng, addressText, givingCandy: !!givingCandy, street, houseNumber, suburb, city, municipality, state, postcode, country };

    // Verificar duplicado de addressText (otro usuario)
    const duplicate = await prisma.house.findFirst({ where: { addressText, NOT: { userId } } });
    if (duplicate) {
      return res.status(409).json({ error: 'Esa dirección ya está registrada por otro usuario' });
    }

    let house;
    if (existing) {
      house = await prisma.house.update({ where: { userId }, data });
    } else {
      house = await prisma.house.create({ data: { userId, ...data } });
    }
    // Devolver siempre la casa resultante
    res.json(house);
  } catch (e) {
    console.error(e);
    if (e.code === 'P2002') { // unique constraint violation (addressText o userId)
      return res.status(409).json({ error: 'Dirección ya registrada' });
    }
    res.status(500).json({ error: 'Error guardando casa' });
  }
});

// Obtener la casa del usuario autenticado
router.get('/me', authMiddleware, async (req, res) => {
  const userId = req.user.sub;
  const house = await prisma.house.findUnique({ where: { userId } });
  res.json(house || null);
});

// Listar casas que entregan dulces (público)
router.get('/', async (_req, res) => {
  const houses = await prisma.house.findMany({ where: { givingCandy: true }, include: { user: { select: { username: true } } } });
  res.json(houses.map(h => ({
    id: h.id,
    lat: h.lat,
    lng: h.lng,
    addressText: h.addressText,
    street: h.street,
    houseNumber: h.houseNumber,
    suburb: h.suburb,
    city: h.city,
    municipality: h.municipality,
    state: h.state,
    postcode: h.postcode,
    country: h.country,
    username: h.user.username,
    updatedAt: h.updatedAt,
  })));
});

export default router;
