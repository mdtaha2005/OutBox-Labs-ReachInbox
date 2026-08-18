import React, { useState, useRef } from "react";
import { X, Upload, Clock, Send, AlertCircle, FileText, CheckCircle } from "lucide-react";
import { SenderAccount } from "../types";
import { emailApi } from "../services/api";

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  senders: SenderAccount[];
  onScheduledSuccess: (message: string) => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  senders,
  onScheduledSuccess,
}) => {
  const [selectedSenderId, setSelectedSenderId] = useState<string>(
    senders.find((s) => s.isDefault)?.id || senders[0]?.id || ""
  );
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [leadsInput, setLeadsInput] = useState("");
  const [parsedLeads, setParsedLeads] = useState<string[]>([]);
  const [invalidCount, setInvalidCount] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);

  // Scheduling timing
  const [startTimeType, setStartTimeType] = useState<"now" | "custom">("now");
  const [customStartTime, setCustomStartTime] = useState<string>(
    new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [delaySeconds, setDelaySeconds] = useState<number>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number>(200);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (file: File) => {
    setError(null);
    setFileName(file.name);
    try {
      const res = await emailApi.parseCsv(file);
      setParsedLeads(res.validLeads);
      setInvalidCount(res.invalidCount);
    } catch (err: any) {
      setError("Failed to parse file: " + (err.response?.data?.error || err.message));
    }
  };

  const handleManualTextChange = async (text: string) => {
    setLeadsInput(text);
    setFileName(null);
    if (!text.trim()) {
      setParsedLeads([]);
      setInvalidCount(0);
      return;
    }

    try {
      const res = await emailApi.parseCsv(text);
      setParsedLeads(res.validLeads);
      setInvalidCount(res.invalidCount);
    } catch {
      // Ignore interim parsing errors
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setError("Please upload or enter at least one valid lead email address.");
      return;
    }

    const scheduledDate =
      startTimeType === "now" ? new Date().toISOString() : new Date(customStartTime).toISOString();

    setIsSubmitting(true);
    try {
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
      setError(err.response?.data?.error || err.message || "Failed to schedule email campaign");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-2xl bg-[#111827] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Send className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-white">Compose New Email Campaign</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(85vh-120px)]">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Sender Account */}
          {senders.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                From Sender Account
              </label>
              <select
                value={selectedSenderId}
                onChange={(e) => setSelectedSenderId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-900/90 border border-gray-800 text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
              >
                {senders.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.displayName || s.email} ({s.email}) {s.isDefault ? "★ Default" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Email Subject
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Scaling outreach with AI workflows at ReachInbox"
              className="w-full px-3.5 py-2.5 rounded-xl bg-gray-900/90 border border-gray-800 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Email Body
            </label>
            <textarea
              required
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Hi there,&#10;&#10;I wanted to reach out regarding how ReachInbox can streamline your sales pipeline..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-gray-900/90 border border-gray-800 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
            />
          </div>

          {/* Leads CSV Upload / Text input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Recipient Leads (CSV or Text)
              </label>
              {parsedLeads.length > 0 && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {parsedLeads.length} valid email{parsedLeads.length === 1 ? "" : "s"} detected
                </span>
              )}
            </div>

            {/* Drag & Drop File Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              className="border-2 border-dashed border-gray-700 hover:border-emerald-500/50 rounded-xl p-4 text-center cursor-pointer bg-gray-900/40 hover:bg-gray-900/70 transition-all"
            >
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
              <div className="flex flex-col items-center justify-center gap-1.5">
                {fileName ? (
                  <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                    <FileText className="w-4 h-4" />
                    <span>{fileName}</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-gray-400 mb-1" />
                    <p className="text-xs text-gray-300">
                      <span className="text-emerald-400 font-semibold">Click to upload</span> or drag and drop CSV / TXT
                    </p>
                  </>
                )}
                <p className="text-[11px] text-gray-500">Supports comma, newline, or header-formatted email lists</p>
              </div>
            </div>

            {/* Manual paste fallback */}
            <div className="mt-2">
              <input
                type="text"
                value={leadsInput}
                onChange={(e) => handleManualTextChange(e.target.value)}
                placeholder="Or type/paste emails separated by commas (e.g. lead1@acme.com, lead2@corp.io)"
                className="w-full px-3 py-2 text-xs rounded-lg bg-gray-900/60 border border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            {invalidCount > 0 && (
              <p className="text-xs text-amber-400 mt-1.5">
                ⚠️ Ignored {invalidCount} invalid or malformed email address entries.
              </p>
            )}
          </div>

          {/* Schedule Timing & Rate Limiting Controls */}
          <div className="p-4 rounded-xl bg-gray-900/80 border border-gray-800 space-y-4">
            <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              Scheduling & Provider Throttling
            </h4>

            {/* Start Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Start Sending</label>
                <div className="flex rounded-lg overflow-hidden border border-gray-700 bg-gray-800 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setStartTimeType("now")}
                    className={`flex-1 py-1.5 rounded-md font-medium transition-all ${
                      startTimeType === "now" ? "bg-emerald-500 text-white" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Immediate
                  </button>
                  <button
                    type="button"
                    onClick={() => setStartTimeType("custom")}
                    className={`flex-1 py-1.5 rounded-md font-medium transition-all ${
                      startTimeType === "custom" ? "bg-emerald-500 text-white" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Scheduled
                  </button>
                </div>
              </div>

              {startTimeType === "custom" && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Target Date & Time</label>
                  <input
                    type="datetime-local"
                    value={customStartTime}
                    onChange={(e) => setCustomStartTime(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              )}
            </div>

            {/* Delay & Hourly Limit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Delay Between Sends (seconds)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={delaySeconds}
                    onChange={(e) => setDelaySeconds(parseInt(e.target.value, 10) || 2)}
                    className="w-20 px-3 py-1.5 text-sm rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-emerald-500/50"
                  />
                  <span className="text-xs text-gray-400">Min 2s recommended</span>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Hourly Rate Limit (emails/hour)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="5000"
                    value={hourlyLimit}
                    onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10) || 200)}
                    className="w-24 px-3 py-1.5 text-sm rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-emerald-500/50"
                  />
                  <span className="text-xs text-gray-400">Max limit per window</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || parsedLeads.length === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-sm font-semibold shadow-lg shadow-emerald-950/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Enqueuing {parsedLeads.length} Jobs...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Schedule {parsedLeads.length > 0 ? `${parsedLeads.length} Emails` : "Campaign"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};