import { terbilang, generateRandomNumberByDifficulty, shuffleArray } from '../utils.js';

export function init({ container, scoreElement, timerElement, onGameStateChange }) {
    // === STATE ===
    let targetNumber = '';
    let targetDigits = [];
    let filledSlots = [];
    let pendingDigits = [];
    let currentDigit = '';
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

    // === ELEMENT REFERENCES ===
    const targetNumberElement = container.querySelector('#target-number');
    const hasilKataElement = container.querySelector('#hasil-kata');
    const currentDigitElement = container.querySelector('#current-digit');
    const startBtn = container.querySelector('#start-btn');
    const discardBtn = container.querySelector('#discard-btn');
    const feedback = container.querySelector('#feedback');
    const difficultySelect = container.querySelector('#difficulty');

    // === EVENT LISTENERS ===
    difficultySelect.addEventListener('change', () => {
        discardBtn.style.display = (difficultySelect.value === 'sulit') ? 'inline-block' : 'none';
    });

    startBtn.addEventListener('click', () => {
        gameActive ? endGame('Game diakhiri!') : startGame();
    });

    discardBtn.addEventListener('click', handleDiscard);

    // === FUNCTIONS ===
    function startGame() {
        score = 0;
        timer = 60;
        filledSlots = [];
        pendingDigits = [];
        gameActive = true;
        startBtn.textContent = 'Akhiri';
        feedback.textContent = '';
        scoreElement.textContent = score;

        // Disable mode buttons
        if(onGameStateChange){
            onGameStateChange(true);
        }

        difficultySelect.disabled = true;

        const difficulty = difficultySelect.value;

        // Generate target number
        targetNumber = generateRandomNumberByDifficulty(difficulty);
        targetDigits = targetNumber.split('');
        renderSlots(targetDigits, difficulty);

        // Update keterangan
        hasilKataElement.textContent = terbilang(targetNumber);
        hasilKataElement.classList.remove('text-secondary');

        // Prepare pending digits
        pendingDigits = targetDigits.filter((d, i) => !(difficulty === 'mudah' && d === '0'));
        if (difficulty === 'sulit') addDistractorDigits();
        shuffleArray(pendingDigits);

        console.log('pendingDigits:', pendingDigits);

        showNextDigit();

        // Timer
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

        // Isi slot yang belum terisi
        targetNumberElement.querySelectorAll('.digit').forEach((slot, index) => {
            if (!filledSlots.includes(index)) {
                slot.textContent = targetDigits[index];
                slot.classList.add('missed');
            }
        });

        difficultySelect.disabled = false;
        
        // Enable mode 
        if(onGameStateChange){
            onGameStateChange(false);
        }
    }

    function renderSlots(digits, difficulty) {
        targetNumberElement.innerHTML = '';
        for (let i = 0; i < digits.length; i++) {
            const span = document.createElement('span');
            span.classList.add('digit');
            span.dataset.index = i;

            if (difficulty === 'mudah' && digits[i] === '0') {
                span.textContent = '0';
                span.classList.add('fixed');
            } else {
                span.textContent = '_';
                span.addEventListener('click', () => handleSlotClick(i));
            }

            targetNumberElement.appendChild(span);

            if ((i + 1) % 3 === 0 && i !== digits.length - 1) {
                const sep = document.createElement('span');
                sep.classList.add('sep');
                sep.textContent = '.';
                targetNumberElement.appendChild(sep);
            }
        }
    }

    function handleSlotClick(index) {
        if (!gameActive || filledSlots.includes(index)) return;

        if (targetDigits[index] === currentDigit) {
            const slot = targetNumberElement.querySelector(`.digit[data-index="${index}"]`);
            slot.textContent = currentDigit;
            slot.classList.add('filled');
            filledSlots.push(index);
            showFeedback('✅ Benar!', 'text-success');

            if (filledSlots.length === targetDigits.length) {
                score += 10;
                scoreElement.textContent = score;
                endGame('🎉 Semua terisi! Skor +10');
            } else {
                showNextDigit();
            }
        } else {
            showFeedback('❌ Salah!', 'text-danger');
        }
    }

    function handleDiscard() {
        if (!gameActive || !currentDigit) return;

        if (!targetDigits.includes(currentDigit)) {
            showFeedback('✅ Benar! Angka dibuang.', 'text-success');
            showNextDigit();
        } else {
            showFeedback('❌ Salah! Angka ini ada dalam target.', 'text-danger');
        }
    }

    function showNextDigit() {
        if (pendingDigits.length > 0) {
            currentDigit = pendingDigits.pop();
            currentDigitElement.textContent = currentDigit;
        } else {
            score += 10;
            scoreElement.textContent = score;
            endGame('🎉 Semua selesai!');
        }
    }

    function showFeedback(message, className) {
        feedback.textContent = message;
        feedback.className = `fw-bold fs-5 ${className}`;
    }

    function addDistractorDigits() {
        const allDigits = ['0','1','2','3','4','5','6','7','8','9'];
        const available = allDigits.filter(d => !targetDigits.includes(d));
        for (let i = 0; i < 5 && available.length > 0; i++) {
            const idx = Math.floor(Math.random() * available.length);
            pendingDigits.push(available.splice(idx, 1)[0]);
        }
    }

    function destroy() {
        clearInterval(timerInterval);
    }

    return { destroy };
}
