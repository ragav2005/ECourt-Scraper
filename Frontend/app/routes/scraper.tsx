import type { Route } from "./+types/scraper";
import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router";
import { iconPaths, utils } from "~/ui";
// Inline style tokens (previously from theme.ts)
const pageCls =
  "min-h-screen flex flex-col bg-gradient-to-b from-[#f8fbff] via-[#f5f8ff] to-[#eef3fa] dark:from-[#050b16] dark:via-[#060c18] dark:to-[#0a1628]";
const contentCls = "max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8";
const cardCls =
  "rounded-xl border shadow-lg bg-white/90 border-gray-200 dark:bg-slate-900/70 dark:border-slate-700 dark:shadow-black/40 backdrop-blur";
const headingCls = "font-bold tracking-tight text-gray-900 dark:text-slate-100";
const bodyCls = "text-gray-600 dark:text-slate-300 dark:text-slate-300";
const captionCls = "text-gray-500 dark:text-slate-400 text-sm";
const subheadingCls = "font-semibold text-gray-700 dark:text-slate-300";
const inputBase =
  "w-full px-3 py-2.5 rounded-lg border bg-white/90 backdrop-blur border-gray-300 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm dark:bg-slate-900/60 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed";
const btnBase =
  "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed";
const btnPrimary =
  "px-4 py-2.5 bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/30 dark:bg-blue-500 dark:hover:bg-blue-400";
const btnOutline =
  "px-4 py-2.5 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-500/10";
const btnDanger =
  "px-4 py-2.5 bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/20 hover:shadow-xl hover:shadow-red-600/30 dark:bg-red-500 dark:hover:bg-red-400";
const btnGhost =
  "px-4 py-2.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10";
const badgeBase =
  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
const badgeWarning =
  "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300";
// All former theme.* references have been inlined per Option A decision.

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Case Search - eCourts Scraper" },
    {
      name: "description",
      content:
        "Professional multi-step wizard to search and retrieve case information from Indian court databases",
    },
  ];
}

interface Option {
  value: string;
  text: string;
}

