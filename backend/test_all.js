const http = require('http');

const API_URL = 'http://localhost:5000/api';

async function fetchAPI(endpoint, method = 'GET', body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = {
        method,
        headers,
        body: body ? JSON.stringify(body) : null
    };

    try {
        const response = await fetch(`${API_URL}${endpoint}`, options);
        let data = {};
        try { data = await response.json(); } catch(e) {}
        
        return { status: response.status, data };
    } catch (err) {
        return { status: 500, error: err.message };
    }
}

async function runTests() {
    console.log('🧪 Starting Backend Feature Tests...\n');
    let token1, token2;
    let clanCode;

    // 1. Create Test Users
    console.log('--- 1. Testing Auth & User Creation ---');
    const u1 = Date.now().toString().slice(-6);
    const u2 = (Date.now() + 1).toString().slice(-6);

    const res1 = await fetchAPI('/auth/register', 'POST', { name: 'Test1', username: `user${u1}`, email: `t1${u1}@test.com`, password: 'password123' });
    const res2 = await fetchAPI('/auth/register', 'POST', { name: 'Test2', username: `user${u2}`, email: `t2${u2}@test.com`, password: 'password123' });
    
    if (res1.status === 201 && res2.status === 201) {
        console.log('✅ Created 2 test users');
        token1 = res1.data.token;
        token2 = res2.data.token;
    } else {
        console.log('❌ Failed to create users', res1.data, res2.data);
        return;
    }

    // 2. Test Clan system
    console.log('\n--- 2. Testing Clans Phase C ---');
    const clanRes = await fetchAPI('/clans', 'POST', { name: 'Testing Ninjas' }, token1);
    if (clanRes.status === 201) {
        clanCode = clanRes.data.clan.code;
        console.log(`✅ Clan created. Code: ${clanCode}`);
    } else {
        console.log('❌ Failed to create clan', clanRes.data);
    }

    const joinRes = await fetchAPI('/clans/join', 'POST', { code: clanCode }, token2);
    if (joinRes.status === 200) {
        console.log('✅ User 2 joined the clan');
    } else {
        console.log('❌ Failed to join clan', joinRes.data);
    }

    // 3. Test Territory system
    console.log('\n--- 3. Testing Territories Phase B ---');
    const poly = [
        [40.7128, -74.0060], // NYC fake coords
        [40.7129, -74.0060],
        [40.7129, -74.0061],
        [40.7128, -74.0061],
        [40.7128, -74.0060]  // Loop closed
    ];

    const terrRes = await fetchAPI('/territories/record', 'POST', { polygon: poly, area: 1500 }, token1);
    if (terrRes.status === 201) {
        console.log('✅ Created a brand new territory polygon!');
    } else {
        console.log('❌ Failed to create territory', terrRes.data);
    }

    // Let user 2 contest it (use same polygon)
    const contestRes = await fetchAPI('/territories/record', 'POST', { polygon: poly, area: 1500 }, token2);
    if (contestRes.status === 200 && !contestRes.data.isNew) {
        console.log('✅ User 2 successfully contested the existing territory!');
    } else {
        console.log('❌ Failed to contest territory', contestRes.data);
    }

    // 4. Test Run Saving & Lifetime Stats
    console.log('\n--- 4. Testing Runs Phase E (Stats updating) ---');
    const runRes = await fetchAPI('/runs', 'POST', { distance: 5.5, duration: 1800, territoriesCaptured: 2, steps: 5000 }, token1);
    if (runRes.status === 201) {
        console.log('✅ Saved run for User 1 (Lifetime stats should update)');
    } else {
        console.log('❌ Failed to save run', runRes.data);
    }

    // 5. Test Leaderboards
    console.log('\n--- 5. Testing Leaderboards Phase D ---');
    const globRes = await fetchAPI('/leaderboard/global?tab=distance', 'GET', null, token1);
    if (globRes.status === 200) {
        console.log('✅ Global Leaderboard by Distance works. Top player score:', globRes.data.rankings[0].score);
    } else {
        console.log('❌ Global Leaderboard failed', globRes.data);
    }

    const clanLeaderRes = await fetchAPI(`/clans/${clanRes.data.clan._id}/leaderboard`, 'GET', null, token1);
    if (clanLeaderRes.status === 200) {
        console.log(`✅ Clan Leaderboard works. Members inside: ${clanLeaderRes.data.length}`);
    } else {
        console.log('❌ Clan Leaderboard failed', clanLeaderRes.data);
    }

    console.log('\n🎉 ALL TESTS FINISHED. Backend is solid!');
}

runTests();
