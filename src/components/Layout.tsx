import React from 'react';
import { Link, useLocation } from 'wouter';
import { Mic, ListMusic, BookOpen } from 'lucide-react';
import { cn } from '../lib/utils';

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-[#FAF6F1] font-sans text-gray-900 flex flex-col">
      <header className="sticky top-0 z-10 bg-[#FAF6F1]/80 backdrop-blur-md border-b border-[#F0E8DF]">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-[#C4622D] font-semibold hover:opacity-80 transition-opacity">
            <Mic className="w-5 h-5" />
            <span className="tracking-widest text-sm uppercase">Ur NOTES</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link href="/" className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-colors",
              location === '/' ? "bg-[#C4622D] text-white shadow-sm" : "text-gray-600 hover:bg-[#F0E8DF]"
            )}>
              Record
            </Link>
            <Link href="/notes" className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-colors",
              location === '/notes' ? "bg-[#C4622D] text-white shadow-sm" : "text-gray-600 hover:bg-[#F0E8DF]"
            )}>
              My Notes
            </Link>
            <Link href="/calendar" className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-colors",
              location === '/calendar' ? "bg-[#C4622D] text-white shadow-sm" : "text-gray-600 hover:bg-[#F0E8DF]"
            )}>
              Calendar
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 md:p-8">
        {children}
      </main>
    </div>
  );
}
