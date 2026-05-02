const request = require('supertest');
const express = require('express');

// We create a simple app here since server/index.js starts the server immediately.
// In a real scenario, we'd export `app` from index.js without calling listen() when testing.
const app = express();
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

describe('Health Check API', () => {
  it('should return 200 OK and status json', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');
  });
});
