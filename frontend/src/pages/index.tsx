import type { GetStaticProps, NextPage } from "next";
import Head from "next/head";
import { useEffect } from "react";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import { Toaster, toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { UploadZone } from "../components/UploadZone";
import { ProgressTracker } from "../components/ProgressTracker";
import { ResultsPanel } from "../components/ResultsPanel";
import { useLabAnalyzer } from "../hooks/useLabAnalyzer";
import type { Language } from "../../../shared/types";

const LANGS: Language[] = ["en", "fr", "ar", "vi"];

const Home: NextPage = () => {
  const { t } = useTranslation("common");
  const router = useRouter();
  const locale = (router.locale ?? "en") as Language;
  const { state, analyze, reset } = useLabAnalyzer();
  const isRTL = locale === "ar";

  const handleAnalyze = async (file: File, language: Language) => {
    if (language !== locale) {
      await router.push(router.pathname, router.asPath, { locale: language });
    }
    analyze(file, language);
  };

  useEffect(() => {
    if (state.phase === "error") {
      toast.error((state as any).message);
      reset();
    }
  }, [state.phase, (state as any).message, reset]);

  const handleError = (msg: string) => toast.error(msg);

  return (
    <>
      <Head>
        <title>{`${t("title")} — AI Lab Report Analyzer`}</title>
        <meta name="description" content={t("tagline")} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="mesh-bg min-h-screen" dir={isRTL ? "rtl" : "ltr"} lang={locale}>

        {/* Background Effects */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px] mix-blend-screen" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/20 blur-[120px] mix-blend-screen" />
        </div>

        {/* ── Header ── */}
        <header className="no-print sticky top-4 z-50 mx-4 md:mx-auto max-w-4xl border border-white/10 bg-black/40 backdrop-blur-2xl px-6 py-4 rounded-2xl shadow-xl shadow-black/20">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <span className="text-white text-xs font-bold tracking-tight">LA</span>
              </div>
              <span className="font-semibold text-white/90 text-sm tracking-tight">{t("title")}</span>
            </div>

            {/* Lang switcher */}
            <div className="flex items-center gap-1">
              {LANGS.map((lang) => (
                <button
                  key={lang}
                  onClick={() => router.push(router.pathname, router.asPath, { locale: lang })}
                  className={`lang-pill ${locale === lang ? "active" : ""}`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* ── Main ── */}
        <main className="max-w-4xl mx-auto px-4 py-14">
          <AnimatePresence mode="wait">
            {/* ── Idle ── */}
            {state.phase === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="space-y-12"
              >
                {/* Hero */}
                <div className="text-center space-y-6 pt-8 pb-4">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-2 shadow-[0_0_15px_rgba(99,102,241,0.15)] transition-all hover:bg-indigo-500/20">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
                    Powered by Qwen AI
                  </div>
                  <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-white via-indigo-100 to-indigo-400 leading-tight tracking-tight drop-shadow-sm pb-2">
                    {t("upload.heading")}
                  </h1>
                  <p className="text-white/50 text-lg sm:text-xl max-w-xl mx-auto leading-relaxed">
                    {t("tagline")}
                  </p>
                </div>

                {/* Upload */}
                <UploadZone onSubmit={handleAnalyze} isLoading={false} onError={handleError} />

                {/* Feature pills */}
                <div className="flex flex-wrap justify-center gap-4 pt-4">
                  {["🔒 Private & secure", "⚡ Results in ~30s", "🌍 4 languages", "📋 PDF export"].map((f) => (
                    <span key={f} className="px-4 py-2 glass-card hover:-translate-y-0.5 transition-transform rounded-full text-xs text-white/60 font-medium shadow-lg shadow-black/20 flex items-center cursor-default">
                      {f}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Uploading ── */}
            {state.phase === "uploading" && (
              <motion.div
                key="uploading"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center justify-center gap-6 py-24"
              >
                <div className="spinner animate-pulse-glow" />
                <p className="text-white/50 text-sm">{t("upload.analyzing")}</p>
              </motion.div>
            )}

            {/* ── Processing ── */}
            {state.phase === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="space-y-8"
              >
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-white/80">{t("upload.analyzing")}</h2>
                </div>
                <ProgressTracker
                  status={"extracting"}
                  progress={state.progress}
                  step={state.step}
                />
              </motion.div>
            )}

            {/* ── Done ── */}
            {state.phase === "done" && state.data.result && (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <ResultsPanel result={state.data.result} onReset={reset} language={locale} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <Toaster
        position={isRTL ? "top-left" : "top-right"}
        richColors
        theme="dark"
        toastOptions={{
          style: {
            background: "rgba(20,20,30,0.95)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#f0f0f5",
            backdropFilter: "blur(12px)",
          },
        }}
      />
    </>
  );
};

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? "en", ["common"])),
  },
});

export default Home;
