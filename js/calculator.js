/**
 * Calculadora Pro - Con función secreta
 * @author Calculadora Team
 * @version 2.0
 */

// ==================== ESTADO DE LA CALCULADORA ====================
const Calculator = {
    display: document.getElementById('display'),
    history: document.getElementById('history'),
    currentValue: '0',
    previousValue: '',
    operator: null,
    waitingForOperand: false,
    isScientificMode: false,

    // Código secreto
    secretCode: '21092025',
    secretInput: '',
    secretInputField: document.getElementById('secret-input'),

    // Temas disponibles
    themes: [
        'default', 'dark', 'neon', 'minimal', 'retro',
        'nature', 'ocean', 'sunset', 'galaxy', 'cyberpunk',
        'pastel', 'glass'
    ],
    currentTheme: 'default'
};

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', () => {
    initCalculator();
    initThemeSelector();
    initSecretCode();

    // Ocultar loader después de cargar
    setTimeout(() => {
        document.getElementById('loader').classList.add('hidden');
    }, 800);
});

function initCalculator() {
    // Event listeners para todos los botones
    document.querySelectorAll('.key').forEach(key => {
        key.addEventListener('click', handleKeyPress);
    });

    // Toggle modo científico
    document.getElementById('mode-toggle').addEventListener('click', toggleScientificMode);

    // Soporte de teclado
    document.addEventListener('keydown', handleKeyboard);
}

// ==================== MANEJO DE TECLAS ====================
function handleKeyPress(event) {
    const action = event.target.dataset.action;
    const value = event.target.dataset.value;

    // Vibración táctil en dispositivos móviles
    if (navigator.vibrate) {
        navigator.vibrate(10);
    }

    switch (action) {
        case 'number':
            inputNumber(value);
            break;
        case 'operator':
            inputOperator(value);
            break;
        case 'function':
            handleScientificFunction(value);
            break;
        case 'constant':
            inputConstant(value);
            break;
        case 'bracket':
            inputBracket(value);
            break;
        case 'equals':
            calculate();
            break;
        case 'clear':
            clear();
            break;
        case 'backspace':
            backspace();
            break;
        case 'percent':
            percentage();
            break;
        case 'decimal':
            inputDecimal();
            break;
        case 'negate':
            negate();
            break;
    }

    updateDisplay();
}

// ==================== OPERACIONES BÁSICAS ====================
function inputNumber(num) {
    if (Calculator.waitingForOperand) {
        Calculator.currentValue = num;
        Calculator.waitingForOperand = false;
    } else {
        Calculator.currentValue = Calculator.currentValue === '0'
            ? num
            : Calculator.currentValue + num;
    }
}

function inputOperator(op) {
    const inputValue = parseFloat(Calculator.currentValue);

    if (Calculator.previousValue === '') {
        Calculator.previousValue = inputValue;
    } else if (Calculator.operator) {
        const result = performCalculation(Calculator.previousValue, inputValue, Calculator.operator);
        Calculator.currentValue = String(result);
        Calculator.previousValue = result;
    }

    Calculator.waitingForOperand = true;
    Calculator.operator = op;

    // Mostrar en historial
    const opSymbol = { '+': '+', '-': '−', '*': '×', '/': '÷' }[op] || op;
    Calculator.history.textContent = `${formatNumber(Calculator.previousValue)} ${opSymbol}`;
}

function performCalculation(a, b, op) {
    switch (op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': return b !== 0 ? a / b : 'Error';
        default: return b;
    }
}

function calculate() {
    // ==================== CÓDIGO SECRETO ====================
    // Si el número actual es el código secreto y no hay operación pendiente
    if (Calculator.currentValue === Calculator.secretCode &&
        Calculator.previousValue === '' &&
        Calculator.operator === null) {
        triggerSecretAccess();
        clear();
        updateDisplay();
        return;
    }

    // Cálculo normal
    if (Calculator.operator && Calculator.previousValue !== '') {
        const inputValue = parseFloat(Calculator.currentValue);
        const result = performCalculation(Calculator.previousValue, inputValue, Calculator.operator);

        // Actualizar historial completo
        const opSymbol = { '+': '+', '-': '−', '*': '×', '/': '÷' }[Calculator.operator];
        Calculator.history.textContent = `${formatNumber(Calculator.previousValue)} ${opSymbol} ${formatNumber(inputValue)} =`;

        Calculator.currentValue = String(result);
        Calculator.previousValue = '';
        Calculator.operator = null;
        Calculator.waitingForOperand = true;
    }
}

