/**
 * Sistema de Chat Privado P2P con WebRTC
 * - Conexión vía servidor de señalización (Socket.io)
 * - Sin registro
 * - Autodestrucción tras 30 min de inactividad
 * - Soporte para archivos e imágenes
 */

// ==================== CONFIGURACIÓN ====================
// Detectar automáticamente la URL del servidor
const getServerUrl = () => {
    // Si hay una variable global configurada, usarla
    if (window.BACKEND_URL) {
        return window.BACKEND_URL;
    }
    // Si estamos en producción (no localhost), usar el mismo origen
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        return window.location.origin;
    }
    // En desarrollo local
    return 'http://localhost:3000';
};

const ChatConfig = {
    SERVER_URL: getServerUrl(),
    INACTIVITY_TIMEOUT: 30 * 60 * 1000, // 30 minutos
    WARNING_TIMEOUT: 5 * 60 * 1000, // 5 minutos de advertencia
    ICE_SERVERS: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' }
    ],
    RECONNECT_ATTEMPTS: 3
};

// ==================== ESTADO DEL CHAT ====================
let ChatState = {
    isActive: false,
    peerConnection: null,
    dataChannel: null,
    messages: [],
    lastActivity: Date.now(),
    inactivityTimer: null,
    warningTimer: null,
    isInitiator: false,
    peerId: null,
    peerName: 'Anónimo',
    myName: 'Usuario',
    socket: null,
    isConnected: false,
    reconnectAttempts: 0
};

// ==================== INICIAR CHAT ====================
function startPrivateChat() {
    const chatWindow = document.getElementById('chat-window');
    chatWindow.classList.remove('hidden');

    ChatState.isActive = true;
    ChatState.lastActivity = Date.now();
    ChatState.myName = 'Usuario_' + Math.random().toString(36).substr(2, 4);

    // Iniciar temporizadores
    startInactivityTimers();

    // Configurar UI
    setupChatUI();

    // Conectar al servidor de señalización
    connectToSignalingServer();
}

// ==================== CONEXIÓN AL SERVIDOR DE SEÑALIZACIÓN ====================
function connectToSignalingServer() {
    addSystemMessage('🔌 Conectando al servidor...');

    // Cargar Socket.io dinámicamente si no está cargado
    if (typeof io === 'undefined') {
        loadSocketIO();
        return;
    }

    initSocketConnection();
}

function loadSocketIO() {
    const script = document.createElement('script');
    // Cargar Socket.io desde la URL del servidor
    const socketIoUrl = ChatConfig.SERVER_URL.replace(/\/$/, '');
    script.src = `${socketIoUrl}/socket.io/socket.io.js`;
    script.onload = () => initSocketConnection();
    script.onerror = () => {
        addSystemMessage('❌ Error al cargar Socket.io. Usando modo local.');
        setTimeout(simulateConnection, 1000);
    };
    document.head.appendChild(script);
}

