import { NextResponse } from 'next/server';
import axios from 'axios';
import { parseString } from 'xml2js';

interface TrendItem {
  title: string;
  traffic: string;
  description: string;
  pubDate: string;
  picture: {
    url: string | null;
    source: string | null;
  };
  news: Array<{
    title: string;
    snippet: string;
    url: string;
    picture: string;
    source: string;
  }>;
}

interface Cache {
  lastUpdate: Date | null;
  trends: { [key: string]: TrendItem[] };
}

// Ülke listesi ve kodları
const countries = {
  TR: 'Türkiye',
  US: 'Amerika',
  GB: 'İngiltere',
  DE: 'Almanya',
  FR: 'Fransa',
  IT: 'İtalya',
  ES: 'İspanya',
  JP: 'Japonya',
  KR: 'Güney Kore',
  CN: 'Çin'
} as const;

// Alışveriş terimleri
const shoppingTerms = [
  // Türkçe terimler
  'indirim', 'kampanya', 'fırsat', 'satış', 'mağaza',
  'alışveriş', 'fiyat', 'ucuz', 'hesaplı', 'outlet',
  
  // İngilizce terimler
  'discount', 'sale', 'deal', 'shopping', 'price',
  'cheap', 'affordable', 'outlet', 'store', 'shop'
];

// E-ticaret platformları
const ecommercePlatforms = [
  'trendyol', 'hepsiburada', 'amazon', 'n11', 'gittigidiyor',
  'teknosa', 'mediamarkt', 'vatan', 'alibaba', 'aliexpress'
];

// Ürün kategorileri
const productCategories = [
  // Elektronik
  'telefon', 'phone', 'laptop', 'tablet', 'bilgisayar',
  'computer', 'tv', 'kulaklık', 'headphone', 'airpods',
  
  // Giyim
  'ayakkabı', 'shoes', 'çanta', 'bag', 'kıyafet',
  'clothes', 'elbise', 'dress', 'gömlek', 'shirt'
];

// Cache
let trendCache: Cache = {
  lastUpdate: null,
  trends: {}
};

// Add these interfaces at the top with other interfaces
interface XMLNewsItem {
  'ht:news_item_title': string[];
  'ht:news_item_snippet': string[];
  'ht:news_item_url': string[];
  'ht:news_item_picture': string[];
  'ht:news_item_source': string[];
}

interface XMLItem {
  title: string[];
  'ht:approx_traffic': string[];
  description: string[];
  pubDate: string[];
  'ht:picture': string[];
  'ht:picture_source': string[];
  'ht:news_item': XMLNewsItem[];
}

interface XMLResult {
  rss: {
    channel: Array<{
      item: XMLItem[];
    }>;
  };
}

const isShoppingRelated = (title: string, newsContent: string): boolean => {
  const textToCheck = (title + ' ' + newsContent).toLowerCase();

  // En az bir e-ticaret platformu içermeli
  const hasEcommerce = ecommercePlatforms.some(platform => 
    textToCheck.includes(platform)
  );

  // Alışveriş terimi içermeli
  const hasShopping = shoppingTerms.some(term => 
    textToCheck.includes(term)
  );

  // Ürün kategorisi içermeli
  const hasProduct = productCategories.some(category =>
    textToCheck.includes(category)
  );

  return hasEcommerce || (hasShopping && hasProduct);
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = (searchParams.get('country') || 'TR').toUpperCase();

  if (!Object.keys(countries).includes(country)) {
    return NextResponse.json(
      { error: 'Geçersiz ülke kodu' },
      { status: 400 }
    );
  }

  try {
    const now = new Date();
    const lastUpdate = trendCache.lastUpdate;
    const cachedTrends = trendCache.trends[country];

    // Cache kontrolü - 5 dakika
    if (lastUpdate && cachedTrends && 
        (now.getTime() - lastUpdate.getTime() < 5 * 60 * 1000)) {
      return NextResponse.json({
        country: countries[country as keyof typeof countries],
        trends: cachedTrends,
        lastUpdate
      });
    }

    // RSS feed'den verileri çek
    const response = await axios.get(
      `https://trends.google.com/trends/trendingsearches/daily/rss?geo=${country}`
    );
    const xml = response.data;

    // XML parse işlemi
    const parseXML = (): Promise<TrendItem[]> => {
      return new Promise((resolve, reject) => {
        parseString(xml, (err, result: XMLResult) => {
          if (err) reject(new Error('RSS verisi işlenemedi'));
          
          try {
            if (!result?.rss?.channel?.[0]?.item) {
              reject(new Error(`${country} için RSS verisi bulunamadı`));
              return;
            }

            const items = result.rss.channel[0].item;
            const trends = items
              .filter((item: XMLItem) => isShoppingRelated(
                item.title?.[0]?.toLowerCase() || '',
                item['ht:news_item']?.map((news: XMLNewsItem) => 
                  (news['ht:news_item_title']?.[0] || '').toLowerCase() + ' ' +
                  (news['ht:news_item_snippet']?.[0] || '').toLowerCase()
                ).join(' ') || ''
              ))
              .map((item: XMLItem) => ({
                title: item.title?.[0] || '',
                traffic: item['ht:approx_traffic']?.[0] || 'N/A',
                description: item.description?.[0] || '',
                pubDate: item.pubDate?.[0] || '',
                picture: {
                  url: item['ht:picture']?.[0] || null,
                  source: item['ht:picture_source']?.[0] || null
                },
                news: (item['ht:news_item'] || []).map((news: XMLNewsItem) => ({
                  title: news['ht:news_item_title']?.[0] || '',
                  snippet: news['ht:news_item_snippet']?.[0] || '',
                  url: news['ht:news_item_url']?.[0] || '',
                  picture: news['ht:news_item_picture']?.[0] || '',
                  source: news['ht:news_item_source']?.[0] || ''
                }))
              }));

            resolve(trends);
          } catch (error) {
            reject(new Error(`${country} için veri işlenirken hata oluştu: ${error}`));
          }
        });
      });
    };

    const trends = await parseXML();
    
    // Cache güncelle
    trendCache = {
      lastUpdate: now,
      trends: {
        ...trendCache.trends,
        [country]: trends
      }
    };

    return NextResponse.json({
      country: countries[country as keyof typeof countries],
      trends,
      lastUpdate: now
    });

  } catch (error) {
    console.error(`Error fetching trends for ${country}:`, error);
    return NextResponse.json(
      { error: `${country} için trend verileri alınamadı: ${error}` },
      { status: 500 }
    );
  }
} 