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

        // Medicines Registry Table (Replacement for AI)
        db.run(`CREATE TABLE IF NOT EXISTS medicine_registry (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            keywords TEXT,
            name TEXT,
            reason TEXT,
            safe BOOLEAN
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

        // Seed Medicines (Force Update logic)
        db.get("SELECT count(*) as count FROM medicine_registry", (err, row) => {
            // ALWAYS re-seed if requested (or just check if count < 50 to trigger update)
            if (row.count < 120) {
                 // Clear old data to prevent duplicates if we are updating from small list
                 db.run("DELETE FROM medicine_registry", [], (err) => {
                     if(!err) console.log("Cleared old registry data for update.");
                 });

                const medicines = [
                    // PAIN & FEVER
                    // --- PAIN & FEVER (15) ---
                    { keywords: 'headache, migraine, head pain', name: 'Paracetamol (Tylenol)', reason: 'Pain relief and fever reduction.', safe: true },
                    { keywords: 'severe headache, cluster headache', name: 'Excedrin', reason: 'Combines aspirin, acetaminophen, and caffeine for migraines.', safe: true },
                    { keywords: 'fever, temperature, chills', name: 'Ibuprofen (Advil)', reason: 'Anti-inflammatory for fever and pain.', safe: true },
                    { keywords: 'body ache, muscle pain, flu pain', name: 'Naproxen (Aleve)', reason: 'Long-lasting relief for muscle and joint pain.', safe: true },
                    { keywords: 'toothache, dental pain', name: 'Benzocaine Gel', reason: 'Topical anesthetic for gum/tooth pain.', safe: true },
                    { keywords: 'period pain, menstrual cramps', name: 'Midol', reason: 'Relief for cramps and bloating.', safe: true },
                    { keywords: 'back pain, lower back', name: 'Robaxin (OTC lower dose)', reason: 'Muscle relaxant for back strain.', safe: true },
                    { keywords: 'joint pain, arthritis, stiffness', name: 'Diclofenac Gel (Voltaren)', reason: 'Topical anti-inflammatory for joints.', safe: true },
                    { keywords: 'swelling, inflammation, sprain', name: 'Arnica Gel', reason: 'Natural remedy for bruising and swelling.', safe: true },
                    { keywords: 'earache, ear pain', name: 'Ear Drops (Antipyrine)', reason: 'Relieves ear pain and congestion.', safe: true },

                    // --- COLD, FLU & RESPIRATORY (20) ---
                    { keywords: 'runny nose, sneezing, allergy', name: 'Cetirizine (Zyrtec)', reason: 'Non-drowsy antihistamine.', safe: true },
                    { keywords: 'blocked nose, congestion, stuffy', name: 'Phenylephrine (Sudafed)', reason: 'Nasal decongestant.', safe: true },
                    { keywords: 'itchy eyes, watery eyes', name: 'Loratadine (Claritin)', reason: 'Relief for allergy symptoms.', safe: true },
                    { keywords: 'dry cough, hacking cough', name: 'Dextromethorphan (Robitussin)', reason: 'Cough suppressant.', safe: true },
                    { keywords: 'wet cough, phlegm, mucus', name: 'Guaifenesin (Mucinex)', reason: 'Expectorant to thin mucus.', safe: true },
                    { keywords: 'sore throat, scratchy throat', name: 'Lozenges (Strepsils)', reason: 'Soothes throat irritation.', safe: true },
                    { keywords: 'severe sore throat', name: 'Chloraseptic Spray', reason: 'Numbing spray for throat pain.', safe: true },
                    { keywords: 'night cough, cold sleep', name: 'NyQuil', reason: 'Nighttime relief for cold and flu.', safe: true },
                    { keywords: 'daytime cold, flu', name: 'DayQuil', reason: 'Non-drowsy cold relief.', safe: true },
                    { keywords: 'sinus pain, sinus pressure', name: 'Advil Cold & Sinus', reason: 'Relieves sinus congestion and pain.', safe: true },
                    { keywords: 'hay fever, pollen allergy', name: 'Fexofenadine (Allegra)', reason: 'Antihistamine for seasonal allergies.', safe: true },
                    { keywords: 'nasal dry, nose bleed', name: 'Saline Nasal Spray', reason: 'Moisturizes dry nasal passages.', safe: true },
                    { keywords: 'chest rub, congestion', name: 'Vicks VapoRub', reason: 'Topical ointment to help breathing.', safe: true },
                    { keywords: 'wheezing, mild asthma', name: 'Primatene Mist', reason: 'Temporary relief for mild asthma (consult doctor).', safe: true }, 

                    // --- DIGESTIVE & STOMACH (20) ---
                    { keywords: 'acidity, heartburn, acid reflux', name: 'Antacid (Tums/Rolaids)', reason: 'Neutralizes stomach acid.', safe: true },
                    { keywords: 'gerd, chronic heartburn', name: 'Omeprazole (Prilosec)', reason: 'Acid reducer (PPI).', safe: true },
                    { keywords: 'gas, boating, farting', name: 'Simethicone (Gas-X)', reason: 'Relieves gas pressure.', safe: true },
                    { keywords: 'diarrhea, loose motions', name: 'Loperamide (Imodium)', reason: 'Slows digestion to stop diarrhea.', safe: true },
                    { keywords: 'constipation, cant poop', name: 'Psyllium Husk (Metamucil)', reason: 'Fiber supplement for regularity.', safe: true },
                    { keywords: 'hard stool, severe constipation', name: 'Bisacodyl (Dulcolax)', reason: 'Laxative for temporary relief.', safe: true },
                    { keywords: 'nausea, vomiting, motion sickness', name: 'Dimenhydrinate (Dramamine)', reason: 'Prevents motion sickness.', safe: true },
                    { keywords: 'stomach pain, cramps', name: 'Pepto-Bismol', reason: 'Relieves upset stomach and diarrhea.', safe: true },
                    { keywords: 'probiotic, gut health', name: 'Probiotic Supplement', reason: 'Restores healthy gut bacteria.', safe: true },
                    { keywords: 'lactose intolerance, milk gas', name: 'Lactaid', reason: 'Enzyme to digest dairy.', safe: true },
                    { keywords: 'hemorrhoids, piles pain', name: 'Preparation H', reason: 'Cream for hemorrhoid relief.', safe: true },

                    // --- SKIN (20) ---
                    { keywords: 'itch, rash, insect bite', name: 'Hydrocortisone Cream', reason: 'Reduces inflammation and itching.', safe: true },
                    { keywords: 'poison ivy, oak rash', name: 'Calamine Lotion', reason: 'Soothing and drying agent.', safe: true },
                    { keywords: 'dry skin, eczema', name: 'Moisturizing Cream (CeraVe)', reason: 'Hydrates and repairs skin barrier.', safe: true },
                    { keywords: 'cut, scrape, wound', name: 'Neosporin', reason: 'Antibiotic ointment to prevent infection.', safe: true },
                    { keywords: 'burn, minor burn', name: 'Aloe Vera Gel', reason: 'Cools and soothes burns.', safe: true },
                    { keywords: 'fungal, ringworm, jock itch', name: 'Clotrimazole (Lotrimin)', reason: 'Antifungal cream.', safe: true },
                    { keywords: 'athlete foot', name: 'Tolnaftate Spray', reason: 'Treats foot fungal infections.', safe: true },
                    { keywords: 'acne, pimples', name: 'Benzoyl Peroxide', reason: 'Kills acne-causing bacteria.', safe: true },
                    { keywords: 'dandruff, itchy scalp', name: 'Ketoconazole Shampoo', reason: 'Anti-dandruff treatment.', safe: true },
                    { keywords: 'cold sore, lip blister', name: 'Abreva', reason: 'Treats cold sores.', safe: true },
                    { keywords: 'wart, skin tag', name: 'Salicylic Acid', reason: 'Removes warts over time.', safe: true },
                    { keywords: 'sunburn, sun burn', name: 'Solarcaine', reason: 'Pain relief spray for sunburn.', safe: true },

                    // --- FIRST AID & PAIN (10) ---
                    { keywords: 'muscle rub, soreness', name: 'Icy Hot / Biofreeze', reason: 'Topical pain relief.', safe: true },
                    { keywords: 'eye irritation, red eye', name: 'Visine', reason: 'Reduces eye redness.', safe: true },
                    { keywords: 'dry eyes', name: 'Artificial Tears', reason: 'Lubricates dry eyes.', safe: true },
                    { keywords: 'sleep, insomnia', name: 'Melatonin', reason: 'Sleep aid.', safe: true },
                    { keywords: 'anxiety, mild stress', name: 'Ashwagandha', reason: 'Herbal supplement for stress.', safe: true },
                    { keywords: 'motion sickness, sea sick', name: 'Meclizine (Bonine)', reason: 'Less drowsy motion sickness relief.', safe: true },
                    
                    // --- VITAMINS & GENERAL (10) ---
                    { keywords: 'energy, tiredness', name: 'Vitamin B12', reason: 'Boosts energy levels.', safe: true },
                    { keywords: 'immune boost, cold prevent', name: 'Vitamin C', reason: 'Supports immune system.', safe: true },
                    { keywords: 'bone health', name: 'Calcium + Vitamin D', reason: 'Strengthens bones.', safe: true },
                    { keywords: 'general health', name: 'Multivitamin', reason: 'Daily nutritional support.', safe: true },
                    
                    
                    // --- SPECIFIC PAIN (10) ---
                    { keywords: 'knee pain, joint stiffness', name: 'Knee Support / Gel', reason: 'Support and topical relief for knee.', safe: true },
                    { keywords: 'neck pain, stiff neck', name: 'Heat Patch', reason: 'Relaxes stiff neck muscles.', safe: true },
                    { keywords: 'shoulder pain', name: 'Icy Hot Patch', reason: 'Topical relief for shoulder strain.', safe: true },
                    { keywords: 'wrist pain, carpal tunnel', name: 'Wrist Splint', reason: 'Immobilizes wrist to aid healing.', safe: true },
                    { keywords: 'ankle sprain, twisted ankle', name: 'Epsom Salt Soak', reason: 'Reduces swelling.', safe: true },
                    { keywords: 'tennis elbow, elbow pain', name: 'Elbow Brace', reason: 'Reduces strain on healing tendons.', safe: true },
                    { keywords: 'foot pain, plantar fasciitis', name: 'Arch Support', reason: 'Relieves foot arch pain.', safe: true },
                    { keywords: 'sciatica, radiating leg pain', name: 'Heat Pad', reason: 'Relieves nerve tension warmth.', safe: true },
                    { keywords: 'shin splints, runner leg', name: 'Ice Pack', reason: 'Reduces inflammation after running.', safe: true },
                    { keywords: 'leg cramps, charley horse', name: 'Magnesium Spray', reason: 'Relaxes muscle cramps.', safe: true },

                    // --- SUPPLEMENTS & HERBAL (10) ---
                    { keywords: 'immunity, zinc', name: 'Zinc Lozenges', reason: 'May shorten cold duration.', safe: true },
                    { keywords: 'sun deficiency, bone weak', name: 'Vitamin D3', reason: 'Essential for bone health.', safe: true },
                    { keywords: 'anemia, pale, weak', name: 'Iron Supplement', reason: 'Treats iron deficiency.', safe: true },
                    { keywords: 'muscle relax, sleep aid', name: 'Magnesium Glycinate', reason: 'Promotes relaxation.', safe: true },
                    { keywords: 'heart health, brain fog', name: 'Fish Oil (Omega-3)', reason: 'Supports heart and brain.', safe: true },
                    { keywords: 'hair loss, weak nails', name: 'Biotin', reason: 'Supports hair and nail growth.', safe: true },
                    { keywords: 'pregnancy health', name: 'Prenatal Vitamin', reason: 'Vital nutrition for pregnancy.', safe: true },
                    { keywords: 'digestion fiber', name: 'Fiber Gummies', reason: 'Supports digestion.', safe: true },
                    { keywords: 'dehydration, hangover', name: 'Electrolyte Powder', reason: 'Rehydrates quickly.', safe: true },
                    { keywords: 'nausea, stomach upset', name: 'Ginger Chews', reason: 'Natural nausea relief.', safe: true },

                    // --- WOMEN & KIDS (10) ---
                    { keywords: 'yeast infection, vaginal itch', name: 'Clotrimazole Cream (Monistat)', reason: 'Treats yeast infections.', safe: true },
                    { keywords: 'uti pain, urinary burning', name: 'Phenazopyridine (Azo)', reason: 'Relieves urinary pain (see doctor for cure).', safe: true },
                    { keywords: 'pms mood, irritability', name: 'Pamprin', reason: 'Relieves PMS symptoms.', safe: true },
                    { keywords: 'menopause, hot flashes', name: 'Black Cohosh', reason: 'Herbal relief for hot flashes.', safe: true },
                    { keywords: 'baby teething, gum pain', name: 'Teething Gel', reason: 'Soothes baby gums.', safe: true },
                    { keywords: 'diaper rash, baby bum', name: 'Desitin (Zinc Oxide)', reason: 'Protects baby skin.', safe: true },
                    { keywords: 'baby colic, gas', name: 'Gripe Water', reason: 'Soothes baby stomach.', safe: true },
                    { keywords: 'baby cold, stuffy nose', name: 'Saline Drops (Little Remedies)', reason: 'Clears baby nose.', safe: true },
                    { keywords: 'kids fever', name: 'Childrens Tylenol', reason: 'Safe fever relief for kids.', safe: true },
                    { keywords: 'kids allergy', name: 'Childrens Claritin', reason: 'Safe allergy relief for kids.', safe: true },

                    // --- MOUTH & MISC (10) ---
                    { keywords: 'dry mouth', name: 'Biotene', reason: 'Moisturizes dry mouth.', safe: true },
                    { keywords: 'bad breath, halitosis', name: 'Mouthwash (Therabreath)', reason: 'Kills bad breath bacteria.', safe: true },
                    { keywords: 'mouth ulcer, canker sore', name: 'Orajel', reason: 'Numbing gel for sores.', safe: true },
                    { keywords: 'chapped lips, dry lips', name: 'Lip Balm (Vaseline)', reason: 'Moisturizes lips.', safe: true },
                    { keywords: 'sun protection', name: 'Sunscreen SPF 50', reason: 'Prevents burns.', safe: true },
                    { keywords: 'mosquito bite prevent', name: 'Bug Spray (DEET)', reason: 'Repels insects.', safe: true },
                    { keywords: 'germs, sanitize', name: 'Hand Sanitizer', reason: 'Kills germs on hands.', safe: true },
                    { keywords: 'virus protection', name: 'Face Mask', reason: 'Reduces transmission.', safe: true },
                    { keywords: 'red eye relief', name: 'Lumify', reason: 'Whitens red eyes.', safe: true },
                    { keywords: 'ear wax, clogged ear', name: 'Ear Wax Removal Kit', reason: 'Safely removes wax.', safe: true },

                    // --- CRITICAL / WARNINGS ---
                    { keywords: 'chest pain, heart attack', name: 'Emergency Room', reason: 'Call 911 immediately.', safe: true },
                    { keywords: 'difficulty breathing, blue lips', name: 'Emergency Room', reason: 'Severe respiratory distress.', safe: true },
                    { keywords: 'severe bleeding, deep cut', name: 'Emergency Room', reason: 'Requires stitches/medical attention.', safe: true },
                    { keywords: 'seizure, fit', name: 'Emergency Room', reason: 'Medical emergency.', safe: true },
                    { keywords: 'stroke, face drooping', name: 'Emergency Room', reason: 'Time is critical. Call 911.', safe: true },
                ];

                const stmt = db.prepare("INSERT INTO medicine_registry (keywords, name, reason, safe) VALUES (?, ?, ?, ?)");
                medicines.forEach(m => {
                    stmt.run(m.keywords, m.name, m.reason, m.safe);
                });
                stmt.finalize();
                console.log('Seeded medicine registry data.');
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
                function (err) {
                    if (err) {
                        console.error(err);
                        return res.status(400).json({ error: err.message });
                    }
                    res.json({ message: 'Doctor registered', userId: this.lastID });
                });
        } else {
            db.run("INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
                [name, email, hashedPassword],
                function (err) {
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







// Helper: Get Recommendations from DB
function getDbRecommendations(symptoms) {
    return new Promise((resolve, reject) => {
        const words = symptoms.toLowerCase().split(/\s+/).filter(w => w.length > 2); // Split by space, ignore small words
        
        if (words.length === 0) return resolve([]);

        // Build dynamic query: SELECT * FROM medicine_registry WHERE keywords LIKE '%word1%' OR keywords LIKE '%word2%'...
        const conditions = words.map(() => "keywords LIKE ?").join(" OR ");
        const params = words.map(w => `%${w}%`);
        
        const query = `SELECT * FROM medicine_registry WHERE ${conditions}`;
        
        db.all(query, params, (err, rows) => {
            if (err) {
                console.error("DB Search Error:", err);
                reject(err);
            } else {
                // Deduplicate results based on name
                const unique = [];
                const distinctNames = new Set();
                rows.forEach(r => {
                    if (!distinctNames.has(r.name)) {
                        distinctNames.add(r.name);
                        unique.push({ 
                            name: r.name, 
                            reason: r.reason, 
                            safe: !!r.safe, 
                            suggestedBy: 'MedRec Database' 
                        });
                    }
                });
                resolve(unique);
            }
        });
    });
}


// 1. User submits symptoms
app.post('/api/suggest', authenticateToken, async (req, res) => {
    const { symptoms, preferredDoctorId } = req.body;
    const userId = req.user.id;

    console.log(`Analyzing symptoms: "${symptoms}"...`);
    console.log(`Searching database for: "${symptoms}"...`);

    let dbSuggestions = [];
    try {
        dbSuggestions = await getDbRecommendations(symptoms);
    } catch (e) {
        console.error("DB Error:", e);
    }

    if (dbSuggestions.length === 0) {
        dbSuggestions.push({ name: 'Consult Physician', reason: 'No clear over-the-counter match found. Please consult a doctor.', safe: true, suggestedBy: 'System' });
    }

    // Always save to history
    const doctorId = preferredDoctorId || null;
    const status = preferredDoctorId ? 'pending' : 'completed';

    db.run("INSERT INTO consultations (user_id, doctor_id, symptoms, status) VALUES (?, ?, ?, ?)",
        [userId, doctorId, symptoms, status], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            const consultationId = this.lastID;

            // Save suggestions
            const stmt = db.prepare("INSERT INTO prescriptions (consultation_id, name, reason, safe, suggested_by) VALUES (?, ?, ?, ?, ?)");
            dbSuggestions.forEach(med => {
                stmt.run(consultationId, med.name, med.reason, med.safe, med.suggestedBy);
            });
            stmt.finalize();

            if (preferredDoctorId) {
                res.json({ message: 'Request sent to doctor', status: 'pending', suggestions: dbSuggestions });
            } else {
                res.json({ suggestions: dbSuggestions, status: 'completed' });
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
