const axios = require('axios');
const { OpenAI } = require('openai');

const SYSTEM_PROMPT = `
System Role & Objective:
Kamu adalah "TranslateGate AI", sebuah simulator ujian terjemahan bahasa Inggris yang ketat, progresif, dan berbasis teks panjang. Tujuan utamamu adalah melatih pengguna menerjemahkan narasi dari Bahasa Indonesia ke Bahasa Inggris, mulai dari level CEFR A1 hingga C2. Kamu bertindak sebagai penguji dan pengoreksi otomatis (Automated AI Reviewer).

Aturan Utama (Rules of Engagement):
1. Jangan pernah memberikan soal berupa kalimat pendek acak atau pilihan ganda. Selalu berikan satu paragraf utuh (minimal 4-5 kalimat) yang memiliki konteks naratif yang berkesinambungan.
2. Sesuaikan tema cerita dengan level CEFR saat ini. Tema bisa berkisar dari rutinitas harian, pekerjaan teknis (seperti software testing atau engineering), hingga opini akademis.
3. Pengguna saat ini berada di level A2. Mulailah ujian dari level ini.
4. Tunggu pengguna merespons dengan terjemahan murni ketikan mereka sendiri.

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
  "grammar_analysis": [
    {
      "type": "[Tenses / Structure / Word Order / Subject-Verb Agreement / Preposition / Minor]",
      "original_snippet": "potongan frasa/kalimat pengguna yang salah",
      "correction": "bentuk perbaikannya",
      "explanation": "Penjelasan teknis letak kesalahannya agar lebih mantap dipahami."
    }
  ],
  "vocabulary_correction": [
    {
      "original_word": "kata yang kaku atau kurang tepat",
      "suggested_word": "padanan kata yang lebih baik",
      "context_reason": "Alasan mengapa kata saran terdengar lebih natural untuk konteks narasi ini."
    }
  ],
  "native_refactoring": "Teks penuh yang direvisi total agar mengalir luwes layaknya penutur asli.",
  "key_takeaway": "Satu poin penting atau pedoman bahasa Inggris utama yang bisa dipelajari dari sesi ini.",
  "next_instruction": "Instruksi tegas: minta user mengulang teks yang sama (jika FAIL), atau notifikasi mendapat topik baru/level up (jika PASS)."
}
`;

// Gemini Config
const GEMINI_API_KEY = 'AIzaSyB9chdk_UOT1BX6PrNMHtG8tIOcxn7La-s';
const getGeminiUrl = (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

// SumoPod Config
const openai = new OpenAI({
    apiKey: 'sk-hhMgiZRMki5iGl5w411LxQ',
    baseURL: 'https://ai.sumopod.com/v1'
});

async function evaluateTranslation(currentLevel, originalText, submittedText, isRetry = false, engine = 'gemini-3.1-flash-lite', sumopodModel = 'glm-5.1') {
    const retryInstruction = isRetry ? "\n\nPENTING: Ini adalah percobaan ulang (RETRY) dari pengguna untuk teks yang sama. Jika terjemahan sekarang sudah benar dan layak lulus, status WAJIB diisi dengan '[RETRY PASS]'. JANGAN PERNAH berikan '[CLEAN PASS]' pada percobaan ulang." : "";
    const prompt = `Level Saat Ini: ${currentLevel}\n\nTeks Asli (Bahasa Indonesia):\n${originalText}\n\nTerjemahan Pengguna (Bahasa Inggris):\n${submittedText}\n\nBerikan evaluasi berdasarkan instruksi System Prompt. Kembalikan HANYA JSON murni.${retryInstruction}`;

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
            rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            return { result: JSON.parse(rawText), tokens: response.usage ? response.usage.total_tokens : 0 };
        } else {
            // Gemini via Axios
            const response = await axios.post(getGeminiUrl(engine), {
                systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.2 }
            });
            let rawText = response.data.candidates[0].content.parts[0].text;
            rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            return { result: JSON.parse(rawText), tokens: response.data.usageMetadata ? response.data.usageMetadata.totalTokenCount : 0 };
        }
    } catch (error) {
        console.error("AI Evaluation Error (" + engine + "):", error.response ? error.response.data : error.message);
        throw error;
    }
}

async function generateNextParagraph(currentLevel, topic = 'Bebas', engine = 'gemini-3.1-flash-lite', sumopodModel = 'glm-5.1') {
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

module.exports = {
    evaluateTranslation,
    generateNextParagraph
};
