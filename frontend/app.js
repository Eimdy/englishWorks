
function toggleSumoPodModel() {
    const engineSelect = document.getElementById('engine-select');
    const modelContainer = document.getElementById('sumopod-model-container');
    if (engineSelect && modelContainer) {
        if (engineSelect.value === 'sumopod') {
            modelContainer.classList.remove('hidden');
        } else {
            modelContainer.classList.add('hidden');
        }
    }
}

let isSettingsEditing = false;
function toggleSettingsEdit() {
    isSettingsEditing = !isSettingsEditing;
    const btn = document.getElementById('btn-edit-settings');
    const inputs = [
        document.getElementById('topic-input'),
        document.getElementById('engine-select'),
        document.getElementById('sumopod-model')
    ];

    if (isSettingsEditing) {
        btn.innerText = 'Save';
        btn.className = 'text-xs font-medium text-green-600 bg-green-100 hover:bg-green-200 px-3 py-1 rounded-md transition-colors';
        inputs.forEach(el => {
            if (el) {
                el.disabled = false;
                el.classList.remove('bg-slate-100', 'border-slate-200');
                el.classList.add('bg-white', 'border-blue-300');
            }
        });
    } else {
        btn.innerText = 'Edit';
        btn.className = 'text-xs font-medium text-blue-600 bg-blue-100 hover:bg-blue-200 px-3 py-1 rounded-md transition-colors';
        inputs.forEach(el => {
            if (el) {
                el.disabled = true;
                el.classList.remove('bg-white', 'border-blue-300');
                el.classList.add('bg-slate-100', 'border-slate-200');
            }
        });
    }
}

function setUILock(lock) {
    isRequesting = lock;
    const btnTrans = document.getElementById('btn-mode-translation');
    const btnRole = document.getElementById('btn-mode-roleplay');
    if (btnTrans) btnTrans.disabled = lock;
    if (btnRole) btnRole.disabled = lock;

    if (lock) {
        if (btnTrans) btnTrans.classList.add('opacity-50', 'cursor-not-allowed');
        if (btnRole) btnRole.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        if (btnTrans) btnTrans.classList.remove('opacity-50', 'cursor-not-allowed');
        if (btnRole) btnRole.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

function parseGrammar(data) {
    try {
        let parsed = typeof data === 'string' ? JSON.parse(data) : data;
        if (Array.isArray(parsed)) {
            let html = '';
            parsed.forEach(g => {
                html += `<div class="bg-sky-50/50 p-2 rounded border-l-2 border-blue-400">
                    <span class="text-xs font-bold text-blue-600">${g.type}</span>
                    <p class="text-red-500 line-through text-xs mt-1">${g.original_snippet}</p>
                    <p class="text-green-600 font-medium text-xs mt-1">${g.correction}</p>
                    <p class="text-slate-600 text-xs italic mt-1">${g.explanation}</p>
                </div>`;
            });
            return html;
        }
    } catch (e) { }
    return `<p class="text-slate-600 bg-sky-50/50 p-2 rounded">${data}</p>`;
}

function parseVocab(data) {
    try {
        let parsed = typeof data === 'string' ? JSON.parse(data) : data;
        if (Array.isArray(parsed)) {
            let html = '';
            parsed.forEach(v => {
                html += `<div class="bg-sky-50/50 p-2 rounded border-l-2 border-green-400">
                    <p class="text-red-500 line-through text-xs">${v.original_word}</p>
                    <p class="text-green-600 font-medium text-xs mt-1">${v.suggested_word}</p>
                    <p class="text-slate-600 text-xs italic mt-1">${v.context_reason}</p>
                </div>`;
            });
            return html;
        }
    } catch (e) { }
    return `<p class="text-slate-600 bg-sky-50/50 p-2 rounded">${data}</p>`;
}
// DOM Elements
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const profileUsername = document.getElementById('profile-username');
const chatContainer = document.getElementById('chat-container');
const translationInput = document.getElementById('translation-input');
const btnSubmit = document.getElementById('btn-submit');
const currentLevelBadge = document.getElementById('current-level-badge');
const streakText = document.getElementById('streak-text');
const streakBar = document.getElementById('streak-bar');

let currentParagraph = '';
let activeUsername = null;
let totalTokens = 0;
let historyPage = 1;
let hasMoreHistory = true;

// Roleplay State
let currentMode = 'translation'; // 'translation' | 'roleplay'
let roleplayHistory = [];
let isRoleplaying = false;
let isRequesting = false; // Lock flag for buttons

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});

