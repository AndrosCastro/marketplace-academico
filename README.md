# Marketplace Académico de Servicios Estudiantiles

Plataforma web donde los estudiantes **publican** los servicios que ofrecen (tutorías, programación, diseño, AutoCAD, idiomas…), **buscan** los de sus compañeros, los **solicitan** y los **califican**.
Proyecto integrador ABP · Ingeniería de Software I · Universidad Tecnológica de Honduras (UTH).

| | |
|---|---|
| **Lenguaje** | TypeScript |
| **Framework** | Next.js 15 (App Router, Server Components y Server Actions) + React 19 |
| **Base de datos** | PostgreSQL 16 (local con Docker, producción con Neon en Vercel) |
| **ORM** | Prisma 6 (consultas parametrizadas, migraciones versionadas) |
| **Estilos** | Tailwind CSS 4 |
| **Pruebas** | Vitest (unitarias) + Playwright (extremo a extremo, CP-01 a CP-34) |
| **Despliegue** | Vercel + Neon Postgres |

## Módulos (SRS v2.0)

| Módulo | Requisitos | Dónde |
|---|---|---|
| M1 Cuentas y perfiles | RF-01 a RF-03 | `src/actions/auth.ts`, `src/actions/perfil.ts`, `/registro`, `/login`, `/perfil` |
| M2 Servicios | RF-04, RF-05 | `src/actions/servicios.ts`, `/servicios/nuevo`, `/mis-servicios` |
| M3 Catálogo | RF-06 a RF-08 | `/servicios`, `/servicios/[id]` |
| M4 Solicitudes, pago y chat | RF-09 a RF-11, RF-15, RF-16 | `src/actions/solicitudes.ts`, `src/lib/estados.ts`, `/solicitudes/[id]` |
| M5 Calificaciones y reputación | RF-12 a RF-14 | `calificar()` en `src/actions/solicitudes.ts`, `/usuarios/[id]` |
| Administración (evolución 2.6) | RN-11 | `src/actions/admin.ts`, `/admin` |

## Seguridad implementada

- Contraseñas con **bcrypt** (costo 12). Nunca se guardan ni se muestran en texto plano.
- **Sesiones en el servidor**: la cookie `HttpOnly`, `Secure`, `SameSite=Lax` solo lleva un token aleatorio de 256 bits; la base de datos guarda su HMAC-SHA256. Cerrar sesión la elimina de verdad. **Expiran a los 30 minutos sin actividad.**
- **Autorización en cada acción del servidor**: solo el propietario edita o retira su servicio (RN-02); solo cliente y proveedor ven una solicitud, su chat y sus archivos (RN-12); solo el cliente califica (RN-08/09); `/admin` exige rol ADMIN.
- **Máquina de estados** que impide transiciones no permitidas (p. ej., entregar sin pago confirmado) con actualizaciones condicionadas que evitan condiciones de carrera.
- **Validación en el servidor** con Zod en todos los formularios y restricciones `CHECK` + **triggers** en PostgreSQL (precio ≥ 0, calificación 1..5, no solicitar servicios propios, remitente válido).
- **Protección contra fuerza bruta**: 5 intentos fallidos por correo (o 30 por IP) bloquean 15 minutos; límites diarios para registros, publicaciones, mensajes y reportes.
- **Privacidad (RNF-03)**: el correo nunca es público; el WhatsApp/teléfono solo se muestra a la otra parte con pago confirmado.
- **Archivos del chat**: máx. 4 MB, lista blanca de formatos, verificación de la firma real del archivo (magic bytes), guardados en la BD y descargados solo por los participantes como `attachment` con `nosniff` y CSP `sandbox`.
- **Encabezados**: Content-Security-Policy con *nonce* por petición, `X-Frame-Options: DENY`, HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- CSRF: Server Actions verifican el origen + cookies `SameSite`. Sin redirecciones abiertas (`rutaSegura`).
- **Bitácora de seguridad** (inicios de sesión, fallidos, accesos denegados, acciones de administración) visible en `/admin`.
- Filtro de **integridad académica (RN-11)** + reportes de publicaciones con moderación.

## Ejecutar en local

Requisitos: Node.js 20+, Docker Desktop.

```bash
cp .env.example .env          # ajusta las contraseñas de prueba
npm install
npm run db:up                 # PostgreSQL en Docker (puerto 5433)
npx prisma migrate deploy     # crea las tablas
npm run db:seed               # categorías, admin y datos de demostración
npm run dev                   # http://localhost:3000
```

Las cuentas de demostración están definidas en `prisma/seed.ts` y usan las contraseñas `SEED_DEMO_PASSWORD` / `SEED_ADMIN_PASSWORD` de tu `.env`.

## Pruebas

```bash
npm test                                   # 24 pruebas unitarias (reglas de negocio)
npm run build && npm start -- -p 3005      # en otra terminal
npx playwright test                        # 33 pruebas E2E (usa Edge/Chrome instalados)
```

> ⚠️ Las pruebas E2E crean y luego eliminan sus propios usuarios. Ejecútalas solo contra la base de datos local, nunca contra producción.

## Desplegar en Vercel (con base de datos Neon Postgres)

1. Sube el repositorio a GitHub.
2. En [vercel.com](https://vercel.com) → **Add New… → Project** → importa el repositorio.
3. En el proyecto: **Storage → Create Database → Neon (Postgres)** y conéctala. Vercel crea `DATABASE_URL` y `DATABASE_URL_UNPOOLED`.
4. En **Settings → Environment Variables** agrega:
   - `SESSION_SECRET`: genera uno con `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
   - `ALLOWED_EMAIL_DOMAINS` (opcional): p. ej. `uth.hn` para aceptar solo correos institucionales.
5. **Build Command**: `npm run vercel-build` (aplica las migraciones y compila).
6. Para cargar los datos de demostración en Neon, desde tu PC (con la URL de Neon en `.env` y contraseñas **nuevas y seguras**): `npm run db:seed`.

> SQL Server no está disponible como base de datos administrada en Vercel; por eso se usa PostgreSQL, que además es el motor que propone la SRS (sección 2.1).

## Docker (opcional)

```bash
docker compose --profile full up --build   # base de datos + aplicación en http://localhost:3000
```

## Estructura

```
prisma/            esquema, migraciones (incluye CHECK y triggers) y datos de demostración
src/app/           pantallas (rutas) de Next.js
src/actions/       lógica del servidor por módulo (M1–M5 y admin)
src/lib/           sesión, validación, máquina de estados, reputación, archivos
src/components/    componentes de interfaz y formularios
tests/             pruebas unitarias      e2e/  pruebas de extremo a extremo
docs/              diagrama ER y capturas usadas en la documentación
```
