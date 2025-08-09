import { terbilang, generateRandomNumberByDifficulty, shuffleArray, findFixedIndices } from '../utils.js';

export function init({ container, scoreElement, timerElement, onGameStateChange }) {
    // === GAME STATE ===
    let score = 0;
    let timer = 60;
    let timerInterval = null;
    let gameActive = false;
    let correctAnswer = "";
    let targetNumber = "";
    let hintPositions = [];

    // === RENDER UI ===
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

    // === ELEMENT REFERENCES ===
    const targetNumberElement = container.querySelector("#target-number");
    const startBtn = container.querySelector("#start-btn");
    const difficultySelect = container.querySelector("#difficulty");
    const feedback = container.querySelector("#feedback");
    const optionButtons = [
        document.getElementById("option-1"),
        document.getElementById("option-2"),
        document.getElementById("option-3"),
        document.getElementById("option-4")
    ];

    // === EVENT LISTENERS ===
    startBtn.addEventListener('click', () => {
        gameActive ? endGame('Game diakhiri!') : startGame();
    });

    optionButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            if (!gameActive) return;
            checkAnswer(btn.dataset.value, btn);
        });
    });

    function startGame() {
        score = 0;
        timer = 60;
        gameActive = true;
        startBtn.textContent = "Akhiri";
        feedback.textContent = "";
        scoreElement.textContent = score;

        if (onGameStateChange) onGameStateChange(true);

        difficultySelect.disabled = true;

        optionButtons.forEach(btn => {
            btn.disabled = false;
            btn.classList.remove("btn-success");
            btn.classList.remove("btn-danger");
            btn.classList.add("btn-outline-primary");
        });

        nextQuestion(); // ✅ panggil ini

        timerElement.textContent = timer;
        timerInterval = setInterval(() => {
            timer--;
            timerElement.textContent = timer;
            if (timer <= 0) endGame("⏰ Waktu habis!");
        }, 1000);
    }

    function endGame(message) {
        clearInterval(timerInterval);
        gameActive = false;
        startBtn.textContent = "Mulai Lagi";
        showFeedback(message, "text-info");

        if (onGameStateChange) onGameStateChange(false);

        difficultySelect.disabled = false;

        // Reveal angka penuh
        revealFullNumber();

        // Highlight jawaban benar
        optionButtons.forEach(btn => {
            btn.disabled = true;
            if (btn.dataset.value === terbilang(correctAnswer)) {
                btn.classList.remove("btn-outline-primary");
                btn.classList.add("btn-success");
            }
        });
    }

    function renderSlots(digits, difficulty, hintPositions) {
        targetNumberElement.innerHTML = "";
        
        const fixedIndices = difficulty === "mudah" ? findFixedIndices(digits) : [];

        for (let i = 0; i < digits.length; i++) {
            const span = document.createElement("span");
            span.classList.add("digit");
            span.dataset.index = i;

            if (fixedIndices.includes(i) || hintPositions.includes(i)) {
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

    function checkAnswer(selectedText, selectedBtn) {
        // Disable semua tombol
        optionButtons.forEach(btn => btn.disabled = true);

        const isCorrect = (selectedText === terbilang(correctAnswer));

        if (isCorrect) {
            selectedBtn.classList.remove("btn-outline-primary");
            selectedBtn.classList.add("btn-success");
            score += 10;
            scoreElement.textContent = score;
        } else {
            selectedBtn.classList.remove("btn-outline-primary");
            selectedBtn.classList.add("btn-danger");
            // Tandai jawaban benar
            optionButtons.forEach(btn => {
                if (btn.dataset.value === terbilang(correctAnswer)) {
                    btn.classList.remove("btn-outline-primary");
                    btn.classList.add("btn-success");
                }
            });
        }

        revealFullNumber(); // Tampilkan semua digit

        setTimeout(() => {
            if (!gameActive || timer <= 0) return; // <--- Tambahkan ini
            optionButtons.forEach(btn => {
                btn.disabled = false;
                btn.className = "btn btn-outline-primary option-btn"; // Reset style
            });
            nextQuestion();
        }, 1500); // Delay 1.5 detik
    }

    function nextQuestion() {
        const difficulty = difficultySelect.value;
        targetNumber = generateRandomNumberByDifficulty(difficulty);
        const digits = targetNumber.split("");

        const totalDigits = digits.length;
        const hintCount = (difficulty === "mudah") ? 3 : 5;

        // Cari posisi tripel 000 untuk mode mudah
        const fixedIndices = (difficulty === "mudah") ? findFixedIndices(digits) : [];

        // Pilih hint tanpa overlap dengan fixedIndices dan tidak berdempetan
        hintPositions = [];
        while (hintPositions.length < hintCount) {
            const pos = Math.floor(Math.random() * totalDigits);
            const isClose = hintPositions.some(existing => Math.abs(existing - pos) <= 1);
            if (!fixedIndices.includes(pos) && !isClose && !hintPositions.includes(pos)) {
                hintPositions.push(pos);
            }
        }
        hintPositions.sort((a, b) => a - b);

        // Render tampilan
        renderSlots(digits, difficulty, hintPositions);

        // Generate jawaban (tidak berubah)
        correctAnswer = targetNumber;
        const options = [terbilang(correctAnswer)];
        while (options.length < 4) {
            const wrongNumber = createWrongOption(difficulty);
            const wrongText = terbilang(wrongNumber);
            if (!options.includes(wrongText)) options.push(wrongText);
        }

        shuffleArray(options);
        optionButtons.forEach((btn, i) => {
            btn.textContent = options[i];
            btn.dataset.value = options[i];
        });
    }

    function revealFullNumber() {
        const spans = targetNumberElement.querySelectorAll(".digit");
        for (let i = 0; i < spans.length; i++) {
            if (spans[i].textContent === "_") {
                spans[i].textContent = targetNumber[i];
                spans[i].classList.add("missed");
            }
        }
    }

    function createWrongOption(difficulty) {
        let wrongDigits;
        let wrongTriples;

        // Cari posisi dua tripel '000' dari targetNumber
        const targetTriples = findFixedIndices(targetNumber.split(""));

        do {
            const candidate = generateRandomNumberByDifficulty(difficulty);
            wrongDigits = candidate.split("");
            wrongTriples = findFixedIndices(wrongDigits);
        } while (!triplesMatch(targetTriples, wrongTriples));

        // Ganti semua hint sesuai angka target
        hintPositions.forEach(pos => {
            wrongDigits[pos] = targetNumber[pos];
        });

        const { posToSwap, swapPos } = pickSwapPositions(hintPositions, wrongDigits);

        // Lakukan swap
        const temp = wrongDigits[posToSwap];
        wrongDigits[posToSwap] = wrongDigits[swapPos];
        wrongDigits[swapPos] = temp;

        return wrongDigits.join("");
    }

    // Bandingkan posisi tripel antara target dan kandidat
    function triplesMatch(targetTriples, wrongTriples) {
        if (targetTriples.length !== wrongTriples.length) return false;
        for (let i = 0; i < targetTriples.length; i++) {
            if (targetTriples[i] !== wrongTriples[i]) return false;
        }
        return true;
    }

    function pickSwapPositions(hintPositions, wrongDigits) {
        // Pilih posisi awal dari hintPositions
        for (let attempt = 0; attempt < hintPositions.length; attempt++) {
            const posToSwap = hintPositions[Math.floor(Math.random() * hintPositions.length)];

            // Cek kiri dan kanan
            const leftValid = posToSwap > 0 && wrongDigits[posToSwap - 1] !== wrongDigits[posToSwap];
            const rightValid = posToSwap < wrongDigits.length - 1 && wrongDigits[posToSwap + 1] !== wrongDigits[posToSwap];

            if (leftValid || rightValid) {
                // Pilih arah valid
                const swapPos = leftValid && rightValid
                    ? (Math.random() < 0.5 ? posToSwap - 1 : posToSwap + 1)
                    : (leftValid ? posToSwap - 1 : posToSwap + 1);

                return { posToSwap, swapPos };
            }
        }

        // Jika semua gagal, fallback: pilih posisi acak yang bukan hint
        const fallbackIndex = wrongDigits.findIndex((_, idx) => !hintPositions.includes(idx));
        const fallbackSwap = fallbackIndex + (fallbackIndex < wrongDigits.length - 1 ? 1 : -1);
        return { posToSwap: fallbackIndex, swapPos: fallbackSwap };
    }

    function showFeedback(message, className) {
        feedback.textContent = message;
        feedback.className = `fw-bold fs-5 ${className}`;
    }

    function destroy() {
        clearInterval(timerInterval);
    }

    return { destroy };
}
