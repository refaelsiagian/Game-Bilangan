// Konversi angka ke kata dalam bahasa Indonesia
export function terbilang(num) {
    const satuan = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan"];
    const tingkat = ["", "ribu", "juta", "miliar", "triliun"];

    num = num.toString();
    if (num === "0") return "nol";

    let result = [];
    let angka = num.split("").reverse().join("");
    let groups = angka.match(/.{1,3}/g);

    for (let i = 0; i < groups.length; i++) {
        let n = groups[i].split("").reverse().join("");
        let nInt = parseInt(n);
        if (nInt === 0) continue;

        let words = [];
        let ratusan = parseInt(n[0] || 0);
        let puluhan = parseInt(n[1] || 0);
        let satuanAngka = parseInt(n[2] || 0);

        if (n.length === 3) {
            if (ratusan === 1) words.push("seratus");
            else if (ratusan > 1) words.push(satuan[ratusan] + " ratus");
        }
        if (puluhan > 0) {
            if (puluhan === 1) {
                if (satuanAngka === 0) words.push("sepuluh");
                else if (satuanAngka === 1) words.push("sebelas");
                else words.push(satuan[satuanAngka] + " belas");
                satuanAngka = 0;
            } else {
                words.push(satuan[puluhan] + " puluh");
            }
        }
        if (satuanAngka > 0) words.push(satuan[satuanAngka]);

        words.push(tingkat[i]);
        result.unshift(words.join(" "));
    }
    return result.join(" ").trim().replace(/\s+/g, " ");
}

// Generate angka random sesuai tingkat kesulitan
export function generateRandomNumberByDifficulty(difficulty) {
    let groups = [];

    if (difficulty === 'mudah') {
        const easyPatterns = [
            [true, true, true, false, false],   // triliun, miliar, juta aktif
            [false, true, true, true, false],   // miliar, juta, ribu aktif
            [false, false, true, true, true]    // juta, ribu, satuan aktif
        ];

        const pattern = easyPatterns[Math.floor(Math.random() * easyPatterns.length)];

        for (let i = 0; i < 5; i++) {
            if (pattern[i]) {
                groups.push(String(Math.floor(Math.random() * 900) + 100)); // 3 digit random
            } else {
                groups.push('000');
            }
        }
    }
    else if (difficulty === 'sedang') {
        for (let i = 0; i < 5; i++) {
            groups.push(String(Math.floor(Math.random() * 900) + 100));
        }
    }
    else if (difficulty === 'sulit') {
        const digits = new Array(15).fill(null);
        const zeroCount = Math.floor(Math.random() * 5) + 6; // 6-10 nol
        const zeroPositions = [];

        while (zeroPositions.length < zeroCount) {
            const pos = Math.floor(Math.random() * 15);
            if (!zeroPositions.includes(pos)) zeroPositions.push(pos);
        }

        zeroPositions.forEach(pos => digits[pos] = '0');

        for (let i = 0; i < 15; i++) {
            if (digits[i] === null) {
                digits[i] = String(Math.floor(Math.random() * 9) + 1);
            }
        }

        // Pastikan 3 digit pertama tidak semua nol
        if (digits[0] === '0' && digits[1] === '0' && digits[2] === '0') {
            const idx = Math.floor(Math.random() * 3);
            digits[idx] = String(Math.floor(Math.random() * 9) + 1);
        }

        return digits.join('');
    }

    return groups.join('');
}

// Acak urutan array (untuk mode dengan angka acak)
export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

export function findFixedIndices(digits) {
    const fixedIndices = [];

    for (let i = 0; i <= digits.length - 3; i += 3) {
        if (digits[i] === '0' && digits[i + 1] === '0' && digits[i + 2] === '0') {
            fixedIndices.push(i, i + 1, i + 2);
            if (fixedIndices.length >= 6) break; // maksimal 2 tripel
        }
    }

    return fixedIndices;
}
