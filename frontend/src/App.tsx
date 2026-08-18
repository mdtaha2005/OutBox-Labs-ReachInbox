import React, { useEffect, useState, useCallback } from "react";
import { User, EmailRecord, SenderAccount, DashboardStats } from "./types";
import { authApi, emailApi, senderApi } from "./services/api";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { ScheduledList } from "./components/ScheduledList";
import { SentList } from "./components/SentList";
import { ComposeView } from "./components/ComposeView";
import { EmailDetailView } from "./components/EmailDetailView";
import { LoginPage } from "./components/LoginPage";
import { Toast, ToastProps } from "./components/Toast";

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Active view & navigation
  const [activeTab, setActiveTab] = useState<"scheduled" | "sent">("scheduled");
  const [searchQuery, setSearchQuery] = useState("");
  const [isComposeActive, setIsComposeActive] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailRecord | null>(null);

  // Scheduled Queue State
  const [scheduledEmails, setScheduledEmails] = useState<EmailRecord[]>([]);
  const [scheduledTotal, setScheduledTotal] = useState(0);
  const [scheduledPage, setScheduledPage] = useState(1);
  const [scheduledTotalPages, setScheduledTotalPages] = useState(1);
  const [scheduledLoading, setScheduledLoading] = useState(false);

  // Sent Emails State
  const [sentEmails, setSentEmails] = useState<EmailRecord[]>([]);
  const [sentTotal, setSentTotal] = useState(0);
  const [sentPage, setSentPage] = useState(1);
  const [sentTotalPages, setSentTotalPages] = useState(1);
  const [sentLoading, setSentLoading] = useState(false);

  const [senders, setSenders] = useState<SenderAccount[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const [toast, setToast] = useState<Omit<ToastProps, "onClose"> | null>(null);

  // Auth Initialization on Mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get("error");

    if (errorParam) {
      setAuthError(decodeURIComponent(errorParam));
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

  const fetchScheduled = useCallback(async (isSilent = false) => {
    if (!user) return;
    if (!isSilent) setScheduledLoading(true);
    try {
      const res = await emailApi.getScheduled(scheduledPage, 15, searchQuery);
      setScheduledEmails(res.data);
      setScheduledTotal(res.total);
      setScheduledTotalPages(res.totalPages || 1);
    } catch (err: any) {
      console.error("Failed to fetch scheduled emails:", err);
    } finally {
      if (!isSilent) setScheduledLoading(false);
    }
  }, [user, scheduledPage, searchQuery]);

  const fetchSent = useCallback(async (isSilent = false) => {
    if (!user) return;
    if (!isSilent) setSentLoading(true);
    try {
      const res = await emailApi.getSent(sentPage, 15, searchQuery);
      setSentEmails(res.data);
      setSentTotal(res.total);
      setSentTotalPages(res.totalPages || 1);
    } catch (err: any) {
      console.error("Failed to fetch sent emails:", err);
    } finally {
      if (!isSilent) setSentLoading(false);
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

  // Initial & Tab-switch data fetching (shows loading spinner only on tab change or initial load)
  useEffect(() => {
    if (user) {
      fetchStatsAndSenders();
      if (activeTab === "scheduled") {
        fetchScheduled(false);
      } else {
        fetchSent(false);
      }
    }
  }, [user, activeTab, fetchScheduled, fetchSent, fetchStatsAndSenders]);

  // Silent Auto-polling for live queue updates every 4 seconds (zero flicker)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchStatsAndSenders();
      if (activeTab === "scheduled") {
        fetchScheduled(true); // silent background update
      } else {
        fetchSent(true); // silent background update
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
      if (selectedEmail?.id === id) {
        setSelectedEmail(null);
      }
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
    setIsComposeActive(false);
    fetchScheduled();
    fetchStatsAndSenders();
  };

  const handleRefresh = () => {
    fetchStatsAndSenders();
    if (activeTab === "scheduled") {
      fetchScheduled(false);
    } else {
      fetchSent(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-[#00B04F]/20 border-t-[#00B04F] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage error={authError} />;
  }

  // Compose Fullscreen View (Matching Image 5)
  if (isComposeActive) {
    return (
      <div className="min-h-screen bg-white flex">
        <Sidebar
          user={user}
          activeTab={activeTab}
          onTabChange={(tab) => {
            setIsComposeActive(false);
            setSelectedEmail(null);
            setActiveTab(tab);
          }}
          onOpenCompose={() => {
            setSelectedEmail(null);
            setIsComposeActive(true);
          }}
          onLogout={handleLogout}
          stats={stats}
        />
        <main className="flex-1 min-h-screen bg-white">
          <ComposeView
            onClose={() => setIsComposeActive(false)}
            senders={senders}
            onScheduledSuccess={handleScheduledSuccess}
          />
        </main>
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

  // Email Detail View (Matching Image 4)
  if (selectedEmail) {
    return (
      <div className="min-h-screen bg-white flex">
        <Sidebar
          user={user}
          activeTab={activeTab}
          onTabChange={(tab) => {
            setSelectedEmail(null);
            setIsComposeActive(false);
            setActiveTab(tab);
          }}
          onOpenCompose={() => {
            setSelectedEmail(null);
            setIsComposeActive(true);
          }}
          onLogout={handleLogout}
          stats={stats}
        />
        <main className="flex-1 min-h-screen bg-white">
          <EmailDetailView
            email={selectedEmail}
            currentUser={user}
            onBack={() => setSelectedEmail(null)}
            onDelete={
              selectedEmail.status !== "SENT"
                ? handleCancelScheduled
                : undefined
            }
          />
        </main>
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

  // Main Dashboard View (Matching Image 2 & 3)
  return (
    <div className="min-h-screen bg-white flex font-sans">
      {/* Left Sidebar */}
      <Sidebar
        user={user}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setSelectedEmail(null);
          setIsComposeActive(false);
          setActiveTab(tab);
        }}
        onOpenCompose={() => {
          setSelectedEmail(null);
          setIsComposeActive(true);
        }}
        onLogout={handleLogout}
        stats={stats}
      />

      {/* Main Content Area */}
      <main className="flex-1 min-h-screen bg-white flex flex-col min-w-0">
        {/* Top Search & Action Bar */}
        <TopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onRefresh={handleRefresh}
          loading={activeTab === "scheduled" ? scheduledLoading : sentLoading}
        />

        {/* Tab List Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "scheduled" ? (
            <ScheduledList
              emails={scheduledEmails}
              loading={scheduledLoading}
              total={scheduledTotal}
              page={scheduledPage}
              totalPages={scheduledTotalPages}
              onPageChange={setScheduledPage}
              onSelectEmail={(email) => setSelectedEmail(email)}
              onCancel={handleCancelScheduled}
              onOpenCompose={() => setIsComposeActive(true)}
            />
          ) : (
            <SentList
              emails={sentEmails}
              loading={sentLoading}
              total={sentTotal}
              page={sentPage}
              totalPages={sentTotalPages}
              onPageChange={setSentPage}
              onSelectEmail={(email) => setSelectedEmail(email)}
            />
          )}
        </div>
      </main>

      {/* Toast Notifications */}
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