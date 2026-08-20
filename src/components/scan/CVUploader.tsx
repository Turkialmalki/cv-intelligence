"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  FileText,
  Lock,
  Type,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";

import { UPLOAD_LIMITS } from "@/lib/analysis/config";
import { useLocale } from "@/lib/i18n/context";

export interface UploadPayload {
  file: File | null;
  pastedText: string;
  name: string;
  email: string;
  targetRole: string;
  jobDescription: string;
}

interface CVUploaderProps {
  onSubmit: (payload: UploadPayload) => void;
  submitting: boolean;
  serverError: string | null;
}

const ACCEPT = UPLOAD_LIMITS.allowedExtensions.join(",");

export function CVUploader({
  onSubmit,
  submitting,
  serverError,
}: CVUploaderProps) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldId = useId();

  const [mode, setMode] = useState<"file" | "paste">("file");
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [dragging, setDragging] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  /** Client-side validation mirrors the server's; the server still re-checks. */
  const acceptFile = useCallback(
    (candidate: File): void => {
      const extension = candidate.name
        .slice(candidate.name.lastIndexOf("."))
        .toLowerCase();
      const allowed = UPLOAD_LIMITS.allowedExtensions as readonly string[];

      if (!allowed.includes(extension)) {
        setError(t.upload.errors.wrongType);
        return;
      }
      if (candidate.size > UPLOAD_LIMITS.maxBytes) {
        setError(t.upload.errors.tooLarge);
        return;
      }
      setError(null);
      setFile(candidate);
    },
    [t],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragging(false);
      const dropped = event.dataTransfer.files?.[0];
      if (dropped) acceptFile(dropped);
    },
    [acceptFile],
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    if (!name.trim()) {
      setError(t.upload.errors.nameRequired);
      return;
    }
    if (!email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setError(t.upload.errors.emailRequired);
      return;
    }
    if (mode === "file" && !file) {
      setError(t.upload.errors.noFile);
      return;
    }
    if (mode === "paste" && pastedText.trim().length < 120) {
      setError(t.upload.errors.noFile);
      return;
    }

    setError(null);
    onSubmit({
      file: mode === "file" ? file : null,
      pastedText: mode === "paste" ? pastedText : "",
      name: name.trim(),
      email: email.trim(),
      targetRole: targetRole.trim(),
      jobDescription: jobDescription.trim(),
    });
  };

  const visibleError = error ?? serverError;

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* ------------------------------------------------------------------ */}
      {/* Document                                                           */}
      {/* ------------------------------------------------------------------ */}
      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-semibold text-ink-900">
            {t.upload.title}
          </h2>
          <button
            type="button"
            onClick={() => {
              setMode(mode === "file" ? "paste" : "file");
              setError(null);
            }}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold text-accent-700 transition-colors hover:bg-accent-50"
          >
            <Type className="h-3.5 w-3.5" aria-hidden="true" />
            {mode === "file" ? t.upload.pasteToggle : t.upload.uploadToggle}
          </button>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {mode === "file" ? (
            <motion.div
              key="file"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              {file ? (
                <div className="flex items-center gap-3 rounded-2xl border border-ink-200 bg-white p-4 shadow-card">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-50 text-accent-700">
                    <FileText className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold text-ink-900">
                      {file.name}
                    </div>
                    <div className="num text-[12px] text-ink-500">
                      {(file.size / 1024).toFixed(0)} KB
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      if (inputRef.current) inputRef.current.value = "";
                    }}
                    aria-label={t.upload.remove}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-ink-50 hover:text-ink-900"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => inputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      inputRef.current?.click();
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-11 text-center transition-all duration-200 ${
                    dragging
                      ? "border-accent-500 bg-accent-50/60"
                      : "border-ink-200 bg-ink-50/40 hover:border-ink-300 hover:bg-ink-50"
                  }`}
                >
                  <motion.span
                    animate={{ y: dragging ? -3 : 0 }}
                    className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-ink-700 shadow-card"
                  >
                    <Upload className="h-5 w-5" aria-hidden="true" />
                  </motion.span>
                  <div className="mt-4 text-[15px] font-semibold text-ink-900">
                    {dragging ? t.upload.dropzoneActive : t.upload.dropzone}
                  </div>
                  <div className="mt-1.5 text-[13px] text-ink-500">
                    {t.upload.dropzoneHint}
                  </div>
                </div>
              )}
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                className="sr-only"
                onChange={(e) => {
                  const chosen = e.target.files?.[0];
                  if (chosen) acceptFile(chosen);
                }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="paste"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={t.upload.pastePlaceholder}
                rows={10}
                className="field resize-y font-mono text-[13px] leading-relaxed"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Identity — required so the report can be emailed and revisited     */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`${fieldId}-name`}
            className="mb-1.5 block text-[13px] font-semibold text-ink-800"
          >
            {t.upload.nameLabel}
          </label>
          <input
            id={`${fieldId}-name`}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.upload.namePlaceholder}
            autoComplete="name"
            className="field"
          />
        </div>
        <div>
          <label
            htmlFor={`${fieldId}-email`}
            className="mb-1.5 block text-[13px] font-semibold text-ink-800"
          >
            {t.upload.emailLabel}
          </label>
          <input
            id={`${fieldId}-email`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.upload.emailPlaceholder}
            autoComplete="email"
            dir="ltr"
            className="field"
          />
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Optional targeting                                                 */}
      {/* ------------------------------------------------------------------ */}
      <div className="card-quiet space-y-4 p-5">
        <div>
          <label
            htmlFor={`${fieldId}-role`}
            className="mb-1.5 block text-[13px] font-semibold text-ink-800"
          >
            {t.upload.targetRoleLabel}{" "}
            <span className="font-normal text-ink-400">
              · {t.upload.jobDescriptionOptional}
            </span>
          </label>
          <input
            id={`${fieldId}-role`}
            type="text"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder={t.upload.targetRolePlaceholder}
            className="field"
          />
        </div>

        <div>
          <label
            htmlFor={`${fieldId}-jd`}
            className="mb-1.5 block text-[13px] font-semibold text-ink-800"
          >
            {t.upload.jobDescriptionLabel}{" "}
            <span className="font-normal text-ink-400">
              · {t.upload.jobDescriptionOptional}
            </span>
          </label>
          <textarea
            id={`${fieldId}-jd`}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder={t.upload.jobDescriptionPlaceholder}
            rows={4}
            className="field resize-y text-[14px]"
          />
          <p className="mt-2 text-[12px] leading-relaxed text-ink-500">
            {t.upload.jobDescriptionHint}
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Errors, privacy, submit                                            */}
      {/* ------------------------------------------------------------------ */}
      <AnimatePresence>
        {visibleError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-signal-critical/25 bg-signal-critical/[0.04] p-3.5"
          >
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-signal-critical"
              aria-hidden="true"
            />
            <span className="text-[13px] leading-relaxed text-ink-800">
              {visibleError}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-start gap-2 text-[12px] leading-relaxed text-ink-500">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" aria-hidden="true" />
        <span>
          {t.upload.privacyNotice} {t.upload.emailHint}
        </span>
      </div>

      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? t.upload.submitting : t.upload.submit}
      </button>
    </form>
  );
}
