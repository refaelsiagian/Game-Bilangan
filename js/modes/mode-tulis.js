import { terbilang, generateRandomNumberByDifficulty } from '../utils.js';

export function init({ container, scoreElement, timerElement, onGameStateChange }) {
    let kataArray = [];
    let targetNumber = null;
    let score = 0;
    let timer = 60;
    let timerInterval = null;
    let gameActive = false;

    // === RENDER UI ===
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
                <div class="border rounded p-3 bg-white" style="min-height: 60px;">
                    <span id="hasil-kata" class="text-secondary">Klik tombol untuk mulai...</span>
                </div>
            </div>
        </div>

        <div class="row mb-4">
            <div class="col text-center">
                <button id="hapus-btn" class="btn btn-warning me-2">Hapus</button>
                <button id="reset-btn" class="btn btn-danger">Reset</button>
            </div>
        </div>

        <div class="row mb-4">
            <div class="col-12 col-lg-6 mb-3">
                <h5 class="text-center mb-2">Angka Dasar</h5>
                <div class="row g-2">
                    ${['nol','satu','dua','tiga','empat','lima','enam','tujuh','delapan','sembilan']
                        .map(word => `<div class="col-4"><button class="btn btn-outline-primary w-100 word-btn">${word}</button></div>`).join('')}
                </div>
            </div>

            <div class="col-6 col-lg-3 mb-3">
                <h5 class="text-center mb-2">Satuan</h5>
                <div class="row g-2">
                    ${['puluh','belas','ratus','ribu','juta','miliar','triliun']
                        .map(word => `<div class="col-6"><button class="btn btn-outline-secondary w-100 word-btn">${word}</button></div>`).join('')}
                </div>
            </div>

            <div class="col-6 col-lg-3 mb-3">
                <h5 class="text-center mb-2">Khusus</h5>
                <div class="row g-2">
                    ${['sepuluh','sebelas','seratus','seribu']
                        .map(word => `<div class="col-12"><button class="btn btn-outline-dark w-100 word-btn">${word}</button></div>`).join('')}
                </div>
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

    // === DOM REFERENCES ===
    const hasilKata = container.querySelector('#hasil-kata');
    const wordButtons = container.querySelectorAll('.word-btn');
    const startBtn = container.querySelector('#start-btn');
    const hapusBtn = container.querySelector('#hapus-btn');
    const resetBtn = container.querySelector('#reset-btn');
    const submitBtn = container.querySelector('#submit-btn');
    const feedback = container.querySelector('#feedback');
    const targetNumberElement = container.querySelector("#target-number");
    const difficultySelect = container.querySelector('#difficulty');

    // === EVENT LISTENERS ===
    wordButtons.forEach(btn => btn.addEventListener('click', () => {
        addWord(btn.textContent);
    }));

    hapusBtn.addEventListener('click', removeLastWord);

    resetBtn.addEventListener('click', resetWords);

    startBtn.addEventListener('click', () => {
        gameActive ? endGame(`Game diakhiri! Jawaban benar: ${terbilang(targetNumber)}`) : startGame();
    });

    submitBtn.addEventListener('click', () => {
        if (!gameActive) return;
        checkAnswer(); // ✅ ganti ke fungsi baru
    });


    // === FUNCTIONS ===
    function startGame() {
        score = 0;
        scoreElement.textContent = score;
        timer = 60;
        timerElement.textContent = timer;
        gameActive = true;
        startBtn.textContent = "Akhiri";
        difficultySelect.disabled = true;

        nextQuestion(); // ✅ ganti dari updateTargetNumber()

        timerInterval = setInterval(() => {
            timer--;
            timerElement.textContent = timer;
            if (timer <= 0) endGame(`⏰ Waktu habis! Jawaban benar: ${terbilang(targetNumber)}`);
        }, 1000);

        if(onGameStateChange) {
            onGameStateChange(true);
        }
    }


    function endGame(message) {
        clearInterval(timerInterval);
        gameActive = false;
        feedback.textContent = message;
        feedback.className = "fw-bold fs-5 text-info";
        startBtn.textContent = "Mulai Lagi";
        difficultySelect.disabled = false;

        // Enable mode buttons
        if(onGameStateChange) {
            onGameStateChange(false);
        }
    }

    function renderSlots(digits) {
        targetNumberElement.innerHTML = '';

        for (let i = 0; i < digits.length; i++) {
            const span = document.createElement("span");
            span.classList.add("digit");
            span.dataset.index = i;
            span.textContent = digits[i];
            targetNumberElement.appendChild(span);

            if ((i + 1) % 3 === 0 && i !== digits.length - 1) {
                const sep = document.createElement("span");
                sep.classList.add("sep");
                sep.textContent = ".";
                targetNumberElement.appendChild(sep);
            }
        }
    }

    function nextQuestion() {
        kataArray = [];
        hasilKata.textContent = "Klik tombol untuk mulai...";
        hasilKata.classList.add('text-secondary');
        feedback.textContent = '';

        const difficulty = difficultySelect.value;
        targetNumber = generateRandomNumberByDifficulty(difficulty);
        const digits = targetNumber.split('');

        renderSlots(digits);
    }

    function checkAnswer() {
        const jawabanUser = kataArray.join(' ').trim();
        const jawabanBenar = terbilang(targetNumber);
        if (jawabanUser === jawabanBenar) {
            feedback.textContent = "✅ Benar!";
            feedback.className = "fw-bold fs-5 text-success";
            score += 10;
            scoreElement.textContent = score;
            nextQuestion();
        } else {
            feedback.textContent = "❌ Salah! Coba lagi.";
            feedback.className = "fw-bold fs-5 text-danger";
        }
    }

    function addWord(word) {
        if (hasilKata.classList.contains('text-secondary')) {
            hasilKata.classList.remove('text-secondary');
            kataArray = [];
        }
        kataArray.push(word);
        hasilKata.textContent = kataArray.join(' ');
    }

    function removeLastWord() {
        if (kataArray.length > 0) {
            kataArray.pop();
            hasilKata.textContent = kataArray.length === 0 ? 'Klik tombol untuk mulai...' : kataArray.join(' ');
            if (kataArray.length === 0) hasilKata.classList.add('text-secondary');
        }
    }

    function resetWords() {
        kataArray = [];
        hasilKata.textContent = 'Klik tombol untuk mulai...';
        hasilKata.classList.add('text-secondary');
        feedback.textContent = '';
    }


    function destroy() {
        clearInterval(timerInterval);
        // Semua listener sudah terikat pada container, jadi aman kalau container dihapus
    }

    return { destroy };
}
