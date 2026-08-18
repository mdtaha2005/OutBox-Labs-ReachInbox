import React from "react";
import { Plus, Clock, CheckCheck, Search } from "lucide-react";
import { DashboardStats } from "../types";

interface TabNavigationProps {
  activeTab: "scheduled" | "sent";
  onTabChange: (tab: "scheduled" | "sent") => void;
  onOpenCompose: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  stats: DashboardStats | null;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  onOpenCompose,
  searchQuery,
  onSearchChange,
  stats,
}) => {
  return (
    <div className="flex flex-col gap-5">
      {/* Top Bar: Tabs, Search & Compose CTA */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-900/90 border border-gray-800 self-start sm:self-auto">
          <button
            onClick={() => onTabChange("scheduled")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "scheduled"
                ? "bg-gray-800 text-white shadow-sm border border-gray-700"
                : "text-gray-400 hover:text-white hover:bg-gray-800/40"
            }`}
          >
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Scheduled Emails</span>
            {stats && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/10 text-amber-300 font-semibold border border-amber-500/20">
                {stats.scheduledCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onTabChange("sent")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "sent"
                ? "bg-gray-800 text-white shadow-sm border border-gray-700"
                : "text-gray-400 hover:text-white hover:bg-gray-800/40"
            }`}
          >
            <CheckCheck className="w-4 h-4 text-emerald-400" />
            <span>Sent Emails</span>
            {stats && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/10 text-emerald-300 font-semibold border border-emerald-500/20">
                {stats.sentCount}
              </span>
            )}
          </button>
        </div>

        {/* Right Section: Search & Compose */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search recipient or subject..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-gray-900/90 border border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>

          <button
            onClick={onOpenCompose}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-sm font-semibold shadow-lg shadow-emerald-950/40 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Compose New Email</span>
          </button>
        </div>
      </div>
    </div>
  );
};