function checkAuth() {
    const savedUser = localStorage.getItem('tg_username');
    if (savedUser) {
        activeUsername = savedUser;
        profileUsername.innerText = savedUser;
        closeLoginModal();
        fetchUserState();

        // Memastikan history di-load saat pengguna me-refresh halaman (sudah login)
        historyPage = 1;
        hasMoreHistory = true;
        loadHistory();
    } else {
        openLoginModal();
    }
}

// Sidebar Toggle
function toggleSidebar() {
    const isClosed = sidebar.classList.contains('-translate-x-full');
    if (isClosed) {
        sidebar.classList.remove('-translate-x-full');
        sidebarOverlay.classList.remove('hidden');
        setTimeout(() => sidebarOverlay.classList.remove('opacity-0'), 10);
    } else {
        sidebar.classList.add('-translate-x-full');
        sidebarOverlay.classList.add('opacity-0');
        setTimeout(() => sidebarOverlay.classList.add('hidden'), 300);
    }
}

// Auth Handlers
function openLoginModal() {
    loginModal.classList.remove('opacity-0', 'pointer-events-none');
}

function closeLoginModal() {
    loginModal.classList.add('opacity-0', 'pointer-events-none');
}

async function handleLogin(e) {
    e.preventDefault();
    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value.trim();

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u, password: p })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            localStorage.setItem('tg_username', data.username);
            activeUsername = data.username;
            profileUsername.innerText = data.username;
            loginError.classList.add('hidden');
            closeLoginModal();
            fetchUserState();

            // Initial history fetch
            historyPage = 1;
            hasMoreHistory = true;
            document.getElementById('chat-container').innerHTML = `
                <div id="history-loader-container" class="w-full flex justify-center hidden my-4">
                    <button onclick="loadHistory()" id="btn-load-history" class="text-xs text-blue-600 bg-blue-100 hover:bg-blue-400/20 px-4 py-2 rounded-full border border-blue-300 transition-colors flex items-center gap-2">
                        <i class="ri-history-line"></i> Load Previous History
                    </button>
                </div>
            `;
            appendWelcomeMessage();
            loadHistory();
            setMode('translation');
        } else {
            loginError.innerText = data.error || "Login gagal";
            loginError.classList.remove('hidden');
        }
    } catch (err) {
        loginError.innerText = "Tidak dapat terhubung ke server";
        loginError.classList.remove('hidden');
    }
}

