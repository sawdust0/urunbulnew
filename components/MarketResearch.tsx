"use client"

import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Plus, Trash2, Search, Link as LinkIcon } from "lucide-react";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Badge } from "@/components/ui/badge";

interface ResearchProduct {
  id: string;
  name: string;
  price: string;
  platform: 'trendyol' | 'hepsiburada' | 'amazon' | 'n11' | 'other' | '';
  url: string;
  notes: string;
  date: string;
}

export function MarketResearch() {
  const [products, setProducts] = useState<ResearchProduct[]>(() => {
    const saved = localStorage.getItem('marketResearchProducts');
    return saved ? JSON.parse(saved) : [];
  });

  const [newProduct, setNewProduct] = useState<{
    name: string;
    price: string;
    platform: ResearchProduct['platform'];
    url: string;
    notes: string;
  }>({
    name: '',
    price: '',
    platform: 'trendyol',
    url: '',
    notes: ''
  });

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    localStorage.setItem('marketResearchProducts', JSON.stringify(products));
  }, [products]);

  const addProduct = () => {
    if (!newProduct.name || !newProduct.price) return;

    const product: ResearchProduct = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      ...newProduct
    };

    setProducts([...products, product]);
    setNewProduct({
      name: '',
      price: '',
      platform: 'trendyol',
      url: '',
      notes: ''
    });
  };

  const removeProduct = (id: string) => {
    setProducts(products.filter(product => product.id !== id));
  };

  const clearAllProducts = () => {
    if (window.confirm('Tüm ürünleri silmek istediğinize emin misiniz?')) {
      setProducts([]);
    }
  };

  const generatePDF = () => {
    const pdf = new jsPDF('p', 'pt', 'a4');
    
    pdf.addFont('https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf', 'NotoSans', 'normal');
    pdf.setFont('NotoSans');
    
    const pageWidth = pdf.internal.pageSize.width;
    
    pdf.setFontSize(16);
    pdf.setTextColor(40);
    pdf.text('Piyasa Araştırması', pageWidth/2, 40, { align: 'center' });
    
    pdf.setFontSize(10);
    pdf.setTextColor(100);
    const date = new Date().toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    pdf.text(`Oluşturulma Tarihi: ${date}`, pageWidth/2, 60, { align: 'center' });

    const tableData = products.map(product => [
      product.name,
      product.price,
      product.platform.toUpperCase(),
      product.notes || '-'
    ]);

    autoTable(pdf, {
      head: [['Ürün Adı', 'Fiyat', 'Platform', 'Notlar']],
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

    pdf.save('piyasa-arastirmasi.pdf');
  };

  const getPlatformColor = (platform: string) => {
    const colors = {
      trendyol: 'bg-orange-500/20 text-orange-500',
      hepsiburada: 'bg-blue-500/20 text-blue-500',
      amazon: 'bg-yellow-500/20 text-yellow-500',
      n11: 'bg-red-500/20 text-red-500',
      other: 'bg-gray-500/20 text-gray-500',
      '': 'bg-gray-500/20 text-gray-500'
    };
    return colors[platform as keyof typeof colors];
  };

  return (
    <div className="container mx-auto p-4">
      <div className="space-y-6">
        <Card className="bg-[#1a1a1a] border-gray-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-white">Piyasa Araştırması</CardTitle>
                <CardDescription className="text-gray-400">
                  Farklı platformlardaki ürünleri ve fiyatları takip edin
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {products.length > 0 && (
                  <>
                    <Button
                      onClick={clearAllProducts}
                      variant="outline"
                      size="sm"
                      className="bg-transparent border-gray-700 hover:bg-red-900/20 hover:text-red-500"
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

          <CardContent>
            <div className="grid grid-cols-6 gap-4 mb-6">
              <Input
                placeholder="Ürün Adı"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                className="bg-[#252525] border-gray-700 text-white"
              />
              <Input
                placeholder="Fiyat"
                value={newProduct.price}
                onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                className="bg-[#252525] border-gray-700 text-white"
              />
              <select
                value={newProduct.platform}
                onChange={(e) => setNewProduct({ ...newProduct, platform: e.target.value as ResearchProduct['platform'] })}
                className="bg-[#252525] border border-gray-700 text-white rounded-md px-3 py-2"
              >
                <option value="">Platform Seçiniz</option>
                <option value="trendyol">Trendyol</option>
                <option value="hepsiburada">Hepsiburada</option>
                <option value="amazon">Amazon</option>
                <option value="n11">N11</option>
                <option value="other">Diğer</option>
              </select>
              <Input
                placeholder="Ürün URL"
                value={newProduct.url}
                onChange={(e) => setNewProduct({ ...newProduct, url: e.target.value })}
                className="bg-[#252525] border-gray-700 text-white"
              />
              <Input
                placeholder="Not Ekle"
                value={newProduct.notes}
                onChange={(e) => setNewProduct({ ...newProduct, notes: e.target.value })}
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

            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Ürün ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#252525] border-gray-700 text-white"
              />
            </div>

            {products.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800 bg-[#252525]">
                    <TableHead className="text-gray-300">Ürün Adı</TableHead>
                    <TableHead className="text-gray-300">Fiyat</TableHead>
                    <TableHead className="text-gray-300">Platform</TableHead>
                    <TableHead className="text-gray-300">Notlar</TableHead>
                    <TableHead className="text-gray-300">Tarih</TableHead>
                    <TableHead className="w-[100px] text-gray-300">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products
                    .filter(product => 
                      product.name.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((product) => (
                      <TableRow key={product.id} className="border-gray-800">
                        <TableCell className="font-medium text-gray-200">
                          {product.name}
                        </TableCell>
                        <TableCell className="text-gray-200">
                          {product.price} ₺
                        </TableCell>
                        <TableCell>
                          <Badge className={getPlatformColor(product.platform)}>
                            {product.platform ? product.platform.toUpperCase() : 'BELİRTİLMEDİ'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {product.notes || '-'}
                        </TableCell>
                        <TableCell className="text-gray-400 text-sm">
                          {new Date(product.date).toLocaleDateString('tr-TR')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {product.url && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(product.url, '_blank')}
                                className="hover:bg-blue-900/20 hover:text-blue-500"
                              >
                                <LinkIcon className="h-4 w-4" />
                              </Button>
                            )}
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
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-10 text-gray-400">
                Henüz ürün eklenmemiş
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 