import { createCore } from './core.js';

const categoryMap = {
    fasterBetter: () => import('./categories/fasterBetter.js'),
    moreBetter:  () => import('./categories/moreBetter.js')
};

const modesConfig = {
    tulis: {
        file: './modes/mode-tulis.js',
        category: 'fasterBetter',
        instructions: `
            <p>
                Tuliskan bentuk terbilang dari bilangan yang tertera di bawah ini.
                Gunakan tombol di bawah untuk memilih kata yang sesuai.
            </p>`
    },
    pilih: {
        file: './modes/mode-pilih.js',
        category: 'fasterBetter',
        instructions: `
            <p>
                Angka akan tampil secara acak di bagian bawah.
                Pilih tempat untuk angka tersebut sesuai dengan terbilang yang diberikan.
            </p>`
    },
    isi: {
        file: './modes/mode-isi.js',
        category: 'fasterBetter',
        instructions: `
            <p>
                Isi angka ke dalam bagian yang disorot sesuai dengan terbilang yang diberikan.
                Gunakan tombol di bawah untuk memilih angka.
            </p>`
    },
    cari: {
        file: './modes/mode-cari.js',
        category: 'moreBetter',
        instructions: `
            <p>
                Cari digit angka yang tidak sesuai dengan terbilang yang diberikan.
                Klik pada angka untuk memilihnya.
            </p>`
    },
    cocok: {
        file: './modes/mode-cocok.js',
        category: 'moreBetter',
        instructions: `
            <p>
                Pilih terbilang yang cocok dengan posisi digit angka yang tampil.
                Gunakan tombol di bawah untuk memilih jawaban.
            </p>`
    },
    kedip: {
        file: './modes/mode-kedip.js',
        category: 'moreBetter',
        instructions: `
            <p>
                Perhatikan angka yang berkedip dan tuliskan terbilang yang sesuai.
                Gunakan tombol di bawah untuk memilih angka.
            </p>`
    }

};

// Konfigurasi awal game
const gameConfig = {
    lives: 3,
    timer: 60,
    baseScore: 10
};

document.addEventListener('DOMContentLoaded', () => {
    const gameContainer = document.getElementById('game-container');
    const scoreEl       = document.getElementById('score');
    const timerEl       = document.getElementById('timer');
    const livesEl       = document.getElementById('lives');
    const instructionsEl= document.getElementById('game-instructions');
    const modeButtons   = document.querySelectorAll('.mode-btn');

    let currentCore = null;
    let currentModeModule = null;
    let currentModeInstance = null;

    function unloadCurrentMode() {
        if (currentModeInstance?.destroy) {
            try { currentModeInstance.destroy(); } catch (e) { console.warn(e); }
        }
        gameContainer.innerHTML = '';
        currentCore = null;
        currentModeModule = null;
        currentModeInstance = null;
    }

    modeButtons.forEach(btn => {
        btn.addEventListener('click', async () => {
            const key = btn.dataset.mode;
            if (!modesConfig[key]) {
                console.warn('Mode tidak ditemukan:', key);
                return;
            }

            modeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            unloadCurrentMode();

            const cfg = modesConfig[key];
            instructionsEl.innerHTML = cfg.instructions || '';

            try {
                const [catModule, modeModule] = await Promise.all([
                    categoryMap[cfg.category]().then(m => m.default ?? m),
                    import(cfg.file)
                ]);

                // === Core dibuat dengan elemen global ===
                currentCore = createCore(catModule, {
                    ...gameConfig,
                    scoreElement: scoreEl,
                    timerElement: timerEl,
                    livesElement: livesEl
                }, gameContainer);

                // === Mode hanya terima container + callback ===
                const options = {
                    container: gameContainer,
                    onGameStateChange: (isRunning) => {
                        document.querySelectorAll('.mode-btn').forEach(b => b.disabled = isRunning);
                    }
                };

                currentModeModule = modeModule;
                currentModeInstance = await (modeModule.init?.(currentCore, options) ?? null);

                if (typeof currentCore.prepareGame === 'function') {
                    currentCore.prepareGame();
                }

            } catch (err) {
                console.error('Gagal load mode/category:', err);
                gameContainer.innerHTML = `<div class="text-danger">Gagal memuat mode. Lihat console.</div>`;
            }
        });
    });

});