function appendWelcomeMessage() {
    const existing = document.getElementById('welcome-message');
    if (existing) existing.remove();
    
    const div = document.createElement('div');
    div.className = "flex gap-4 max-w-3xl mb-6";
    div.id = 'welcome-message';
    div.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
            <i class="ri-robot-2-line text-white"></i>
        </div>
        <div class="glass-panel p-5 rounded-2xl rounded-tl-sm shadow-sm border border-sky-200/50 max-w-full lg:max-w-[85%]">
            <p class="text-slate-700 leading-relaxed text-sm md:text-base welcome-text-dynamic">
                Selamat datang di <strong>TranslateGate AI</strong>. Saya adalah Gatekeeper. Klik tombol di bawah untuk meminta soal paragraf.
            </p>
            <div class="text-[10px] text-slate-400 mt-2 text-right">${new Date().toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
            <div class="flex gap-2">
                <button onclick="startSession()" class="btn-request-dynamic mt-4 px-5 py-2.5 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-sm font-medium transition-all-custom shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] active:scale-95 flex items-center gap-2">
                    <i class="ri-file-text-line"></i> <span>${currentMode === 'translation' ? 'Generate Test' : 'Start Roleplay'}</span>
                </button>
            </div>
        </div>
    `;
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function logout() {
    localStorage.removeItem('tg_username');
    activeUsername = null;
    currentParagraph = '';
    chatContainer.innerHTML = ''; // Clear chat
    openLoginModal();
}

function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'X-Username': activeUsername || ''
    };
}

// UI State
function setMode(mode) {
    if (isRoleplaying) {
        if (!confirm("Anda sedang dalam sesi Roleplay. Yakin ingin mengganti mode dan mengakhiri sesi?")) return;
    }

    currentMode = mode;
    isRoleplaying = false;
    roleplayHistory = [];
    currentParagraph = '';

    const btnTrans = document.getElementById('btn-mode-translation');
    const btnRole = document.getElementById('btn-mode-roleplay');
    const topicLabel = document.getElementById('topic-label');
    const topicInput = document.getElementById('topic-input');
    const welcomeText = document.getElementById('welcome-text');
    const btnRequestText = document.getElementById('btn-request-text');

    if (mode === 'translation') {
        if (btnTrans) {
            btnTrans.className = "flex-1 py-1.5 text-xs font-medium rounded-md bg-blue-500 text-white shadow-sm transition-all";
            btnRole.className = "flex-1 py-1.5 text-xs font-medium rounded-md text-slate-500 hover:text-slate-800 hover:bg-sky-50 transition-all";
        }
        if (topicLabel) topicLabel.innerText = "Topik Soal (Opsional)";
        if (topicInput) topicInput.placeholder = "Contoh: IT, Liburan...";
        if (welcomeText) welcomeText.innerHTML = "Selamat datang di <strong>TranslateGate AI</strong>. Saya adalah Gatekeeper. Klik tombol di bawah untuk meminta soal paragraf.";
        if (btnRequestText) btnRequestText.innerText = "Generate Test";
    } else {
        if (btnTrans) {
            btnTrans.className = "flex-1 py-1.5 text-xs font-medium rounded-md text-slate-500 hover:text-slate-800 hover:bg-sky-50 transition-all";
            btnRole.className = "flex-1 py-1.5 text-xs font-medium rounded-md bg-blue-500 text-white shadow-sm transition-all";
        }
        if (topicLabel) topicLabel.innerText = "Skenario Roleplay";
        if (topicInput) topicInput.placeholder = "Contoh: Daily Standup, Code Review...";
        if (welcomeText) welcomeText.innerHTML = "Masuk ke <strong>Roleplay Mode</strong>. Tentukan Skenario Roleplay di menu sebelah kiri (misal: Bertindak sebagai Klien komplain), lalu klik Start.";
        if (btnRequestText) btnRequestText.innerText = "Start Roleplay";
    }

    // Clear chat below welcome message
    const msgs = chatContainer.children;
    for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].id !== 'welcome-message' && msgs[i].id !== 'history-loader-container') {
            msgs[i].remove();
        }
    }

    historyPage = 1;
    hasMoreHistory = true;
    loadHistory();
    checkInputState();
}

function checkInputState() {
    const endBtn = document.getElementById('btn-end-roleplay');
    if (currentMode === 'translation') {
        if (endBtn) endBtn.remove();
        if (currentParagraph) {
            translationInput.disabled = false;
            translationInput.placeholder = "Ketik terjemahan Anda di sini...";
        } else {
            translationInput.disabled = true;
            translationInput.placeholder = "Klik 'Generate Test' untuk mendapatkan soal.";
        }
    } else {
        if (isRoleplaying) {
            translationInput.disabled = false;
            translationInput.placeholder = "Ketik balasan Anda...";
            if (!endBtn) {
                const btn = document.createElement('button');
                btn.id = 'btn-end-roleplay';
                btn.className = 'absolute bottom-4 right-16 w-10 h-10 bg-red-500 hover:bg-red-400 text-white rounded-lg flex items-center justify-center transition-all-custom shadow-md';
                btn.innerHTML = '<i class="ri-stop-circle-line"></i>';
                btn.title = 'Akhiri & Evaluasi Roleplay';
                btn.onclick = evaluateRoleplaySession;
                translationInput.parentElement.appendChild(btn);
            }
        } else {
            if (endBtn) endBtn.remove();
            translationInput.disabled = true;
            translationInput.placeholder = "Klik 'Start Roleplay' untuk memulai.";
        }
    }
}

translationInput.addEventListener('input', () => {
    btnSubmit.disabled = translationInput.value.trim().length === 0;
});

function updateUserUI(level, streak) {
    currentLevelBadge.innerText = level;
    streakText.innerText = `${streak} / 3`;
    streakBar.style.width = `${(streak / 3) * 100}%`;
}

function updateTokenUI() {
    const el = document.getElementById('token-counter');
    if (el) el.innerHTML = `<i class="ri-coin-line mr-1"></i>${totalTokens.toLocaleString()}`;
}

// API Calls
let currentHistoryFetchId = 0;

async function loadHistory() {
    if (!hasMoreHistory || !activeUsername) return;

    const loaderBtn = document.getElementById('btn-load-history');
    if (loaderBtn) loaderBtn.innerHTML = '<i class="ri-loader-4-line animate-spin"></i> Loading...';

    const fetchId = ++currentHistoryFetchId;

    try {
        const res = await fetch(`/api/history?page=${historyPage}&limit=5&type=${currentMode}`, {
            headers: getAuthHeaders()
        });
        const data = await res.json();

        if (fetchId !== currentHistoryFetchId) return; // Drop stale request if user changed mode rapidly

        if (res.ok) {
            const container = document.getElementById('chat-container');
            const loaderDiv = document.getElementById('history-loader-container');

            // API returns DESC (newest first). We want to insert them at the top of the chat,
            // but preserving chronological order within the chunk.
            // So we iterate forward through the DESC list, prepending each right after the loader.
            data.history.forEach(item => {
                const wrapper = document.createElement('div');
                wrapper.className = "mb-8 space-y-4 pt-4 border-t border-sky-200/30 opacity-70 hover:opacity-100 transition-opacity";

                // System Prompt (Original Text)
                wrapper.innerHTML += `
                    <div class="flex gap-4 max-w-3xl">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                            <i class="ri-file-list-3-line text-white"></i>
                        </div>
                        <div class="glass-panel p-5 rounded-2xl rounded-tl-sm shadow-sm border border-sky-200/50">
                            <p class="text-xs text-blue-400 mb-2 font-medium">History Log</p>
                            <p class="text-slate-700 text-sm">${item.original_text.replace(/\n/g, '<br>')}</p>
                            <div class="text-[10px] text-slate-500 mt-2 text-right">${new Date(item.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                    </div>
                `;

                // User Submission
                wrapper.innerHTML += `
                    <div class="flex gap-4 max-w-3xl ml-auto flex-row-reverse">
                        <div class="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0 shadow-lg">
                            <i class="ri-user-line text-white"></i>
                        </div>
                        <div class="glass-panel p-5 rounded-2xl rounded-tr-sm bg-sky-50/80 shadow-sm border border-sky-200/50">
                            <p class="text-slate-700 text-sm">${item.submitted_text.replace(/\n/g, '<br>')}</p>
                            <div class="text-[10px] text-slate-500 mt-2 text-right">${new Date(item.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                    </div>
                `;

                // AI Review
                let badgeClass = 'bg-red-500/20 text-red-400 border-red-500/50';
                if (item.status.includes('CLEAN PASS')) badgeClass = 'bg-green-500/20 text-green-400 border-green-500/50';
                else if (item.status.includes('RETRY PASS')) badgeClass = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';

                wrapper.innerHTML += `
                    <div class="flex gap-4 max-w-4xl ml-auto mr-auto w-full">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                            <i class="ri-robot-2-line text-white"></i>
                        </div>
                        <div class="glass-panel p-6 rounded-2xl rounded-tl-sm shadow-sm border border-sky-200/50 w-full">
                            <div class="flex justify-between mb-4 border-b border-sky-200/50 pb-3">
                                <h3 class="font-semibold text-slate-700">Evaluation Report</h3>
                                <div class="flex items-center gap-3">
                                    <span class="report-time text-[10px] text-slate-400">${new Date(item.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                    <span class="px-3 py-1 rounded-full text-xs font-bold uppercase border ${badgeClass}">${item.status}</span>
                                </div>
                            </div>
                            <div class="space-y-4 text-sm">
                                <div>
                                    <p class="text-slate-700 font-medium italic mb-2">${item.overall_feedback || ''}</p>
                                    <h4 class="text-xs text-slate-500 uppercase tracking-wider mb-2"><i class="ri-text-spacing text-blue-600"></i> Grammar</h4>
                                    <div class="space-y-2">${parseGrammar(item.grammar_analysis)}</div>
                                </div>
                                <div>
                                    <h4 class="text-xs text-slate-500 uppercase tracking-wider mb-2"><i class="ri-translate-2 text-green-400"></i> Vocabulary</h4>
                                    <div class="space-y-2">${parseVocab(item.vocabulary_correction)}</div>
                                </div>
                                <div>
                                    <h4 class="text-xs text-slate-500 uppercase tracking-wider mb-1"><i class="ri-sparkling-line text-purple-400"></i> Native Refactoring</h4>
                                    <p class="text-slate-700 bg-sky-50/50 p-2 rounded border-l-2 border-purple-500 mb-4">${item.native_refactoring}</p>
                                    
                                    <h4 class="text-xs text-slate-500 uppercase tracking-wider mb-1"><i class="ri-lightbulb-flash-line text-yellow-500"></i> Key Takeaway</h4>
                                    <p class="text-slate-700 bg-yellow-50/50 p-2 rounded border-l-2 border-yellow-400 mb-4">${item.key_takeaway || ''}</p>
                                    ${item.tone_suggestion ? `
                                    <h4 class="text-xs text-slate-500 uppercase tracking-wider mb-1"><i class="ri-chat-smile-3-line text-pink-500"></i> Tone Suggestion</h4>
                                    <p class="text-slate-700 bg-pink-50/50 p-2 rounded border-l-2 border-pink-400 mb-4">${item.tone_suggestion}</p>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                // Insert right after the loader so the newest in this old chunk stays at the bottom of the chunk
                loaderDiv.insertAdjacentElement('afterend', wrapper);
            });

            hasMoreHistory = data.hasMore;

            if (historyPage === 1) {
                setTimeout(() => { container.scrollTop = container.scrollHeight; }, 100);
            }

            if (hasMoreHistory) {
                historyPage++;
                loaderDiv.classList.remove('hidden');
                if (loaderBtn) loaderBtn.innerHTML = '<i class="ri-history-line"></i> Load Previous History';
            } else {
                loaderDiv.classList.add('hidden');
            }
        }
    } catch (e) {
        console.error('Failed to load history', e);
        if (loaderBtn) loaderBtn.innerHTML = 'Error loading history. Try again.';
    }
}

async function fetchUserState() {
    if (!activeUsername) return;
    try {
        const res = await fetch('/api/user', { headers: getAuthHeaders() });
        if (res.ok) {
            const data = await res.json();
            updateUserUI(data.current_level, data.streak);
            if (data.tokens_used !== undefined) {
                totalTokens = data.tokens_used;
                updateTokenUI();
            }
            checkInputState();
        } else {
            if (res.status === 401 || res.status === 404) logout();
        }
    } catch (e) {
        console.error('Failed to load user state');
    }
}

function addMessageToChat(role, text) {
    const div = document.createElement('div');
    div.className = `flex gap-4 max-w-3xl ${role === 'user' ? 'ml-auto flex-row-reverse' : ''} mb-6`;

    const icon = role === 'user' ? 'ri-user-line' : 'ri-file-list-3-line';
    const bgClass = role === 'user' ? 'bg-sky-100' : 'bg-gradient-to-br from-blue-500 to-cyan-600';
    const timeString = new Date().toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

    let glossaryHtml = '';
    let processedText = text.replace(/\*\*(.*?)\*\*(?:\s*)\{([^|]+?)\s*\|\s*([^}]+?)\}/g, (match, word, en, id) => {
        glossaryHtml += `<div class="flex items-start gap-2 mt-2 pt-2 border-t border-sky-200/50 first:mt-0 first:pt-0 first:border-0">
            <span class="font-bold text-blue-600 text-xs shrink-0">${word}</span>
            <span class="text-slate-600 text-xs leading-relaxed">${en} <span class="text-slate-400 italic">(${id})</span></span>
        </div>`;
        return `<strong class="text-blue-600">${word}</strong>`;
    });

    processedText = processedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    processedText = processedText.replace(/\n/g, '<br>');

    const glossaryBlock = glossaryHtml ? `<div class="mt-4 bg-sky-50/60 rounded-xl p-3 border border-sky-100 shadow-sm"><div class="text-[10px] uppercase font-bold text-slate-400 mb-2 flex items-center gap-1"><i class="ri-book-read-line"></i> Idiom Glossary</div>${glossaryHtml}</div>` : '';

    div.innerHTML = `
        <div class="w-10 h-10 rounded-full ${bgClass} flex items-center justify-center flex-shrink-0 shadow-lg">
            <i class="${icon} text-white"></i>
        </div>
        <div class="glass-panel p-5 rounded-2xl shadow-sm border border-sky-200/50 max-w-full lg:max-w-[85%] ${role === 'user' ? 'rounded-tr-sm bg-sky-50/80' : 'rounded-tl-sm'}">
            <p class="text-slate-700 leading-relaxed text-sm md:text-base">${processedText}</p>
            ${glossaryBlock}
            ${text.includes('Error:') ? `<div class="mt-4"><button onclick="startSession()" class="px-5 py-2.5 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-sm font-medium transition-all-custom shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] active:scale-95 flex items-center gap-2"><i class="ri-file-text-line"></i> <span>${currentMode === 'translation' ? 'Generate Test' : 'Start Roleplay'}</span></button></div>` : ''}
            <div class="text-[10px] ${role === 'user' ? 'text-slate-500' : 'text-slate-600'} mt-2 text-right">${timeString}</div>
        </div>
    `;

    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addLoadingIndicator() {
    const id = 'loading-' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = "flex gap-4 max-w-3xl mb-6";
    div.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center flex-shrink-0 animate-pulse">
            <i class="ri-loader-4-line text-white animate-spin"></i>
        </div>
        <div class="glass-panel p-5 rounded-2xl rounded-tl-sm shadow-sm border border-sky-200/50 w-32 animate-pulse flex space-x-2 items-center">
            <div class="w-2 h-2 bg-gray-500 rounded-full"></div>
            <div class="w-2 h-2 bg-gray-500 rounded-full"></div>
            <div class="w-2 h-2 bg-gray-500 rounded-full"></div>
        </div>
    `;
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return id;
}

function removeElement(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function startSession() {
    if (currentMode === 'translation') {
        requestNewParagraph();
    } else {
        startRoleplay();
    }
}

async function startRoleplay() {
    if (!activeUsername) return openLoginModal();
    if (isRequesting) return;

    const topicInput = document.getElementById('topic-input');
    const scenario = topicInput && topicInput.value.trim() !== '' ? topicInput.value.trim() : 'Daily Standup Meeting';

    setUILock(true);
    isRoleplaying = true;
    roleplayHistory = [];
    checkInputState();

    const loadingId = addLoadingIndicator();
    try {
        const res = await fetch('/api/roleplay/chat', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ scenario, history: [], engine: document.getElementById('engine-select') ? document.getElementById('engine-select').value : 'gemini-3.1-flash-lite', sumopodModel: document.getElementById('sumopod-model') ? document.getElementById('sumopod-model').value.trim() : 'glm-5' })
        });

        const data = await res.json();
        removeElement(loadingId);
        setUILock(false);

        if (res.ok) {
            totalTokens += data.tokens || 0;
            updateTokenUI();
            roleplayHistory.push({ role: 'model', content: data.text });
            addMessageToChat('system', `**[Roleplay Started - ${scenario}]**\n\n` + data.text);
            translationInput.focus();
        } else {
            isRoleplaying = false;
            checkInputState();
            addMessageToChat('system', "Error: " + (data.error || "Gagal memulai roleplay"));
        }
    } catch (e) {
        removeElement(loadingId);
        setUILock(false);
        isRoleplaying = false;
        checkInputState();
        addMessageToChat('system', "Error connecting to server.");
    }
}

async function evaluateRoleplaySession() {
    if (!isRoleplaying || roleplayHistory.length === 0) return;
    if (isRequesting) return;

    const topicInput = document.getElementById('topic-input');
    const scenario = topicInput && topicInput.value.trim() !== '' ? topicInput.value.trim() : 'Daily Standup Meeting';

    setUILock(true);
    isRoleplaying = false;
    translationInput.disabled = true;
    btnSubmit.disabled = true;
    checkInputState();

    const loadingId = addLoadingIndicator();

    // Format transcript for eval
    let transcript = roleplayHistory.map(msg => `${msg.role === 'user' ? 'User' : 'Model'}: ${msg.content}`).join('\n\n');

    try {
        const res = await fetch('/api/roleplay/evaluate', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ scenario, transcript, engine: document.getElementById('engine-select') ? document.getElementById('engine-select').value : 'gemini-3.1-flash-lite', sumopodModel: document.getElementById('sumopod-model') ? document.getElementById('sumopod-model').value.trim() : 'glm-5' })
        });

        const data = await res.json();
        removeElement(loadingId);
        setUILock(false);

        if (res.ok) {
            totalTokens += data.tokens || 0;
            updateTokenUI();
            renderReviewReport(data.evaluation);
            roleplayHistory = [];
            appendWelcomeMessage();
        } else {
            addMessageToChat('system', "Error: " + (data.error || "Gagal mengevaluasi roleplay"));
        }
    } catch (e) {
        removeElement(loadingId);
        setUILock(false);
        addMessageToChat('system', "Error connecting to server.");
    }
}

async function requestNewParagraph() {
    if (!activeUsername) return openLoginModal();
    if (currentMode !== 'translation') return; // BUG FIX: Jangan request paragraf jika user keburu ganti mode ke Roleplay
    if (isRequesting) return;

    setUILock(true);
    const loadingId = addLoadingIndicator();
    const topicInput = document.getElementById('topic-input');
    const topic = topicInput && topicInput.value.trim() !== '' ? topicInput.value.trim() : 'Bebas';

    try {
        const res = await fetch('/api/generate', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ topic, engine: document.getElementById('engine-select') ? document.getElementById('engine-select').value : 'gemini-3.1-flash-lite', sumopodModel: document.getElementById('sumopod-model') ? document.getElementById('sumopod-model').value.trim() : 'glm-5' })
        });

        const data = await res.json();
        removeElement(loadingId);
        setUILock(false);

        if (res.ok) {
            totalTokens += data.tokens || 0;
            updateTokenUI();
            currentParagraph = data.text;
            addMessageToChat('system', "**TERJEMAHKAN TEKS BERIKUT:**\n\n" + data.text);
            checkInputState();
            translationInput.focus();
        } else {
            if (res.status === 401) logout();
            addMessageToChat('system', "Error: " + (data.error || "Gagal membuat paragraf baru"));
        }
    } catch (e) {
        removeElement(loadingId);
        setUILock(false);
        addMessageToChat('system', "Error connecting to server.");
    }
}