function clear() {
    Calculator.currentValue = '0';
    Calculator.previousValue = '';
    Calculator.operator = null;
    Calculator.waitingForOperand = false;
    Calculator.history.textContent = '';
}

function backspace() {
    if (Calculator.currentValue.length > 1) {
        Calculator.currentValue = Calculator.currentValue.slice(0, -1);
    } else {
        Calculator.currentValue = '0';
    }
}

function percentage() {
    const value = parseFloat(Calculator.currentValue);
    Calculator.currentValue = String(value / 100);
}

function inputDecimal() {
    if (Calculator.waitingForOperand) {
        Calculator.currentValue = '0.';
        Calculator.waitingForOperand = false;
    } else if (!Calculator.currentValue.includes('.')) {
        Calculator.currentValue += '.';
    }
}

function negate() {
    Calculator.currentValue = String(parseFloat(Calculator.currentValue) * -1);
}

// ==================== FUNCIONES CIENTÍFICAS ====================
function handleScientificFunction(func) {
    const value = parseFloat(Calculator.currentValue);
    let result;

    switch (func) {
        case 'sin':
            result = Math.sin(value * Math.PI / 180);
            break;
        case 'cos':
            result = Math.cos(value * Math.PI / 180);
            break;
        case 'tan':
            result = Math.tan(value * Math.PI / 180);
            break;
        case 'log':
            result = Math.log10(value);
            break;
        case 'ln':
            result = Math.log(value);
            break;
        case 'sqrt':
            result = Math.sqrt(value);
            break;
        case 'pow':
            result = Math.pow(value, 2);
            break;
        case 'cube':
            result = Math.pow(value, 3);
            break;
        case 'inv':
            result = 1 / value;
            break;
        case 'fact':
            result = factorial(Math.floor(value));
            break;
        case 'abs':
            result = Math.abs(value);
            break;
        default:
            result = value;
    }

    Calculator.currentValue = String(isFinite(result) ? result : 'Error');
    Calculator.waitingForOperand = true;
}

function factorial(n) {
    if (n < 0) return NaN;
    if (n === 0 || n === 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}

function inputConstant(constant) {
    const constants = {
        'pi': Math.PI,
        'e': Math.E
    };
    Calculator.currentValue = String(constants[constant]);
    Calculator.waitingForOperand = true;
}

function inputBracket(bracket) {
    Calculator.currentValue += bracket;
}

// ==================== DISPLAY ====================
function updateDisplay() {
    Calculator.display.value = formatNumber(Calculator.currentValue);
}

function formatNumber(num) {
    const parsed = parseFloat(num);
    if (isNaN(parsed)) return num;

    // Limitar decimales para visualización
    if (Math.abs(parsed) >= 1e10 || (Math.abs(parsed) < 1e-6 && parsed !== 0)) {
        return parsed.toExponential(6);
    }

    const formatted = parsed.toString();
    if (formatted.length > 12) {
        return parsed.toPrecision(10);
    }

    return formatted;
}

// ==================== MODO CIENTÍFICO ====================
function toggleScientificMode() {
    Calculator.isScientificMode = !Calculator.isScientificMode;

    const basicKeypad = document.getElementById('basic-keypad');
    const sciKeypad = document.getElementById('scientific-keypad');
    const modeIndicator = document.getElementById('mode-indicator');
    const modeBtn = document.getElementById('mode-toggle');

    if (Calculator.isScientificMode) {
        basicKeypad.classList.add('hidden');
        sciKeypad.classList.remove('hidden');
        modeIndicator.textContent = 'CIENTÍFICA';
        modeBtn.textContent = 'BAS';
    } else {
        basicKeypad.classList.remove('hidden');
        sciKeypad.classList.add('hidden');
        modeIndicator.textContent = 'BÁSICA';
        modeBtn.textContent = 'SCI';
    }
}

// ==================== SOPORTE DE TECLADO ====================
function handleKeyboard(event) {
    const key = event.key;

    // Números
    if (/^[0-9]$/.test(key)) {
        inputNumber(key);
        updateDisplay();
        return;
    }

    // Operadores
    const operators = {
        '+': '+',
        '-': '-',
        '*': '*',
        '/': '/',
        'x': '*',
        'X': '*'
    };

    if (operators[key]) {
        inputOperator(operators[key]);
        updateDisplay();
        return;
    }

    // Enter o = para calcular
    if (key === 'Enter' || key === '=') {
        event.preventDefault();
        calculate();
        updateDisplay();
        return;
    }

    // Escape para limpiar
    if (key === 'Escape') {
        clear();
        updateDisplay();
        return;
    }

    // Backspace
    if (key === 'Backspace') {
        backspace();
        updateDisplay();
        return;
    }

    // Punto decimal
    if (key === '.' || key === ',') {
        inputDecimal();
        updateDisplay();
        return;
    }

    // Porcentaje
    if (key === '%') {
        percentage();
        updateDisplay();
    }
}

// ==================== SELECTOR DE TEMAS ====================
function initThemeSelector() {
    const themeBtns = document.querySelectorAll('.theme-btn');
    const calculator = document.getElementById('calculator');

    // Cargar tema guardado
    const savedTheme = localStorage.getItem('calculatorTheme') || 'default';
    setTheme(savedTheme);

    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;
            setTheme(theme);
            localStorage.setItem('calculatorTheme', theme);
        });
    });
}