function initSocketConnection() {
    try {
        // Conectar al servidor de señalización usando la URL configurada
        ChatState.socket = io(ChatConfig.SERVER_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: ChatConfig.RECONNECT_ATTEMPTS,
            reconnectionDelay: 1000
        });

        // Eventos de conexión
        ChatState.socket.on('connect', () => {
            console.log('✅ Conectado al servidor de señalización');
            addSystemMessage('✅ Conectado al servidor');

            // Unirse a la sala
            const chatId = window.currentChatId || extractChatIdFromURL() || generateChatId();
            ChatState.socket.emit('join-chat', {
                chatId: chatId,
                displayName: ChatState.myName
            });
        });

        ChatState.socket.on('connect_error', (error) => {
            console.error('Error de conexión:', error);
            addSystemMessage('⚠️ Error de conexión. Reintentando...');
        });

        ChatState.socket.on('disconnect', () => {
            console.log('Desconectado del servidor');
            if (ChatState.isActive) {
                addSystemMessage('⚠️ Conexión perdida. Reintentando...');
            }
        });

        // Unido exitosamente a la sala
        ChatState.socket.on('joined', (data) => {
            console.log(' Unido a sala:', data);
            ChatState.isInitiator = data.isInitiator;

            if (data.isInitiator) {
                addSystemMessage('🔒 Sala creada. Esperando conexión...');
            } else {
                addSystemMessage('🔒 Te uniste al chat. Conectando...');
            }

            // Si soy el initiator y ya hay alguien, crear peer connection
            if (data.peerCount >= 2 || !data.isInitiator) {
                createPeerConnection();
            }
        });

        // Hay otros peers presentes
        ChatState.socket.on('peers-present', (peers) => {
            console.log('👥 Peers presentes:', peers);
            if (peers.length > 0) {
                ChatState.peerId = peers[0].id;
                ChatState.peerName = peers[0].displayName || 'Anónimo';
                addSystemMessage(`👤 Conectado con: ${ChatState.peerName}`);
                createPeerConnection();
            }
        });

        // Nuevo peer se unió
        ChatState.socket.on('peer-joined', (peer) => {
            console.log('👥 Nuevo peer:', peer);
            ChatState.peerId = peer.id;
            ChatState.peerName = peer.displayName || 'Anónimo';
            addSystemMessage(`👤 ${ChatState.peerName} se unió al chat`);

            // Si soy el initiator, crear la oferta
            if (ChatState.isInitiator) {
                createPeerConnection();
                createOffer();
            }
        });

        // Recibir oferta WebRTC
        ChatState.socket.on('webrtc-offer', async (data) => {
            console.log('📥 Oferta recibida de:', data.senderId);
            ChatState.peerId = data.senderId;
            ChatState.peerName = data.senderName || 'Anónimo';

            if (!ChatState.peerConnection) {
                createPeerConnection();
            }

            try {
                await ChatState.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
                const answer = await ChatState.peerConnection.createAnswer();
                await ChatState.peerConnection.setLocalDescription(answer);

                ChatState.socket.emit('webrtc-answer', {
                    answer: answer,
                    targetId: data.senderId
                });
            } catch (error) {
                console.error('Error procesando oferta:', error);
            }
        });

        // Recibir respuesta WebRTC
        ChatState.socket.on('webrtc-answer', async (data) => {
            console.log('📥 Respuesta recibida de:', data.senderId);
            try {
                await ChatState.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
            } catch (error) {
                console.error('Error procesando respuesta:', error);
            }
        });

        // Recibir candidato ICE
        ChatState.socket.on('webrtc-ice-candidate', async (data) => {
            console.log('❄️ Candidato ICE recibido');
            try {
                if (ChatState.peerConnection) {
                    await ChatState.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
                }
            } catch (error) {
                console.error('Error agregando candidato ICE:', error);
            }
        });

        // Peer salió
        ChatState.socket.on('peer-left', (data) => {
            console.log('👋 Peer salió:', data);
            addSystemMessage(`👋 ${data.message}`);
            ChatState.isConnected = false;

            // Cerrar peer connection
            if (ChatState.peerConnection) {
                ChatState.peerConnection.close();
                ChatState.peerConnection = null;
            }
        });

        // Sala expirada
        ChatState.socket.on('room-expired', (data) => {
            addSystemMessage(`⏰ ${data.message}`);
            destroyChat('inactivity');
        });

        ChatState.socket.on('chat-closed', (data) => {
            addSystemMessage(`🔒 Chat cerrado: ${data.reason}`);
            closeChatWindow();
        });

    } catch (error) {
        console.error('Error inicializando Socket.io:', error);
        addSystemMessage('❌ Error de conexión. Usando modo local.');
        simulateConnection();
    }
}

