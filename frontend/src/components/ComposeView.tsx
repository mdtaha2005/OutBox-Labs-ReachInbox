import React, { useState, useRef } from "react";
import {
  ArrowLeft,
  Paperclip,
  Clock,
  Calendar,
  CheckCircle,
  AlertCircle,
  Undo2,
  Redo2,
  Type,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  List,
  Quote,
  Image as ImageIcon,
  Strikethrough,
} from "lucide-react";
import { SenderAccount } from "../types";
import { emailApi } from "../services/api";

interface ComposeViewProps {
  onClose: () => void;
  senders: SenderAccount[];
  onScheduledSuccess: (message: string) => void;
}

export const ComposeView: React.FC<ComposeViewProps> = ({
  onClose,
  senders,
  onScheduledSuccess,
}) => {
  const [selectedSenderId, setSelectedSenderId] = useState<string>(
    senders.find((s) => s.isDefault)?.id || senders[0]?.id || ""
  );
  const [toInput, setToInput] = useState("");
  const [parsedLeads, setParsedLeads] = useState<string[]>([]);
  const [invalidCount, setInvalidCount] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [delaySeconds, setDelaySeconds] = useState<number>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number>(200);

  // Send Later Popover state
  const [isSendLaterOpen, setIsSendLaterOpen] = useState(false);
  const [scheduledStartTime, setScheduledStartTime] = useState<string>(
    new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [isScheduled, setIsScheduled] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    setError(null);
    setFileName(file.name);
    try {
      const res = await emailApi.parseCsv(file);
      setParsedLeads(res.validLeads);
      setInvalidCount(res.invalidCount);
      if (res.validLeads.length > 0 && !toInput) {
        setToInput(`${res.validLeads.length} leads loaded from ${file.name}`);
      }
    } catch (err: any) {
      setError("Failed to parse file: " + (err.response?.data?.error || err.message));
    }
  };

  const handleToInputChange = async (val: string) => {
    setToInput(val);
    setFileName(null);
    if (!val.trim()) {
      setParsedLeads([]);
      setInvalidCount(0);
      return;
    }

    try {
      const res = await emailApi.parseCsv(val);
      setParsedLeads(res.validLeads);
      setInvalidCount(res.invalidCount);
    } catch {
      // Ignore intermediate parsing errors
    }
  };

  const handleApplyPresetTime = (hoursFromNow: number) => {
    const target = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
    setScheduledStartTime(target.toISOString().slice(0, 16));
    setIsScheduled(true);
    setIsSendLaterOpen(false);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (!subject.trim()) {
      setError("Please provide an email subject.");
      return;
    }
    if (!body.trim()) {
      setError("Please provide email body content.");
      return;
    }
    if (parsedLeads.length === 0) {
      setError("Please enter or upload at least one valid recipient email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const scheduledDate = isScheduled
        ? new Date(scheduledStartTime).toISOString()
        : new Date().toISOString();

      const res = await emailApi.schedule({
        senderAccountId: selectedSenderId || undefined,
        subject,
        body,
        leads: parsedLeads,
        scheduledStartTime: scheduledDate,
        delaySeconds,
        hourlyLimit,
      });

      onScheduledSuccess(res.message || `Scheduled ${parsedLeads.length} emails successfully.`);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to schedule campaign");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-white flex flex-col font-sans relative">
      {/* Top Header Bar (Matching Image 5) */}
      <div className="w-full flex items-center justify-between py-3 px-6 border-b border-gray-100 sticky top-0 bg-white z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-sm font-bold text-gray-900">Compose New Email</h2>
        </div>

        {/* Header Action Icons & Send Button */}
        <div className="flex items-center gap-4">
          {/* File Upload Attachment Icon */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Upload CSV / TXT leads"
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Schedule / Clock Icon (Toggles Send Later Popover) */}
          <button
            type="button"
            onClick={() => setIsSendLaterOpen(!isSendLaterOpen)}
            title="Schedule Send Later"
            className={`p-1.5 rounded-full transition-colors ${
              isScheduled
                ? "text-[#00B04F] bg-[#EAF7EE]"
                : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            }`}
          >
            <Clock className="w-4 h-4" />
          </button>

          {/* Send / Schedule Button (Green outline pill matching Image 5) */}
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSubmitting || parsedLeads.length === 0}
            className="py-1 px-5 rounded-full border-2 border-[#00B04F] text-[#00B04F] hover:bg-[#00B04F] hover:text-white font-semibold text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-3 h-3 border-2 border-[#00B04F] border-t-transparent rounded-full animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <span>{isScheduled ? "Schedule" : "Send"}</span>
            )}
          </button>
        </div>
      </div>

      {/* Main Compose Form Container */}
      <div className="max-w-4xl w-full mx-auto px-8 py-5 space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* From Field */}
        <div className="flex items-center gap-4 text-xs">
          <span className="w-12 text-gray-400 font-medium shrink-0">From</span>
          <select
            value={selectedSenderId}
            onChange={(e) => setSelectedSenderId(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#F4F5F7] border border-transparent text-gray-800 text-xs focus:outline-none focus:bg-white focus:border-gray-200 cursor-pointer"
          >
            {senders.map((s) => (
              <option key={s.id} value={s.id}>
                {s.email} {s.isDefault ? "(Default)" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* To Field */}
        <div className="flex items-center gap-4 text-xs border-b border-gray-100 pb-3">
          <span className="w-12 text-gray-400 font-medium shrink-0">To</span>
          <div className="flex-1 flex items-center justify-between gap-2">
            <input
              type="text"
              value={toInput}
              onChange={(e) => handleToInputChange(e.target.value)}
              placeholder="recipient@example.com (or paste multiple comma-separated leads)"
              className="w-full text-xs text-gray-900 placeholder-gray-400 focus:outline-none bg-transparent"
            />
            {parsedLeads.length > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-[#00B04F] bg-[#EAF7EE] px-2.5 py-0.5 rounded-full shrink-0">
                <CheckCircle className="w-3 h-3" />
                {parsedLeads.length} lead{parsedLeads.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>

        {/* Subject Field */}
        <div className="flex items-center gap-4 text-xs border-b border-gray-100 pb-3">
          <span className="w-12 text-gray-400 font-medium shrink-0">Subject</span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="w-full text-xs text-gray-900 placeholder-gray-400 focus:outline-none bg-transparent"
          />
        </div>

        {/* Delay & Hourly Limit Inline Controls (Matching Image 5) */}
        <div className="flex items-center gap-8 text-xs py-1">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Delay between 2 emails</span>
            <input
              type="number"
              min="1"
              max="60"
              value={delaySeconds}
              onChange={(e) => setDelaySeconds(parseInt(e.target.value, 10) || 2)}
              className="w-12 px-2 py-1 text-center text-xs font-semibold rounded-lg bg-[#F4F5F7] border border-gray-200 text-gray-800 focus:outline-none focus:bg-white"
            />
            <span className="text-[11px] text-gray-400">sec</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-400">Hourly Limit</span>
            <input
              type="number"
              min="1"
              max="5000"
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10) || 200)}
              className="w-14 px-2 py-1 text-center text-xs font-semibold rounded-lg bg-[#F4F5F7] border border-gray-200 text-gray-800 focus:outline-none focus:bg-white"
            />
            <span className="text-[11px] text-gray-400">emails/hr</span>
          </div>
        </div>

        {/* Rich Text Formatting Toolbar (Matching Image 5) */}
        <div className="bg-[#F9FAFB] rounded-xl p-1.5 flex flex-wrap items-center gap-1 text-gray-400 border border-gray-100">
          <button type="button" title="Undo" className="p-1.5 rounded hover:bg-gray-200/60 hover:text-gray-700">
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button type="button" title="Redo" className="p-1.5 rounded hover:bg-gray-200/60 hover:text-gray-700">
            <Redo2 className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-gray-200 mx-1" />
          <button type="button" title="Font Size" className="p-1.5 rounded hover:bg-gray-200/60 hover:text-gray-700">
            <Type className="w-3.5 h-3.5" />
          </button>
          <button type="button" title="Bold" className="p-1.5 rounded hover:bg-gray-200/60 hover:text-gray-700">
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button type="button" title="Italic" className="p-1.5 rounded hover:bg-gray-200/60 hover:text-gray-700">
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button type="button" title="Underline" className="p-1.5 rounded hover:bg-gray-200/60 hover:text-gray-700">
            <Underline className="w-3.5 h-3.5" />
          </button>
          <button type="button" title="Strikethrough" className="p-1.5 rounded hover:bg-gray-200/60 hover:text-gray-700">
            <Strikethrough className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-gray-200 mx-1" />
          <button type="button" title="Align" className="p-1.5 rounded hover:bg-gray-200/60 hover:text-gray-700">
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button type="button" title="List" className="p-1.5 rounded hover:bg-gray-200/60 hover:text-gray-700">
            <List className="w-3.5 h-3.5" />
          </button>
          <button type="button" title="Quote" className="p-1.5 rounded hover:bg-gray-200/60 hover:text-gray-700">
            <Quote className="w-3.5 h-3.5" />
          </button>
          <button type="button" title="Insert Image" className="p-1.5 rounded hover:bg-gray-200/60 hover:text-gray-700">
            <ImageIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Text Writing Area */}
        <textarea
          rows={12}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type Your Reply..."
          className="w-full text-xs text-gray-900 placeholder-gray-400 focus:outline-none resize-none leading-relaxed"
        />
      </div>

      {/* Floating "Send Later" Popover Card (Matching Image 5 Popover) */}
      {isSendLaterOpen && (
        <div className="absolute top-14 right-8 w-72 bg-white border border-gray-200 rounded-2xl shadow-xl p-4 z-30 animate-in fade-in zoom-in-95 duration-150">
          <h4 className="text-xs font-bold text-gray-900 mb-3">Send Later</h4>

          {/* Date Picker Input */}
          <div className="relative mb-3">
            <input
              type="datetime-local"
              value={scheduledStartTime}
              onChange={(e) => {
                setScheduledStartTime(e.target.value);
                setIsScheduled(true);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl bg-[#F4F5F7] border border-gray-200 text-gray-900 focus:outline-none focus:bg-white"
            />
          </div>

          {/* Quick Preset Options */}
          <div className="space-y-1 text-xs text-gray-700 border-t border-gray-100 pt-2 mb-4">
            <button
              type="button"
              onClick={() => handleApplyPresetTime(24)}
              className="w-full text-left py-1.5 px-2 hover:bg-gray-50 rounded-lg text-gray-600 hover:text-gray-900"
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => handleApplyPresetTime(18)}
              className="w-full text-left py-1.5 px-2 hover:bg-gray-50 rounded-lg text-gray-600 hover:text-gray-900"
            >
              Tomorrow, 10:00 AM
            </button>
            <button
              type="button"
              onClick={() => handleApplyPresetTime(19)}
              className="w-full text-left py-1.5 px-2 hover:bg-gray-50 rounded-lg text-gray-600 hover:text-gray-900"
            >
              Tomorrow, 11:00 AM
            </button>
            <button
              type="button"
              onClick={() => handleApplyPresetTime(23)}
              className="w-full text-left py-1.5 px-2 hover:bg-gray-50 rounded-lg text-gray-600 hover:text-gray-900"
            >
              Tomorrow, 3:00 PM
            </button>
          </div>

          {/* Popover Footer */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100 text-xs">
            <button
              type="button"
              onClick={() => {
                setIsScheduled(false);
                setIsSendLaterOpen(false);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setIsScheduled(true);
                setIsSendLaterOpen(false);
              }}
              className="px-4 py-1 rounded-full border border-[#00B04F] text-[#00B04F] hover:bg-[#00B04F] hover:text-white font-semibold transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
