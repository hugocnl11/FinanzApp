# Documentación de componentes

Resumen de los componentes principales y su propósito. Las props pueden variar en el futuro cuando se conecte con backend real.

## Dashboard

- `AnalyticsCharts`: conjunto de gráficas principales con métricas mensuales.
- `DashboardCategoryBreakdowns`: desglose de ingresos y gastos por categoría.
- `Widgets`: tarjetas de resumen con ingresos, gastos y progreso de objetivos.
- `Alerts`: alertas rápidas de presupuestos y logros.
- `PeriodSelector`: selector de rango temporal.
- `MovementsTable`: tabla principal de movimientos con acciones.
- `MovementForm`: formulario de creación y edición de movimientos.
- `CategoryManager`: gestor de categorías con CRUD.
- `BudgetManager`: gestor de presupuestos con límites mensuales.
- `GoalsManager`: gestor de objetivos financieros con progreso.
- `NotificationCenter`: centro de notificaciones en el header.

## UI

- `Button`, `Card`, `Input`, `Dialog`, `Progress`, `Table`: componentes base.
- `Select`, `DatePicker`, `MultiSelect`: inputs avanzados.
- `ConfirmDialog`: confirmaciones reutilizables.
- `EmptyState`: estados vacíos consistentes.

## Layout

- `AppSidebar`: navegación principal.
- `ThemeToggle`: alterna tema claro/oscuro.

## Recomendaciones de uso

- Prefiere los componentes en `src/components/ui` para consistencia visual.
- Centraliza datos y utilidades en `src/lib`.
- Evita duplicar estilos: usa Tailwind y las utilidades existentes.
