import { terbilang, generateRandomNumberByDifficulty, shuffleArray, findFixedIndices } from '../utils.js';

export async function init(core, { container, onGameStateChange } = {}) {
    // ===== STATE =====
    let targetNumber = "";
    let digits = [];
    let fixedDigitIndices = [];
    let blinkPositions = [];
    let prevBlinkPositions = [];
    let prevBlinkPositions2 = []; 
    let difficulty = "sedang";

    let options = [];
    let currentOptionIndex = 0;
    let blinkInterval = null;
    let listeners = [];

    // ===== UI RENDER =====
    function renderUI() {
        container.innerHTML = `
        <div class="row mb-3">
            <div class="col text-center">
                <div class="digital-slots" id="target-number">
                    ${'<span class="digit">_</span>'.repeat(3)}<span class="sep">.</span>
                    ${'<span class="digit">_</span>'.repeat(3)}<span class="sep">.</span>
                    ${'<span class="digit">_</span>'.repeat(3)}<span class="sep">.</span>
                    ${'<span class="digit">_</span>'.repeat(3)}<span class="sep">.</span>
                    ${'<span class="digit">_</span>'.repeat(3)}
                </div>
            </div>
        </div>

        <div class="row mb-3 text-center">
            <div class="col">
                <label>Pilih Kesulitan:</label>
                <select id="difficulty" class="form-select w-auto d-inline-block">
                    <option value="mudah">Mudah</option>
                    <option value="sedang" selected>Sedang</option>
                    <option value="sulit">Sulit</option>
                </select>
            </div>
        </div>

        <div class="row mb-4">
            <div class="col text-center">
                <button id="start-btn" class="btn btn-info">Mulai</button>
            </div>
        </div>

        <div class="row mb-3">
            <div class="col text-center">
                <div class="option-viewer" id="option-viewer">-- Tekan Mulai untuk memulai --</div>
            </div>
        </div>

        <div class="row mb-4">
            <div class="controls">
                <button id="prev-btn" class="btn btn-outline-secondary">Prev</button>
                <div id="option-index" style="align-self:center;">0 / 0</div>
                <button id="next-btn" class="btn btn-outline-secondary">Next</button>
            </div>
        </div>

        <div class="row mb-3">
            <div class="col text-center">
                <button id="submit-btn" class="btn btn-success btn-lg px-5">Submit</button>
            </div>
        </div>

        <div class="row">
            <div class="col text-center">
                <div id="feedback" class="fw-bold fs-5"></div>
            </div>
        </div>
        `;
    }

    // ===== QUERY HELPERS =====
    function queryDOM() {
        return {
            targetNumberElement: container.querySelector("#target-number"),
            startBtn: container.querySelector("#start-btn"),
            difficultySelect: container.querySelector("#difficulty"),
            feedback: container.querySelector("#feedback"),
            optionViewer: container.querySelector("#option-viewer"),
            prevBtn: container.querySelector("#prev-btn"),
            nextBtn: container.querySelector("#next-btn"),
            submitBtn: container.querySelector("#submit-btn"),
            optionIndexEl: container.querySelector("#option-index"),
            livesContainer: document.getElementById('lives')
        };
    }

    // ===== LISTENER HELPERS =====
    function addListener(el, evt, handler) {
        if (!el) return;
        el.addEventListener(evt, handler);
        listeners.push([el, evt, handler]);
    }
    function removeAllListeners() {
        listeners.forEach(([el, evt, handler]) => el.removeEventListener(evt, handler));
        listeners = [];
    }

    function renderLives() {
        const { livesContainer } = queryDOM();
        if (!livesContainer) return;
        const hearts = livesContainer.querySelectorAll('.heart');
        const l = core.getState().lives;
        hearts.forEach((heart, index) => {
            if (index < l) heart.classList.remove('empty');
            else heart.classList.add('empty');
        });
    }

    function renderSlots(revealAll = false) {
        const { targetNumberElement } = queryDOM();
        targetNumberElement.innerHTML = "";
        for (let i = 0; i < digits.length; i++) {
            const span = document.createElement("span");
            span.classList.add("digit");

            if (revealAll || fixedDigitIndices.includes(i) || blinkPositions.includes(i)) {
                span.textContent = digits[i];
                if (fixedDigitIndices.includes(i)) span.classList.add("fixed");
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
        blinkPositions = [];
        renderSlots(true);
    }

    function renderCurrentOption() {
        const { optionViewer, optionIndexEl } = queryDOM();
        if (!options || options.length === 0) {
            optionViewer.textContent = "-- Tidak ada opsi --";
            optionIndexEl.textContent = `0 / 0`;
            return;
        }
        const opt = options[currentOptionIndex];
        optionViewer.innerHTML = `<div style="padding:6px;">${opt.text}</div>`;
        optionIndexEl.textContent = `${currentOptionIndex + 1} / ${options.length}`;

        if (opt.status === "wrong") {
            optionViewer.style.backgroundColor = "#dc3545";
            optionViewer.style.color = "#fff";
        } else if (opt.status === "correct") {
            optionViewer.style.backgroundColor = "#28a745";
            optionViewer.style.color = "#fff";
        } else {
            optionViewer.style.backgroundColor = "#fafafa";
            optionViewer.style.color = "#000";
        }
    }

    function setControlsEnabled(enabled) {
        const { prevBtn, nextBtn, submitBtn } = queryDOM();
        if (prevBtn) prevBtn.disabled = !enabled;
        if (nextBtn) nextBtn.disabled = !enabled;
        if (submitBtn) submitBtn.disabled = !enabled;
    }

    function chooseBlinkPositions() {
        const totalDigits = digits.length;
        let newPositions = [];

        const recentPositions = Array.from(new Set([...prevBlinkPositions, ...prevBlinkPositions2]));

        if (difficulty === "mudah") {
            const candidates = [];
            for (let i = 0; i < totalDigits; i++) {
                if (!fixedDigitIndices.includes(i) && !recentPositions.includes(i)) candidates.push(i);
            }
            if (candidates.length === 0) {
                blinkPositions = [];
                return;
            }
            newPositions = [candidates[Math.floor(Math.random() * candidates.length)]];
        } else {
            const candidates = [];
            for (let i = 0; i < totalDigits; i++) {
                if (!recentPositions.includes(i)) candidates.push(i);
            }
            if (candidates.length < 2) {
                blinkPositions = [];
                return;
            }
            shuffleArray(candidates);
            newPositions = candidates.slice(0, 2).sort((a, b) => a - b);
        }

        prevBlinkPositions2 = prevBlinkPositions;
        prevBlinkPositions = newPositions;
        blinkPositions = newPositions;
    }

    function generateWrongOptions(targetNumberStr, difficultyLevel, count, fixedDigitIndicesParam) {
        const result = new Set();
        const correctText = terbilang(targetNumberStr);
        const digitsOriginal = targetNumberStr.split("");
        const totalDigits = digitsOriginal.length;

        const availableTriples = [];
        for (let start = 0; start < totalDigits; start += 3) {
            if (fixedDigitIndicesParam.includes(start) &&
                fixedDigitIndicesParam.includes(start + 1) &&
                fixedDigitIndicesParam.includes(start + 2)) {
                continue;
            }
            availableTriples.push(start);
        }

        let attempts = 0;
        while (result.size < count && attempts < 1000) {
            attempts++;
            let triplesToPermute = [];
            if (difficultyLevel === "mudah") {
                if (availableTriples.length === 0) {
                    triplesToPermute = [Math.floor(Math.random() * (totalDigits / 3)) * 3];
                } else {
                    triplesToPermute = [availableTriples[Math.floor(Math.random() * availableTriples.length)]];
                }
            } else {
                const shuffled = availableTriples.slice();
                shuffleArray(shuffled);
                triplesToPermute = shuffled.slice(0, 2);
            }

            const candidateDigits = digitsOriginal.slice();
            let valid = false;

            for (const start of triplesToPermute) {
                const tripleDigits = candidateDigits.slice(start, start + 3);
                const perm = pickPermutation(tripleDigits.join(""));
                if (perm && perm !== tripleDigits.join("")) {
                    candidateDigits.splice(start, 3, ...perm.split(""));
                    valid = true;
                } else {
                    valid = false;
                    break;
                }
            }

            if (!valid) continue;

            const wrongNumber = candidateDigits.join("");
            const wrongText = terbilang(wrongNumber);

            if (wrongText !== correctText) result.add(wrongText);
        }

        return Array.from(result).slice(0, count);
    }

    function pickPermutation(triple) {
        const chars = triple.split("");
        const perms = new Set();
        function permute(a, l, r) {
            if (l === r) perms.add(a.join(""));
            else {
                for (let i = l; i <= r; i++) {
                    [a[l], a[i]] = [a[i], a[l]];
                    permute(a, l + 1, r);
                    [a[l], a[i]] = [a[i], a[l]];
                }
            }
        }
        permute(chars.slice(), 0, chars.length - 1);
        const candidates = Array.from(perms).filter(p => p !== triple);
        if (candidates.length === 0) return null;
        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    function nextQuestion() {
        clearInterval(blinkInterval);
        blinkPositions = [];
        options = [];
        currentOptionIndex = 0;
        showFeedback("", "");

        difficulty = queryDOM().difficultySelect.value;
        targetNumber = generateRandomNumberByDifficulty(difficulty);
        digits = targetNumber.split("");
        fixedDigitIndices = (difficulty === "mudah") ? findFixedIndices(digits) : [];

        const correctText = terbilang(targetNumber);
        const wrongTexts = generateWrongOptions(targetNumber, difficulty, 7, fixedDigitIndices);
        const allOptions = [correctText, ...wrongTexts];
        shuffleArray(allOptions);

        options = allOptions.map(txt => ({
            text: txt,
            isCorrect: txt === correctText,
            status: "normal"
        }));

        currentOptionIndex = 0;
        renderCurrentOption();

        blinkInterval = setInterval(() => {
            chooseBlinkPositions();
            renderSlots();
        }, 700);

        renderSlots();
    }

    function handleSubmit() {
        const selected = options[currentOptionIndex];
        if (!selected) return;

        if (selected.isCorrect) {
            // Show full number and mark as correct
            selected.status = "correct";
            renderCurrentOption();
            showFeedback("Benar! Lanjut ke soal berikutnya...", "text-success");
            revealFullNumber();
            clearInterval(blinkInterval);

            core.rules.onCorrect?.();
        } else {
            core.rules.onWrong?.(false);

            const updated = core.getState();
            selected.status = "wrong";
            renderCurrentOption();

            if (updated.lives > 0) {
                showFeedback(`Salah! Coba lagi. Sisa nyawa: ${updated.lives}`, "text-danger");
            }
        }
    }

    function showFeedback(message, className) {
        const { feedback } = queryDOM();
        feedback.textContent = message;
        feedback.className = `fw-bold fs-5 ${className || ""}`;
    }

    // ===== Core mode API registration =====
    core.registerModeAPI({
        beforeStart() {
            renderUI();

            const { startBtn, prevBtn, nextBtn, submitBtn } = queryDOM();
            addListener(startBtn, 'click', () => {
                const running = core.getState().running;
                running ? core.endGame("Game dihentikan") : core.startGame();
            });

            addListener(prevBtn, 'click', () => {
                if (!options || options.length === 0) return;
                currentOptionIndex = (currentOptionIndex - 1 + options.length) % options.length;
                renderCurrentOption();
            });

            addListener(nextBtn, 'click', () => {
                if (!options || options.length === 0) return;
                currentOptionIndex = (currentOptionIndex + 1) % options.length;
                renderCurrentOption();
            });

            addListener(submitBtn, 'click', () => {
                const st = core.getState();
                if (!st.running) return;
                handleSubmit();
            });

            setControlsEnabled(false);
            showFeedback('', '');
        },

        afterStart() {
            const { startBtn, difficultySelect } = queryDOM();
            startBtn.textContent = "Akhiri";
            difficultySelect.disabled = true;
            setControlsEnabled(true);

            nextQuestion();
            onGameStateChange?.(true);
        },

        beforeEnd() {
            clearInterval(blinkInterval);
            revealFullNumber();

            // Show correct answer
            const ci = options.findIndex(o => o.isCorrect);
            if (ci !== -1) {
                options[ci].status = "correct";
                currentOptionIndex = ci;
            }
            renderCurrentOption();
            setControlsEnabled(true);
        },

        afterEnd(message) {
            const { startBtn, difficultySelect } = queryDOM();
            showFeedback(message, "text-info");
            startBtn.textContent = "Mulai Lagi";
            startBtn.disabled = false;
            difficultySelect.disabled = false;
            onGameStateChange?.(false);
        },

        nextQuestion() {
            setTimeout(() => {
                nextQuestion();
            }, 1000);
        }
    });

    function destroy() {
        clearInterval(blinkInterval);
        removeAllListeners();
    }

    return { destroy };
}
