/* ============================================
   ГРАНИ.НЕТ — Telegram Mini App
   Main Application Logic
   ============================================ */

// === Configuration ===
// API server — HTTP direct (Telegram WebView allows mixed content)
const API_BASE = 'http://85.192.60.192:8080';

// === Telegram WebApp ===
const tg = window.Telegram?.WebApp;
let tgUser = null;
let userData = null;

// === Init ===
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    // Initialize Telegram WebApp
    if (tg) {
        tg.ready();
        tg.expand();
        tg.setHeaderColor('#0a0e1a');
        tg.setBackgroundColor('#0a0e1a');

        tgUser = tg.initDataUnsafe?.user;

        // Handle back button
        tg.BackButton.onClick(() => {
            const modal = document.getElementById('setupModal');
            if (modal.classList.contains('open')) {
                closeModal();
            }
        });
    }

    // Set user info
    if (tgUser) {
        const name = tgUser.first_name + (tgUser.last_name ? ' ' + tgUser.last_name : '');
        document.getElementById('profileName').textContent = name;
        document.getElementById('profileId').textContent = `ID: ${tgUser.id}`;
    }

    // Load user data from API
    await loadUserData();

    // Check admin status
    await checkAdmin();

    // Hide loader, show app
    setTimeout(() => {
        const loader = document.getElementById('loader');
        loader.classList.add('fade-out');
        
        const app = document.getElementById('app');
        app.classList.remove('hidden');

        setTimeout(() => loader.remove(), 500);
    }, 1300);
}

// === API Functions ===
async function apiRequest(endpoint, options = {}) {
    try {
        const headers = {
            'Content-Type': 'application/json',
        };

        // Send Telegram init data for auth
        if (tg?.initData) {
            headers['X-Telegram-Init-Data'] = tg.initData;
        }

        // For development: send user ID directly
        if (tgUser?.id) {
            headers['X-Telegram-User-Id'] = tgUser.id.toString();
        }

        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: { ...headers, ...options.headers },
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        return null;
    }
}

async function loadUserData() {
    const data = await apiRequest('/api/user');

    if (data && data.success) {
        userData = data.user;
        updateUI(userData);
    } else {
        // No data from API — show default state
        updateUI(null);
    }
}

