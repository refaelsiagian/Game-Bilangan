import { terbilang, generateRandomNumberByDifficulty, shuffleArray, findFixedIndices } from '../utils.js';

export async function init(core, { container, onGameStateChange } = {}) {
    // === LOCAL MODE STATE ===
    let targetNumber = '';
    let targetDigits = [];
    let filledSlots = [];
    let pendingDigits = [];
    let currentDigit = '';
    let listeners = [];

    // === DOM query helper ===
    function queryDOM() {
        return {
            targetNumberElement: container.querySelector('#target-number'),
            hasilKataElement: container.querySelector('#hasil-kata'),
            currentDigitElement: container.querySelector('#current-digit'),
            startBtn: container.querySelector('#start-btn'),
            discardBtn: container.querySelector('#discard-btn'),
            feedback: container.querySelector('#feedback'),
            difficultySelect: container.querySelector('#difficulty')
        };
    }

    // === UI render ===
    function renderUI() {
        container.innerHTML = `
        <div class="text-center mb-3">
            <div class="digital-slots" id="target-number">
                ${'<span class="digit">_</span>'.repeat(3)}<span class="sep">.</span>
                ${'<span class="digit">_</span>'.repeat(3)}<span class="sep">.</span>
                ${'<span class="digit">_</span>'.repeat(3)}<span class="sep">.</span>
                ${'<span class="digit">_</span>'.repeat(3)}<span class="sep">.</span>
                ${'<span class="digit">_</span>'.repeat(3)}
            </div>
        </div>

        <div class="text-center mb-3">
            <label>Pilih Kesulitan:</label>
            <select id="difficulty" class="form-select w-auto d-inline-block">
                <option value="mudah">Mudah</option>
                <option value="sedang" selected>Sedang</option>
                <option value="sulit">Sulit</option>
            </select>
        </div>

        <div class="text-center mb-3">
            <div id="hasil-kata" class="p-3 bg-white border rounded text-secondary">
                Klik "Mulai" untuk menampilkan angka terbilang...
            </div>
        </div>

        <div class="text-center mb-3">
            <div id="current-digit" class="fw-bold text-primary" style="font-size:4rem;">_</div>
        </div>

        <div class="text-center mb-4">
            <button id="start-btn" class="btn btn-info">Mulai</button>
            <button id="discard-btn" class="btn btn-warning" style="display:none;">Buang</button>
        </div>

        <div class="text-center">
            <div id="feedback" class="fw-bold fs-5"></div>
        </div>
        `;
    }

    // === Feedback helper ===
    function showFeedback(message, className) {
        const { feedback } = queryDOM();
        if (!feedback) return;
        feedback.textContent = message;
        feedback.className = `fw-bold fs-5 ${className || ''}`;
    }

    // === Slots rendering ===
    function renderSlots(digits, difficulty) {
        const { targetNumberElement } = queryDOM();
        targetNumberElement.innerHTML = "";

        const fixedIndices = difficulty === "mudah" ? findFixedIndices(digits) : [];

        filledSlots = [];

        for (let i = 0; i < digits.length; i++) {
            const span = document.createElement("span");
            span.classList.add("digit");
            span.dataset.index = i;

            if (fixedIndices.includes(i)) {
                span.textContent = digits[i];
                span.classList.add("fixed");
                filledSlots.push(i);
            } else {
                span.textContent = "_";
                const handler = () => handleSlotClick(i);
                addListener(span, 'click', handler);
            }

            targetNumberElement.appendChild(span);

            if ((i + 1) % 3 === 0 && i !== digits.length - 1) {
                const sep = document.createElement("span");
                sep.classList.add("sep");
                sep.textContent = ".";
                targetNumberElement.appendChild(sep);
            }
        }
    }

    // === Core-driven helpers (use core.getState() for state) ===
    function isRunning() {
        return core.getState().running;
    }

    // === Game mechanics ===
    function handleSlotClick(index) {
        if (!isRunning() || filledSlots.includes(index)) return;

        if (targetDigits[index] === currentDigit) {
            const slot = queryDOM().targetNumberElement.querySelector(`.digit[data-index="${index}"]`);
            if (slot) {
                slot.textContent = currentDigit;
                slot.classList.add('filled');
            }
            filledSlots.push(index);
            showFeedback('✅ Benar!', 'text-success');

            if (filledSlots.length === targetDigits.length) {
                core.rules.onCorrect?.();
                showFeedback('🎉 Selamat! Jawaban benar!', 'text-success');
            } else {
                showNextDigit();
            }
        } else {
            core.rules.onWrong?.();
            const updated = core.getState();
            if (updated.lives > 0) {
                showFeedback(`❌ Salah! (Sisa nyawa: ${updated.lives})`, 'text-danger');
            }
        }
    }

    function handleDiscard() {
        if (!isRunning() || !currentDigit) return;

        if (!targetDigits.includes(currentDigit)) {
            showFeedback('✅ Benar! Angka dibuang.', 'text-success');
            showNextDigit();
        } else {
            core.rules.onWrong?.();
            const updated = core.getState();
            if (updated.lives > 0) {
                showFeedback(`❌ Salah! Angka ada dalam target. (Sisa nyawa: ${updated.lives})`, 'text-danger');
            }
        }
    }

    function showNextDigit() {
        if (pendingDigits.length > 0) {
            currentDigit = pendingDigits.pop();
            const { currentDigitElement } = queryDOM();
            currentDigitElement.textContent = currentDigit;
        } else {
            core.rules.onCorrect?.();
        }
    }

    function addDistractorDigits() {
        const allDigits = ['0','1','2','3','4','5','6','7','8','9'];
        const available = allDigits.filter(d => !targetDigits.includes(d));
        for (let i = 0; i < 5 && available.length > 0; i++) {
            const idx = Math.floor(Math.random() * available.length);
            pendingDigits.push(available.splice(idx, 1)[0]);
        }
    }

    // === Listener management ===
    function addListener(el, evt, handler) {
        if (!el) return;
        el.addEventListener(evt, handler);
        listeners.push([el, evt, handler]);
    }
    function removeAllListeners() {
        listeners.forEach(([el, evt, handler]) => {
            try { el.removeEventListener(evt, handler); } catch (e) {}
        });
        listeners = [];
    }

    // === Generate target & prepare digits (used when game actually starts) ===
    function generateAndPrepareTarget() {
        filledSlots = [];
        pendingDigits = [];
        currentDigit = '';

        const { hasilKataElement, difficultySelect, currentDigitElement } = queryDOM();
        hasilKataElement.textContent = terbilang(targetNumber);
        hasilKataElement.classList.remove('text-secondary');

        const difficulty = difficultySelect?.value || 'sedang';

        targetDigits = targetNumber.split('');

        pendingDigits = targetDigits.filter((d, i) => !(difficulty === 'mudah' && d === '0'));
        if (difficulty === 'sulit') addDistractorDigits();
        shuffleArray(pendingDigits);

        currentDigitElement.textContent = '_';
        showNextDigit();
    }

    // === Mode API registered to core ===
    core.registerModeAPI({
        beforeStart() {
            renderUI();

            const { difficultySelect, startBtn, discardBtn } = queryDOM();

            const diffHandler = () => {
                discardBtn.style.display = (difficultySelect.value === 'sulit') ? 'inline-block' : 'none';
            };
            addListener(difficultySelect, 'change', diffHandler);
            diffHandler(); // set initial visibility

            const startHandler = () => {
                const state = core.getState();
                state.running ? core.endGame('Game diakhiri!') : core.startGame();
            };
            addListener(startBtn, 'click', startHandler);

            addListener(discardBtn, 'click', handleDiscard);
        },

        afterStart() {
            const { startBtn, difficultySelect } = queryDOM();

            startBtn.textContent = "Akhiri";
            difficultySelect.disabled = true;

            const difficulty = difficultySelect?.value || 'sedang';
            targetNumber = generateRandomNumberByDifficulty(difficulty);
            renderSlots(targetNumber.split(''), difficulty);

            generateAndPrepareTarget();
            showFeedback('', '');
            onGameStateChange?.(true);
        },

        beforeEnd() {
            const { targetNumberElement } = queryDOM();

            targetNumberElement.querySelectorAll('.digit').forEach((slot, idx) => {
                if (!filledSlots.includes(idx)) {
                    slot.textContent = targetDigits[idx];
                    slot.classList.add('missed');
                }
            });
        },

        afterEnd(message) {
            const { startBtn, difficultySelect, hasilKataElement } = queryDOM();
            showFeedback(message, 'text-info');

            if (targetNumber) {
                hasilKataElement.classList.remove('text-secondary');
                hasilKataElement.textContent = terbilang(targetNumber);
            }

            startBtn.textContent = "Mulai Lagi";
            startBtn.disabled = false;
            difficultySelect.disabled = false;

            onGameStateChange?.(false);
        }
    });

    function destroy() {
        removeAllListeners();
    }

    return { destroy };
}
