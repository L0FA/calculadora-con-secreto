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
    INACTIVITY_TIMEOUT: 30 * 60 * 1000,
    WARNING_TIMEOUT: 5 * 60 * 1000,
    ICE_SERVERS: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ],
    RECONNECT_ATTEMPTS: 3
};

// ==================== ESTADO ====================
let ChatState = {
    isActive: false,
    peerConnection: null,
    dataChannel: null,
    lastActivity: Date.now(),
    isInitiator: false,
    peerId: null,
    myName: 'Usuario',
    socket: null
};

// ==================== INICIO ====================
function startPrivateChat() {
    document.getElementById('chat-window').classList.remove('hidden');

    ChatState.isActive = true;
    ChatState.myName = 'User_' + Math.random().toString(36).substr(2, 4);

    connectToSignalingServer();
}

// ==================== SOCKET ====================
function connectToSignalingServer() {
    if (typeof io === 'undefined') {
        loadSocketIO();
        return;
    }
    initSocketConnection();
}

function loadSocketIO() {
    const script = document.createElement('script');
    script.src = `${ChatConfig.SERVER_URL}/socket.io/socket.io.js`;
    script.onload = initSocketConnection;
    document.head.appendChild(script);
}

function initSocketConnection() {
    ChatState.socket = io(ChatConfig.SERVER_URL);

    ChatState.socket.on('connect', () => {
        console.log("Conectado");

        // 🔥 SIEMPRE MISMA SALA
        ChatState.socket.emit('join-chat', {
            chatId: GLOBAL_CHAT_ID,
            displayName: ChatState.myName
        });
    });

    ChatState.socket.on('joined', (data) => {
        ChatState.isInitiator = data.isInitiator;

        if (!ChatState.peerConnection) {
            createPeerConnection();
        }

        if (!data.isInitiator) {
            createOffer();
        }
    });

    ChatState.socket.on('peer-joined', (peer) => {
        ChatState.peerId = peer.id;

        if (ChatState.isInitiator) {
            createOffer();
        }
    });

    ChatState.socket.on('webrtc-offer', async (data) => {
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
        await ChatState.peerConnection.setRemoteDescription(data.answer);
    });

    ChatState.socket.on('webrtc-ice-candidate', async (data) => {
        if (ChatState.peerConnection) {
            await ChatState.peerConnection.addIceCandidate(data.candidate);
        }
    });
}

// ==================== WEBRTC ====================
function createPeerConnection() {
    if (ChatState.peerConnection) return;

    ChatState.peerConnection = new RTCPeerConnection({
        iceServers: ChatConfig.ICE_SERVERS
    });

    // 🔥 Canal solo si soy initiator
    if (ChatState.isInitiator) {
        ChatState.dataChannel = ChatState.peerConnection.createDataChannel("chat");
        setupChannel(ChatState.dataChannel);
    }

    ChatState.peerConnection.ondatachannel = (event) => {
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
}

async function createOffer() {
    const offer = await ChatState.peerConnection.createOffer();
    await ChatState.peerConnection.setLocalDescription(offer);

    ChatState.socket.emit('webrtc-offer', {
        offer,
        targetId: ChatState.peerId
    });
}

function setupChannel(channel) {
    channel.onopen = () => console.log("Canal abierto");

    channel.onmessage = (e) => {
        console.log("Mensaje:", e.data);
    };
}

// ==================== AUTO START ====================
window.addEventListener('load', () => {
    startPrivateChat();
});
