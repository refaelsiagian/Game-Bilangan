import { createCore } from './core.js';

const categoryMap = {
    fasterBetter: () => import('./categories/fasterBetter.js'),
    moreBetter:  () => import('./categories/moreBetter.js')
};

const modesConfig = {
    tulis: {
        file: './modes/mode-tulis.js',
        category: 'fasterBetter',
        instructions: `Tuliskan bentuk terbilang dari bilangan yang tertera di bawah ini.
                       Gunakan tombol di bawah untuk memilih kata yang sesuai.`,
        scoring: {
            mudah: {
                score: 150,
                multiplier: 10
            },
            sedang: {
                score: 200,
                multiplier: 10
            },
            sulit: {
                score: 250,
                multiplier: 10
            }
        }
    },
    cari: {
        file: './modes/mode-cari.js',
        category: 'moreBetter',
        instructions: `Cari digit angka yang tidak sesuai dengan terbilang yang diberikan.
                       Klik pada angka untuk memilihnya.`,
        scoring: {
            mudah: {
                points: 20,
            },
            sedang: {
                points: 30,
            },
            sulit: {
                points: 40,
            }
        }
    },
    pilih: {
        file: './modes/mode-pilih.js',
        category: 'fasterBetter',
        instructions: `Angka akan tampil secara acak di bagian bawah.
                       Pilih tempat untuk angka tersebut sesuai dengan terbilang yang diberikan.`,
        scoring: {
            mudah: {
                score: 100,
                multiplier: 5
            },
            sedang: {
                score: 150,
                multiplier: 5
            },
            sulit: {
                score: 200,
                multiplier: 5
            }
        }
    },
    isi: {
        file: './modes/mode-isi.js',
        category: 'fasterBetter',
        instructions: `Isi angka ke dalam bagian yang disorot sesuai dengan terbilang yang diberikan.
                       Gunakan tombol di bawah untuk memilih angka.`,
        scoring: {
            mudah: {
                score: 100,
                multiplier: 5
            },
            sedang: {
                score: 150,
                multiplier: 5
            },
            sulit: {
                score: 200,
                multiplier: 5
            }
        }
    },
    cocok: {
        file: './modes/mode-cocok.js',
        category: 'moreBetter',
        instructions: `Pilih terbilang yang cocok dengan posisi digit angka yang tampil.
                       Gunakan tombol di bawah untuk memilih jawaban.`,
        scoring: {
            mudah: {
                points: 20,
            },
            sedang: {
                points: 30,
            },
            sulit: {
                points: 40,
            }
        }
    },
    kedip: {
        file: './modes/mode-kedip.js',
        category: 'moreBetter',
        instructions: `Perhatikan angka yang berkedip dan tuliskan terbilang yang sesuai.
                       Gunakan tombol di bawah untuk memilih angka.`,
        scoring: {
            mudah: {
                points: 20,
            },
            sedang: {
                points: 30,
            },
            sulit: {
                points: 40,
            }
        }
    }

};

// Konfigurasi awal game
const gameConfig = {
    lives: 3,
    timer: 60,
};

document.addEventListener('DOMContentLoaded', () => {
    const gameContainer   = document.getElementById('game-container');
    const scoreEl         = document.getElementById('score');
    const timerEl         = document.getElementById('timer');
    const livesEl         = document.getElementById('lives');
    const instructionsEl  = document.getElementById('game-instructions');
    const categoryButtons = document.querySelectorAll('.category-btn');
    const modeSelector    = document.getElementById('mode-selector');

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

    // 🔹 Render tombol mode sesuai kategori
    function renderModeButtons(categoryKey) {
        modeSelector.innerHTML = ''; // reset

        const modes = Object.entries(modesConfig)
            .filter(([_, cfg]) => cfg.category === categoryKey);

        modes.forEach(([modeKey, cfg]) => {
            const btn = document.createElement('button');
            btn.className = "btn btn-outline-primary mode-btn m-1";
            btn.dataset.mode = modeKey;
            btn.textContent = modeKey.charAt(0).toUpperCase() + modeKey.slice(1);
            modeSelector.appendChild(btn);

            btn.addEventListener('click', async () => {
                modeSelector.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                unloadCurrentMode();

                instructionsEl.innerHTML = `<h6>${cfg.instructions}</h6>` || '';

                try {
                    const [catModule, modeModule] = await Promise.all([
                        categoryMap[cfg.category]().then(m => m.default ?? m),
                        import(cfg.file)
                    ]);

                    currentCore = createCore((core) => {
                        // catModule diharapkan menerima (core, scoring)
                        return catModule(core, cfg.scoring ?? {});
                        }, {
                        ...gameConfig,
                        scoreElement: scoreEl,
                        timerElement: timerEl,
                        livesElement: livesEl
                    }, gameContainer);

                    const options = {
                        container: gameContainer,
                        onGameStateChange: (isRunning) => {
                            // 🔹 Kalau game jalan → disable kategori
                            document.querySelectorAll('.category-btn').forEach(b => b.disabled = isRunning);
                            // mode buttons juga ikut diatur
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
    }

    // 🔹 Event klik kategori
    categoryButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            categoryButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active'); 

            unloadCurrentMode(); // kosongkan game
            instructionsEl.innerHTML = `<h6>Pilih mode untuk kategori <b>${btn.textContent}</b>.</h6>`;
            renderModeButtons(btn.dataset.category);
        });
    });
});


