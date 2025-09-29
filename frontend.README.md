# Frontend temporal (vanilla)

Se creó una SPA mínima en vanilla JS para probar el backend rápidamente.

## Migración a React + Vite
Pasos sugeridos:
1. `npm create vite@latest` dentro de `frontend/` (nuevo folder) con plantilla react-ts.
2. Instalar dependencias: `npm i react-router-dom leaflet`.
3. Copiar lógica de auth (token en localStorage) y llamadas fetch a un pequeño servicio.
4. Crear páginas: Login, Register, Dashboard, Map.
5. Reemplazar mapa simulado por Leaflet con un `<MapContainer>` y `<Marker>`s.

Mientras tanto esta versión sirve para validar API.