function setTheme(theme) {
    const calculator = document.getElementById('calculator');
    const themeBtns = document.querySelectorAll('.theme-btn');

    // Remover todas las clases de tema
    Calculator.themes.forEach(t => {
        calculator.classList.remove(`theme-${t}`);
    });

    // Agregar nuevo tema
    calculator.classList.add(`theme-${theme}`);
    Calculator.currentTheme = theme;

    // Actualizar botón activo
    themeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });
}

// ==================== CÓDIGO SECRETO ====================
function initSecretCode() {
    // Capturar teclas numéricas para el código secreto
    document.addEventListener('keydown', (e) => {
        if (/^[0-9]$/.test(e.key)) {
            Calculator.secretInput += e.key;

            // Mantener solo los últimos 8 dígitos
            if (Calculator.secretInput.length > 8) {
                Calculator.secretInput = Calculator.secretInput.slice(-8);
            }

            // Verificar si coincide con el código secreto
            if (Calculator.secretInput === Calculator.secretCode) {
                triggerSecretAccess();
                Calculator.secretInput = '';
            }
        }
    });
}

function triggerSecretAccess() {
    // Efecto visual llamativo
    const calculator = document.getElementById('calculator');
    calculator.classList.add('secret-unlocking');

    // Crear flash overlay
    const flash = document.createElement('div');
    flash.className = 'secret-flash';
    document.body.appendChild(flash);

    // Crear partículas
    const particles = document.createElement('div');
    particles.className = 'secret-particles';
    document.body.appendChild(particles);

    // Vibración en móviles
    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100, 50, 200]);
    }

    // Mostrar modal después de la animación
    setTimeout(() => {
        calculator.classList.remove('secret-unlocking');
        flash.remove();
        particles.remove();
        showSecretModal();
    }, 1000);
}

function showSecretModal() {
    const modal = document.getElementById('secret-modal');
    modal.classList.remove('hidden');

    // Generar ID único para el chat
    const chatId = generateChatId();
    const chatUrl = `${window.location.origin}${window.location.pathname}?chat=${chatId}`;

    // Generar QR
    generateQR(chatUrl);

    // Mostrar URL en el input
    document.getElementById('chat-link').value = chatUrl;

    // Actualizar hipervínculo para PC
    const hyperlink = document.getElementById('chat-hyperlink');
    if (hyperlink) {
        hyperlink.href = chatUrl;
    }

    // Guardar ID del chat
    window.currentChatId = chatId;
}

function generateChatId() {
    return 'chat_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
}

function generateQR(url) {
    const canvas = document.getElementById('qr-code');
    QRCode.toCanvas(canvas, url, {
        width: 200,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#ffffff'
        }
    }, (error) => {
        if (error) console.error(error);
    });
}

// Copiar link al portapapeles
document.getElementById('copy-link')?.addEventListener('click', async () => {
    const link = document.getElementById('chat-link').value;
    try {
        await navigator.clipboard.writeText(link);
        showToast('¡Link copiado al portapapeles!');
    } catch (err) {
        showToast('No se pudo copiar el link');
    }
});

// Cerrar modal
document.getElementById('close-modal')?.addEventListener('click', () => {
    document.getElementById('secret-modal').classList.add('hidden');
});

// Iniciar chat
document.getElementById('start-chat')?.addEventListener('click', () => {
    document.getElementById('secret-modal').classList.add('hidden');
    startPrivateChat();
});

// ==================== UTILIDADES ====================
function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, duration);
}

// Agregar estilos de animación dinámicamente
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);