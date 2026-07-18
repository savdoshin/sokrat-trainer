// ==================== КОНФИГУРАЦИЯ ====================
const API_KEY = ''; // Вставьте ваш API-ключ DeepSeek здесь
const API_URL = 'https://api.deepseek.com/v1/chat/completions';
const MODEL = 'deepseek-chat';

// ==================== ЭЛЕМЕНТЫ DOM ====================
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const newChatBtn = document.getElementById('newChatBtn');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar = document.getElementById('sidebar');
const scrollBottomBtn = document.getElementById('scrollBottomBtn');
const modalOverlay = document.getElementById('modalOverlay');
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modalContent');
const modalClose = document.getElementById('modalClose');
const showIdealModel = document.getElementById('showIdealModel');
const showTerribleModel = document.getElementById('showTerribleModel');
const glossaryList = document.getElementById('glossaryList');

// ==================== СОСТОЯНИЕ ====================
let messages = [
    { role: 'system', content: SYSTEM_PROMPT }
];
let isLoading = false;

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
function init() {
    renderGlossary();
    setupEventListeners();
    autoResizeTextarea();
}

function renderGlossary() {
    glossaryList.innerHTML = Object.entries(GLOSSARY)
        .map(([term, definition]) => `
            <div class="glossary-item" title="${definition}">
                <span class="glossary-term">${term}</span>
                <span class="glossary-def">${definition}</span>
            </div>
        `).join('');
}

function setupEventListeners() {
    sendBtn.addEventListener('click', handleSend);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });
    chatInput.addEventListener('input', autoResizeTextarea);
    
    newChatBtn.addEventListener('click', startNewChat);
    sidebarToggle.addEventListener('click', toggleSidebar);
    scrollBottomBtn.addEventListener('click', scrollToBottom);
    
    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });
    
    showIdealModel.addEventListener('click', () => showModelModal('ideal'));
    showTerribleModel.addEventListener('click', () => showModelModal('terrible'));
    
    // Отслеживаем скролл для кнопки "в конец"
    chatMessages.addEventListener('scroll', handleScroll);
}

// ==================== ОТПРАВКА СООБЩЕНИЙ ====================
async function handleSend() {
    const userMessage = chatInput.value.trim();
    if (!userMessage || isLoading) return;
    
    // Очищаем поле ввода
    chatInput.value = '';
    autoResizeTextarea();
    
    // Убираем приветственное сообщение
    const welcomeMsg = chatMessages.querySelector('.welcome-message');
    if (welcomeMsg) welcomeMsg.remove();
    
    // Добавляем сообщение пользователя
    addMessage('user', userMessage);
    messages.push({ role: 'user', content: userMessage });
    
    // Показываем индикатор загрузки
    const loadingId = showLoading();
    
    try {
        const response = await callDeepSeekAPI();
        removeLoading(loadingId);
        addMessage('assistant', response);
        messages.push({ role: 'assistant', content: response });
    } catch (error) {
        removeLoading(loadingId);
        addMessage('system', `⚠️ Ошибка: ${error.message}. Проверьте API-ключ в файле script.js`);
    }
    
    scrollToBottom();
}

async function callDeepSeekAPI() {
    if (!API_KEY) {
        // Демо-режим без API-ключа
        return getDemoResponse(messages[messages.length - 1].content);
    }
    
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
            model: MODEL,
            messages: messages,
            temperature: 0.8,
            max_tokens: 500
        })
    });
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
}

