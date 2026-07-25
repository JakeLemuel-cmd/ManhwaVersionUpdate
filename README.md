# Manhwa App Version Server

Real-time app update version service deployed on Vercel. No sleeping, always available.

## Features

✅ Serverless (no server sleeping)
✅ Real-time updates
✅ CORS enabled
✅ Auto-deploy on push
✅ Free tier available

## Endpoints

- `GET /api/version` - Get current app version and download URL
- `GET /api/health` - Health check endpoint

## Response Format

```json
{
  "version": "1.0.1",
  "downloadUrl": "https://drive.google.com/uc?export=download&id=YOUR_APK_ID",
  "releaseNotes": "Bug fixes and improvements"
}
```

## Deploy to Vercel

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy
```bash
vercel
```

### 4. Get Your URL
After deployment, Vercel will give you a URL like:
```
https://your-project.vercel.app/api/version
```

## Update Version

Edit `/api/version.js` and change:
```javascript
version: "1.0.2"  // Update this
downloadUrl: "https://drive.google.com/uc?export=download&id=YOUR_APK_ID"
```

Then commit and push:
```bash
git add .
git commit -m "Update app version to 1.0.2"
git push
```

Vercel will auto-deploy! ✅

## Local Testing

```bash
npm install -g vercel
vercel dev
```

Then test: `http://localhost:3000/api/version`

Status: ✅ Ready to Deploy to Vercel