// ==================== WEBRTC PEER CONNECTION ====================
function createPeerConnection() {
    if (ChatState.peerConnection) return;

    console.log('🔗 Creando Peer Connection...');

    const config = {
        iceServers: ChatConfig.ICE_SERVERS
    };

    ChatState.peerConnection = new RTCPeerConnection(config);

    // Crear canal de datos si soy el initiator
    if (ChatState.isInitiator) {
        ChatState.dataChannel = ChatState.peerConnection.createDataChannel('chat', {
            ordered: true
        });
        setupDataChannel(ChatState.dataChannel);
    }

    // Manejar canal de datos entrante
    ChatState.peerConnection.ondatachannel = (event) => {
        console.log('📡 Canal de datos recibido');
        ChatState.dataChannel = event.channel;
        setupDataChannel(ChatState.dataChannel);
    };

    // Manejar candidatos ICE
    ChatState.peerConnection.onicecandidate = (event) => {
        if (event.candidate && ChatState.socket) {
            console.log('❄️ Enviando candidato ICE');
            ChatState.socket.emit('webrtc-ice-candidate', {
                candidate: event.candidate,
                targetId: ChatState.peerId
            });
        }
    };

    // Estado de conexión
    ChatState.peerConnection.onconnectionstatechange = () => {
        const state = ChatState.peerConnection.connectionState;
        console.log('🔗 Estado de conexión:', state);

        switch (state) {
            case 'connected':
                ChatState.isConnected = true;
                addSystemMessage('✅ Conexión P2P establecida');
                updateActivity();
                break;
            case 'disconnected':
                ChatState.isConnected = false;
                addSystemMessage('⚠️ Conexión perdida');
                break;
            case 'failed':
                ChatState.isConnected = false;
                addSystemMessage('❌ Error de conexión');
                break;
        }
    };

    ChatState.peerConnection.oniceconnectionstatechange = () => {
        console.log('❄️ Estado ICE:', ChatState.peerConnection.iceConnectionState);
    };
}

async function createOffer() {
    if (!ChatState.peerConnection || !ChatState.socket) return;

    try {
        const offer = await ChatState.peerConnection.createOffer();
        await ChatState.peerConnection.setLocalDescription(offer);

        console.log('📤 Enviando oferta...');
        ChatState.socket.emit('webrtc-offer', {
            offer: offer,
            targetId: ChatState.peerId,
            senderName: ChatState.myName
        });
    } catch (error) {
        console.error('Error creando oferta:', error);
    }
}

function setupDataChannel(channel) {
    channel.onopen = () => {
        console.log('📡 Canal de datos abierto');
        ChatState.isConnected = true;
        addSystemMessage('🔒 Canal seguro establecido');
        updateActivity();
    };

    channel.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handleIncomingMessage(data);
            updateActivity();
        } catch (error) {
            console.error('Error procesando mensaje:', error);
        }
    };

    channel.onclose = () => {
        console.log('📡 Canal de datos cerrado');
        ChatState.isConnected = false;
    };

    channel.onerror = (error) => {
        console.error('Error en canal de datos:', error);
    };
}

// ==================== TEMPORIZADORES DE INACTIVIDAD ====================
function startInactivityTimers() {
    clearInactivityTimers();

    ChatState.warningTimer = setTimeout(() => {
        showInactivityWarning();
    }, ChatConfig.INACTIVITY_TIMEOUT - ChatConfig.WARNING_TIMEOUT);

    ChatState.inactivityTimer = setTimeout(() => {
        destroyChat('inactivity');
    }, ChatConfig.INACTIVITY_TIMEOUT);
}

function clearInactivityTimers() {
    if (ChatState.warningTimer) {
        clearTimeout(ChatState.warningTimer);
        ChatState.warningTimer = null;
    }
    if (ChatState.inactivityTimer) {
        clearTimeout(ChatState.inactivityTimer);
        ChatState.inactivityTimer = null;
    }
}

function updateActivity() {
    ChatState.lastActivity = Date.now();
    startInactivityTimers();
    updateTimerDisplay();

    // Enviar keep-alive al servidor
    if (ChatState.socket && ChatState.socket.connected) {
        ChatState.socket.emit('keep-alive');
    }
}

function showInactivityWarning() {
    addSystemMessage('⚠️ ¡El chat se cerrará en 5 minutos por inactividad!');
}

