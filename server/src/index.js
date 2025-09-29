import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import houseRoutes from './routes/house.js';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get('/api', (_req, res) => {
  res.json({ status: 'ok', message: 'Spooky Route API' });
});

app.use('/auth', authRoutes);
app.use('/houses', houseRoutes);

// --- Geocode inline route (/geocode/search) ---
// Caché simple en memoria (query -> {ts,data}) por 60s para reducir llamadas a Nominatim
const geoCache = new Map();
const GEO_TTL_MS = 60_000;
let lastGeocodeHits = [];// timestamps para rate limit básico
function allowGeocode() {
  const now = Date.now();
  lastGeocodeHits = lastGeocodeHits.filter(t => now - t < 10_000); // ventana 10s
  if (lastGeocodeHits.length >= 15) return false; // máx 15 peticiones / 10s
  lastGeocodeHits.push(now); return true;
}

app.get('/geocode/search', async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim();
    if (!q) return res.json([]);
    if (!allowGeocode()) return res.status(429).json({ error: 'Demasiadas peticiones geocode, espera un momento' });
    const cached = geoCache.get(q);
    const now = Date.now();
    if (cached && now - cached.ts < GEO_TTL_MS) return res.json(cached.data);
    const requestedLimit = Math.min(Number.parseInt(req.query.limit) || 15, 30);

    async function genericSearch(query, limit = requestedLimit) {
      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.searchParams.set('countrycodes', 'mx');
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('addressdetails', '1');
      url.searchParams.set('extratags', '1');
      url.searchParams.set('limit', String(limit));
      url.searchParams.set('q', query);
      const resp = await fetch(url.toString(), { headers: { 'User-Agent': 'SpookyRoute/0.1 (educational project)' } });
      if (!resp.ok) throw new Error('nominatim');
      return resp.json();
    }
    async function structuredSearch(houseNumber, streetAndRest, limit = requestedLimit) {
      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.searchParams.set('street', `${houseNumber} ${streetAndRest}`);
      url.searchParams.set('countrycodes', 'mx');
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('addressdetails', '1');
      url.searchParams.set('limit', String(limit));
      const resp = await fetch(url.toString(), { headers: { 'User-Agent': 'SpookyRoute/0.1 (educational project)' } });
      if (!resp.ok) throw new Error('nominatim-structured');
      return resp.json();
    }

    const rawPrimary = await genericSearch(q);
    let combined = [...rawPrimary];
    const numberMatch = q.match(/\b(\d{1,5})([A-Za-z]?)(?:\b|$)/);

    const hasHouseInitial = combined.some(r => r.address && r.address.house_number);
    if (numberMatch) {
      const houseNumber = numberMatch[1] + (numberMatch[2] || '');
      const rest = q.replace(numberMatch[0], ' ').replace(/\s+/g, ' ').trim();
      if (!hasHouseInitial && rest) {
        try {
          const structured = await structuredSearch(houseNumber, rest);
          structured.forEach(s => { if (!combined.find(c => c.place_id === s.place_id)) combined.push(s); });
        } catch {}
      }
      // Variaciones adicionales de orden
      if (!combined.some(r => r.address && r.address.house_number) && rest) {
        const variations = [
          `${houseNumber} ${rest}`,
          `${rest} ${houseNumber}`,
          `${rest} #${houseNumber}`,
          `${rest} No ${houseNumber}`
        ];
        for (const v of variations) {
          try {
            const alt = await genericSearch(v, 5);
            alt.forEach(a => { if (!combined.find(c => c.place_id === a.place_id)) combined.push(a); });
            if (combined.some(r => r.address && r.address.house_number)) break;
          } catch {}
        }
      }
    }

    // Ordenar priorizando house_number, luego importancia, luego longitud de display_name (más específica primero)
    // Filtrar a sólo direcciones en el estado de Nuevo León
    function normalizeStr(s) {
      return (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
    const allowedState = 'nuevo leon';
    combined = combined.filter(item => {
      const addr = item.address || {};
      const candidates = [addr.state, addr.state_district, addr.county];
      return candidates.some(c => normalizeStr(c) === allowedState);
    });

    const mapped = combined.map(item => ({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      displayName: item.display_name,
      address: item.address || {},
      importance: typeof item.importance === 'number' ? item.importance : 0,
      hasHouse: !!(item.address && item.address.house_number)
    }));
    mapped.sort((a,b) => {
      if (a.hasHouse !== b.hasHouse) return a.hasHouse ? -1 : 1;
      if (b.importance !== a.importance) return b.importance - a.importance;
      return a.displayName.length - b.displayName.length;
    });
    const finalData = mapped.slice(0, requestedLimit).map(m => ({ lat: m.lat, lng: m.lng, displayName: m.displayName, address: m.address }));
    geoCache.set(q, { ts: now, data: finalData });
    res.json(finalData);
  } catch (e) {
    console.error('geocode error', e);
    res.status(500).json({ error: 'Error geocoding' });
  }
});

// Static frontend (temporal) - sirve carpeta root/src directamente para desarrollo rápido
app.use(express.static(path.join(__dirname, '../../src')));
app.get('*', (req, res) => {
  // servir index.html para cualquier ruta no API (SPA)
  if (!req.path.startsWith('/auth') && !req.path.startsWith('/houses') && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, '../../src/index.html'));
  }
  res.status(404).json({ error: 'Not found' });
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`API escuchando en puerto ${port}`));
