import { NextResponse } from 'next/server';
import type { Page } from 'puppeteer';
import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium-min';

interface Product {
  name: string;
  price: string;
  rating: string;
  reviewCount: string;
  url: string;
  soldCount?: string;
  favoriteCount?: string;
  viewCount?: string;
}

interface Cache {
  data: { [key: string]: Product[] };
  timestamps: { [key: string]: number };
  lastUpdate: Date | null;
}

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'max-age=0',
  'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'Connection': 'keep-alive',
  'DNT': '1'
};

// Cache
const trendCache: Cache = {
  data: {},
  timestamps: {},
  lastUpdate: null
};

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 saat (milisaniye cinsinden)

// autoScroll fonksiyonu
const autoScroll = async (page: Page): Promise<void> => {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      
      let previousHeight = 0;
      let scrollAttempts = 0;
      const maxAttempts = 20;
      
      const scrollInterval = setInterval(async () => {
        const currentHeight = document.documentElement.scrollHeight;
        
        if (currentHeight === previousHeight || scrollAttempts >= maxAttempts) {
          const products = document.querySelectorAll('.product-card, .p-card-wrppr');
          if (products.length >= 40 || scrollAttempts >= maxAttempts) {
            clearInterval(scrollInterval);
            await delay(2000);
            resolve();
            return;
          }
        }
        
        window.scrollTo(0, currentHeight);
        previousHeight = currentHeight;
        scrollAttempts++;
      }, 500);
    });
  });
};

