document.addEventListener('DOMContentLoaded', () => {
    const scoreElement = document.getElementById('score');
    const timerElement = document.getElementById('timer');
    const gameContainer = document.getElementById('game-container');
    const modeButtons = document.querySelectorAll('.mode-btn');
    const instructionsElement = document.getElementById('game-instructions');

    let currentMode = null;
    let modeInstance = null;

    const setModeButtonsDisabled = (state) => {
        modeButtons.forEach(btn => btn.disabled = state);
    };

    // Mapping mode dengan file JS dan instruksi
    const modesConfig = {
        tulis: {
            file: './modes/mode-tulis.js',
            instructions: `
                <p>
                    Tuliskan bentuk terbilang dari bilangan yang tertera di bawah ini.
                    Gunakan tombol di bawah untuk memilih kata yang sesuai.
                </p>`
        },
        pilih: {
            file: './modes/mode-pilih.js',
            instructions: `
                <p>
                    Angka akan tampil secara acak di bagian bawah.
                    Pilih tempat untuk angka tersebut sesuai dengan terbilang yang diberikan.
                </p>`
        },
        isi: {
            file: './modes/mode-isi.js',
            instructions: `
                <p>
                    Isi angka ke dalam bagian yang disorot sesuai dengan terbilang yang diberikan.
                    Gunakan tombol di bawah untuk memilih angka.
                </p>`
        },
        cari: {
            file: './modes/mode-cari.js',
            instructions: `
                <p>
                    Cari digit angka yang tidak sesuai dengan terbilang yang diberikan.
                    Klik pada angka untuk memilihnya.
                </p>`
        },
        cocok: {
            file: './modes/mode-cocok.js',
            instructions: `
                <p>
                    Pilih terbilang yang cocok dengan posisi digit angka yang tampil.
                    Gunakan tombol di bawah untuk memilih jawaban.
                </p>`
        }

    };

    modeButtons.forEach(btn => {
        btn.addEventListener('click', async () => {
            const selectedMode = btn.dataset.mode;
            if (selectedMode === currentMode) return;

            // Update UI tombol
            modeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Reset UI game container
            gameContainer.innerHTML = '<div class="text-center text-secondary"><p>Loading mode...</p></div>';
            currentMode = selectedMode;

            // Hentikan mode lama jika ada
            if (modeInstance?.destroy) {
                modeInstance.destroy();
            }

            // Load mode baru
            const config = modesConfig[selectedMode];
            if (!config) {
                gameContainer.innerHTML = `<div class="text-center text-muted"><p>Mode "${selectedMode}" belum tersedia.</p></div>`;
                return;
            }

            try {
                const module = await import(config.file);
                instructionsElement.innerHTML = config.instructions;
                modeInstance = module.init({
                    container: gameContainer,
                    scoreElement,
                    timerElement,
                    onGameStateChange: setModeButtonsDisabled
                });
            } catch (err) {
                console.error('Error loading mode:', err);
                gameContainer.innerHTML = `<div class="text-center text-danger"><p>Gagal memuat mode.</p></div>`;
            }
        });
    });
});
