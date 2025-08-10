import { terbilang, generateRandomNumberByDifficulty, shuffleArray, findFixedIndices } from '../utils.js';

export function init({ container, scoreElement, timerElement, onGameStateChange }) {
    // ===== STATE =====
    let score = 0;
    let timer = 60;
    let timerInterval = null;
    let blinkInterval = null;
    let gameActive = false;

    let targetNumber = "";
    let digits = [];
    let fixedDigitIndices = [];
    let blinkPositions = [];
    let prevBlinkPositions = [];
    let prevBlinkPositions2 = []; // simpan 2 blink sebelumnya
    let difficulty = "sedang";

    let options = [];
    let currentOptionIndex = 0;

    // ===== UI =====
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

    // ===== ELEMENT REFERENCES =====
    const targetNumberElement = container.querySelector("#target-number");
    const startBtn = container.querySelector("#start-btn");
    const difficultySelect = container.querySelector("#difficulty");
    const feedback = container.querySelector("#feedback");

    const optionViewer = container.querySelector("#option-viewer");
    const prevBtn = container.querySelector("#prev-btn");
    const nextBtn = container.querySelector("#next-btn");
    const submitBtn = container.querySelector("#submit-btn");
    const optionIndexEl = container.querySelector("#option-index");

    setControlsEnabled(false);

    // ===== EVENTS =====
    startBtn.addEventListener("click", () => {
        if (gameActive) {
            endGame("Game diakhiri.");
        } else {
            startGame();
        }
    });

    prevBtn.addEventListener("click", () => {
        if (options.length === 0) return;
        currentOptionIndex = (currentOptionIndex - 1 + options.length) % options.length;
        renderCurrentOption();
    });

    nextBtn.addEventListener("click", () => {
        if (options.length === 0) return;
        currentOptionIndex = (currentOptionIndex + 1) % options.length;
        renderCurrentOption();
    });

    submitBtn.addEventListener("click", () => {
        if (!gameActive || options.length === 0) return;
        handleSubmit();
    });

    // ===== GAME FLOW =====
    function startGame() {
        score = 0;
        timer = 60;
        gameActive = true;
        difficulty = difficultySelect.value;
        startBtn.textContent = "Akhiri";
        scoreElement.textContent = score;
        timerElement.textContent = timer;
        showFeedback("", "");

        difficultySelect.disabled = true;
        setControlsEnabled(true);

        if (onGameStateChange) onGameStateChange(true);

        nextQuestion();

        timerInterval = setInterval(() => {
            timer--;
            timerElement.textContent = timer;
            if (timer <= 0) {
                endGame("⏰ Waktu habis!");
            }
        }, 1000);
    }

    function endGame(message) {
        clearInterval(timerInterval);
        clearInterval(blinkInterval);
        gameActive = false;
        startBtn.textContent = "Mulai Lagi";
        showFeedback(message, "text-info");
        difficultySelect.disabled = false;

        // Tetap bisa lihat opsi
        setControlsEnabled(true);

        revealFullNumber();

        // Tandai jawaban benar
        const correctIndex = options.findIndex(o => o.isCorrect);
        if (correctIndex !== -1) {
            options[correctIndex].status = "correct";
            currentOptionIndex = correctIndex; // langsung tampilkan yang benar
        }

        renderCurrentOption();

        if (onGameStateChange) onGameStateChange(false);
    }



    function nextQuestion() {
        clearInterval(blinkInterval);
        blinkPositions = [];
        options = [];
        currentOptionIndex = 0;
        showFeedback("", "");

        difficulty = difficultySelect.value;

        targetNumber = generateRandomNumberByDifficulty(difficulty);
        digits = targetNumber.split("");

        // Langsung cari digit tetap (max 2 triple) pakai fungsi di utils.js
        fixedDigitIndices = difficulty === "mudah" ? findFixedIndices(digits) : [];

        const correctText = terbilang(targetNumber);
        const wrongTexts = generateWrongOptions(targetNumber, difficulty, 7, fixedDigitIndices);
        const allOptions = [correctText, ...wrongTexts];
        shuffleArray(allOptions);

        // simpan status setiap opsi
        options = allOptions.map(txt => ({
            text: txt,
            isCorrect: txt === correctText,
            status: "normal"
        }));
        currentOptionIndex = 0;
        renderCurrentOption();

        // jalankan efek kedip
        blinkInterval = setInterval(() => {
            chooseBlinkPositions();
            renderSlots();
        }, 700);

        renderSlots();
    }


    function renderSlots(revealAll = false) {
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
        if (!options || options.length === 0) {
            optionViewer.textContent = "-- Tidak ada opsi --";
            optionIndexEl.textContent = `0 / 0`;
            return;
        }
        const opt = options[currentOptionIndex];
        optionViewer.innerHTML = `<div style="padding:6px;">${opt.text}</div>`;
        optionIndexEl.textContent = `${currentOptionIndex + 1} / ${options.length}`;

        if (opt.status === "wrong") {
            optionViewer.style.backgroundColor = "#dc3545"; // merah
            optionViewer.style.color = "#fff";
        } else if (opt.status === "correct") {
            optionViewer.style.backgroundColor = "#28a745"; // hijau
            optionViewer.style.color = "#fff";
        } else {
            optionViewer.style.backgroundColor = "#fafafa"; // putih
            optionViewer.style.color = "#000";
        }
    }


    function handleSubmit() {
        const selected = options[currentOptionIndex];
        if (!selected) return;

        if (selected.isCorrect) {
            score += 10;
            scoreElement.textContent = score;
            selected.status = "correct"; // tandai benar
            showFeedback("Benar! Lanjut ke soal berikutnya...", "text-success");
            revealFullNumber();
            clearInterval(blinkInterval);
            renderCurrentOption(); // update warna hijau

            setTimeout(() => {
                if (gameActive && timer > 0) nextQuestion();
            }, 900);
        } else {
            selected.status = "wrong"; // tandai salah
            showFeedback("Salah! Coba pilihan lain.", "text-danger");
            renderCurrentOption(); // update warna merah
        }
    }


    function chooseBlinkPositions() {
        const totalDigits = digits.length;
        let newPositions = [];

        // buat daftar posisi yang dipakai di dua blink terakhir
        const recentPositions = Array.from(new Set([...prevBlinkPositions, ...prevBlinkPositions2]));

        if (difficulty === "mudah") {
            const candidates = [];
            for (let i = 0; i < totalDigits; i++) {
                if (!fixedDigitIndices.includes(i) && !recentPositions.includes(i)) {
                    candidates.push(i);
                }
            }
            if (candidates.length === 0) {
                blinkPositions = [];
                return;
            }
            newPositions = [candidates[Math.floor(Math.random() * candidates.length)]];
        } else {
            const candidates = [];
            for (let i = 0; i < totalDigits; i++) {
                if (!recentPositions.includes(i)) {
                    candidates.push(i);
                }
            }
            if (candidates.length < 2) {
                blinkPositions = [];
                return;
            }
            shuffleArray(candidates);
            newPositions = candidates.slice(0, 2).sort((a, b) => a - b);
        }

        // update riwayat blink
        prevBlinkPositions2 = prevBlinkPositions;
        prevBlinkPositions = newPositions;
        blinkPositions = newPositions;
    }


    // ===== WRONG OPTIONS GENERATOR =====
    function generateWrongOptions(targetNumberStr, difficultyLevel, count, fixedDigitIndices) {
        const result = new Set();
        const correctText = terbilang(targetNumberStr);
        const digitsOriginal = targetNumberStr.split("");
        const totalDigits = digitsOriginal.length;

        // Cari triple start index yang boleh diacak (0, 3, 6, dst.)
        const availableTriples = [];
        for (let start = 0; start < totalDigits; start += 3) {
            // cek kalau triple ini semua digitnya fixed, skip
            if (fixedDigitIndices.includes(start) &&
                fixedDigitIndices.includes(start + 1) &&
                fixedDigitIndices.includes(start + 2)) {
                continue;
            }
            availableTriples.push(start);
        }

        let attempts = 0;
        while (result.size < count && attempts < 1000) {
            attempts++;

            // Pilih triple yang mau diacak
            let triplesToPermute = [];
            if (difficultyLevel === "mudah") {
                if (availableTriples.length === 0) {
                    triplesToPermute = [Math.floor(Math.random() * (totalDigits / 3)) * 3];
                } else {
                    triplesToPermute = [availableTriples[Math.floor(Math.random() * availableTriples.length)]];
                }
            } else {
                // pilih dua triple acak
                const shuffled = availableTriples.slice();
                shuffleArray(shuffled);
                triplesToPermute = shuffled.slice(0, 2);
            }

            // Salin digits asli untuk dimodifikasi
            const candidateDigits = digitsOriginal.slice();
            let valid = false;

            // Permutasi tiap triple yang dipilih
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

            if (wrongText !== correctText) {
                result.add(wrongText);
            }
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

    function showFeedback(message, className) {
        feedback.textContent = message;
        feedback.className = `fw-bold fs-5 ${className || ""}`;
    }

    function setControlsEnabled(enabled) {
        prevBtn.disabled = !enabled;
        nextBtn.disabled = !enabled;
        submitBtn.disabled = !enabled;
    }

    function destroy() {
        clearInterval(timerInterval);
        clearInterval(blinkInterval);
    }

    return { destroy };
}