function updateTimerDisplay() {
    const timerEl = document.getElementById('inactivity-timer');
    if (!timerEl) return;

    const elapsed = Date.now() - ChatState.lastActivity;
    const remaining = Math.max(0, ChatConfig.INACTIVITY_TIMEOUT - elapsed);
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Cambiar color cuando queda poco tiempo
    if (remaining < ChatConfig.WARNING_TIMEOUT) {
        timerEl.style.background = 'rgba(239, 68, 68, 0.4)';
        timerEl.style.animation = 'pulse 0.5s ease infinite';
    } else {
        timerEl.style.background = 'rgba(239, 68, 68, 0.2)';
        timerEl.style.animation = 'pulse-timer 1s ease infinite';
    }
}

// Actualizar timer cada segundo
setInterval(() => {
    if (ChatState.isActive) {
        updateTimerDisplay();
    }
}, 1000);

// ==================== SETUP UI ====================
function setupChatUI() {
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-message');
    const fileInput = document.getElementById('file-input');
    const cameraInput = document.getElementById('camera-input');

    // Enviar mensaje con Enter
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Botón enviar
    sendBtn.addEventListener('click', sendMessage);

    // Adjuntar archivos
    fileInput.addEventListener('change', handleFileSelect);

    // Cámara
    cameraInput.addEventListener('change', handleFileSelect);

    // Cerrar chat
    document.getElementById('close-chat').addEventListener('click', closeChat);

    // Actualizar actividad en cada interacción
    document.addEventListener('click', updateActivity);
    document.addEventListener('keypress', updateActivity);
}

// ==================== ENVÍO DE MENSAJES ====================
function sendMessage() {
    const input = document.getElementById('message-input');
    const message = input.value.trim();

    if (!message) return;

    const messageData = {
        type: 'text',
        content: message,
        timestamp: Date.now()
    };

    // Agregar a mis mensajes
    addMessage(messageData, true);

    // Enviar por WebRTC
    if (ChatState.dataChannel && ChatState.dataChannel.readyState === 'open') {
        ChatState.dataChannel.send(JSON.stringify(messageData));
    } else {
        // Si no hay conexión P2P, mostrar warning
        addSystemMessage('⚠️ Esperando conexión...');
    }

    // Limpiar input
    input.value = '';
    updateActivity();
}

function handleFileSelect(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
        processFile(file);
    });

    event.target.value = '';
    updateActivity();
}

function processFile(file) {
    // Límite de tamaño: 5MB
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
        addSystemMessage(`❌ Archivo muy grande (máx 5MB): ${file.name}`);
        return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
        const fileData = {
            type: 'file',
            name: file.name,
            mimeType: file.type,
            size: file.size,
            content: e.target.result,
            timestamp: Date.now()
        };

        // Si es una imagen, crear preview
        if (file.type.startsWith('image/')) {
            fileData.isImage = true;
        }

        addMessage(fileData, true);

        // Enviar por WebRTC
        if (ChatState.dataChannel && ChatState.dataChannel.readyState === 'open') {
            try {
                ChatState.dataChannel.send(JSON.stringify(fileData));
            } catch (error) {
                addSystemMessage('❌ Error enviando archivo');
            }
        }
    };

    reader.readAsDataURL(file);
}

// ==================== RECEPCIÓN DE MENSAJES ====================
function handleIncomingMessage(data) {
    switch (data.type) {
        case 'text':
            addMessage(data, false);
            break;
        case 'file':
            addMessage(data, false);
            break;
        default:
            console.log('Mensaje recibido:', data);
    }
}

