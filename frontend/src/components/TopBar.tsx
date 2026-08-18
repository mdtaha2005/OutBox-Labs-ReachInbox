import React from "react";
import { Search, Filter, RotateCw } from "lucide-react";

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
  loading?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  searchQuery,
  onSearchChange,
  onRefresh,
  loading = false,
}) => {
  return (
    <div className="w-full flex items-center justify-between gap-4 py-3 px-6 bg-white border-b border-gray-100 sticky top-0 z-10">
      {/* Pill-shaped Search Bar */}
      <div className="flex-1 max-w-xl relative flex items-center">
        <Search className="w-4 h-4 text-gray-400 absolute left-4 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search"
          className="w-full pl-10 pr-4 py-2 text-xs rounded-full bg-[#F4F5F7] border border-transparent text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-gray-200 transition-colors"
        />
      </div>

      {/* Action Icons */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          title="Filter"
          className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <Filter className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onRefresh}
          title="Refresh List"
          className={`p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors ${
            loading ? "animate-spin text-[#00B04F]" : ""
          }`}
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
