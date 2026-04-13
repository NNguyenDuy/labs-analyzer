// ============================================================
// UploadZone Component
// Drag & drop PDF upload với validation và language selector
// ============================================================

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useTranslation } from "next-i18next";
import { Upload, FileText, X, AlertCircle } from "lucide-react";
import { cn, validatePdf } from "../lib/utils";
import type { Language } from "../../../shared/types";

interface UploadZoneProps {
  onSubmit: (file: File, language: Language) => void;
  isLoading: boolean;
}

const LANGUAGES: { code: Language; flag: string }[] = [
  { code: "en", flag: "🇬🇧" },
  { code: "fr", flag: "🇫🇷" },
  { code: "ar", flag: "🇸🇦" },
  { code: "vi", flag: "🇻🇳" },
];

export function UploadZone({ onSubmit, isLoading }: UploadZoneProps) {
  const { t, i18n } = useTranslation("common");
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState<Language>("en");
  const [fileError, setFileError] = useState<string | null>(null);

  const onDrop = useCallback((accepted: File[], rejected: File[]) => {
    setFileError(null);
    if (rejected.length > 0) {
      setFileError("not_pdf");
      return;
    }
    if (accepted[0]) {
      const err = validatePdf(accepted[0]);
      if (err) {
        setFileError(err);
        return;
      }
      setFile(accepted[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    disabled: isLoading,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || isLoading) return;
    onSubmit(file, language);
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    setFileError(null);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl mx-auto space-y-4">

      {/* Language selector */}
      <div className="flex items-center gap-2 justify-center flex-wrap">
        <span className="text-sm text-gray-500">{t("upload.language_label")}:</span>
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            type="button"
            onClick={() => setLanguage(lang.code)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
              language === lang.code
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            )}
          >
            {lang.flag} {t(`languages.${lang.code}`)}
          </button>
        ))}
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          "relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all",
          isDragActive
            ? "border-gray-900 bg-gray-50"
            : "border-gray-200 hover:border-gray-400 hover:bg-gray-50/50",
          isLoading && "opacity-50 cursor-not-allowed",
          fileError && "border-red-300 bg-red-50"
        )}
      >
        <input {...getInputProps()} />

        {file ? (
          /* File selected state */
          <div className="flex items-center justify-center gap-3">
            <FileText className="w-8 h-8 text-gray-600" />
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900 truncate max-w-xs">{file.name}</p>
              <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
            <button
              type="button"
              onClick={clearFile}
              className="ml-2 text-gray-400 hover:text-gray-600"
              aria-label="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* Empty state */
          <div className="space-y-3">
            <Upload className="w-10 h-10 text-gray-300 mx-auto" />
            <div>
              <p className="text-sm font-medium text-gray-700">
                {isDragActive ? "Drop it here!" : t("upload.drag")}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {t("upload.or")} <span className="text-gray-700 underline">{t("upload.browse")}</span>
              </p>
            </div>
            <p className="text-xs text-gray-400">{t("upload.hint")}</p>
          </div>
        )}
      </div>

      {/* File error */}
      {fileError && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{t(`errors.${fileError}`)}</span>
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={!file || isLoading}
        className={cn(
          "w-full py-3 px-6 rounded-xl font-medium text-sm transition-all",
          !file || isLoading
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-gray-900 text-white hover:bg-gray-700 active:scale-95"
        )}
      >
        {isLoading ? t("upload.analyzing") : t("upload.submit")}
      </button>
    </form>
  );
}
