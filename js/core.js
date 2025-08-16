// core.js
export function createCore(categoryFactoryOrObject, config = {}, gameContainer = document) {
    // ===== Global State =====
    const state = {
        score: 0,
        lives: Number(config.lives) || 3,
        timer: Number(config.timer) || 60,
        running: false
    };

    // ===== Internal =====
    let modeAPI = {}; // diisi dari mode lewat registerModeAPI
    let timerIntervalId = null;

    // Ambil elemen UI global (dari config atau langsung cari di document)
    const scoreElement = config.scoreElement || document.querySelector('#score');
    const timerElement = config.timerElement || document.querySelector('#timer');
    const livesElement = config.livesElement || document.querySelector('#lives');

    // ===== UI Helpers =====
    function setScoreUI() {
        if (scoreElement) scoreElement.textContent = state.score;
    }

    function setTimerUI() {
        if (timerElement) timerElement.textContent = state.timer;
    }

    function renderLivesUI() {
        if (!livesElement) return;
        const hearts = livesElement.querySelectorAll('.heart');
        hearts.forEach((heart, idx) => {
            if (idx < state.lives) heart.classList.remove('empty');
            else heart.classList.add('empty');
        });
    }

    // ===== Timer Control =====
    function startGlobalTimer(duration) {
        stopGlobalTimer();
        if (typeof duration === 'number') state.timer = duration;
        setTimerUI();

        timerIntervalId = setInterval(() => {
            if (!state.running) return;
            state.timer = Math.max(0, state.timer - 1);
            setTimerUI();
            if (state.timer <= 0) {
                core.endGame('⏰ Waktu habis');
            }
        }, 1000);
    }

    function stopGlobalTimer() {
        if (timerIntervalId) {
            clearInterval(timerIntervalId);
            timerIntervalId = null;
        }
    }

    // ===== Bangun Rules Category =====
    let rules = {};
    if (typeof categoryFactoryOrObject === 'function') {
        // nanti dipanggil setelah core jadi
    } else if (typeof categoryFactoryOrObject === 'object' && categoryFactoryOrObject !== null) {
        rules = categoryFactoryOrObject;
    }

    // ===== API Core =====
    const core = {
        // --- Akses state ---
        getState() {
            return { ...state };
        },

        // --- Mutator state ---
        addScore(points = 0) {
            state.score += Number(points) || 0;
            setScoreUI();
        },

        decrementLife() {
            state.lives = Math.max(0, state.lives - 1);
            renderLivesUI();
            if (state.lives <= 0) {
                this.endGame('💔 Nyawa habis!');
            }
        },

        calculateScore() {
            return Number(config.baseScore) || 10;
        },

        // --- Mode API Registration ---
        registerModeAPI(api = {}) {
            modeAPI = { ...modeAPI, ...api };
        },

        // --- Lifecycle ---
        prepareGame() {
            try { modeAPI.beforeStart?.(); } catch (e) { console.error(e); }
            setScoreUI();
            setTimerUI();
            renderLivesUI();
        },

        startGame() {
            if (state.running) return;
            state.running = true;
            state.score = 0;
            state.lives = Number(config.lives) || 3;
            state.timer = Number(config.timer) || 60;
            setScoreUI();
            setTimerUI();
            renderLivesUI();

            try { modeAPI.beforeStartRun?.(); } catch (e) { console.error(e); }
            startGlobalTimer(state.timer);
            try { modeAPI.afterStart?.(); } catch (e) { console.error(e); }
        },

        endGame(message = '') {
            state.running = false;
            stopGlobalTimer();
            try { modeAPI.beforeEnd?.(message); } catch (e) { console.error(e); }
            setScoreUI();
            setTimerUI();
            renderLivesUI();
            try { modeAPI.afterEnd?.(message); } catch (e) { console.error(e); }
        },

        nextQuestion() {
            try {
                if (typeof modeAPI.nextQuestion === 'function') {
                    modeAPI.nextQuestion();
                } else {
                    console.warn('Mode does not implement nextQuestion()');
                }
            } catch (e) {
                console.error(e);
            }
        },

        rules
    };

    // ===== Hubungkan kategori ke core =====
    if (typeof categoryFactoryOrObject === 'function') {
        try {
            const maybeRules = categoryFactoryOrObject(core);
            rules = (maybeRules && typeof maybeRules === 'object') ? maybeRules : {};
        } catch (e) {
            console.error('Error creating category rules:', e);
            rules = {};
        }
        core.rules = rules;
    } else {
        core.rules = rules;
    }

    return core;
}
