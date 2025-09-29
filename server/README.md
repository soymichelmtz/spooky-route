# Backend (Spooky Route)

## Scripts
- `npm run dev` inicia servidor Express con watch.
- `npm run prisma:generate` genera cliente.
- `npm run prisma:migrate` crea migración y actualiza SQLite.

## Variables Entorno (.env)
```
DATABASE_URL="file:./dev.db"
JWT_SECRET="cambia_esto"
PORT=3001
```

## Rutas
### `POST /auth/register`
Body: `{ username, password }`

### `POST /auth/login`
Body: `{ username, password }` -> `{ token }`

Enviar header `Authorization: Bearer <token>` para rutas protegidas.

### `POST /houses/me`
Crear/actualizar casa del usuario.
Body: `{ lat: number, lng: number, addressText: string, givingCandy: boolean }`

### `GET /houses/me`
Obtener casa propia.

### `GET /houses`
Listado público de casas que `givingCandy = true`.

## Notas de Seguridad Iniciales
- Passwords hasheadas (bcrypt) con salt.
- JWT simple expira en 1h (mejorable con refresh tokens).
- Falta rate limiting y bloqueo de brute force.
- Falta validación más estricta (zod / joi) para inputs.
