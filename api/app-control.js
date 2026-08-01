const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
};

const isEnabled = () => String(process.env.APP_ENABLED || 'true').trim().toLowerCase() !== 'false';

export default function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const enabled = isEnabled();
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.status(200).json({
    success: true,
    enabled,
    message: enabled
      ? (process.env.APP_ENABLED_MESSAGE || 'App is available.')
      : (process.env.APP_DISABLED_MESSAGE || 'This app is currently disabled. Please try again later.'),
    updatedAt: process.env.APP_CONTROL_UPDATED_AT || null
  });
}
