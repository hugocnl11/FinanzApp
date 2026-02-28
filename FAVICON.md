# Configuración de Favicon

El favicon de FinanzApp está configurado para aparecer en todas las pestañas del navegador.

## Archivos de Icono

- `src/app/icon.svg` - Icono SVG (funciona en navegadores modernos)
- `src/app/icon.tsx` - Genera icono PNG dinámicamente (32x32px)
- `src/app/apple-icon.tsx` - Genera icono para dispositivos Apple (180x180px)

## Generar favicon.ico

Para generar el archivo `favicon.ico` tradicional (opcional, para compatibilidad con navegadores antiguos):

### Opción 1: Herramienta Online (Recomendado)

1. Visita: https://cloudconvert.com/svg-to-ico o https://svg-to-ico.org/
2. Sube el archivo `src/app/icon.svg`
3. Descarga el `favicon.ico` generado
4. Colócalo en `src/app/favicon.ico`

### Opción 2: Usando Node.js

```bash
# Instalar svg-to-ico globalmente
npm install -g svg-to-ico

# Generar favicon.ico
svg-to-ico src/app/icon.svg src/app/favicon.ico
```

### Opción 3: Usar el script incluido

```bash
node scripts/generate-favicon.js
```

## Verificación

Después de generar el favicon.ico:

1. Reinicia el servidor de desarrollo: `npm run dev`
2. Abre la aplicación en el navegador
3. Verifica que el icono aparezca en la pestaña del navegador
4. Si no aparece, limpia la caché del navegador (Ctrl+F5 o Cmd+Shift+R)

## Nota

Next.js 15 detecta automáticamente:
- `icon.svg`, `icon.png`, `icon.tsx` → Se usa como favicon
- `apple-icon.png`, `apple-icon.tsx` → Se usa en dispositivos Apple
- `favicon.ico` → Se usa como fallback para navegadores antiguos

El metadata en `src/app/layout.tsx` está configurado para usar todos estos iconos.
