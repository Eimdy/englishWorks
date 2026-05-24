const { db, initDb } = require('./database');
const args = process.argv.slice(2);

if (args.length < 2) {
    console.log("Usage for adding: node cli.js add <username> <password>");
    console.log("Usage for deleting: node cli.js delete <username>");
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
    } else {
        console.log("Unknown action. Use 'add' or 'delete'.");
    }
} catch (error) {
    console.error("Error:", error.message);
}