// === Update UI Based on User Data ===
function updateUI(user) {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    const heroIcon = document.getElementById('heroIcon');
    const heroTitle = document.getElementById('heroTitle');
    const heroSubtitle = document.getElementById('heroSubtitle');
    const ctaConnect = document.getElementById('ctaConnect');

    // Quick action buttons
    const btnCopyKey = document.getElementById('btnCopyKey');
    const btnCopySub = document.getElementById('btnCopySub');

    // Subscription info
    const subInfoTitle = document.getElementById('subInfoTitle');
    const subInfoCard = document.getElementById('subInfoCard');
    const trafficTitle = document.getElementById('trafficTitle');
    const statsGrid = document.getElementById('statsGrid');

    // Profile elements
    const keyTitle = document.getElementById('keyTitle');
    const keyCard = document.getElementById('keyCard');
    const profileSubTitle = document.getElementById('profileSubTitle');
    const profileSubCard = document.getElementById('profileSubCard');
    const profileCta = document.getElementById('profileCta');

    if (user && user.active) {
        // === ACTIVE SUBSCRIPTION ===
        statusDot.className = 'status-dot active';
        statusText.textContent = 'Активен';

        heroIcon.textContent = '✅';
        heroTitle.textContent = 'VPN активен!';
        heroSubtitle.textContent = `Тариф: ${user.tariff_name}`;

        // Show key buttons
        btnCopyKey.style.display = '';
        btnCopySub.style.display = '';
        ctaConnect.style.display = 'none';

        // Subscription info
        subInfoTitle.style.display = '';
        subInfoCard.style.display = '';
        document.getElementById('infoTariff').textContent = user.tariff_name;
        document.getElementById('infoExpires').textContent = user.expires_text;
        document.getElementById('infoDevices').textContent = `до ${user.devices_limit}`;

        // Traffic stats
        if (user.traffic) {
            trafficTitle.style.display = '';
            statsGrid.style.display = '';
            document.getElementById('statUpload').textContent = user.traffic.upload;
            document.getElementById('statDownload').textContent = user.traffic.download;
            document.getElementById('statTotal').textContent = user.traffic.total;
        }

        // Profile - keys
        keyTitle.style.display = '';
        keyCard.style.display = '';
        document.getElementById('keyValue').textContent = user.vless_link || '—';
        document.getElementById('subValue').textContent = user.sub_link || '—';

        // Profile - subscription
        profileSubTitle.style.display = '';
        profileSubCard.style.display = '';
        profileCta.style.display = 'none';
        document.getElementById('profileTariff').textContent = user.tariff_name;
        document.getElementById('profileStatus').textContent = '✅ Активна';
        document.getElementById('profileExpires').textContent = user.expires_text;
        document.getElementById('profileDevices').textContent = `до ${user.devices_limit}`;

        // Hide trial card if trial used
        if (user.trial_used) {
            const trialCard = document.getElementById('trialCard');
            if (trialCard) trialCard.style.display = 'none';
        }

    } else if (user && !user.active) {
        // === EXPIRED SUBSCRIPTION ===
        statusDot.className = 'status-dot expired';
        statusText.textContent = 'Истекла';

        heroIcon.textContent = '⏰';
        heroTitle.textContent = 'Подписка истекла';
        heroSubtitle.textContent = 'Продли, чтобы продолжить';

        ctaConnect.style.display = '';
        ctaConnect.querySelector('.cta-title').textContent = 'Продли подписку';
        ctaConnect.querySelector('.cta-text').textContent = 'Выбери тариф и продолжи пользоваться VPN без ограничений.';
        ctaConnect.querySelector('.btn').textContent = 'Выбрать тариф';

        btnCopyKey.style.display = 'none';
        btnCopySub.style.display = 'none';

        // Profile
        profileSubTitle.style.display = '';
        profileSubCard.style.display = '';
        profileCta.style.display = '';
        profileCta.querySelector('.cta-text').textContent = 'Подписка истекла. Продли!';
        document.getElementById('profileTariff').textContent = user.tariff_name || '—';
        document.getElementById('profileStatus').textContent = '❌ Истекла';
        document.getElementById('profileExpires').textContent = user.expires_text || '—';

        if (user.trial_used) {
            const trialCard = document.getElementById('trialCard');
            if (trialCard) trialCard.style.display = 'none';
        }

    } else {
        // === NO SUBSCRIPTION ===
        statusDot.className = 'status-dot';
        statusText.textContent = 'Не подключен';

        heroIcon.textContent = '🛡';
        heroTitle.textContent = 'Добро пожаловать!';
        heroSubtitle.textContent = 'Быстрый и безопасный VPN';

        ctaConnect.style.display = '';
        btnCopyKey.style.display = 'none';
        btnCopySub.style.display = 'none';
        subInfoTitle.style.display = 'none';
        subInfoCard.style.display = 'none';
        trafficTitle.style.display = 'none';
        statsGrid.style.display = 'none';

        keyTitle.style.display = 'none';
        keyCard.style.display = 'none';
        profileSubTitle.style.display = 'none';
        profileSubCard.style.display = 'none';
        profileCta.style.display = '';
    }
}

// === Navigation ===
let currentPage = 'home';

function navigateTo(page) {
    if (page === currentPage) return;

    // Update pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(`page-${page}`);
    if (target) {
        target.classList.add('active');
        target.querySelector('.page-scroll')?.scrollTo(0, 0);
    }

    // Update nav
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');

    // Haptic feedback
    if (tg?.HapticFeedback) {
        tg.HapticFeedback.selectionChanged();
    }

    currentPage = page;

    // Load admin data when navigating to admin page
    if (page === 'admin' && isAdminUser) {
        loadAdminStats();
        loadAdminFriends();
    }
}

// === Copy Functions ===
function copyKey() {
    if (!userData?.vless_link) return;
    copyToClipboard(userData.vless_link, '🔑 Ключ скопирован!');
}

