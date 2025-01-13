"use client"

import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Plus, Trash2, Search, SortAsc, Edit2, Check, X, ShoppingBag } from "lucide-react";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CustomProduct {
  id: string;
  name: string;
  buyPrice: string;
  sellPrice: string;
  category: string;
  date: string;
}

export function CustomList() {
  const [products, setProducts] = useState<CustomProduct[]>(() => {
    const savedProducts = localStorage.getItem('customProducts');
    return savedProducts ? JSON.parse(savedProducts) : [];
  });

  const [newProduct, setNewProduct] = useState({
    name: '',
    buyPrice: '',
    sellPrice: '',
    category: 'genel'
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{field: keyof CustomProduct, direction: 'asc' | 'desc'} | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('customProducts', JSON.stringify(products));
  }, [products]);

  const addProduct = () => {
    if (!newProduct.name || !newProduct.buyPrice || !newProduct.sellPrice) {
      return;
    }

    const product: CustomProduct = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      ...newProduct
    };

    setProducts([...products, product]);
    setNewProduct({ name: '', buyPrice: '', sellPrice: '', category: 'genel' });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addProduct();
    }
  };

 

  const clearAllProducts = () => {
    if (window.confirm('Tüm ürünleri silmek istediğinize emin misiniz?')) {
      setProducts([]);
    }
  };

  const calculateStats = () => {
    const stats = products.reduce((acc, product) => {
      const buyPrice = parseFloat(product.buyPrice.replace(/[^0-9.-]+/g, ""));
      const sellPrice = parseFloat(product.sellPrice.replace(/[^0-9.-]+/g, ""));
      const profit = sellPrice - buyPrice;

      return {
        toplamUrun: acc.toplamUrun + 1,
        toplamYatirim: acc.toplamYatirim + buyPrice,
        toplamSatis: acc.toplamSatis + sellPrice,
        toplamKar: acc.toplamKar + profit,
      };
    }, {
      toplamUrun: 0,
      toplamYatirim: 0,
      toplamSatis: 0,
      toplamKar: 0,
    });

    return stats;
  };

  const sortProducts = (products: CustomProduct[]) => {
    if (!sortConfig) return products;

    return [...products].sort((a, b) => {
      if (sortConfig.field === 'buyPrice' || sortConfig.field === 'sellPrice') {
        const aValue = parseFloat(a[sortConfig.field].replace(/[^0-9.-]+/g, ""));
        const bValue = parseFloat(b[sortConfig.field].replace(/[^0-9.-]+/g, ""));
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      return sortConfig.direction === 'asc' 
        ? a[sortConfig.field].localeCompare(b[sortConfig.field])
        : b[sortConfig.field].localeCompare(a[sortConfig.field]);
    });
  };

  const filterProducts = (products: CustomProduct[]) => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  };

  const startEditing = (id: string) => {
    setEditingId(id);
  };

  const saveEdit = (id: string, updatedProduct: Partial<CustomProduct>) => {
    setProducts(products.map(product => 
      product.id === id ? { ...product, ...updatedProduct } : product
    ));
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const generatePDF = () => {
    const pdf = new jsPDF('p', 'pt', 'a4');
    
    pdf.addFont('https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf', 'NotoSans', 'normal');
    pdf.setFont('NotoSans');
    
    const pageWidth = pdf.internal.pageSize.width;
    
    pdf.setFontSize(16);
    pdf.setTextColor(40);
    pdf.text('Özel Ürün Listesi', pageWidth/2, 40, { align: 'center' });
    
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

    const tableData = products.map(product => [
      product.name,
      `${product.buyPrice} TL`,
      `${product.sellPrice} TL`,
    ]);

    autoTable(pdf, {
      head: [['Ürün Adı', 'Alış Fiyatı', 'Satış Fiyatı']],
      body: tableData,
      startY: 80,
      styles: {
        font: 'NotoSans',
        fontSize: 9,
        cellPadding: 6,
      },
      headStyles: {
        fillColor: [26, 26, 26],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
    });

    const stats = calculateStats();
    
    pdf.setFontSize(12);
    pdf.setTextColor(40);
    const startY = pdf.autoTable.previous.finalY + 20;
    
    pdf.text(`Toplam Ürün: ${stats.toplamUrun}`, 40, startY);
    pdf.text(`Toplam Yatırım: ${stats.toplamYatirim.toFixed(2)} TL`, 40, startY + 20);
    pdf.text(`Toplam Satış: ${stats.toplamSatis.toFixed(2)} TL`, 40, startY + 40);
    pdf.text(`Toplam Kar: ${stats.toplamKar.toFixed(2)} TL`, 40, startY + 60);

    pdf.save('ozel-urun-listesi.pdf');
  };

  const removeProduct = (id: string) => {
    setProducts(products.filter(product => product.id !== id));
  };

  return (
    <div className="container mx-auto p-4">
      <div className="space-y-6">
        {/* Üst Bilgi Kartı */}
        <Card className="bg-[#1a1a1a] border-gray-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-white">Ürün Yönetimi</CardTitle>
                <CardDescription className="text-gray-400">
                  Ürünlerinizi ekleyin, düzenleyin ve takip edin
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {products.length > 0 && (
                  <>
                    <Button
                      onClick={clearAllProducts}
                      variant="outline"
                      size="sm"
                      className={cn(
                        "bg-transparent border-gray-700 hover:bg-red-900/20 hover:text-red-500"
                      )}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Tümünü Sil
                    </Button>
                    <Button
                      onClick={generatePDF}
                      variant="outline"
                      size="sm"
                      className="bg-transparent border-gray-700 hover:bg-gray-800"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      PDF İndir
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>

          {/* İstatistikler */}
          {products.length > 0 && (
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                {Object.entries(calculateStats()).map(([key, value]) => {
                  const labels = {
                    toplamUrun: 'Toplam Ürün',
                    toplamYatirim: 'Toplam Yatırım',
                    toplamSatis: 'Toplam Satış',
                    toplamKar: 'Toplam Kâr'
                  };

                  return (
                    <div key={key} className="bg-[#252525] p-6 rounded-xl border border-gray-800">
                      <div className="text-sm font-medium text-gray-400">
                        {labels[key as keyof typeof labels]}
                      </div>
                      <div className="mt-2 flex items-baseline">
                        <div className="text-2xl font-bold text-white">
                          {typeof value === 'number' && key !== 'toplamUrun'
                            ? `${value.toFixed(2)} ₺`
                            : value}
                        </div>
                        {key === 'toplamKar' && value > 0 && (
                          <Badge className="ml-2 bg-green-500/20 text-green-500">
                            Kârlı
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Ürün Ekleme ve Filtreleme Kartı */}
        <Card className="bg-[#1a1a1a] border-gray-800">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Ürün Ekleme Formu */}
              <div className="grid grid-cols-4 gap-4">
                <Input
                  placeholder="Ürün Adı"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  onKeyPress={handleKeyPress}
                  className="bg-[#252525] border-gray-700 text-white"
                />
                <Input
                  placeholder="Alış Fiyatı"
                  value={newProduct.buyPrice}
                  onChange={(e) => setNewProduct({ ...newProduct, buyPrice: e.target.value })}
                  onKeyPress={handleKeyPress}
                  className="bg-[#252525] border-gray-700 text-white"
                />
                <Input
                  placeholder="Satış Fiyatı"
                  value={newProduct.sellPrice}
                  onChange={(e) => setNewProduct({ ...newProduct, sellPrice: e.target.value })}
                  onKeyPress={handleKeyPress}
                  className="bg-[#252525] border-gray-700 text-white"
                />
                <Button 
                  onClick={addProduct}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ürün Ekle
                </Button>
              </div>

              <Separator className="my-6 bg-gray-800" />

              {/* Arama ve Filtreleme */}
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Ürün ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-[#252525] border-gray-700 text-white"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[200px] bg-[#252525] border-gray-700 text-white">
                    <SelectValue placeholder="Kategori seç" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Kategoriler</SelectItem>
                    <SelectItem value="genel">Genel</SelectItem>
                    <SelectItem value="elektronik">Elektronik</SelectItem>
                    <SelectItem value="giyim">Giyim</SelectItem>
                    <SelectItem value="kozmetik">Kozmetik</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ürün Tablosu */}
        <Card className="bg-[#1a1a1a] border-gray-800">
          <CardContent className="p-0">
            {products.length > 0 ? (
              <div className="rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-800 bg-[#252525]">
                      {['name', 'buyPrice', 'sellPrice'].map((field) => (
                        <TableHead 
                          key={field}
                          className="text-gray-300 cursor-pointer hover:bg-[#2a2a2a]"
                          onClick={() => {
                            setSortConfig({
                              field: field as keyof CustomProduct,
                              direction: sortConfig?.field === field && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                            });
                          }}
                        >
                          <div className="flex items-center gap-2">
                            {field === 'name' ? 'Ürün Adı' : 
                             field === 'buyPrice' ? 'Alış Fiyatı' : 'Satış Fiyatı'}
                            {sortConfig?.field === field && (
                              <SortAsc className={`h-4 w-4 ${sortConfig.direction === 'desc' ? 'transform rotate-180' : ''}`} />
                            )}
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="text-gray-300">Kar/Zarar</TableHead>
                      <TableHead className="text-gray-300">Kategori</TableHead>
                      <TableHead className="text-gray-300">Tarih</TableHead>
                      <TableHead className="w-[100px] text-gray-300">İşlem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortProducts(filterProducts(products)).map((product) => {
                      const buyPrice = parseFloat(product.buyPrice.replace(/[^0-9.-]+/g, ""));
                      const sellPrice = parseFloat(product.sellPrice.replace(/[^0-9.-]+/g, ""));
                      const profit = sellPrice - buyPrice;
                      const profitPercentage = (profit / buyPrice) * 100;

                      return (
                        <TableRow key={product.id} className="border-gray-800 hover:bg-[#252525]">
                          {editingId === product.id ? (
                            <>
                              <TableCell className="min-w-[200px]">
                                <Input
                                  value={product.name}
                                  onChange={(e) => saveEdit(product.id, { name: e.target.value })}
                                  className="bg-[#2a2a2a] border-gray-700 text-white"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={product.buyPrice}
                                  onChange={(e) => saveEdit(product.id, { buyPrice: e.target.value })}
                                  className="bg-[#2a2a2a] border-gray-700 text-white"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={product.sellPrice}
                                  onChange={(e) => saveEdit(product.id, { sellPrice: e.target.value })}
                                  className="bg-[#2a2a2a] border-gray-700 text-white"
                                />
                              </TableCell>
                              <TableCell colSpan={4}>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => saveEdit(product.id, {})}
                                    className="hover:bg-green-900/20 hover:text-green-500"
                                  >
                                    <Check className="h-4 w-4 mr-2" />
                                    Kaydet
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={cancelEdit}
                                    className="hover:bg-red-900/20 hover:text-red-500"
                                  >
                                    <X className="h-4 w-4 mr-2" />
                                    İptal
                                  </Button>
                                </div>
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell className="font-medium text-gray-200">
                                {product.name}
                              </TableCell>
                              <TableCell className="text-gray-200">
                                {product.buyPrice} ₺
                              </TableCell>
                              <TableCell className="text-gray-200">
                                {product.sellPrice} ₺
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  className={`${
                                    profit >= 0 
                                      ? 'bg-green-500/20 text-green-500' 
                                      : 'bg-red-500/20 text-red-500'
                                  }`}
                                >
                                  {profit.toFixed(2)} ₺ ({profitPercentage.toFixed(1)}%)
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="border-gray-700 text-gray-400">
                                  {product.category}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-gray-400 text-sm">
                                {format(new Date(product.date), 'dd MMM yyyy', { locale: tr })}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => startEditing(product.id)}
                                    className="hover:bg-blue-900/20 hover:text-blue-500"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeProduct(product.id)}
                                    className="hover:bg-red-900/20 hover:text-red-500"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <ShoppingBag className="h-12 w-12 mb-4 text-gray-500" />
                <div className="text-lg font-medium">Henüz ürün eklenmemiş</div>
                <div className="text-sm mt-2">
                  Yeni ürün eklemek için yukarıdaki formu kullanın
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 