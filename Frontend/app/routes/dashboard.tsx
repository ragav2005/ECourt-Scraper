import type { Route } from "./+types/dashboard";
import { Link } from "react-router";
const pageCls =
  "min-h-screen flex flex-col bg-gradient-to-b from-[#f8fbff] via-[#f5f8ff] to-[#eef3fa] dark:from-[#050b16] dark:via-[#060c18] dark:to-[#0a1628]";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Dashboard - eCourts Scraper" },
    {
      name: "description",
      content: "eCourts scraper dashboard with quick access to all features.",
    },
  ];
}

export default function Dashboard() {
  const year = new Date().getFullYear();
  return (
    <div className={pageCls}>
      <div className="max-w-7xl flex-grow mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            eCourts Scraper Dashboard
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Efficiently search and retrieve case information from Indian court
            databases with comprehensive logging and analytics.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Link
            to="/logs"
            className="group bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200"
          >
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                View Query Logs & Statistics
              </h3>
            </div>
            <p className="text-gray-600">
              Monitor all search queries, success rates, and detailed analytics
              with comprehensive logging.
            </p>
            <div className="mt-4 text-blue-600 font-medium group-hover:text-blue-700">
              View Logs & Stats →
            </div>
          </Link>

          <Link
            to="/scraper"
            className="group bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200"
          >
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                Start New Search
              </h3>
            </div>
            <p className="text-gray-600">
              Begin a new case search using our step-by-step wizard interface
              for quick and accurate results.
            </p>
            <div className="mt-4 text-green-600 font-medium group-hover:text-green-700">
              Start Search →
            </div>
          </Link>
        </div>

        {/* Features Overview */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Key Features
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Fast & Reliable
              </h3>
              <p className="text-gray-600">
                Quick case searches with high success rates and automatic retry
                mechanisms for optimal performance.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Comprehensive Logging
              </h3>
              <p className="text-gray-600">
                Track all queries with detailed logs, analytics, and performance
                metrics for better insights.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                User Friendly
              </h3>
              <p className="text-gray-600">
                Intuitive multi-step wizard interface makes case searching
                simple and efficient for all users.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 w-full">
          <div className="relative">
            <div className="h-px w-[75vw] max-w-screen-xl mx-auto bg-gradient-to-r from-transparent via-blue-500/40 to-transparent dark:via-blue-400/40" />
            <div className="px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  © {year} eCourts Dashboard
                </p>
              </div>
              <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-blue-700 dark:text-blue-300">
                <Link to="/" className="hover:underline">
                  Home
                </Link>
                <Link to="/scraper" className="hover:underline">
                  Search
                </Link>
                <Link to="/logs" className="hover:underline">
                  Analytics
                </Link>
              </nav>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
