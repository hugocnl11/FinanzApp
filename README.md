# FinanzApp

Aplicación de gestión financiera personal creada con Next.js y TypeScript. Permite controlar ingresos, gastos, presupuestos y objetivos desde un panel moderno y personalizable.

## Características principales

- Dashboard con métricas clave, alertas y acciones rápidas
- Movimientos con filtros avanzados y exportación a CSV/PDF
- Página de gráficas con filtros por mes, comparativas y valores
- Gestión de categorías, presupuestos y objetivos financieros
- Persistencia local con `localStorage`
- Onboarding guiado y autenticación visual mejorada

## Requisitos

- Node.js 18+
- npm, pnpm, yarn o bun

## Instalación y uso

```bash
npm install
npm run dev
```

Visita `http://localhost:3000`.

## Estructura del proyecto

```
src/
  app/                 # Rutas y páginas (App Router)
  components/          # Componentes reutilizables
  lib/                 # Datos, utilidades y API layer
  hooks/               # Hooks personalizados
```

## Variables de entorno (futuro backend)

```
NEXT_PUBLIC_API_URL=https://api.tu-dominio.com
```

## Roadmap

- Integración con backend real (auth, movimientos, categorías)
- Reportes descargables con PDFs avanzados
- Notificaciones push y recordatorios programados
- Modo offline y sincronización

## Documentación adicional

Consulta `COMPONENTS.md` para la guía de componentes.
