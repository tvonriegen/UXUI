"use client";
import { ExternalLink } from "lucide-react";

export interface DbPortfolioItem {
  id: string;
  title: string;
  description: string;
  image: string;
  link: string;
}

interface PortfolioGridProps {
  portfolio: DbPortfolioItem[];
  accentText: string;
}

export function PortfolioGrid({ portfolio, accentText }: PortfolioGridProps) {
  if (portfolio.length === 0) {
    return (
      <div className="col-span-full text-center py-20 bg-white rounded-2xl border border-slate-200/60">
        <p className="text-slate-400">No hay proyectos en el portafolio todavía.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {portfolio.map((item) => (
        <div
          key={item.id}
          className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden hover:shadow-md transition-shadow"
        >
          {item.image && (
            <div className="aspect-[16/9] overflow-hidden">
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>
          )}
          <div className="p-4">
            <h3 className="font-bold text-sm">{item.title}</h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
            {item.link && (
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-2 flex items-center gap-1 text-xs ${accentText} hover:underline font-medium`}
              >
                <ExternalLink size={12} /> Ver proyecto
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
