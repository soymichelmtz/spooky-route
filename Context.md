# Contexto General del Proyecto (Spooky Route)

Este documento resume el estado actual del proyecto, las decisiones técnicas tomadas, los cambios realizados durante la sesión y próximos pasos sugeridos.

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
- Leaflet para el mapa (carga dinámica con reintentos y fallback)
- Plain fetch para consumir la API

Pendiente futuro: Migración a React + Vite + Tailwind.

## 3. Modelo de Datos (Prisma)
```
model User {
  id           Int      @id @default(autoincrement())
  username     String   @unique
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
- GET `/geocode/search?q=...` – geocodificación (Nominatim) con caching y heurísticas para números

## 5. Lógica de Geocodificación
- Búsqueda principal + variaciones si incluye número
- Structured search intentando construir calle + número
- Ranking prioriza resultados con `house_number`
- Cache en memoria 60s (query → resultados)
- Rate limiting básico (15 peticiones / 10s)

## 6. Frontend (SPA)
Características:
- Pantallas: Auth (login/registro) y Dashboard
- Dashboard muestra:
  - Si el usuario NO tiene casa (y ya se cargó el estado): formulario de registro
  - Si SÍ tiene casa: vista de detalles + botón “Editar” -> formulario editable
- Autocomplete de direcciones (Nominatim) con fallback manual de calle y número
- Mapa Leaflet con íconos emoji: 🎃 (casas con dulces) y 🏠 (mi casa)
- Carga asíncrona para mejorar percepción tras login
- Manejo de re-render del contenedor del mapa (soluciona bug de mapa en blanco tras login)
- Carga dinámica de Leaflet con reintentos, spinner y watchdog (+ botón de reintento)
- Logging de depuración activable con `localStorage.setItem('SR_DEBUG','1')`

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

## 9. Limitaciones Actuales
- Sin validación robusta de payloads (falta zod/joi)
- Sin refresh tokens / expiración extendida
- Sin paginación ni clustering de marcadores
- Sin normalización avanzada de direcciones (variaciones de mayúsculas/espacios)
- Sin tests automatizados actualizados al nuevo flujo de casa (script smoke viejo)

## 10. Próximos Pasos Sugeridos
1. Normalizar addressText antes de guardar (trim, collapse spaces, Title Case).
2. Añadir validación de entrada (zod) para endpoints /houses y /auth.
3. Guardar bounding box / osm_id (si se reutiliza para features extra).
4. Actualizar script smoke para nuevo contrato de /houses/me (address object).
5. Persistir posición/zoom del mapa en localStorage.
6. Añadir endpoint PATCH /houses/me (diferenciar create/update semánticamente).
7. Crear versión React (Vite) y extraer lógica del mapa a un hook.
8. Añadir HTTPS y configuración de despliegue (Railway/Render + Netlify/Vercel).

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
- Revisar duplicados de direcciones (script interno creado): `node server/scripts/check-duplicates.js`

## 16. Notas Finales
El proyecto está listo para iterar hacia una versión React sin bloquear funcionalidad actual. El backend ya soporta la mayor parte del flujo principal. Recomendable crear una rama `react-migration` cuando inicie la transición.

---
*Documento generado como snapshot contextual del estado actual del proyecto.*
