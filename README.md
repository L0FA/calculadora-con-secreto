# 🔢 Calculadora Secreta con Chat Privado

Una calculadora con múltiples diseños que oculta un chat privado seguro. Cuando alguien ingresa el código secreto **21092025** y presiona **=**, se desbloquea acceso a un chat privado sin registro que se autodestruye tras 30 minutos de inactividad.

## 🚀 Inicio Rápido

```bash
# Navegar al directorio
cd /d/VSC/Proyectos/calculadora-secreta

# Iniciar el servidor
node server.js

# Abrir en el navegador: http://localhost:3000
```

## 🎨 Características

### Calculadora
- **12 temas visuales**: Default, Dark, Neon, Minimal, Retro, Nature, Ocean, Sunset, Galaxy, Cyberpunk, Pastel, Glass
- **Modo básico y científico**: Funciones trigonométricas, logaritmos, constantes, etc.
- **Responsive**: Se adapta a cualquier pantalla
- **Soporte de teclado**: Números, operadores, Enter, Escape, Backspace

### 🔐 Cómo Activar el Chat Secreto

1. Abrí la calculadora
2. Escribí el código: **21092025**
3. Presioná el botón **=** (igual)
4. ¡Se abrirá el panel secreto con QR e hipervínculo!

### Opciones de Acceso al Chat

#### 📱 Para Móvil/Tablet
- Escaneá el código QR con la cámara
- Se abre directamente el chat

#### 💻 Para PC/Desktop
- Clickeá el hipervínculo **"🔗 Abrir Chat Privado"**
- O copiá el link y compartilo

### Chat Privado
- **Sin registro**: No se guardan datos
- **Archivos multimedia**: Envía fotos, PDFs, documentos
- **Cámara integrada**: Tomá fotos directamente
- **Autodestrucción**: Se cierra tras 30 min sin actividad
- **Timer visible**: Muestra tiempo restante

## 📁 Estructura

```
calculadora-secreta/
├── index.html          # Página principal
├── server.js           # Servidor Node.js
├── css/
│   ├── styles.css      # Estilos base
│   └── themes.css      # 12 temas visuales
├── js/
│   ├── calculator.js   # Lógica de calculadora + código secreto
│   └── chat.js         # Sistema de chat P2P
└── README.md           # Este archivo
```

## 🎯 Temas Disponibles

| # | Tema | Descripción |
|---|------|-------------|
| 1 | Default | Gradiente púrpura clásico |
| 2 | Dark | Negro elegante con acentos |
| 3 | Neon | Cyberpunk con brillos neón |
| 4 | Minimal | Blanco puro minimalista |
| 5 | Retro | Vintage estilo TV antigua |
| 6 | Nature | Verde naturaleza |
| 7 | Ocean | Azul océano profundo |
| 8 | Sunset | Naranja atardecer |
| 9 | Galaxy | Espacio profundo con estrellas |
| 10 | Cyberpunk | Futurista con bordes angulares |
| 11 | Pastel | Colores suaves pastel |
| 12 | Glass | Glassmorphism con blur |

## ⌨️ Atajos de Teclado

- `0-9`: Números
- `+ - * /`: Operadores
- `Enter` o `=`: Calcular resultado
- `Escape`: Limpiar
- `Backspace`: Borrar último dígito
- `.`: Punto decimal
- `%`: Porcentaje

## 🔧 Funciones Científicas

- `sin`, `cos`, `tan`: Funciones trigonométricas (en grados)
- `log`: Logaritmo base 10
- `ln`: Logaritmo natural
- `√`: Raíz cuadrada
- `x²`: Cuadrado
- `x³`: Cubo
- `1/x`: Inverso
- `n!`: Factorial
- `|x|`: Valor absoluto
- `π`: Pi (3.14159...)
- `e`: Euler (2.71828...)
- `(` `)`: Paréntesis

## 🔒 Seguridad del Chat

- **Sin persistencia**: Los mensajes solo existen en memoria durante la sesión
- **Sin base de datos**: No se almacena nada
- **WebRTC P2P**: Comunicación directa entre pares (cuando hay conexión)
- **Timer de autodestrucción**: 30 minutos sin actividad = cierre automático
- **Sin logs**: Todo se borra al cerrar

## 📱 Responsive

La calculadora está optimizada para:
- 📱 Móviles (320px+)
- 📱 Tablets
- 💻 Desktop
- 🖥️ Pantallas grandes

## 🛠️ Tecnologías

- HTML5
- CSS3 (Variables, Flexbox, Grid, Animations)
- JavaScript Vanilla (ES6+)
- WebRTC (comunicación P2P)
- QRCode.js (generación de códigos QR)

## 🇦🇷 Localización

La interfaz está en español argentino (che 😉).

---

**Nota**: Este proyecto es para fines educativos y de demostración. Para un chat real P2P necesitarías un servidor de señalización (WebSocket) para conectar los pares inicialmente.# calculadora-con-secreto
