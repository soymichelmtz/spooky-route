# Spooky Route

Plataforma para que usuarios en México registren si reparten dulces en Halloween y visualizar en un mapa (Leaflet + OpenStreetMap) las casas participantes.

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
- Mapa Leaflet con carga dinámica (fallback CDN unpkg → jsDelivr), spinner, watchdog de 5s y botón de reintento.
- Íconos emoji: 🎃 (otras casas que reparten) y 🏠 (mi casa).
- Vista condicional: si ya tienes casa → detalles + botón Editar; si no → formulario de registro.
- Edición de la casa rellenando previamente (prefill) los campos y el buscador.
- Modo debug activable con `localStorage.setItem('SR_DEBUG','1')` (logs internos + helper `window._srDump()`).

Pendiente / Futuro:
- Migrar frontend a React + Vite + Tailwind.
- Validaciones robustas (zod / joi) en payloads.
- Refresh tokens / expiración extendida.
- Tests automatizados actualizados (script smoke está desfasado).
- Clustering / optimización de markers y persistir zoom/centro.

## Stack Tecnológico
- Backend: Node.js (ESM) + Express + Prisma + SQLite.
- Auth: JWT (access token simple) + bcrypt.
- Frontend: HTML + CSS + Vanilla JS (temporal).
- Mapas: Leaflet + OpenStreetMap (sin claves externas).
- Geocoding: Nominatim (countrycodes=mx) con heurísticas para número.

## Estructura de Carpetas
```
spooky-route/
  server/        # Backend Express + Prisma
    src/
    prisma/
    scripts/
  src/           # Frontend vanilla SPA (index.html, spa.js, styles.css)
  Context.md     # Documento de decisiones y estado detallado
  README.md
```

## Modelo de Datos (Actual)
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
3. Iniciar backend (ajustar script si existe en package.json) y servir estáticos.
4. Abrir `http://localhost:3000` (puerto según configuración en `server/src/index.js`).

## Próximos Pasos Recomendados
1. Añadir validaciones de esquema (zod) en auth y houses.
2. Normalizar `addressText` (espacios, casing) antes de persistir.
3. Dividir endpoints create/update (POST vs PATCH) para semántica clara.
4. Implementar refresh tokens / expiración rotatoria.
5. Migrar a React y modularizar lógica del mapa y autocomplete.
6. Añadir pruebas (unitarias + integración de geocode mockeada).

## Licencia
Pendiente de definir.

---
Revisar `Context.md` para un historial y razones de decisiones.
