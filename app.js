/**
 * SIGMA OS - VIBECODING SESSION
 * No external dependencies.
 */

// --- CONFIG & CONSTANTS ---
// --- CONFIG & CONSTANTS ---
const generateHash = () =>
    Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

const fullHash = generateHash();

const CONFIG = {
    FULL_HASH: fullHash,
    HALF_A: fullHash.substring(0, 16),
    HALF_B: fullHash.substring(16),
    DECODED_CODE: "SIGMA-PROTOCOL-INITIATED",
    MINIGAME: {
        TOTAL_CIRCLES: 10,
        TARGET_WINS: 10,
        SPAWN_MIN_MS: 1000,
        SPAWN_MAX_MS: 1000,
        TTL_MIN_MS: 2500,
        TTL_MAX_MS: 3500,
        CIRCLE_MIN_PX: 60,
        CIRCLE_MAX_PX: 90,
    },
    DECODE_TIME_MS: 4000,
    HACK_CHANCE: 0.7
};

// --- STATE ---
const State = {
    apps: {
        browser: { isOpen: true, zIndex: 10 },
        notes: { isOpen: true, zIndex: 11 },
        verify: { isOpen: true, zIndex: 12 }
    },
    zIndexCounter: 20,
    hasBeenHacked: false, // Track if player has beaten the minigame once
    minigameActive: false
};

// --- DOM ELEMENTS ---
const els = {
    desktop: document.getElementById('desktop'),
    boot: document.getElementById('boot-sequence'),
    minigame: {
        overlay: document.getElementById('intrusion-overlay'),
        grid: document.getElementById('defense-grid'),
        score: document.getElementById('defense-score'),
        target: document.getElementById('defense-target')
    },
    windows: document.querySelectorAll('.window'),
    taskbarIcons: document.querySelectorAll('.app-icon'),
    browser: {
        viewport: document.getElementById('browser-viewport'),
        urlBar: document.querySelector('.url-bar'),
        links: document.querySelectorAll('.bookmarks li'),
    },
    notes: {
        area: document.getElementById('notes-area'),
        clear: document.getElementById('notes-clear'),
        copy: document.getElementById('notes-copy')
    },
    verify: {
        input: document.getElementById('verify-input'),
        btn: document.getElementById('verify-btn'),
        msg: document.getElementById('verify-msg')
    },
    win: {
        overlay: document.getElementById('win-overlay'),
        restart: document.getElementById('restart-btn')
    },
    clock: document.getElementById('clock'),
    mute: document.getElementById('mute-toggle')
};

// --- AUDIO (Simulated) ---
let isMuted = false;
const Sounds = {
    click: () => playTone(800, 0.05),
    error: () => playTone(150, 0.3, 'sawtooth'),
    success: () => playTone(1200, 0.2, 'sine'),
    alert: () => playTone(600, 0.3, 'square'),
};

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playTone(freq, duration, type = 'sine') {
    if (isMuted) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) { }
}

// --- BOOT SEQUENCE ---
setTimeout(() => {
    els.boot.style.display = 'none';
    els.desktop.classList.remove('hidden');
    // Randomize initial positions slightly
    els.windows.forEach(w => {
        w.style.top = (10 + Math.random() * 20) + '%';
        w.style.left = (10 + Math.random() * 40) + '%';
    });
    updateClock();
    setInterval(updateClock, 1000);
}, 4000);

// --- WINDOW MANAGER ---
function focusWindow(appId) {
    if (State.minigameActive) return;
    const w = document.getElementById(`window-${appId}`);
    if (!w) return;

    // Unminimize
    if (w.classList.contains('minimized')) {
        w.classList.remove('minimized');
        const icon = document.querySelector(`.app-icon[data-target="${appId}"]`);
        if (icon) icon.classList.add('active');
    }

    // Bring to front
    w.style.zIndex = ++State.zIndexCounter;
    State.apps[appId].zIndex = State.zIndexCounter;
}

function minimizeWindow(appId) {
    const w = document.getElementById(`window-${appId}`);
    w.classList.add('minimized');
    const icon = document.querySelector(`.app-icon[data-target="${appId}"]`);
    if (icon) icon.classList.remove('active');
}

