const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors());

const BASE_URL = 'https://asuracomic.net';

// Cache for chapters (1 hour TTL)
const chapterCache = new Map();

function setCache(key, data, ttlMinutes = 60) {
  chapterCache.set(key, {
    data,
    expires: Date.now() + ttlMinutes * 60 * 1000,
  });
}

function getCache(key) {
  const cached = chapterCache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expires) {
    chapterCache.delete(key);
    return null;
  }
  return cached.data;
}

app.get('/api/chapters/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const cacheKey = `chapters:${slug}`;

    const cached = getCache(cacheKey);
    if (cached) {
      console.log(`[AsuraScans] Cache HIT for ${slug}`);
      return res.json({ success: true, data: cached });
    }

    console.log(`[AsuraScans] Fetching chapters for: ${slug}`);
    const url = `${BASE_URL}/series/${slug}`;

    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 30000,
    });

    const $ = cheerio.load(data);
    const chapters = [];

    // Try multiple selectors for chapters
    const chapterSelectors = [
      '.wp-manga-chapter',
      '.chapter',
      'div[class*="chapter"]',
      'li.chapter',
      '.chapter-item',
    ];

    for (const selector of chapterSelectors) {
      const items = $(selector);
      if (items.length > 0) {
        console.log(`[AsuraScans] Found ${items.length} chapters with selector: ${selector}`);

        items.each((idx, el) => {
          const $el = $(el);
          const link = $el.find('a').first();
          const name = link.text()?.trim();
          const href = link.attr('href');

          // Try to extract release date from various elements
          let releaseDate = '';
          const dateSelectors = [
            '.chapter-release-date',
            '.post-on',
            '.chapter-date',
            '.release-date',
            'span[class*="date"]',
            'span[class*="time"]',
          ];

          for (const dateSelector of dateSelectors) {
            const dateText = $el.find(dateSelector).text()?.trim();
            if (dateText && dateText.length > 2) {
              releaseDate = dateText;
              break;
            }
          }

          // Also try data attributes
          if (!releaseDate) {
            releaseDate = $el.attr('data-date') ||
                         $el.attr('data-time') ||
                         $el.attr('title') || '';
          }

          if (name && href) {
            chapters.push({
              id: `${slug}:${idx}`,
              name,
              number: parseFloat(name.match(/\d+/)?.[0] || '0'),
              url: href.startsWith('http') ? href : BASE_URL + href,
              date: releaseDate || '',
            });
          }
        });

        if (chapters.length > 0) break;
      }
    }

    console.log(`[AsuraScans] Extracted ${chapters.length} chapters`);
    if (chapters.length > 0) {
      console.log(`[AsuraScans] Sample chapters:`, chapters.slice(0, 3).map(c => ({ name: c.name, date: c.date })));
    }

    setCache(cacheKey, chapters);
    res.json({
      success: true,
      data: chapters,
      count: chapters.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[AsuraScans] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'asura-scraper' });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`AsuraScans scraper running on port ${PORT}`);
});
