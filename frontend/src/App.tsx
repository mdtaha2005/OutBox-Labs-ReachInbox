import React, { useEffect, useState, useCallback } from "react";
import { User, EmailRecord, SenderAccount, DashboardStats } from "./types";
import { authApi, emailApi, senderApi } from "./services/api";
import { Header } from "./components/Header";
import { TabNavigation } from "./components/TabNavigation";
import { ScheduledTable } from "./components/ScheduledTable";
import { SentTable } from "./components/SentTable";
import { ComposeModal } from "./components/ComposeModal";
import { LoginPage } from "./components/LoginPage";
import { Toast, ToastProps } from "./components/Toast";
import { Clock, CheckCheck, Zap, Mail } from "lucide-react";

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"scheduled" | "sent">("scheduled");
  const [searchQuery, setSearchQuery] = useState("");

  // Data lists
  const [scheduledEmails, setScheduledEmails] = useState<EmailRecord[]>([]);
  const [scheduledTotal, setScheduledTotal] = useState(0);
  const [scheduledPage, setScheduledPage] = useState(1);
  const [scheduledTotalPages, setScheduledTotalPages] = useState(1);
  const [scheduledLoading, setScheduledLoading] = useState(false);

  const [sentEmails, setSentEmails] = useState<EmailRecord[]>([]);
  const [sentTotal, setSentTotal] = useState(0);
  const [sentPage, setSentPage] = useState(1);
  const [sentTotalPages, setSentTotalPages] = useState(1);
  const [sentLoading, setSentLoading] = useState(false);

  const [senders, setSenders] = useState<SenderAccount[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [toast, setToast] = useState<Omit<ToastProps, "onClose"> | null>(null);

  // Check URL parameters on mount for token or error
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get("token");
    const errorParam = urlParams.get("error");

    if (errorParam) {
      setAuthError(decodeURIComponent(errorParam));
    }

    if (tokenParam) {
      // Clean query parameter from browser address bar
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    checkAuth();
  }, []);

  const checkAuth = async () => {
    setAuthLoading(true);
    try {
      const me = await authApi.getMe();
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
      setUser(null);
    } catch {
      setUser(null);
    }
  };

  const fetchScheduled = useCallback(async () => {
    if (!user) return;
    setScheduledLoading(true);
    try {
      const res = await emailApi.getScheduled(scheduledPage, 10, searchQuery);
      setScheduledEmails(res.data);
      setScheduledTotal(res.total);
      setScheduledTotalPages(res.totalPages || 1);
    } catch (err: any) {
      console.error("Failed to fetch scheduled emails:", err);
    } finally {
      setScheduledLoading(false);
    }
  }, [user, scheduledPage, searchQuery]);

  const fetchSent = useCallback(async () => {
    if (!user) return;
    setSentLoading(true);
    try {
      const res = await emailApi.getSent(sentPage, 10, searchQuery);
      setSentEmails(res.data);
      setSentTotal(res.total);
      setSentTotalPages(res.totalPages || 1);
    } catch (err: any) {
      console.error("Failed to fetch sent emails:", err);
    } finally {
      setSentLoading(false);
    }
  }, [user, sentPage, searchQuery]);

  const fetchStatsAndSenders = useCallback(async () => {
    if (!user) return;
    try {
      const [statsData, sendersData] = await Promise.all([
        emailApi.getStats(),
        senderApi.getSenders(),
      ]);
      setStats(statsData);
      setSenders(sendersData);
    } catch (err) {
      console.error("Failed to fetch stats/senders:", err);
    }
  }, [user]);

  // Initial & Tab-switch data fetching
  useEffect(() => {
    if (user) {
      fetchStatsAndSenders();
      if (activeTab === "scheduled") {
        fetchScheduled();
      } else {
        fetchSent();
      }
    }
  }, [user, activeTab, fetchScheduled, fetchSent, fetchStatsAndSenders]);

  // Auto-polling for live queue updates every 4 seconds
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchStatsAndSenders();
      if (activeTab === "scheduled") {
        fetchScheduled();
      } else {
        fetchSent();
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [user, activeTab, fetchScheduled, fetchSent, fetchStatsAndSenders]);

  const handleCancelScheduled = async (id: string) => {
    try {
      await emailApi.cancel(id);
      setToast({
        type: "success",
        message: "Email job cancelled and removed from queue.",
      });
      fetchScheduled();
      fetchStatsAndSenders();
    } catch (err: any) {
      setToast({
        type: "error",
        message: err.response?.data?.error || "Failed to cancel email.",
      });
    }
  };

  const handleScheduledSuccess = (msg: string) => {
    setToast({
      type: "success",
      message: msg,
    });
    fetchScheduled();
    fetchStatsAndSenders();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage error={authError} />;
  }

  return (
    <div className="min-h-screen bg-[#0B0F17] text-white flex flex-col">
      <Header user={user} onLogout={handleLogout} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-6">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-gray-900/60 border border-gray-800 backdrop-blur-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Scheduled Queue</div>
              <div className="text-2xl font-bold text-white mt-1">{stats?.scheduledCount ?? 0}</div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-gray-900/60 border border-gray-800 backdrop-blur-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Emails Sent</div>
              <div className="text-2xl font-bold text-white mt-1">{stats?.sentCount ?? 0}</div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <CheckCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-gray-900/60 border border-gray-800 backdrop-blur-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Campaigns</div>
              <div className="text-2xl font-bold text-white mt-1">{stats?.totalCampaigns ?? 0}</div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Mail className="w-5 h-5" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-gray-900/60 border border-gray-800 backdrop-blur-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Worker Engines</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">5 Threads</div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
              <Zap className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Tab Switcher & Search Bar */}
        <TabNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onOpenCompose={() => setIsComposeOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          stats={stats}
        />

        {/* Tab Content */}
        {activeTab === "scheduled" ? (
          <ScheduledTable
            emails={scheduledEmails}
            loading={scheduledLoading}
            total={scheduledTotal}
            page={scheduledPage}
            totalPages={scheduledTotalPages}
            onPageChange={setScheduledPage}
            onOpenCompose={() => setIsComposeOpen(true)}
            onCancel={handleCancelScheduled}
          />
        ) : (
          <SentTable
            emails={sentEmails}
            loading={sentLoading}
            total={sentTotal}
            page={sentPage}
            totalPages={sentTotalPages}
            onPageChange={setSentPage}
          />
        )}
      </main>

      {/* Compose Campaign Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        senders={senders}
        onScheduledSuccess={handleScheduledSuccess}
      />

      {/* Toast Alert */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default App;