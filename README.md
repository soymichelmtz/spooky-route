# 👻 Spooky Route 🎃

Plataforma para que usuarios en México (en esta fase enfocada a Nuevo León) registren si reparten dulces en Halloween y visualizar en un mapa (Leaflet + OpenStreetMap) las casas participantes.

## Estado Actual (MVP Funcional)
Implementado:
- Registro / login con JWT (token de acceso simple) y contraseñas con bcrypt.
- Un (1) registro de casa por usuario (enforced a nivel DB con userId @unique).
- Detección y bloqueo de direcciones duplicadas (`addressText` @unique en House).
- Modelo de dirección estructurada (street, houseNumber, suburb, city, municipality, state, postcode, country) más `addressText` normalizado desde la búsqueda.
- Geocodificación vía Nominatim (solo MX) con heurísticas para número de casa, ranking de resultados y caché en memoria.
- Rate limit básico de geocodificación y caché TTL 60s.
- SPA en vanilla JS (sin React todavía) con flujo: Auth → Dashboard.
- Autocomplete de direcciones con sugerencias y fallback a captura manual de calle/número si falta house_number.
- Botón "Usar mi ubicación actual" siempre visible (registro y edición) que fija lat/lng y permite modo manual.
- Estado persistente del botón de ubicación: tras capturar coords cambia a "Ubicación lista" con color verde (#6ED95F).
- Filtrado geocoding a resultados cuyo estado es Nuevo León.
- Mapa Leaflet con carga dinámica (fallback CDN unpkg → jsDelivr), spinner, watchdog de 5s y botón de reintento.
- Íconos emoji: 🎃 (otras casas que reparten) y 🏠 (mi casa).
- Vista condicional: si ya tienes casa → detalles + botón Editar; si no → formulario de registro.
- Edición de la casa rellenando previamente (prefill) los campos y el buscador.
- Modo debug activable con `localStorage.setItem('SR_DEBUG','1')` (logs internos + helper `window._srDump()`).

Pendiente / Futuro (prioridades sugeridas):
1. Validaciones robustas (zod / joi) en payloads.
2. Uso de `usernameNorm` para normalizar logins (case / acentos) + migración derivada.
3. Normalización de `addressText` (trim, espacios, casing, acentos).
4. Reverse geocoding tras geolocalización para autocompletar calle/número.
5. React + Vite + Tailwind (modularizar mapa/autocomplete/geolocalización).
6. Refresh tokens / expiración rotatoria + rate limit de login.
7. Script smoke actualizado y suite de tests (unit + integración mock geocode).
8. Clustering / persistir zoom/centro en localStorage.
9. Endpoint PATCH /houses/me (semántica clara create vs update) y log histórico opcional.
10. Offline fallback (paquete local Leaflet) para demos sin red.

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

## Próximos Pasos Recomendados (Detalle)
Ver lista priorizada arriba (Pendiente / Futuro). En corto plazo: validaciones (zod), normalización, reverse geocoding y tests.

## Licencia
Pendiente de definir.

---
Revisar `Context.md` para historial completo, decisiones técnicas y backlog ampliado.
