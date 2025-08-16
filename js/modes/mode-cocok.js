// modes/mode-cocok.js
import { terbilang, generateRandomNumberByDifficulty, shuffleArray, findFixedIndices } from '../utils.js';

export async function init(core, { container, onGameStateChange } = {}) {
    // === State variables ===
    let correctAnswer = "";
    let targetNumber = "";
    let hintPositions = [];
    let listeners = [];

    // === Render UI ===
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

        <!-- Pilihan Jawaban -->
        <div class="row mb-3 g-2">
            <div class="col-12 col-md-6 d-flex">
                <button class="btn btn-outline-primary w-100 h-100 option-btn" id="option-1">PILIHAN 1</button>
            </div>
            <div class="col-12 col-md-6 d-flex">
                <button class="btn btn-outline-primary w-100 h-100 option-btn" id="option-2">PILIHAN 2</button>
            </div>
            <div class="col-12 col-md-6 d-flex">
                <button class="btn btn-outline-primary w-100 h-100 option-btn" id="option-3">PILIHAN 3</button>
            </div>
            <div class="col-12 col-md-6 d-flex">
                <button class="btn btn-outline-primary w-100 h-100 option-btn" id="option-4">PILIHAN 4</button>
            </div>
        </div>

        <!-- Tombol Mulai -->
        <div class="text-center mb-3">
            <button id="start-btn" class="btn btn-info">Mulai</button>
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
            startBtn: container.querySelector("#start-btn"),
            difficultySelect: container.querySelector("#difficulty"),
            feedback: container.querySelector("#feedback"),
            optionButtons: [
                container.querySelector("#option-1"),
                container.querySelector("#option-2"),
                container.querySelector("#option-3"),
                container.querySelector("#option-4")
            ]
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

    // === UI helpers ===
    function showFeedback(message, className) {
        const { feedback } = queryDOM();
        if (!feedback) return;
        feedback.textContent = message;
        feedback.className = `fw-bold fs-5 ${className || ''}`;
    }
    function setOptionButtonsState(enabled) {
        const { optionButtons } = queryDOM();
        optionButtons.forEach(btn => {
            if (btn) btn.disabled = !enabled;
        });
    }
    function resetOptionButtonsStyle() {
        const { optionButtons } = queryDOM();
        optionButtons.forEach(btn => {
            if (!btn) return;
            btn.className = "btn btn-outline-primary option-btn";
            btn.disabled = false;
        });
    }

    function renderSlots(digits, difficulty, hintPositionsLocal = []) {
        const { targetNumberElement } = queryDOM();
        targetNumberElement.innerHTML = "";

        const fixedIndices = difficulty === "mudah" ? findFixedIndices(digits) : [];

        for (let i = 0; i < digits.length; i++) {
            const span = document.createElement("span");
            span.classList.add("digit");
            span.dataset.index = i;

            if (fixedIndices.includes(i) || hintPositionsLocal.includes(i)) {
                span.textContent = digits[i];
                span.classList.add("fixed");
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

    function revealFullNumber() {
        const { targetNumberElement } = queryDOM();
        const spans = targetNumberElement.querySelectorAll(".digit");
        for (let i = 0; i < spans.length; i++) {
            if (spans[i].textContent === "_") {
                spans[i].textContent = targetNumber[i];
                spans[i].classList.add('missed');
            }
        }
    }

    // === Question generation ===
    function nextQuestionInternal() {
        // Reset UI
        resetOptionButtonsStyle();
        showFeedback('', '');
        setOptionButtonsState(true);

        const { difficultySelect, optionButtons } = queryDOM();
        const difficulty = difficultySelect?.value || 'sedang';
        targetNumber = generateRandomNumberByDifficulty(difficulty);
        const digits = targetNumber.split("");

        const totalDigits = digits.length;
        const hintCount = (difficulty === "mudah") ? 3 : 5;
        const fixedIndices = (difficulty === "mudah") ? findFixedIndices(digits) : [];

        // Build hintPositions (no overlap with fixedIndices and not adjacent)
        hintPositions = [];
        while (hintPositions.length < hintCount) {
            const pos = Math.floor(Math.random() * totalDigits);
            const isClose = hintPositions.some(existing => Math.abs(existing - pos) <= 1);
            if (!fixedIndices.includes(pos) && !isClose && !hintPositions.includes(pos)) {
                hintPositions.push(pos);
            }
        }
        hintPositions.sort((a, b) => a - b);

        renderSlots(digits, difficulty, hintPositions);

        correctAnswer = targetNumber;

        // Build options: 1 correct + 3 wrong (using createWrongOption logic)
        const options = [terbilang(correctAnswer)];
        while (options.length < 4) {
            const wrongNumber = createWrongOption(difficulty);
            const wrongText = terbilang(wrongNumber);
            if (!options.includes(wrongText)) options.push(wrongText);
        }

        shuffleArray(options);
        optionButtons.forEach((btn, i) => {
            if (!btn) return;
            btn.textContent = options[i];
            btn.dataset.value = options[i];
            btn.disabled = false;
        });
    }

    // === Answer checking ===
    function checkAnswer(selectedText, selectedBtn) {
        if (!core.getState().running) return;

        // Disable to avoid multi-click
        setOptionButtonsState(false);

        const isCorrect = (selectedText === terbilang(correctAnswer));

        // reveal and mark buttons
        if (isCorrect) {
            if (selectedBtn) {
                selectedBtn.classList.remove("btn-outline-primary");
                selectedBtn.classList.add("btn-success");
            }
        } else {
            if (selectedBtn) {
                selectedBtn.classList.remove("btn-outline-primary");
                selectedBtn.classList.add("btn-danger");
            }
            // Highlight correct
            const { optionButtons } = queryDOM();
            optionButtons.forEach(btn => {
                if (!btn) return;
                if (btn.dataset.value === terbilang(correctAnswer)) {
                    btn.classList.remove("btn-outline-primary");
                    btn.classList.add("btn-success");
                }
            });
        }

        revealFullNumber();
        isCorrect ? core.rules.onCorrect?.() : core.rules.onWrong?.(true);
    }

    function createWrongOption(difficulty) {
        let wrongDigits;
        let wrongTriples;
        const targetTriples = findFixedIndices(targetNumber.split(""));

        do {
            const candidate = generateRandomNumberByDifficulty(difficulty);
            wrongDigits = candidate.split("");
            wrongTriples = findFixedIndices(wrongDigits);
        } while (!triplesMatch(targetTriples, wrongTriples));

        // Replace hint positions with target digits
        hintPositions.forEach(pos => {
            wrongDigits[pos] = targetNumber[pos];
        });

        const { posToSwap, swapPos } = pickSwapPositions(hintPositions, wrongDigits);

        // Swap
        const temp = wrongDigits[posToSwap];
        wrongDigits[posToSwap] = wrongDigits[swapPos];
        wrongDigits[swapPos] = temp;

        return wrongDigits.join("");
    }

    function triplesMatch(targetTriples, wrongTriples) {
        if (targetTriples.length !== wrongTriples.length) return false;
        for (let i = 0; i < targetTriples.length; i++) {
            if (targetTriples[i] !== wrongTriples[i]) return false;
        }
        return true;
    }

    function pickSwapPositions(hintPositionsLocal, wrongDigits) {
        for (let attempt = 0; attempt < hintPositionsLocal.length; attempt++) {
            const posToSwap = hintPositionsLocal[Math.floor(Math.random() * hintPositionsLocal.length)];
            const leftValid = posToSwap > 0 && wrongDigits[posToSwap - 1] !== wrongDigits[posToSwap];
            const rightValid = posToSwap < wrongDigits.length - 1 && wrongDigits[posToSwap + 1] !== wrongDigits[posToSwap];

            if (leftValid || rightValid) {
                const swapPos = leftValid && rightValid
                    ? (Math.random() < 0.5 ? posToSwap - 1 : posToSwap + 1)
                    : (leftValid ? posToSwap - 1 : posToSwap + 1);
                return { posToSwap, swapPos };
            }
        }

        const fallbackIndex = wrongDigits.findIndex((_, idx) => !hintPositionsLocal.includes(idx));
        const fallbackSwap = fallbackIndex + (fallbackIndex < wrongDigits.length - 1 ? 1 : -1);
        return { posToSwap: fallbackIndex, swapPos: fallbackSwap };
    }

    // === Mode API registration with core ===
    core.registerModeAPI({
        beforeStart() {
            renderUI();

            const { startBtn, optionButtons } = queryDOM();

            addListener(startBtn, 'click', () => {
                const running = core.getState().running;
                running ? core.endGame("Game dihentikan") : core.startGame();
            });

            optionButtons.forEach(btn => {
                if (!btn) return;
                addListener(btn, 'click', () => {
                    if (!core.getState().running) return;
                    checkAnswer(btn.dataset.value, btn);
                });
            });

            setOptionButtonsState(false);
        },

        afterStart() {
            const { startBtn, difficultySelect } = queryDOM();
            startBtn.textContent = "Akhiri";
            if (difficultySelect) difficultySelect.disabled = true;
            resetOptionButtonsStyle();
            setOptionButtonsState(true);

            nextQuestionInternal();
            onGameStateChange?.(true);
        },

        nextQuestion() {
            setTimeout(() => {
                if (!core.getState().running) return;
                nextQuestionInternal();
            }, 1500);
        },

        beforeEnd() {
            revealFullNumber();
            setOptionButtonsState(false);

            const { optionButtons } = queryDOM();
            optionButtons.forEach(btn => {
                btn.disabled = true;
                if (btn.dataset.value === terbilang(correctAnswer)) {
                    btn.classList.remove("btn-outline-primary");
                    btn.classList.add("btn-success");
                }
            });
        },

        afterEnd(message) {
            const { startBtn, difficultySelect } = queryDOM();
            showFeedback(message, "text-info");
            startBtn.textContent = "Mulai Lagi";
            if (difficultySelect) difficultySelect.disabled = false;
            onGameStateChange?.(false);
        }
    });

    function destroy() {
        removeAllListeners();
    }

    return { destroy };
}