// Scraping fonksiyonu
const scrapeProducts = async (url: string): Promise<Product[]> => {
  let browser;
  try {
    const isDev = process.env.NODE_ENV === 'development';
    console.log('Environment:', process.env.NODE_ENV);

    if (isDev) {
      const options = {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true,
        ignoreHTTPSErrors: true
      };
      browser = await puppeteer.launch(options);
    } else {
      // Vercel production environment
      const executablePath = await chromium.executablePath();
      
      console.log('Executable Path:', executablePath);
      
      const options = {
        args: [
          ...chromium.args,
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--single-process'
        ],
        executablePath,
        headless: true,
        ignoreHTTPSErrors: true
      };
      
      console.log('Launching browser with options:', {
        ...options,
        executablePath: options.executablePath
      });
      
      browser = await puppeteer.launch(options);
    }

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setExtraHTTPHeaders(headers);
    
    // Timeout süresini artır
    await page.setDefaultNavigationTimeout(120000);
    await page.goto(url, { 
      waitUntil: 'networkidle0', 
      timeout: 120000 
    });
    
    // Sayfa yüklenene kadar bekle
    await page.waitForSelector('.product-card, .p-card-wrppr', { timeout: 60000 });
    await autoScroll(page);

    const products = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.product-card, .p-card-wrppr'));
      const seenProducts = new Set<string>();
      const uniqueProducts: Product[] = [];

      items.forEach(element => {
        try {
          const infoList = element.querySelector('.product-card-information-list, .prdct-desc-cntnr');
          if (!infoList) return;

          const brand = infoList.querySelector('.prdct-desc-cntnr-ttl, .product-brand')?.textContent?.trim() || '';
          const name = infoList.querySelector('.prdct-desc-cntnr-name, .product-name')?.textContent?.trim() || '';
          const fullName = `${brand} ${name}`;
          
          if (seenProducts.has(fullName)) return;
          seenProducts.add(fullName);
          
          const productLink = element.closest('a')?.href || '';
          const price = infoList.querySelector('.prc-box-dscntd')?.textContent?.trim() || 'N/A';
          
          const ratingScore = infoList.querySelector('.rating-score')?.textContent?.trim() || 'N/A';
          const reviewCount = infoList.querySelector('.ratingCount')?.textContent?.replace(/[()]/g, '') || '0';

          // Sosyal kanıt verilerini topla
          const socialProofs: {[key: string]: string} = {};
          element.querySelectorAll('.social-proof-item').forEach(item => {
            const text = item.querySelector('.social-proof-text')?.textContent || '';
            if (text.includes('satıldı')) {
              socialProofs.soldCount = text.match(/(\d+)\+?\s+ürün/)?.[1] || '0';
            } else if (text.includes('favoriledi')) {
              socialProofs.favoriteCount = text.match(/(\d+[BKM]?)\s+kişi/)?.[1] || '0';
            } else if (text.includes('inceledi')) {
              socialProofs.viewCount = text.match(/(\d+)\s+kişi/)?.[1] || '0';
            }
          });

          uniqueProducts.push({
            name: fullName,
            price,
            rating: ratingScore,
            reviewCount,
            url: productLink,
            ...socialProofs
          });
        } catch (error) {
          console.error('Error parsing product:', error);
        }
      });

      return uniqueProducts.slice(0, 40);
    });

    console.log(`Found ${products.length} products for URL: ${url}`);
    return products;

  } catch (error) {
    console.error('Scraping error:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

// Flash ürünler ve sepetteki ürünler için özel scraping fonksiyonu
const scrapeSpecialProducts = async (url: string): Promise<Product[]> => {
  let browser;
  try {
    const isDev = process.env.NODE_ENV === 'development';
    console.log('Environment:', process.env.NODE_ENV);

    if (isDev) {
      const options = {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true,
        ignoreHTTPSErrors: true
      };
      browser = await puppeteer.launch(options);
    } else {
      // Vercel production environment
      const executablePath = await chromium.executablePath();
      
      console.log('Executable Path:', executablePath);
      
      const options = {
        args: [
          ...chromium.args,
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--single-process'
        ],
        executablePath,
        headless: true,
        ignoreHTTPSErrors: true
      };
      
      console.log('Launching browser with options:', {
        ...options,
        executablePath: options.executablePath
      });
      
      browser = await puppeteer.launch(options);
    }

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setExtraHTTPHeaders(headers);
    
    // Timeout süresini artır
    await page.setDefaultNavigationTimeout(120000);
    await page.goto(url, { 
      waitUntil: 'networkidle0', 
      timeout: 120000 
    });
    
    // Sayfa yüklenene kadar bekle
    await page.waitForSelector('.p-card-chldrn-cntnr.card-border', { timeout: 60000 });
    await autoScroll(page);

    const products = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.p-card-chldrn-cntnr.card-border'));
      const seenProducts = new Set<string>();
      const uniqueProducts: Product[] = [];

      items.forEach(element => {
        try {
          const productLink = element.querySelector('a')?.href || '';
          const brand = element.querySelector('.prdct-desc-cntnr-ttl')?.textContent?.trim() || '';
          const name = element.querySelector('.prdct-desc-cntnr-name')?.textContent?.trim() || '';
          const fullName = `${brand} ${name}`;
          
          if (seenProducts.has(fullName)) return;
          seenProducts.add(fullName);
          
          const price = element.querySelector('.prc-box-dscntd')?.textContent?.trim() || 'N/A';
          const ratingScore = element.querySelector('.rating-score')?.textContent?.trim() || 'N/A';
          const reviewCount = element.querySelector('.ratingCount')?.textContent?.replace(/[()]/g, '') || '0';

          // Flash sale özel bilgisi
          const flashSaleCount = element.querySelector('.flash-sale-bar-count strong')?.textContent || '0';

          // Sosyal kanıt verilerini topla
          const socialProofs: {[key: string]: string} = {
            soldCount: flashSaleCount
          };

          element.querySelectorAll('.social-proof-item').forEach(item => {
            const text = item.querySelector('.social-proof-text')?.textContent || '';
            if (text.includes('satıldı')) {
              const match = text.match(/(\d+)\+?\s+ürün/);
              if (match) socialProofs.soldCount = match[1];
            } else if (text.includes('favoriledi')) {
              const match = text.match(/(\d+[BKM]?)\s+kişi/);
              if (match) socialProofs.favoriteCount = match[1];
            } else if (text.includes('inceledi')) {
              const match = text.match(/(\d+)\s+kişi/);
              if (match) socialProofs.viewCount = match[1];
            }
          });

          uniqueProducts.push({
            name: fullName,
            price,
            rating: ratingScore,
            reviewCount,
            url: productLink,
            ...socialProofs
          });
        } catch (error) {
          console.error('Error parsing special product:', error);
        }
      });

      return uniqueProducts.slice(0, 40);
    });

    console.log(`Found ${products.length} special products for URL: ${url}`);
    return products;

  } catch (error) {
    console.error('Special products scraping error:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

// Cache kontrolü için yardımcı fonksiyon
const checkCache = (endpoint: string, refresh: boolean = false): Product[] | null => {
  const now = Date.now();
  const cachedData = trendCache.data[endpoint];
  const timestamp = trendCache.timestamps[endpoint];

  if (cachedData && timestamp && !refresh) {
    const isExpired = now - timestamp > CACHE_DURATION;
    if (!isExpired) {
      return cachedData;
    }
  }
  return null;
};

// Cache'e veri kaydetme fonksiyonu
const saveToCache = (endpoint: string, data: Product[]) => {
  const now = Date.now();
  trendCache.data[endpoint] = data;
  trendCache.timestamps[endpoint] = now;
  trendCache.lastUpdate = new Date();
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    const refresh = searchParams.get('refresh') === 'true';

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint parametresi gerekli' },
        { status: 400 }
      );
    }

    // Rate limiting kontrolü
    const now = Date.now();
    const lastRequest = trendCache.timestamps[endpoint] || 0;
    if (now - lastRequest < 3000 && refresh) {
      return NextResponse.json(
        { error: 'Çok fazla istek yapıldı. Lütfen 3 saniye bekleyin.' },
        { status: 429 }
      );
    }

    try {
      // Cache kontrolü
      const cachedData = checkCache(endpoint, refresh);
      if (cachedData) {
        return NextResponse.json({
          data: cachedData,
          lastUpdate: trendCache.lastUpdate,
          fromCache: true,
          cacheTimestamp: trendCache.timestamps[endpoint]
        });
      }

      // URL'yi endpoint'e göre belirle
      let url = '';
      switch(endpoint) {
        case 'best-sellers':
          url = 'https://www.trendyol.com/cok-satanlar?type=bestSeller&webGenderId=1';
          break;
        case 'most-viewed':
          url = 'https://www.trendyol.com/cok-satanlar?type=topViewed&webGenderId=1';
          break;
        case 'most-favorited':
          url = 'https://www.trendyol.com/cok-satanlar?type=mostFavourite&webGenderId=1';
          break;
        case 'most-rated':
          url = 'https://www.trendyol.com/cok-satanlar?type=mostRated&webGenderId=1';
          break;
        case 'flash-sales':
          url = 'https://www.trendyol.com/sr?tag=fs_13_1_2025_9_12';
          break;
        case 'most-added-to-cart':
          url = 'https://www.trendyol.com/sr?fl=sepettekiurunler&sst=BEST_SELLER';
          break;
        default:
          return NextResponse.json(
            { error: 'Geçersiz endpoint' },
            { status: 400 }
          );
      }

      console.log(`Scraping başlatılıyor: ${url}`);

      // Scraping işlemi - endpoint'e göre uygun scraping fonksiyonunu kullan
      const products = await (endpoint === 'flash-sales' || endpoint === 'most-added-to-cart' 
        ? scrapeSpecialProducts(url) 
        : scrapeProducts(url));
      
      if (!products || products.length === 0) {
        console.error('Ürün bulunamadı');
        return NextResponse.json(
          { error: 'Ürün bulunamadı veya sayfa yüklenemedi' },
          { status: 404 }
        );
      }

      console.log(`${products.length} ürün başarıyla çekildi`);
      
      // Cache güncelleme
      saveToCache(endpoint, products);

      return NextResponse.json({
        data: products,
        lastUpdate: trendCache.lastUpdate,
        fromCache: false
      });

    } catch (error) {
      console.error('Scraping error:', error);
      let errorMessage = 'Veriler alınırken bir hata oluştu';
      let statusCode = 500;

      if (error instanceof Error) {
        errorMessage = error.message;
        if (error.message.includes('Navigation timeout')) {
          statusCode = 504;
          errorMessage = 'Sayfa yükleme zaman aşımına uğradı';
        } else if (error.message.includes('net::ERR_')) {
          statusCode = 503;
          errorMessage = 'Ağ bağlantısı hatası';
        }
      }

      return NextResponse.json(
        { 
          error: errorMessage,
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: statusCode }
      );
    }

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { 
        error: 'API hatası',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 