const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = 5000;
const SECRET_KEY = 'super_secret_medrec_key';

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database Setup
const dbPath = path.join(__dirname, 'medrec.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // Users Table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT UNIQUE,
            password TEXT
        )`);

        // Doctors Table
        db.run(`CREATE TABLE IF NOT EXISTS doctors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT UNIQUE,
            password TEXT,
            speciality TEXT,
            bio TEXT,
            avatar TEXT
        )`);

        // Follows Table
        db.run(`CREATE TABLE IF NOT EXISTS follows (
            user_id INTEGER,
            doctor_id INTEGER,
            PRIMARY KEY (user_id, doctor_id),
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(doctor_id) REFERENCES doctors(id)
        )`);

        // Consultations Table (Requests)
        db.run(`CREATE TABLE IF NOT EXISTS consultations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            doctor_id INTEGER,
            symptoms TEXT,
            status TEXT DEFAULT 'pending', -- pending, completed
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(doctor_id) REFERENCES doctors(id)
        )`);

        // Prescriptions Table (Medicines for a consultation)
        db.run(`CREATE TABLE IF NOT EXISTS prescriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            consultation_id INTEGER,
            name TEXT,
            reason TEXT,
            safe BOOLEAN,
            suggested_by TEXT,
            FOREIGN KEY(consultation_id) REFERENCES consultations(id)
        )`);

        // Seed Doctors
        db.get("SELECT count(*) as count FROM doctors", async (err, row) => {
            if (row.count === 0) {
                const password = await bcrypt.hash('password', 10);
                const doctors = [
                    { name: 'Dr. Emily Carter', email: 'emily.carter@gmail.com', speciality: 'Cardiologist', bio: 'Expert in heart health and cardiovascular diseases with 10+ years of experience.', avatar: 'https://i.pravatar.cc/150?img=5' },
                    { name: 'Dr. James Wilson', email: 'james.wilson@gmail.com', speciality: 'General Physician', bio: 'Dedicated to comprehensive family healthcare and preventive medicine.', avatar: 'https://i.pravatar.cc/150?img=11' },
                    { name: 'Dr. Sarah Patel', email: 'sarah.patel@gmail.com', speciality: 'Dermatologist', bio: 'Specialist in skin care, acne treatment, and cosmetic dermatology.', avatar: 'https://i.pravatar.cc/150?img=9' },
                    { name: 'Dr. Michael Brown', email: 'michael.brown@gmail.com', speciality: 'Neurologist', bio: 'Focused on treating disorders of the nervous system and brain health.', avatar: 'https://i.pravatar.cc/150?img=3' },
                    { name: 'Dr. Linda Davis', email: 'linda.davis@gmail.com', speciality: 'Pediatrician', bio: 'Compassionate care for infants, children, and adolescents.', avatar: 'https://i.pravatar.cc/150?img=1' }
                ];
                const stmt = db.prepare("INSERT INTO doctors (name, email, password, speciality, bio, avatar) VALUES (?, ?, ?, ?, ?, ?)");
                doctors.forEach(doc => {
                    stmt.run(doc.name, doc.email, password, doc.speciality, doc.bio, doc.avatar);
                });
                stmt.finalize();
                console.log('Seeded doctors data.');
            }
        });
    });
}

// Helper: Verify Token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: 'Forbidden' });
        req.user = user;
        next();
    });
}


// --- Auth Routes ---

app.post('/api/register', async (req, res) => {
    console.log('Register Request Body:', req.body);
    const { name, email, password, type, speciality, bio } = req.body; // type: 'user' or 'doctor'
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        if (type === 'doctor') {
            const avatar = `https://i.pravatar.cc/150?u=${email}`; // Generate random avatar based on email
            db.run("INSERT INTO doctors (name, email, password, speciality, bio, avatar) VALUES (?, ?, ?, ?, ?, ?)", 
                [name, email, hashedPassword, speciality || 'General Physician', bio || 'Experienced doctor.', avatar], 
                function(err) {
                    if (err) {
                        console.error(err);
                        return res.status(400).json({ error: err.message });
                    }
                    res.json({ message: 'Doctor registered', userId: this.lastID });
            });
        } else {
            db.run("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", 
                [name, email, hashedPassword], 
                function(err) {
                    if (err) return res.status(400).json({ error: 'Email exists' });
                    res.json({ message: 'User registered', userId: this.lastID });
            });
        }
    } catch (e) { res.status(500).json({ error: 'Error' }); }
});

