import React from "react";
import { User } from "../types";
import { LogOut, Send, Zap } from "lucide-react";

interface HeaderProps {
  user: User;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-[#1F2937] bg-[#0B0F17]/80 backdrop-blur-md px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-900/20">
            <Send className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-tight">ReachInbox</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20">
                Scheduler
              </span>
            </div>
            <p className="text-xs text-gray-400">Distributed Cold Outreach Engine</p>
          </div>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900/80 border border-gray-800 text-xs text-gray-300">
            <Zap className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>BullMQ + Redis Active</span>
          </div>

          <div className="flex items-center gap-3 pl-2 border-l border-gray-800">
            <div className="relative">
              <img
                src={
                  user.avatarUrl ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)}`
                }
                alt={user.name}
                className="w-9 h-9 rounded-full ring-2 ring-emerald-500/30 object-cover bg-gray-800"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0B0F17]"></span>
            </div>

            <div className="hidden md:block text-left">
              <div className="text-sm font-semibold text-white leading-tight">{user.name}</div>
              <div className="text-xs text-gray-400 truncate max-w-[180px]">{user.email}</div>
            </div>

            <button
              onClick={onLogout}
              title="Logout"
              className="p-2 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};