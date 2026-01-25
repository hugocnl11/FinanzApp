/**
 * Script para generar favicon.ico desde icon.svg
 * 
 * Requiere: npm install -g svg-to-ico
 * O usar: npx svg-to-ico src/app/icon.svg src/app/favicon.ico
 * 
 * Alternativamente, puedes usar herramientas online como:
 * - https://cloudconvert.com/svg-to-ico
 * - https://svg-to-ico.org/
 * 
 * Para usar este script:
 * 1. Instala svg-to-ico: npm install -g svg-to-ico
 * 2. Ejecuta: node scripts/generate-favicon.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const iconSvgPath = path.join(__dirname, '../src/app/icon.svg');
const faviconIcoPath = path.join(__dirname, '../src/app/favicon.ico');

console.log('Generando favicon.ico desde icon.svg...');

try {
  // Verificar que existe icon.svg
  if (!fs.existsSync(iconSvgPath)) {
    console.error('Error: No se encontró icon.svg en', iconSvgPath);
    process.exit(1);
  }

  // Intentar usar svg-to-ico si está instalado
  try {
    execSync(`svg-to-ico "${iconSvgPath}" "${faviconIcoPath}"`, { stdio: 'inherit' });
    console.log('✓ favicon.ico generado exitosamente en', faviconIcoPath);
  } catch (error) {
    console.warn('svg-to-ico no está instalado. Instálalo con: npm install -g svg-to-ico');
    console.warn('O usa una herramienta online para convertir icon.svg a favicon.ico');
    console.warn('Herramientas recomendadas:');
    console.warn('  - https://cloudconvert.com/svg-to-ico');
    console.warn('  - https://svg-to-ico.org/');
    console.warn('\nEl archivo icon.svg ya está disponible y funcionará como favicon en navegadores modernos.');
  }
} catch (error) {
  console.error('Error al generar favicon.ico:', error.message);
  process.exit(1);
}