app.post('/api/login', (req, res) => {
    const { email, password, type } = req.body; // type: 'user' or 'doctor'
    const table = type === 'doctor' ? 'doctors' : 'users';

    db.get(`SELECT * FROM ${table} WHERE email = ?`, [email], async (err, user) => {
        if (err || !user) return res.status(400).json({ error: 'User not found' });

        if (await bcrypt.compare(password, user.password)) {
            const token = jwt.sign({ id: user.id, role: type, name: user.name }, SECRET_KEY);
            res.json({ token, user: { id: user.id, name: user.name, role: type, email: user.email } });
        } else {
            res.status(400).json({ error: 'Invalid credentials' });
        }
    });
});

// --- Doctor Routes ---

app.get('/api/doctors', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const query = `
        SELECT d.id, d.name, d.speciality, d.bio, d.avatar,
        CASE WHEN f.user_id IS NOT NULL THEN 1 ELSE 0 END as isFollowed
        FROM doctors d
        LEFT JOIN follows f ON d.id = f.doctor_id AND f.user_id = ?
    `;
    db.all(query, [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/doctors/:id/follow', authenticateToken, (req, res) => {
    if (req.user.role !== 'user') return res.status(403).json({ error: 'Only users can follow' });
    const { action } = req.body;
    const doctorId = req.params.id;
    const userId = req.user.id;

    if (action === 'follow') {
        db.run("INSERT OR IGNORE INTO follows (user_id, doctor_id) VALUES (?, ?)", [userId, doctorId], (err) => res.json({ success: true }));
    } else {
        db.run("DELETE FROM follows WHERE user_id = ? AND doctor_id = ?", [userId, doctorId], (err) => res.json({ success: true }));
    }
});

// --- Suggestion / Consultation Routes ---

// 1. User submits symptoms
app.post('/api/suggest', authenticateToken, (req, res) => {
    const { symptoms, preferredDoctorId } = req.body;
    const userId = req.user.id;

    // Generate AI Suggestions
    const s = symptoms.toLowerCase();
    let aiSuggestions = [];
    const medicines = [
        { keywords: ['headache', 'migraine'], name: 'Paracetamol', reason: 'Pain relief', safe: true },
        { keywords: ['fever', 'hot'], name: 'Ibuprofen', reason: 'Fever reducer', safe: true },
        { keywords: ['cough'], name: 'Cough Syrup', reason: 'Cough suppressant', safe: true },
        { keywords: ['stomach', 'acid'], name: 'Antacid', reason: 'Neutralizes acid', safe: true },
        { keywords: ['pain'], name: 'Aspirin', reason: 'Pain relief', safe: false }
    ];

    medicines.forEach(med => {
        if (med.keywords.some(k => s.includes(k))) {
            aiSuggestions.push({ ...med, suggestedBy: 'System AI' });
        }
    });
    if (aiSuggestions.length === 0) {
        aiSuggestions.push({ name: 'Consult Physician', reason: 'No clear match', safe: true, suggestedBy: 'System AI' });
    }

    // Always save to history
    const doctorId = preferredDoctorId || null;
    const status = preferredDoctorId ? 'pending' : 'completed';

    db.run("INSERT INTO consultations (user_id, doctor_id, symptoms, status) VALUES (?, ?, ?, ?)", 
        [userId, doctorId, symptoms, status], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            const consultationId = this.lastID;
            
            // Save suggestions (AI generated)
            const stmt = db.prepare("INSERT INTO prescriptions (consultation_id, name, reason, safe, suggested_by) VALUES (?, ?, ?, ?, ?)");
            aiSuggestions.forEach(med => {
                stmt.run(consultationId, med.name, med.reason, med.safe, med.suggestedBy);
            });
            stmt.finalize();

            if (preferredDoctorId) {
                res.json({ message: 'Request sent to doctor', status: 'pending', suggestions: aiSuggestions });
            } else {
                res.json({ suggestions: aiSuggestions, status: 'completed' });
            }
    });
});

