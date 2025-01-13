'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, ShoppingBag, Star, ArrowUpDown, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CustomList } from "@/components/CustomList";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Product {
  name: string;
  price: string;
  rating: string;
  reviewCount: string;
  basketCount?: string;
  viewCount?: string;
  favoriteCount?: string;
  soldCount?: string;
  url: string;
}

type SortField = 'price' | 'rating' | 'reviewCount';
type SortOrder = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  order: SortOrder;
}

interface CacheData {
  bestSellers: Product[];
  mostViewed: Product[];
  mostFavorited: Product[];
  mostRated: Product[];
  flashSales: Product[];
  mostAddedToCart: Product[];
  lastUpdate: Date | null;
}

export function Trendyol() {
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [mostViewed, setMostViewed] = useState<Product[]>([]);
  const [mostFavorited, setMostFavorited] = useState<Product[]>([]);
  const [mostRated, setMostRated] = useState<Product[]>([]);
  const [flashSales, setFlashSales] = useState<Product[]>([]);
  const [mostAddedToCart, setMostAddedToCart] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [bestSellerSort, setBestSellerSort] = useState<SortConfig | null>(null);
  const [mostViewedSort, setMostViewedSort] = useState<SortConfig | null>(null);
  const [mostFavoritedSort, setMostFavoritedSort] = useState<SortConfig | null>(null);
  const [mostRatedSort, setMostRatedSort] = useState<SortConfig | null>(null);
  const [flashSalesSort, setFlashSalesSort] = useState<SortConfig | null>(null);
  const [mostAddedToCartSort, setMostAddedToCartSort] = useState<SortConfig | null>(null);

  const [isRateLimited, setIsRateLimited] = useState(false);
  const rateLimitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  const loadFromLocalStorage = useCallback(() => {
    try {
      const storedData = localStorage.getItem('trendyolData');
      if (storedData) {
        const data = JSON.parse(storedData);
        if (data.lastUpdate) {
          const lastUpdateDate = new Date(data.lastUpdate);
          const now = new Date();
          const hoursDiff = (now.getTime() - lastUpdateDate.getTime()) / (1000 * 60 * 60);
          
          // Only load from cache if it's less than 24 hours old
          if (hoursDiff < 24) {
            setBestSellers(data.bestSellers || []);
            setMostViewed(data.mostViewed || []);
            setMostFavorited(data.mostFavorited || []);
            setMostRated(data.mostRated || []);
            setFlashSales(data.flashSales || []);
            setMostAddedToCart(data.mostAddedToCart || []);
            setLastUpdate(lastUpdateDate);
            setIsFromCache(true);
            return true;
          }
        }
      }
      return false;
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return false;
    }
  }, []);

  const saveToLocalStorage = (data: CacheData) => {
    try {
      localStorage.setItem('trendyolData', JSON.stringify({
        bestSellers: data.bestSellers,
        mostViewed: data.mostViewed,
        mostFavorited: data.mostFavorited,
        mostRated: data.mostRated,
        flashSales: data.flashSales,
        mostAddedToCart: data.mostAddedToCart,
        lastUpdate: data.lastUpdate
      }));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  const fetchFromApi = useCallback(async (endpoint: string, forceRefresh: boolean = false) => {
    const url = `/api/trendyol?endpoint=${endpoint}${forceRefresh ? '&refresh=true' : ''}`;
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit aşıldı');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    if (result.error) {
      throw new Error(result.error);
    }
    return result;
  }, []);

  const fetchData = useCallback(async (forceRefresh: boolean = false) => {
    if (isRateLimited) {
      toast({
        title: "Rate Limit",
        description: "Lütfen biraz bekleyin ve tekrar deneyin.",
        variant: "destructive",
      });
      return;
    }

    if (!forceRefresh) {
      const loadedFromCache = loadFromLocalStorage();
      if (loadedFromCache) return;
    }

    setLoading(true);
    try {
      const [
        bestSellersResult,
        mostViewedResult,
        mostFavoritedResult,
        mostRatedResult,
        flashSalesResult,
        mostAddedToCartResult
      ] = await Promise.all([
        fetchFromApi('best-sellers', forceRefresh),
        fetchFromApi('most-viewed', forceRefresh),
        fetchFromApi('most-favorited', forceRefresh),
        fetchFromApi('most-rated', forceRefresh),
        fetchFromApi('flash-sales', forceRefresh),
        fetchFromApi('most-added-to-cart', forceRefresh)
      ]);

      const newData: CacheData = {
        bestSellers: bestSellersResult.data,
        mostViewed: mostViewedResult.data,
        mostFavorited: mostFavoritedResult.data,
        mostRated: mostRatedResult.data,
        flashSales: flashSalesResult.data,
        mostAddedToCart: mostAddedToCartResult.data,
        lastUpdate: new Date()
      };

      setBestSellers(newData.bestSellers);
      setMostViewed(newData.mostViewed);
      setMostFavorited(newData.mostFavorited);
      setMostRated(newData.mostRated);
      setFlashSales(newData.flashSales);
      setMostAddedToCart(newData.mostAddedToCart);
      setLastUpdate(newData.lastUpdate);
      setIsFromCache(false);

      saveToLocalStorage(newData);

    } catch (error) {
      console.error('Fetch error:', error);
      if (error instanceof Error && error.message === 'Rate limit aşıldı') {
        setIsRateLimited(true);
        rateLimitTimeoutRef.current = setTimeout(() => {
          setIsRateLimited(false);
        }, 3000);
      }
      toast({
        title: "Hata",
        description: "Veriler alınırken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [isRateLimited, toast, loadFromLocalStorage, fetchFromApi]);

  useEffect(() => {
    fetchData(false);
    return () => {
      if (rateLimitTimeoutRef.current) {
        clearTimeout(rateLimitTimeoutRef.current);
      }
    };
  }, [fetchData]);

  const sortProducts = (products: Product[], sortConfig: SortConfig | null) => {
    if (!sortConfig) return products;

    return [...products].sort((a, b) => {
      let aValue: number;
      let bValue: number;

      if (sortConfig.field === 'price') {
        aValue = parseFloat(a[sortConfig.field].replace(/[^0-9,]/g, '').replace(',', '.')) || 0;
        bValue = parseFloat(b[sortConfig.field].replace(/[^0-9,]/g, '').replace(',', '.')) || 0;
      } else if (sortConfig.field === 'rating') {
        aValue = a[sortConfig.field] === 'N/A' ? 0 : parseFloat(a[sortConfig.field]) || 0;
        bValue = b[sortConfig.field] === 'N/A' ? 0 : parseFloat(b[sortConfig.field]) || 0;
      } else {
        aValue = parseInt(a[sortConfig.field]) || 0;
        bValue = parseInt(b[sortConfig.field]) || 0;
      }

      return sortConfig.order === 'asc' ? aValue - bValue : bValue - aValue;
    });
  };

  const toggleSort = (
    field: SortField,
    currentSort: SortConfig | null,
    setSort: (sort: SortConfig | null) => void
  ) => {
    if (!currentSort || currentSort.field !== field) {
      setSort({ field, order: 'desc' });
    } else if (currentSort.order === 'desc') {
      setSort({ field, order: 'asc' });
    } else {
      setSort(null);
    }
  };

  const SortableHeader = ({ 
    field, 
    label, 
    sortConfig, 
    onSort 
  }: { 
    field: SortField; 
    label: string; 
    sortConfig: SortConfig | null;
    onSort: (field: SortField) => void;
  }) => (
    <TableHead>
      <button
        onClick={() => onSort(field)}
        className="flex items-center gap-2 hover:text-white transition-colors"
      >
        {label}
        <ArrowUpDown className={`h-4 w-4 ${
          sortConfig?.field === field ? 'text-white' : 'text-gray-500'
        }`} />
      </button>
    </TableHead>
  );

  const ProductTable = ({
    products,
    title,
    sortConfig,
    onSort,
    loading
  }: {
    products: Product[];
    title: string;
    sortConfig: SortConfig | null;
    onSort: (field: SortField) => void;
    loading: boolean;
  }) => {
    const sortedProducts = sortProducts(products, sortConfig);

    const exportToPDF = () => {
      const pdf = new jsPDF('p', 'pt', 'a4');
      
      pdf.addFont('https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf', 'NotoSans', 'normal');
      pdf.setFont('NotoSans');
      
      const pageWidth = pdf.internal.pageSize.width;
      
      // Başlık
      pdf.setFontSize(16);
      pdf.setTextColor(40);
      pdf.text(title, pageWidth/2, 40, { align: 'center' });
      
      // Tarih
      pdf.setFontSize(10);
      pdf.setTextColor(100);
      const date = new Date().toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      pdf.text(`Oluşturulma Tarihi: ${date}`, pageWidth/2, 60, { align: 'center' });

      // İstatistikler
      const stats = {
        totalProducts: sortedProducts.length,
        avgRating: sortedProducts.reduce((acc, product) => {
          const rating = product.rating === 'N/A' ? 0 : parseFloat(product.rating) || 0;
          return acc + rating;
        }, 0) / (sortedProducts.length || 1),
        totalReviews: sortedProducts.reduce((acc, product) => acc + (parseInt(product.reviewCount) || 0), 0)
      };

      pdf.setFontSize(11);
      pdf.setTextColor(60);
      pdf.text(`Toplam Ürün: ${stats.totalProducts}`, 40, 90);
      pdf.text(`Ortalama Puan: ${stats.avgRating.toFixed(2)}`, 40, 110);
      pdf.text(`Toplam Değerlendirme: ${stats.totalReviews.toLocaleString('tr-TR')}`, 40, 130);

      // Tablo
      const tableData = sortedProducts.map(product => [
        product.name,
        `${product.price} TL`,
        product.rating,
        product.reviewCount,
        [
          product.soldCount && `${product.soldCount} satış`,
          product.favoriteCount && `${product.favoriteCount} favori`,
          product.viewCount && `${product.viewCount} görüntülenme`
        ].filter(Boolean).join('\n')
      ]);

      autoTable(pdf, {
        head: [['Ürün Adı', 'Fiyat', 'Puan', 'Değerlendirme', 'Sosyal Kanıt']],
        body: tableData,
        startY: 150,
        styles: {
          font: 'NotoSans',
          fontSize: 9,
          cellPadding: 6,
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        headStyles: {
          fillColor: [26, 26, 26],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        columnStyles: {
          0: { cellWidth: 180 }, // Ürün Adı
          1: { cellWidth: 80 },  // Fiyat
          2: { cellWidth: 60 },  // Puan
          3: { cellWidth: 90 },  // Değerlendirme
          4: { cellWidth: 120 }  // Sosyal Kanıt
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
      });

      // Alt Bilgi
      const finalY = pdf.autoTable.previous.finalY || 150;
      pdf.setFontSize(8);
      pdf.setTextColor(128);
      pdf.text(
        'Not: Bu rapor otomatik olarak oluşturulmuştur. Veriler anlık olarak değişebilir.',
        pageWidth/2,
        finalY + 20,
        { align: 'center' }
      );

      pdf.save(`${title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
      <Card className="bg-[#1a1a1a] border-gray-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold text-white">{title}</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToPDF}
            className="bg-[#2a2a2a] border-gray-700 hover:bg-[#3a3a3a] text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-32 text-gray-400">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Yükleniyor...
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
              <ShoppingBag className="h-8 w-8 mb-2 opacity-50" />
              <p>Henüz ürün bulunamadı</p>
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800">
                    <TableHead className="text-gray-300">Ürün Adı</TableHead>
                    <SortableHeader
                      field="price"
                      label="Fiyat"
                      sortConfig={sortConfig}
                      onSort={onSort}
                    />
                    <SortableHeader
                      field="rating"
                      label="Puan"
                      sortConfig={sortConfig}
                      onSort={onSort}
                    />
                    <SortableHeader
                      field="reviewCount"
                      label="Değerlendirme"
                      sortConfig={sortConfig}
                      onSort={onSort}
                    />
                    <TableHead className="text-gray-300">Sosyal Kanıt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedProducts.map((product, index) => (
                    <TableRow key={index} className="border-gray-800">
                      <TableCell className="font-medium">
                        <a
                          href={product.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 hover:underline"
                        >
                          {product.name}
                        </a>
                      </TableCell>
                      <TableCell>{product.price}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-400" />
                          {product.rating}
                        </div>
                      </TableCell>
                      <TableCell>{product.reviewCount}</TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          {product.soldCount && (
                            <div className="text-green-400">{product.soldCount} satış</div>
                          )}
                          {product.favoriteCount && (
                            <div className="text-red-400">{product.favoriteCount} favori</div>
                          )}
                          {product.viewCount && (
                            <div className="text-blue-400">{product.viewCount} görüntülenme</div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-white">Trendyol Takip</h1>
          {lastUpdate && (
            <div className="flex flex-col">
              <span className="text-sm text-gray-400">
                Son güncelleme: {lastUpdate.toLocaleTimeString('tr-TR')}
              </span>
              {isFromCache && (
                <span className="text-xs text-gray-500">
                  (Önbellek verisi - 24 saat geçerli)
                </span>
              )}
            </div>
          )}
        </div>
        <Button 
          onClick={() => fetchData(true)} 
          disabled={loading}
          className="flex items-center gap-2 bg-[#2a2a2a] hover:bg-[#3a3a3a]"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Tekrar Ara
        </Button>
      </div>

      <Tabs defaultValue="bestsellers" className="w-full">
        <TabsList className="grid w-full grid-cols-6 bg-[#1a1a1a]">
          <TabsTrigger value="bestsellers" className="data-[state=active]:bg-[#252525]">
            Çok Satanlar
          </TabsTrigger>
          <TabsTrigger value="mostviewed" className="data-[state=active]:bg-[#252525]">
            En Çok Görüntülenenler
          </TabsTrigger>
          <TabsTrigger value="mostfavorited" className="data-[state=active]:bg-[#252525]">
            En Çok Favorilenenler
          </TabsTrigger>
          <TabsTrigger value="mostrated" className="data-[state=active]:bg-[#252525]">
            En Çok Değerlendirilenler
          </TabsTrigger>
          <TabsTrigger value="flashsales" className="data-[state=active]:bg-[#252525]">
            Flaş Ürünler
          </TabsTrigger>
          <TabsTrigger value="mostaddedtocart" className="data-[state=active]:bg-[#252525]">
            Sepete En Çok Eklenenler
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="bestsellers">
            <ProductTable 
              products={bestSellers} 
              title="Çok Satanlar" 
              sortConfig={bestSellerSort}
              onSort={(field) => toggleSort(field, bestSellerSort, setBestSellerSort)}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="mostviewed">
            <ProductTable 
              products={mostViewed} 
              title="En Çok Görüntülenenler" 
              sortConfig={mostViewedSort}
              onSort={(field) => toggleSort(field, mostViewedSort, setMostViewedSort)}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="mostfavorited">
            <ProductTable 
              products={mostFavorited} 
              title="En Çok Favorilenenler" 
              sortConfig={mostFavoritedSort}
              onSort={(field) => toggleSort(field, mostFavoritedSort, setMostFavoritedSort)}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="mostrated">
            <ProductTable 
              products={mostRated} 
              title="En Çok Değerlendirilenler" 
              sortConfig={mostRatedSort}
              onSort={(field) => toggleSort(field, mostRatedSort, setMostRatedSort)}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="flashsales">
            <ProductTable 
              products={flashSales} 
              title="Flaş Ürünler" 
              sortConfig={flashSalesSort}
              onSort={(field) => toggleSort(field, flashSalesSort, setFlashSalesSort)}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="mostaddedtocart">
            <ProductTable 
              products={mostAddedToCart} 
              title="Sepete En Çok Eklenenler" 
              sortConfig={mostAddedToCartSort}
              onSort={(field) => toggleSort(field, mostAddedToCartSort, setMostAddedToCartSort)}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="customlist">
            <CustomList />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
} 