// ==================== ДЕМО-РЕЖИМ (без API) ====================
function getDemoResponse(userMessage) {
    const lower = userMessage.toLowerCase();
    
    // Определяем, из какой модели говорит пользователь
    const terribleTriggers = ['попробую', 'сам знаю', 'стрёмно', 'страшно', 'не получится', 
        'нет денег', 'пирамида', 'обманут', 'устал', 'выгорел', 'депрессия', 'всё пропало',
        'не слушаются', 'вечный студент', 'не готов', 'позор', 'драконы'];
    const idealTriggers = ['цель', 'план', 'структура', 'команда', 'действие', 'результат',
        'бриллиант', 'клуб', 'дупликация', 'система', 'анализ', 'школа', 'наставник'];
    
    const isTerrible = terribleTriggers.some(t => lower.includes(t));
    const isIdeal = idealTriggers.some(t => lower.includes(t));
    const hasQuote = lower.includes('сказал') || lower.includes('говорит') || 
                     lower.includes('партнёр') || lower.includes('цитат');
    
    if (hasQuote) {
        return `Я слышу, ты принёс слова партнёра. Давай посмотрим на них внимательно.\n\nИз какой модели, как тебе кажется, звучат эти слова — идеальной или ужасной? Что в них настораживает лично тебя как лидера?`;
    }
    
    if (isTerrible) {
        const responses = [
            `Я слышу в твоих словах знакомые ноты... Как ты думаешь, из какой модели они звучат — идеальной или ужасной?`,
            `Интересно. А если бы ты перевёл эту же мысль на язык идеальной модели — как бы она зазвучала?`,
            `Что ты чувствуешь, когда произносишь эти слова? И как это чувство влияет на твои действия завтра?`,
            `Представь, что твой лучший партнёр говорит тебе эти слова. Что бы ты ему ответил сократовским вопросом?`
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }
    
    if (isIdeal) {
        return `Это звучит как язык идеальной модели. Что помогает тебе удерживаться в нём, когда обстоятельства давят? И есть ли в команде те, кого пока не удаётся туда перевести?`;
    }
    
    // Общий ответ
    const generalResponses = [
        `Давай разберём это подробнее. Когда ты описываешь эту ситуацию — какие слова ты выбираешь? Они ближе к «у меня есть план» или к «посмотрим, как получится»?`,
        `За этими словами — какая модель, как ты чувствуешь? Что стоит за ними: цель или страх?`,
        `Если посмотреть на эту ситуацию через год — что ты увидишь, если ничего не менять? А если сделать первый шаг завтра?`,
        `Что бы сказал твой наставник, услышав эти слова? В какой модели он бы тебя узнал?`
    ];
    return generalResponses[Math.floor(Math.random() * generalResponses.length)];
}

// ==================== UI ФУНКЦИИ ====================
function addMessage(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const avatar = role === 'user' ? '👤' : '🏛️';
    const senderName = role === 'user' ? 'Вы' : 'Сократ';
    
    messageDiv.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">
            <div class="message-sender">${senderName}</div>
            <div class="message-text">${formatMessage(content)}</div>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

function formatMessage(text) {
    // Жирный текст
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Переносы строк
    text = text.replace(/\n/g, '<br>');
    // Цитаты (строки, начинающиеся с >)
    text = text.replace(/^&gt;\s?(.*)$/gm, '<blockquote>$1</blockquote>');
    return text;
}

function showLoading() {
    const id = 'loading-' + Date.now();
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message assistant loading';
    loadingDiv.id = id;
    loadingDiv.innerHTML = `
        <div class="message-avatar">🏛️</div>
        <div class="message-content">
            <div class="message-sender">Сократ</div>
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
    chatMessages.appendChild(loadingDiv);
    scrollToBottom();
    return id;
}

function removeLoading(id) {
    const loadingDiv = document.getElementById(id);
    if (loadingDiv) loadingDiv.remove();
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function handleScroll() {
    const isNearBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 100;
    scrollBottomBtn.style.display = isNearBottom ? 'none' : 'flex';
}

function startNewChat() {
    messages = [{ role: 'system', content: SYSTEM_PROMPT }];
    chatMessages.innerHTML = `
        <div class="welcome-message">
            <div class="socrates-avatar">🏛️</div>
            <p>Приветствую тебя, лидер. Я — Сократ, и моё ремесло — задавать вопросы, которые меняют мышление.</p>
            <p>Какую ситуацию или вызов в бизнесе ты хочешь разобрать сегодня?</p>
        </div>
    `;
    chatInput.value = '';
    chatInput.focus();
}

function toggleSidebar() {
    sidebar.classList.toggle('open');
}

function autoResizeTextarea() {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px';
}

// ==================== МОДАЛЬНЫЕ ОКНА ====================
function showModelModal(type) {
    const models = {
        ideal: {
            title: '✨ Идеальная модель — язык роста',
            items: [
                'Миссия и цель: «Цель — Бриллиант к декабрю», «раскрой супервозможности»',
                'Стратегия: планирование, дорожная карта, система',
                'Действия: школа, база данных, 2+1, дупликация, еженедельный анализ',
                'Инструменты: MP, бинар, кешбек, БЗП, промо — всё используется',
                'Команда: единое видение, поддержка, «делай как я — делай лучше»',
                'Ответственность: «импульс и мотивация исходят от меня»',
                'Результат: рост структуры, клубы, Бриллиант, Чёрный бриллиант'
            ]
        },
        terrible: {
            title: '⚠️ Ужасная модель — язык ловушек',
            items: [
                'Нет цели: «попробую», «сам себе режиссёр», «как карта ляжет»',
                'Страхи: «стрёмно», «что подумают», «кругом драконы»',
                'Иллюзии: «я сам всё знаю», «мечта о большой команде» (без действий)',
                'Бездействие: вечный студент, ждёт звонка, не использует кешбек и промо',
                'Разрушение: раздор в команде, фальшивые отношения, наставник-начальник',
                'Финал: выгорание, депрессия, «всё пропало, шеф», возвращение в найм'
            ]
        }
    };
    
    const model = models[type];
    modalContent.innerHTML = `
        <h2>${model.title}</h2>
        <ul class="model-list">
            ${model.items.map(item => `<li>${item}</li>`).join('')}
        </ul>
    `;
    modalOverlay.classList.add('open');
}

function closeModal() {
    modalOverlay.classList.remove('open');
}

// ==================== ЗАПУСК ====================
document.addEventListener('DOMContentLoaded', init);