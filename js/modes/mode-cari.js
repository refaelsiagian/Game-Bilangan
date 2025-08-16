import { terbilang, generateRandomNumberByDifficulty, findFixedIndices } from '../utils.js';

export async function init(core, { container, onGameStateChange } = {}) {
    let targetNumber = "";
    let targetDigits = [];
    let displayDigits = [];
    let wrongIndices = [];
    let selectedIndices = [];
    let listeners = [];

    // === RENDER UI ===
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

        <!-- Tombol Mulai -->
        <div class="text-center mb-3">
            <button id="start-btn" class="btn btn-info">Mulai</button>
            <button id="submit-btn" class="btn btn-success" disabled>Periksa</button>
        </div>

        <div class="text-center">
            <div id="feedback" class="fw-bold fs-5"></div>
        </div>
        `;
    }

    // === Query helper ===
    function queryDOM() {
        return {
            targetNumberElement: container.querySelector("#target-number"),
            hasilKataElement: container.querySelector("#hasil-kata"),
            startBtn: container.querySelector("#start-btn"),
            submitBtn: container.querySelector("#submit-btn"),
            difficultySelect: container.querySelector("#difficulty"),
            feedback: container.querySelector("#feedback")
        };
    }

    // === Listener helpers ===
    function addListener(el, evt, handler) {
        if (!el) return;
        el.addEventListener(evt, handler);
        listeners.push([el, evt, handler]);
    }
    function removeAllListeners() {
        listeners.forEach(([el, evt, handler]) => el.removeEventListener(evt, handler));
        listeners = [];
    }

    // === Render slots ===
    function renderSlots(digits) {
        const { targetNumberElement } = queryDOM();
        targetNumberElement.innerHTML = "";

        for (let i = 0; i < digits.length; i++) {
            const span = document.createElement("span");
            span.classList.add("digit");
            span.dataset.index = i;
            span.textContent = digits[i];

            // klik toggle pilih
            addListener(span, 'click', () => toggleSelect(i, span));

            targetNumberElement.appendChild(span);

            if ((i + 1) % 3 === 0 && i !== digits.length - 1) {
                const sep = document.createElement("span");
                sep.classList.add("sep");
                sep.textContent = ".";
                targetNumberElement.appendChild(sep);
            }
        }
    }

    // === Toggle select ===
    function toggleSelect(index, element) {
        const state = core.getState();
        if (!state.running) return; // only when running
        if (selectedIndices.includes(index)) {
            selectedIndices = selectedIndices.filter(i => i !== index);
            element.classList.remove("selected");
        } else {
            selectedIndices.push(index);
            element.classList.add("selected");
        }
    }

    // === Inject wrong digits (ke displayDigits) ===
    function injectWrongDigits(difficulty) {
        wrongIndices = [];
        const fixedIndices = difficulty === 'mudah' ? findFixedIndices(targetDigits) : [];
        const usedIndices = new Set();

        let wrongCount = (difficulty === "mudah") ? (Math.floor(Math.random() * 3) + 1) : (Math.floor(Math.random() * 5) + 1);

        while (wrongIndices.length < wrongCount) {
            const idx = Math.floor(Math.random() * targetDigits.length);
            if (usedIndices.has(idx) || fixedIndices.includes(idx)) continue;

            // Don't put wrong indices adjacent
            if (wrongIndices.some(existing => Math.abs(existing - idx) === 1)) continue;
            usedIndices.add(idx);
            wrongIndices.push(idx);
        }

        wrongIndices.forEach(idx => {
            const original = targetDigits[idx];
            let newDigit;
            do {
                newDigit = String(Math.floor(Math.random() * 10));
            } while (newDigit === original);
            displayDigits[idx] = newDigit;
        });
    }

    // === nextQuestion (mode's implementation) ===
    function nextQuestion() {
        selectedIndices = [];
        wrongIndices = [];
        showFeedback('', '');

        const { difficultySelect, hasilKataElement } = queryDOM();
        const difficulty = difficultySelect?.value || 'sedang';

        targetNumber = generateRandomNumberByDifficulty(difficulty);
        targetDigits = targetNumber.split("");

        displayDigits = [...targetDigits];
        injectWrongDigits(difficulty);

        hasilKataElement.textContent = terbilang(targetNumber);
        hasilKataElement.classList.remove('text-secondary');

        renderSlots(displayDigits);
    }

    // === checkAnswer ===
    function checkAnswer() {
        const state = core.getState();
        if (!state.running) return;

        const selectedSet = new Set(selectedIndices);
        const wrongSet = new Set(wrongIndices);

        // Mismatch size
        if (selectedSet.size !== wrongSet.size) {
            core.rules.onWrong?.(false);
            const updated = core.getState();
            if (updated.lives > 0) {
                showFeedback(`❌ Salah! Jumlah pilihan tidak sesuai. Sisa nyawa: ${updated.lives}`, "text-danger");
            }
            return;
        }

        // Check each selected is actually wrong
        for (let idx of selectedSet) {
            if (!wrongSet.has(idx)) {
                core.rules.onWrong?.(false);
                const updated = core.getState();
                if (updated.lives > 0) {
                    showFeedback(`❌ Salah! Ada digit yang salah pilih (Sisa nyawa: ${updated.lives})`, "text-danger");
                }
                return;
            }
        }

        // All good — benar
        core.rules.onCorrect?.();
        showFeedback('✅ Benar! Lanjut soal...', 'text-success');
    }

    // === UI helpers ===
    function showFeedback(message, className) {
        const { feedback } = queryDOM();
        if (!feedback) return;
        feedback.textContent = message;
        feedback.className = `fw-bold fs-5 ${className || ''}`;
    }

    // === Register mode API with core ===
    core.registerModeAPI({
        beforeStart() {
            renderUI();
            const { startBtn, submitBtn } = queryDOM();

            addListener(startBtn, 'click', () => {
                const r = core.getState().running;
                r ? core.endGame("Game dihentikan") : core.startGame();
            });
            
            addListener(submitBtn, 'click', () => {
                checkAnswer();
            });

            // initial UI state
            submitBtn.disabled = true;
            showFeedback('', '');
        },

        afterStart() {
            const { startBtn, submitBtn, difficultySelect } = queryDOM();
            startBtn.textContent = "Akhiri";
            difficultySelect.disabled = true;
            submitBtn.disabled = false;

            nextQuestion();

            onGameStateChange?.(true);
        },

        beforeEnd() {
            // Mark wrong/selected and disable clicks
            const { targetNumberElement } = queryDOM();
            targetNumberElement.querySelectorAll('.digit').forEach((slot, index) => {
                if (wrongIndices.includes(index)) {
                    slot.classList.add("wrong-actual");
                    slot.classList.remove("selected");
                } else if (selectedIndices.includes(index)) {
                    slot.classList.add("selected");
                }
                slot.classList.add("disabled");
            });

            // Ensure submit disabled
            const { submitBtn } = queryDOM();
            if (submitBtn) submitBtn.disabled = true;
        },

        afterEnd(message) {
            const { startBtn, difficultySelect, hasilKataElement } = queryDOM();
            showFeedback(message || '', "text-info");

            startBtn.textContent = "Mulai Lagi";
            startBtn.disabled = false;
            difficultySelect.disabled = false;

            onGameStateChange?.(false);
        },

        // Implement nextQuestion so category's core.nextQuestion() will call this
        nextQuestion
    });

    function destroy() {
        removeAllListeners();
    }

    return { destroy };
}
