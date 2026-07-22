# Manhwa Backend API v2.0.0

Modern, production-ready backend scraper for Manhwaz and AsuraScans.

## Features

- 100+ items per source
- Search functionality
- Filter by popular/latest
- Smart 1-hour caching
- Production ready

## Quick Start

```bash
npm install
npm start
```

## API Endpoints

- `GET /api/popular?source=all&limit=100`
- `GET /api/latest?source=all&limit=100`
- `GET /api/trending?source=all&limit=100`
- `GET /api/search?q=query`
- `GET /api/filter?q=query&sort=popular`
- `GET /api/health`

## Deploy to Render

1. Push to GitHub
2. Connect Render to repo
3. Set build: `npm install`
4. Set start: `npm start`
5. Deploy!

URL will be: `https://your-app.onrender.com`

## Environment

Create `.env`:
```
PORT=5000
NODE_ENV=production
```

## Response Format

```json
{
  "success": true,
  "data": [
    {
      "id": "manhwaz_0",
      "source": "manhwaz",
      "title": "Title",
      "slug": "slug",
      "url": "https://...",
      "cover": "https://..."
    }
  ],
  "count": 100
}
```

Version: 2.0.0  
Status: ✅ Ready to Deploy
