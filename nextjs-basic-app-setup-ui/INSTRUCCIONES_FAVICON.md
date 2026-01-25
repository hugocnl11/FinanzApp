# Instrucciones para ver el nuevo favicon en Safari

## Problema
Safari cachea los favicons muy agresivamente, por lo que puede seguir mostrando el icono viejo incluso después de actualizarlo.

## Solución

### Paso 1: Reiniciar el servidor
```bash
# Detén el servidor (Ctrl+C) y luego:
npm run dev
```

### Paso 2: Limpiar caché de Safari

**Opción A: Vaciar caché completo**
1. Abre Safari
2. Ve a `Safari` > `Configuración` > `Avanzado`
3. Marca "Mostrar menú Desarrollo en la barra de menús"
4. Ve a `Desarrollo` > `Vaciar cachés`
5. O usa el atajo: `Cmd + Option + E`

**Opción B: Recarga forzada**
- Presiona `Cmd + Shift + R` para recargar la página forzando la actualización del caché

**Opción C: Modo privado**
- Abre una ventana de navegación privada (`Cmd + Shift + N`)
- Visita `http://localhost:3000`

**Opción D: Eliminar datos del sitio (más agresivo)**
1. Ve a `Safari` > `Configuración` > `Privacidad`
2. Haz clic en "Gestionar datos de sitios web..."
3. Busca `localhost` o `127.0.0.1`
4. Elimina los datos del sitio
5. Recarga la página

### Paso 3: Verificar que los iconos se están sirviendo

Abre estas URLs en tu navegador para verificar:
- `http://localhost:3000/icon` - Debería mostrar el icono PNG generado
- `http://localhost:3000/icon.svg` - Debería mostrar el icono SVG
- `http://localhost:3000/apple-icon` - Debería mostrar el icono para Apple

### Paso 4: Si aún no funciona

1. Cierra Safari completamente (`Cmd + Q`)
2. Abre Safari de nuevo
3. Visita la aplicación

## Archivos de icono configurados

- `src/app/icon.tsx` - Genera icono PNG dinámicamente (32x32px)
- `src/app/icon.svg` - Icono SVG estático
- `src/app/apple-icon.tsx` - Genera icono para Apple (180x180px)
- `src/app/favicon.tsx` - Genera favicon dinámicamente

El favicon.ico viejo ha sido renombrado a `favicon.ico.old` para evitar conflictos.
