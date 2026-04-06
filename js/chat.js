// ==================== CONFIGURACIÓN ====================

// 🔥 SALA GLOBAL AUTOMÁTICA
const GLOBAL_CHAT_ID = "global-room";

// Detectar automáticamente la URL del servidor
const getServerUrl = () => {
    if (window.BACKEND_URL) return window.BACKEND_URL;

    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        return window.location.origin;
    }

    return 'http://localhost:3000';
};

const ChatConfig = {
    SERVER_URL: getServerUrl(),
    ICE_SERVERS: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// ==================== ESTADO ====================
let ChatState = {
    isActive: false,
    peerConnection: null,
    dataChannel: null,
    isInitiator: false,
    peerId: null,
    myName: 'Usuario',
    socket: null
};

// ==================== INICIO ====================
function startPrivateChat() {
    console.log("🚀 Iniciando chat...");

    const chatWindow = document.getElementById('chat-window');
    if (chatWindow) chatWindow.classList.remove('hidden');

    ChatState.isActive = true;
    ChatState.myName = 'User_' + Math.random().toString(36).substr(2, 4);

    connectToSignalingServer();
}

// ==================== SOCKET ====================
function connectToSignalingServer() {
    console.log("🔌 Iniciando conexión...");

    if (typeof io === 'undefined') {
        loadSocketIO();
        return;
    }
    initSocketConnection();
}

function loadSocketIO() {
    console.log("📦 Cargando Socket.io desde CDN...");

    const script = document.createElement('script');
    script.src = "https://cdn.socket.io/4.7.5/socket.io.min.js";

    script.onload = () => {
        console.log("✅ Socket.io cargado");
        initSocketConnection();
    };

    script.onerror = () => {
        console.error("❌ Error cargando Socket.io");
    };

    document.head.appendChild(script);
}

function initSocketConnection() {
    console.log("🌐 Conectando a:", ChatConfig.SERVER_URL);

    ChatState.socket = io(ChatConfig.SERVER_URL, {
        transports: ['websocket'], // 🔥 importante para Render
        secure: true,
        reconnection: true,
        reconnectionAttempts: 5,
        timeout: 10000
    });

    // ==================== EVENTOS ====================

    ChatState.socket.on('connect', () => {
        console.log("✅ Conectado al servidor");

        ChatState.socket.emit('join-chat', {
            chatId: GLOBAL_CHAT_ID,
            displayName: ChatState.myName
        });
    });

    ChatState.socket.on('connect_error', (err) => {
        console.error("❌ connect_error:", err.message);
    });

    ChatState.socket.on('disconnect', (reason) => {
        console.warn("⚠️ Desconectado:", reason);
    });

    ChatState.socket.on('joined', (data) => {
        console.log("📥 joined:", data);

        ChatState.isInitiator = data.isInitiator;

        if (!ChatState.peerConnection) {
            createPeerConnection();
        }

        if (!data.isInitiator) {
            createOffer();
        }
    });

    ChatState.socket.on('peer-joined', (peer) => {
        console.log("👤 peer joined:", peer);

        ChatState.peerId = peer.id;

        if (ChatState.isInitiator) {
            createOffer();
        }
    });

    ChatState.socket.on('webrtc-offer', async (data) => {
        console.log("📥 offer recibida");

        ChatState.peerId = data.senderId;

        if (!ChatState.peerConnection) {
            createPeerConnection();
        }

        await ChatState.peerConnection.setRemoteDescription(data.offer);

        const answer = await ChatState.peerConnection.createAnswer();
        await ChatState.peerConnection.setLocalDescription(answer);

        ChatState.socket.emit('webrtc-answer', {
            answer,
            targetId: data.senderId
        });
    });

    ChatState.socket.on('webrtc-answer', async (data) => {
        console.log("📥 answer recibida");

        await ChatState.peerConnection.setRemoteDescription(data.answer);
    });

    ChatState.socket.on('webrtc-ice-candidate', async (data) => {
        try {
            await ChatState.peerConnection.addIceCandidate(data.candidate);
        } catch (err) {
            console.error("❌ ICE error:", err);
        }
    });
}

// ==================== WEBRTC ====================
function createPeerConnection() {
    if (ChatState.peerConnection) return;

    console.log("🔗 Creando PeerConnection");

    ChatState.peerConnection = new RTCPeerConnection({
        iceServers: ChatConfig.ICE_SERVERS
    });

    if (ChatState.isInitiator) {
        console.log("📡 Creando DataChannel");

        ChatState.dataChannel = ChatState.peerConnection.createDataChannel("chat");
        setupChannel(ChatState.dataChannel);
    }

    ChatState.peerConnection.ondatachannel = (event) => {
        console.log("📡 Canal recibido");

        ChatState.dataChannel = event.channel;
        setupChannel(ChatState.dataChannel);
    };

    ChatState.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            ChatState.socket.emit('webrtc-ice-candidate', {
                candidate: event.candidate,
                targetId: ChatState.peerId
            });
        }
    };

    ChatState.peerConnection.onconnectionstatechange = () => {
        console.log("🔗 Estado conexión:", ChatState.peerConnection.connectionState);
    };
}

async function createOffer() {
    console.log("📤 Creando oferta");

    const offer = await ChatState.peerConnection.createOffer();
    await ChatState.peerConnection.setLocalDescription(offer);

    ChatState.socket.emit('webrtc-offer', {
        offer,
        targetId: ChatState.peerId
    });
}

function setupChannel(channel) {
    channel.onopen = () => {
        console.log("✅ Canal abierto");
    };

    channel.onmessage = (e) => {
        console.log("💬 Mensaje recibido:", e.data);
    };

    channel.onerror = (err) => {
        console.error("❌ Error en canal:", err);
    };

    channel.onclose = () => {
        console.warn("⚠️ Canal cerrado");
    };
}

// ==================== AUTO START ====================
window.addEventListener('load', () => {
    startPrivateChat();
});
