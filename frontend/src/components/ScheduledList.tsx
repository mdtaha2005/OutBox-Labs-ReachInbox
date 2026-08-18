import React from "react";
import { EmailRecord } from "../types";
import { Clock, Star, Trash2, Calendar, RefreshCw } from "lucide-react";

interface ScheduledListProps {
  emails: EmailRecord[];
  loading: boolean;
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  onSelectEmail: (email: EmailRecord) => void;
  onCancel: (id: string) => void;
  onOpenCompose: () => void;
}

export const ScheduledList: React.FC<ScheduledListProps> = ({
  emails,
  loading,
  total,
  page,
  totalPages,
  onPageChange,
  onSelectEmail,
  onCancel,
  onOpenCompose,
}) => {
  // Format date to "Tue 9:15:12 AM" or similar matching Image 2
  const formatScheduledTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(d);
    } catch {
      return isoString;
    }
  };

  const getRecipientDisplayName = (email: string) => {
    const parts = email.split("@")[0].split(/[._-]/);
    return parts
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
      .join(" ");
  };

  if (loading && emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-gray-400 p-8">
        <RefreshCw className="w-6 h-6 text-[#00B04F] animate-spin mb-2" />
        <p className="text-xs">Loading scheduled queue...</p>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[360px] text-center p-8">
        <div className="w-12 h-12 rounded-full bg-[#EAF7EE] text-[#00B04F] flex items-center justify-center mb-3">
          <Calendar className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-gray-800 mb-1">No scheduled emails</h3>
        <p className="text-xs text-gray-500 max-w-sm mb-4">
          Your outreach queue is currently empty. Click compose to schedule emails.
        </p>
        <button
          type="button"
          onClick={onOpenCompose}
          className="px-4 py-2 rounded-full bg-[#00B04F] hover:bg-[#00933B] text-white text-xs font-semibold shadow-xs transition-all"
        >
          Compose Email
        </button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col justify-between min-h-[calc(100vh-80px)]">
      {/* Email List Items */}
      <div className="divide-y divide-gray-100">
        {emails.map((email) => {
          const recipientName = getRecipientDisplayName(email.recipientEmail);
          const sendTime = formatScheduledTime(email.actualScheduledAt || email.scheduledAt);
          const snippet = email.body.replace(/<[^>]*>?/gm, "").slice(0, 70);

          return (
            <div
              key={email.id}
              onClick={() => onSelectEmail(email)}
              className="flex items-center justify-between gap-4 py-3.5 px-6 hover:bg-[#F9FAFB] cursor-pointer transition-colors group select-none"
            >
              <div className="flex items-center gap-4 min-w-0 flex-1">
                {/* Recipient */}
                <div className="w-36 shrink-0 font-bold text-xs text-gray-900 truncate">
                  To: {recipientName}
                </div>

                {/* Orange / Peach Scheduled Timestamp Badge */}
                <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FFF3E0] text-[#E65100] border border-[#FFE0B2] text-[11px] font-medium">
                  <Clock className="w-3 h-3 text-[#E65100]" />
                  <span>{sendTime}</span>
                </div>

                {/* Subject & Snippet */}
                <div className="min-w-0 truncate text-xs">
                  <span className="font-bold text-gray-900">{email.subject}</span>
                  <span className="text-gray-400 font-normal ml-2">- {snippet}...</span>
                </div>
              </div>

              {/* Action Icons */}
              <div
                className="flex items-center gap-2 shrink-0 opacity-80 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => onCancel(email.id)}
                  title="Cancel Scheduled Job"
                  className="p-1 rounded-full text-gray-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Star"
                  className="p-1 rounded-full text-gray-300 hover:text-amber-400 transition-colors"
                >
                  <Star className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 text-xs text-gray-500 bg-white">
          <span>
            Page {page} of {totalPages} ({total} scheduled jobs)
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="px-3 py-1 rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium text-gray-700"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="px-3 py-1 rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium text-gray-700"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
