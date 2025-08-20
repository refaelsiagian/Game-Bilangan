// modes/mode-tulis.js
import { terbilang, generateRandomNumberByDifficulty } from '../utils.js';

export async function init(core, { container, onGameStateChange } = {}) {
    let kataArray = [];
    let targetNumber = null;
    let listeners = [];

    // === Helper ambil elemen lokal ===
    function queryDOM() {
        return {
            hasilKata: container.querySelector('#hasil-kata'),
            wordButtons: Array.from(container.querySelectorAll('.word-btn')),
            startBtn: container.querySelector('#start-btn'),
            hapusBtn: container.querySelector('#hapus-btn'),
            resetBtn: container.querySelector('#reset-btn'),
            submitBtn: container.querySelector('#submit-btn'),
            feedback: container.querySelector('#feedback'),
            targetNumberElement: container.querySelector("#target-number"),
            difficultySelect: container.querySelector('#difficulty')
        };
    }

    // === Feedback helper ===
    function showFeedback(message, className) {
        const { feedback } = queryDOM();
        if (!feedback) return;
        feedback.textContent = message;
        feedback.className = `fw-bold fs-5 ${className}`;
    }

    // === Render UI ===
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
    }

    // === Render angka target ===
    function renderSlots(digits) {
        const { targetNumberElement } = queryDOM();
        targetNumberElement.innerHTML = '';
        digits.forEach((d, i) => {
            const span = document.createElement("span");
            span.classList.add("digit");
            span.textContent = d;
            targetNumberElement.appendChild(span);

            if ((i + 1) % 3 === 0 && i !== digits.length - 1) {
                const sep = document.createElement("span");
                sep.classList.add("sep");
                sep.textContent = ".";
                targetNumberElement.appendChild(sep);
            }
        });
    }

    // === Handler ===
    function handleWordClick(word) {
        const { hasilKata } = queryDOM();
        if (hasilKata.classList.contains('text-secondary')) {
            hasilKata.classList.remove('text-secondary');
            kataArray = [];
        }
        kataArray.push(word);
        hasilKata.textContent = kataArray.join(' ');
    }

    function handleHapus() {
        const { hasilKata } = queryDOM();
        if (kataArray.length > 0) {
            kataArray.pop();
            hasilKata.textContent = kataArray.length ? kataArray.join(' ') : 'Klik tombol untuk merakit kata...';
            if (!kataArray.length) hasilKata.classList.add('text-secondary');
        }
    }

    function handleReset() {
        kataArray = [];
        const { hasilKata } = queryDOM();
        hasilKata.textContent = 'Klik tombol untuk merakit kata...';
        hasilKata.classList.add('text-secondary');
        showFeedback('', '');
    }

    function handleSubmit() {
        const state = core.getState();
        if (!state || state.timer <= 0) return;

        const jawabanUser = kataArray.join(' ').trim();
        const jawabanBenar = terbilang(targetNumber);

        if (jawabanUser === jawabanBenar) {
            core.rules.onCorrect?.();
            showFeedback("🎉 Selamat! Jawaban benar!", "text-success");
        } else {
            core.rules.onWrong?.();
            const updatedState = core.getState(); // ambil nyawa terbaru
            if (updatedState.lives > 0) {
                showFeedback(`❌ Salah! (Sisa nyawa: ${updatedState.lives})`, "text-danger");
            }
        }
    }

    // === Soal baru ===
    function generateAndRenderTarget() {
        kataArray = [];
        const { hasilKata, difficultySelect } = queryDOM();
        hasilKata.textContent = 'Klik tombol untuk merakit kata...';
        hasilKata.classList.add('text-secondary');

        const difficulty = difficultySelect?.value || 'sedang';
        core.rules.difficulty = difficulty;
        targetNumber = generateRandomNumberByDifficulty(difficulty);
        renderSlots(targetNumber.split(''));
    }

    // === Helper untuk toggle ===
    function toggleButtons(enabled) {
        const { hapusBtn, resetBtn, submitBtn, wordButtons } = queryDOM();
        [hapusBtn, resetBtn, submitBtn, ...wordButtons].forEach(btn => {
            btn.disabled = !enabled;
        });
    }


    // === Listener helper ===
    function addListener(el, evt, handler) {
        if (!el) return;
        el.addEventListener(evt, handler);
        listeners.push([el, evt, handler]);
    }
    function removeAllListeners() {
        listeners.forEach(([el, evt, handler]) => el.removeEventListener(evt, handler));
        listeners = [];
    }

    // === API untuk core ===
    core.registerModeAPI({
        beforeStart() {
            renderUI();
            const { wordButtons, hapusBtn, resetBtn, submitBtn, startBtn } = queryDOM();

            (wordButtons || []).forEach(btn => addListener(btn, 'click', () => handleWordClick(btn.textContent)));
            addListener(hapusBtn, 'click', handleHapus);
            addListener(resetBtn, 'click', handleReset);
            addListener(submitBtn, 'click', handleSubmit);
            
            const startHandler = () => {
                const state = core.getState();
                state.running ? core.endGame('Game diakhiri!') : core.startGame();
            };
            addListener(startBtn, 'click', startHandler);
        },
        afterStart() {
            const { hasilKata, startBtn, difficultySelect } = queryDOM();
            startBtn.textContent = "Akhiri";
            difficultySelect.disabled = true;
            hasilKata.classList.remove('text-success', 'fw-bold');
            hasilKata.classList.add('text-secondary');
            hasilKata.textContent = 'Klik tombol untuk merakit kata...';
            toggleButtons(true);

            showFeedback('', '');
            generateAndRenderTarget();
            onGameStateChange?.(true);
        },
        beforeEnd() {
            const { hasilKata } = queryDOM();
            hasilKata.classList.remove('text-secondary');
            hasilKata.classList.add('text-success', 'fw-bold');
            hasilKata.textContent = terbilang(targetNumber);
            toggleButtons(false);
        },
        afterEnd(message) {
            const { startBtn, difficultySelect} = queryDOM();
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
