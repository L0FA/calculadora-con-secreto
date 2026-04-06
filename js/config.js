/**
 * Configuración del Frontend para Calculadora Secreta
 *
 * PARA DEPLOY EN HOSTINGER:
 * 1. Cambia BACKEND_URL por la URL de tu servidor en Render/Railway
 * 2. Ejemplo: 'https://tu-app.onrender.com'
 */

// URL del servidor backend (Node.js + Socket.io)
// En desarrollo local: null (usa localhost:3000 automáticamente)
// En producción: poné la URL de tu servidor (ej: 'https://tu-app.onrender.com')
const BACKEND_URL = null;

// Si querés configurar la URL desde aquí, descomentá la siguiente línea y poné tu URL:
// const BACKEND_URL = 'https://tu-backend.onrender.com';

// Exportar para uso global
window.BACKEND_URL = BACKEND_URL;

console.log('📡 Backend URL:', BACKEND_URL || 'Automático (mismo origen o localhost)');