"use client";

import { useState } from "react";
import { Search, MapPin } from "lucide-react";

interface SearchBarProps {
  onSearch: (q: string, location: string) => void;
  isLoading: boolean;
}

export function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [q, setQ] = useState("");
  const [location, setLocation] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(q, location);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full rounded-2xl border border-border bg-surface p-4 shadow-md shadow-black/5"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        {/* Keyword Search Input */}
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder="Job title, keywords, or company"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            disabled={isLoading}
            className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 text-sm text-foreground outline-none transition-all placeholder:text-muted focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            aria-label="Job keywords"
          />
        </div>

        {/* Separator for desktop */}
        <div className="hidden h-8 w-px bg-border md:block" />

        {/* Location Input */}
        <div className="relative flex-1">
          <MapPin
            className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder="City, country, or 'Remote'"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={isLoading}
            className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 text-sm text-foreground outline-none transition-all placeholder:text-muted focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            aria-label="Job location"
          />
        </div>

        {/* Search Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-brand-500/10 transition-all hover:bg-brand-700 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Searching...
            </>
          ) : (
            <>
              <Search className="h-4 w-4" aria-hidden="true" />
              Search
            </>
          )}
        </button>
      </div>
    </form>
  );
}