function renderReviewReport(evaluation) {
    const template = document.getElementById('ai-review-template').content.cloneNode(true);
    const container = document.createElement('div');
    container.appendChild(template);

    const badge = container.querySelector('.status-badge');
    badge.innerText = evaluation.status;

    if (evaluation.status.includes('CLEAN PASS')) {
        badge.classList.add('bg-green-500/20', 'text-green-400', 'border', 'border-green-500/50');
    } else if (evaluation.status.includes('RETRY PASS')) {
        badge.classList.add('bg-yellow-500/20', 'text-yellow-400', 'border', 'border-yellow-500/50');
    } else {
        badge.classList.add('bg-red-500/20', 'text-red-400', 'border', 'border-red-500/50');
    }

    container.querySelector('.overall-content').innerText = evaluation.overall_feedback || '';

    let grammarHtml = '';
    if (Array.isArray(evaluation.grammar_analysis)) {
        evaluation.grammar_analysis.forEach(g => {
            grammarHtml += `<div class="bg-sky-50/50 p-2 rounded border-l-2 border-blue-400">
                <span class="text-xs font-bold text-blue-600">${g.type}</span>
                <p class="text-red-500 line-through text-xs mt-1">${g.original_snippet}</p>
                <p class="text-green-600 font-medium text-xs mt-1">${g.correction}</p>
                <p class="text-slate-600 text-xs italic mt-1">${g.explanation}</p>
            </div>`;
        });
    } else {
        grammarHtml = `<p class="text-slate-600 bg-sky-50/50 p-2 rounded">${evaluation.grammar_analysis}</p>`;
    }
    container.querySelector('.grammar-content').innerHTML = grammarHtml;

    let vocabHtml = '';
    if (Array.isArray(evaluation.vocabulary_correction)) {
        evaluation.vocabulary_correction.forEach(v => {
            vocabHtml += `<div class="bg-sky-50/50 p-2 rounded border-l-2 border-green-400">
                <p class="text-red-500 line-through text-xs">${v.original_word}</p>
                <p class="text-green-600 font-medium text-xs mt-1">${v.suggested_word}</p>
                <p class="text-slate-600 text-xs italic mt-1">${v.context_reason}</p>
            </div>`;
        });
    } else {
        vocabHtml = `<p class="text-slate-600 bg-sky-50/50 p-2 rounded">${evaluation.vocabulary_correction}</p>`;
    }
    container.querySelector('.vocab-content').innerHTML = vocabHtml;

    let glossaryHtml = '';
    let processedNative = (evaluation.native_refactoring || '').replace(/\*\*(.*?)\*\*(?:\s*)\{([^|]+?)\s*\|\s*([^}]+?)\}/g, (match, word, en, id) => {
        glossaryHtml += `<div class="flex items-start gap-2 mt-2 pt-2 border-t border-sky-200/50 first:mt-0 first:pt-0 first:border-0">
            <span class="font-bold text-blue-600 text-xs shrink-0">${word}</span>
            <span class="text-slate-600 text-xs leading-relaxed">${en} <span class="text-slate-400 italic">(${id})</span></span>
        </div>`;
        return `<strong class="text-blue-600">${word}</strong>`;
    });
    processedNative = processedNative.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    processedNative = processedNative.replace(/\n/g, '<br>');

    const glossaryBlock = glossaryHtml ? `<div class="mt-3 bg-sky-50/60 rounded-xl p-3 border border-sky-100 shadow-sm"><div class="text-[10px] uppercase font-bold text-slate-400 mb-2 flex items-center gap-1"><i class="ri-book-read-line"></i> Idiom Glossary</div>${glossaryHtml}</div>` : '';

    container.querySelector('.native-content').innerHTML = processedNative + glossaryBlock;

    const takeawayEl = container.querySelector('.takeaway-content');
    if (takeawayEl) takeawayEl.innerText = evaluation.key_takeaway || '';

    const toneContainer = container.querySelector('.tone-suggestion-container');
    const toneContent = container.querySelector('.tone-suggestion-content');
    if (evaluation.tone_suggestion && evaluation.tone_suggestion.trim() !== '') {
        if (toneContainer) toneContainer.classList.remove('hidden');
        if (toneContent) toneContent.innerText = evaluation.tone_suggestion;
    }

    container.querySelector('.instruction-content').innerText = evaluation.next_instruction;

    const timeString = new Date().toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    container.querySelector('.report-time').innerText = timeString;

    chatContainer.appendChild(container);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

