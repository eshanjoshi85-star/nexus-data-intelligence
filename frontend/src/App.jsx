import { useEffect, useRef, useState } from "react";

import {
  Activity,
  BarChart3,
  Database,
  Download,
  FileSpreadsheet,
  Filter,
  LogOut,
  Moon,
  Package,
  RefreshCw,
  Search,
  Sun,
  TrendingUp,
  Upload,
  Wallet,
  X,
  ChevronLeft,
  ChevronRight,
  Table2,
} from "lucide-react";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import "./App.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

function App() {
  // =====================================================
  // AUTH
  // =====================================================

  const [token, setToken] = useState(
    localStorage.getItem("nexus_token")
  );

  const [user, setUser] = useState(null);

  const [authMode, setAuthMode] = useState("login");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loginLoading, setLoginLoading] =
    useState(false);

  const [loginError, setLoginError] =
    useState("");

  const [registerLoading, setRegisterLoading] =
    useState(false);

  const [registerError, setRegisterError] =
    useState("");

  const [googleLoading, setGoogleLoading] =
    useState(false);

  // =====================================================
  // THEME
  // =====================================================

  const [theme, setTheme] = useState(
    localStorage.getItem("nexus_theme") ||
      "dark"
  );

  useEffect(() => {
    document.documentElement.dataset.theme =
      theme;

    localStorage.setItem(
      "nexus_theme",
      theme
    );
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) =>
      current === "dark"
        ? "light"
        : "dark"
    );
  };

  // =====================================================
  // DATASET
  // =====================================================

  const [datasets, setDatasets] =
    useState([]);

  const [
    selectedDatasetId,
    setSelectedDatasetId,
  ] = useState(
    localStorage.getItem(
      "nexus_selected_dataset"
    ) || ""
  );

  // =====================================================
  // DASHBOARD
  // =====================================================

  const [dashboard, setDashboard] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  // =====================================================
  // INSIGHTS
  // =====================================================

  const [insights, setInsights] =
    useState([]);

  const [
    insightsLoading,
    setInsightsLoading,
  ] = useState(false);

  // =====================================================
  // EXPLORER
  // =====================================================

  const [explorerData, setExplorerData] =
    useState(null);

  const [search, setSearch] =
    useState("");

  const [filters, setFilters] =
    useState({});

  const [page, setPage] =
    useState(1);

  const [
    explorerLoading,
    setExplorerLoading,
  ] = useState(false);

  // =====================================================
  // GENERAL
  // =====================================================

  const [error, setError] =
    useState("");

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  // Sidebar navigation targets
  const dashboardRef = useRef(null);
  const explorerRef = useRef(null);

  // =====================================================
  // UPLOAD
  // =====================================================

  const [showUpload, setShowUpload] =
    useState(false);

  const [uploadFile, setUploadFile] =
    useState(null);

  const [uploadName, setUploadName] =
    useState("");

  const [
    uploadDescription,
    setUploadDescription,
  ] = useState("");

  const [
    uploadLoading,
    setUploadLoading,
  ] = useState(false);

  const [uploadError, setUploadError] =
    useState("");

  // =====================================================
  // CHART COLORS
  // =====================================================

  const chartColors =
    theme === "dark"
      ? {
          primary: "#818cf8",
          secondary: "#22d3ee",
          accent: "#a78bfa",
          success: "#34d399",
          warning: "#f59e0b",
          grid:
            "rgba(148,163,184,0.12)",
          text: "#94a3b8",
          tooltipBg: "#0f172a",
          tooltipBorder:
            "rgba(148,163,184,0.18)",
        }
      : {
          primary: "#4f46e5",
          secondary: "#0891b2",
          accent: "#7c3aed",
          success: "#059669",
          warning: "#d97706",
          grid:
            "rgba(71,85,105,0.12)",
          text: "#64748b",
          tooltipBg: "#ffffff",
          tooltipBorder:
            "rgba(71,85,105,0.18)",
        };

  const pieColors =
    theme === "dark"
      ? [
          "#818cf8",
          "#22d3ee",
          "#a78bfa",
          "#34d399",
          "#f59e0b",
        ]
      : [
          "#4f46e5",
          "#0891b2",
          "#7c3aed",
          "#059669",
          "#d97706",
        ];

  // =====================================================
  // API
  // =====================================================

  const apiRequest = async (
    endpoint,
    options = {}
  ) => {
    const isFormData =
      options.body instanceof FormData;

    const response = await fetch(
      `${API_URL}${endpoint}`,
      {
        ...options,
        headers: {
          ...(isFormData
            ? {}
            : {
                "Content-Type":
                  "application/json",
              }),

          ...(token
            ? {
                Authorization:
                  `Bearer ${token}`,
              }
            : {}),

          ...(options.headers || {}),
        },
      }
    );

    const data =
      await response
        .json()
        .catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.message ||
          "Request failed"
      );
    }

    return data;
  };

  // =====================================================
  // LOGIN
  // =====================================================

  const handleLogin = async (
    event
  ) => {
    event.preventDefault();

    setLoginLoading(true);
    setLoginError("");

    try {
      const data =
        await apiRequest(
          "/api/auth/login",
          {
            method: "POST",
            body: JSON.stringify({
              email,
              password,
            }),
          }
        );

      localStorage.setItem(
        "nexus_token",
        data.token
      );

      setToken(data.token);
    } catch (err) {
      setLoginError(
        err.message ||
          "Login failed"
      );
    } finally {
      setLoginLoading(false);
    }
  };

  // =====================================================
  // REGISTER
  // =====================================================

  const handleRegister = async (event) => {
    event.preventDefault();

    setRegisterLoading(true);
    setRegisterError("");

    try {
      const data = await apiRequest(
        "/api/auth/register",
        {
          method: "POST",
          body: JSON.stringify({
            fullName: fullName.trim(),
            email: email.trim().toLowerCase(),
            password,
          }),
        }
      );

      localStorage.setItem(
        "nexus_token",
        data.token
      );

      setToken(data.token);
    } catch (err) {
      setRegisterError(
        err.message ||
          "Registration failed"
      );
    } finally {
      setRegisterLoading(false);
    }
  };

  // =====================================================
  // GOOGLE OAUTH
  // =====================================================

  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    window.location.assign(
      `${API_URL}/api/auth/google`
    );
  };

  // =====================================================
  // OAUTH CALLBACK
  // =====================================================

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search
    );

    const oauthToken =
      params.get("auth_token");

    const oauthError =
      params.get("auth_error");

    if (oauthToken) {
      localStorage.setItem(
        "nexus_token",
        oauthToken
      );

      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );

      setToken(oauthToken);
    }

    if (oauthError) {
      setLoginError(
        decodeURIComponent(oauthError)
      );

      setGoogleLoading(false);

      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );
    }
  }, []);

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {
    localStorage.removeItem(
      "nexus_token"
    );

    localStorage.removeItem(
      "nexus_selected_dataset"
    );

    setToken(null);
    setUser(null);
    setDatasets([]);
    setDashboard(null);
    setInsights([]);
    setExplorerData(null);
    setSelectedDatasetId("");
  };

  // =====================================================
  // USER
  // =====================================================

  useEffect(() => {
    if (!token) return;

    const loadUser = async () => {
      try {
        const data =
          await apiRequest(
            "/api/auth/me"
          );

        setUser(data.user);
      } catch {
        handleLogout();
      }
    };

    loadUser();
  }, [token]);

  // =====================================================
  // DATASETS
  // =====================================================

  const loadDatasets = async () => {
    try {
      const data =
        await apiRequest(
          "/api/datasets"
        );

      const list =
        data.datasets || [];

      setDatasets(list);

      if (!list.length) {
        setSelectedDatasetId("");
        return;
      }

      const saved =
        localStorage.getItem(
          "nexus_selected_dataset"
        );

      const savedDataset =
        list.find(
          (dataset) =>
            dataset.id === saved &&
            dataset.status ===
              "READY"
        );

      const latestReady =
        list.find(
          (dataset) =>
            dataset.status ===
            "READY"
        );

      const nextId =
        savedDataset?.id ||
        latestReady?.id ||
        list[0]?.id ||
        "";

      setSelectedDatasetId(
        nextId
      );

      if (nextId) {
        localStorage.setItem(
          "nexus_selected_dataset",
          nextId
        );
      }
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (!token) return;

    loadDatasets();
  }, [token]);

  // =====================================================
  // DASHBOARD
  // =====================================================

  const loadDashboard = async (
    datasetId = selectedDatasetId,
    activeFilters = filters
  ) => {
    if (!datasetId) return;

    setLoading(true);

    try {
      const data =
        await apiRequest(
          `/api/datasets/${datasetId}/dashboard`,
          {
            method: "POST",
            body: JSON.stringify({
              filters:
                activeFilters,
            }),
          }
        );

      setDashboard(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // AUTOMATED INSIGHTS
  // =====================================================

  const loadInsights = async (
    datasetId = selectedDatasetId,
    activeFilters = filters
  ) => {
    if (!datasetId) return;

    setInsightsLoading(true);

    try {
      const data =
        await apiRequest(
          `/api/datasets/${datasetId}/insights`,
          {
            method: "POST",
            body: JSON.stringify({
              filters:
                activeFilters,
            }),
          }
        );

      console.log(
        "NEXUS insights:",
        data
      );

      setInsights(
        data.insights || []
      );
    } catch (err) {
      console.error(
        "Insight loading error:",
        err
      );

      setInsights([]);
    } finally {
      setInsightsLoading(false);
    }
  };

  // =====================================================
  // EXPLORER
  // =====================================================

  const loadExplorer = async ({
    datasetId = selectedDatasetId,
    currentPage = page,
    currentSearch = search,
    activeFilters = filters,
  } = {}) => {
    if (!datasetId) return;

    setExplorerLoading(true);

    try {
      const params =
        new URLSearchParams();

      params.set(
        "page",
        String(currentPage)
      );

      params.set(
        "limit",
        "10"
      );

      if (
        currentSearch &&
        currentSearch.trim()
      ) {
        params.set(
          "search",
          currentSearch.trim()
        );
      }

      const validFilters =
        Object.fromEntries(
          Object.entries(
            activeFilters
          ).filter(
            ([, value]) =>
              value !==
                undefined &&
              value !== null &&
              String(value).trim() !==
                ""
          )
        );

      if (
        Object.keys(
          validFilters
        ).length
      ) {
        params.set(
          "filters",
          JSON.stringify(
            validFilters
          )
        );
      }

      const data =
        await apiRequest(
          `/api/datasets/${datasetId}/explorer?${params.toString()}`
        );

      setExplorerData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setExplorerLoading(false);
    }
  };

  // =====================================================
  // DATASET CHANGE
  // =====================================================

  useEffect(() => {
    if (!selectedDatasetId)
      return;

    localStorage.setItem(
      "nexus_selected_dataset",
      selectedDatasetId
    );

    setPage(1);
    setFilters({});
    setSearch("");
  }, [selectedDatasetId]);

  // =====================================================
  // LOAD ALL DATA
  // =====================================================

  useEffect(() => {
    if (!selectedDatasetId)
      return;

    loadDashboard(
      selectedDatasetId,
      filters
    );

    loadInsights(
      selectedDatasetId,
      filters
    );

    loadExplorer({
      datasetId:
        selectedDatasetId,
      currentPage: page,
      currentSearch: search,
      activeFilters: filters,
    });
  }, [
    selectedDatasetId,
    page,
    search,
    filters,
  ]);

  // =====================================================
  // SEARCH
  // =====================================================

  const handleSearch = (
    event
  ) => {
    setSearch(
      event.target.value
    );

    setPage(1);
  };

  // =====================================================
  // FILTERS
  // =====================================================

  const handleFilterChange = (
    columnName,
    value
  ) => {
    setFilters(
      (previous) => {
        const next = {
          ...previous,
        };

        if (!value) {
          delete next[
            columnName
          ];
        } else {
          next[columnName] =
            value;
        }

        return next;
      }
    );

    setPage(1);
  };

  const resetFilters = () => {
    setFilters({});
    setSearch("");
    setPage(1);
  };

  // =====================================================
  // DATASET SELECT
  // =====================================================

  const handleDatasetChange = (
    event
  ) => {
    const datasetId =
      event.target.value;

    setSelectedDatasetId(
      datasetId
    );

    localStorage.setItem(
      "nexus_selected_dataset",
      datasetId
    );
  };

  // =====================================================
  // UPLOAD
  // =====================================================

  const handleUpload = async (
    event
  ) => {
    event.preventDefault();

    if (!uploadFile) {
      setUploadError(
        "Please select a CSV file."
      );
      return;
    }

    if (!uploadName.trim()) {
      setUploadError(
        "Please enter a dataset name."
      );
      return;
    }

    setUploadLoading(true);
    setUploadError("");

    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        uploadFile
      );

      formData.append(
        "name",
        uploadName.trim()
      );

      formData.append(
        "description",
        uploadDescription.trim()
      );

      const data =
        await apiRequest(
          "/api/datasets/upload",
          {
            method: "POST",
            body: formData,
          }
        );

      await loadDatasets();

      if (
        data.dataset?.datasetId
      ) {
        setSelectedDatasetId(
          data.dataset.datasetId
        );

        localStorage.setItem(
          "nexus_selected_dataset",
          data.dataset.datasetId
        );
      }

      setShowUpload(false);
      setUploadFile(null);
      setUploadName("");
      setUploadDescription("");
    } catch (err) {
      setUploadError(
        err.message ||
          "Upload failed"
      );
    } finally {
      setUploadLoading(false);
    }
  };

  // =====================================================
  // EXPORT ALL FILTERED ROWS
  // =====================================================

  const exportCSV = async () => {
    if (!selectedDatasetId)
      return;

    try {
      setExplorerLoading(true);

      let currentPage = 1;
      let totalPages = 1;
      let allRows = [];

      while (
        currentPage <=
        totalPages
      ) {
        const params =
          new URLSearchParams();

        params.set(
          "page",
          String(currentPage)
        );

        params.set(
          "limit",
          "100"
        );

        if (search.trim()) {
          params.set(
            "search",
            search.trim()
          );
        }

        const validFilters =
          Object.fromEntries(
            Object.entries(
              filters
            ).filter(
              ([, value]) =>
                value !==
                  undefined &&
                value !== null &&
                String(value).trim() !==
                  ""
            )
          );

        if (
          Object.keys(
            validFilters
          ).length
        ) {
          params.set(
            "filters",
            JSON.stringify(
              validFilters
            )
          );
        }

        const data =
          await apiRequest(
            `/api/datasets/${selectedDatasetId}/explorer?${params.toString()}`
          );

        allRows = [
          ...allRows,
          ...(data.rows || []),
        ];

        totalPages =
          data.pagination
            ?.totalPages || 1;

        currentPage++;
      }

      if (!allRows.length) {
        alert(
          "No records to export."
        );
        return;
      }

      const exportColumns =
        columns.map(
          (column) =>
            column.column_name
        );

      const escapeCSV = (
        value
      ) => {
        const stringValue =
          value === null ||
          value === undefined
            ? ""
            : String(value);

        return `"${stringValue.replace(
          /"/g,
          '""'
        )}"`;
      };

      const csv = [
        exportColumns
          .map(escapeCSV)
          .join(","),

        ...allRows.map(
          (row) =>
            exportColumns
              .map(
                (column) =>
                  escapeCSV(
                    row.data?.[
                      column
                    ]
                  )
              )
              .join(",")
        ),
      ].join("\n");

      const blob =
        new Blob(
          [csv],
          {
            type:
              "text/csv;charset=utf-8;",
          }
        );

      const url =
        URL.createObjectURL(
          blob
        );

      const link =
        document.createElement(
          "a"
        );

      link.href = url;

      link.download =
        `${
          dashboard?.dataset
            ?.name ||
          "nexus-data"
        }-filtered.csv`;

      document.body.appendChild(
        link
      );

      link.click();

      link.remove();

      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err.message ||
          "Export failed"
      );
    } finally {
      setExplorerLoading(false);
    }
  };

  // =====================================================
  // FORMATTERS
  // =====================================================

  const formatNumber = (
    value
  ) =>
    new Intl.NumberFormat(
      "en-IN"
    ).format(
      Math.round(
        Number(value) || 0
      )
    );

  const formatCurrency = (
    value
  ) =>
    `₹${formatNumber(value)}`;

  // =====================================================
  // DERIVED DATA
  // =====================================================

  const filterOptions =
    explorerData?.filterOptions ||
    {};

  const columns =
    explorerData?.columns ||
    [];

  const rows =
    explorerData?.rows || [];

  const pagination =
    explorerData?.pagination || {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    };

  const revenueData =
    dashboard?.charts
      ?.revenueByMonth || [];

  const regionData =
    dashboard?.charts
      ?.revenueByRegion || [];

  const categoryData =
    dashboard?.charts
      ?.profitByCategory || [];

  const activeFilterCount =
    Object.values(
      filters
    ).filter(
      (value) =>
        value !== undefined &&
        value !== null &&
        String(value).trim() !==
          ""
    ).length;

  const hasActiveFilters =
    activeFilterCount > 0 ||
    search.trim() !== "";

  // =====================================================
  // LOGIN / REGISTER PAGE
  // =====================================================

  if (!token) {
    const isRegister = authMode === "register";

    return (
      <div className="login-page">

        <div className="login-theme-toggle">
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            type="button"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun size={17} />
            ) : (
              <Moon size={17} />
            )}
          </button>
        </div>

        <div className="login-card">

          <div className="brand-mark">
            N
          </div>

          <h1>NEXUS</h1>

          <p className="login-subtitle">
            {isRegister
              ? "Create your Data Intelligence Workspace"
              : "Data Intelligence Workspace"}
          </p>

          {isRegister ? (
            <form
              className="login-form"
              onSubmit={handleRegister}
            >

              <label>Full name</label>

              <input
                type="text"
                value={fullName}
                onChange={(event) =>
                  setFullName(event.target.value)
                }
                placeholder="Enter your full name"
                autoComplete="name"
                required
              />

              <label>Email</label>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="Enter your email"
                autoComplete="email"
                required
              />

              <label>Password</label>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Create a password"
                autoComplete="new-password"
                minLength={8}
                required
              />

              {registerError && (
                <div className="error-box">
                  {registerError}
                </div>
              )}

              <button
                type="submit"
                className="primary-button login-button"
                disabled={registerLoading}
              >
                {registerLoading
                  ? "Creating account..."
                  : "Create account"}
              </button>

              <div className="auth-divider">
                <span>or</span>
              </div>

              <button
                type="button"
                className="google-button"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
              >
                <span className="google-mark">G</span>
                {googleLoading
                  ? "Connecting..."
                  : "Continue with Google"}
              </button>

              <div className="auth-switch">
                Already have an account?
                <button
                  type="button"
                  className="auth-link"
                  onClick={() => {
                    setAuthMode("login");
                    setRegisterError("");
                  }}
                >
                  Sign in
                </button>
              </div>

            </form>
          ) : (
            <form
              className="login-form"
              onSubmit={handleLogin}
            >

              <label>Email</label>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="Enter your email"
                autoComplete="email"
                required
              />

              <label>Password</label>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />

              {loginError && (
                <div className="error-box">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                className="primary-button login-button"
                disabled={loginLoading}
              >
                {loginLoading
                  ? "Signing in..."
                  : "Sign in"}
              </button>

              <div className="auth-divider">
                <span>or</span>
              </div>

              <button
                type="button"
                className="google-button"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
              >
                <span className="google-mark">G</span>
                {googleLoading
                  ? "Connecting..."
                  : "Continue with Google"}
              </button>

              <div className="auth-switch">
                Don't have an account?
                <button
                  type="button"
                  className="auth-link"
                  onClick={() => {
                    setAuthMode("register");
                    setLoginError("");
                  }}
                >
                  Create account
                </button>
              </div>

            </form>
          )}

        </div>

      </div>
    );
  }

  // =====================================================
  // MAIN DASHBOARD
  // =====================================================

  return (
    <div className="app-shell">

      {/* SIDEBAR */}

      <aside
        className={`sidebar ${
          sidebarOpen
            ? "sidebar-open"
            : ""
        }`}
      >

        <div className="sidebar-brand">

          <div className="brand-mark small">
            N
          </div>

          <div>
            <strong>
              NEXUS
            </strong>

            <span>
              Intelligence
              Workspace
            </span>
          </div>

        </div>

        <nav>

          <button
            type="button"
            className="nav-item active"
            onClick={() => {
              dashboardRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
              setSidebarOpen(false);
            }}
          >
            <BarChart3
              size={18}
            />
            Dashboard
          </button>

          <button
            type="button"
            className="nav-item"
            onClick={() => {
              explorerRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
              setSidebarOpen(false);
            }}
          >
            <Table2
              size={18}
            />
            Data Explorer
          </button>

        </nav>

        <div className="sidebar-bottom">

          <div className="user-info">

            <div className="avatar">
              {user?.full_name
                ?.charAt(0)
                ?.toUpperCase() ||
                "U"}
            </div>

            <div>
              <strong>
                {user?.full_name ||
                  "User"}
              </strong>

              <span>
                {user?.email ||
                  ""}
              </span>
            </div>

          </div>

          <button
            className="logout-button"
            onClick={
              handleLogout
            }
          >
            <LogOut
              size={17}
            />
            Logout
          </button>

        </div>

      </aside>

      {/* MAIN */}

      <main
        className="main-content"
        ref={dashboardRef}
      >

        {/* TOPBAR */}

        <header className="topbar">

          <div className="topbar-title">

            <button
              className="mobile-menu"
              onClick={() =>
                setSidebarOpen(
                  !sidebarOpen
                )
              }
            >
              <Database
                size={20}
              />
            </button>

            <div>
              <h1>
                Data Intelligence
              </h1>

              <p>
                Explore your data,
                discover patterns,
                and make informed
                decisions.
              </p>
            </div>

          </div>

          <div className="topbar-actions">

            <select
              className="dataset-select"
              value={
                selectedDatasetId
              }
              onChange={
                handleDatasetChange
              }
            >
              {datasets.length ===
              0 ? (
                <option value="">
                  No datasets
                </option>
              ) : (
                datasets.map(
                  (dataset) => (
                    <option
                      key={
                        dataset.id
                      }
                      value={
                        dataset.id
                      }
                    >
                      {
                        dataset.name
                      }
                    </option>
                  )
                )
              )}
            </select>

            <button
              className="secondary-button"
              onClick={() =>
                setShowUpload(
                  true
                )
              }
            >
              <Upload size={16} />
              Upload
            </button>

            <button
              className="theme-toggle"
              onClick={
                toggleTheme
              }
              title={
                theme === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
            >
              {theme === "dark" ? (
                <Sun size={17} />
              ) : (
                <Moon size={17} />
              )}
            </button>

            <button
              className="icon-button"
              onClick={() => {
                loadDatasets();

                loadDashboard(
                  selectedDatasetId,
                  filters
                );

                loadInsights(
                  selectedDatasetId,
                  filters
                );

                loadExplorer({
                  datasetId:
                    selectedDatasetId,
                  currentPage:
                    page,
                  currentSearch:
                    search,
                  activeFilters:
                    filters,
                });
              }}
              title="Refresh"
            >
              <RefreshCw
                size={17}
              />
            </button>

          </div>

        </header>

        {/* ERROR */}

        {error && (
          <div className="error-banner">

            <span>
              {error}
            </span>

            <button
              onClick={() =>
                setError("")
              }
            >
              <X size={16} />
            </button>

          </div>
        )}

        {/* KPI */}

        <section className="kpi-grid">

          <div className="kpi-card">

            <div className="kpi-icon">
              <Activity size={19} />
            </div>

            <div>
              <span>
                Filtered Records
              </span>

              <strong>
                {formatNumber(
                  dashboard?.kpis
                    ?.filteredRows
                )}
              </strong>
            </div>

          </div>

          <div className="kpi-card">

            <div className="kpi-icon">
              <TrendingUp
                size={19}
              />
            </div>

            <div>
              <span>
                Total Revenue
              </span>

              <strong>
                {formatCurrency(
                  dashboard?.kpis
                    ?.totalValue
                )}
              </strong>
            </div>

          </div>

          <div className="kpi-card">

            <div className="kpi-icon">
              <Wallet size={19} />
            </div>

            <div>
              <span>
                Total Profit
              </span>

              <strong>
                {formatCurrency(
                  dashboard?.kpis
                    ?.totalProfit
                )}
              </strong>
            </div>

          </div>

          <div className="kpi-card">

            <div className="kpi-icon">
              <Package size={19} />
            </div>

            <div>
              <span>
                Units Sold
              </span>

              <strong>
                {formatNumber(
                  dashboard?.kpis
                    ?.totalUnits
                )}
              </strong>
            </div>

          </div>

        </section>

        {/* FILTERS */}

        <section className="filter-panel">

          <div className="filter-header">

            <div>
              <h2>
                <Filter size={17} />
                Filters
              </h2>

              {activeFilterCount >
                0 && (
                <span className="filter-count">
                  {activeFilterCount}{" "}
                  active
                </span>
              )}
            </div>

            {hasActiveFilters && (
              <button
                className="reset-button"
                onClick={
                  resetFilters
                }
              >
                Reset
              </button>
            )}

          </div>

          <div className="filter-grid">

            <div className="filter-field search-field">

              <label>
                Search
              </label>

              <div className="search-wrapper">

                <Search size={16} />

                <input
                  value={search}
                  onChange={
                    handleSearch
                  }
                  placeholder="Search dataset..."
                />

              </div>

            </div>

            {Object.entries(
              filterOptions
            ).map(
              ([
                columnName,
                values,
              ]) => (
                <div
                  className="filter-field"
                  key={
                    columnName
                  }
                >

                  <label>
                    {columnName}
                  </label>

                  <select
                    value={
                      filters[
                        columnName
                      ] || ""
                    }
                    onChange={(event) =>
                      handleFilterChange(
                        columnName,
                        event.target
                          .value
                      )
                    }
                  >

                    <option value="">
                      All {columnName}
                    </option>

                    {values.map(
                      (value) => (
                        <option
                          key={value}
                          value={value}
                        >
                          {value}
                        </option>
                      )
                    )}

                  </select>

                </div>
              )
            )}

          </div>

        </section>

        {/* =================================================
            AUTOMATED INSIGHTS
        ================================================= */}

        <section className="insights-panel">

          <div className="insights-header">

            <div className="insights-title">

              <div className="insights-spark">
                ✦
              </div>

              <div>

                <h2>
                  Automated Insights
                </h2>

                <p>
                  Data-driven
                  observations from
                  your current
                  selection
                </p>

              </div>

            </div>

            <span className="insight-badge">

              {insightsLoading
                ? "Analyzing..."
                : `${insights.length} insights`}

            </span>

          </div>

          {insightsLoading ? (

            <div className="insights-loading">

              <RefreshCw
                size={19}
                className="spin"
              />

              <span>
                Analyzing your data...
              </span>

            </div>

          ) : insights.length ===
            0 ? (

            <div className="insights-empty">

              <BarChart3 size={22} />

              <span>
                No insights available
                for the current
                selection.
              </span>

            </div>

          ) : (

            <div className="insights-grid">

              {insights.map(
                (
                  insight,
                  index
                ) => (

                  <div
                    className={`insight-card insight-${insight.type}`}
                    key={`${insight.title}-${index}`}
                  >

                    <div className="insight-icon">

                      <InsightIcon
                        type={
                          insight.icon
                        }
                      />

                    </div>

                    <div className="insight-content">

                      <span className="insight-type">

                        {insight.type ===
                        "leader"
                          ? "LEADER"
                          : insight.type ===
                            "warning"
                          ? "ATTENTION"
                          : insight.type ===
                            "positive"
                          ? "TREND"
                          : "INSIGHT"}

                      </span>

                      <h3>
                        {
                          insight.title
                        }
                      </h3>

                      <p>
                        {
                          insight.message
                        }
                      </p>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </section>

        {/* CHARTS */}

        <section className="charts-grid">

          {/* REVENUE */}

          <div className="chart-card large">

            <div className="chart-header">

              <div>

                <h2>
                  Revenue Trend
                </h2>

                <p>
                  Revenue over time
                </p>

              </div>

            </div>

            <div className="chart-container">

              {revenueData.length >
              0 ? (

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <LineChart
                    data={
                      revenueData
                    }
                  >

                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={
                        chartColors.grid
                      }
                    />

                    <XAxis
                      dataKey="month"
                      tick={{
                        fill:
                          chartColors.text,
                        fontSize: 11,
                      }}
                      axisLine={{
                        stroke:
                          chartColors.grid,
                      }}
                      tickLine={false}
                    />

                    <YAxis
                      tick={{
                        fill:
                          chartColors.text,
                        fontSize: 11,
                      }}
                      axisLine={{
                        stroke:
                          chartColors.grid,
                      }}
                      tickLine={false}
                    />

                    <Tooltip
                      contentStyle={{
                        background:
                          chartColors.tooltipBg,
                        border:
                          `1px solid ${chartColors.tooltipBorder}`,
                        borderRadius:
                          "10px",
                      }}
                    />

                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke={
                        chartColors.secondary
                      }
                      strokeWidth={3}
                      dot={{
                        r: 4,
                        fill:
                          chartColors.secondary,
                        stroke:
                          theme ===
                          "dark"
                            ? "#0f172a"
                            : "#ffffff",
                        strokeWidth: 2,
                      }}
                      activeDot={{
                        r: 6,
                      }}
                    />

                  </LineChart>

                </ResponsiveContainer>

              ) : (
                <EmptyChart />
              )}

            </div>

          </div>

          {/* REGION */}

          <div className="chart-card">

            <div className="chart-header">

              <div>

                <h2>
                  Revenue by Region
                </h2>

                <p>
                  Regional performance
                </p>

              </div>

            </div>

            <div className="chart-container">

              {regionData.length >
              0 ? (

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <BarChart
                    data={
                      regionData
                    }
                  >

                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={
                        chartColors.grid
                      }
                    />

                    <XAxis
                      dataKey="region"
                      tick={{
                        fill:
                          chartColors.text,
                        fontSize: 11,
                      }}
                      axisLine={{
                        stroke:
                          chartColors.grid,
                      }}
                      tickLine={false}
                    />

                    <YAxis
                      tick={{
                        fill:
                          chartColors.text,
                        fontSize: 11,
                      }}
                      axisLine={{
                        stroke:
                          chartColors.grid,
                      }}
                      tickLine={false}
                    />

                    <Tooltip
                      contentStyle={{
                        background:
                          chartColors.tooltipBg,
                        border:
                          `1px solid ${chartColors.tooltipBorder}`,
                        borderRadius:
                          "10px",
                      }}
                    />

                    <Bar
                      dataKey="revenue"
                      fill={
                        chartColors.primary
                      }
                      radius={[
                        6,
                        6,
                        0,
                        0,
                      ]}
                    />

                  </BarChart>

                </ResponsiveContainer>

              ) : (
                <EmptyChart />
              )}

            </div>

          </div>

          {/* CATEGORY */}

          <div className="chart-card">

            <div className="chart-header">

              <div>

                <h2>
                  Profit by Category
                </h2>

                <p>
                  Category contribution
                </p>

              </div>

            </div>

            <div className="chart-container">

              {categoryData.length >
              0 ? (

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <PieChart>

                    <Pie
                      data={
                        categoryData
                      }
                      dataKey="profit"
                      nameKey="category"
                      cx="50%"
                      cy="43%"
                      outerRadius={72}
                      label={false}
                      labelLine={false}
                    >

                      {categoryData.map(
                        (
                          entry,
                          index
                        ) => (

                          <Cell
                            key={`${entry.category}-${index}`}
                            fill={
                              pieColors[
                                index %
                                  pieColors.length
                              ]
                            }
                          />

                        )
                      )}

                    </Pie>

                    <Tooltip
                      contentStyle={{
                        background:
                          chartColors.tooltipBg,
                        border:
                          `1px solid ${chartColors.tooltipBorder}`,
                        borderRadius:
                          "10px",
                      }}
                    />

                    <Legend />

                  </PieChart>

                </ResponsiveContainer>

              ) : (
                <EmptyChart />
              )}

            </div>

          </div>

        </section>

        {/* DATA EXPLORER */}

        <section
          className="explorer-card"
          ref={explorerRef}
        >

          <div className="explorer-header">

            <div>

              <h2>
                Data Explorer
              </h2>

              <p>
                {pagination.total}{" "}
                matching records
              </p>

            </div>

            <button
              className="secondary-button"
              onClick={
                exportCSV
              }
              disabled={
                explorerLoading ||
                pagination.total ===
                  0
              }
            >

              <Download
                size={16}
              />

              Export CSV

            </button>

          </div>

          <div className="table-wrapper">

            {explorerLoading ? (

              <div className="table-loading">

                <RefreshCw
                  className="spin"
                  size={22}
                />

                Loading data...

              </div>

            ) : rows.length ===
              0 ? (

              <div className="empty-state">

                <FileSpreadsheet
                  size={32}
                />

                <strong>
                  No matching
                  records
                </strong>

                <span>
                  Try changing your
                  filters or search.
                </span>

              </div>

            ) : (

              <table>

                <thead>

                  <tr>

                    {columns.map(
                      (column) => (

                        <th
                          key={
                            column.column_name
                          }
                        >
                          {
                            column.display_name
                          }
                        </th>

                      )
                    )}

                  </tr>

                </thead>

                <tbody>

                  {rows.map(
                    (row) => (

                      <tr
                        key={
                          row.id
                        }
                      >

                        {columns.map(
                          (column) => (

                            <td
                              key={
                                column.column_name
                              }
                            >
                              {
                                row.data?.[
                                  column
                                    .column_name
                                ]
                              }
                            </td>

                          )
                        )}

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            )}

          </div>

          {pagination.totalPages >
            1 && (

            <div className="pagination">

              <button
                className="icon-button"
                disabled={
                  page <= 1
                }
                onClick={() =>
                  setPage(
                    (current) =>
                      Math.max(
                        1,
                        current - 1
                      )
                  )
                }
              >

                <ChevronLeft
                  size={17}
                />

              </button>

              <span>
                Page{" "}
                <strong>
                  {
                    pagination.page
                  }
                </strong>{" "}
                of{" "}
                <strong>
                  {
                    pagination.totalPages
                  }
                </strong>
              </span>

              <button
                className="icon-button"
                disabled={
                  page >=
                  pagination.totalPages
                }
                onClick={() =>
                  setPage(
                    (current) =>
                      Math.min(
                        pagination.totalPages,
                        current + 1
                      )
                  )
                }
              >

                <ChevronRight
                  size={17}
                />

              </button>

            </div>

          )}

        </section>

      </main>

      {/* UPLOAD MODAL */}

      {showUpload && (

        <div className="modal-overlay">

          <div className="upload-modal">

            <div className="modal-header">

              <div>

                <h2>
                  Upload Dataset
                </h2>

                <p>
                  Add a CSV dataset
                  to NEXUS.
                </p>

              </div>

              <button
                className="icon-button"
                onClick={() =>
                  setShowUpload(
                    false
                  )
                }
              >
                <X size={18} />
              </button>

            </div>

            <form
              onSubmit={
                handleUpload
              }
            >

              <label>
                Dataset name
              </label>

              <input
                value={
                  uploadName
                }
                onChange={(event) =>
                  setUploadName(
                    event.target
                      .value
                  )
                }
                placeholder="e.g. Sales 2026"
              />

              <label>
                Description
              </label>

              <textarea
                value={
                  uploadDescription
                }
                onChange={(event) =>
                  setUploadDescription(
                    event.target
                      .value
                  )
                }
                placeholder="Optional description"
                rows={3}
              />

              <label>
                CSV file
              </label>

              <div className="file-input">

                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) =>
                    setUploadFile(
                      event.target
                        .files?.[0] ||
                        null
                    )
                  }
                />

                {uploadFile && (
                  <span>
                    {
                      uploadFile.name
                    }
                  </span>
                )}

              </div>

              {uploadError && (
                <div className="error-box">
                  {
                    uploadError
                  }
                </div>
              )}

              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setShowUpload(
                      false
                    )
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={
                    uploadLoading
                  }
                >
                  {uploadLoading
                    ? "Uploading..."
                    : "Upload Dataset"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}

// =====================================================
// INSIGHT ICON
// =====================================================

function InsightIcon({
  type,
}) {
  const props = {
    size: 18,
    strokeWidth: 2,
  };

  switch (type) {
    case "revenue":
      return (
        <TrendingUp {...props} />
      );

    case "profit":
      return (
        <Wallet {...props} />
      );

    case "trophy":
      return (
        <TrendingUp {...props} />
      );

    case "location":
      return (
        <Database {...props} />
      );

    case "up":
      return (
        <TrendingUp {...props} />
      );

    case "down":
      return (
        <Activity {...props} />
      );

    case "units":
      return (
        <Package {...props} />
      );

    default:
      return (
        <BarChart3 {...props} />
      );
  }
}

// =====================================================
// EMPTY CHART
// =====================================================

function EmptyChart() {
  return (
    <div className="empty-chart">

      <BarChart3 size={30} />

      <span>
        No data available for
        the current filters.
      </span>

    </div>
  );
}

export default App;