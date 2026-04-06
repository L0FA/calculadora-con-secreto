# 🚀 Guía de Deploy - Calculadora Secreta

## Opción Híbrida: Frontend en Hostinger + Backend en Render/Railway

---

## 📦 Parte 1: Backend (Node.js) en Render/Railway

### Opción A: Render (Recomendado - Gratuito)

1. **Crear cuenta en [render.com](https://render.com)**

2. **Crear nuevo Web Service:**
   - Click en "New +" → "Web Service"
   - Conectar tu repositorio de GitHub/GitLab
   - O subir los archivos manualmente

3. **Configurar el servicio:**
   ```
   Name: calculadora-secreta-backend
   Runtime: Node
   Build Command: npm install
   Start Command: npm start
   ```

4. **Variables de entorno (opcional):**
   - `PORT` - Render lo asigna automáticamente

5. **Deploy:**
   - Click en "Create Web Service"
   - Esperar a que termine el build
   - Anotar la URL generada (ej: `https://calculadora-secreta.onrender.com`)

### Opción B: Railway (Alternativa - Gratuito)

1. **Crear cuenta en [railway.app](https://railway.app)**

2. **Instalar CLI:**
   ```bash
   npm install -g @railway/cli
   ```

3. **Deploy:**
   ```bash
   cd D:/VSC/Proyectos/calculadora-secreta
   railway login
   railway init
   railway up
   ```

4. **Anotar la URL generada**

---

## 🌐 Parte 2: Frontend en Hostinger

### Paso 1: Modificar la configuración

Edita el archivo `js/config.js`:

```javascript
// Poné la URL de tu backend de Render/Railway
const BACKEND_URL = 'https://tu-backend.onrender.com';
```

### Paso 2: Subir archivos al hosting

Archivos a subir (vía File Manager o FTP):
```
/public_html/
├── index.html
├── css/
│   ├── styles.css
│   └── themes.css
├── js/
│   ├── config.js
│   ├── calculator.js
│   └── chat.js
├── assets/
│   └── (imágenes si hay)
└── README.md
```

### Paso 3: Configurar dominio

1. En hPanel de Hostinger, ve a "Dominios"
2. Configura tu dominio apuntando a `public_html`
3. Activa SSL (Let's Encrypt gratis)

---

## 🔧 Archivos para el Backend

El backend solo necesita estos archivos:
```
backend/
├── server.js
├── package.json
├── package-lock.json
└── (node_modules se genera solo)
```

---

## ✅ Verificar que funciona

1. Abre tu frontend en Hostinger (ej: `https://tudominio.com`)
2. Escribe el código secreto: `21092025`
3. Presiona `=`
4. Se abrirá el panel secreto con QR
5. ¡Listo! El chat P2P debería funcionar

---

## 🐛 Solución de problemas

### El chat no conecta

1. **Verificar CORS:**
   - El backend ya tiene CORS configurado con `origin: "*"`
   - Si hay problemas, cambiar `"*"` por tu dominio exacto

2. **Verificar HTTPS:**
   - WebRTC requiere HTTPS en producción
   - Asegurate de tener SSL activo en Hostinger

3. **Verificar Socket.io:**
   - Abrir consola del navegador (F12)
   - Buscar errores de conexión a Socket.io

### Error de certificado SSL

- Hostinger ofrece SSL gratis con Let's Encrypt
- Activarlo en hPanel → SSL → Install

---

## 📞 Soporte

Si tenés problemas, verificá:
1. La URL del backend en `config.js`
2. Los logs del servidor en Render/Railway
3. La consola del navegador (F12 → Console)