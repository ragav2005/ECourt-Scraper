import type { Route } from "./+types/home";
import { Link } from "react-router";
import { iconPaths } from "~/ui";
const pageCls =
  "min-h-screen flex flex-col bg-gradient-to-b from-[#f8fbff] via-[#f5f8ff] to-[#eef3fa] dark:from-[#050b16] dark:via-[#060c18] dark:to-[#0a1628]";
const contentCls = "max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8";
const headingCls = "font-bold tracking-tight text-gray-900 dark:text-slate-100";
const bodyCls = "text-gray-600 dark:text-slate-300";
const captionCls = "text-gray-500 dark:text-slate-400 text-sm";
const btnBase =
  "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed";
const btnPrimary =
  "px-8 py-4 bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/30 dark:bg-blue-500 dark:hover:bg-blue-400";
const btnOutline =
  "px-8 py-4 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-500/10";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "eCourts Scraper - Professional Case Management Dashboard" },
    {
      name: "description",
      content:
        "Modern, efficient platform for searching and retrieving case information from Indian court databases with comprehensive analytics and reporting.",
    },
  ];
}

export default function Home() {
  const year = new Date().getFullYear();
  const IconComponent = ({
    iconKey,
    className,
  }: {
    iconKey: string;
    className: string;
  }) => {
    const path = iconPaths[iconKey as keyof typeof iconPaths];
    if (Array.isArray(path)) {
      return (
        <svg
          className={className}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {path.map((p, i) => (
            <path
              key={i}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={p}
            />
          ))}
        </svg>
      );
    }
    return (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={path}
        />
      </svg>
    );
  };

  return (
    <div className={pageCls}>
      <div className={`${contentCls} flex-grow flex flex-col py-0`}>
        {/* Hero Section */}
        <div className="flex-grow flex flex-col items-center justify-center text-center pb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl shadow-2xl mb-8">
            <IconComponent
              iconKey="database"
              className="w-12 h-12 text-white"
            />
          </div>

          <h1
            className={`${headingCls} text-5xl sm:text-6xl mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent`}
          >
            eCourts Scraper
          </h1>

          <p
            className={`${bodyCls} text-xl max-w-3xl mx-auto mb-12 leading-relaxed`}
          >
            Professional case management platform for Indian court databases.
            Streamline your legal research with intelligent search,
            comprehensive analytics, and robust reporting capabilities.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link
              to="/scraper"
              className={`${btnBase} ${btnPrimary} text-lg font-semibold min-w-[240px]`}
            >
              <IconComponent iconKey="search" className="w-6 h-6" />
              Start Case Search
            </Link>

            <Link
              to="/logs"
              className={`${btnBase} ${btnOutline} text-lg font-semibold min-w-[240px]`}
            >
              <IconComponent iconKey="chart" className="w-6 h-6" />
              View Analytics
            </Link>
          </div>
        </div>

        <footer className="mt-auto w-full">
          <div className="relative">
            <div className="h-px w-[75vw] max-w-screen-xl mx-auto bg-gradient-to-r from-transparent via-blue-500/40 to-transparent dark:via-blue-400/40" />
            <div className="px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
              <div>
                <p className={`${captionCls} text-gray-600 dark:text-gray-400`}>
                  eCourts Scraper. Built by{" "}
                  <a
                    href="https://github.com/ragav2005"
                    className="text-blue-700 dark:text-blue-300 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ragav
                  </a>
                </p>
              </div>
              <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-blue-700 dark:text-blue-300">
                <Link to="/scraper" className="hover:underline">
                  Search
                </Link>
                <Link to="/logs" className="hover:underline">
                  Analytics
                </Link>
                <a
                  href="https://github.com/ragav2005"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  GitHub
                </a>
              </nav>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