export default function Scraper() {
  const headingRef = useRef<HTMLHeadingElement | null>(null);

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

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    stateCode: "",
    districtCode: "",
    courtComplexCode: "",
    caseType: "",
    caseNumber: "",
    registrationYear: new Date().getFullYear().toString(),
    captchaCode: "",
  });
  const [states, setStates] = useState<Option[]>([]);
  const [districts, setDistricts] = useState<Option[]>([]);
  const [courtComplexes, setCourtComplexes] = useState<Option[]>([]);
  const [caseTypes, setCaseTypes] = useState<Option[]>([]);
  const [captchaUrl, setCaptchaUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Enhanced parsing for case listing with court complex info
  function parseListing(html: string) {
    try {
      if (!html) return null;
      const temp = document.createElement("div");
      temp.innerHTML = html;

      // Extract summary info
      const summary = {
        totalEstablishments:
          temp.querySelector(".h2class")?.textContent?.match(/\d+/)?.[0] || "0",
        totalCases:
          temp
            .querySelector(".h2class:last-of-type")
            ?.textContent?.match(/\d+/)?.[0] || "0",
        courtComplex:
          temp.querySelector(".text-center a")?.textContent?.trim() ||
          "Unknown Court",
      };

      const tbl = temp.querySelector("table#dispTable");
      if (!tbl) return { summary, cases: [] };

      const rows = Array.from(tbl.querySelectorAll("tbody tr"));
      const cases: Array<{
        sr: string;
        caseId: string;
        parties: string;
        courtName?: string;
      }> = [];

      let currentCourt = "";

      for (const r of rows) {
        const cells = r.querySelectorAll("td");
        // Court name row (colspan=3)
        if (cells.length === 2 && cells[0].getAttribute("colspan") === "3") {
          currentCourt = cells[0].textContent?.trim() || "";
          continue;
        }
        // Case data row
        if (cells.length === 4) {
          const sr = cells[0].textContent?.trim() || "";
          const caseId = cells[1].textContent?.trim() || "";
          const parties =
            cells[2].textContent
              ?.replace(/\s*Vs?\s*/gi, " vs ")
              ?.replace(/\s+/g, " ")
              ?.trim() || "";
          if (sr && caseId) {
            cases.push({ sr, caseId, parties, courtName: currentCourt });
          }
        }
      }
      return { summary, cases };
    } catch (error) {
      console.error("Error parsing listing:", error);
      return null;
    }
  }

  const steps = [
    { id: 1, title: "Select State & District", completed: currentStep > 1 },
    { id: 2, title: "Enter Case Details", completed: currentStep > 2 },
    { id: 3, title: "Solve CAPTCHA", completed: currentStep > 3 },
    { id: 4, title: "Review & Submit", completed: currentStep > 4 },
    { id: 5, title: "View Results", completed: false },
  ];

  const api = (p: string) => `http://localhost:8001${p}`;

  useEffect(() => {
    loadStates();
  }, []);
  // Focus heading when step changes for accessibility & visibility context
  // Only focus the heading when changing steps except when staying on step 2 while editing inputs
  useEffect(() => {
    if (currentStep === 2) return; // don't steal focus from case inputs
    if (headingRef.current) {
      headingRef.current.focus();
    }
  }, [currentStep]);
  useEffect(() => {
    if (formData.stateCode) loadDistricts();
    else {
      setDistricts([]);
      setCourtComplexes([]);
      setCaseTypes([]);
    }
  }, [formData.stateCode]);
  useEffect(() => {
    if (formData.stateCode && formData.districtCode) loadCourtComplexes();
    else {
      setCourtComplexes([]);
      setCaseTypes([]);
    }
  }, [formData.stateCode, formData.districtCode]);
  useEffect(() => {
    if (
      formData.stateCode &&
      formData.districtCode &&
      formData.courtComplexCode
    )
      loadCaseTypes();
    else setCaseTypes([]);
  }, [formData.stateCode, formData.districtCode, formData.courtComplexCode]);

  async function withSpinner<T>(fn: () => Promise<T>, msg: string) {
    setIsLoading(true);
    setError("");
    try {
      return await fn();
    } catch {
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }
  async function loadStates() {
    await withSpinner(async () => {
      const r = await fetch(api("/api/get-states"));
      const d = await r.json();
      setStates(d.states || []);
      if ((d.states || []).length === 0) {
        console.warn("No states returned from API /api/get-states");
      }
    }, "Failed to load states");
  }
  async function loadDistricts() {
    await withSpinner(async () => {
      const r = await fetch(api("/api/get-districts"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state_code: formData.stateCode }),
      });
      const d = await r.json();
      setDistricts(d.districts || []);
    }, "Failed to load districts");
  }
  async function loadCourtComplexes() {
    await withSpinner(async () => {
      const r = await fetch(api("/api/get-court-complexes"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state_code: formData.stateCode,
          dist_code: formData.districtCode,
        }),
      });
      const d = await r.json();
      setCourtComplexes(d.complexes || []);
    }, "Failed to load court complexes");
  }
  async function loadCaseTypes() {
    await withSpinner(async () => {
      const r = await fetch(api("/api/get-case-types"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state_code: formData.stateCode,
          dist_code: formData.districtCode,
          court_complex_code: formData.courtComplexCode,
        }),
      });
      const d = await r.json();
      setCaseTypes(d.case_types || []);
    }, "Failed to load case types");
  }
  async function loadCaptcha() {
    try {
      const r = await fetch(api("/api/captcha-url"));
      const d = await r.json();

      if (d.captcha_url) {
        const raw: string = d.captcha_url;
        const absolute =
          raw.startsWith("http://") || raw.startsWith("https://")
            ? raw
            : api(raw);
        const bust = `${absolute}${absolute.includes("?") ? "&" : "?"}ts=${Date.now()}`;
        setCaptchaUrl(bust);
      } else {
        setCaptchaUrl("");
      }
    } catch {
      setError("Failed to load CAPTCHA");
    }
  }

  async function submitCase() {
    setIsSubmitting(true);
    setError("");
    try {
      // Step 1: Submit case to get case listing (including case_no and cino)
      const r = await fetch(api("/api/submit-case"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state_code: formData.stateCode,
          dist_code: formData.districtCode,
          court_complex_code: formData.courtComplexCode,
          case_type: formData.caseType,
          case_no: formData.caseNumber,
          rgyear: formData.registrationYear,
          captcha_code: formData.captchaCode,
        }),
      });
      const result = await r.json();

      if (r.ok && result.success) {
        // Parse the case listing to extract case_no and cino
        const listing = parseListing(result.case_status_data?.raw_html || "");

        if (listing && listing.cases && listing.cases.length > 0) {
          // Extract information from the first case (or find matching case)
          const caseInfo = listing.cases[0];

          // Extract case_no and cino from the viewHistory onclick
          const listingHtml = result.case_status_data?.raw_html || "";
          const viewHistoryMatch = listingHtml.match(
            /viewHistory\('([^']+)','([^']+)',([^,]+),/
          );

          if (viewHistoryMatch) {
            const case_no = viewHistoryMatch[1]; // 200100001332025
            const cino = viewHistoryMatch[2]; // HPCH010018042025
            const court_code = viewHistoryMatch[3]; // 1

            // Step 2: Get detailed case information using viewHistory
            const detailsResponse = await fetch(api("/api/get-case-details"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                court_code: court_code,
                state_code: formData.stateCode,
                dist_code: formData.districtCode,
                court_complex_code: formData.courtComplexCode,
                case_no: case_no,
                cino: cino,
                search_flag: "CScaseNumber",
                search_by: "CScaseNumber",
              }),
            });

            const detailsResult = await detailsResponse.json();

            if (detailsResponse.ok && detailsResult.success) {
              // Combine the results
              setSubmissionResult({
                ...result,
                case_details: detailsResult.case_details,
                case_details_raw: detailsResult.raw_html,
              });
              setCurrentStep(5);
            } else {
              // Fallback to showing just the listing if details fail
              setSubmissionResult(result);
              setCurrentStep(5);
              console.warn(
                "Failed to get detailed case info, showing listing only:",
                detailsResult.message
              );
            }
          } else {
            // Fallback to showing just the listing if we can't parse viewHistory
            setSubmissionResult(result);
            setCurrentStep(5);
            console.warn(
              "Could not extract case_no/cino from listing, showing listing only"
            );
          }
        } else {
          setSubmissionResult(result);
          setCurrentStep(5);
        }
      } else {
        setError(result.message || "Submission failed");
      }
    } catch (error) {
      console.error("Error submitting case:", error);
      setError("Network error submitting case");
    }
    setIsSubmitting(false);
  }

  const canProceed = useCallback(
    (step: number) => {
      if (step === 1) {
        return (
          !!formData.stateCode &&
          !!formData.districtCode &&
          !!formData.courtComplexCode
        );
      }
      if (step === 2) {
        return (
          !!formData.caseType &&
          /^\d+$/.test(formData.caseNumber.trim()) &&
          /^\d{4}$/.test(formData.registrationYear)
        );
      }
      if (step === 3) {
        return formData.captchaCode.trim().length >= 4; // captcha length heuristic
      }
      return true;
    },
    [formData]
  );

  function nextStep() {
    if (currentStep < 5 && canProceed(currentStep)) {
      const n = currentStep + 1;
      setCurrentStep(n);
      if (n === 3) loadCaptcha();
    }
  }
  function prevStep() {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  }
  function resetAll() {
    setCurrentStep(1);
    setFormData({
      stateCode: "",
      districtCode: "",
      courtComplexCode: "",
      caseType: "",
      caseNumber: "",
      registrationYear: new Date().getFullYear().toString(),
      captchaCode: "",
    });
    setDistricts([]);
    setCourtComplexes([]);
    setCaseTypes([]);
    setCaptchaUrl("");
    setError("");
    setSubmissionResult(null);
  }

  // Reusable field wrapper for consistent spacing and labels
  const Field: React.FC<{
    label: string;
    children: React.ReactNode;
    hint?: string;
    className?: string;
  }> = ({ label, children, hint, className }) => (
    <div className={`space-y-2 ${className || ""}`}>
      <label className={`${subheadingCls} text-sm`}>{label}</label>
      {children}
      {hint && <p className={`${captionCls} leading-snug`}>{hint}</p>}
    </div>
  );
  function renderStep() {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-8">
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="text-2xl font-semibold text-gray-900 dark:text-slate-100 mb-1 tracking-tight focus:outline-none"
            >
              Select State & District
            </h2>
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-2 max-w-prose">
              Choose jurisdiction details. Each choice filters the next.
            </p>
            <div className="space-y-6">
              <Field label="State">
                <select
                  className={inputBase}
                  value={formData.stateCode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stateCode: e.target.value,
                      districtCode: "",
                      courtComplexCode: "",
                      caseType: "",
                    })
                  }
                >
                  <option value="">Select State</option>
                  {states.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.text}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="District">
                <select
                  className={inputBase}
                  value={formData.districtCode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      districtCode: e.target.value,
                      courtComplexCode: "",
                      caseType: "",
                    })
                  }
                  disabled={!formData.stateCode}
                >
                  <option value="">Select District</option>
                  {districts.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.text}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Court Complex">
                <select
                  className={inputBase}
                  value={formData.courtComplexCode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      courtComplexCode: e.target.value,
                      caseType: "",
                    })
                  }
                  disabled={!formData.districtCode}
                >
                  <option value="">Select Court Complex</option>
                  {courtComplexes.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.text}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-8">
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="text-2xl font-semibold text-gray-900 dark:text-slate-100 mb-1 tracking-tight focus:outline-none"
            >
              Enter Case Details
            </h2>
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-2 max-w-prose">
              Provide required identifiers.
            </p>
            <div className="space-y-6">
              <Field label="Case Type">
                <select
                  className={inputBase}
                  value={formData.caseType}
                  onChange={(e) =>
                    setFormData({ ...formData, caseType: e.target.value })
                  }
                  disabled={!formData.courtComplexCode}
                >
                  <option value="">Select Case Type</option>
                  {caseTypes.map((ct) => (
                    <option key={ct.value} value={ct.value}>
                      {ct.text}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Case Number">
                <input
                  className={inputBase}
                  value={formData.caseNumber}
                  autoFocus
                  onChange={(e) =>
                    setFormData({ ...formData, caseNumber: e.target.value })
                  }
                  placeholder="e.g. 1234"
                  inputMode="numeric"
                />
              </Field>
              <Field label="Registration Year">
                <input
                  type="number"
                  className={inputBase}
                  value={formData.registrationYear}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      registrationYear: e.target.value,
                    })
                  }
                />
              </Field>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-8">
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="text-2xl font-semibold text-gray-900 dark:text-slate-100 mb-1 tracking-tight focus:outline-none"
            >
              Solve CAPTCHA
            </h2>
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-2 max-w-prose">
              Enter the characters displayed. Refresh if it's unreadable.
            </p>
            <div className="flex justify-center">
              {captchaUrl ? (
                <img
                  src={captchaUrl}
                  alt="captcha"
                  className="border rounded"
                />
              ) : (
                <div className="w-32 h-16 bg-gray-200 flex items-center justify-center rounded animate-pulse">
                  Loading...
                </div>
              )}
            </div>
            <div className="max-w-xs mx-auto">
              <input
                className={`${inputBase} text-center tracking-widest font-mono`}
                value={formData.captchaCode}
                onChange={(e) =>
                  setFormData({ ...formData, captchaCode: e.target.value })
                }
                placeholder="Enter CAPTCHA"
              />
            </div>
            <button
              type="button"
              onClick={loadCaptcha}
              className={`${btnBase} ${btnOutline}`}
            >
              Refresh CAPTCHA
            </button>
          </div>
        );
      case 4:
        return (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg mb-4">
                <IconComponent iconKey="check" className="w-6 h-6 text-white" />
              </div>
              <h2
                ref={headingRef}
                tabIndex={-1}
                className={`${headingCls} text-2xl mb-2 focus:outline-none`}
              >
                Review & Submit
              </h2>
              <p className={`${bodyCls} max-w-2xl mx-auto`}>
                Please review your case details below before submitting the
                search request
              </p>
            </div>

            {/* Enhanced Review Cards */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Jurisdiction Details */}
              <div className={`${cardCls} p-6 border-l-4 border-green-500`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <IconComponent
                      iconKey="location"
                      className="w-4 h-4 text-green-600"
                    />
                  </div>
                  <h3
                    className={`${subheadingCls} text-lg text-gray-900 dark:text-slate-100`}
                  >
                    Jurisdiction
                  </h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span
                      className={`${captionCls} font-semibold text-gray-700 dark:text-slate-200`}
                    >
                      State
                    </span>
                    <span
                      className={`${bodyCls} text-right flex-1 ml-4 text-gray-900 dark:text-slate-100 font-medium`}
                    >
                      {states.find((s) => s.value === formData.stateCode)
                        ?.text || formData.stateCode}
                    </span>
                  </div>
                  <div className="flex justify-between items-start border-t border-gray-100 pt-3">
                    <span
                      className={`${captionCls} font-semibold text-gray-700 dark:text-slate-200`}
                    >
                      District
                    </span>
                    <span
                      className={`${bodyCls} text-right flex-1 ml-4 text-gray-900 dark:text-slate-100 font-medium`}
                    >
                      {districts.find((d) => d.value === formData.districtCode)
                        ?.text || formData.districtCode}
                    </span>
                  </div>
                  <div className="flex justify-between items-start border-t border-gray-100 pt-3">
                    <span
                      className={`${captionCls} font-semibold text-gray-700 dark:text-slate-200`}
                    >
                      Court Complex
                    </span>
                    <span
                      className={`${bodyCls} text-right flex-1 ml-4 text-gray-900 dark:text-slate-100 font-medium`}
                    >
                      {courtComplexes.find(
                        (c) => c.value === formData.courtComplexCode
                      )?.text || formData.courtComplexCode}
                    </span>
                  </div>
                </div>
              </div>

              {/* Case Details */}
              <div className={`${cardCls} p-6 border-l-4 border-green-500`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <IconComponent
                      iconKey="file"
                      className="w-4 h-4 text-green-600"
                    />
                  </div>
                  <h3
                    className={`${subheadingCls} text-lg text-gray-900 dark:text-slate-100`}
                  >
                    Case Information
                  </h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span
                      className={`${captionCls} font-semibold text-gray-700 dark:text-slate-200`}
                    >
                      Case Type
                    </span>
                    <span
                      className={`${bodyCls} text-right flex-1 ml-4 text-gray-900 dark:text-slate-100 font-medium`}
                    >
                      {caseTypes.find((ct) => ct.value === formData.caseType)
                        ?.text || formData.caseType}
                    </span>
                  </div>
                  <div className="flex justify-between items-start border-t border-gray-100 pt-3">
                    <span
                      className={`${captionCls} font-semibold text-gray-700 dark:text-slate-200`}
                    >
                      Case Number
                    </span>
                    <span
                      className={`${bodyCls} text-right flex-1 ml-4 font-mono bg-gray-50 dark:bg-slate-800/60 dark:text-slate-100 px-2 py-1 rounded font-medium text-gray-900`}
                    >
                      {formData.caseNumber}
                    </span>
                  </div>
                  <div className="flex justify-between items-start border-t border-gray-100 pt-3">
                    <span
                      className={`${captionCls} font-semibold text-gray-700 dark:text-slate-200`}
                    >
                      Registration Year
                    </span>
                    <span
                      className={`${bodyCls} text-right flex-1 ml-4 font-mono bg-gray-50 dark:bg-slate-800/60 dark:text-slate-100 px-2 py-1 rounded font-medium text-gray-900`}
                    >
                      {formData.registrationYear}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CAPTCHA Verification Status */}
            <div
              className={`${cardCls} p-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-emerald-800/20 border border-emerald-200 dark:border-emerald-700`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-700/40 rounded-full flex items-center justify-center">
                  <IconComponent
                    iconKey="check"
                    className="w-4 h-4 text-emerald-600 dark:text-emerald-300"
                  />
                </div>
                <div>
                  <span
                    className={`${subheadingCls} text-emerald-700 dark:text-emerald-300`}
                  >
                    CAPTCHA Verified
                  </span>
                  <p
                    className={`${captionCls} text-emerald-600 dark:text-emerald-400`}
                  >
                    Security verification completed successfully
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div className="flex flex-col items-center gap-4 pt-6">
              <button
                onClick={submitCase}
                disabled={isSubmitting}
                className={`${btnBase} ${btnPrimary} px-8 py-4 text-lg font-semibold min-w-48 ${
                  isSubmitting
                    ? "opacity-75 cursor-not-allowed"
                    : "transform hover:scale-105 transition-transform"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <IconComponent
                      iconKey="spinner"
                      className="w-5 h-5 mr-3 animate-spin"
                    />
                    Submitting Search...
                  </>
                ) : (
                  <>
                    <IconComponent iconKey="search" className="w-5 h-5 mr-3" />
                    Submit Case Search
                  </>
                )}
              </button>
              {isSubmitting && (
                <div
                  className={`${cardCls} p-3 bg-blue-50 border border-blue-200`}
                >
                  <p className={`${captionCls} text-blue-700 text-center`}>
                    🔍 Searching court database... Please wait, this may take a
                    few moments.
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl shadow-lg mb-4">
                <IconComponent iconKey="check" className="w-6 h-6 text-white" />
              </div>
              <h2
                ref={headingRef}
                tabIndex={-1}
                className={`${headingCls} text-2xl mb-2 focus:outline-none`}
              >
                Search Results
              </h2>
              {submissionResult?.success && (
                <p
                  className={`${bodyCls} max-w-2xl mx-auto text-gray-700 dark:text-slate-300`}
                >
                  Case information retrieved successfully from the court
                  database
                </p>
              )}
            </div>

            {submissionResult?.success ? (
              <div className="space-y-6">
                {/* Success Message */}
                <div
                  className={`${cardCls} p-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-emerald-800/20 border border-emerald-200 dark:border-emerald-700`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-700/40 rounded-full flex items-center justify-center">
                      <IconComponent
                        iconKey="check"
                        className="w-4 h-4 text-emerald-600 dark:text-emerald-300"
                      />
                    </div>
                    <span
                      className={`${subheadingCls} text-emerald-800 dark:text-emerald-300 font-semibold`}
                    >
                      Case Found Successfully
                    </span>
                  </div>
                </div>

                {submissionResult.case_status_data ? (
                  // Display detailed case information from viewHistory
                  <div className="space-y-6">
                    {/* Court Header */}
                    <div
                      className={`${cardCls} p-4 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-800/40 dark:to-slate-800/20 border border-slate-200 dark:border-slate-700`}
                    >
                      <h2
                        className={`${headingCls} text-xl text-center font-bold text-slate-800 dark:text-slate-100`}
                      >
                        {submissionResult.case_status_data.court_name ||
                          "District and Sessions Court"}
                      </h2>
                    </div>

                    {/* Case Details Section */}
                    <div
                      className={`${cardCls} p-6 border-l-4 border-blue-500`}
                    >
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                          <IconComponent
                            iconKey="file"
                            className="w-5 h-5 text-blue-600"
                          />
                        </div>
                        <h3
                          className={`${headingCls} text-xl text-gray-900 dark:text-slate-100`}
                        >
                          Case Details
                        </h3>
                      </div>

                      {/* First row - 4 columns */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="flex flex-col py-2">
                          <span
                            className={`${captionCls} font-semibold text-gray-700 dark:text-slate-300 mb-2`}
                          >
                            Case Type
                          </span>
                          <span className={`${bodyCls} font-medium`}>
                            {submissionResult.case_status_data.case_type ||
                              "N/A"}
                          </span>
                        </div>
                        <div className="flex flex-col py-2">
                          <span
                            className={`${captionCls} font-semibold text-gray-700 dark:text-slate-300 mb-2`}
                          >
                            Case Number
                          </span>
                          <span
                            className={`${bodyCls} font-medium font-mono bg-gray-50 dark:bg-slate-800/60 dark:text-slate-100 dark:border dark:border-slate-700 px-2 py-1 rounded`}
                          >
                            {submissionResult.case_status_data.case_number ||
                              "N/A"}
                          </span>
                        </div>
                        <div className="flex flex-col py-2">
                          <span
                            className={`${captionCls} font-semibold text-gray-700 dark:text-slate-300 mb-2`}
                          >
                            Filing Number
                          </span>
                          <span
                            className={`${bodyCls} font-medium font-mono bg-gray-50 dark:bg-slate-800/60 dark:text-slate-100 dark:border dark:border-slate-700 px-2 py-1 rounded`}
                          >
                            {submissionResult.case_status_data.filing_number ||
                              "N/A"}
                          </span>
                        </div>
                        <div className="flex flex-col py-2">
                          <span
                            className={`${captionCls} font-semibold text-gray-700 dark:text-slate-300 mb-2`}
                          >
                            Filing Date
                          </span>
                          <span className={`${bodyCls} font-medium`}>
                            {submissionResult.case_status_data.filing_date ||
                              "N/A"}
                          </span>
                        </div>
                      </div>

                      {/* Second row - 2 columns */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="flex flex-col py-2">
                          <span
                            className={`${captionCls} font-semibold text-gray-700 dark:text-slate-300 mb-2`}
                          >
                            Registration Number
                          </span>
                          <span
                            className={`${bodyCls} font-medium font-mono bg-gray-50 dark:bg-slate-800/60 dark:text-slate-100 dark:border dark:border-slate-700 px-2 py-1 rounded`}
                          >
                            {submissionResult.case_status_data
                              .registration_number || "N/A"}
                          </span>
                        </div>
                        <div className="flex flex-col py-2">
                          <span
                            className={`${captionCls} font-semibold text-gray-700 dark:text-slate-300 mb-2`}
                          >
                            Registration Date
                          </span>
                          <span className={`${bodyCls} font-medium`}>
                            {submissionResult.case_status_data
                              .registration_date || "N/A"}
                          </span>
                        </div>
                      </div>

                      {/* Third row - CNR Number spanning full width */}
                      <div className="flex flex-col py-2">
                        <span
                          className={`${captionCls} font-semibold text-gray-700 dark:text-slate-300 mb-2`}
                        >
                          CNR Number
                        </span>
                        <span
                          className={`${bodyCls} font-medium font-mono bg-blue-50 dark:bg-slate-800/60 dark:text-slate-100 px-3 py-2 rounded border border-blue-200 dark:border-slate-700 inline-block`}
                        >
                          {submissionResult.case_status_data.cnr_number ||
                            "N/A"}
                          {submissionResult.case_status_data.cnr_number && (
                            <span className="block text-xs text-blue-600 dark:text-blue-400 mt-1">
                              (Note the CNR number for future reference)
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Case Status Section */}
                    <div
                      className={`${cardCls} p-6 border-l-4 border-amber-500`}
                    >
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                          <IconComponent
                            iconKey="calendar"
                            className="w-5 h-5 text-amber-600"
                          />
                        </div>
                        <h3
                          className={`${headingCls} text-xl text-gray-900 dark:text-slate-100`}
                        >
                          Case Status
                        </h3>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="flex justify-between items-start py-2 border-b border-gray-100">
                            <span
                              className={`${captionCls} font-semibold text-gray-700 dark:text-slate-300`}
                            >
                              First Hearing Date:
                            </span>
                            <span
                              className={`${bodyCls} text-right flex-1 ml-4 font-medium`}
                            >
                              {submissionResult.case_status_data
                                .first_hearing_date || "N/A"}
                            </span>
                          </div>
                          <div className="flex justify-between items-start py-2 border-b border-gray-100">
                            <span
                              className={`${captionCls} font-semibold text-gray-700 dark:text-slate-300`}
                            >
                              Next Hearing Date:
                            </span>
                            <span
                              className={`${bodyCls} text-right flex-1 ml-4 font-medium`}
                            >
                              {submissionResult.case_status_data.next_date ||
                                "N/A"}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="flex justify-between items-start py-2 border-b border-gray-100">
                            <span
                              className={`${captionCls} font-semibold text-gray-700 dark:text-slate-300`}
                            >
                              Case Stage:
                            </span>
                            <span
                              className={`${badgeBase} ${badgeWarning} ml-4`}
                            >
                              {submissionResult.case_status_data.stage || "N/A"}
                            </span>
                          </div>
                          <div className="flex justify-between items-start py-2">
                            <span
                              className={`${captionCls} font-semibold text-gray-700 dark:text-slate-300`}
                            >
                              Court Number and Judge:
                            </span>
                            <span
                              className={`${bodyCls} text-right flex-1 ml-4 font-medium`}
                            >
                              {submissionResult.case_status_data.judge || "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Petitioner and Advocate Section */}
                    {submissionResult.case_status_data.petitioners &&
                      submissionResult.case_status_data.petitioners.length >
                        0 && (
                        <div
                          className={`${cardCls} p-6 border-l-4 border-green-500`}
                        >
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                              <IconComponent
                                iconKey="user"
                                className="w-5 h-5 text-green-600"
                              />
                            </div>
                            <h3
                              className={`${headingCls} text-xl text-gray-900 dark:text-slate-100`}
                            >
                              Petitioner and Advocate
                            </h3>
                          </div>

                          <div className="space-y-3">
                            {submissionResult.case_status_data.petitioners.map(
                              (petitioner: any, index: number) => (
                                <div
                                  key={index}
                                  className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg"
                                >
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-green-600 dark:text-green-300 font-semibold text-sm">
                                      {index + 1})
                                    </span>
                                    <span
                                      className={`${bodyCls} font-semibold`}
                                    >
                                      {petitioner.name || "N/A"}
                                    </span>
                                  </div>
                                  {petitioner.advocate && (
                                    <div className="ml-6 text-sm text-gray-700 dark:text-slate-300">
                                      <span className="font-medium">
                                        Advocate:
                                      </span>{" "}
                                      {petitioner.advocate}
                                    </div>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {/* Respondent and Advocate Section */}
                    {submissionResult.case_status_data.respondents &&
                      submissionResult.case_status_data.respondents.length >
                        0 && (
                        <div
                          className={`${cardCls} p-6 border-l-4 border-red-500`}
                        >
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                              <IconComponent
                                iconKey="users"
                                className="w-5 h-5 text-red-600"
                              />
                            </div>
                            <h3
                              className={`${headingCls} text-xl text-gray-900 dark:text-slate-100`}
                            >
                              Respondent and Advocate
                            </h3>
                          </div>

                          <div className="space-y-3">
                            {submissionResult.case_status_data.respondents.map(
                              (respondent: any, index: number) => (
                                <div
                                  key={index}
                                  className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg"
                                >
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-red-600 dark:text-red-300 font-semibold text-sm">
                                      {index + 1})
                                    </span>
                                    <span
                                      className={`${bodyCls} font-semibold`}
                                    >
                                      {respondent.name || "N/A"}
                                    </span>
                                  </div>
                                  {respondent.advocate && (
                                    <div className="ml-6 text-sm text-gray-700 dark:text-slate-300">
                                      <span className="font-medium">
                                        Advocate:
                                      </span>{" "}
                                      {respondent.advocate}
                                    </div>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {/* Acts Section */}
                    {submissionResult.case_status_data.acts &&
                      submissionResult.case_status_data.acts.length > 0 && (
                        <div
                          className={`${cardCls} p-6 border-l-4 border-indigo-500`}
                        >
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                              <IconComponent
                                iconKey="document"
                                className="w-5 h-5 text-indigo-600"
                              />
                            </div>
                            <h3
                              className={`${headingCls} text-xl text-gray-900 dark:text-slate-100`}
                            >
                              Acts
                            </h3>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-gray-50 dark:bg-slate-800/60">
                                <tr>
                                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-slate-300 border-b border-gray-200 dark:border-slate-700">
                                    Under Act(s)
                                  </th>
                                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-slate-300 border-b border-gray-200 dark:border-slate-700">
                                    Under Section(s)
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {submissionResult.case_status_data.acts.map(
                                  (act: any, index: number) => (
                                    <tr
                                      key={index}
                                      className="border-b border-gray-100"
                                    >
                                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-slate-100">
                                        {act.act_name || "N/A"}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-slate-100">
                                        {act.sections || "N/A"}
                                      </td>
                                    </tr>
                                  )
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                    {/* Processes Section */}
                    {submissionResult.case_status_data.processes &&
                      submissionResult.case_status_data.processes.length >
                        0 && (
                        <div
                          className={`${cardCls} p-6 border-l-4 border-cyan-500`}
                        >
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
                              <IconComponent
                                iconKey="clipboard"
                                className="w-5 h-5 text-cyan-600"
                              />
                            </div>
                            <h3
                              className={`${headingCls} text-xl text-gray-900 dark:text-slate-100`}
                            >
                              Processes
                            </h3>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-gray-50 dark:bg-slate-800/60">
                                <tr>
                                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-slate-300 border-b border-gray-200 dark:border-slate-700">
                                    Process ID
                                  </th>
                                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-slate-300 border-b border-gray-200 dark:border-slate-700">
                                    Process Title
                                  </th>
                                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-slate-300 border-b border-gray-200 dark:border-slate-700">
                                    Process Date
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {submissionResult.case_status_data.processes.map(
                                  (process: any, index: number) => (
                                    <tr
                                      key={index}
                                      className="border-b border-gray-100"
                                    >
                                      <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-slate-100">
                                        {process.process_id || "N/A"}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-slate-100">
                                        {process.process_title || "N/A"}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-slate-100">
                                        {process.process_date || "N/A"}
                                      </td>
                                    </tr>
                                  )
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                    {/* Case History Section */}
                    {submissionResult.case_status_data.case_history &&
                      submissionResult.case_status_data.case_history.length >
                        0 && (
                        <div
                          className={`${cardCls} p-6 border-l-4 border-purple-500`}
                        >
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                              <IconComponent
                                iconKey="calendar"
                                className="w-5 h-5 text-purple-600"
                              />
                            </div>
                            <h3
                              className={`${headingCls} text-xl text-gray-900 dark:text-slate-100`}
                            >
                              Case History
                            </h3>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-gray-50 dark:bg-slate-800/60">
                                <tr>
                                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-slate-300 border-b border-gray-200 dark:border-slate-700">
                                    Judge
                                  </th>
                                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-slate-300 border-b border-gray-200 dark:border-slate-700">
                                    Business on Date
                                  </th>
                                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-slate-300 border-b border-gray-200 dark:border-slate-700">
                                    Hearing Date
                                  </th>
                                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-slate-300 border-b border-gray-200 dark:border-slate-700">
                                    Purpose of Hearing
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {submissionResult.case_status_data.case_history.map(
                                  (item: any, index: number) => (
                                    <tr
                                      key={index}
                                      className="border-b border-gray-100"
                                    >
                                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-slate-100">
                                        {item.judge || "N/A"}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-slate-100">
                                        {item.business_date || "N/A"}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-slate-100">
                                        {item.hearing_date || "N/A"}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-slate-100">
                                        {item.purpose_of_hearing || "N/A"}
                                      </td>
                                    </tr>
                                  )
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                    {/* Interim Orders Section */}
                    {submissionResult.case_status_data.interim_orders &&
                      submissionResult.case_status_data.interim_orders.length >
                        0 && (
                        <div
                          className={`${cardCls} p-6 border-l-4 border-orange-500`}
                        >
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                              <IconComponent
                                iconKey="document"
                                className="w-5 h-5 text-orange-600"
                              />
                            </div>
                            <h3
                              className={`${headingCls} text-xl text-gray-900 dark:text-slate-100`}
                            >
                              Interim Orders
                            </h3>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-gray-50 dark:bg-slate-800/60">
                                <tr>
                                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-slate-300 border-b border-gray-200 dark:border-slate-700">
                                    Order #
                                  </th>
                                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-slate-300 border-b border-gray-200 dark:border-slate-700">
                                    Order Date
                                  </th>
                                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-slate-300 border-b border-gray-200 dark:border-slate-700">
                                    Details
                                  </th>
                                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-slate-300 border-b border-gray-200 dark:border-slate-700">
                                    Actions
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {submissionResult.case_status_data.interim_orders.map(
                                  (order: any, index: number) => (
                                    <tr
                                      key={index}
                                      className="border-b border-gray-100"
                                    >
                                      <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-slate-100">
                                        {order.order_number || index + 1}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-slate-100">
                                        {order.order_date || "N/A"}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-slate-100">
                                        {order.order_details || "N/A"}
                                      </td>
                                      <td className="px-4 py-3 text-xs max-w-xs">
                                        {order.pdf_url ? (
                                          <div className="flex flex-col gap-1">
                                            <button
                                              type="button"
                                              onClick={async () => {
                                                try {
                                                  const resp = await fetch(
                                                    api("/api/get-order-pdf"),
                                                    {
                                                      method: "POST",
                                                      headers: {
                                                        "Content-Type":
                                                          "application/json",
                                                      },
                                                      body: JSON.stringify({
                                                        pdf_request:
                                                          order.display_pdf_arg ||
                                                          order.pdf_url,
                                                      }),
                                                    }
                                                  );
                                                  if (!resp.ok)
                                                    throw new Error(
                                                      "Failed to fetch PDF"
                                                    );
                                                  const blob =
                                                    await resp.blob();
                                                  const a =
                                                    document.createElement("a");
                                                  const url =
                                                    URL.createObjectURL(blob);
                                                  a.href = url;
                                                  a.download = `order_${order.order_number || index + 1}.pdf`;
                                                  document.body.appendChild(a);
                                                  a.click();
                                                  a.remove();
                                                  setTimeout(
                                                    () =>
                                                      URL.revokeObjectURL(url),
                                                    5000
                                                  );
                                                } catch (e) {
                                                  console.error(e);
                                                  setError(
                                                    "Failed to download PDF"
                                                  );
                                                }
                                              }}
                                              className={`${btnBase} ${btnPrimary} px-2 py-1 text-[11px]`}
                                            >
                                              Download
                                            </button>
                                          </div>
                                        ) : (
                                          <span className="text-gray-400">
                                            —
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  )
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                  </div>
                ) : (
                  // Fallback: Display basic listing if detailed info is not available
                  submissionResult.case_status_data &&
                  (() => {
                    const data = submissionResult.case_status_data;
                    const meaningful = Object.entries(data).filter(
                      ([k, v]) => k !== "raw_html" && String(v).trim() !== ""
                    );

                    return (
                      <div className="space-y-6">
                        {/* Case Details Section */}
                        <div
                          className={`${cardCls} p-6 border-l-4 border-blue-500`}
                        >
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                              <IconComponent
                                iconKey="file"
                                className="w-5 h-5 text-blue-600"
                              />
                            </div>
                            <h3 className={`${headingCls} text-xl`}>
                              Case Details
                            </h3>
                          </div>

                          <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              {meaningful
                                .filter(
                                  ([k]) =>
                                    k.toLowerCase().includes("case_type") ||
                                    k.toLowerCase().includes("filing_number") ||
                                    k.toLowerCase().includes("filing_date") ||
                                    k.toLowerCase().includes("registration")
                                )
                                .map(([k, v]) => (
                                  <div
                                    key={k}
                                    className="flex justify-between items-start py-2 border-b border-gray-100 last:border-b-0"
                                  >
                                    <span
                                      className={`${captionCls} font-semibold text-gray-600 dark:text-slate-300 capitalize`}
                                    >
                                      {k
                                        .replace(/_/g, " ")
                                        .replace(/\b\w/g, (l) =>
                                          l.toUpperCase()
                                        )}
                                      :
                                    </span>
                                    <span
                                      className={`${bodyCls} text-right flex-1 ml-4 font-medium`}
                                    >
                                      {String(v)}
                                    </span>
                                  </div>
                                ))}
                              {/* Fallback for case type if not found in meaningful data */}
                              <div className="flex justify-between items-start py-2 border-b border-gray-100">
                                <span
                                  className={`${captionCls} font-semibold text-gray-600 dark:text-slate-300`}
                                >
                                  Case Type:
                                </span>
                                <span
                                  className={`${bodyCls} text-right flex-1 ml-4 font-medium`}
                                >
                                  {data.case_type || "N/A"}
                                </span>
                              </div>
                              <div className="flex justify-between items-start py-2 border-b border-gray-100">
                                <span
                                  className={`${captionCls} font-semibold text-gray-600 dark:text-slate-300`}
                                >
                                  Filing Number:
                                </span>
                                <span
                                  className={`${bodyCls} text-right flex-1 ml-4 font-medium font-mono bg-gray-50 px-2 py-1 rounded`}
                                >
                                  {data.filing_number || "N/A"}
                                </span>
                              </div>
                              <div className="flex justify-between items-start py-2">
                                <span
                                  className={`${captionCls} font-semibold text-gray-600 dark:text-slate-300`}
                                >
                                  Filing Date:
                                </span>
                                <span
                                  className={`${bodyCls} text-right flex-1 ml-4 font-medium`}
                                >
                                  {data.filing_date || "N/A"}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="flex justify-between items-start py-2 border-b border-gray-100">
                                <span
                                  className={`${captionCls} font-semibold text-gray-600 dark:text-slate-300`}
                                >
                                  Registration Number:
                                </span>
                                <span
                                  className={`${bodyCls} text-right flex-1 ml-4 font-medium font-mono bg-gray-50 px-2 py-1 rounded`}
                                >
                                  {data.registration_number || "N/A"}
                                </span>
                              </div>
                              <div className="flex justify-between items-start py-2 border-b border-gray-100">
                                <span
                                  className={`${captionCls} font-semibold text-gray-600 dark:text-slate-300`}
                                >
                                  Registration Date:
                                </span>
                                <span
                                  className={`${bodyCls} text-right flex-1 ml-4 font-medium`}
                                >
                                  {data.registration_date || "N/A"}
                                </span>
                              </div>
                              <div className="flex justify-between items-start py-2">
                                <span
                                  className={`${captionCls} font-semibold text-gray-600 dark:text-slate-300`}
                                >
                                  CNR Number:
                                </span>
                                <span
                                  className={`${bodyCls} text-right flex-1 ml-4 font-medium font-mono bg-gray-50 px-2 py-1 rounded`}
                                >
                                  {data.cnr_number || "N/A"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Case Status Section - continue with the rest of the fallback content */}
                        <div
                          className={`${cardCls} p-6 border-l-4 border-amber-500`}
                        >
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                              <IconComponent
                                iconKey="calendar"
                                className="w-5 h-5 text-amber-600"
                              />
                            </div>
                            <h3 className={`${headingCls} text-xl`}>
                              Case Status
                            </h3>
                          </div>

                          <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <div className="flex justify-between items-start py-2 border-b border-gray-100">
                                <span
                                  className={`${captionCls} font-semibold text-gray-600 dark:text-slate-300`}
                                >
                                  First Hearing:
                                </span>
                                <span
                                  className={`${bodyCls} text-right flex-1 ml-4 font-medium`}
                                >
                                  {data.first_hearing_date || "N/A"}
                                </span>
                              </div>
                              <div className="flex justify-between items-start py-2 border-b border-gray-100">
                                <span
                                  className={`${captionCls} font-semibold text-gray-600 dark:text-slate-300`}
                                >
                                  Status:
                                </span>
                                <span
                                  className={`${badgeBase} ${badgeWarning} ml-4`}
                                >
                                  {data.status || data.stage || "N/A"}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="flex justify-between items-start py-2 border-b border-gray-100">
                                <span
                                  className={`${captionCls} font-semibold text-gray-600 dark:text-slate-300`}
                                >
                                  Decision Date:
                                </span>
                                <span
                                  className={`${bodyCls} text-right flex-1 ml-4 font-medium`}
                                >
                                  {data.decision_date ||
                                    data.next_date ||
                                    "N/A"}
                                </span>
                              </div>
                              <div className="flex justify-between items-start py-2 border-b border-gray-100">
                                <span
                                  className={`${captionCls} font-semibold text-gray-600 dark:text-slate-300`}
                                >
                                  Nature of Disposal:
                                </span>
                                <span
                                  className={`${bodyCls} text-right flex-1 ml-4 font-medium`}
                                >
                                  {data.nature_of_disposal || "N/A"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="flex justify-between items-start">
                              <span
                                className={`${captionCls} font-semibold text-gray-600 dark:text-slate-300`}
                              >
                                Court & Judge:
                              </span>
                              <span
                                className={`${bodyCls} text-right flex-1 ml-4 font-medium`}
                              >
                                {data.judge || data.court_name || "N/A"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Petitioners Section */}
                        <div
                          className={`${cardCls} p-6 border-l-4 border-green-500`}
                        >
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                              <IconComponent
                                iconKey="user"
                                className="w-5 h-5 text-green-600"
                              />
                            </div>
                            <h3 className={`${headingCls} text-xl`}>
                              Petitioners
                            </h3>
                          </div>

                          <div className="space-y-3">
                            {data.petitioners && data.petitioners.length > 0 ? (
                              data.petitioners.map(
                                (petitioner: any, index: number) => (
                                  <div
                                    key={index}
                                    className="flex items-center gap-3 p-3 bg-green-50 rounded-lg"
                                  >
                                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                      <span className="text-green-600 font-semibold text-sm">
                                        {index + 1}
                                      </span>
                                    </div>
                                    <span className={`${bodyCls} font-medium`}>
                                      {petitioner.name || petitioner}
                                    </span>
                                  </div>
                                )
                              )
                            ) : (
                              <div className="text-center py-4 text-gray-500">
                                <span className={`${bodyCls}`}>
                                  No petitioners information available
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Respondents Section */}
                        <div
                          className={`${cardCls} p-6 border-l-4 border-red-500`}
                        >
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                              <IconComponent
                                iconKey="users"
                                className="w-5 h-5 text-red-600"
                              />
                            </div>
                            <h3 className={`${headingCls} text-xl`}>
                              Respondents
                            </h3>
                          </div>

                          <div className="space-y-3">
                            {data.respondents && data.respondents.length > 0 ? (
                              data.respondents.map(
                                (respondent: any, index: number) => (
                                  <div
                                    key={index}
                                    className="flex items-center gap-3 p-3 bg-red-50 rounded-lg"
                                  >
                                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                                      <span className="text-red-600 font-semibold text-sm">
                                        {index + 1}
                                      </span>
                                    </div>
                                    <span className={`${bodyCls} font-medium`}>
                                      {respondent.name || respondent}
                                    </span>
                                  </div>
                                )
                              )
                            ) : (
                              <div className="text-center py-4 text-gray-500">
                                <span className={`${bodyCls}`}>
                                  No respondents information available
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Report Download Section */}
                        <div
                          className={`${cardCls} p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                <IconComponent
                                  iconKey="document"
                                  className="w-5 h-5 text-blue-600"
                                />
                              </div>
                              <div>
                                <h4
                                  className={`${subheadingCls} font-semibold`}
                                >
                                  Case Report
                                </h4>
                                <p
                                  className={`${captionCls} text-gray-600 dark:text-slate-300`}
                                >
                                  Download a comprehensive case status report
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                const reportData = {
                                  caseDetails: data,
                                  generatedOn: new Date().toLocaleString(),
                                  searchCriteria: {
                                    caseNumber: formData.caseNumber,
                                    registrationYear: formData.registrationYear,
                                    state: states.find(
                                      (s) => s.value === formData.stateCode
                                    )?.text,
                                    district: districts.find(
                                      (d) => d.value === formData.districtCode
                                    )?.text,
                                    courtComplex: courtComplexes.find(
                                      (c) =>
                                        c.value === formData.courtComplexCode
                                    )?.text,
                                  },
                                };

                                utils.downloadBlob(
                                  reportData,
                                  `case_report_${formData.caseNumber}_${formData.registrationYear}.json`,
                                  "application/json"
                                );
                              }}
                              className={`${btnBase} ${btnPrimary} px-6 py-3`}
                            >
                              <IconComponent
                                iconKey="download"
                                className="w-5 h-5 mr-2"
                              />
                              Download Report
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            ) : (
              <div
                className={`${cardCls} p-6 border-l-4 border-red-500 bg-red-50`}
              >
                <div className="flex items-center gap-3">
                  <IconComponent iconKey="x" className="w-6 h-6 text-red-500" />
                  <div>
                    <p className="font-medium text-red-800">Case Not Found</p>
                    <p className="text-sm text-red-700 mt-1">
                      {submissionResult?.message ||
                        "The requested case could not be found in the database."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className={`${cardCls} p-6`}>
              <div className="flex flex-wrap gap-4 justify-center">
                <button
                  onClick={resetAll}
                  className={`${btnBase} ${btnPrimary} px-6 py-3`}
                >
                  <IconComponent iconKey="refresh" className="w-5 h-5 mr-2" />
                  Start New Search
                </button>
                <Link
                  to="/logs"
                  className={`${btnBase} ${btnOutline} px-6 py-3`}
                >
                  <IconComponent iconKey="database" className="w-5 h-5 mr-2" />
                  View Search History
                </Link>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  }

  const year = new Date().getFullYear();
  return (
    <div className={pageCls}>
      <div className={`${contentCls} flex-grow py-8`}>
        {/* Modern Header */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg mb-4">
              <IconComponent iconKey="search" className="w-8 h-8 text-white" />
            </div>
            <h1 className={`${headingCls} text-4xl mb-2`}>
              Case Search Wizard
            </h1>
            <p className={`${bodyCls} max-w-2xl mx-auto`}>
              Follow the guided steps to search for case information in Indian
              court databases
            </p>
          </div>

          {/* Enhanced Progress Steps */}
          <div className={`${cardCls} p-6 mb-8`}>
            <div className="flex flex-wrap justify-center gap-4 mb-6">
              {steps.map((s) => {
                const state =
                  s.id === currentStep
                    ? "current"
                    : s.completed
                      ? "complete"
                      : "upcoming";
                return (
                  <div key={s.id} className="flex items-center gap-3">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold border-2 transition-all duration-300 ${
                        state === "current"
                          ? "bg-blue-600 text-white border-blue-600 ring-4 ring-blue-100"
                          : state === "complete"
                            ? "bg-green-100 text-green-700 border-green-300"
                            : "bg-gray-100 text-gray-500 border-gray-300"
                      }`}
                      aria-current={state === "current" ? "step" : undefined}
                    >
                      {state === "complete" ? (
                        <IconComponent iconKey="check" className="w-5 h-5" />
                      ) : (
                        s.id
                      )}
                    </div>
                    <span
                      className={`text-sm font-medium hidden sm:block ${
                        state === "current"
                          ? "text-blue-600"
                          : "text-gray-600 dark:text-slate-300"
                      }`}
                    >
                      {s.title}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 ease-out"
                style={{ width: `${((currentStep - 1) / 4) * 100}%` }}
              />
            </div>
          </div>
        </div>
        {/* Enhanced Error Display */}
        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className={`${cardCls} p-4 mb-6 border-l-4 border-red-500 bg-red-50`}
          >
            <div className="flex items-start gap-3">
              <IconComponent
                iconKey="x"
                className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0"
              />
              <div className="flex-1">
                <p className="font-medium text-red-800">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <button
                onClick={() => setError("")}
                className={`${btnBase} ${btnGhost} text-red-600 px-2 py-1`}
              >
                <IconComponent iconKey="x" className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className={`${cardCls} p-8 mb-8`}>{renderStep()}</div>
        {/* Enhanced Navigation Footer */}
        <div className={`${cardCls} p-6`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex gap-3">
              {currentStep < 5 && (
                <Link to="/logs" className={`${btnBase} ${btnOutline}`}>
                  <IconComponent iconKey="database" className="w-4 h-4 mr-2" />
                  View Logs
                </Link>
              )}
              <button onClick={resetAll} className={`${btnBase} ${btnDanger}`}>
                <IconComponent iconKey="refresh" className="w-4 h-4 mr-2" />
                Reset
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={prevStep}
                disabled={currentStep === 1}
                className={`${btnBase} ${btnOutline}`}
              >
                <IconComponent iconKey="arrowLeft" className="w-4 h-4 mr-2" />
                Previous
              </button>
              {currentStep < 4 && (
                <button
                  onClick={nextStep}
                  disabled={!canProceed(currentStep) || isLoading}
                  className={
                    `${btnBase} ${btnPrimary}` +
                    (isLoading || !canProceed(currentStep)
                      ? " opacity-60 cursor-not-allowed"
                      : "")
                  }
                >
                  {isLoading ? (
                    <>
                      <IconComponent
                        iconKey="spinner"
                        className="w-4 h-4 mr-2 animate-spin"
                      />
                      Loading
                    </>
                  ) : (
                    <>
                      Next
                      <IconComponent
                        iconKey="arrowRight"
                        className="w-4 h-4 ml-2"
                      />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
        <footer className="mt-16 w-full">
          <div className="relative">
            <div className="h-px w-[75vw] max-w-screen-xl mx-auto bg-gradient-to-r from-transparent via-blue-500/40 to-transparent dark:via-blue-400/40" />
            <div className="px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
              <div>
                <p className="text-xs text-gray-600 dark:text-slate-300">
                  eCourts Scrapper
                </p>
              </div>
              <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-blue-700 dark:text-blue-300">
                <Link to="/" className="hover:underline">
                  Home
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
