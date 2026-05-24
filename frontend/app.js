
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
    } catch(e) {}
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
    } catch(e) {}
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
                <div class="flex gap-4 max-w-3xl" id="welcome-message">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                        <i class="ri-robot-2-line text-white"></i>
                    </div>
                    <div class="glass-panel p-5 rounded-2xl rounded-tl-sm shadow-sm border border-sky-200/50 max-w-full lg:max-w-[85%]">
                        <p class="text-slate-700 leading-relaxed text-sm md:text-base">
                            Selamat datang di <strong>TranslateGate AI</strong>. Saya adalah Gatekeeper. Klik tombol di bawah untuk meminta soal paragraf.
                        </p>
                        <div class="text-[10px] text-slate-400 mt-2 text-right">${new Date().toLocaleString('id-ID', {day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'})}</div>
                        <button onclick="requestNewParagraph()" id="btn-request" class="mt-4 px-5 py-2.5 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-sm font-medium transition-all-custom shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] active:scale-95 flex items-center gap-2">
                            <i class="ri-file-text-line"></i> Generate Test
                        </button>
                    </div>
                </div>
            `;
            loadHistory();
        } else {
            loginError.innerText = data.error || "Login gagal";
            loginError.classList.remove('hidden');
        }
    } catch (err) {
        loginError.innerText = "Tidak dapat terhubung ke server";
        loginError.classList.remove('hidden');
    }
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
function checkInputState() {
    if(currentParagraph) {
        translationInput.disabled = false;
        translationInput.placeholder = "Ketik terjemahan Anda di sini...";
    } else {
        translationInput.disabled = true;
        translationInput.placeholder = "Klik 'Generate Test' untuk mendapatkan soal.";
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
    if(el) el.innerHTML = `<i class="ri-coin-line mr-1"></i>${totalTokens.toLocaleString()}`;
}

// API Calls
async function loadHistory() {
    if (!hasMoreHistory) return;
    
    const loaderBtn = document.getElementById('btn-load-history');
    if(loaderBtn) loaderBtn.innerHTML = '<i class="ri-loader-4-line animate-spin"></i> Loading...';

    try {
        const res = await fetch(`/api/history?page=${historyPage}&limit=5`, { headers: getAuthHeaders() });
        const data = await res.json();
        
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
                            <div class="text-[10px] text-slate-500 mt-2 text-right">${new Date(item.created_at).toLocaleString('id-ID', {day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'})}</div>
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
                            <div class="text-[10px] text-slate-500 mt-2 text-right">${new Date(item.created_at).toLocaleString('id-ID', {day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'})}</div>
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
                                    <span class="report-time text-[10px] text-slate-400">${new Date(item.created_at).toLocaleString('id-ID', {day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'})}</span>
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
                                    <p class="text-slate-700 bg-yellow-50/50 p-2 rounded border-l-2 border-yellow-400">${item.key_takeaway || ''}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                // Insert right after the loader so the newest in this old chunk stays at the bottom of the chunk
                loaderDiv.insertAdjacentElement('afterend', wrapper);
            });
            
            hasMoreHistory = data.hasMore;
            if (hasMoreHistory) {
                historyPage++;
                loaderDiv.classList.remove('hidden');
                if(loaderBtn) loaderBtn.innerHTML = '<i class="ri-history-line"></i> Load Previous History';
            } else {
                loaderDiv.classList.add('hidden');
            }
        }
    } catch (e) {
        console.error('Failed to load history', e);
        if(loaderBtn) loaderBtn.innerHTML = 'Error loading history. Try again.';
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
    const timeString = new Date().toLocaleString('id-ID', {day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'});
    
    div.innerHTML = `
        <div class="w-10 h-10 rounded-full ${bgClass} flex items-center justify-center flex-shrink-0 shadow-lg">
            <i class="${icon} text-white"></i>
        </div>
        <div class="glass-panel p-5 rounded-2xl shadow-sm border border-sky-200/50 max-w-full lg:max-w-[85%] ${role === 'user' ? 'rounded-tr-sm bg-sky-50/80' : 'rounded-tl-sm'}">
            <p class="text-slate-700 leading-relaxed text-sm md:text-base">${text.replace(/\n/g, '<br>')}</p>
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

async function requestNewParagraph() {
    if (!activeUsername) return openLoginModal();
    
    const loadingId = addLoadingIndicator();
    const topicInput = document.getElementById('topic-input');
    const topic = topicInput && topicInput.value.trim() !== '' ? topicInput.value.trim() : 'Bebas (Sesuaikan dengan level)';
    
    try {
        const res = await fetch('/api/generate', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ topic, engine: document.getElementById('engine-select') ? document.getElementById('engine-select').value : 'gemini-3.1-flash-lite', sumopodModel: document.getElementById('sumopod-model') ? document.getElementById('sumopod-model').value.trim() : 'glm-5.1' })
        });
        
        const data = await res.json();
        removeElement(loadingId);
        
        if (res.ok) {
            totalTokens += data.tokens || 0;
            updateTokenUI();
            currentParagraph = data.text;
            addMessageToChat('system', "**TERJEMAHKAN TEKS BERIKUT:**\n\n" + currentParagraph);
            checkInputState();
            translationInput.focus();
        } else {
            if (res.status === 401) logout();
            addMessageToChat('system', "Error: " + (data.error || "Gagal mendapatkan soal"));
        }
    } catch (e) {
        removeElement(loadingId);
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

    container.querySelector('.native-content').innerText = evaluation.native_refactoring;
    
    const takeawayEl = container.querySelector('.takeaway-content');
    if (takeawayEl) takeawayEl.innerText = evaluation.key_takeaway || '';
    
    container.querySelector('.instruction-content').innerText = evaluation.next_instruction;
    
    const timeString = new Date().toLocaleString('id-ID', {day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'});
    container.querySelector('.report-time').innerText = timeString;
    
    chatContainer.appendChild(container);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

async function submitTranslation() {
    const text = translationInput.value.trim();
    if (!text || !currentParagraph || !activeUsername) return;
    
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
                submitted_text: text
            })
        });
        
        const data = await res.json();
        removeElement(loadingId);
        
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
        addMessageToChat('system', "Error connecting to server.");
        translationInput.disabled = false;
    }
}
