import type { Route } from "./+types/logs";
import { useState, useEffect } from "react";
import { Link } from "react-router";
import { iconPaths, utils } from "~/ui";
const pageCls =
  "min-h-screen flex flex-col bg-gradient-to-b from-[#f8fbff] via-[#f5f8ff] to-[#eef3fa] dark:from-[#050b16] dark:via-[#060c18] dark:to-[#0a1628]";
const contentCls = "max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8";
const cardCls =
  "rounded-xl border shadow-lg bg-white/90 border-gray-200 dark:bg-slate-900/70 dark:border-slate-700 dark:shadow-black/40 backdrop-blur";
const cardHeaderCls =
  "border-b border-gray-100 dark:border-slate-700 px-6 py-4";
const cardBodyCls = "p-6";
const headingCls = "font-bold tracking-tight text-gray-900 dark:text-slate-100";
const bodyCls = "text-gray-600 dark:text-slate-300";
const captionCls = "text-gray-500 dark:text-slate-400 text-sm";
const subheadingCls = "font-semibold text-gray-700 dark:text-slate-300";
const btnBase =
  "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed";
const btnPrimary =
  "px-4 py-2.5 bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/30 dark:bg-blue-500 dark:hover:bg-blue-400";
const btnSecondary =
  "px-4 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700";
const btnGhost =
  "px-4 py-2.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10";
const inputBase =
  "w-full px-3 py-2.5 rounded-lg border bg-white/90 backdrop-blur border-gray-300 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm dark:bg-slate-900/60 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed";
const badgeBase =
  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
const badgeInfo =
  "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300";
const badgeSuccess =
  "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300";
const badgeError =
  "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Analytics Dashboard - eCourts Scraper" },
    {
      name: "description",
      content:
        "Comprehensive analytics dashboard with query statistics, performance metrics, and detailed logs for eCourts scraper operations.",
    },
  ];
}

interface QueryLog {
  id: number;
  timestamp: string;
  state: string;
  district: string;
  case_number: string;
  status: string;
  raw_json_response?: string;
}

interface Stats {
  total_queries: number;
  successful_queries: number;
  failed_queries: number;
  success_rate: number;
  most_searched_states: { state: string; count: number }[];
}