async function submitTranslation() {
    const text = translationInput.value.trim();
    if (!text || !activeUsername) return;
    if (isRequesting) return;

    if (currentMode === 'roleplay') {
        setUILock(true);
        addMessageToChat('user', text);
        roleplayHistory.push({ role: 'user', content: text });
        translationInput.value = '';
        translationInput.disabled = true;
        btnSubmit.disabled = true;

        const loadingId = addLoadingIndicator();
        const topicInput = document.getElementById('topic-input');
        const scenario = topicInput && topicInput.value.trim() !== '' ? topicInput.value.trim() : 'Daily Standup Meeting';

        try {
            const res = await fetch('/api/roleplay/chat', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ scenario, history: roleplayHistory, engine: document.getElementById('engine-select') ? document.getElementById('engine-select').value : 'gemini-3.1-flash-lite', sumopodModel: document.getElementById('sumopod-model') ? document.getElementById('sumopod-model').value.trim() : 'glm-5' })
            });
            const data = await res.json();
            removeElement(loadingId);
            setUILock(false);

            if (res.ok) {
                totalTokens += data.tokens || 0;
                updateTokenUI();
                roleplayHistory.push({ role: 'model', content: data.text });
                addMessageToChat('system', data.text);
                translationInput.disabled = false;
                translationInput.focus();
            } else {
                addMessageToChat('system', "Error: " + (data.error || "Gagal merespons roleplay"));
                roleplayHistory.pop(); // BUG FIX: Cabut pesan user jika server gagal membalas agar riwayat tetap alternate (User-Model-User-Model)
                translationInput.disabled = false;
            }
        } catch (e) {
            removeElement(loadingId);
            setUILock(false);
            addMessageToChat('system', "Error connecting to server.");
            roleplayHistory.pop(); // BUG FIX: Cabut pesan user jika jaringan terputus
            translationInput.disabled = false;
        }
        return;
    }

    // Translation Mode
    if (!currentParagraph) return;

    setUILock(true);
    addMessageToChat('user', text);
    translationInput.value = '';
    translationInput.disabled = true;
    btnSubmit.disabled = true;

    const loadingId = addLoadingIndicator();

    try {
        const res = await fetch('/api/evaluate', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                original_text: currentParagraph,
                submitted_text: text,
                engine: document.getElementById('engine-select') ? document.getElementById('engine-select').value : 'gemini-3.1-flash-lite',
                sumopodModel: document.getElementById('sumopod-model') ? document.getElementById('sumopod-model').value.trim() : 'glm-5'
            })
        });

        const data = await res.json();
        removeElement(loadingId);
        setUILock(false);

        if (res.ok) {
            totalTokens += data.tokens || 0;
            updateTokenUI();
            renderReviewReport(data.evaluation);
            updateUserUI(data.user_state.current_level, data.user_state.streak);

            if (data.evaluation.status.includes('FAIL')) {
                translationInput.disabled = false;
                translationInput.placeholder = "Silakan revisi terjemahan Anda...";
                translationInput.focus();
            } else {
                currentParagraph = '';
                checkInputState();
                setTimeout(() => { requestNewParagraph(); }, 3000);
            }
        } else {
            if (res.status === 401) logout();
            addMessageToChat('system', "Error: " + (data.error || "Gagal mengevaluasi"));
            translationInput.disabled = false;
        }
    } catch (e) {
        removeElement(loadingId);
        setUILock(false);
        addMessageToChat('system', "Error connecting to server.");
        translationInput.disabled = false;
    }
}
