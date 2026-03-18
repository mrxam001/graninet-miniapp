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

        heroIcon.innerHTML = '<i data-lucide="shield-check" class="icon-hero"></i>'; if(typeof lucide!=='undefined') lucide.createIcons({nodes:[heroIcon]});
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

        // Profile - traffic stats
        if (user.traffic) {
            document.getElementById('trafficTitle').style.display = '';
            document.getElementById('trafficCard').style.display = '';
            document.getElementById('trafficUpload').textContent = user.traffic.upload || '0 B';
            document.getElementById('trafficDownload').textContent = user.traffic.download || '0 B';
            document.getElementById('trafficTotal').textContent = user.traffic.total || '0 B';
        }

        // Show QR button if sub_link exists
        if (user.sub_link) {
            const qrBtn = document.getElementById('btnShowQR');
            if (qrBtn) qrBtn.style.display = '';
        }

        // Hide trial card if trial used
        if (user.trial_used) {
            const trialCard = document.getElementById('trialCard');
            if (trialCard) trialCard.style.display = 'none';
        }

        // Referral
        if (user.referral_link) {
            const refLinkBox = document.getElementById('refLinkBox');
            if (refLinkBox) refLinkBox.style.display = '';
            document.getElementById('refLink').textContent = user.referral_link;
            document.getElementById('refCount').textContent = user.referral_count || 0;
        }

    } else if (user && !user.active) {
        // === EXPIRED SUBSCRIPTION ===
        statusDot.className = 'status-dot expired';
        statusText.textContent = 'Истекла';

        heroIcon.innerHTML = '<i data-lucide="clock" class="icon-hero"></i>'; if(typeof lucide!=='undefined') lucide.createIcons({nodes:[heroIcon]});
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

        heroIcon.innerHTML = '<i data-lucide="shield" class="icon-hero"></i>'; if(typeof lucide!=='undefined') lucide.createIcons({nodes:[heroIcon]});
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
            { name: '⭐ Streisand', desc: 'Бесплатный, удобный', url: 'https://apps.apple.com/app/streisand/id6450534064' },
            { name: 'Shadowrocket', desc: 'Лучший (платный, ~$3)', url: 'https://apps.apple.com/app/shadowrocket/id932747118' },
            { name: 'V2Box', desc: 'Бесплатный', url: 'https://apps.apple.com/app/v2box-v2ray-client/id6446814690' },
            { name: 'FoXray', desc: 'Бесплатный', url: 'https://apps.apple.com/app/foxray/id6448898396' },
            { name: 'Happ', desc: 'Бесплатный', url: 'https://apps.apple.com/app/happ-proxy-utility/id6504287215' },
        ],
        steps: [
            '📲 Скачай приложение <strong>ниже</strong> (рекомендуем Streisand)',
            '🔑 Нажми кнопку <strong>«📋 Скопировать ключ»</strong>',
            '📂 Приложение само предложит <strong>добавить сервер</strong>',
            '✅ Нажми <strong>Добавить</strong> и <strong>включи VPN</strong>!',
        ],
        tip: 'Через подписку: в приложении <strong>+ → Subscribe</strong>, вставь ссылку-подписку → все 6 протоколов добавятся автоматически!'
    },
    android: {
        title: '🤖 Android',
        apps: [
            { name: '⭐ Hiddify', desc: 'Самый удобный', url: 'https://play.google.com/store/apps/details?id=app.hiddify.com' },
            { name: 'v2rayNG', desc: 'Популярный', url: 'https://play.google.com/store/apps/details?id=com.v2ray.ang' },
            { name: 'NekoBox', desc: 'Продвинутый', url: 'https://github.com/MatsuriDayo/NekoBoxForAndroid/releases/latest' },
        ],
        steps: [
            '📲 Скачай <strong>Hiddify</strong> или <strong>v2rayNG</strong> ниже',
            '🔑 Нажми кнопку <strong>«📋 Скопировать ключ»</strong>',
            '📂 В приложении: <strong>+ → Импорт из буфера</strong>',
            '▶️ Нажми кнопку <strong>запуска</strong> внизу экрана',
        ],
        tip: 'Через подписку: <strong>+ → Импорт URL</strong> → вставь ссылку-подписку → все протоколы подключатся!'
    },
    macos: {
        title: '🖥 macOS',
        apps: [
            { name: '⭐ Hiddify', desc: 'Бесплатно', url: 'https://github.com/hiddify/hiddify-app/releases/latest' },
            { name: 'FoXray', desc: 'App Store', url: 'https://apps.apple.com/app/foxray/id6448898396' },
            { name: 'V2Box', desc: 'App Store', url: 'https://apps.apple.com/app/v2box-v2ray-client/id6446814690' },
        ],
        steps: [
            '📲 Скачай <strong>Hiddify</strong> (ссылка ниже)',
            '🔑 Нажми <strong>«📋 Скопировать ключ»</strong>',
            '📂 Hiddify → <strong>New Profile</strong> → вставь ключ',
            '✅ Нажми <strong>Connect</strong>',
        ],
        tip: 'Ссылку-подписку можно вставить через <strong>New Profile → Subscription</strong> для автообновления'
    },
    windows: {
        title: '💻 Windows',
        apps: [
            { name: '⭐ Hiddify', desc: 'Самый простой', url: 'https://github.com/hiddify/hiddify-app/releases/latest' },
            { name: 'v2rayN', desc: 'Популярный', url: 'https://github.com/2dust/v2rayN/releases/latest' },
            { name: 'Nekoray', desc: 'Продвинутый', url: 'https://github.com/MatsuriDayo/nekoray/releases/latest' },
        ],
        steps: [
            '📲 Скачай <strong>Hiddify</strong> (ссылка ниже)',
            '🔧 Установи и запусти',
            '🔑 Скопируй ключ — Hiddify <strong>подхватит автоматически</strong>',
            '✅ Нажми <strong>Connect</strong>',
        ],
        tip: 'Если не подхватил автоматически — <strong>+ → Add from Clipboard</strong>'
    },
    linux: {
        title: '🐧 Linux',
        apps: [
            { name: '⭐ Hiddify', desc: 'GUI', url: 'https://github.com/hiddify/hiddify-app/releases/latest' },
            { name: 'Nekoray', desc: 'GUI', url: 'https://github.com/MatsuriDayo/nekoray/releases/latest' },
            { name: 'sing-box', desc: 'CLI', url: 'https://github.com/SagerNet/sing-box/releases/latest' },
        ],
        steps: [
            '📲 Скачай <strong>Hiddify</strong> или <strong>Nekoray</strong>',
            '🔑 Скопируй <strong>ключ</strong> или <strong>ссылку-подписку</strong>',
            '📂 <strong>Add from Clipboard</strong> или <strong>Subscription URL</strong>',
            '✅ ПКМ по серверу → <strong>Start</strong>',
        ],
        tip: 'CLI: <code>sing-box run -c config.json</code>'
    }
};

