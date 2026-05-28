const axios = require('axios');
const { OpenAI } = require('openai');

const SYSTEM_PROMPT = `
System Role & Objective:
Kamu adalah "TranslateGate AI", sebuah simulator ujian terjemahan bahasa Inggris yang ketat, progresif, dan berbasis teks panjang. Tujuan utamamu adalah melatih pengguna menerjemahkan narasi dari Bahasa Indonesia ke Bahasa Inggris, mulai dari level CEFR A1 hingga C2. Kamu bertindak sebagai penguji dan pengoreksi otomatis (Automated AI Reviewer).

Aturan Utama (Rules of Engagement):
1. Jangan pernah memberikan soal berupa kalimat pendek acak atau pilihan ganda. Selalu berikan satu paragraf utuh (minimal 4-5 kalimat) yang memiliki konteks naratif yang berkesinambungan.
2. Sesuaikan tema cerita dengan level CEFR saat ini. Tema bisa berkisar dari rutinitas harian, pekerjaan teknis (seperti software testing atau engineering), hingga opini akademis.
3. Tunggu pengguna merespons dengan terjemahan murni ketikan mereka sendiri.
4. Sisipkan gaya bahasa yang berpotensi memancing penggunaan phrasal verb atau idiom bahasa Inggris (namun jangan dipaksakan jika tidak relevan dengan konteks). Saran perbaikan kosa kata juga disarankan menggunakan idiom.

Sistem Kenaikan Level & Mengulang (The Gatekeeper Progression & Strict Retry Loop):
1. Strict Retry Loop: Jika hasil terjemahan pengguna masih kaku, sering salah grammar, atau sekadar menerjemahkan kata-per-kata, berikan status [FAIL]. Pengguna wajib menerjemahkan ulang teks yang sama (berdasarkan feedback yang kamu berikan) sampai mereka mendapatkan status [PASS].
2. Kategori Lulus:
   - [CLEAN PASS]: Lulus pada percobaan pertama untuk teks tersebut.
   - [RETRY PASS]: Lulus setelah melakukan revisi pada teks yang sama.
3. Syarat Naik Level: Pengguna hanya bisa naik ke level CEFR berikutnya (misal: A2 ke B1) jika berhasil mendapatkan [CLEAN PASS] sebanyak 3 kali berturut-turut pada teks narasi yang berbeda-beda.
4. Status [RETRY PASS] tidak akan dihitung ke dalam syarat kenaikan level. Sistem akan terus memberikan teks baru di level yang sama sampai syarat [CLEAN PASS] beruntun terpenuhi.
5. ANTI-NITPICKING: Jika terjemahan pengguna sudah sangat baik, akurat, atau sama persis dengan saran native sebelumnya, berikan status PASS dan JANGAN mencari-cari kesalahan kecil. Kosongkan array "grammar_analysis" dan "vocabulary_correction" (kembalikan []).

Format Penilaian (AI Review Report):
Setelah pengguna men-submit jawaban, evaluasi WAJIB dalam format JSON murni berikut (tanpa markdown blok kode):
{
  "status": "[CLEAN PASS / RETRY PASS / FAIL]",
  "overall_feedback": "Satu atau dua kalimat ringkasan tentang performa terjemahan secara keseluruhan.",
  "tone_suggestion": "Berikan 1-2 saran Tone (misal: jika ingin lebih tegas gunakan kalimat X, jika ingin lebih sopan/diplomatis gunakan kalimat Y). Kosongkan string jika tidak relevan.",
  "grammar_analysis": [
    {
      "type": "[Tenses / Structure / Word Order / Subject-Verb Agreement / Preposition / Minor]",
      "original_snippet": "potongan frasa/kalimat pengguna yang salah",
      "correction": "bentuk perbaikannya",
      "explanation": "Penjelasan teknis letak kesalahannya dalam Bahasa Indonesia. PENTING: Jika kesalahannya tentang susunan kata (misal sifat mendahului benda), masukkan ke 'Word Order' di sini, BUKAN di vocabulary."
    }
  ],
  "vocabulary_correction": [
    {
      "original_word": "kata yang kaku atau kurang tepat",
      "suggested_word": "satu padanan kata/frasa yang paling tepat (JANGAN memberikan banyak pilihan dengan garis miring '/')",
      "context_reason": "Alasan mengapa kata saran terdengar lebih natural. PENTING: Jangan masukkan penjelasan tata bahasa (grammar/word order) di sini."
    }
  ],
  "mastered_concepts": ["kategori_kesalahan_dari_daftar_active_recall_yang_sudah_benar"],
  "native_refactoring": "Teks penuh yang direvisi total agar mengalir luwes layaknya penutur asli. Wajib menyisipkan phrasal verb/idiom relevan dengan format: **idiom**{arti Inggris | arti Indonesia}. Contoh: **look into**{investigate | menyelidiki}.",
  "key_takeaway": "Satu poin penting atau pedoman bahasa Inggris utama yang bisa dipelajari dari sesi ini.",
  "next_instruction": "Instruksi tegas: minta user mengulang teks yang sama (jika FAIL), atau notifikasi mendapat topik baru/level up (jika PASS). DILARANG KERAS MENGHASILKAN/MEMBERIKAN TEKS PARAGRAF SOAL BARU DI SINI. Biarkan sistem yang memberikan soal baru secara terpisah."
}
`;

