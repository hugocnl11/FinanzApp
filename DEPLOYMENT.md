# Guía de Despliegue en Vercel

## Base de Datos

Vercel **NO** aloja bases de datos. Necesitas una base de datos PostgreSQL externa.

### Opción 1: Vercel Postgres (Recomendado)

1. Ve a tu proyecto en Vercel
2. Ve a la pestaña **Storage**
3. Haz clic en **Create Database** → **Postgres**
4. Elige un plan (hay un plan gratuito)
5. Vercel creará automáticamente la variable de entorno `POSTGRES_URL`
6. En **Settings → Environment Variables**, verifica que `POSTGRES_URL` esté configurada
7. Si tu Prisma usa `DATABASE_URL`, puedes crear un alias:
   - Variable: `DATABASE_URL`
   - Valor: `$(POSTGRES_URL)` (o copia el valor de POSTGRES_URL)

### Opción 2: Supabase (Gratis)

1. Ve a [supabase.com](https://supabase.com)
2. Crea una cuenta y un nuevo proyecto
3. Ve a **Settings → Database**
4. Copia la **Connection String** (URI)
5. En Vercel, ve a **Settings → Environment Variables**
6. Agrega:
   - Variable: `DATABASE_URL`
   - Valor: La connection string de Supabase (formato: `postgresql://user:password@host:port/database`)

### Opción 3: Railway (Gratis con límites)

1. Ve a [railway.app](https://railway.app)
2. Crea una cuenta
3. **New Project** → **Provision PostgreSQL**
4. Ve a la pestaña **Variables**
5. Copia la `DATABASE_URL`
6. En Vercel, agrega la variable `DATABASE_URL` con ese valor

### Opción 4: Neon (Gratis)

1. Ve a [neon.tech](https://neon.tech)
2. Crea una cuenta y un proyecto
3. Copia la connection string
4. En Vercel, agrega `DATABASE_URL` con ese valor

## Configuración en Vercel

### Variables de Entorno Necesarias

1. **DATABASE_URL** (obligatorio)
   - Formato: `postgresql://user:password@host:port/database?sslmode=require`
   - Obtén este valor de tu proveedor de base de datos

2. **SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS** (opcional, solo si usas verificación por email)
   - Puedes usar servicios como SendGrid, Mailgun, o Resend

### Ejecutar Migraciones

Después del primer despliegue, necesitas ejecutar las migraciones de Prisma:

**Opción A: Desde Vercel CLI (recomendado)**
```bash
npm install -g vercel
vercel login
vercel link
vercel env pull .env.local
npx prisma migrate deploy
```

**Opción B: Desde tu máquina local**
```bash
# Asegúrate de tener DATABASE_URL en tu .env local
npx prisma migrate deploy
```

**Opción C: Script de post-deploy en Vercel**
Puedes agregar un script en `package.json`:
```json
{
  "scripts": {
    "postdeploy": "prisma migrate deploy"
  }
}
```

## Verificación

1. Después del despliegue, verifica que la aplicación carga correctamente
2. Intenta registrarte para verificar que la base de datos funciona
3. Revisa los logs en Vercel si hay errores

## Notas Importantes

- **Prisma funciona perfectamente en Vercel** - solo necesitas la `DATABASE_URL` correcta
- La base de datos debe estar accesible desde internet (no localhost)
- Usa SSL en la connection string (`?sslmode=require`)
- Las migraciones se ejecutan una vez, no en cada build
