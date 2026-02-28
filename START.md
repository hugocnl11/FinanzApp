# FinanzApp – Encender, apagar y reiniciar servicios

Todos los comandos asumen que estás en la raíz del proyecto **FinanzApp** (`/ruta/a/FinanzApp`), salvo donde se indique otra carpeta.

---

## Encender todos los servicios

### 1. Base de datos (PostgreSQL con Docker)

```bash
docker compose up -d
```

O usando el script del proyecto:

```bash
./start.sh
```

El script `start.sh` levanta PostgreSQL, espera a que esté listo, ejecuta `prisma generate` y `prisma migrate deploy` en la app.

### 2. Aplicación Next.js (servidor de desarrollo)

Desde la raíz del proyecto:

```bash
npm run dev
```

La app quedará disponible en **http://localhost:3001**.

---

## Apagar servicios

### 1. Parar el servidor Next.js

En la terminal donde está corriendo `npm run dev`, pulsa **Ctrl+C**.

### 2. Parar la base de datos (Docker)

```bash
docker compose down
```

Para borrar también los datos de la base de datos (volumen):

```bash
docker compose down -v
```

---

## Reiniciar servicios

### Reiniciar solo la base de datos

```bash
docker compose down
docker compose up -d
```

### Reiniciar solo la app Next.js

1. En la terminal del `npm run dev`: **Ctrl+C**.
2. Luego, desde la raíz:

```bash
npm run dev
```

### Reiniciar todo (base de datos + app)

1. Parar la app: **Ctrl+C** en la terminal de `npm run dev`.
2. Parar Docker:

   ```bash
   docker compose down
   ```

3. Levantar de nuevo:

   ```bash
   docker compose up -d
   npm run dev
   ```

O, desde la raíz, usar el script y luego la app:

```bash
./start.sh
npm run dev
```

---

## Resumen rápido

| Acción              | Comando |
|---------------------|--------|
| **Encender DB**     | `docker compose up -d` |
| **Encender app**    | `npm run dev` (desde la raíz) |
| **Apagar DB**       | `docker compose down` |
| **Apagar app**      | Ctrl+C en la terminal de `npm run dev` |
| **Reiniciar DB**    | `docker compose down && docker compose up -d` |
| **Todo con script** | `./start.sh` (solo DB + migraciones; luego `npm run dev`) |

---

## Requisitos

- **Docker** en marcha (para la base de datos).
- **Node.js** ≥ 18 y **npm** ≥ 9 (para la app).
- Variables de entorno en la **raíz del proyecto**: `.env` o `.env.development.local` (p. ej. `DATABASE_URL`, `APP_URL`). Ver `README-APP.md` para más detalles de la app.
