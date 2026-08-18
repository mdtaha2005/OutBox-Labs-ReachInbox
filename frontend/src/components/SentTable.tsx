import React from "react";
import { EmailRecord } from "../types";
import { CheckCircle2, XCircle, ExternalLink, Mail, Send, RefreshCw } from "lucide-react";

interface SentTableProps {
  emails: EmailRecord[];
  loading: boolean;
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}

export const SentTable: React.FC<SentTableProps> = ({
  emails,
  loading,
  total,
  page,
  totalPages,
  onPageChange,
}) => {
  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "-";
    const d = new Date(isoString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(d);
  };

  if (loading && emails.length === 0) {
    return (
      <div className="w-full rounded-2xl bg-gray-900/60 border border-gray-800 p-8 flex flex-col items-center justify-center min-h-[320px]">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
        <p className="text-sm text-gray-400">Loading sent records...</p>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="w-full rounded-2xl bg-gray-900/60 border border-gray-800 p-12 flex flex-col items-center justify-center text-center min-h-[340px]">
        <div className="w-14 h-14 rounded-2xl bg-gray-800/80 border border-gray-700 flex items-center justify-center mb-4 text-gray-400">
          <Send className="w-7 h-7" />
        </div>
        <h3 className="text-base font-semibold text-white mb-1">No sent emails yet</h3>
        <p className="text-sm text-gray-400 max-w-sm">
          Once your scheduled jobs execute, delivered emails and their Ethereal test preview links will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl bg-gray-900/80 border border-gray-800 overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-950/40 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <th className="py-3.5 px-5">Recipient</th>
              <th className="py-3.5 px-5">Subject</th>
              <th className="py-3.5 px-5">Sent At</th>
              <th className="py-3.5 px-5">Delivery Status</th>
              <th className="py-3.5 px-5 text-right">Ethereal Preview</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60 text-sm">
            {emails.map((email) => (
              <tr
                key={email.id}
                className="hover:bg-gray-800/40 transition-colors group"
              >
                <td className="py-3.5 px-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 group-hover:text-emerald-400 transition-colors">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-medium text-gray-200">{email.recipientEmail}</span>
                      {email.senderAccount && (
                        <div className="text-xs text-gray-500">
                          From: {email.senderAccount.email}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-5 text-gray-300 max-w-[280px] truncate">
                  {email.subject}
                </td>
                <td className="py-3.5 px-5 text-gray-400 text-xs">
                  {formatDate(email.sentAt || email.createdAt)}
                </td>
                <td className="py-3.5 px-5">
                  {email.status === "SENT" ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      Delivered
                    </span>
                  ) : (
                    <span
                      title={email.errorMessage || "Failed to send"}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    >
                      <XCircle className="w-3 h-3" />
                      Failed
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-5 text-right">
                  {email.etherealPreviewUrl ? (
                    <a
                      href={email.etherealPreviewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-gray-800 hover:bg-emerald-500/20 hover:text-emerald-300 text-gray-300 border border-gray-700 hover:border-emerald-500/40 transition-all"
                    >
                      <span>Preview Email</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-xs text-gray-600">N/A</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-800 text-xs text-gray-400 bg-gray-950/20">
          <span>
            Showing page {page} of {totalPages} ({total} total sent)
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};