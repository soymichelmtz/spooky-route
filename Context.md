# Contexto General del Proyecto (Spooky Route)

Este documento resume el estado actual del proyecto, las decisiones técnicas tomadas, los cambios realizados durante la(s) sesión(es) y próximos pasos sugeridos. (Última actualización: actualizada tras incluir mejoras de geolocalización, filtro a Nuevo León, botón de ubicación persistente y refresco forzado del mapa.)

## 1. Objetivo del Proyecto
Plataforma donde usuarios pueden:
- Registrarse / iniciar sesión.
- Registrar la dirección de su casa y marcar si reparten dulces en Halloween.
- Ver en un mapa (Leaflet + OpenStreetMap) las casas participantes (solo las que reparten dulces se listan públicamente).

## 2. Stack Actual
Backend:
- Node.js (ESM) + Express
- Prisma ORM + SQLite
- JWT para autenticación (access token sencillo)
- bcrypt para hash de contraseñas
- Geocodificación vía Nominatim (centrado en México, con heurísticas para números de casa)

Frontend (temporal / MVP):
- HTML + CSS + Vanilla JS (SPA mínima)
- Leaflet para el mapa (carga dinámica con reintentos, fallback CDN y watchdog)
- Plain fetch para consumir la API
- Botón de geolocalización siempre visible con estado persistente (“Ubicación lista” con color) cuando ya se capturó la posición
- Emojis en branding (👻 Spooky Route 🎃)

Pendiente futuro: Migración a React + Vite + Tailwind.

