'use client';

import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { usePathname } from 'next/navigation';
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-gray-800 bg-gradient-to-r from-[#1a1a1a] to-[#2a2a2a]">
      <div className="max-w-screen-2xl mx-auto px-6">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link 
              href="/" 
              className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 hover:opacity-80 transition-opacity pr-8 border-r border-gray-700"
            >
              SÜPER-MAN
            </Link>
            
            <div className="flex gap-2">
              <Button
                variant={pathname === "/" ? "default" : "ghost"}
                className={cn(
                  "px-4 py-2 rounded-lg transition-colors duration-200",
                  pathname === "/" 
                    ? "bg-white/10 text-white" 
                    : "text-gray-300 hover:bg-white/5 hover:text-white"
                )}
                asChild
              >
                <Link href="/">Trendyol</Link>
              </Button>
              
              <Button
                variant={pathname === "/hepsiburada" ? "default" : "ghost"}
                className={`
                  px-4 py-2 rounded-lg transition-colors duration-200
                  ${pathname === "/hepsiburada" 
                    ? "bg-white/10 text-white" 
                    : "text-gray-300 hover:bg-white/5 hover:text-white"}
                `}
                asChild
              >
                <Link href="/hepsiburada">Hepsiburada</Link>
              </Button>
              
              <Button
                variant={pathname === "/trends" ? "default" : "ghost"}
                className={`
                  px-4 py-2 rounded-lg transition-colors duration-200
                  ${pathname === "/trends" 
                    ? "bg-white/10 text-white" 
                    : "text-gray-300 hover:bg-white/5 hover:text-white"}
                `}
                asChild
              >
                <Link href="/trends">Google Trendler</Link>
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
          <Button
              variant={pathname === "/product-list" ? "default" : "ghost"}
              className={cn(
                "px-4 py-2 rounded-lg transition-colors duration-200 ml-2",
                pathname === "/product-list" 
                  ? "bg-white/10 text-white" 
                  : "text-gray-300 hover:bg-white/5 hover:text-white"
              )}
              asChild
            >
              <Link href="/product-list">Yönetim</Link>
            </Button>
            
            <Button
              variant={pathname === "/market-research" ? "default" : "ghost"}
              className={cn(
                "px-4 py-2 rounded-lg transition-colors duration-200 ml-2",
                pathname === "/market-research" 
                  ? "bg-white/10 text-white" 
                  : "text-gray-300 hover:bg-white/5 hover:text-white"
              )}
              asChild
            >
              <Link href="/market-research">Piyasa Araştırma</Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
} 