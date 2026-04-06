/**
 * Servidor de Calculadora Secreta con Señalización WebRTC
 * + Auto-Match (sin necesidad de links)
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const app = express();
const server = http.createServer(app);

// ⚠️ En producción, cambiá esto por tu dominio de Hostinger
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Archivos estáticos
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ==================== AUTO MATCH SYSTEM ====================

// Usuario en espera
let waitingUser = null;

// Salas activas
const chatRooms = new Map();

// ==================== SOCKET.IO ====================

io.on('connection', (socket) => {
    console.log(`🔌 Nueva conexión: ${socket.id.substring(0, 8)}`);

    // ==================== JOIN RANDOM (AUTO MATCH) ====================
    socket.on('join-random', (displayName) => {
        console.log(`🎯 ${socket.id.substring(0, 8)} buscando match...`);

        if (waitingUser && waitingUser.id !== socket.id) {
            // 🔥 MATCH ENCONTRADO
            const roomId = `room-${waitingUser.id}-${socket.id}`;

            socket.join(roomId);
            waitingUser.join(roomId);

            socket.roomId = roomId;
            waitingUser.roomId = roomId;

            const roomData = {
                peers: new Map(),
                createdAt: Date.now(),
                lastActivity: Date.now()
            };

            chatRooms.set(roomId, roomData);

            roomData.peers.set(socket.id, {
                id: socket.id,
                displayName: displayName || 'Anónimo'
            });

            roomData.peers.set(waitingUser.id, {
                id: waitingUser.id,
                displayName: 'Anónimo'
            });

            // Notificar a ambos
            socket.emit('matched', {
                peerId: waitingUser.id,
                isInitiator: false
            });

            waitingUser.emit('matched', {
                peerId: socket.id,
                isInitiator: true
            });

            console.log(`🤝 Match: ${socket.id.substring(0, 4)} <-> ${waitingUser.id.substring(0, 4)}`);

            // Resetear cola
            waitingUser = null;

            // Iniciar expiración
            startRoomExpiration(roomId);

        } else {
            // ⏳ Esperando a alguien
            waitingUser = socket;
            socket.emit('waiting');
            console.log(`⏳ ${socket.id.substring(0, 8)} en espera...`);
        }
    });

    // ==================== WEBRTC ====================

    socket.on('webrtc-offer', (data) => {
        socket.to(data.targetId).emit('webrtc-offer', {
            offer: data.offer,
            senderId: socket.id,
            senderName: data.senderName
        });
    });

    socket.on('webrtc-answer', (data) => {
        socket.to(data.targetId).emit('webrtc-answer', {
            answer: data.answer,
            senderId: socket.id
        });
    });

    socket.on('webrtc-ice-candidate', (data) => {
        socket.to(data.targetId).emit('webrtc-ice-candidate', {
            candidate: data.candidate,
            senderId: socket.id
        });
    });

    // ==================== KEEP ALIVE ====================

    socket.on('keep-alive', () => {
        if (socket.roomId) {
            const room = chatRooms.get(socket.roomId);
            if (room) {
                room.lastActivity = Date.now();
            }
        }
    });

    // ==================== LEAVE ====================

    socket.on('leave-chat', () => {
        leaveRoom(socket);
    });

    socket.on('disconnect', () => {
        console.log(`🔌 Desconexión: ${socket.id.substring(0, 8)}`);

        // Si estaba esperando, lo sacamos
        if (waitingUser && waitingUser.id === socket.id) {
            waitingUser = null;
        }

        leaveRoom(socket);
    });
});

// ==================== FUNCIONES ====================

function leaveRoom(socket) {
    if (!socket.roomId) return;

    const room = chatRooms.get(socket.roomId);

    if (room) {
        room.peers.delete(socket.id);

        socket.to(socket.roomId).emit('peer-left', {
            id: socket.id,
            message: 'Tu contacto se desconectó'
        });

        if (room.peers.size === 0) {
            chatRooms.delete(socket.roomId);
            console.log(`🗑️ Sala eliminada: ${socket.roomId}`);
        }
    }

    socket.leave(socket.roomId);
}

// ==================== EXPIRACIÓN ====================

const ROOM_TIMEOUT = 30 * 60 * 1000;

function startRoomExpiration(roomId) {
    const checkExpiration = () => {
        const room = chatRooms.get(roomId);
        if (!room) return;

        const timeSinceActivity = Date.now() - (room.lastActivity || room.createdAt);

        if (timeSinceActivity >= ROOM_TIMEOUT) {
            console.log(`⏰ Sala expirada: ${roomId}`);

            io.to(roomId).emit('room-expired', {
                message: 'El chat se cerró por inactividad'
            });

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
            setTimeout(checkExpiration, 60000);
        }
    };

    setTimeout(checkExpiration, 60000);
}

// Limpieza automática
setInterval(() => {
    chatRooms.forEach((room, roomId) => {
        if (room.peers.size === 0) {
            chatRooms.delete(roomId);
            console.log(`🧹 Sala limpiada: ${roomId}`);
        }
    });
}, 5 * 60 * 1000);

// ==================== START ====================

server.listen(PORT, () => {
    console.log(`🚀 Servidor activo en puerto ${PORT}`);
});
