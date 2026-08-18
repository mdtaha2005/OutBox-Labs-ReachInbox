import React, { useState } from "react";
import { User, DashboardStats } from "../types";
import { Clock, Send, ChevronDown, LogOut } from "lucide-react";

interface SidebarProps {
  user: User;
  activeTab: "scheduled" | "sent";
  onTabChange: (tab: "scheduled" | "sent") => void;
  onOpenCompose: () => void;
  onLogout: () => void;
  stats: DashboardStats | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  activeTab,
  onTabChange,
  onOpenCompose,
  onLogout,
  stats,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <aside className="w-64 shrink-0 min-h-screen bg-white border-r border-gray-100 flex flex-col justify-between p-4 font-sans select-none">
      <div className="space-y-4">
        {/* Top Logo */}
        <div className="flex items-center gap-2 px-1 pt-1 pb-1">
          <span className="font-extrabold text-2xl tracking-tighter text-black font-mono">
            ON8
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#00B04F] bg-[#EAF7EE] px-2 py-0.5 rounded-full">
            ReachInbox
          </span>
        </div>

        {/* User Profile Pill Card */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="w-full flex items-center justify-between p-2 rounded-2xl bg-[#F4F5F7] hover:bg-gray-200/80 transition-all text-left group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={
                  user.avatarUrl ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)}`
                }
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover shrink-0 bg-gray-200"
              />
              <div className="min-w-0 truncate">
                <div className="text-xs font-bold text-gray-900 truncate leading-snug">
                  {user.name}
                </div>
                <div className="text-[11px] text-gray-500 truncate leading-none">
                  {user.email}
                </div>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-700 shrink-0 ml-1 transition-transform" />
          </button>

          {/* User Menu Dropdown */}
          {isUserMenuOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg p-1 z-30 animate-in fade-in duration-150">
              <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>

        {/* Compose Button (Matching Image 2 & 3: White background, green border, green text) */}
        <button
          type="button"
          onClick={onOpenCompose}
          className="w-full py-2 px-4 rounded-full border-2 border-[#00B04F] text-[#00B04F] hover:bg-[#00B04F] hover:text-white font-semibold text-sm transition-all shadow-sm active:scale-[0.99] flex items-center justify-center gap-2"
        >
          <span>Compose</span>
        </button>

        {/* Navigation Section */}
        <div className="pt-2">
          <div className="text-[11px] font-bold text-gray-400 tracking-wider uppercase px-3 mb-1.5">
            CORE
          </div>

          <nav className="space-y-1">
            {/* Scheduled Nav Button */}
            <button
              type="button"
              onClick={() => onTabChange("scheduled")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-medium transition-all ${
                activeTab === "scheduled"
                  ? "bg-[#EAF7EE] text-[#00B04F] font-bold shadow-xs"
                  : "text-gray-600 hover:bg-gray-100/80"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4" />
                <span>Scheduled</span>
              </div>
              <span
                className={`text-xs font-semibold ${
                  activeTab === "scheduled" ? "text-[#00B04F]" : "text-gray-500"
                }`}
              >
                {stats?.scheduledCount ?? 0}
              </span>
            </button>

            {/* Sent Nav Button */}
            <button
              type="button"
              onClick={() => onTabChange("sent")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-medium transition-all ${
                activeTab === "sent"
                  ? "bg-[#EAF7EE] text-[#00B04F] font-bold shadow-xs"
                  : "text-gray-600 hover:bg-gray-100/80"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Send className="w-4 h-4" />
                <span>Sent</span>
              </div>
              <span
                className={`text-xs font-semibold ${
                  activeTab === "sent" ? "text-[#00B04F]" : "text-gray-500"
                }`}
              >
                {stats?.sentCount ?? 0}
              </span>
            </button>
          </nav>
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-2 py-3 border-t border-gray-100 text-[11px] text-gray-400 flex items-center justify-between">
        <span>BullMQ + Redis Engine</span>
        <span className="w-2 h-2 rounded-full bg-[#00B04F] animate-pulse"></span>
      </div>
    </aside>
  );
};