export default function Logs() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<QueryLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<QueryLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsResponse, logsResponse] = await Promise.all([
        fetch("http://localhost:8001/api/stats"),
        fetch("http://localhost:8001/api/query-logs?limit=100"),
      ]);

      const statsData = await statsResponse.json();
      const logsData = await logsResponse.json();

      setStats(statsData);
      setLogs(logsData);
    } catch (err) {
      setError("Failed to load data. Please ensure the backend is running.");
    }
    setIsLoading(false);
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      searchTerm === "" ||
      log.case_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.district.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      log.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const downloadLogs = () => {
    utils.downloadBlob(
      filteredLogs,
      `ecourts-logs-${new Date().toISOString().split("T")[0]}.json`
    );
  };

  const downloadStats = () => {
    utils.downloadBlob(
      stats,
      `ecourts-stats-${new Date().toISOString().split("T")[0]}.json`
    );
  };

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

  if (isLoading) {
    return (
      <div className={pageCls}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
            <p className={`${bodyCls} text-lg`}>
              Loading analytics dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={pageCls}>
        <div className="flex items-center justify-center min-h-screen">
          <div className={`${cardCls} p-8 text-center max-w-md`}>
            <div className="text-red-500 text-6xl mb-6">⚠️</div>
            <h2 className={`${headingCls} text-xl mb-4`}>Connection Error</h2>
            <p className={`${bodyCls} mb-6`}>{error}</p>
            <button onClick={loadData} className={`${btnBase} ${btnPrimary}`}>
              <IconComponent iconKey="refresh" className="w-5 h-5" />
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  const year = new Date().getFullYear();
  return (
    <div className={pageCls}>
      <div className={`${contentCls} flex-1 py-8`}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className={`${headingCls} text-4xl mb-2`}>
              Analytics Dashboard
            </h1>
            <p className={bodyCls}>
              Monitor and analyze eCourts scraper performance
            </p>
          </div>
          <div className="flex gap-3 mt-4 sm:mt-0">
            <button
              onClick={downloadStats}
              className={`${btnBase} ${btnSecondary}`}
            >
              <IconComponent iconKey="download" className="w-5 h-5" />
              Export Stats
            </button>
            <Link to="/" className={`${btnBase} ${btnPrimary}`}>
              <IconComponent iconKey="arrowLeft" className="w-5 h-5" />
              Back to Home
            </Link>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div
              className={`${cardCls} p-6 hover:shadow-xl transition-all duration-300`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`${headingCls} text-3xl`}>
                    {stats.total_queries.toLocaleString()}
                  </p>
                  <p className={captionCls}>Total Queries</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <IconComponent
                    iconKey="search"
                    className="w-6 h-6 text-blue-600"
                  />
                </div>
              </div>
            </div>

            <div
              className={`${cardCls} p-6 hover:shadow-xl transition-all duration-300`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`${headingCls} text-3xl text-green-600`}>
                    {stats.successful_queries.toLocaleString()}
                  </p>
                  <p className={captionCls}>Successful</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <IconComponent
                    iconKey="check"
                    className="w-6 h-6 text-green-600"
                  />
                </div>
              </div>
            </div>

            <div
              className={`${cardCls} p-6 hover:shadow-xl transition-all duration-300`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`${headingCls} text-3xl text-red-600`}>
                    {stats.failed_queries.toLocaleString()}
                  </p>
                  <p className={captionCls}>Failed</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <IconComponent iconKey="x" className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>

            <div
              className={`${cardCls} p-6 hover:shadow-xl transition-all duration-300`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`${headingCls} text-3xl text-purple-600`}>
                    {stats.success_rate}%
                  </p>
                  <p className={captionCls}>Success Rate</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <IconComponent
                    iconKey="chart"
                    className="w-6 h-6 text-purple-600"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Most Searched States */}
        {stats && stats.most_searched_states.length > 0 && (
          <div className={`${cardCls} mb-8`}>
            <div className={cardHeaderCls}>
              <h2 className={`${headingCls} text-xl`}>
                📍 Most Searched States
              </h2>
            </div>
            <div
              className={`${cardBodyCls} grid sm:grid-cols-2 lg:grid-cols-3 gap-4`}
            >
              {stats.most_searched_states.slice(0, 6).map((s, idx) => (
                <div
                  key={s.state}
                  className="group relative p-4 rounded-lg border border-gray-200 bg-white/70 dark:bg-slate-800/60 dark:border-slate-700 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ${
                          idx < 3
                            ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white ring-blue-400"
                            : "bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-slate-100 ring-gray-300 dark:ring-slate-500"
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <span className={`${subheadingCls} block`}>
                          {s.state}
                        </span>
                        <span className={`${captionCls} block mt-0.5`}>
                          Queries
                        </span>
                      </div>
                    </div>
                    <span className={`${badgeBase} ${badgeInfo} shadow-sm`}>
                      {s.count}
                    </span>
                  </div>
                  <div className="absolute inset-0 pointer-events-none rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-tr from-blue-500/5 via-transparent to-indigo-500/10" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Query Logs Table */}
        <div className={cardCls}>
          <div className={cardHeaderCls}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className={`${headingCls} text-xl`}>📋 Query Logs</h2>
              <div className="flex gap-3 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`${inputBase} w-full sm:w-64`}
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={inputBase}
                >
                  <option value="all">All Status</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                </select>
                <button
                  onClick={downloadLogs}
                  className={`${btnBase} ${btnSecondary}`}
                >
                  <IconComponent iconKey="download" className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto border-t border-gray-100 dark:border-slate-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-800/50 backdrop-blur">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wide">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wide">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wide">
                    Case Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/80 dark:bg-slate-900/40 backdrop-blur divide-y divide-gray-100 dark:divide-slate-700">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-gray-500 dark:text-slate-400"
                    >
                      {searchTerm || statusFilter !== "all"
                        ? "No logs match your filters."
                        : "No query logs found. Start by running some searches!"}
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-slate-100">
                        {utils.formatDate(log.timestamp)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800 dark:text-slate-100">
                        <div>{log.state}</div>
                        <div className="text-xs text-gray-500 dark:text-slate-400">
                          {log.district}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-slate-100">
                        {log.case_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`${badgeBase} ${log.status === "Success" ? badgeSuccess : badgeError}`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className={`${btnBase} ${btnGhost} px-3 py-1 shadow-sm hover:shadow`}
                        >
                          <IconComponent iconKey="eye" className="w-4 h-4" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <footer className="mt-auto mx-auto w-[50%]">
        <div className="relative">
          <div className="h-px w-[100%]  mx-auto bg-gradient-to-r from-transparent via-blue-500/40 to-transparent dark:via-blue-400/40" />
          <div className="px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                eCourts Analytics
              </p>
            </div>
            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-blue-700 dark:text-blue-300">
              <Link to="/" className="hover:underline">
                Home
              </Link>
              <Link to="/scraper" className="hover:underline">
                Search
              </Link>
            </nav>
          </div>
        </div>
      </footer>

      {selectedLog && (
        <div className="fixed inset-0 bg-black/80 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div
            className={`${cardCls} max-w-4xl w-full max-h-[80vh] overflow-hidden`}
          >
            <div
              className={`${cardHeaderCls} flex items-center justify-between`}
            >
              <div>
                <h3 className={`${headingCls} text-lg`}>Query Details</h3>
                <p className={captionCls}>
                  Case: {selectedLog.case_number} •{" "}
                  {utils.formatDate(selectedLog.timestamp)}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className={`${btnBase} ${btnGhost} p-2`}
              >
                <IconComponent iconKey="x" className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-auto max-h-[60vh]">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <span className={captionCls}>Status:</span>
                  <div className="mt-1">
                    <span
                      className={`${badgeBase} ${selectedLog.status === "Success" ? badgeSuccess : badgeError}`}
                    >
                      {selectedLog.status}
                    </span>
                  </div>
                </div>
                <div>
                  <span className={captionCls}>Location:</span>
                  <div className={`${bodyCls} mt-1`}>
                    {selectedLog.state}, {selectedLog.district}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className={captionCls}>Raw JSON Response:</span>
                  <button
                    onClick={() =>
                      utils.downloadBlob(
                        selectedLog.raw_json_response || {},
                        `log-${selectedLog.id}.json`
                      )
                    }
                    className={`${btnBase} ${btnSecondary} px-3 py-1`}
                  >
                    <IconComponent iconKey="download" className="w-4 h-4" />
                    Download
                  </button>
                </div>
                <pre className="bg-gray-900 text-gray-100 text-xs p-4 rounded-lg overflow-auto max-h-96">
                  {selectedLog.raw_json_response
                    ? JSON.stringify(
                        JSON.parse(selectedLog.raw_json_response),
                        null,
                        2
                      )
                    : "No response data available"}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
