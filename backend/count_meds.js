const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./medrec.db');
db.get("SELECT count(*) as count FROM medicine_registry", (err, row) => {
    if(err) console.error(err);
    else console.log("Total Medicines:", row.count);
    // Test a new item
    db.all("SELECT * FROM medicine_registry WHERE name LIKE '%Vitamin C%'", (err, rows) => {
        console.log("Vitamin C check:", rows);
    });
});
