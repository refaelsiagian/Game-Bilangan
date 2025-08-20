export default function moreBetter(core, scoring = {}) {
    return {
        onCorrect() {
            const difficulty = core.rules.difficulty || 'sedang';
            const cfg = (scoring && scoring[difficulty]) || {};
            const points = Number(cfg.points ?? cfg.score ?? core.calculateScore() ?? 0);
            core.addScore(points);
            core.nextQuestion();
        },
        onWrong(next) {
            core.decrementLife();
            if (core.getState().lives > 0) next ? core.nextQuestion() : () => {};
        }
    };
}
