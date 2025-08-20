export default function fasterBetter(core, scoring = {}) {
    return {
        onCorrect() {
            const state = core.getState();
            const difficulty = core.rules.difficulty || 'sedang';
            const cfg = (scoring && scoring[difficulty]) || {};
            const base = Number(cfg.score ?? core.calculateScore() ?? 0);
            const multiplier = Number(cfg.multiplier ?? 1);

            const bonus = Math.floor((state.timer || 0) * multiplier);
            core.addScore(base + bonus);
            core.endGame("✅ Jawaban benar!");
        },

        onWrong() {
            core.decrementLife();
            if (core.getState().lives <= 0) core.endGame("❌ Salah! 💔 Nyawa habis!");
        }
    };
}
