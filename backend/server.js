const express = require('express');
const cors = require('cors');
const path = require('path');
const { db, initDb } = require('./database');
const { evaluateTranslation, generateNextParagraph } = require('./ai-engine');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Initialize DB
initDb();

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// Basic Login Route
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    try {
        const user = db.prepare('SELECT id, username FROM users WHERE username = ? AND password = ?').get(username, password);
        if (user) {
            res.json({ success: true, username: user.username });
        } else {
            res.status(401).json({ error: 'Username atau password salah' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/user', (req, res) => {
    const username = req.headers['x-username'];
    if (!username) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/generate', async (req, res) => {
    const username = req.headers['x-username'];
    if (!username) return res.status(401).json({ error: 'Unauthorized' });
    
    const topic = req.body.topic || 'Bebas';
    const engine = req.body.engine || 'gemini-3.1-flash-lite';
    const sumopodModel = req.body.sumopodModel || 'glm-5.1';

    try {
        const user = db.prepare('SELECT id, current_level FROM users WHERE username = ?').get(username);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const aiResponse = await generateNextParagraph(user.current_level, topic, engine, sumopodModel);
        
        if (aiResponse.tokens) {
            db.prepare('UPDATE users SET tokens_used = tokens_used + ? WHERE id = ?').run(aiResponse.tokens, user.id);
        }
        
        res.json({ text: aiResponse.text, tokens: aiResponse.tokens });
    } catch (error) {
        res.status(500).json({ error: 'Gagal membuat teks soal: ' + error.message });
    }
});

app.get('/api/history', (req, res) => {
    const username = req.headers['x-username'];
    if (!username) return res.status(401).json({ error: 'Unauthorized' });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const offset = (page - 1) * limit;

    try {
        const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const totalRow = db.prepare('SELECT COUNT(*) as count FROM history WHERE user_id = ?').get(user.id);
        const totalPages = Math.ceil(totalRow.count / limit);

        const history = db.prepare('SELECT * FROM history WHERE user_id = ? ORDER BY id DESC LIMIT ? OFFSET ?')
                          .all(user.id, limit, offset);

        res.json({
            history: history, // Returned DESC (newest first)
            currentPage: page,
            totalPages: totalPages,
            hasMore: page < totalPages
        });
    } catch (error) {
        res.status(500).json({ error: 'Gagal mengambil riwayat: ' + error.message });
    }
});

app.post('/api/evaluate', async (req, res) => {
    const username = req.headers['x-username'];
    if (!username) return res.status(401).json({ error: 'Unauthorized' });

    const { original_text, submitted_text, engine, sumopodModel } = req.body;
    const aiEngine = engine || 'gemini-3.1-flash-lite';

    try {
        const user = db.prepare('SELECT id, current_level, streak FROM users WHERE username = ?').get(username);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const previousAttempts = db.prepare(`SELECT COUNT(*) as count FROM history WHERE user_id = ? AND original_text = ? AND status LIKE '%FAIL%'`).get(user.id, original_text);
        const isRetry = previousAttempts.count > 0;

        const aiResponse = await evaluateTranslation(user.current_level, original_text, submitted_text, isRetry, aiEngine, sumopodModel);
        const evaluation = aiResponse.result;
        const tokens = aiResponse.tokens;

        // Update database based on status
        let newStreak = user.streak;
        let newLevel = user.current_level;

        if (evaluation.status.includes('CLEAN PASS')) {
            newStreak += 1;
            if (newStreak >= 3) {
                const currentIndex = LEVELS.indexOf(newLevel);
                if (currentIndex < LEVELS.length - 1) {
                    newLevel = LEVELS[currentIndex + 1];
                    newStreak = 0; // Reset streak on level up
                    evaluation.next_instruction += `\nSelamat! Anda naik ke level ${newLevel}.`;
                }
            }
        } else if (evaluation.status.includes('FAIL')) {
            newStreak = 0; // Reset streak on fail
        }

        if (aiResponse.tokens) {
            db.prepare('UPDATE users SET tokens_used = tokens_used + ? WHERE id = ?').run(aiResponse.tokens, user.id);
        }

        db.prepare('UPDATE users SET current_level = ?, streak = ? WHERE id = ?').run(newLevel, newStreak, user.id);

        // Save history
        db.prepare(`
            INSERT INTO history (
                user_id, original_text, submitted_text, status, overall_feedback, grammar_analysis, 
                vocabulary_correction, native_refactoring, key_takeaway, next_instruction
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            user.id, original_text, submitted_text, evaluation.status, evaluation.overall_feedback,
            JSON.stringify(evaluation.grammar_analysis), JSON.stringify(evaluation.vocabulary_correction), evaluation.native_refactoring, evaluation.key_takeaway, evaluation.next_instruction
        );

        res.json({
            evaluation,
            user_state: {
                current_level: newLevel,
                streak: newStreak
            },
            tokens
        });

    } catch (error) {
        res.status(500).json({ error: 'Gagal mengevaluasi: ' + error.message });
    }
});

const PORT = process.env.PORT || 9000;
app.listen(PORT, () => {
    console.log(`TranslateGate AI berjalan di port ${PORT}`);
});
