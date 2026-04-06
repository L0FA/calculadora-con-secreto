/**
 * Calculadora Pro - Con función secreta (FIXED)
 */

// ==================== ESTADO ====================
const Calculator = {
    display: document.getElementById('display'),
    history: document.getElementById('history'),
    currentValue: '0',
    previousValue: '',
    operator: null,
    waitingForOperand: false,

    secretCode: '21092025',
    secretInput: '',

    themes: [
        'default', 'dark', 'neon', 'minimal', 'retro',
        'nature', 'ocean', 'sunset', 'galaxy', 'cyberpunk',
        'pastel', 'glass'
    ]
};

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    initCalculator();
    initSecretCode();
});

// ==================== INPUT ====================
function handleKeyPress(event) {
    const action = event.target.dataset.action;
    const value = event.target.dataset.value;

    switch (action) {
        case 'number': inputNumber(value); break;
        case 'operator': inputOperator(value); break;
        case 'equals': calculate(); break;
        case 'clear': clear(); break;
        case 'decimal': inputDecimal(); break;
    }

    updateDisplay();
}

function initCalculator() {
    document.querySelectorAll('.key').forEach(key => {
        key.addEventListener('click', handleKeyPress);
    });
}

// ==================== LOGICA ====================
function inputNumber(num) {
    if (Calculator.waitingForOperand) {
        Calculator.currentValue = num;
        Calculator.waitingForOperand = false;
    } else {
        Calculator.currentValue =
            Calculator.currentValue === '0' ? num : Calculator.currentValue + num;
    }
}

function inputOperator(op) {
    Calculator.previousValue = parseFloat(Calculator.currentValue);
    Calculator.operator = op;
    Calculator.waitingForOperand = true;
}

function calculate() {

    // 🔥 SECRETO
    if (
        Calculator.currentValue === Calculator.secretCode &&
        !Calculator.operator
    ) {
        triggerSecretAccess();
        clear();
        updateDisplay();
        return;
    }

    if (!Calculator.operator) return;

    const a = Calculator.previousValue;
    const b = parseFloat(Calculator.currentValue);

    let result;
    switch (Calculator.operator) {
        case '+': result = a + b; break;
        case '-': result = a - b; break;
        case '*': result = a * b; break;
        case '/': result = b !== 0 ? a / b : 'Error'; break;
    }

    Calculator.currentValue = String(result);
    Calculator.operator = null;
}

function clear() {
    Calculator.currentValue = '0';
    Calculator.previousValue = '';
    Calculator.operator = null;
}

function inputDecimal() {
    if (!Calculator.currentValue.includes('.')) {
        Calculator.currentValue += '.';
    }
}

function updateDisplay() {
    if (Calculator.display) {
        Calculator.display.value = Calculator.currentValue;
    }
}

// ==================== CODIGO SECRETO ====================
function initSecretCode() {
    document.addEventListener('keydown', (e) => {
        if (/^[0-9]$/.test(e.key)) {
            Calculator.secretInput += e.key;

            if (Calculator.secretInput.length > 8) {
                Calculator.secretInput = Calculator.secretInput.slice(-8);
            }

            if (Calculator.secretInput === Calculator.secretCode) {
                triggerSecretAccess();
                Calculator.secretInput = '';
            }
        }
    });
}

function triggerSecretAccess() {
    console.log("🔓 MODO SECRETO ACTIVADO");

    // 👉 podés elegir:
    // showSecretModal();
    startPrivateChat(); // 🔥 directo sin QR (mejor UX)
}

// ==================== MODAL ====================
function showSecretModal() {
    const modal = document.getElementById('secret-modal');
    if (!modal) return;

    modal.classList.remove('hidden');

    const chatId = generateChatId();
    const chatUrl = `${window.location.origin}?chat=${chatId}`;

    const input = document.getElementById('chat-link');
    if (input) input.value = chatUrl;

    const link = document.getElementById('chat-hyperlink');
    if (link) link.href = chatUrl;

    // 🔥 FIX QR (no rompe si no existe)
    if (typeof QRCode !== "undefined") {
        const canvas = document.getElementById('qr-code');
        if (canvas) {
            QRCode.toCanvas(canvas, chatUrl);
        }
    } else {
        console.warn("QR no cargado (todo OK)");
    }

    window.currentChatId = chatId;
}

function generateChatId() {
    return 'chat_' + Date.now().toString(36);
}

// ==================== BOTONES ====================
document.getElementById('start-chat')?.addEventListener('click', () => {
    document.getElementById('secret-modal')?.classList.add('hidden');
    startPrivateChat();
});

document.getElementById('close-modal')?.addEventListener('click', () => {
    document.getElementById('secret-modal')?.classList.add('hidden');
});

// ==================== TOAST ====================
function showToast(msg) {
    console.log(msg);
}
