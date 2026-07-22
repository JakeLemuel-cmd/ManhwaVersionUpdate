import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import { load as cheerioLoad } from 'cheerio';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const baseURL = 'https://manhwaz.com';
const PORT = process.env.PORT || 5000;

// Environment setup
const apiKey = process.env.SCRAPER_API_KEY || process.env.SCRAPERAPI_KEY || process.env.API_KEY;
const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER || !process.env.NODE_ENV;

console.log('🌍 Environment:', isProduction ? 'PRODUCTION' : 'DEVELOPMENT');
console.log('🔑 ScraperAPI:', apiKey ? '✅ Configured' : '⚠️ Not configured (will try direct requests)');

// Enhanced axios configuration
const createAxiosConfig = {
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  }
};

// Retry logic
const fetchWithRetry = async (url, maxRetries = 2) => {
  console.log(`🌐 Fetching: ${url}`);

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await axios.get(url, createAxiosConfig);
      if (response.status === 200 && response.data) {
        console.log(`✅ Success: ${url}`);
        return response;
      }
    } catch (error) {
      console.log(`❌ Attempt ${i + 1} failed: ${error.message}`);
      if (i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Failed to fetch ${url} after ${maxRetries} attempts`);
};

// Utility functions
const cleanText = (text) => text?.trim().replace(/\s+/g, ' ') || '';

// Enhanced selectors for different website layouts
const SELECTORS = {
  items: ['.page-item-detail', '.manga-item', '.post-item', '.item-manga', '.wp-post', 'article'],
  title: ['.item-title a', '.post-title a', 'h3 a', 'h2 a'],
  cover: ['img[data-src]', 'img[src]', '.wp-post-image'],
  link: ['.item-title a', '.post-title a', 'h3 a']
};

// Scrape with fallback selectors
const scrapeWithFallbacks = ($, containerSelectors, extractors) => {
  const results = [];

  for (const selector of containerSelectors) {
    const items = $(selector);
    console.log(`🔍 Found ${items.length} items with selector: ${selector}`);

    if (items.length > 0) {
      items.each((index, el) => {
        try {
          const item = extractors($, el, index);
          if (item && item.title && item.link) {
            results.push(item);
          }
        } catch (error) {
          console.log(`⚠️ Error extracting item ${index}: ${error.message}`);
        }
      });

      if (results.length > 0) break;
    }
  }

  return results;
};

// Main scraping functions
const fetchPopularManhwa = async () => {
  try {
    console.log('🔥 Fetching popular manhwa...');
    const response = await fetchWithRetry(`${baseURL}/`);
    const $ = cheerioLoad(response.data);

    // Debug: Log first 1000 chars of HTML
    console.log('📄 HTML Sample (first 1000 chars):', response.data.substring(0, 1000));

    const results = scrapeWithFallbacks($, SELECTORS.items, ($, el, index) => {
      let title, href, cover;

      for (const titleSelector of SELECTORS.title) {
        title = cleanText($(el).find(titleSelector).text());
        href = $(el).find(titleSelector).attr('href');
        if (title && href) break;
      }

      if (!title || !href) return null;

      for (const coverSelector of SELECTORS.cover) {
        cover = $(el).find(coverSelector).attr('data-src') || $(el).find(coverSelector).attr('src');
        if (cover) break;
      }

      const slug = href?.split('/').filter(Boolean).pop();
      const link = href.startsWith('http') ? href : baseURL + href;

      return {
        id: `popular_${index}`,
        title,
        slug,
        link,
        cover: cover || '',
        source: 'manhwaz'
      };
    });

    console.log(`📚 Found ${results.length} popular manhwa`);
    return results.slice(0, 50);
  } catch (error) {
    console.error('❌ Error in fetchPopularManhwa:', error.message);
    return [];
  }
};

const fetchLatestManhwa = async () => {
  try {
    console.log('⏰ Fetching latest manhwa...');
    const response = await fetchWithRetry(`${baseURL}/webtoon`);
    const $ = cheerioLoad(response.data);

    const results = scrapeWithFallbacks($, SELECTORS.items, ($, el, index) => {
      let title, href, cover;

      for (const titleSelector of SELECTORS.title) {
        title = cleanText($(el).find(titleSelector).text());
        href = $(el).find(titleSelector).attr('href');
        if (title && href) break;
      }

      if (!title || !href) return null;

      for (const coverSelector of SELECTORS.cover) {
        cover = $(el).find(coverSelector).attr('data-src') || $(el).find(coverSelector).attr('src');
        if (cover) break;
      }

      const slug = href?.split('/').filter(Boolean).pop();
      const link = href.startsWith('http') ? href : baseURL + href;

      return {
        id: `latest_${index}`,
        title,
        slug,
        link,
        cover: cover || '',
        source: 'manhwaz'
      };
    });

    console.log(`📚 Found ${results.length} latest manhwa`);
    return results.slice(0, 50);
  } catch (error) {
    console.error('❌ Error in fetchLatestManhwa:', error.message);
    return [];
  }
};

const searchManhwa = async (query) => {
  try {
    console.log(`🔍 Searching for: "${query}"`);
    const searchUrl = `${baseURL}/?s=${encodeURIComponent(query)}`;
    const response = await fetchWithRetry(searchUrl);
    const $ = cheerioLoad(response.data);

    const results = scrapeWithFallbacks($, SELECTORS.items, ($, el, index) => {
      let title, href, cover;

      for (const titleSelector of SELECTORS.title) {
        title = cleanText($(el).find(titleSelector).text());
        href = $(el).find(titleSelector).attr('href');
        if (title && href) break;
      }

      if (!title || !href) return null;

      for (const coverSelector of SELECTORS.cover) {
        cover = $(el).find(coverSelector).attr('data-src') || $(el).find(coverSelector).attr('src');
        if (cover) break;
      }

      const slug = href?.split('/').filter(Boolean).pop();
      const link = href.startsWith('http') ? href : baseURL + href;

      return {
        id: `search_${index}`,
        title,
        slug,
        link,
        cover: cover || '',
        source: 'manhwaz'
      };
    });

    if (results.length === 0) {
      console.log('⚠️ Search returned 0 results, trying fallback filter...');
      const popular = await fetchPopularManhwa();
      return popular.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase())
      );
    }

    console.log(`🔍 Found ${results.length} search results`);
    return results;
  } catch (error) {
    console.error('❌ Error in searchManhwa:', error.message);
    return [];
  }
};

const fetchManhwaDetails = async (slug) => {
  try {
    console.log(`📖 Fetching details for: ${slug}`);

    const urls = [
      `${baseURL}/webtoon/${slug}`,
      `${baseURL}/manhwa/${slug}`,
      `${baseURL}/${slug}`
    ];

    for (const url of urls) {
      try {
        const response = await fetchWithRetry(url);
        const $ = cheerioLoad(response.data);

        const title = cleanText(
          $('.post-title h1').text() ||
          $('.entry-title').text() ||
          $('h1').first().text() ||
          'Unknown Title'
        );

        const cover =
          $('.summary_image img').attr('src') ||
          $('.wp-post-image').attr('src') || '';

        const description = cleanText(
          $('.summary__content').text() ||
          $('.description').text() ||
          $('.content p').first().text() ||
          'No description available'
        );

        const chapters = [];
        $('.wp-manga-chapter').each((index, el) => {
          const chapterTitle = cleanText($(el).find('a').text());
          const chapterLink = $(el).find('a').attr('href');

          // Try to extract date/timestamp from various selectors
          let date = '';
          const dateSelectors = [
            '.chapter-release-date',
            '.post-on',
            '.chapter-date',
            '.release-date',
            'span[class*="date"]',
            'span[class*="time"]'
          ];

          for (const selector of dateSelectors) {
            const dateText = cleanText($(el).find(selector).text());
            if (dateText && dateText.length > 0) {
              date = dateText;
              break;
            }
          }

          if (chapterTitle && chapterLink) {
            chapters.push({
              id: `chapter_${index}`,
              chapterTitle,
              chapterLink: chapterLink.startsWith('http') ? chapterLink : baseURL + chapterLink,
              date: date || 'Unknown'
            });
          }
        });

        console.log(`✅ Found details for: ${title}`);
        return { title, cover, description, chapters };
      } catch (error) {
        console.log(`⚠️ Failed to fetch from ${url}: ${error.message}`);
      }
    }

    throw new Error(`Could not fetch details for slug: ${slug}`);
  } catch (error) {
    console.error('❌ Error in fetchManhwaDetails:', error.message);
    throw error;
  }
};

// HTML template helper
const createHtmlList = (items, title) => `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #0f0f0f;
        color: #e0e0e0;
        line-height: 1.6;
      }
      .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
      .nav {
        background: #1a1a1a;
        padding: 15px 0;
        border-bottom: 2px solid #333;
        margin-bottom: 30px;
      }
      .nav-content { display: flex; gap: 20px; flex-wrap: wrap; }
      .nav a {
        color: #4a9eff;
        text-decoration: none;
        font-weight: 500;
        transition: color 0.2s;
      }
      .nav a:hover { color: #66b3ff; }
      h1 { color: #4a9eff; margin-bottom: 10px; font-size: 28px; }
      .count { color: #888; margin-bottom: 20px; font-size: 14px; }
      .status {
        background: #1a1a1a;
        padding: 12px;
        border-left: 3px solid #4a9eff;
        border-radius: 4px;
        margin-bottom: 20px;
        font-size: 13px;
      }
      .list { display: grid; gap: 15px; }
      .item {
        background: #1a1a1a;
        padding: 15px;
        border-radius: 6px;
        transition: background 0.2s;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .item:hover { background: #222; }
      .item-content { flex: 1; }
      .item a {
        color: #e0e0e0;
        text-decoration: none;
        font-size: 16px;
        transition: color 0.2s;
      }
      .item a:hover { color: #4a9eff; }
      .item-meta { color: #666; font-size: 12px; margin-top: 5px; }
      .empty {
        text-align: center;
        color: #666;
        padding: 40px;
      }
      @media (max-width: 600px) {
        .container { padding: 15px; }
        h1 { font-size: 22px; }
        .nav-content { gap: 10px; }
        .nav a { font-size: 14px; }
        .item { flex-direction: column; align-items: flex-start; }
      }
    </style>
  </head>
  <body>
    <div class="nav">
      <div class="container nav-content">
        <a href="/">🏠 Home</a>
        <a href="/popular">🔥 Popular</a>
        <a href="/latest">⏰ Latest</a>
        <a href="/search">🔍 Search</a>
        <a href="/api/health">📊 Health</a>
      </div>
    </div>
    <div class="container">
      <div class="status">✅ Manhwaz API - Exclusive Manhwa Source</div>
      <h1>${title}</h1>
      <div class="count">${items.length} items found</div>
      <div class="list">
        ${items.length
          ? items.map((item, i) => `
              <div class="item">
                <div class="item-content">
                  <a href="/manhwa/${item.slug}">${i + 1}. ${item.title}</a>
                  <div class="item-meta">${item.slug}</div>
                </div>
              </div>
            `).join('')
          : '<div class="empty">📭 No items found</div>'
        }
      </div>
    </div>
  </body>
  </html>
`;

// Web Routes
app.get('/', async (req, res) => {
  try {
    console.log('🏠 / route called');
    const list = await fetchPopularManhwa();
    console.log(`✅ Fetched ${list.length} items`);
    res.send(createHtmlList(list, '🔥 Most Popular Manhwa'));
  } catch (error) {
    console.error('❌ Error on home route:', error.message, error.stack);
    res.status(500).send(`<h1>Error: ${error.message}</h1><pre>${error.stack}</pre>`);
  }
});

app.get('/popular', async (req, res) => {
  try {
    const list = await fetchPopularManhwa();
    res.send(createHtmlList(list, '🔥 Popular Manhwa'));
  } catch (error) {
    res.status(500).send(`<h1>Error: ${error.message}</h1>`);
  }
});

app.get('/latest', async (req, res) => {
  try {
    const list = await fetchLatestManhwa();
    res.send(createHtmlList(list, '⏰ Latest Updates'));
  } catch (error) {
    res.status(500).send(`<h1>Error: ${error.message}</h1>`);
  }
});

app.get('/search', async (req, res) => {
  try {
    const query = cleanText(req.query.q || '');

    if (!query) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Search Manhwa</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              background: #0f0f0f;
              color: #e0e0e0;
              padding: 40px 20px;
            }
            .container { max-width: 600px; margin: 0 auto; }
            h1 { color: #4a9eff; margin-bottom: 20px; }
            form { margin: 20px 0; }
            input {
              width: 100%;
              padding: 12px;
              margin-bottom: 10px;
              background: #1a1a1a;
              border: 1px solid #333;
              color: #e0e0e0;
              border-radius: 4px;
              font-size: 16px;
            }
            button {
              background: #4a9eff;
              color: white;
              padding: 12px 24px;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 16px;
            }
            button:hover { background: #66b3ff; }
            a { color: #4a9eff; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🔍 Search Manhwa</h1>
            <form method="GET">
              <input type="text" name="q" placeholder="Enter manhwa title..." autofocus />
              <button type="submit">Search</button>
            </form>
            <p><a href="/">← Back to Home</a></p>
          </div>
        </body>
        </html>
      `);
    }

    const list = await searchManhwa(query);
    res.send(createHtmlList(list, `🔍 Search Results for "${query}"`));
  } catch (error) {
    res.status(500).send(`<h1>Error: ${error.message}</h1>`);
  }
});

app.get('/manhwa/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const detail = await fetchManhwaDetails(slug);

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${detail.title}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0f0f0f;
            color: #e0e0e0;
            line-height: 1.6;
          }
          .container { max-width: 1000px; margin: 0 auto; padding: 20px; }
          .back { color: #4a9eff; text-decoration: none; margin-bottom: 20px; display: inline-block; }
          .back:hover { color: #66b3ff; }
          h1 { color: #4a9eff; margin: 20px 0; }
          h2 { color: #4a9eff; margin-top: 30px; margin-bottom: 15px; }
          .description { background: #1a1a1a; padding: 20px; border-radius: 6px; margin: 20px 0; }
          .chapters { background: #1a1a1a; padding: 20px; border-radius: 6px; }
          .chapter {
            padding: 12px;
            border-bottom: 1px solid #333;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 15px;
          }
          .chapter:last-child { border-bottom: none; }
          .chapter a { color: #e0e0e0; text-decoration: none; transition: color 0.2s; flex: 1; }
          .chapter a:hover { color: #4a9eff; }
          .chapter .date {
            color: #888;
            font-size: 12px;
            white-space: nowrap;
            padding: 4px 8px;
            background: #0f0f0f;
            border-radius: 3px;
          }
          @media (max-width: 600px) {
            .container { padding: 15px; }
            .chapter { flex-direction: column; }
            .date { margin-top: 8px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <a class="back" href="/">← Back to List</a>
          <h1>${detail.title}</h1>
          <div class="description">
            <h2>📖 Description</h2>
            <p>${detail.description}</p>
          </div>
          <div class="chapters">
            <h2>📚 Chapters (${detail.chapters.length})</h2>
            ${detail.chapters.map(c => `
              <div class="chapter">
                <div>
                  <a href="${c.chapterLink}" target="_blank">${c.chapterTitle}</a>
                </div>
                <div class="date">${c.date}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error fetching details:', error);
    res.status(500).send(`
      <html>
      <body style="font-family: Arial; background: #0f0f0f; color: #e0e0e0; padding: 20px;">
        <h1>Error Loading Details</h1>
        <p>Could not load manhwa details: ${error.message}</p>
        <a href="/" style="color: #4a9eff;">← Back to Home</a>
      </body>
      </html>
    `);
  }
});

// API Routes
app.get('/api/popular', async (req, res) => {
  try {
    const data = await fetchPopularManhwa();
    res.json({
      success: true,
      data,
      count: data.length,
      source: 'manhwaz',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/latest', async (req, res) => {
  try {
    const data = await fetchLatestManhwa();
    res.json({
      success: true,
      data,
      count: data.length,
      source: 'manhwaz',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/search', async (req, res) => {
  try {
    const query = cleanText(req.query.q || req.query.query || '');

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter required (use ?q=query or ?query=query)'
      });
    }

    const data = await searchManhwa(query);
    res.json({
      success: true,
      data,
      count: data.length,
      query,
      source: 'manhwaz',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/filter', async (req, res) => {
  try {
    const query = cleanText(req.query.q || '');
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    let data = await fetchPopularManhwa();

    if (query) {
      const normalized = query.toLowerCase();
      data = data.filter(item =>
        item.title.toLowerCase().includes(normalized)
      );
    }

    res.json({
      success: true,
      data: data.slice(0, limit),
      count: data.slice(0, limit).length,
      totalMatched: data.length,
      query: query || null,
      limit,
      source: 'manhwaz',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/manhwa/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const data = await fetchManhwaDetails(slug);

    res.json({
      success: true,
      data,
      source: 'manhwaz',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      slug: req.params.slug
    });
  }
});

app.get('/api/health', async (req, res) => {
  const health = {
    success: true,
    status: 'running',
    version: '3.0.0',
    environment: isProduction ? 'production' : 'development',
    source: 'manhwaz-exclusive',
    endpoints: {
      web: {
        home: '/ - Most popular manhwa',
        popular: '/popular - Popular rankings',
        latest: '/latest - Latest updates',
        search: '/search?q=query - Search',
        details: '/manhwa/:slug - Manhwa details'
      },
      api: {
        popular: '/api/popular - Popular JSON',
        latest: '/api/latest - Latest JSON',
        search: '/api/search?q=query - Search JSON',
        filter: '/api/filter?q=query&limit=50 - Filter JSON',
        details: '/api/manhwa/:slug - Details JSON',
        health: '/api/health - This endpoint'
      }
    },
    timestamp: new Date().toISOString()
  };

  res.json(health);
});

// Debug endpoint - inspect raw HTML
app.get('/debug/html', async (req, res) => {
  try {
    const response = await fetchWithRetry(`${baseURL}/`);
    res.type('text/html').send(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint - inspect selectors
app.get('/debug/selectors', async (req, res) => {
  try {
    const page = req.query.page || 'popular';
    const url = page === 'latest' ? `${baseURL}/webtoon` : `${baseURL}/`;
    console.log(`🔍 Checking selectors for: ${url}`);

    const response = await fetchWithRetry(url);
    const $ = cheerioLoad(response.data);

    const debug = {
      page,
      url,
      items: {},
      titles: {},
      covers: {},
      links: {},
      sampleData: []
    };

    SELECTORS.items.forEach(sel => {
      debug.items[sel] = $(sel).length;
    });

    SELECTORS.title.forEach(sel => {
      debug.titles[sel] = $(sel).length;
    });

    SELECTORS.cover.forEach(sel => {
      debug.covers[sel] = $(sel).length;
    });

    SELECTORS.link.forEach(sel => {
      debug.links[sel] = $(sel).length;
    });

    // Extract first 5 items as samples
    const items = $('.page-item-detail').slice(0, 5);
    items.each((index, el) => {
      const title = $(el).find('.post-title a').text().trim();
      const link = $(el).find('.post-title a').attr('href');
      const cover = $(el).find('img[data-src]').attr('data-src') || $(el).find('img[src]').attr('src');

      if (title && link) {
        debug.sampleData.push({
          index,
          title: title.substring(0, 50),
          link: link.substring(0, 60),
          hasCover: !!cover
        });
      }
    });

    res.json(debug);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    availableEndpoints: '/api/health'
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Manhwa Backend API - Manhwaz Exclusive`);
  console.log(`📍 Running on port ${PORT}`);
  console.log(`\n📡 API Endpoints:`);
  console.log(`   GET /api/popular - Most popular manhwa`);
  console.log(`   GET /api/latest - Latest updates`);
  console.log(`   GET /api/search?q=query - Search`);
  console.log(`   GET /api/filter?q=query&limit=50 - Filter`);
  console.log(`   GET /api/manhwa/:slug - Manhwa details`);
  console.log(`   GET /api/health - Health check\n`);
});