function showSetup(device) {
    const info = setupInstructions[device];
    if (!info) return;

    const modal = document.getElementById('setupModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.textContent = info.title;

    // Copy key button
    let html = '';
    if (userData?.sub_link) {
        html += `
            <div class="setup-key-actions">
                <button class="btn btn-primary btn-sm" onclick="copySub(); showToast('📋 Ссылка-подписка скопирована!')">
                    📋 Скопировать подписку
                </button>
                <button class="btn btn-sm btn-copy" onclick="copyKey(); showToast('🔑 Ключ скопирован!')">
                    🔑 Скопировать ключ
                </button>
            </div>`;
    }

    // Apps with download buttons
    html += '<div class="setup-section-title">📲 Скачай приложение</div>';
    info.apps.forEach(app => {
        html += `
            <a href="${app.url}" target="_blank" class="app-download-card glass">
                <div class="app-download-info">
                    <div class="app-download-name">${app.name}</div>
                    <div class="app-download-desc">${app.desc}</div>
                </div>
                <div class="app-download-btn">Скачать</div>
            </a>`;
    });

    // Steps
    html += '<div class="setup-section-title">📖 Как подключить</div>';
    info.steps.forEach((step, i) => {
        html += `
            <div class="step">
                <div class="step-num">${i + 1}</div>
                <div class="step-text">${step}</div>
            </div>`;
    });

    if (info.tip) {
        html += `<div class="tip"><strong>💡 Совет:</strong> ${info.tip}</div>`;
    }

    modalBody.innerHTML = html;
    modal.classList.add('open');

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

// === QR Code ===
function showQRCode() {
    if (!userData?.sub_link) {
        showToast('❌ Нет ссылки подписки');
        return;
    }

    const modal = document.getElementById('qrModal');
    const container = document.getElementById('qrContainer');
    container.innerHTML = '';

    const link = userData.sub_link;

    try {
        if (typeof qrcode === 'function') {
            const qr = qrcode(0, 'M');
            qr.addData(link);
            qr.make();

            const size = 8;
            container.innerHTML = qr.createSvgTag(size, 0);

            const svg = container.querySelector('svg');
            if (svg) {
                svg.style.maxWidth = '260px';
                svg.style.height = 'auto';
                svg.style.borderRadius = '12px';
                svg.style.background = '#fff';
                svg.style.padding = '16px';
            }
        } else {
            // Fallback: use external QR API
            const img = document.createElement('img');
            img.src = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(link)}`;
            img.style.maxWidth = '260px';
            img.style.borderRadius = '12px';
            img.alt = 'QR Code';
            container.appendChild(img);
        }
    } catch (e) {
        console.error('QR error:', e);
        // Fallback: use external QR API
        const img = document.createElement('img');
        img.src = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(link)}`;
        img.style.maxWidth = '260px';
        img.style.borderRadius = '12px';
        img.alt = 'QR Code';
        container.appendChild(img);
    }

    modal.style.display = 'flex';
}

function closeQR() {
    document.getElementById('qrModal').style.display = 'none';
}

function closeQRModal(event) {
    if (event.target === event.currentTarget) {
        closeQR();
    }
}

// === Referral ===
function copyRefLink() {
    const link = document.getElementById('refLink')?.textContent;
    if (!link || link === '—') return;
    navigator.clipboard.writeText(link).then(() => {
        showToast('📋 Ссылка скопирована!');
    }).catch(() => {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = link;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('📋 Ссылка скопирована!');
    });
}

function shareRefLink() {
    const link = document.getElementById('refLink')?.textContent;
    if (!link || link === '—') return;
    const text = `🛡 Попробуй ГРАНИ.НЕТ VPN! Быстрый и надёжный.\nРегистрируйся по моей ссылке и получи бонус:\n${link}`;
    if (tg) {
        tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('🛡 Попробуй ГРАНИ.НЕТ VPN! Быстрый и надёжный.')}`);
    } else if (navigator.share) {
        navigator.share({ text });
    } else {
        copyRefLink();
    }
}

// === Promo Code ===
async function applyPromo() {
    const input = document.getElementById('promoInput');
    const resultDiv = document.getElementById('promoResult');
    const code = input.value.trim();

    if (!code) {
        resultDiv.style.display = 'block';
        resultDiv.className = 'promo-result error';
        resultDiv.textContent = '❌ Введи промокод';
        return;
    }

    resultDiv.style.display = 'block';
    resultDiv.className = 'promo-result loading';
    resultDiv.textContent = '⏳ Проверяю...';

    const data = await apiRequest('/api/promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
    });

    if (data && data.success) {
        resultDiv.className = 'promo-result success';
        resultDiv.textContent = `✅ ${data.result.message}`;
        input.value = '';
        // Refresh profile to show updated expiry
        setTimeout(() => loadProfile(), 1500);
    } else {
        resultDiv.className = 'promo-result error';
        resultDiv.textContent = `❌ ${data?.error || 'Ошибка'}`;
    }
}
