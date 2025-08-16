export default function moreBetter(core) {
    return {
        onCorrect() {
            core.addScore(core.calculateScore());
            core.nextQuestion();
        },
        onWrong(next) {
            core.decrementLife();
            if (core.getState().lives > 0) next ? core.nextQuestion() : () => {};
        }
    };
}
