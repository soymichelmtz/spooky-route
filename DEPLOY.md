# Despliegue del Backend (Spooky Route)

El banner "Backend no accesible" en GitHub Pages aparece porque la SPA está intentando llamar a `http://localhost:3001`, que no es accesible desde Internet. Necesitas una URL HTTPS pública para el backend y configurarla en la app.

## Opciones Rápidas
| Opción | Uso principal | Pros | Contras |
|--------|---------------|------|---------|
| Render.com (Web Service) | Demo / Producción ligera | HTTPS automático, fácil repositorio | SQLite no persiste en despliegues fríos, latencia de arranque |
| Railway.app | Demo / Producción ligera | Fácil variables, logs claros | Puede dormir en plan gratuito |
| Fly.io / VPS | Escalado + control | Control total | Configuración más manual |
| ngrok (túnel) | Prueba rápida local | 2 minutos listo | URL temporal / rotativa |

---
## 1. Requisitos del Backend
- El código ya usa `process.env.PORT || 3001`.
- Variables de entorno mínimas:
```
DATABASE_URL="file:./dev.db"
JWT_SECRET="un_valor_mas_largo_y_secreto"
PORT=8080   # (la plataforma puede inyectar otro)
```
- CORS está habilitado con `app.use(cors())`.

### Nota sobre SQLite
En Render / Railway el archivo `dev.db` puede reiniciarse (sistema de archivos efímero). Para persistencia real considera migrar a Postgres:
1. Crear instancia Postgres.
2. Cambiar `DATABASE_URL` a algo como:
   `postgresql://usuario:pass@host:5432/dbname?schema=public`
3. Ejecutar `npx prisma migrate deploy`.

---
## 2. Despliegue en Render.com
1. Crear cuenta y "New +" → Web Service.
2. Conectar el repositorio `spooky-route`.
3. Seleccionar la carpeta `server/` como raíz del servicio (o dejar root y setear `WORKDIR` en build command).
4. Build command sugerido:
   ```
   npm install && npx prisma migrate deploy
   ```
5. Start command:
   ```
   node src/index.js
   ```
6. Variables de entorno (Dashboard → Environment):
   - `DATABASE_URL=file:./dev.db`
   - `JWT_SECRET=<tu_secreto_largo>`
7. Deploy. Al terminar tendrás una URL: `https://spooky-route.onrender.com`
8. En GitHub Pages visita:
   `https://soymichelmtz.github.io/spooky-route/?api=https://spooky-route.onrender.com`
9. Registra usuario y prueba.

---
## 3. Despliegue en Railway.app
1. Crear nuevo proyecto → Deploy from Repo → seleccionar repositorio.
2. Railway detectará Node.js.
3. Variables de entorno (Settings → Variables): idem Render.
4. Si quieres Postgres: Add Plugin → PostgreSQL; Railway añade variable `DATABASE_URL` automáticamente.
5. Asegura que el puerto expuesto ( Railway usualmente asigna uno ) se lee por `process.env.PORT` (ya soportado).
6. Obtén la URL pública y configúrala con `?api=` en Pages.

---
## 4. Prueba Rápida con ngrok (sin desplegar todavía)
Esto crea un túnel temporal a tu backend local.
1. Instala ngrok y autentica tu token.
2. Levanta backend local: `npm run dev` (raíz del monorepo).
3. En otra terminal:
   ```
   ngrok http 3001
   ```
4. Copia la URL `https://xxxxx.ngrok.app`.
5. Abre Pages con:
   `https://soymichelmtz.github.io/spooky-route/?api=https://xxxxx.ngrok.app`
6. Usa la app (recordar que la URL caduca cuando apagas ngrok).

---
## 5. Configurar la URL del API en la SPA
Métodos soportados por el código actual:
1. Query param: `?api=https://mi-backend.app`
2. Consola:
   ```js
   localStorage.setItem('SR_API','https://mi-backend.app');
   location.reload();
   ```
3. Resetear:
   ```js
   localStorage.removeItem('SR_API');
   location.reload();
   ```

Si la configuración es válida el banner desaparece.

---
## 6. Verificación
- Request de salud: `GET /api` debe responder `{ status: 'ok', ... }`.
- Registro: `POST /auth/register` → 200 con `{ token? }` (según implementación) o mensaje de éxito.
- Login: `POST /auth/login` → 200 + `{ token }`.
- Casas: `GET /houses` (sin token) → listado.
- Mi casa: `GET /houses/me` (con token) → detalle o `null`.

### Comprobar CORS
En consola del navegador si ves: *CORS error* → asegúrate de `app.use(cors())` o configura origen específico:
```js
import cors from 'cors';
app.use(cors({ origin: 'https://soymichelmtz.github.io' }));
```

---
## 7. Migrar a Postgres (opcional rápido)
En `schema.prisma` basta con cambiar provider a `postgresql` y ajustar `DATABASE_URL`. Luego:
```
npx prisma migrate dev --name init_pg
```
Desplegar y usar `migrate deploy`.

---
## 8. Troubleshooting
| Síntoma | Causa | Solución |
|--------|-------|----------|
| Banner "Backend no accesible" | API apunta a localhost o falla red | Configurar SR_API con URL pública |
| Failed to fetch (TypeError) | Backend dormido / URL incorrecta | Reintentar / revisar logs del host |
| 401 en /houses/me | Falta token | Inicia sesión nuevamente |
| CORS error | Origen no permitido | Ajustar `cors()` con origin correcto |
| DB se resetea | SQLite efímero | Migrar a Postgres |
| Mapa sin cargar | CDN bloqueado | Revisa bloqueadores / SR_DEBUG / reintentos |

---
## 9. Checklist Express
- [ ] Backend desplegado HTTPS
- [ ] /api responde 200
- [ ] CORS habilitado
- [ ] SR_API configurado en Pages
- [ ] Registro/Login funcionan
- [ ] Guardado de casa y visualización en mapa

---
Si deseas un flujo CI/CD (GitHub Actions) para hacer deploy automático avísame y lo agrego.
