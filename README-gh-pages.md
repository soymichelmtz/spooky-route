# GitHub Pages (Spooky Route)

Este repositorio ahora incluye un `index.html` en la raíz para que GitHub Pages sirva la SPA.

## Cómo funciona
GitHub Pages sólo sirve archivos estáticos. El backend (API Express/Prisma) NO corre dentro de Pages. Necesitas desplegar el backend en otro servicio (Render, Railway, Fly.io, etc.) y apuntar el frontend a esa URL.

## Configurar la URL del API
Por defecto el código asume `http://localhost:3001`.

Opciones para sobrescribir cuando visitas `https://<usuario>.github.io/spooky-route/`:
1. Parámetro en la URL:
`https://<usuario>.github.io/spooky-route/?api=https://mi-backend.ejemplo.app`
2. Consola del navegador:
```js
localStorage.setItem('SR_API','https://mi-backend.ejemplo.app');
location.reload();
```
3. Eliminar configuración almacenada:
```js
localStorage.removeItem('SR_API');
```

## Requisitos del Backend
Debe exponer los mismos endpoints:
- POST /auth/register
- POST /auth/login
- GET /houses
- GET /houses/me (Auth)
- POST /houses/me (Auth)
- GET /geocode/search?q=

Con CORS habilitado para el dominio de GitHub Pages.

## Pasos Rápidos para Backend en Railway (ejemplo)
1. Subir carpeta `server/` como nuevo proyecto Node.
2. Configurar variables de entorno: `DATABASE_URL`, `JWT_SECRET`, `PORT` (ej. 8080).
3. Ajustar script start si el puerto lo proporciona la plataforma (usar `process.env.PORT`).
4. Desplegar, obtener URL pública (ej: `https://spooky-backend.up.railway.app`).
5. Abrir Pages con `?api=https://spooky-backend.up.railway.app`.

## Solución de Problemas
- 401 al cargar casas: Asegúrate de haber iniciado sesión (token en localStorage).
- CORS error: Habilita `cors()` en backend y revisa origen correcto.
- Mapa sin cargar: Ver consola (SR_DEBUG) y verifica carga de Leaflet (posibles bloqueadores). Usa `localStorage.setItem('SR_DEBUG','1')`.

## Branding
Título: `👻 Spooky Route 🎃`.

---
Este archivo es auxiliar; el README principal mantiene la documentación general del proyecto.
