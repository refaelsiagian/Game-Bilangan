import { terbilang, generateRandomNumberByDifficulty, findFixedIndices } from '../utils.js';

export function init({ container, scoreElement, timerElement, onGameStateChange }) {
    let targetNumber = "";
    let targetDigits = [];
    let filledSlots = [];
    let highlightedIndex = null;
    let score = 0;
    let timer = 60;
    let timerInterval = null;
    let gameActive = false;

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

    // === ELEMENT REFERENCES ===
    const targetNumberElement = container.querySelector("#target-number");
    const hasilKataElement = container.querySelector("#hasil-kata");
    const startBtn = container.querySelector("#start-btn");
    const difficultySelect = container.querySelector("#difficulty");
    const feedback = container.querySelector("#feedback");
    const numberButtonsContainer = container.querySelector(".number-buttons");

    // === INIT NUMBER BUTTONS (0-9) ===
    numberButtonsContainer.innerHTML = "";
    for (let i = 0; i <= 9; i++) {
        const btn = document.createElement("button");
        btn.className = "btn btn-outline-primary m-1";
        btn.textContent = i;
        btn.addEventListener("click", () => handleNumberClick(i));
        numberButtonsContainer.appendChild(btn);
    }

    // === EVENT LISTENERS ===
    startBtn.addEventListener('click', () => {
        gameActive ? endGame('Game diakhiri!') : startGame();
    });

    function startGame() {
        score = 0;
        timer = 60;
        filledSlots = [];
        highlightedIndex = null;
        gameActive = true;
        startBtn.textContent = "Akhiri";
        feedback.textContent = "";
        scoreElement.textContent = score;

        if (onGameStateChange) onGameStateChange(true);

        difficultySelect.disabled = true;

        const difficulty = difficultySelect.value;

        targetNumber = generateRandomNumberByDifficulty(difficulty);
        targetDigits = targetNumber.split('');
        renderSlots(targetDigits, difficulty);

        hasilKataElement.textContent = terbilang(targetNumber);
        hasilKataElement.classList.remove('text-secondary');

        highlightRandomSlot();

        timerElement.textContent = timer;
        timerInterval = setInterval(() => {
            timer--;
            timerElement.textContent = timer;
            if (timer <= 0) endGame('⏰ Waktu habis!');
        }, 1000);
    }

    function endGame(message) {
        clearInterval(timerInterval);
        gameActive = false;
        startBtn.textContent = 'Mulai Lagi';
        showFeedback(message, 'text-info');

        targetNumberElement.querySelectorAll('.digit').forEach((slot, index) => {
            if (!filledSlots.includes(index)) {
                slot.textContent = targetDigits[index];
                slot.classList.add('missed');
            }
        });

        difficultySelect.disabled = false;
        if (onGameStateChange) onGameStateChange(false);
    }

    function renderSlots(digits, difficulty) {
        targetNumberElement.innerHTML = "";

        const fixedIndices = difficulty === "mudah" ? findFixedIndices(digits) : [];

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

    function handleNumberClick(num) {
        if (!gameActive || highlightedIndex === null) return;

        const currentSlotIndex = highlightedIndex;
        const correctDigit = targetDigits[currentSlotIndex];
        const difficulty = difficultySelect.value;

        if (correctDigit === String(num)) {
            const slot = targetNumberElement.querySelector(`.digit[data-index="${currentSlotIndex}"]`);
            slot.textContent = num;
            slot.classList.add("filled");
            filledSlots.push(currentSlotIndex);
            showFeedback("✅ Benar!", "text-success");

            score++;
            scoreElement.textContent = score;

            if (filledSlots.length === targetDigits.length) {
                score += 10;
                scoreElement.textContent = score;
                endGame("🎉 Semua terisi! Skor +10");
                return;
            }
        } else {
            showFeedback("❌ Salah!", "text-danger");
        }

        if (difficulty === "sulit" || correctDigit === String(num)) {
            highlightRandomSlot();
        }
    }

    function highlightRandomSlot() {
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
        targetNumberElement.querySelector(`.digit[data-index="${highlightedIndex}"]`).classList.add("highlight");
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