## 3. Modelo de Datos (Prisma)
```
model User {
  id           Int      @id @default(autoincrement())
  username     String   @unique
  usernameNorm String?  @unique   // reservada para normalización futura (case / acentos)
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

## 4. Endpoints Principales
- POST `/auth/register` – registro (username/password)
- POST `/auth/login` – login retorna token JWT
- GET `/houses` – lista casas que reparten dulces (public)
- GET `/houses/me` – obtiene casa del usuario autenticado
- POST `/houses/me` – crea/actualiza casa del usuario (valida duplicado de addressText y unicidad por usuario)
- GET `/geocode/search?q=...` – geocodificación (Nominatim) con caching, heurísticas para números y filtrado estricto al estado de Nuevo León.

## 5. Lógica de Geocodificación
- Búsqueda principal + variaciones si incluye número.
- Structured search intentando construir calle + número.
- Ranking prioriza resultados con `house_number` y mayor importancia.
- Cache en memoria 60s (query → resultados).
- Rate limiting básico (15 peticiones / 10s).
- Filtrado post-procesamiento: sólo resultados cuyo estado normalizado sea "Nuevo León".
- Intentos alternos (variaciones de orden calle/número) para corregir consultas ambiguas.

## 6. Frontend (SPA)
Características:
- Pantallas: Auth (login/registro) y Dashboard.
- Dashboard condicional (una sola casa por usuario: formulario o detalle + edición).
- Autocomplete de direcciones (Nominatim) con fallback manual de calle y número si no se obtiene `house_number`.
- Botón “Usar mi ubicación actual” SIEMPRE visible (registro y edición); oculta campo búsqueda al usarse para evitar contradicciones.
- Modo manual permite: capturar geolocalización + escribir calle y número y guardar sin sugerencia seleccionada.
- Mapa Leaflet con íconos emoji: 🎃 (otras casas con dulces) y 🏠 (mi casa), carga dinámica (reintentos + fallback CDN + watchdog + botón reintentar).
- Carga asíncrona (primero UI, luego datos) para mejorar percepción tras login.
- Manejo de re-render del contenedor del mapa + `invalidateSize()` para corregir visualización.
- Botón ubicación cambia a “Ubicación lista” y verde (#6ED95F) persistente tras fijar coordenadas.
- Branding con `👻 Spooky Route 🎃`.
- Logging de depuración activable con `localStorage.setItem('SR_DEBUG','1')` y helper `window._srDump()`.

## 7. Cambios Clave Durante la Sesión
1. Implementación de auth + modelos iniciales.
2. Sustitución de lista textual por mapa Leaflet.
3. Integración de geocodificación con heurísticas para número de casa.
4. Almacenamiento estructurado de dirección (street, houseNumber, etc.).
5. Agregado de `@unique` a `House.addressText` y validación backend para evitar duplicados.
6. Interfaz condicional: impedir más de una casa por usuario (registro vs vista/edición).
7. Migración a carga dinámica de Leaflet + fallback/CDN y watchdog.
8. Corrección de bug: mapa no aparecía tras login hasta refrescar (recreación del mapa si cambia el contenedor + invalidateSize).
9. Prefill de campo `addressSearchEdit` y manualStreet/manualNumber en modo edición.
10. Depuración centralizada (SR_DEBUG) y helper `window._srDump()`.
11. Filtro geocoding a Nuevo León para relevancia local.
12. Botón de geolocalización siempre visible y funcional también en modo edición.
13. Persistencia de estado visual del botón (“Ubicación lista” + color verde) tras captura.
14. Reconstrucción determinista de `addressText` en backend usando campos estructurados.
15. Emojis agregados al título principal (👻 … 🎃) y ajustes de UI (logout ancho fijo, espaciado checkbox “Entrego dulces”).
16. Refuerzo de refresco de mapa tras guardar (llamada explícita adicional a `renderMap()`).

## 8. Problemas Encontrados y Soluciones
| Problema | Solución |
|----------|----------|
| Geocodificación lenta/restringida | Cache + limit + heurísticas |
| Falta de número en resultados | Campo manual + reconstrucción de addressText |
| Mapa tardaba en mostrar UI | Render inmediato + carga asíncrona de datos |
| Mapa no cargaba tras login | Detección de contenedor cambiado y recreación Leaflet |
| Duplicación de direcciones | Constraint @unique y verificación previa en POST /houses/me |
| Íconos default poco temáticos | Emojis 🎃 y 🏠 con divIcon |
| Falta de retroalimentación debug | SR_DEBUG logs + helper dump |
| Foco regional necesario | Filtro estricto a estado Nuevo León en resultados geocode |
| Botón ubicación perdía contexto | Estado persistente “Ubicación lista” + color verde |
| Dirección editada no refrescaba visual | Refresco explícito post-guardado + reconstrucción determinista |

## 9. Limitaciones Actuales
- Validación de payloads mínima (falta zod/joi).
- Sin refresh tokens / expiración extendida (token 1h aprox.).
- Sin clustering ni paginación de marcadores (escala pequeña por ahora).
- Normalización avanzada de direcciones pendiente (espacios duplicados, casing, acentos). `usernameNorm` aún no se utiliza.
- Sin tests actualizados (script smoke desfasado con nuevo contrato de /houses/me).
- Sin revocación / rate limit de login (sólo geocode rate limit existente).
- Sin soporte configuración multi-estado (hardcode Nuevo León).

## 10. Próximos Pasos Sugeridos
1. Normalizar y sanitizar `addressText` (trim, espacios, casing, acentos) + uso real de `usernameNorm`.
2. Validación exhaustiva de entrada (zod) en auth y houses.
3. Endpoint PATCH separado para semántica clara (create vs update) + auditoría de cambios (histórico simple).
4. Guardar bounding box / osm_id para potencial highlighting o reverse geocode.
5. Clustering / optimización de markers y persistencia de zoom/centro (localStorage).
6. Implementar refresh tokens y rate limiting de login.
7. Migración a React (Vite + Tailwind) y modularización (hooks para mapa/autocomplete/geolocalización).
8. Script de smoke tests actualizado y suite de pruebas (unit + integración mock geocode).
9. Reverse geocoding para autocompletar calle/número tras geolocalización.
10. Opción para re-abrir campo de búsqueda después de usar geolocalización (toggle/“Cambiar dirección”).
11. Offline fallback básico de Leaflet (paquete local) para demos sin red.
12. Observabilidad ligera (contador de búsquedas, métricas in-memory).

## 11. Cómo Activar Depuración
En consola del navegador:
```js
localStorage.setItem('SR_DEBUG','1'); location.reload();
```
Para desactivar:
```js
localStorage.removeItem('SR_DEBUG'); location.reload();
```

## 12. Helper de Estado
```js
window._srDump()
```
Devuelve snapshot: token presente, myHouse, número de markers, etc.

## 13. Fallback del Mapa
- Intentos: unpkg → jsDelivr (hasta 3)
- Watchdog a 5s ofrece botón de reintento
- Si falla: sugiere revisar conexión / bloqueadores

## 14. Seguridad (Pendiente Refuerzo)
- Rate limiting login (ej: express-rate-limit)
- Bloqueo por IP tras N intentos fallidos
- Hash bcrypt con salt rounds configurables (por ahora default 10/12)
- Sanitización/escape consistente en addressText al renderizar

## 15. Scripts Útiles
- Migraciones Prisma: `npx prisma migrate dev` / `npx prisma migrate deploy`
- Generar cliente Prisma: `npx prisma generate`
- Revisar duplicados de direcciones: `node server/scripts/check-duplicates.js` (si existe)
- (Pendiente) Actualizar/crear script smoke acorde a dirección estructurada

## 16. Notas Finales
El proyecto está listo para iterar hacia una versión React sin bloquear funcionalidad actual. El backend soporta el flujo principal (registro, casa única, geocodificación localizada). Recomendable crear una rama `react-migration` cuando inicie la transición y otra `validation-hardening` para introducir zod y normalizaciones sin mezclar concerns.

---
*Documento generado como snapshot contextual del estado actual del proyecto.*