// ==================== RENDERIZADO DE MENSAJES ====================
function addMessage(data, isSent) {
    const messagesContainer = document.getElementById('chat-messages');
    const messageEl = document.createElement('div');
    messageEl.className = `message ${isSent ? 'sent' : 'received'}`;

    const time = new Date(data.timestamp);
    const timeStr = time.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

    let content = '';

    if (data.type === 'text') {
        content = `<div class="message-text">${escapeHtml(data.content)}</div>`;
    } else if (data.type === 'file') {
        if (data.isImage) {
            content = `
                <div class="message-text">📷 Imagen</div>
                <img src="${data.content}" class="message-image" alt="${escapeHtml(data.name)}" onclick="openImage(this)">
            `;
        } else {
            const icon = getFileIcon(data.mimeType);
            content = `
                <div class="message-file" onclick="downloadFile('${escapeHtml(data.content)}', '${escapeHtml(data.name)}')">
                    <span>${icon}</span>
                    <span>${escapeHtml(data.name)}</span>
                    <span class="file-size">${formatFileSize(data.size)}</span>
                </div>
            `;
        }
    }

    messageEl.innerHTML = `
        ${content}
        <div class="message-time">${timeStr}</div>
    `;

    messagesContainer.appendChild(messageEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function addSystemMessage(text) {
    const messagesContainer = document.getElementById('chat-messages');
    const messageEl = document.createElement('div');
    messageEl.className = 'system-message';
    messageEl.innerHTML = `<p>${text}</p>`;
    messagesContainer.appendChild(messageEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ==================== UTILIDADES ====================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatFileSize(bytes) {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

function getFileIcon(mimeType) {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎬';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
    if (mimeType.includes('word')) return '📝';
    return '📎';
}

function downloadFile(content, filename) {
    const link = document.createElement('a');
    link.href = content;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function openImage(img) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        cursor: zoom-out;
    `;

    const fullImg = document.createElement('img');
    fullImg.src = img.src;
    fullImg.style.cssText = `
        max-width: 95%;
        max-height: 95%;
        object-fit: contain;
        border-radius: 8px;
    `;

    overlay.appendChild(fullImg);
    overlay.onclick = () => document.body.removeChild(overlay);
    document.body.appendChild(overlay);
}

// ==================== CIERRE Y DESTRUCCIÓN ====================
function closeChat() {
    if (confirm('¿Estás seguro de que querés cerrar el chat? Se perderá toda la conversación.')) {
        destroyChat('manual');
    }
}

function destroyChat(reason) {
    // Cerrar conexiones
    if (ChatState.dataChannel) {
        ChatState.dataChannel.close();
        ChatState.dataChannel = null;
    }

    if (ChatState.peerConnection) {
        ChatState.peerConnection.close();
        ChatState.peerConnection = null;
    }

    // Notificar al servidor
    if (ChatState.socket) {
        ChatState.socket.emit('leave-chat');
        ChatState.socket.disconnect();
        ChatState.socket = null;
    }

    // Limpiar temporizadores
    clearInactivityTimers();

    // Limpiar mensajes del DOM
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
        messagesContainer.innerHTML = '';
    }

    // Mensaje de cierre
    let closeMessage = '🔒 Chat cerrado';
    if (reason === 'inactivity') {
        closeMessage = '⏰ Chat cerrado por inactividad (30 min)';
    }

    // Ocultar ventana
    closeChatWindow();

    // Mostrar notificación
    showToast(closeMessage);

    // Resetear estado
    ChatState = {
        isActive: false,
        peerConnection: null,
        dataChannel: null,
        messages: [],
        lastActivity: Date.now(),
        inactivityTimer: null,
        warningTimer: null,
        isInitiator: false,
        peerId: null,
        peerName: 'Anónimo',
        myName: 'Usuario',
        socket: null,
        isConnected: false,
        reconnectAttempts: 0
    };

    // Limpiar URL
    window.history.replaceState({}, document.title, window.location.pathname);
}

function closeChatWindow() {
    const chatWindow = document.getElementById('chat-window');
    if (chatWindow) {
        chatWindow.classList.add('hidden');
    }
}

// ==================== HELPERS ====================
function extractChatIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('chat');
}

function generateChatId() {
    return Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
}

// ==================== VERIFICAR PARÁMETROS DE URL ====================
window.addEventListener('load', () => {
    const chatParam = extractChatIdFromURL();

    if (chatParam) {
        // Auto-iniciar chat si viene con parámetro
        window.currentChatId = chatParam;
        setTimeout(() => {
            startPrivateChat();
        }, 1000);
    }
});

// ==================== LIMPIEZA AL CERRAR PESTAÑA ====================
window.addEventListener('beforeunload', () => {
    if (ChatState.isActive) {
        clearInactivityTimers();
        if (ChatState.socket) {
            ChatState.socket.emit('leave-chat');
        }
    }
});