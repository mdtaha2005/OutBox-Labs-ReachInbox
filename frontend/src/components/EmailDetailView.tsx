import React from "react";
import { EmailRecord, User } from "../types";
import { ArrowLeft, Star, Archive, Trash2, ExternalLink } from "lucide-react";

interface EmailDetailViewProps {
  email: EmailRecord;
  currentUser: User;
  onBack: () => void;
  onDelete?: (id: string) => void;
}

export const EmailDetailView: React.FC<EmailDetailViewProps> = ({
  email,
  currentUser,
  onBack,
  onDelete,
}) => {
  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "-";
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(d);
    } catch {
      return isoString;
    }
  };

  const senderEmail = email.senderAccount?.email || "outreach@ethereal.email";
  const senderDisplayName = email.senderAccount?.displayName || email.senderAccount?.email?.split("@")[0] || "Outreach Lead";
  const senderInitial = senderDisplayName.charAt(0).toUpperCase();

  return (
    <div className="w-full bg-white flex flex-col min-h-screen">
      {/* Top Action Bar (Matching Image 4) */}
      <div className="w-full flex items-center justify-between py-3.5 px-6 border-b border-gray-100 sticky top-0 bg-white z-10">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-1 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-sm font-bold text-gray-900 truncate">
            {email.subject}
          </h2>
        </div>

        <div className="flex items-center gap-2 text-gray-400">
          <button type="button" title="Star" className="p-1.5 rounded-full hover:text-amber-400 hover:bg-gray-100">
            <Star className="w-4 h-4" />
          </button>
          <button type="button" title="Archive" className="p-1.5 rounded-full hover:text-gray-700 hover:bg-gray-100">
            <Archive className="w-4 h-4" />
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(email.id)}
              title="Delete / Cancel"
              className="p-1.5 rounded-full hover:text-rose-600 hover:bg-rose-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <img
            src={
              currentUser.avatarUrl ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser.name)}`
            }
            alt={currentUser.name}
            className="w-7 h-7 rounded-full ml-2 object-cover border border-gray-200"
          />
        </div>
      </div>

      {/* Email Body Container */}
      <div className="max-w-4xl w-full mx-auto px-8 py-6 space-y-6">
        {/* Sender Info Row */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-[#00B04F] text-white flex items-center justify-center font-bold text-sm shrink-0">
              {senderInitial}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-gray-900">{senderDisplayName}</span>
                <span className="text-xs text-gray-400">&lt;{senderEmail}&gt;</span>
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5">
                to {email.recipientEmail}
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-400">
            {formatDate(email.sentAt || email.actualScheduledAt || email.scheduledAt)}
          </div>
        </div>

        {/* Rendered Email Content */}
        <div className="text-xs text-gray-800 leading-relaxed space-y-4 pt-2 whitespace-pre-line border-t border-gray-50">
          {email.body}
        </div>

        {/* Ethereal Test Server Preview Banner */}
        {email.etherealPreviewUrl && (
          <div className="p-4 rounded-xl bg-[#EAF7EE] border border-[#C8E6C9] flex items-center justify-between mt-6">
            <div>
              <div className="font-bold text-xs text-[#1B5E20]">Ethereal Fake SMTP Verification</div>
              <div className="text-[11px] text-[#2E7D32]">Delivered and captured on Ethereal test inbox</div>
            </div>
            <a
              href={email.etherealPreviewUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00B04F] hover:bg-[#00933B] text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <span>Preview in Ethereal</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