// 2. Get User's Consultations
app.get('/api/user/consultations', authenticateToken, (req, res) => {
    db.all(`SELECT c.*, d.name as doctor_name 
            FROM consultations c 
            LEFT JOIN doctors d ON c.doctor_id = d.id 
            WHERE c.user_id = ? ORDER BY c.created_at DESC`, [req.user.id], async (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        try {
            const consultationsWithMeds = await Promise.all(rows.map(async (c) => {
                return new Promise((resolve, reject) => {
                    db.all("SELECT * FROM prescriptions WHERE consultation_id = ?", [c.id], (err, meds) => {
                        if (err) reject(err);
                        else resolve({ ...c, prescriptions: meds });
                    });
                });
            }));
            res.json(consultationsWithMeds);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });
});

// 3. Get Consultation Details (with prescriptions)
app.get('/api/consultations/:id', authenticateToken, (req, res) => {
    const id = req.params.id;
    db.all("SELECT * FROM prescriptions WHERE consultation_id = ?", [id], (err, rows) => {
        res.json({ prescriptions: rows });
    });
});

// 4. Doctor: Get Pending Requests
app.get('/api/doctor/requests', authenticateToken, (req, res) => {
    if (req.user.role !== 'doctor') return res.status(403).json({ error: 'Access denied' });
    
    db.all(`SELECT c.*, u.name as user_name 
            FROM consultations c 
            JOIN users u ON c.user_id = u.id 
            WHERE c.doctor_id = ? AND c.status = 'pending'`, [req.user.id], (err, rows) => {
        res.json(rows);
    });
});

// 4.5 Doctor: Get History (Completed Requests)
app.get('/api/doctor/history', authenticateToken, (req, res) => {
    if (req.user.role !== 'doctor') return res.status(403).json({ error: 'Access denied' });
    
    db.all(`SELECT c.*, u.name as user_name 
            FROM consultations c 
            JOIN users u ON c.user_id = u.id 
            WHERE c.doctor_id = ? AND c.status = 'completed'
            ORDER BY c.created_at DESC`, [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 5. Doctor: Update Prescription (Add/Delete)
app.post('/api/doctor/consultations/:id/modify', authenticateToken, (req, res) => {
    if (req.user.role !== 'doctor') return res.status(403).json({ error: 'Access denied' });
    const consultationId = req.params.id;
    const { action, medicine } = req.body; // action: 'add' or 'delete'

    if (action === 'add') {
        db.run("INSERT INTO prescriptions (consultation_id, name, reason, safe, suggested_by) VALUES (?, ?, ?, ?, ?)",
            [consultationId, medicine.name, medicine.reason, medicine.safe, req.user.name], (err) => {
                res.json({ success: true });
        });
    } else if (action === 'delete') {
        db.run("DELETE FROM prescriptions WHERE id = ?", [medicine.id], (err) => res.json({ success: true }));
    }
});

// 6. Doctor: Approve Consultation
app.post('/api/doctor/consultations/:id/approve', authenticateToken, (req, res) => {
    if (req.user.role !== 'doctor') return res.status(403).json({ error: 'Access denied' });
    db.run("UPDATE consultations SET status = 'completed' WHERE id = ?", [req.params.id], (err) => {
        res.json({ success: true });
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});
