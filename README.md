# 👻 Spooky Route 🎃

Plataforma para que usuarios en México (en esta fase enfocada a Nuevo León) registren si reparten dulces en Halloween y visualizar en un mapa (Leaflet + OpenStreetMap) las casas participantes.

## Estado Actual (MVP Funcional)
Implementado:
 - Registro / login con JWT y contraseñas hasheadas (bcrypt).
 - Una sola casa por usuario (constraint DB `userId @unique`).
 - Dirección única (`addressText @unique`) con verificación de duplicados.
 - Dirección estructurada (street, houseNumber, suburb, city, municipality, state, postcode, country) + reconstrucción determinista de `addressText`.
 - Geocodificación Nominatim (MX) con heurísticas para número, caché 60s y rate limit (15/10s).
 - Filtrado de resultados geocode únicamente a estado Nuevo León.
 - Autocomplete + fallback manual (geolocalización + calle/número) cuando no hay `house_number`.
 - Botón "Usar mi ubicación actual" siempre visible (registro y edición) con estado persistente “Ubicación lista” (verde #6ED95F).
 - SPA vanilla (auth + dashboard + edición) con render asíncrono y mapa resiliente (recreación si cambia contenedor, watchdog, reintentos y fallback CDN Leaflet).
 - Íconos emoji 🎃 / 🏠 y branding `👻 Spooky Route 🎃`.
 - Logs de depuración (`SR_DEBUG`) + helper `window._srDump()`.
 - Refresco explícito del mapa tras guardar/editar para evitar stale markers.
 - Despliegue GitHub Pages mediante `index.html` raíz.
 - Base dinámica del API: parámetro `?api=` o `localStorage.SR_API`.
 - Banner automático de configuración de API en GitHub Pages / al fallar red (“Backend no accesible”) con botones Configurar / Reset.

> Nota GitHub Pages: La SPA se sirve estática; requiere un backend público (Render/Railway/Fly) y configurarlo vía `?api=https://tu-backend` o `localStorage.setItem('SR_API','https://...')`. Ver `README-gh-pages.md` para detalles.

Pendiente / Futuro (prioridades sugeridas): ver sección "Próximos Pasos Recomendados" más abajo.

## Stack Tecnológico
- Backend: Node.js (ESM) + Express + Prisma + SQLite.
- Auth: JWT (access token simple) + bcrypt.
- Frontend: HTML + CSS + Vanilla JS (temporal).
- Mapas: Leaflet + OpenStreetMap (sin claves externas).
- Geocoding: Nominatim (countrycodes=mx) con heurísticas para número.

## Estructura de Carpetas
```
spooky-route/
  server/        # Backend Express + Prisma (Puerto por defecto: 3001)
    src/         # index.js, rutas (auth, houses, geocode search inline)
    prisma/      # schema.prisma + migraciones
    scripts/     # scripts utilitarios (smoke / verificación, pendiente actualizar)
  src/           # Frontend vanilla SPA (index.html, spa.js, styles.css, assets)
  Context.md     # Documento de decisiones y estado detallado
  README.md
```

## Modelo de Datos (Actual)
```
model User {
  id           Int      @id @default(autoincrement())
  username     String   @unique
  usernameNorm String?  @unique
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  house        House?
}

model House {
  id           Int      @id @default(autoincrement())
  userId       Int      @unique
  lat          Float
  lng          Float
  addressText  String   @unique
  street       String?
  houseNumber  String?
  suburb       String?
  city         String?
  municipality String?
  state        String?
  postcode     String?
  country      String?
  givingCandy  Boolean  @default(false)
  updatedAt    DateTime @updatedAt
  user         User     @relation(fields: [userId], references: [id])
}
```

## Endpoints Principales
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /auth/register | Crear usuario |
| POST | /auth/login | Obtener token JWT |
| GET  | /houses | Listar casas que reparten dulces |
| GET  | /houses/me | Obtener mi casa (autenticado) |
| POST | /houses/me | Crear/actualizar mi casa |
| GET  | /geocode/search?q= | Buscar direcciones (Nominatim MX) |

Autenticación: encabezado `Authorization: Bearer <token>`.

## Configuración de API (GitHub Pages / Entornos Estáticos)
Cuando la app se ejecuta en `*.github.io`:
1. Si `SR_API` no está definido y la base apunta a `localhost`, se muestra un banner rojo indicando que debes configurar la URL del backend.
2. Opciones de configuración:
  - Query string: `?api=https://mi-backend.app`
  - Consola: `localStorage.setItem('SR_API','https://mi-backend.app'); location.reload();`
3. Reset: `localStorage.removeItem('SR_API'); location.reload();`
4. Requisitos del backend: mismos endpoints, CORS habilitado para `https://<usuario>.github.io`.

## Flujo de Uso
1. Registrarse o iniciar sesión.
2. Buscar dirección (autocomplete). Si falta número: escribir manualmente.
3. Marcar la casilla “Reparto dulces” y guardar.
4. Ver tu casa (🏠) y otras casas (🎃) en el mapa.
5. Editar si cambia la dirección o el estado de reparto.

## Debug
Activar: `localStorage.setItem('SR_DEBUG','1'); location.reload();`
Desactivar: `localStorage.removeItem('SR_DEBUG'); location.reload();`

Dump rápido: `window._srDump()`.

## Desarrollo Local (Resumen)
1. Instalar dependencias en raíz: `npm install`.
2. Ejecutar migraciones/prisma generate (si aplica): `npx prisma migrate dev` dentro de `server/`.
3. Iniciar backend: `npm run dev` (desde la raíz, delega a workspace `server`).
4. Abrir `http://localhost:3001` (por defecto PORT=3001 en `.env`).

### Variables de Entorno
Revisa `server/.env.example` y crea tu propio `server/.env` (no se versiona):
```
DATABASE_URL="file:./dev.db"
JWT_SECRET="<valor_aleatorio_largo>"
PORT=3001
```
Generar un secreto:
```
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Rotar el secreto invalida tokens anteriores (los usuarios deben iniciar sesión de nuevo).

## Próximos Pasos Recomendados (Detalle)
1. Validaciones (zod) en auth y houses.
2. Normalizar `addressText` y utilizar `usernameNorm`.
3. Reverse geocoding tras geolocalizar para autocompletar calle/número.
4. Refresh tokens + rate limit de login.
5. Migración a React (Vite + Tailwind) y modularización de lógica (hooks mapa / geocode / geo).
6. Script smoke nuevo + tests unit/integración (mock de geocode).
7. Clustering y persistencia zoom/centro en localStorage.
8. Endpoint PATCH /houses/me + histórico simple.
9. Offline fallback de tiles / Leaflet bundle.
10. Observabilidad ligera (conteo de búsquedas, métricas geocode).
11. Modo multi-estado configurable (no sólo Nuevo León).

## Licencia
Pendiente de definir.

---
Revisar `Context.md` para historial completo, decisiones técnicas y backlog ampliado.
