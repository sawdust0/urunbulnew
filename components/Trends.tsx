"use client"
import { useEffect, useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, ExternalLink, ArrowUpDown, ShoppingBag, Volume2, VolumeX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import Image from 'next/image';

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

// Ülke listesi
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

export function Trends() {
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('TR');
  const { toast } = useToast();
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  
  // Sesli bildirim için audio referansı
  const notificationSound = useRef<HTMLAudioElement | undefined>(new Audio('/notification.mp3'));

  const fetchTrends = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/trends?country=${selectedCountry}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Yeni trend varsa ve ses açıksa bildirim ver
      if (data.newTrends && isSoundEnabled) {
        notificationSound.current?.play();
        toast({
          title: "Yeni Trend!",
          description: "Yeni alışveriş trendleri eklendi",
          variant: "default",
        });
      }

      setTrends(data.trends || []);
    } catch (error) {
      console.error('Trend verisi çekme hatası:', error);
      toast({
        title: "Hata",
        description: `${selectedCountry} için trend verileri alınamadı. Lütfen daha sonra tekrar deneyin.`,
        variant: "destructive",
      });
      setTrends([]); // Hata durumunda trendi temizle
    } finally {
      setLoading(false);
    }
  }, [selectedCountry, isSoundEnabled, toast]);

  useEffect(() => {
    fetchTrends();
    const interval = setInterval(fetchTrends, 5 * 60 * 1000);
    return () => {
      clearInterval(interval);
      notificationSound.current = undefined;
    };
  }, [fetchTrends]);

  // Ülke seçimi için dropdown
  const CountrySelector = () => (
    <select
      value={selectedCountry}
      onChange={(e) => setSelectedCountry(e.target.value)}
      className="bg-[#2a2a2a] text-white border border-gray-700 rounded px-3 py-1"
    >
      {Object.entries(countries).map(([code, name]) => (
        <option key={code} value={code}>
          {name}
        </option>
      ))}
    </select>
  );

  return (
    <div className="container mx-auto p-4 bg-[#0a0a0a]">
      <Card className="w-full bg-[#1a1a1a] border-gray-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-gray-800">
          <div className="flex items-center gap-4">
            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
              <TrendingUp className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              Alışveriş Trendleri
            </CardTitle>
            <CountrySelector />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSoundEnabled(!isSoundEnabled)}
              className="text-gray-400 hover:text-white"
              title={isSoundEnabled ? 'Sesi Kapat' : 'Sesi Aç'}
            >
              {isSoundEnabled ? (
                <Volume2 className="h-5 w-5" />
              ) : (
                <VolumeX className="h-5 w-5" />
              )}
            </Button>
          </div>
          <div className="text-sm text-gray-400 flex items-center gap-2">
            Her 5 dakikada bir güncellenir
            {isSoundEnabled && (
              <span className="text-xs bg-[#2a2a2a] px-2 py-1 rounded">
                Sesli Bildirim Açık
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center h-32 text-gray-400">
              Yükleniyor...
            </div>
          ) : trends.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
              <ShoppingBag className="h-8 w-8 mb-2 opacity-50" />
              <p>Şu anda alışveriş ile ilgili trend bulunamadı.</p>
              <p className="text-sm opacity-70">Daha sonra tekrar kontrol edin.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800">
                  <TableHead className="text-gray-300">Trend</TableHead>
                  <TableHead className="text-gray-300">Arama Hacmi</TableHead>
                  <TableHead className="text-gray-300">İlgili Haberler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trends.map((trend, index) => (
                  <TableRow key={index} className="border-gray-800">
                    <TableCell className="font-medium text-gray-200">
                      <div className="flex items-center gap-3">
                        {trend.picture.url && (
                          <div className="relative group">
                            <Image 
                              src={trend.picture.url} 
                              alt={trend.title} 
                              width={40}
                              height={40}
                              className="rounded-md object-cover"
                            />
                            {trend.picture.source && (
                              <span className="absolute bottom-0 right-0 text-xs bg-black/60 px-1 rounded text-gray-300">
                                {trend.picture.source}
                              </span>
                            )}
                          </div>
                        )}
                        <div>
                          <div>{trend.title}</div>
                          <div className="text-xs text-gray-500">{new Date(trend.pubDate).toLocaleDateString('tr-TR')}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-200">
                      <div className="flex items-center gap-1">
                        <ArrowUpDown className="h-4 w-4 text-green-500" />
                        {trend.traffic}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-200">
                      <div className="space-y-2">
                        {trend.news.map((news, i) => (
                          <a
                            key={i}
                            href={news.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 hover:bg-[#252525] p-2 rounded-md group"
                          >
                            <Image 
                              src={news.picture} 
                              alt={news.title}
                              width={48}
                              height={48}
                              className="rounded object-cover"
                            />
                            <div className="flex-1">
                              <div className="text-sm text-blue-400 group-hover:text-blue-300 flex items-center gap-1">
                                {news.title}
                                <ExternalLink className="h-3 w-3" />
                              </div>
                              <div className="text-xs text-gray-500">{news.source}</div>
                            </div>
                          </a>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 