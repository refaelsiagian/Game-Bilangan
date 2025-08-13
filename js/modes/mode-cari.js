import { terbilang, generateRandomNumberByDifficulty, findFixedIndices } from '../utils.js';

export function init({ container, scoreElement, timerElement, onGameStateChange }) {
    // === GAME STATE ===
    let targetNumber = "";
    let targetDigits = [];
    let displayDigits = [];
    let wrongIndices = [];
    let selectedIndices = [];
    let score = 0;
    let timer = 60;
    let lives = 3;
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

        <!-- Tombol Mulai -->
        <div class="text-center mb-3">
            <button id="start-btn" class="btn btn-info">Mulai</button>
            <button id="submit-btn" class="btn btn-success" disabled>Periksa</button>
        </div>

        <div class="text-center">
            <div id="feedback" class="fw-bold fs-5"></div>
        </div>
    `;

    // === ELEMENT REFERENCES ===
    const targetNumberElement = container.querySelector("#target-number");
    const hasilKataElement = container.querySelector("#hasil-kata");
    const startBtn = container.querySelector("#start-btn");
    const submitBtn = document.getElementById("submit-btn");
    const difficultySelect = container.querySelector("#difficulty");
    const feedback = container.querySelector("#feedback");
    const livesContainer = document.getElementById('lives');

    // === EVENT LISTENERS ===
    startBtn.addEventListener('click', () => {
        gameActive ? endGame('Game diakhiri!') : startGame();
    });

    submitBtn.addEventListener("click", () => {
        if (!gameActive) return;
        checkAnswer();
    });

    function startGame() {
        score = 0;
        timer = 60;
        lives = 3;
        gameActive = true;
        startBtn.textContent = "Akhiri";
        submitBtn.disabled = false;
        feedback.textContent = "";
        scoreElement.textContent = score;

        renderLives();

        if (onGameStateChange) onGameStateChange(true);

        difficultySelect.disabled = true;

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
        submitBtn.disabled = true;
        showFeedback(message, "text-info");

        if (onGameStateChange) onGameStateChange(false);

        difficultySelect.disabled = false;

        // Beri tanda akhir permainan
        document.querySelectorAll(".digit").forEach((slot, index) => {
            if (wrongIndices.includes(index)) {
                // Digit yang benar-benar salah jadi merah
                slot.classList.add("wrong-actual");
                slot.classList.remove("selected"); // prioritas merah
            } else if (selectedIndices.includes(index)) {
                // Pilihan pemain yang tidak salah tetap kuning
                slot.classList.add("selected");
            }
            slot.classList.add("disabled"); // Supaya tidak bisa diklik
        });
    }

    function renderLives() {
        const hearts = livesContainer.querySelectorAll('.heart');
        hearts.forEach((heart, index) => {
            if (index < lives) {
                heart.classList.remove('empty');
            } else {
                heart.classList.add('empty');
            }
        });
    }

    function renderSlots(digits) {
        targetNumberElement.innerHTML = "";

        for (let i = 0; i < digits.length; i++) {
            const span = document.createElement("span");
            span.classList.add("digit");
            span.dataset.index = i;
            span.textContent = digits[i];

            span.addEventListener("click", () => toggleSelect(i, span));

            targetNumberElement.appendChild(span);

            // Tambahkan pemisah titik setiap 3 digit
            if ((i + 1) % 3 === 0 && i !== digits.length - 1) {
                const sep = document.createElement("span");
                sep.classList.add("sep");
                sep.textContent = ".";
                targetNumberElement.appendChild(sep);
            }
        }
    }

    function toggleSelect(index, element) {
        if (!gameActive) return;
        if (selectedIndices.includes(index)) {
            // Jika sudah dipilih, hapus
            selectedIndices = selectedIndices.filter(i => i !== index);
            element.classList.remove("selected");
        } else {
            selectedIndices.push(index);
            element.classList.add("selected");
        }
    }

    function checkAnswer() {
        // Bandingkan selectedIndices dan wrongIndices
        const selectedSet = new Set(selectedIndices);
        const wrongSet = new Set(wrongIndices);

        if (selectedSet.size !== wrongSet.size) {
            lives--;
            renderLives();
            if (lives <= 0) {
                endGame("💔 Kehabisan nyawa!");
                return;
            } else {
                showFeedback(`❌ Salah! Jumlah pilihan tidak sesuai. Sisa nyawa: ${lives}`, "text-danger");
                return;
            }
        }

        for (let idx of selectedSet) {
            if (!wrongSet.has(idx)) {
                lives--;
                renderLives();
                if (lives <= 0) {
                    endGame("💔 Kehabisan nyawa!");
                    return;
                } else {
                    showFeedback(`❌ Salah! Ada digit yang salah pilih (Sisa nyawa: ${lives})`, "text-danger");
                    return;
                }
            }
        }

        // Jika semua cocok
        score += 10;
        scoreElement.textContent = score;
        nextQuestion();
    }

    function injectWrongDigits(difficulty) {
        // Tentukan jumlah digit salah
        let wrongCount = 0;
        if (difficulty === "mudah") {
            wrongCount = Math.floor(Math.random() * 3) + 1; // 1-3
        } else {
            wrongCount = Math.floor(Math.random() * 5) + 1; // 1-5
        }

        const usedIndices = new Set();
        const fixedIndices = difficulty === 'mudah' ? findFixedIndices(targetDigits) : [];

        while (wrongIndices.length < wrongCount) {
            const idx = Math.floor(Math.random() * targetDigits.length);

            // Skip jika index sudah dipakai atau termasuk fixed
            if (usedIndices.has(idx) || fixedIndices.includes(idx)) continue;

            // Skip jika berdempetan dengan index salah yang sudah ada
            if (wrongIndices.some(existing => Math.abs(existing - idx) === 1)) continue;

            usedIndices.add(idx);
            wrongIndices.push(idx);
        }

        // Ubah digit di display agar salah
        wrongIndices.forEach(idx => {
            const original = targetDigits[idx];
            let newDigit;
            do {
                newDigit = String(Math.floor(Math.random() * 10));
            } while (newDigit === original);
            displayDigits[idx] = newDigit;
        });
    }

    function nextQuestion() {
        wrongIndices = [];
        selectedIndices = [];
        feedback.textContent = "";

        const difficulty = difficultySelect.value;

        // Generate target number baru
        targetNumber = generateRandomNumberByDifficulty(difficulty);
        targetDigits = targetNumber.split("");

        hasilKataElement.textContent = terbilang(targetNumber);

        displayDigits = [...targetDigits];
        injectWrongDigits(difficulty);

        renderSlots(displayDigits);
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