function copySub() {
    if (!userData?.sub_link) return;
    copyToClipboard(userData.sub_link, '🔄 Ссылка скопирована!');
}

function copyToClipboard(text, message) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast(message);
            if (tg?.HapticFeedback) {
                tg.HapticFeedback.notificationOccurred('success');
            }
        }).catch(() => {
            fallbackCopy(text, message);
        });
    } else {
        fallbackCopy(text, message);
    }
}

function fallbackCopy(text, message) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand('copy');
        showToast(message);
    } catch (e) {
        showToast('⚠️ Не удалось скопировать');
    }
    document.body.removeChild(ta);
}

// === Toast ===
let toastTimer = null;

function showToast(message) {
    const toast = document.getElementById('toast');
    const toastText = document.getElementById('toastText');
    toastText.textContent = message;
    
    if (toastTimer) clearTimeout(toastTimer);
    
    toast.classList.add('show');
    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

// === Tariff Activation ===
function activateTariff(tariffKey) {
    if (tg?.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('medium');
    }

    if (tariffKey === 'trial') {
        // Send to bot for trial activation
        if (tg) {
            tg.sendData(JSON.stringify({ action: 'activate_trial' }));
        }
        showToast('⏳ Активируем пробный период...');
    } else {
        // Send to bot for paid tariff — will trigger Stars payment
        if (tg) {
            tg.sendData(JSON.stringify({ action: 'buy_tariff', tariff: tariffKey }));
        }
        showToast('⏳ Открываем оплату...');
    }
}

// === Setup Instructions ===
const setupInstructions = {
    ios: {
        title: '📱 iPhone / iPad',
        apps: [
            { name: 'Shadowrocket', desc: 'Лучший (платный, ~$3)' },
            { name: 'Streisand', desc: 'Бесплатный, удобный' },
            { name: 'V2Box / FoXray / Happ', desc: 'Бесплатные альтернативы' },
        ],
        steps: [
            'Скачай приложение из <strong>App Store</strong>',
            'Скопируй свой <strong>ключ</strong> (на странице Профиль)',
            'Открой приложение — оно предложит <strong>добавить сервер</strong>',
            'Нажми <strong>Добавить</strong> → включи VPN',
        ],
        tip: 'Через подписку (автообновление): в приложении нажми <strong>+ → Subscribe</strong> и вставь ссылку-подписку'
    },
    android: {
        title: '🤖 Android',
        apps: [
            { name: 'v2rayNG', desc: 'Лучший (бесплатно)' },
            { name: 'Hiddify', desc: 'Удобный (бесплатно)' },
            { name: 'NekoBox', desc: 'Продвинутый' },
        ],
        steps: [
            'Скачай <strong>v2rayNG</strong> из Google Play',
            'Скопируй свой <strong>ключ</strong>',
            'В v2rayNG: <strong>+ → Импорт из буфера</strong>',
            'Нажми <strong>▶️</strong> внизу экрана',
        ],
        tip: 'Через подписку: <strong>+ → Импорт из URL подписки</strong> → вставь ссылку'
    },
    macos: {
        title: '🖥 macOS',
        apps: [
            { name: 'Hiddify', desc: 'Бесплатно (hiddify.com)' },
            { name: 'Shadowrocket', desc: 'Mac App Store' },
            { name: 'V2Box / FoXray', desc: 'App Store' },
        ],
        steps: [
            'Скачай <strong>Hiddify</strong> с hiddify.com',
            'Скопируй <strong>ключ</strong>',
            'Hiddify → <strong>New Profile</strong> → вставь ключ',
            'Нажми <strong>Connect</strong>',
        ],
        tip: 'Также можно использовать <strong>ссылку-подписку</strong> для автообновления ключа'
    },
    windows: {
        title: '💻 Windows',
        apps: [
            { name: 'Hiddify', desc: 'Простой (hiddify.com)' },
            { name: 'v2rayN', desc: 'Популярный (GitHub)' },
            { name: 'Nekoray', desc: 'Продвинутый' },
        ],
        steps: [
            'Скачай <strong>Hiddify</strong> с hiddify.com',
            'Установи и запусти',
            'Скопируй <strong>ключ</strong> — Hiddify подхватит автоматически',
            'Нажми <strong>Connect</strong>',
        ],
        tip: 'Если автоматически не подхватил — <strong>Add → Paste</strong>'
    },
    linux: {
        title: '🐧 Linux',
        apps: [
            { name: 'Hiddify', desc: 'GUI (hiddify.com)' },
            { name: 'Nekoray', desc: 'GUI (GitHub)' },
            { name: 'sing-box', desc: 'CLI' },
        ],
        steps: [
            'Скачай <strong>Nekoray</strong> с GitHub',
            'Скопируй <strong>ключ</strong>',
            '<strong>Program → Add from Clipboard</strong>',
            'ПКМ по серверу → <strong>Start</strong>',
        ],
        tip: 'CLI вариант: используй <strong>sing-box</strong> с конфиг-файлом'
    }
};

function showSetup(device) {
    const info = setupInstructions[device];
    if (!info) return;

    const modal = document.getElementById('setupModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.textContent = info.title;

    let html = '<h3>Приложения</h3>';
    info.apps.forEach(app => {
        html += `
            <div class="app-option">
                <div class="app-name">${app.name}</div>
                <div class="app-desc">${app.desc}</div>
            </div>`;
    });

    html += '<div class="steps"><h3>Шаги подключения</h3>';
    info.steps.forEach((step, i) => {
        html += `
            <div class="step">
                <div class="step-num">${i + 1}</div>
                <div class="step-text">${step}</div>
            </div>`;
    });
    html += '</div>';

    if (info.tip) {
        html += `<div class="tip"><strong>💡 Совет:</strong> ${info.tip}</div>`;
    }

    modalBody.innerHTML = html;
    modal.classList.add('open');

    // Show Telegram back button
    if (tg?.BackButton) {
        tg.BackButton.show();
    }

    if (tg?.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
}

function closeModal() {
    const modal = document.getElementById('setupModal');
    modal.classList.remove('open');

    if (tg?.BackButton) {
        tg.BackButton.hide();
    }
}

// === Support ===
function openSupport() {
    if (tg) {
        tg.openTelegramLink('https://t.me/graninet_support');
    } else {
        window.open('https://t.me/graninet_support', '_blank');
    }
}

// === Event Listeners ===
document.getElementById('btnCopyKey')?.addEventListener('click', copyKey);
document.getElementById('btnCopySub')?.addEventListener('click', copySub);


// ============================================
// === ADMIN PANEL ===
// ============================================

let isAdminUser = false;

async function checkAdmin() {
    const data = await apiRequest('/api/admin/check');
    if (data && data.success && data.is_admin) {
        isAdminUser = true;
        // Show admin nav tab
        const navAdmin = document.getElementById('navAdmin');
        if (navAdmin) navAdmin.style.display = '';
    }
}

async function loadAdminStats() {
    if (!isAdminUser) return;

    const data = await apiRequest('/api/admin/stats');
    if (data && data.success) {
        const s = data.stats;
        document.getElementById('adminTotalUsers').textContent = s.total_users;
        document.getElementById('adminActiveUsers').textContent = s.active_users;
        document.getElementById('adminTotalStars').textContent = s.total_stars;
        document.getElementById('adminTotalFriends').textContent = `${s.active_friends}/${s.total_friends}`;
    }
}

async function loadAdminFriends() {
    if (!isAdminUser) return;

    const data = await apiRequest('/api/admin/friends');
    if (!data || !data.success) {
        document.getElementById('friendsList').innerHTML =
            '<div class="info-card glass" style="text-align:center;color:var(--text-muted)">❌ Ошибка загрузки</div>';
        return;
    }

    const friends = data.friends;
    const list = document.getElementById('friendsList');
    const count = document.getElementById('friendsCount');

    count.textContent = `(${friends.length})`;

    if (friends.length === 0) {
        list.innerHTML =
            '<div class="info-card glass" style="text-align:center;color:var(--text-muted)">Пока нет подписок. Создай первую!</div>';
        return;
    }

    let html = '';
    friends.forEach(f => {
        let cardClass = 'friend-card';
        let statusClass, statusText;

        if (!f.is_active) {
            cardClass += ' expired';
            statusClass = 'friend-status expired-status';
            statusText = '❌ Истекла';
        } else if (f.is_permanent) {
            cardClass += ' permanent';
            statusClass = 'friend-status permanent-status';
            statusText = '♾ Бессрочно';
        } else {
            cardClass += ' limited';
            statusClass = 'friend-status active';
            statusText = '✅ Активна';
        }

        html += `
        <div class="${cardClass}">
            <div class="friend-header">
                <span class="friend-name">${f.name}</span>
                <span class="${statusClass}">${statusText}</span>
            </div>
            <div class="friend-meta">
                <span>📱 ${f.devices_limit} устр.</span>
                <span>⏰ ${f.expires_text}</span>
            </div>
            <div class="friend-actions">
                <button class="btn btn-copy" onclick="copyFriendKey('${encodeURIComponent(f.vless_link)}')">
                    🔑 Ключ
                </button>
                <button class="btn btn-copy" onclick="copyFriendKey('${encodeURIComponent(f.sub_link)}')">
                    🔄 Подписка
                </button>
                <button class="btn btn-danger" onclick="deleteFriend('${f.name}')">
                    🗑
                </button>
            </div>
        </div>`;
    });

    list.innerHTML = html;
}

function copyFriendKey(encodedLink) {
    const link = decodeURIComponent(encodedLink);
    copyToClipboard(link, '📋 Скопировано!');
}

async function addFriend() {
    const name = document.getElementById('friendName').value.trim();
    const days = parseInt(document.getElementById('friendDays').value) || 0;
    const devices = parseInt(document.getElementById('friendDevices').value) || 2;

    if (!name) {
        showToast('❌ Введи имя!');
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
        return;
    }

    const btn = document.getElementById('btnAddFriend');
    btn.disabled = true;
    btn.textContent = '⏳ Создаём...';

    const data = await apiRequest('/api/admin/friend', {
        method: 'POST',
        body: JSON.stringify({ name, days, devices }),
    });

    btn.disabled = false;
    btn.textContent = '➕ Создать подписку';

    if (data && data.success) {
        showToast(`✅ ${name} создан!`);
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');

        // Show result
        const f = data.friend;
        const resultHtml = `
        <div class="result-card" id="lastResult">
            <div class="result-title">✅ ${f.name} — создано!</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px">
                📱 ${f.devices_limit} устр. | ⏰ ${f.expires_text}
            </div>
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">🔑 Ключ:</div>
            <div class="result-key">${f.vless_link}</div>
            <button class="btn btn-copy btn-full" onclick="copyFriendKey('${encodeURIComponent(f.vless_link)}')">
                📋 Скопировать ключ
            </button>
            <div style="font-size:11px;color:var(--text-muted);margin:8px 0 4px">🔄 Подписка:</div>
            <div class="result-key">${f.sub_link}</div>
            <button class="btn btn-copy btn-full" onclick="copyFriendKey('${encodeURIComponent(f.sub_link)}')">
                📋 Скопировать подписку
            </button>
        </div>`;

        // Insert result before form
        const existingResult = document.getElementById('lastResult');
        if (existingResult) existingResult.remove();
        document.getElementById('addFriendForm').insertAdjacentHTML('beforebegin', resultHtml);

        // Clear form
        document.getElementById('friendName').value = '';
        document.getElementById('friendDays').value = '0';
        document.getElementById('friendDevices').value = '2';

        // Reload friends list
        await loadAdminFriends();
        await loadAdminStats();
    } else {
        const error = data?.error || 'Ошибка создания';
        showToast(`❌ ${error}`);
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
    }
}

async function deleteFriend(name) {
    if (!confirm(`Удалить «${name}»?`)) return;

    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('heavy');

    const data = await apiRequest(`/api/admin/friend/${encodeURIComponent(name)}`, {
        method: 'DELETE',
    });

    if (data && data.success) {
        showToast(`🗑 ${name} удалён`);
        await loadAdminFriends();
        await loadAdminStats();
    } else {
        showToast('❌ Ошибка удаления');
    }
}
