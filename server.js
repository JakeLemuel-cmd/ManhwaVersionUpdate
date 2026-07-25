import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

console.log('🌍 Environment:', process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'DEVELOPMENT');
console.log(`\n🚀 Manhwa App Version Update Server`);
console.log(`📍 Running on port ${PORT}\n`);

// App Version Endpoint - For checking app updates
app.get('/version.json', (req, res) => {
  res.json({
    version: "1.0.1",
    downloadUrl: "https://docs.google.com/spreadsheets/d/1VylrHP9aPEM8odgwwrczJnG5gJvm0kwl/edit?usp=drive_link&ouid=109794613497552003928&rtpof=true&sd=true",
    releaseNotes: "Bug fixes and improvements"
  });
});

// Alternative endpoint with /api prefix
app.get('/api/version', (req, res) => {
  res.json({
    version: "1.0.1",
    downloadUrl: "https://docs.google.com/spreadsheets/d/1VylrHP9aPEM8odgwwrczJnG5gJvm0kwl/edit?usp=drive_link&ouid=109794613497552003928&rtpof=true&sd=true",
    releaseNotes: "Bug fixes and improvements"
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    availableEndpoints: ['/version.json', '/api/version', '/api/health']
  });
});

app.listen(PORT, () => {
  console.log(`📡 Available Endpoints:`);
  console.log(`   GET /version.json - App version & download URL`);
  console.log(`   GET /api/version - Same as above (API prefix)`);
  console.log(`   GET /api/health - Health check\n`);
});