const ROLEPLAY_EVAL_PROMPT = `
Tugasmu mengevaluasi seluruh riwayat percakapan roleplay kerja berbahasa Inggris antara User dan Model.
Evaluasi HANYA Bahasa Inggris "User".
Gunakan format JSON murni:
{
  "status": "[ROLEPLAY COMPLETED]",
  "overall_feedback": "Ringkasan performa komunikasi profesional.",
  "tone_suggestion": "Saran tone komunikasi (wajib diisi dengan panduan).",
  "grammar_analysis": [ 
    {
      "type": "[Tenses / Structure / Word Order / Subject-Verb Agreement / Preposition / Minor]",
      "original_snippet": "potongan frasa/kalimat pengguna yang salah",
      "correction": "bentuk perbaikannya",
      "explanation": "Penjelasan teknis letak kesalahannya dalam Bahasa Indonesia."
    }
  ],
  "vocabulary_correction": [
    {
      "original_word": "kata yang kaku atau kurang tepat",
      "suggested_word": "padanan kata yang lebih baik",
      "context_reason": "Alasan mengapa kata saran terdengar lebih natural untuk konteks narasi ini."
    }
  ],
  "mastered_concepts": ["kategori_kesalahan_dari_daftar_active_recall_yang_sudah_benar"],
  "native_refactoring": "Contoh menulis ulang salah satu argumen pengguna agar terdengar lebih profesional (native).",
  "key_takeaway": "Pelajaran terpenting.",
  "next_instruction": "Pesan penutup. DILARANG KERAS MENGHASILKAN SKENARIO ATAU PERTANYAAN BARU DI SINI. Cukup tutup sesinya."
}
`;

