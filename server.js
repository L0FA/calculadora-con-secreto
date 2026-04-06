/**
 * Servidor de Calculadora Secreta con Señalización WebRTC
 * Puerto: 3000 por defecto
 *
 * Para deploy en Render/Railway:
 * - El puerto se toma de process.env.PORT automáticamente
 * - CORS configurado para permitir conexiones desde cualquier origen
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Crear app Express
const app = express();
const server = http.createServer(app);

// Configuración de CORS para permitir conexiones desde el frontend en Hostinger
const io = new Server(server, {
    cors: {
        origin: "*", // En producción, cambiar por tu dominio de Hostinger
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Servir archivos estáticos
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

app.use(express.static(path.join(__dirname)));

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ==================== SERVIDOR DE SEÑALIZACIÓN WebRTC ====================

// Almacén de salas de chat activas
const chatRooms = new Map();

io.on('connection', (socket) => {
    console.log(`🔌 Nueva conexión: ${socket.id.substring(0, 8)}`);

    // Unirse a una sala de chat
    socket.on('join-chat', (data) => {
        const { chatId, displayName } = data;
        const roomId = `chat-${chatId}`;

        console.log(`👤 ${socket.id.substring(0, 8)} uniéndose a sala: ${roomId}`);

        // Verificar si la sala existe
        if (!chatRooms.has(roomId)) {
            chatRooms.set(roomId, {
                peers: new Map(),
                createdAt: Date.now()
            });
        }

        const room = chatRooms.get(roomId);
        const isInitiator = room.peers.size === 0;

        // Guardar info del peer
        room.peers.set(socket.id, {
            id: socket.id,
            displayName: displayName || 'Anónimo',
            isInitiator: isInitiator,
            joinedAt: Date.now()
        });

        // Unirse a la sala Socket.io
        socket.join(roomId);
        socket.roomId = roomId;
        socket.chatId = chatId;

        // Informar al cliente
        socket.emit('joined', {
            roomId: roomId,
            isInitiator: isInitiator,
            peerCount: room.peers.size
        });

        // Si ya hay alguien en la sala, notificar
        if (room.peers.size > 1) {
            // Notificar al nuevo que hay otro peer
            const existingPeers = Array.from(room.peers.values()).filter(p => p.id !== socket.id);
            socket.emit('peers-present', existingPeers.map(p => ({ id: p.id, displayName: p.displayName })));

            // Notificar a los existentes que llegó uno nuevo
            socket.to(roomId).emit('peer-joined', {
                id: socket.id,
                displayName: displayName || 'Anónimo'
            });
        }

        // Iniciar timer de expiración (30 min)
        startRoomExpiration(roomId);
    });

    // Manejar oferta WebRTC
    socket.on('webrtc-offer', (data) => {
        console.log(`📤 Oferta WebRTC de ${socket.id.substring(0, 8)} para ${data.targetId?.substring(0, 8)}`);
        socket.to(data.targetId).emit('webrtc-offer', {
            offer: data.offer,
            senderId: socket.id,
            senderName: data.senderName
        });
    });

    // Manejar respuesta WebRTC
    socket.on('webrtc-answer', (data) => {
        console.log(`📥 Respuesta WebRTC de ${socket.id.substring(0, 8)} para ${data.targetId?.substring(0, 8)}`);
        socket.to(data.targetId).emit('webrtc-answer', {
            answer: data.answer,
            senderId: socket.id
        });
    });

    // Manejar candidatos ICE
    socket.on('webrtc-ice-candidate', (data) => {
        socket.to(data.targetId).emit('webrtc-ice-candidate', {
            candidate: data.candidate,
            senderId: socket.id
        });
    });

    // Desconexión
    socket.on('disconnect', () => {
        console.log(`🔌 Desconexión: ${socket.id.substring(0, 8)}`);

        if (socket.roomId) {
            const room = chatRooms.get(socket.roomId);
            if (room) {
                room.peers.delete(socket.id);

                // Notificar a los demás en la sala
                socket.to(socket.roomId).emit('peer-left', {
                    id: socket.id,
                    message: 'Tu contacto se desconectó'
                });

                // Si la sala quedó vacía, eliminarla
                if (room.peers.size === 0) {
                    chatRooms.delete(socket.roomId);
                    console.log(`🗑️ Sala eliminada: ${socket.roomId}`);
                }
            }
        }
    });

    // Salir del chat manualmente
    socket.on('leave-chat', () => {
        if (socket.roomId) {
            const room = chatRooms.get(socket.roomId);
            if (room) {
                room.peers.delete(socket.id);
                socket.to(socket.roomId).emit('peer-left', {
                    id: socket.id,
                    message: 'Tu contacto salió del chat'
                });
                socket.leave(socket.roomId);

                if (room.peers.size === 0) {
                    chatRooms.delete(socket.roomId);
                }
            }
        }
    });

    // Mantener actividad (resetear timer)
    socket.on('keep-alive', () => {
        if (socket.roomId) {
            const room = chatRooms.get(socket.roomId);
            if (room) {
                room.lastActivity = Date.now();
            }
        }
    });
});

// Timer de expiración de salas (30 minutos)
const ROOM_TIMEOUT = 30 * 60 * 1000;

function startRoomExpiration(roomId) {
    const checkExpiration = () => {
        const room = chatRooms.get(roomId);
        if (!room) return;

        const timeSinceActivity = Date.now() - (room.lastActivity || room.createdAt);

        if (timeSinceActivity >= ROOM_TIMEOUT) {
            console.log(`⏰ Sala expirada por inactividad: ${roomId}`);

            // Notificar a todos en la sala
            io.to(roomId).emit('room-expired', {
                message: 'El chat se cerró por inactividad (30 minutos)'
            });

            // Forzar desconexión
            const sockets = io.sockets.adapter.rooms.get(roomId);
            if (sockets) {
                sockets.forEach(socketId => {
                    const s = io.sockets.sockets.get(socketId);
                    if (s) {
                        s.leave(roomId);
                        s.emit('chat-closed', { reason: 'inactivity' });
                    }
                });
            }

            chatRooms.delete(roomId);
        } else {
            // Revisar de nuevo en 1 minuto
            setTimeout(checkExpiration, 60000);
        }
    };

    setTimeout(checkExpiration, 60000);
}

// Limpiar salas vacías cada 5 minutos
setInterval(() => {
    chatRooms.forEach((room, roomId) => {
        if (room.peers.size === 0) {
            chatRooms.delete(roomId);
            console.log(`🧹 Sala limpiada: ${roomId}`);
        }
    });
}, 5 * 60 * 1000);

// ==================== INICIAR SERVIDOR ====================
server.listen(PORT, HOST, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🔢 CALCULADORA SECRETA - Servidor con WebRTC            ║
║                                                            ║
║   🌐 Servidor activo en:                                   ║
║      http://${HOST}:${PORT}                                    ║
║                                                            ║
║   🔐 CÓDIGO SECRETO: 21092025 + =                         ║
║      - Tipeá el código y presioná =                        ║
║      - Se abrirá el chat privado P2P                      ║
║                                                            ║
║   📡 Servidor de señalización WebSocket activo            ║
║   🔒 Chat P2P con WebRTC (mensajes directos)              ║
║   ⏱️  Auto-destrucción tras 30 min de inactividad         ║
║                                                            ║
║   Presiona Ctrl+C para detener el servidor                 ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);
});

// Manejar cierre graceful
process.on('SIGINT', () => {
    console.log('\n👋 Cerrando servidor...');
    io.close(() => {
        console.log('✅ Servidor cerrado correctamente');
        process.exit(0);
    });
});