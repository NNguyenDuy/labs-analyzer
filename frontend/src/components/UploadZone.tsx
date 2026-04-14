import React, { useCallback, useState } from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import { useTranslation } from "next-i18next";
import { Upload, FileText, X, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, validatePdf } from "../lib/utils";
import type { Language } from "../../../shared/types";

interface UploadZoneProps {
  onSubmit: (file: File, language: Language) => void;
  isLoading: boolean;
  onError?: (msg: string) => void;
}

const LANGUAGES: { code: Language; label: string }[] = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "ar", label: "العربية" },
  { code: "vi", label: "Tiếng Việt" },
];

export function UploadZone({ onSubmit, isLoading, onError }: UploadZoneProps) {
  const { t } = useTranslation("common");
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState<Language>("en");
  const [fileError, setFileError] = useState<string | null>(null);

  const onDrop = useCallback((accepted: File[], rejected: FileRejection[]) => {
    setFileError(null);
    if (rejected.length > 0) { setFileError("not_pdf"); return; }
    if (accepted[0]) {
      const err = validatePdf(accepted[0]);
      if (err) { setFileError(err); return; }
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
    <motion.form 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.4, delay: 0.1 }}
      onSubmit={handleSubmit} 
      className="w-full max-w-xl mx-auto space-y-6"
    >

      {/* Language selector */}
      <div className="glass-card p-5 space-y-4">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-[0.2em]">{t("upload.language_label")}</p>
        <div className="flex flex-wrap gap-2.5">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => setLanguage(lang.code)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all duration-300",
                language === lang.code
                  ? "bg-indigo-500 border-indigo-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] scale-105"
                  : "border-white/10 text-white/50 hover:text-white/90 hover:border-white/20 bg-white/5"
              )}
            >
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Drop zone */}
      {/* @ts-expect-error framer-motion and react-dropzone types conflict */}
      <motion.div
        {...getRootProps()}
        whileHover={{ scale: file ? 1 : 1.01 }}
        whileTap={{ scale: file ? 1 : 0.99 }}
        className={cn(
          "drop-zone transition-all duration-500",
          isDragActive && "active border-indigo-400 bg-indigo-500/10 shadow-[0_0_30px_rgba(99,102,241,0.15)]",
          isLoading && "opacity-40 cursor-not-allowed pointer-events-none",
          fileError && "error border-red-500/50 bg-red-500/5",
          !file && !isDragActive && "hover:border-indigo-500/40 hover:bg-white/5"
        )}
      >
        <input {...getInputProps()} />

        <AnimatePresence mode="wait">
          {file ? (
            <motion.div 
              key="file-selected"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-4 w-full"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 shadow-inner">
                <FileText className="w-6 h-6 text-indigo-400" />
              </div>
              <div className="text-left min-w-0 flex-1">
                <p className="text-sm font-semibold text-white/90 truncate">{file.name}</p>
                <p className="text-xs text-indigo-300/70 mt-1 font-medium">{(file.size / 1024).toFixed(0)} KB • Ready to analyze</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.15)" }}
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={clearFile}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white/90 transition-colors flex-shrink-0"
                aria-label="Remove file"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </motion.div>
          ) : (
            <motion.div 
              key="no-file"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              <motion.div 
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(99,102,241,0.1)]"
              >
                <Upload className="w-7 h-7 text-indigo-400" />
              </motion.div>
              <div className="space-y-1.5">
                <p className="text-base font-semibold text-white/90">
                  {isDragActive ? "Drop PDF to analyze!" : t("upload.drag")}
                </p>
                <p className="text-sm text-white/40">
                  {t("upload.or")}{" "}
                  <span className="text-indigo-400 font-medium hover:text-indigo-300 transition-colors cursor-pointer">{t("upload.browse")}</span>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* File error */}
      <AnimatePresence>
        {fileError && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 text-red-400 text-sm px-2 mt-2"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">{t(`errors.${fileError}`)}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit */}
      <motion.button
        whileHover={{ scale: file ? 1.02 : 1 }}
        whileTap={{ scale: file ? 0.98 : 1 }}
        type="submit"
        disabled={!file || isLoading}
        className="btn-accent w-full text-base font-semibold py-3.5 shadow-[0_0_20px_rgba(99,102,241,0.2)]"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2.5">
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {t("upload.analyzing")}
          </span>
        ) : t("upload.submit")}
      </motion.button>
    </motion.form>
  );
}
