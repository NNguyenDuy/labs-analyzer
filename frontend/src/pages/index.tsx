// ============================================================
// Main Page — /pages/index.tsx
// Assembles: Header → Upload → Progress → Results
// ============================================================

import type { GetStaticProps, NextPage } from "next";
import Head from "next/head";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import { Toaster, toast } from "sonner";
import { UploadZone } from "../components/UploadZone";
import { ProgressTracker } from "../components/ProgressTracker";
import { ResultsPanel } from "../components/ResultsPanel";
import { useLabAnalyzer } from "../hooks/useLabAnalyzer";
import type { Language } from "../../../shared/types";

const Home: NextPage = () => {
  const { t } = useTranslation("common");
  const router = useRouter();
  const locale = (router.locale ?? "en") as Language;
  const { state, analyze, reset } = useLabAnalyzer();
  const isRTL = locale === "ar";

  const handleAnalyze = async (file: File, language: Language) => {
    // Switch UI locale to match selected language
    if (language !== locale) {
      await router.push(router.pathname, router.asPath, { locale: language });
    }
    analyze(file, language);
  };

  const handleError = (msg: string) => {
    toast.error(msg);
  };

  return (
    <>
      <Head>
        <title>{t("title")}</title>
        <meta name="description" content={t("tagline")} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div
        className="min-h-screen bg-white"
        dir={isRTL ? "rtl" : "ltr"}
        lang={locale}
      >
        {/* Header */}
        <header className="border-b border-gray-100 px-6 py-4 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gray-900 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">LA</span>
            </div>
            <span className="font-semibold text-gray-900 text-sm">{t("title")}</span>
          </div>

          {/* Language switcher in header */}
          <div className="flex items-center gap-1">
            {(["en", "fr", "ar", "vi"] as Language[]).map((lang) => (
              <button
                key={lang}
                onClick={() => router.push(router.pathname, router.asPath, { locale: lang })}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  locale === lang
                    ? "bg-gray-900 text-white"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        </header>

        <main className="px-4 py-12">

          {/* ── Idle: show upload ── */}
          {state.phase === "idle" && (
            <div className="space-y-8">
              <div className="text-center">
                <h1 className="text-2xl font-semibold text-gray-900">{t("upload.heading")}</h1>
                <p className="text-gray-500 text-sm mt-2">{t("tagline")}</p>
              </div>
              <UploadZone
                onSubmit={handleAnalyze}
                isLoading={false}
              />
            </div>
          )}

          {/* ── Uploading ── */}
          {state.phase === "uploading" && (
            <div className="text-center space-y-4">
              <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-gray-600">{t("upload.analyzing")}</p>
            </div>
          )}

          {/* ── Processing ── */}
          {state.phase === "processing" && (
            <div className="space-y-8">
              <div className="text-center">
                <h1 className="text-xl font-semibold text-gray-900">{t("upload.analyzing")}</h1>
              </div>
              <ProgressTracker
                status={state.status as any ?? "extracting"}
                progress={state.progress}
                step={state.step}
              />
            </div>
          )}

          {/* ── Error ── */}
          {state.phase === "error" && (
            <div className="max-w-xl mx-auto text-center space-y-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-red-600 text-xl">!</span>
              </div>
              <p className="text-sm text-red-700">{state.message}</p>
              <button
                onClick={reset}
                className="text-sm text-gray-600 underline hover:text-gray-900"
              >
                {t("results.new_report")}
              </button>
            </div>
          )}

          {/* ── Done: show results ── */}
          {state.phase === "done" && state.data.result && (
            <ResultsPanel
              result={state.data.result}
              onReset={reset}
              language={locale}
            />
          )}
        </main>
      </div>

      <Toaster position={isRTL ? "top-left" : "top-right"} richColors />
    </>
  );
};

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? "en", ["common"])),
  },
});

export default Home;
