import express from 'express';
import cors from 'cors';
import axios from 'axios';
import cheerio from 'cheerio';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const cache = new Map();
const CACHE_DURATION = 60 * 60 * 1000;

function getFromCache(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`✅ Cache hit: ${key}`);
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

const createAxiosConfig = {
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Cache-Control': 'no-cache'
  }
};

const cleanText = (text) => text?.trim().replace(/\s+/g, ' ') || '';

// Manhwaz Scraper
async function scrapeManhwaz(page = 1, sort = 'popular') {
  const cacheKey = `manhwaz_${sort}_${page}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  try {
    console.log(`Scraping Manhwaz - ${sort} (page ${page})`);
    const baseUrl = 'https://manhwaz.com';
    let url = baseUrl;

    if (sort === 'latest') url = `${baseUrl}/webtoon`;
    if (page > 1) url = `${url}/page/${page}`;

    const response = await axios.get(url, createAxiosConfig);
    const $ = cheerio.load(response.data);
    const manhwas = [];
    const seen = new Set();

    $('.item').each((index, el) => {
      const title = cleanText($(el).find('.title, .name').text());
      const href = $(el).find('a').attr('href');
      const cover = $(el).find('img').attr('src') || $(el).find('img').attr('data-src');

      if (title && href && !seen.has(href)) {
        seen.add(href);
        manhwas.push({
          id: `manhwaz_${index}`,
          source: 'manhwaz',
          title,
          slug: href.split('/').filter(Boolean).pop(),
          url: href.startsWith('http') ? href : `${baseUrl}${href}`,
          cover: cover || ''
        });
      }
    });

    console.log(`Found ${manhwas.length} from Manhwaz`);
    setCache(cacheKey, manhwas);
    return manhwas;
  } catch (error) {
    console.error('Manhwaz error:', error.message);
    return [];
  }
}

// AsuraScans Scraper
async function scrapeAsuraScans(page = 1, sort = 'popular') {
  const cacheKey = `asurascans_${sort}_${page}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  try {
    console.log(`Scraping AsuraScans - ${sort} (page ${page})`);
    const baseUrl = 'https://asuracomic.net';
    let url = `${baseUrl}/series`;

    if (sort === 'latest') url = `${baseUrl}/series-latest`;
    if (page > 1) url = `${url}?page=${page}`;

    const response = await axios.get(url, createAxiosConfig);
    const $ = cheerio.load(response.data);
    const manhwas = [];
    const seen = new Set();

    $('.post-title').each((index, el) => {
      const title = cleanText($(el).find('a').text());
      const href = $(el).find('a').attr('href');
      const cover = $(el).closest('.item').find('img').attr('src');

      if (title && href && !seen.has(href)) {
        seen.add(href);
        manhwas.push({
          id: `asurascans_${index}`,
          source: 'asurascans',
          title,
          slug: href.split('/').filter(Boolean).pop(),
          url: href.startsWith('http') ? href : `${baseUrl}${href}`,
          cover: cover || ''
        });
      }
    });

    console.log(`Found ${manhwas.length} from AsuraScans`);
    setCache(cacheKey, manhwas);
    return manhwas;
  } catch (error) {
    console.error('AsuraScans error:', error.message);
    return [];
  }
}

// Get Popular
async function getPopular(source = 'all', limit = 100) {
  let results = [];
  if (source === 'all' || source === 'manhwaz') {
    const m = await scrapeManhwaz(1, 'popular');
    results = results.concat(m.slice(0, limit / 2));
  }
  if (source === 'all' || source === 'asurascans') {
    const a = await scrapeAsuraScans(1, 'popular');
    results = results.concat(a.slice(0, limit / 2));
  }
  return results;
}

// Get Latest
async function getLatest(source = 'all', limit = 100) {
  let results = [];
  if (source === 'all' || source === 'manhwaz') {
    const m = await scrapeManhwaz(1, 'latest');
    results = results.concat(m.slice(0, limit / 2));
  }
  if (source === 'all' || source === 'asurascans') {
    const a = await scrapeAsuraScans(1, 'latest');
    results = results.concat(a.slice(0, limit / 2));
  }
  return results;
}

// Search
async function searchManhwa(query, source = 'all') {
  if (!query) return [];
  const normalized = cleanText(query).toLowerCase();
  const cacheKey = `search_${source}_${normalized}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  let results = [];
  if (source === 'all' || source === 'manhwaz') {
    const m = await scrapeManhwaz(1, 'popular');
    results = results.concat(m.filter(item => item.title.toLowerCase().includes(normalized)));
  }
  if (source === 'all' || source === 'asurascans') {
    const a = await scrapeAsuraScans(1, 'popular');
    results = results.concat(a.filter(item => item.title.toLowerCase().includes(normalized)));
  }

  const unique = new Map();
  results.forEach(item => {
    const key = item.title.toLowerCase();
    if (!unique.has(key)) unique.set(key, item);
  });
  const final = Array.from(unique.values());
  setCache(cacheKey, final);
  return final;
}

// Routes
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    version: '2.0.0',
    endpoints: {
      popular: '/api/popular?source=all&limit=100',
      latest: '/api/latest?source=all&limit=100',
      search: '/api/search?q=query&source=all',
      trending: '/api/trending?source=all&limit=100',
      filter: '/api/filter?q=query&sort=popular&limit=100'
    }
  });
});

app.get('/api/popular', async (req, res) => {
  try {
    const source = req.query.source || 'all';
    const limit = Math.min(parseInt(req.query.limit) || 100, 200);
    const data = await getPopular(source, limit);
    res.json({
      success: true,
      data: data.slice(0, limit),
      count: data.length,
      source
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/latest', async (req, res) => {
  try {
    const source = req.query.source || 'all';
    const limit = Math.min(parseInt(req.query.limit) || 100, 200);
    const data = await getLatest(source, limit);
    res.json({
      success: true,
      data: data.slice(0, limit),
      count: data.length,
      source
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/trending', async (req, res) => {
  try {
    const source = req.query.source || 'all';
    const limit = Math.min(parseInt(req.query.limit) || 100, 200);
    const data = await getPopular(source, limit);
    res.json({
      success: true,
      data: data.slice(0, limit),
      count: data.length,
      source
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    const source = req.query.source || 'all';
    if (!query) {
      return res.status(400).json({ success: false, message: 'Query required' });
    }
    const data = await searchManhwa(query, source);
    res.json({
      success: true,
      data,
      count: data.length,
      query,
      source
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/filter', async (req, res) => {
  try {
    const query = req.query.q || '';
    const sort = req.query.sort || 'popular';
    const source = req.query.source || 'all';
    const limit = Math.min(parseInt(req.query.limit) || 100, 200);

    let data = sort === 'latest' ? await getLatest(source, limit) : await getPopular(source, limit);
    if (query) {
      const normalized = cleanText(query).toLowerCase();
      data = data.filter(item => item.title.toLowerCase().includes(normalized));
    }

    res.json({
      success: true,
      data: data.slice(0, limit),
      count: data.length,
      query,
      sort,
      source
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    cache_size: cache.size
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Manhwa Backend API v2.0.0`);
  console.log(`📍 Running on port ${PORT}`);
  console.log(`\n📡 API Endpoints:`);
  console.log(`   GET /api/popular?source=all&limit=100`);
  console.log(`   GET /api/latest?source=all&limit=100`);
  console.log(`   GET /api/trending?source=all&limit=100`);
  console.log(`   GET /api/search?q=query`);
  console.log(`   GET /api/filter?q=query&sort=popular&limit=100`);
  console.log(`   GET /api/health\n`);
});
