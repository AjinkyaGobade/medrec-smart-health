const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function runTest() {
    try {
        console.log("1. Registering Doctor...");
        const docEmail = `dr${Date.now()}@test.com`;
        const doctorRes = await axios.post(`${API_URL}/register`, {
            name: "Test Doctor",
            email: docEmail,
            password: "password",
            type: "doctor",
            speciality: "General",
            bio: "Test Bio"
        });
        const doctorId = doctorRes.data.userId;
        console.log("Doctor registered with ID:", doctorId);

        console.log("2. Registering User...");
        const userEmail = `user${Date.now()}@test.com`;
        const userRes = await axios.post(`${API_URL}/register`, {
            name: "Test User",
            email: userEmail,
            password: "password",
            type: "user"
        });
        const userId = userRes.data.userId;
        console.log("User registered with ID:", userId);

        console.log("3. Logging in User...");
        const loginRes = await axios.post(`${API_URL}/login`, {
            email: userEmail,
            password: "password",
            type: "user"
        });
        const userToken = loginRes.data.token;
        console.log("User logged in.");

        console.log("4. Sending Request to Doctor...");
        const suggestRes = await axios.post(`${API_URL}/suggest`, {
            symptoms: "Headache and fever",
            preferredDoctorId: doctorId
        }, {
            headers: { Authorization: `Bearer ${userToken}` }
        });
        console.log("Suggestion Response:", suggestRes.data);

        console.log("5. Logging in Doctor...");
        const docLoginRes = await axios.post(`${API_URL}/login`, {
            email: docEmail,
            password: "password",
            type: "doctor"
        });
        const doctorToken = docLoginRes.data.token;

        console.log("6. Fetching Doctor Requests...");
        const requestsRes = await axios.get(`${API_URL}/doctor/requests`, {
            headers: { Authorization: `Bearer ${doctorToken}` }
        });
        
        console.log("Doctor Requests:", requestsRes.data);

        if (requestsRes.data.length > 0) {
            console.log("SUCCESS: Doctor received the request.");
        } else {
            console.log("FAILURE: Doctor did NOT receive the request.");
        }

    } catch (error) {
        console.error("Error:", error.response ? error.response.data : error.message);
    }
}

runTest();