function closeWindow(appId) {
    // "Close" just acts like minimize but visually distinct in a real OS.
    // For this game, we'll just minimize/hide.
    minimizeWindow(appId);
}

// Event Listeners for Windows
document.querySelectorAll('.window').forEach(w => {
    w.addEventListener('mousedown', () => focusWindow(w.dataset.app));
    const minBtn = w.querySelector('.win-btn.min');
    minBtn.onclick = (e) => { e.stopPropagation(); minimizeWindow(w.dataset.app); };
    const closeBtn = w.querySelector('.win-btn.close');
    closeBtn.onclick = (e) => { e.stopPropagation(); closeWindow(w.dataset.app); };

    // Initialize Draggable
    makeDraggable(w);
});

function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const header = element.querySelector('.title-bar');

    if (header) {
        header.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
        e.preventDefault();
        // Get initial mouse position
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;

        // Focus window on drag start
        focusWindow(element.dataset.app);
    }

    function elementDrag(e) {
        e.preventDefault();
        // Calculate new position
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;

        // Set new position
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        // Stop moving when mouse button is released
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

els.taskbarIcons.forEach(icon => {
    icon.onclick = () => {
        const target = icon.dataset.target;
        const w = document.getElementById(`window-${target}`);
        if (w.classList.contains('minimized')) {
            focusWindow(target);
            icon.classList.add('active');
        } else {
            // If already focused, minimize. Else focus.
            if (parseInt(w.style.zIndex) === State.zIndexCounter) {
                minimizeWindow(target);
            } else {
                focusWindow(target);
            }
        }
    };
});

// --- CLOCK ---
function updateClock() {
    const now = new Date();
    els.clock.innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

els.mute.onclick = () => {
    isMuted = !isMuted;
    els.mute.innerText = isMuted ? '🔇' : '🔊';
};

// --- BROWSER APP ---
const Pages = {
    'local://home': `
        <h1>Welcome to Intranet</h1>
        <p>System status: CRITICAL.</p>
        <p>Recovery data has been fragmented across the secure partition.</p>
        <p><strong>Mission:</strong> Locate missing hash fragments, recombine them, and restore system access.</p>
        <hr>
        <h3>Updates</h3>
        <p>Admin: Please stop leaving half-keys in the build logs. It's a security risk.</p>
    `,
    'local://project-alpha': `
        <h1>Project Alpha</h1>
        <p>Status: Deprecated.</p>
        <p>Codebase moved to legacy storage.</p>
        <p>To reference build v4.2, use checksum: <span class="hash-fragment" style="font-family: monospace; color: #555;">(${CONFIG.HALF_A})</span></p>
        <p>Note: Ensure you verify integrity before deploying.</p>
    `,
    'local://hash-tool': `
        <div class="hash-tool-container">
            <h1>Cryptographic Decoder</h1>
            <p>Enter full hash string to decrypt.</p>
            <input type="text" id="hash-tool-input" class="hash-input" placeholder="Paste full hash here...">
            <button id="hash-tool-btn" class="primary-btn">DECODE</button>
            <div class="progress-bar"><div class="progress-bar-fill"></div></div>
            <div class="log-output"></div>
        </div>
    `,
    'local://dev-log': `
        <h1>Developer Log</h1>
        <p>Entry 404: Sleep deprivation kicking in. I hid the other half of the key in the About page alt-text, but then I realized we don't have an About page.</p>
        <p>Moved it to the System Administration page footer. Don't tell Dave.</p>
    `,
    'local://sys-admin': `
        <h1>System Administration</h1>
        <p>Authorized personnel only.</p>
        <details>
            <summary>Server Config</summary>
            <p>Port: 8080</p>
            <p>Protocol: HTTPS</p>
        </details>
        <details>
            <summary>User Management</summary>
            <p>Active Users: 1</p>
        </details>
        <div style="margin-top: 50px; border-top: 1px solid #eee; padding-top: 10px; color: #ccc; font-size: 10px;">
            System Build ID: <span style="color: #bbb;">${CONFIG.HALF_B}</span>
        </div>
    `,
    'local://legacy-docs': `
        <h1>Legacy Documentation</h1>
        <p>Lorem ipsum dolor sit amet. NOT A REAL HASH: a1b2c3d4</p>
        <p>Do not use old keys. They will fail validation.</p>
        <code>HASH_OLD = 8822991100</code>
    `
};

let currentUrl = 'local://home';

function loadPage(url) {
    els.browser.viewport.innerHTML = Pages[url] || '<h1>404 Not Found</h1>';
    els.browser.urlBar.value = url;
    currentUrl = url;

    // Update active link
    els.browser.links.forEach(l => l.classList.remove('active'));
    const link = Array.from(els.browser.links).find(l => l.dataset.url === url);
    if (link) link.classList.add('active');

    // Attach listeners if hash tool
    if (url === 'local://hash-tool') {
        document.getElementById('hash-tool-btn').onclick = startDecoding;
    }
}

// Sidebar Navigation
els.browser.links.forEach(l => {
    l.onclick = () => loadPage(l.dataset.url);
});
loadPage('local://home');

// --- HASH TOOL & MINIGAME LOGIC ---
function startDecoding() {
    const input = document.getElementById('hash-tool-input').value.trim();
    const btn = document.getElementById('hash-tool-btn');
    const prog = document.querySelector('.progress-bar');
    const fill = document.querySelector('.progress-bar-fill');
    const logs = document.querySelector('.log-output');

    if (!input) {
        alert("Please input a hash.");
        return;
    }

    btn.disabled = true;
    prog.style.display = 'block';
    logs.style.display = 'block';
    logs.innerHTML = '> CONNECTING...<br>';
    fill.style.width = '0%';

    let progress = 0;
    const interval = setInterval(() => {
        progress += 5;
        fill.style.width = `${progress}%`;

        if (Math.random() > 0.7) logs.innerHTML += `> Analyzing block ${Math.floor(Math.random() * 99)}...<br>`;
        logs.scrollTop = logs.scrollHeight;

        // TRIGGER MINIGAME at ~40%
        // Always trigger if not yet hacked (user requirement: reliable trigger)
        // Or small chance if already hacked
        if (progress > 35 && progress < 45) {
            const shouldTrigger = !State.hasBeenHacked || Math.random() < 0.2;

            if (shouldTrigger) {
                clearInterval(interval);
                triggerMinigame(() => {
                    // On success resume
                    State.hasBeenHacked = true;
                    btn.disabled = false;
                    startDecoding(); // Restart/Resume logic
                });
                return;
            }
        }

        if (progress >= 100) {
            clearInterval(interval);
            btn.disabled = false;

            if (input === CONFIG.FULL_HASH) {
                logs.innerHTML += `> SUCCESS. DECRYPTED.<br>`;
                logs.innerHTML += `> CODE: <span style="color:white; font-weight:bold; user-select:text;">${CONFIG.DECODED_CODE}</span><br>`;
                Sounds.success();
            } else {
                logs.innerHTML += `> ERROR: HASH MISMATCH.<br>`;
                Sounds.error();
                document.querySelector('.browser-body').classList.add('shake');
                setTimeout(() => document.querySelector('.browser-body').classList.remove('shake'), 500);
            }
        }
    }, CONFIG.DECODE_TIME_MS / 20);
}

// Background Hack Timer (Every 2 minutes)
setInterval(() => {
    if (!State.minigameActive && !State.apps.verify.isWon) {
        // Only trigger if game is not won and minigame not active
        triggerMinigame(() => {
            State.hasBeenHacked = true;
            // Just close overlay and continue
        });
    }
}, 120000); // 2 minutes

function triggerMinigame(onSuccess) {
    State.minigameActive = true;
    els.minigame.overlay.classList.remove('hidden');
    els.minigame.grid.innerHTML = '';

    // Countdown Overlay Logic
    let countdown = 5;
    const warningTitle = document.querySelector('.intrusion-warning h1');
    const originalTitle = "⚠ INTRUSION DETECTED ⚠";
    const warningText = document.querySelector('.intrusion-warning p');
    const originalText = "FIREWALL BREACH IN PROGRESS";

    warningTitle.innerText = `BREACH IN ${countdown}...`;
    warningText.innerText = "PREPARE DEFENSES";
    els.minigame.score.innerText = "0";
    els.minigame.target.innerText = CONFIG.MINIGAME.TOTAL_CIRCLES;

    Sounds.alert();

    const countInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            warningTitle.innerText = `BREACH IN ${countdown}...`;
            Sounds.click(); // Little tick sound
        } else {
            clearInterval(countInterval);
            warningTitle.innerText = originalTitle;
            warningText.innerText = originalText;
            startGame();
        }
    }, 1000);

    let failed = false;

    function startGame() {
        let deflected = 0;
        els.minigame.score.innerText = deflected;

        spawnNextCircle(deflected);
    }

    function spawnNextCircle(completedCount) {
        if (failed) return;

        if (completedCount >= CONFIG.MINIGAME.TOTAL_CIRCLES) {
            winMinigame();
            return;
        }

        const circle = document.createElement('div');
        circle.classList.add('defense-circle');

        const size = Math.random() * (CONFIG.MINIGAME.CIRCLE_MAX_PX - CONFIG.MINIGAME.CIRCLE_MIN_PX) + CONFIG.MINIGAME.CIRCLE_MIN_PX;

        // Increased padding to avoid edges (User reported top-left issue)
        const marginX = Math.max(100, window.innerWidth * 0.15);
        const marginY = Math.max(100, window.innerHeight * 0.15);

        // Ensure we have enough space
        const minX = marginX;
        const maxX = window.innerWidth - marginX - size;
        const minY = marginY;
        const maxY = window.innerHeight - marginY - size;

        // Fallback for small screens
        const safeMinX = minX < maxX ? minX : 20;
        const safeMaxX = minX < maxX ? maxX : window.innerWidth - 60;
        const safeMinY = minY < maxY ? minY : 60;
        const safeMaxY = minY < maxY ? maxY : window.innerHeight - 60;

        const x = Math.random() * (safeMaxX - safeMinX) + safeMinX;
        const y = Math.random() * (safeMaxY - safeMinY) + safeMinY;

        // Slower, easier TTL (2.5s - 3.5s)
        const ttl = Math.random() * (CONFIG.MINIGAME.TTL_MAX_MS - CONFIG.MINIGAME.TTL_MIN_MS) + CONFIG.MINIGAME.TTL_MIN_MS;
        circle.style.animationDuration = `${ttl}ms`;

        let clicked = false;

        circle.onmousedown = (e) => {
            e.stopPropagation();
            if (clicked || failed) return;
            clicked = true;
            circle.remove();

            Sounds.click();
            const newScore = completedCount + 1;
            els.minigame.score.innerText = newScore;

            // Spawn next one immediately after click (sequential)
            setTimeout(() => spawnNextCircle(newScore), 200);
        };

        // Fail logic
        setTimeout(() => {
            if (!clicked && circle.parentNode && !failed) {
                failMinigame();
            }
        }, ttl);

        els.minigame.grid.appendChild(circle);
    }

    function failMinigame() {
        if (failed) return;
        failed = true;
        Sounds.error();
        alert("SYSTEM COMPROMISED. REBOOTING...");
        location.reload();
    }

    function winMinigame() {
        if (failed) return;
        State.minigameActive = false;
        setTimeout(() => {
            els.minigame.overlay.classList.add('hidden');
            // Reset text for next time
            warningTitle.innerText = originalTitle;
            warningText.innerText = originalText;
            onSuccess();
        }, 500);
    }
}

// --- NOTES APP ---
els.notes.clear.onclick = () => {
    if (confirm("Clear all notes?")) {
        els.notes.area.value = "";
    }
};

els.notes.copy.onclick = () => {
    els.notes.area.select();
    document.execCommand('copy');
    alert("Copied to clipboard");
};

// --- VERIFY APP ---
els.verify.btn.onclick = () => {
    const input = els.verify.input.value.trim();
    if (input === CONFIG.DECODED_CODE) {
        els.win.overlay.classList.remove('hidden');
        Sounds.success();
    } else {
        els.verify.msg.innerText = "ACCESS DENIED";
        els.verify.msg.style.color = "red";
        document.getElementById('window-verify').classList.add('shake');
        setTimeout(() => document.getElementById('window-verify').classList.remove('shake'), 500);
        Sounds.error();
    }
};

els.win.restart.onclick = () => location.reload();

// Initialize Windows Active State
document.querySelectorAll('.app-icon').forEach(i => i.classList.add('active'));
