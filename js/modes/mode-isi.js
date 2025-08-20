import { terbilang, generateRandomNumberByDifficulty, findFixedIndices } from '../utils.js';

export async function init(core, { container, onGameStateChange } = {}) {
    let targetNumber = "";
    let targetDigits = [];
    let filledSlots = [];
    let highlightedIndex = null;
    let listeners = [];

    // === RENDER UI  ===
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

        <!-- Tombol Angka -->
        <div class="text-center mb-3 number-buttons"></div>

        <!-- Tombol Mulai -->
        <div class="text-center mb-3">
            <button id="start-btn" class="btn btn-info">Mulai</button>
        </div>

        <div class="text-center">
            <div id="feedback" class="fw-bold fs-5"></div>
        </div>
        `;
    }

    // === Query DOM helper ===
    function queryDOM() {
        return {
            targetNumberElement: container.querySelector("#target-number"),
            hasilKataElement: container.querySelector("#hasil-kata"),
            startBtn: container.querySelector("#start-btn"),
            difficultySelect: container.querySelector("#difficulty"),
            feedback: container.querySelector("#feedback"),
            numberButtonsContainer: container.querySelector(".number-buttons"),
        };
    }

    // === Feedback helper ===
    function showFeedback(message, className) {
        const { feedback } = queryDOM();
        if (!feedback) return;
        feedback.textContent = message;
        feedback.className = `fw-bold fs-5 ${className}`;
    }

    // === Number buttons ===
    function buildNumberButtons() {
        const { numberButtonsContainer } = queryDOM();
        numberButtonsContainer.innerHTML = "";
        for (let i = 0; i <= 9; i++) {
            const btn = document.createElement("button");
            btn.className = "btn btn-outline-primary m-1";
            btn.textContent = i;
            addListener(btn, 'click', () => handleNumberClick(i));
            numberButtonsContainer.appendChild(btn);
        }
    }

    function toggleNumberButtons(enabled) {
        const { numberButtonsContainer } = queryDOM();
        Array.from(numberButtonsContainer.querySelectorAll('button')).forEach(b => b.disabled = !enabled);
    }

    // === Render slots ===
    function renderSlots(digits, difficulty) {
        const { targetNumberElement } = queryDOM();
        targetNumberElement.innerHTML = "";
        filledSlots = [];

        const fixedIndices = (difficulty === "mudah") ? findFixedIndices(digits) : [];

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

    // === Highlight slot ===
    function highlightRandomSlot() {
        const { targetNumberElement } = queryDOM();
        targetNumberElement.querySelectorAll(".digit").forEach(slot => slot.classList.remove("highlight"));
        const remaining = [];
        for (let i = 0; i < targetDigits.length; i++) {
            if (!filledSlots.includes(i)) remaining.push(i);
        }

        if (remaining.length === 0) {
            highlightedIndex = null;
            return;
        }

        highlightedIndex = remaining[Math.floor(Math.random() * remaining.length)];
        const el = targetNumberElement.querySelector(`.digit[data-index="${highlightedIndex}"]`);
        if (el) el.classList.add("highlight");
    }

    // === Generate target ===
    function generateAndRenderTarget() {
        const { hasilKataElement, difficultySelect } = queryDOM();
        hasilKataElement.classList.add('text-secondary');
        hasilKataElement.textContent = 'Klik "Mulai" untuk menampilkan angka terbilang...';

        const difficulty = difficultySelect?.value || 'sedang';
        targetNumber = generateRandomNumberByDifficulty(difficulty);
        core.rules.difficulty = difficulty;
        targetDigits = targetNumber.split('');
        renderSlots(targetDigits, difficulty);

        hasilKataElement.textContent = terbilang(targetNumber);
        hasilKataElement.classList.remove('text-secondary');

        highlightRandomSlot();
    }

    // === Logic klik angka ===
    function handleNumberClick(num) {
        const state = core.getState();
        if (!state.running || highlightedIndex === null) return;

        const currentSlotIndex = highlightedIndex;
        const correctDigit = targetDigits[currentSlotIndex];
        const { difficultySelect } = queryDOM();
        const difficulty = difficultySelect?.value || 'sedang';

        if (correctDigit === String(num)) {
            const slot = queryDOM().targetNumberElement.querySelector(`.digit[data-index="${currentSlotIndex}"]`);
            if (slot) {
                slot.textContent = num;
                slot.classList.add("filled");
            }
            if (!filledSlots.includes(currentSlotIndex)) filledSlots.push(currentSlotIndex);

            showFeedback("✅ Benar!", "text-success");

            // cek selesai
            if (filledSlots.length === targetDigits.length) {
                core.rules.onCorrect?.();
                showFeedback('🎉 Selamat! Jawaban benar!', 'text-success');
                return;
            }

            // di mode sulit atau setelah benar, ganti slot
            if (difficulty === "sulit" || correctDigit === String(num)) {
                highlightRandomSlot();
            }
        } else {
            core.rules.onWrong?.();

            const updated = core.getState();
            if (updated.lives > 0) {
                showFeedback(`❌ Salah! Coba lagi. (Sisa nyawa: ${updated.lives})`, "text-danger");
            }
        }
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

    // === Core mode API registration ===
    core.registerModeAPI({
        beforeStart() {
            renderUI();
            buildNumberButtons();
            toggleNumberButtons(false);
            showFeedback('', '');

            const { startBtn } = queryDOM();
            addListener(startBtn, 'click', () => {
                const running = core.getState().running;
                running ? core.endGame("Game dihentikan") : core.startGame();
            });
        },

        afterStart() {
            const { startBtn, difficultySelect } = queryDOM();
            startBtn.textContent = "Akhiri";
            difficultySelect.disabled = true;
            toggleNumberButtons(true);
            showFeedback('', '');

            generateAndRenderTarget();
            onGameStateChange?.(true);
        },

        beforeEnd() {
            // Fill missed slots with target digits
            const { targetNumberElement } = queryDOM();
            targetNumberElement.querySelectorAll('.digit').forEach((slot, index) => {
                if (!filledSlots.includes(index)) {
                    slot.textContent = targetDigits[index];
                    slot.classList.add('missed');
                }
            });
            toggleNumberButtons(false);
        },

        afterEnd(message) {
            const { startBtn, difficultySelect } = queryDOM();
            showFeedback(message, "text-info");

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
