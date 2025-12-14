const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function trigger() {
    console.log("Hypothetical User: Waiting 20 seconds before sending request...");
    await new Promise(r => setTimeout(r, 20000));

    try {
        // Register/Login
        const email = `syncUser${Date.now()}@test.com`;
        await axios.post(`${BASE_URL}/register`, {
            name: 'Sync Tester',
            email: email,
            password: 'password123',
            type: 'user'
        });
        const loginRes = await axios.post(`${BASE_URL}/login`, {
            email: email,
            password: 'password123',
            type: 'user'
        });
        const token = loginRes.data.token;

        // Send Request
        console.log("Sending 'Severe Migraine' request...");
        await axios.post(`${BASE_URL}/suggest`, { 
            symptoms: "Severe Migraine",
            preferredDoctorId: 1 // Dr. Emily Carter (ID 1 usually)
        }, { headers: { Authorization: `Bearer ${token}` } });

        console.log("Request sent!");

    } catch (e) {
        console.error("Error:", e.message);
    }
}

trigger();