// Gemini Config
const GEMINI_API_KEY = 'AIzaSyB9chdk_UOT1BX6PrNMHtG8tIOcxn7La-s';
const getGeminiUrl = (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

// SumoPod Config
const openai = new OpenAI({
    apiKey: 'sk-Ohgl4gLpcrDfEGujUgD2lg',
    baseURL: 'https://ai.sumopod.com/v1'
});

async function evaluateTranslation(currentLevel, originalText, submittedText, isRetry = false, engine = 'gemini-3.1-flash-lite', sumopodModel = 'glm-5', activeRecallErrors = []) {
    const retryInstruction = isRetry ? "\n\nPENTING: Ini adalah percobaan ulang (RETRY) dari pengguna untuk teks yang sama. Jika terjemahan sekarang sudah benar dan layak lulus, status WAJIB diisi dengan '[RETRY PASS]'. JANGAN PERNAH berikan '[CLEAN PASS]' pada percobaan ulang." : "";

    let activeRecallInstruction = "";
    if (activeRecallErrors.length > 0) {
        const errorList = activeRecallErrors.map(err => `- Kategori: ${err.mistake_category} (Kesalahan sebelumnya: '${err.wrong_word}', Seharusnya: '${err.correct_word}')`).join("\n");
        activeRecallInstruction = `\n\n[ACTIVE RECALL]: Di sesi sebelumnya, pengguna ini sering melakukan kesalahan pada hal berikut:\n${errorList}\nHarap perhatikan baik-baik apakah pengguna kembali melakukan kesalahan ini di teks sekarang. Jika pengguna sudah benar dalam menggunakan konsep dari daftar di atas, masukkan 'Kategori' tersebut ke dalam array 'mastered_concepts' di JSON agar sistem dapat mengurangi bobot kesalahannya.`;
    }

    const prompt = `Level Saat Ini: ${currentLevel}\n\nTeks Asli (Bahasa Indonesia):\n${originalText}\n\nTerjemahan Pengguna (Bahasa Inggris):\n${submittedText}\n\nBerikan evaluasi berdasarkan instruksi System Prompt. Kembalikan HANYA JSON murni.${retryInstruction}${activeRecallInstruction}`;

    try {
        if (engine === 'sumopod') {
            const response = await openai.chat.completions.create({
                model: sumopodModel,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3
            });
            let rawText = response.choices[0].message.content;
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) rawText = jsonMatch[0];
            return { result: JSON.parse(rawText), tokens: response.usage ? response.usage.total_tokens : 0 };
        } else {
            // Gemini via Axios
            const response = await axios.post(getGeminiUrl(engine), {
                systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.2 }
            });
            let rawText = response.data.candidates[0].content.parts[0].text;
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) rawText = jsonMatch[0];
            return { result: JSON.parse(rawText), tokens: response.data.usageMetadata ? response.data.usageMetadata.totalTokenCount : 0 };
        }
    } catch (error) {
        console.error("AI Evaluation Error (" + engine + "):", error.response ? error.response.data : error.message);
        throw error;
    }
}

async function generateNextParagraph(currentLevel, topic = 'Bebas', engine = 'gemini-3.1-flash-lite', sumopodModel = 'glm-5') {
    const prompt = `Level Saat Ini: ${currentLevel}\nTopik Cerita: ${topic}\n\nBuatlah SATU paragraf cerita naratif baru dalam Bahasa Indonesia (sekitar 4-5 kalimat) yang sesuai dengan level CEFR tersebut dan bertemakan topik di atas. Paragraf ini akan digunakan sebagai soal terjemahan. Jangan berikan terjemahannya, HANYA paragraf Bahasa Indonesia saja. Jangan menambahkan basa-basi.`;

    try {
        if (engine === 'sumopod') {
            const response = await openai.chat.completions.create({
                model: sumopodModel,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7
            });
            return { text: response.choices[0].message.content.trim(), tokens: response.usage ? response.usage.total_tokens : 0 };
        } else {
            const response = await axios.post(getGeminiUrl(engine), {
                systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.7 }
            });
            return { text: response.data.candidates[0].content.parts[0].text.trim(), tokens: response.data.usageMetadata ? response.data.usageMetadata.totalTokenCount : 0 };
        }
    } catch (error) {
        console.error("AI Generation Error (" + engine + "):", error.response ? error.response.data : error.message);
        throw error;
    }
}

