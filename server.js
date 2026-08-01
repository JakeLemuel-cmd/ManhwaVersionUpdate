import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getVersionPayload = () => ({
  version: process.env.APP_VERSION || '1.0.2',
  versionCode: toPositiveInt(process.env.APP_VERSION_CODE, 3),
  downloadUrl: process.env.APK_DOWNLOAD_URL || 'https://drive.google.com/uc?export=download&id=YOUR_APK_ID',
  releaseNotes: process.env.RELEASE_NOTES || 'Bug fixes and improvements'
});

const getAppControlPayload = () => {
  const enabled = String(process.env.APP_ENABLED || 'true').trim().toLowerCase() !== 'false';
  return {
    success: true,
    enabled,
    message: enabled
      ? (process.env.APP_ENABLED_MESSAGE || 'App is available.')
      : (process.env.APP_DISABLED_MESSAGE || 'This app is currently disabled. Please try again later.'),
    updatedAt: process.env.APP_CONTROL_UPDATED_AT || null
  };
};

console.log('Environment:', process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'DEVELOPMENT');
console.log(`\nManhwa App Version Update Server`);
console.log(`Running on port ${PORT}\n`);

app.get('/api/version', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.json(getVersionPayload());
});

app.get('/api/app-control', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.json(getAppControlPayload());
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: getVersionPayload(),
    appControl: getAppControlPayload()
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    availableEndpoints: ['/api/version', '/api/app-control', '/api/health']
  });
});

app.listen(PORT, () => {
  console.log('Available Endpoints:');
  console.log('   GET /api/version - App version and download URL');
  console.log('   GET /api/app-control - App enabled/disabled flag');
  console.log('   GET /api/health - Health check\n');
});
