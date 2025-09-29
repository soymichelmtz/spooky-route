import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

// Endpoint de autocompletado usando Nominatim (OpenStreetMap) limitado a México
// GET /geocode/search?q=texto
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim();
    if (!q) return res.json([]);
    // Nominatim usage policy: include proper headers & format jsonv2
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('countrycodes', 'mx');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', '5');
    url.searchParams.set('q', q);

    const resp = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'SpookyRoute/0.1 (learning project)'
      }
    });
    if (!resp.ok) return res.status(500).json({ error: 'Error geocoding' });
    const data = await resp.json();
    const simplified = data.map(item => ({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      displayName: item.display_name,
      address: item.address || {}
    }));
    res.json(simplified);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error geocoding' });
  }
});

export default router;