async function chatRoleplay(level, scenario, historyArr, engine = 'gemini-3.1-flash-lite', sumopodModel = 'glm-5') {
    const sysPrompt = `Kamu adalah partner roleplay simulasi kerja profesional berbahasa Inggris.\nSkenario/Peranmu: ${scenario}\nLevel Pengguna Saat Ini: ${level}\nAturan:\n1. Respons percakapan dengan natural layaknya ekspat/kolega kerja (maksimal 2-3 kalimat) SESUAIKAN dengan level CEFR pengguna (${level}). Gunakan kosakata yang relevan dengan level tersebut.\n2. Jangan mengoreksi bahasa Inggris pengguna di tengah percakapan.\n3. Wajib menggunakan bahasa Inggris.\n4. Sisipkan beberapa phrasal verb/idiom bisnis jika memungkinkan (sesuai level), jika tidak jangan memaksakannya.\n5. WAJIB: Setiap menggunakan idiom/phrasal verb, gunakan format: **idiom**{arti singkat Inggris | arti singkat Indonesia}. Contoh: **put off**{to delay | menunda}.`;

    try {
        if (engine === 'sumopod') {
            const messages = [{ role: 'system', content: sysPrompt }];
            if (historyArr.length === 0) {
                messages.push({ role: 'user', content: 'Hello. Let us start the roleplay.' });
            } else {
                historyArr.forEach(msg => messages.push({ role: msg.role === 'model' ? 'assistant' : 'user', content: msg.content }));
            }

            const response = await openai.chat.completions.create({
                model: sumopodModel,
                messages: messages,
                temperature: 0.7
            });
            return { text: response.choices[0].message.content.trim(), tokens: response.usage ? response.usage.total_tokens : 0 };
        } else {
            const contents = historyArr.map(msg => ({ role: msg.role, parts: [{ text: msg.content }] }));
            if (contents.length === 0) contents.push({ role: 'user', parts: [{ text: 'Hello. Let us start the roleplay.' }] });

            const response = await axios.post(getGeminiUrl(engine), {
                systemInstruction: { parts: [{ text: sysPrompt }] },
                contents: contents,
                generationConfig: { temperature: 0.7 }
            });
            return { text: response.data.candidates[0].content.parts[0].text.trim(), tokens: response.data.usageMetadata ? response.data.usageMetadata.totalTokenCount : 0 };
        }
    } catch (error) {
        console.error("AI Roleplay Error:", error.response ? error.response.data : error.message);
        throw error;
    }
}

async function evaluateRoleplay(level, scenario, transcript, engine = 'gemini-3.1-flash-lite', sumopodModel = 'glm-5', activeRecallErrors = []) {
    let activeRecallInstruction = "";
    if (activeRecallErrors.length > 0) {
        const errorList = activeRecallErrors.map(err => `- Kategori: ${err.mistake_category} (Kesalahan sebelumnya: '${err.wrong_word}', Seharusnya: '${err.correct_word}')`).join("\n");
        activeRecallInstruction = `\n\n[ACTIVE RECALL]: Di sesi sebelumnya, pengguna ini sering melakukan kesalahan pada hal berikut:\n${errorList}\nHarap perhatikan apakah pengguna kembali melakukan kesalahan ini di teks Roleplay. Jika pengguna sudah benar menggunakan daftar di atas, masukkan 'Kategori' tersebut ke 'mastered_concepts'.`;
    }

    const prompt = `Level Pengguna Saat Ini: ${level}\nSkenario Roleplay: ${scenario}\n\nTranskrip Percakapan (User & Model):\n${transcript}\n\nEvaluasi Bahasa Inggris "User". Saat memberikan 'native_refactoring', pastikan bahasanya disesuaikan agar tidak terlalu rumit melampaui level ${level}. Kembalikan JSON murni seperti biasa dengan status "[ROLEPLAY COMPLETED]".${activeRecallInstruction}`;

    try {
        if (engine === 'sumopod') {
            const response = await openai.chat.completions.create({
                model: sumopodModel,
                messages: [
                    { role: 'system', content: ROLEPLAY_EVAL_PROMPT },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3
            });
            let rawText = response.choices[0].message.content;
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) rawText = jsonMatch[0];
            return { result: JSON.parse(rawText), tokens: response.usage ? response.usage.total_tokens : 0 };
        } else {
            const response = await axios.post(getGeminiUrl(engine), {
                systemInstruction: { parts: [{ text: ROLEPLAY_EVAL_PROMPT }] },
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.2 }
            });
            let rawText = response.data.candidates[0].content.parts[0].text;
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) rawText = jsonMatch[0];
            return { result: JSON.parse(rawText), tokens: response.data.usageMetadata ? response.data.usageMetadata.totalTokenCount : 0 };
        }
    } catch (error) {
        console.error("AI Roleplay Eval Error:", error.response ? error.response.data : error.message);
        throw error;
    }
}

module.exports = {
    evaluateTranslation,
    generateNextParagraph,
    chatRoleplay,
    evaluateRoleplay
};
