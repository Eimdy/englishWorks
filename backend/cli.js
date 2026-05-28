const { db, initDb } = require('./database');
const args = process.argv.slice(2);

if (args.length < 2) {
    console.log("Usage for adding: node cli.js add <username> <password>");
    console.log("Usage for deleting: node cli.js delete <username>");
    console.log("Usage for updating CEFR: node cli.js update <username> <cefr_level>");
    process.exit(1);
}

const action = args[0];
const username = args[1];

initDb();

try {
    if (action === 'add') {
        const password = args[2];
        if (!password) {
            console.log("Error: Password required for adding a user.");
            process.exit(1);
        }
        db.prepare("INSERT INTO users (username, password, current_level, streak) VALUES (?, ?, 'A2', 0)").run(username, password);
        console.log(`User ${username} created successfully!`);
    } else if (action === 'delete') {
        const result = db.prepare("DELETE FROM users WHERE username = ?").run(username);
        if (result.changes > 0) {
            // Also delete their history
            const user = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
            if(user) {
                db.prepare("DELETE FROM history WHERE user_id = ?").run(user.id);
            }
            console.log(`User ${username} deleted successfully!`);
        } else {
            console.log(`User ${username} not found.`);
        }
    } else if (action === 'update') {
        const level = args[2];
        if (!level) {
            console.log("Error: CEFR level required for updating (e.g., A1, B2, C1).");
            process.exit(1);
        }
        
        const validLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
        const upperLevel = level.toUpperCase();
        if (!validLevels.includes(upperLevel)) {
            console.log("Error: Invalid CEFR level. Must be one of: " + validLevels.join(", "));
            process.exit(1);
        }

        const result = db.prepare("UPDATE users SET current_level = ? WHERE username = ?").run(upperLevel, username);
        if (result.changes > 0) {
            console.log(`User ${username} CEFR level updated to ${upperLevel} successfully!`);
        } else {
            console.log(`User ${username} not found.`);
        }
    } else {
        console.log("Unknown action. Use 'add', 'delete', or 'update'.");
    }
} catch (error) {
    console.error("Error:", error.message);
}
