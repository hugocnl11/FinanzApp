#!/bin/bash

# Script para levantar los servicios de FinanzApp

set -e

echo "🚀 Iniciando servicios de FinanzApp..."

# Verificar si Docker está corriendo
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker no está corriendo. Por favor, inicia Docker Desktop."
    exit 1
fi

# Levantar PostgreSQL
echo "📦 Levantando PostgreSQL..."
cd "$(dirname "$0")"
docker compose up -d

# Esperar a que PostgreSQL esté listo
echo "⏳ Esperando a que PostgreSQL esté listo..."
sleep 5

# Verificar conexión
until docker compose exec -T postgres pg_isready -U finanzapp > /dev/null 2>&1; do
    echo "⏳ Esperando conexión a PostgreSQL..."
    sleep 2
done

echo "✅ PostgreSQL está listo!"

# Generar cliente de Prisma
echo "🔧 Generando cliente de Prisma..."
cd nextjs-basic-app-setup-ui
npm run db:generate

# Ejecutar migraciones
echo "📊 Ejecutando migraciones de base de datos..."
npm run db:migrate

echo "✅ ¡Todos los servicios están listos!"
echo ""
echo "Para iniciar el servidor de desarrollo, ejecuta:"
echo "  cd nextjs-basic-app-setup-ui && npm run dev"
