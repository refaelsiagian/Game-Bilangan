// categories/fasterBetter.js

export default function fasterBetter(core) {
    return {
        onCorrect() {
            core.addScore(core.calculateScore());
            core.endGame(""); 
        },
        onWrong() {
            core.decrementLife();
            if (core.getState().lives <= 0) core.endGame("❌ Salah! 💔 Nyawa habis!");
        }
    };
}
