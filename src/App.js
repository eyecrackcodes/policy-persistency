import React, { useState, useEffect, useCallback, useMemo } from "react";
import Papa from "papaparse";
import {
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
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";
import {
  Upload,
  Download,
  Filter,
  Mail,
  AlertTriangle,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  ArrowUp,
  ArrowDown,
  Search,
  X,
  Plus,
  Send,
  RefreshCw,
  AlertCircle,
  Database,
} from "lucide-react";
import { emailService } from "./services/emailService";
import { n8nService } from "./services/n8nService";
import ActionGenerator from "./utils/actionGenerator";
import ActionQueue from "./components/ActionQueue";
import TaskDashboard from "./components/TaskDashboard";
import { DatabaseService } from "./config/supabase";
import { twilioTaskService } from "./services/twilioTaskService";
import useDeviceDetect from "./hooks/useDeviceDetect";
import "./App.css";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

function App() {
  // Device detection
  const { isMobile } = useDeviceDetect();

  // Enhanced State Management for Multi-Data Type Support
  const [data, setData] = useState([]);
  const [nsfData, setNsfData] = useState([]);
  const [cancellationData, setCancellationData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [activeDataSource, setActiveDataSource] = useState("combined"); // 'combined', 'nsf', 'cancellation'
  const [filters, setFilters] = useState({
    dateRange: { start: "", end: "" },
    product: "",
    agent: "",
    premiumRange: "",
    state: "",
    reason: "",
    dataSource: "",
    terminationType: "",
  });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

  const [showActionQueue, setShowActionQueue] = useState(false);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analytics, setAnalytics] = useState({});
  const [uploadMode, setUploadMode] = useState("detect"); // 'detect', 'nsf', 'cancellation'
  const [isProcessing, setIsProcessing] = useState(false);
  const [dataFreshness, setDataFreshness] = useState(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbConnected, setDbConnected] = useState(false);

  // Task Management State
  const [currentView, setCurrentView] = useState("dashboard"); // 'dashboard', 'tasks', 'analytics'
  const [retentionTasks, setRetentionTasks] = useState([]);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Load data from Supabase on app start
  const loadDataFromDatabase = useCallback(async () => {
    setDbLoading(true);
    try {
      console.log("🔄 Loading data from Supabase...");
      const policies = await DatabaseService.getAllPolicies();

      if (policies.length > 0) {
        // Separate NSF and cancellation data
        const nsfPolicies = policies.filter((p) => p.source === "nsf");
        const cancellationPolicies = policies.filter(
          (p) => p.source === "cancellation"
        );

        // Convert dates back to Date objects for consistency
        const processedPolicies = policies.map((policy) => ({
          ...policy,
          issue_date: policy.issue_date ? new Date(policy.issue_date) : null,
          paid_to_date: policy.paid_to_date
            ? new Date(policy.paid_to_date)
            : null,
          app_recvd_date: policy.app_recvd_date
            ? new Date(policy.app_recvd_date)
            : null,
          contract_date: policy.contract_date
            ? new Date(policy.contract_date)
            : null,
        }));

        const processedNsf = nsfPolicies.map((policy) => ({
          ...policy,
          issue_date: policy.issue_date ? new Date(policy.issue_date) : null,
          paid_to_date: policy.paid_to_date
            ? new Date(policy.paid_to_date)
            : null,
          app_recvd_date: policy.app_recvd_date
            ? new Date(policy.app_recvd_date)
            : null,
          contract_date: policy.contract_date
            ? new Date(policy.contract_date)
            : null,
        }));

        const processedCancellation = cancellationPolicies.map((policy) => ({
          ...policy,
          issue_date: policy.issue_date ? new Date(policy.issue_date) : null,
          paid_to_date: policy.paid_to_date
            ? new Date(policy.paid_to_date)
            : null,
          app_recvd_date: policy.app_recvd_date
            ? new Date(policy.app_recvd_date)
            : null,
          contract_date: policy.contract_date
            ? new Date(policy.contract_date)
            : null,
        }));

        setData(processedPolicies);
        setNsfData(processedNsf);
        setCancellationData(processedCancellation);
        setFilteredData(processedPolicies);

        // Calculate analytics for loaded data
        calculateAnalytics(processedPolicies);
        calculateDataFreshness(processedPolicies);
        await generateActionItems(processedPolicies);

        console.log(`✅ Loaded ${policies.length} policies from database`);
        setDbConnected(true);
      } else {
        console.log("📝 No existing data found in database");
        setDbConnected(true);
      }
    } catch (error) {
      console.error("❌ Error loading data from database:", error);
      setDbConnected(false);
    } finally {
      setDbLoading(false);
    }
  }, []);

  // Load data from database on component mount
  useEffect(() => {
    loadDataFromDatabase();
  }, [loadDataFromDatabase]);

  // Calculate Data Freshness
  const calculateDataFreshness = useCallback((policyData) => {
    if (!policyData || policyData.length === 0) {
      setDataFreshness(null);
      return;
    }

    // Find the most recent issue_date in the dataset
    const validDates = policyData
      .map((item) => {
        if (!item.issue_date) return null;
        const date = new Date(item.issue_date);
        return isNaN(date.getTime()) ? null : date;
      })
      .filter((date) => date !== null);

    if (validDates.length === 0) {
      setDataFreshness({
        status: "unknown",
        message: "No valid dates found",
      });
      return;
    }

    const latestDate = new Date(Math.max(...validDates));
    const today = new Date();
    const diffTime = today - latestDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let status, color, icon, message;

    if (diffDays <= 7) {
      status = "fresh";
      color = "green";
      icon = "🟢";
      message = `Current data (${diffDays} day${
        diffDays === 1 ? "" : "s"
      } old)`;
    } else if (diffDays <= 30) {
      status = "recent";
      color = "yellow";
      icon = "🟡";
      message = `Recent data (${diffDays} days old)`;
    } else if (diffDays <= 90) {
      status = "outdated";
      color = "orange";
      icon = "🟠";
      message = `Outdated data (${Math.round(diffDays / 7)} weeks old)`;
    } else {
      status = "stale";
      color = "red";
      icon = "🔴";
      const months = Math.round(diffDays / 30);
      message = `Stale data (${months} month${months === 1 ? "" : "s"} old)`;
    }

    setDataFreshness({
      status,
      color,
      icon,
      message,
      latestDate: latestDate.toLocaleDateString(),
      daysOld: diffDays,
    });
  }, []);

  // Data Type Detection
  const detectDataType = (headers) => {
    const headerSet = new Set(headers.map((h) => h.toLowerCase()));

    // NSF data signatures
    const nsfSignature = ["mga_name", "first payment", "reason"];
    const nsfScore = nsfSignature.filter((sig) =>
      headerSet.has(sig.toLowerCase())
    ).length;

    // Cancellation data signatures
    const cancellationSignature = [
      "agent_level_03",
      "contract_code",
      "cntrct_date",
    ];
    const cancellationScore = cancellationSignature.filter((sig) =>
      headerSet.has(sig.toLowerCase())
    ).length;

    if (nsfScore >= 2) return "nsf";
    if (cancellationScore >= 2) return "cancellation";

    // Fallback - check for common fields
    if (headerSet.has("reason")) return "nsf";
    if (headerSet.has("contract_code") || headerSet.has("agent_level_03"))
      return "cancellation";

    return "unknown";
  };

  // Enhanced File Upload Handler
  const handleFileUpload = useCallback(
    (event, forceType = null) => {
      const file = event.target.files[0];
      if (!file) return;

      // Prevent duplicate processing
      if (isProcessing) {
        console.warn("File processing already in progress...");
        return;
      }

      setIsProcessing(true);
      setLoading(true);
      setUploadProgress(0);

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transform: (value) => {
          // Clean up any extra whitespace
          return typeof value === "string" ? value.trim() : value;
        },
        transformHeader: (header) => {
          // Clean up header names
          return header.trim();
        },
        complete: async (result) => {
          let uploadRecord = null;

          try {
            // Detect data type first
            const fileHeaders = result.meta.fields || [];
            const detectedType =
              forceType ||
              (uploadMode === "detect"
                ? detectDataType(fileHeaders)
                : uploadMode);

            // Record file upload start
            uploadRecord = await DatabaseService.recordFileUpload({
              file_name: file.name,
              file_type: detectedType,
              file_size: file.size,
              upload_status: "processing",
            });

            console.log(
              `📝 Recording file upload: ${file.name} (${detectedType})`
            );
          } catch (error) {
            console.warn("Could not record file upload:", error);
          }

          // Enhanced error analysis and reporting
          const parseErrors = result.errors || [];
          const fieldCountErrors = parseErrors.filter(
            (error) =>
              error.message.includes("Too many fields") ||
              error.message.includes("Too few fields")
          );
          const duplicateHeaderErrors = parseErrors.filter(
            (error) =>
              error.message.includes("Duplicate") ||
              error.message.includes("duplicate")
          );
          const criticalErrors = parseErrors.filter(
            (error) =>
              !error.message.includes("Too many fields") &&
              !error.message.includes("Too few fields") &&
              !error.message.includes("Duplicate")
          );

          // Create detailed error report
          const errorReport = {
            total: parseErrors.length,
            fieldCount: fieldCountErrors.length,
            duplicateHeaders: duplicateHeaderErrors.length,
            critical: criticalErrors.length,
            rowsAffected: new Set(parseErrors.map((e) => e.row)).size,
          };

          // Advanced CSV analysis
          const csvHeaders = result.meta.fields || [];
          const headerAnalysis = {
            total: csvHeaders.length,
            duplicates: csvHeaders.length - new Set(csvHeaders).size,
            empty: csvHeaders.filter((h) => !h || h.trim() === "").length,
            suspicious: csvHeaders.filter(
              (h) => h.includes("_") || h.includes(".") || /\d+$/.test(h)
            ).length,
          };

          console.log("📊 CSV Analysis Report:", {
            fileName: file.name,
            totalRows: result.data.length,
            headers: headerAnalysis,
            sampleHeaders: csvHeaders.slice(0, 10),
            errors: errorReport,
            dataQuality: {
              completeness:
                (
                  ((result.data.length - errorReport.rowsAffected) /
                    result.data.length) *
                  100
                ).toFixed(1) + "%",
              consistency:
                errorReport.fieldCount === 0 ? "Good" : "Issues detected",
            },
          });

          // Show user-friendly error summary
          if (errorReport.total > 0) {
            let warningMessage = `CSV Data Quality Report for "${file.name}":\n\n`;

            if (errorReport.fieldCount > 0) {
              warningMessage += `⚠️ ${errorReport.fieldCount} rows have inconsistent field counts (non-critical)\n`;
            }

            if (errorReport.duplicateHeaders > 0) {
              warningMessage += `🔄 Duplicate column headers detected and auto-renamed\n`;
            }

            if (errorReport.critical > 0) {
              warningMessage += `❌ ${errorReport.critical} critical parsing errors found\n`;
            }

            warningMessage += `\n✅ Successfully processing ${result.data.length} rows`;

            if (errorReport.critical > 0) {
              alert(warningMessage);
            } else {
              console.warn(warningMessage);
            }
          }

          // Detect data type
          const fileHeaders = result.meta.fields || [];
          const detectedType =
            forceType ||
            (uploadMode === "detect"
              ? detectDataType(fileHeaders)
              : uploadMode);

          if (detectedType === "unknown" && uploadMode === "detect") {
            alert(
              "Could not automatically detect data type. Please select NSF or Cancellation mode manually."
            );
            setLoading(false);
            setIsProcessing(false);
            return;
          }

          // Check for duplicate policy numbers
          const policyNumbers = new Set();
          const duplicates = [];
          const validData = [];

          result.data.forEach((row, index) => {
            const policyNumber =
              row.policy_nbr?.toString().trim() ||
              row.Policy_nbr?.toString().trim();

            if (!policyNumber) {
              console.warn(`Row ${index + 1}: Missing policy number`);
              return;
            }

            if (policyNumbers.has(policyNumber)) {
              duplicates.push({ row: index + 1, policyNumber });
            } else {
              policyNumbers.add(policyNumber);
              validData.push(row);
            }
          });

          // Alert user about duplicates
          if (duplicates.length > 0) {
            const duplicateList = duplicates
              .map((d) => `Row ${d.row}: ${d.policyNumber}`)
              .join("\n");
            alert(
              `Found ${duplicates.length} duplicate policy numbers:\n${duplicateList}\n\nDuplicates have been excluded from upload.`
            );
          }

          // Process data based on type
          const processedData = validData.map((row, index) => {
            const baseData = processRowData(row, index, detectedType);
            return {
              ...baseData,
              file_name: file.name,
            };
          });

          console.log(
            `Processed ${processedData.length} valid ${detectedType} policies (${duplicates.length} duplicates excluded)`
          );

          // Update appropriate data state
          if (detectedType === "nsf") {
            setNsfData((prev) => [...prev, ...processedData]);
          } else if (detectedType === "cancellation") {
            setCancellationData((prev) => [...prev, ...processedData]);
          }

          // Update combined data and save to database
          await updateCombinedData(
            detectedType,
            processedData,
            uploadRecord?.id
          );

          setLoading(false);
          setIsProcessing(false);
          setUploadProgress(100);

          alert(
            `Successfully uploaded ${processedData.length} ${detectedType} records to database!`
          );
        },
        error: (error) => {
          console.error("File parsing error:", error);
          alert(`Error parsing CSV file: ${error.message}`);
          setLoading(false);
          setIsProcessing(false);
        },
      });
    },
    [uploadMode]
  );

  // Process row data based on type
  const processRowData = (row, index, dataType) => {
    if (dataType === "nsf") {
      const issueDate = parseDate(row.issue_date);
      const paidToDate = parseDate(row.paid_to_date);
      const appRecvdDate = parseDate(row.app_recvd_date);

      return {
        ...row,
        id: `nsf_${index + 1}_${Date.now()}`,
        annual_premium: parseFloat(row.annual_premium) || 0,
        issue_date: issueDate,
        paid_to_date: paidToDate,
        app_recvd_date: appRecvdDate,
        duration: calculateDuration(issueDate, paidToDate),
        policy_nbr: row.policy_nbr?.toString().trim(),
        agent_name: row.WA_Name?.toString().trim() || "Unknown",
        product: row.Product?.toString().trim() || "Unknown",
        issue_state: row.issue_state?.toString().trim() || "Unknown",
        termination_reason: row.Reason?.toString().trim() || "NSF",
        mga_name: row.MGA_name?.toString().trim() || "Unknown",
        source: "nsf",
        termination_type: "nsf",
      };
    } else if (dataType === "cancellation") {
      const issueDate = parseDate(row.Issue_Date);
      const paidToDate = parseDate(row.Paid_to_Date);
      const appRecvdDate = parseDate(row.App_Recvd_Date);
      const contractDate = parseDate(row.cntrct_date);

      return {
        ...row,
        id: `cancel_${index + 1}_${Date.now()}`,
        annual_premium: parseFloat(row.Annual_Premium) || 0,
        issue_date: issueDate,
        paid_to_date: paidToDate,
        app_recvd_date: appRecvdDate,
        contract_date: contractDate,
        // For cancellations, calculate duration between issue date and cancellation date (cntrct_date)
        duration: calculateDuration(issueDate, contractDate),
        policy_nbr: row.Policy_nbr?.toString().trim(),
        agent_name: row.WA_Name?.toString().trim() || "Unknown",
        product: row.Plan_Code?.toString().trim() || "Unknown",
        issue_state: row.Issue_State?.toString().trim() || "Unknown",
        termination_reason: "Voluntary Cancellation",
        agent_level_03: row.Agent_level_03?.toString().trim() || "Unknown",
        contract_code: row.Contract_Code?.toString().trim() || "Unknown",
        source: "cancellation",
        termination_type: "cancellation",
      };
    }
  };

  // Update combined data and save to Supabase
  const updateCombinedData = async (dataType, newData, uploadId = null) => {
    try {
      // Save new data to Supabase
      console.log(
        `💾 Saving ${newData.length} ${dataType} records to database...`
      );

      // Prepare data for database (convert Date objects to ISO strings)
      const dbData = newData.map((policy) => ({
        policy_nbr: policy.policy_nbr,
        source: policy.source,
        termination_type: policy.termination_type,
        annual_premium: policy.annual_premium,
        issue_date: policy.issue_date
          ? policy.issue_date.toISOString().split("T")[0]
          : null,
        paid_to_date: policy.paid_to_date
          ? policy.paid_to_date.toISOString().split("T")[0]
          : null,
        app_recvd_date: policy.app_recvd_date
          ? policy.app_recvd_date.toISOString().split("T")[0]
          : null,
        contract_date: policy.contract_date
          ? policy.contract_date.toISOString().split("T")[0]
          : null,
        duration: policy.duration,
        agent_name: policy.agent_name,
        issue_state: policy.issue_state,
        product: policy.product,
        termination_reason: policy.termination_reason,
        mga_name: policy.mga_name || null,
        agent_level_03: policy.agent_level_03 || null,
        contract_code: policy.contract_code || null,
      }));

      await DatabaseService.insertPolicies(dbData);

      // Update file upload status if provided
      if (uploadId) {
        await DatabaseService.updateFileUploadStatus(uploadId, "completed", {
          records_imported: newData.length,
        });
      }

      // Get current state and add new data
      let updatedNsfData = [...nsfData];
      let updatedCancellationData = [...cancellationData];

      if (dataType === "nsf") {
        updatedNsfData.push(...newData);
        setNsfData(updatedNsfData);
      } else if (dataType === "cancellation") {
        updatedCancellationData.push(...newData);
        setCancellationData(updatedCancellationData);
      }

      // Create combined dataset
      const combined = [...updatedNsfData, ...updatedCancellationData];

      console.log(
        `📊 Data Summary: NSF: ${updatedNsfData.length}, Cancellation: ${updatedCancellationData.length}, Total: ${combined.length}`
      );

      setData(combined);
      setFilteredData(combined);
      calculateAnalytics(combined);
      calculateDataFreshness(combined);
      await generateActionItems(combined);

      console.log(
        `✅ Successfully saved ${newData.length} records to database`
      );
    } catch (error) {
      console.error("❌ Error saving data to database:", error);

      // Update file upload status to failed if provided
      if (uploadId) {
        await DatabaseService.updateFileUploadStatus(uploadId, "failed", {
          error_details: { message: error.message },
        });
      }

      // Still update the UI even if database save fails
      let updatedNsfData = [...nsfData];
      let updatedCancellationData = [...cancellationData];

      if (dataType === "nsf") {
        updatedNsfData.push(...newData);
        setNsfData(updatedNsfData);
      } else if (dataType === "cancellation") {
        updatedCancellationData.push(...newData);
        setCancellationData(updatedCancellationData);
      }

      const combined = [...updatedNsfData, ...updatedCancellationData];
      setData(combined);
      setFilteredData(combined);
      calculateAnalytics(combined);
      calculateDataFreshness(combined);
      await generateActionItems(combined);

      // Show error to user
      alert(
        `Error saving to database: ${error.message}\nData is still available in this session.`
      );
    }
  };

  // Drag and Drop Handlers
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        handleFileUpload({ target: { files: [file] } });
      }
    }
  };

  // Parse date helper function
  const parseDate = (dateString) => {
    if (
      !dateString ||
      dateString === "" ||
      dateString === "null" ||
      dateString === "undefined"
    ) {
      return null;
    }

    // Convert to string and clean up
    const dateStr = dateString.toString().trim();

    // Handle various empty/null cases
    if (
      dateStr === "" ||
      dateStr === "null" ||
      dateStr === "undefined" ||
      dateStr === "NaN"
    ) {
      return null;
    }

    try {
      // Try parsing as-is first (handles ISO dates, standard formats)
      let date = new Date(dateStr);

      // If that fails, try specific patterns
      if (isNaN(date.getTime())) {
        // Try MM/DD/YYYY format
        const mmddyyyy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (mmddyyyy) {
          const [, month, day, year] = mmddyyyy;
          date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }

        // Try DD/MM/YYYY format (European)
        else if (dateStr.includes("/") && dateStr.split("/").length === 3) {
          const parts = dateStr.split("/");
          if (parts[2].length === 4) {
            // YYYY at the end
            // Assume MM/DD/YYYY if first part <= 12, otherwise DD/MM/YYYY
            if (parseInt(parts[0]) <= 12) {
              date = new Date(
                parseInt(parts[2]),
                parseInt(parts[0]) - 1,
                parseInt(parts[1])
              );
            } else {
              date = new Date(
                parseInt(parts[2]),
                parseInt(parts[1]) - 1,
                parseInt(parts[0])
              );
            }
          }
        }

        // Try YYYY-MM-DD format
        else if (dateStr.includes("-")) {
          const parts = dateStr.split("-");
          if (parts.length === 3 && parts[0].length === 4) {
            date = new Date(
              parseInt(parts[0]),
              parseInt(parts[1]) - 1,
              parseInt(parts[2])
            );
          }
        }

        // Try YYYYMMDD format (e.g., "20250513")
        else if (/^\d{8}$/.test(dateStr)) {
          const year = parseInt(dateStr.substring(0, 4));
          const month = parseInt(dateStr.substring(4, 6));
          const day = parseInt(dateStr.substring(6, 8));
          if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            date = new Date(year, month - 1, day);
          }
        }

        // Try Excel serial number (days since 1900-01-01)
        else if (/^\d+$/.test(dateStr)) {
          const serialNumber = parseInt(dateStr);
          if (serialNumber > 1 && serialNumber < 100000) {
            // Reasonable range for Excel dates
            const excelEpoch = new Date(1900, 0, 1);
            date = new Date(
              excelEpoch.getTime() + (serialNumber - 2) * 24 * 60 * 60 * 1000
            );
          }
        }
      }

      // Final validation
      if (
        isNaN(date.getTime()) ||
        date.getFullYear() < 1900 ||
        date.getFullYear() > 2100
      ) {
        console.warn(`Could not parse date: "${dateString}"`);
        return null;
      }

      return date;
    } catch (error) {
      console.warn(`Error parsing date "${dateString}":`, error);
      return null;
    }
  };

  // Calculate duration between dates
  const calculateDuration = (startDate, endDate) => {
    if (!startDate || !endDate) {
      return null; // Return null instead of 0 for missing dates
    }

    // Use parseDate function for consistent parsing
    const start = parseDate(startDate);
    const end = parseDate(endDate);

    // Check if dates are valid
    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
      return null;
    }

    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Return null for unreasonable durations
    if (diffDays < 0 || diffDays > 36500) {
      // ~100 years max
      return null;
    }

    return diffDays;
  };

  // Calculate Enhanced Analytics for Combined Data Types
  const calculateAnalytics = (policyData) => {
    if (policyData.length === 0) {
      setAnalytics({});
      return;
    }

    // Separate data by type
    const nsfPolicies = policyData.filter(
      (p) => p.source === "nsf" || p.termination_type === "nsf"
    );
    const cancellationPolicies = policyData.filter(
      (p) =>
        p.source === "cancellation" || p.termination_type === "cancellation"
    );

    const totalPolicies = policyData.length;
    const nsfCount = nsfPolicies.length;
    const cancellationCount = cancellationPolicies.length;

    // Duration analysis
    const validDurations = policyData
      .filter((p) => p.duration != null && p.duration > 0)
      .map((p) => p.duration);
    const avgDuration =
      validDurations.length > 0
        ? validDurations.reduce((sum, duration) => sum + duration, 0) /
          validDurations.length
        : 0;

    // NSF vs Cancellation duration comparison
    const nsfDurations = nsfPolicies
      .filter((p) => p.duration != null && p.duration > 0)
      .map((p) => p.duration);
    const cancellationDurations = cancellationPolicies
      .filter((p) => p.duration != null && p.duration > 0)
      .map((p) => p.duration);

    const avgNsfDuration =
      nsfDurations.length > 0
        ? nsfDurations.reduce((sum, d) => sum + d, 0) / nsfDurations.length
        : 0;
    const avgCancellationDuration =
      cancellationDurations.length > 0
        ? cancellationDurations.reduce((sum, d) => sum + d, 0) /
          cancellationDurations.length
        : 0;

    const totalPremium = policyData.reduce(
      (sum, policy) => sum + (policy.annual_premium || 0),
      0
    );

    // Premium distribution with percentages
    const premiumDistribution = {
      "Under $500": policyData.filter((p) => p.annual_premium < 500).length,
      "$500-1000": policyData.filter(
        (p) => p.annual_premium >= 500 && p.annual_premium < 1000
      ).length,
      "$1000-2000": policyData.filter(
        (p) => p.annual_premium >= 1000 && p.annual_premium < 2000
      ).length,
      "$2000+": policyData.filter((p) => p.annual_premium >= 2000).length,
    };

    // Termination type distribution
    const terminationDistribution = [
      {
        name: "NSF",
        value: nsfCount,
        percentage: ((nsfCount / totalPolicies) * 100).toFixed(1),
      },
      {
        name: "Cancellation",
        value: cancellationCount,
        percentage: ((cancellationCount / totalPolicies) * 100).toFixed(1),
      },
    ];

    // Enhanced Product performance
    const productPerformance = {};
    policyData.forEach((policy) => {
      const product = policy.product || policy.Product || "Unknown";
      if (!productPerformance[product]) {
        productPerformance[product] = {
          count: 0,
          totalPremium: 0,
          durations: [],
          avgDuration: 0,
          avgPremium: 0,
          nsfCount: 0,
          cancellationCount: 0,
          terminationRate: 0,
        };
      }
      productPerformance[product].count++;
      productPerformance[product].totalPremium += policy.annual_premium || 0;

      if (policy.source === "nsf" || policy.termination_type === "nsf") {
        productPerformance[product].nsfCount++;
      } else if (
        policy.source === "cancellation" ||
        policy.termination_type === "cancellation"
      ) {
        productPerformance[product].cancellationCount++;
      }

      if (policy.duration != null && policy.duration > 0) {
        productPerformance[product].durations.push(policy.duration);
      }
    });

    // Calculate averages for products
    Object.keys(productPerformance).forEach((product) => {
      const perf = productPerformance[product];
      perf.avgPremium = perf.count > 0 ? perf.totalPremium / perf.count : 0;
      perf.avgDuration =
        perf.durations.length > 0
          ? perf.durations.reduce((sum, d) => sum + d, 0) /
            perf.durations.length
          : 0;
      perf.terminationRate = (
        ((perf.nsfCount + perf.cancellationCount) / perf.count) *
        100
      ).toFixed(1);
    });

    // Enhanced Agent performance
    const agentPerformance = {};
    policyData.forEach((policy) => {
      const agent = policy.agent_name || policy.WA_Name || "Unknown";
      if (!agentPerformance[agent]) {
        agentPerformance[agent] = {
          count: 0,
          totalPremium: 0,
          durations: [],
          avgDuration: 0,
          avgPremium: 0,
          nsfCount: 0,
          cancellationCount: 0,
          riskScore: 0,
          retentionScore: 0,
        };
      }
      agentPerformance[agent].count++;
      agentPerformance[agent].totalPremium += policy.annual_premium || 0;

      if (policy.source === "nsf" || policy.termination_type === "nsf") {
        agentPerformance[agent].nsfCount++;
      } else if (
        policy.source === "cancellation" ||
        policy.termination_type === "cancellation"
      ) {
        agentPerformance[agent].cancellationCount++;
      }

      if (policy.duration != null && policy.duration > 0) {
        agentPerformance[agent].durations.push(policy.duration);
      }
    });

    // Calculate averages and risk scores for agents
    Object.keys(agentPerformance).forEach((agent) => {
      const perf = agentPerformance[agent];
      perf.avgPremium = perf.count > 0 ? perf.totalPremium / perf.count : 0;
      perf.avgDuration =
        perf.durations.length > 0
          ? perf.durations.reduce((sum, d) => sum + d, 0) /
            perf.durations.length
          : 0;

      // Enhanced risk scoring: NSF = high risk, Cancellation = medium risk
      perf.riskScore =
        perf.nsfCount * 3 +
        perf.cancellationCount * 1.5 +
        (perf.avgDuration < 30 ? perf.count : 0);

      // Retention score: higher duration = better retention
      perf.retentionScore = Math.max(
        0,
        100 - ((perf.nsfCount + perf.cancellationCount) / perf.count) * 100
      );
    });

    // Termination Reasons analysis
    const terminationReasons = {};
    policyData.forEach((policy) => {
      const reason = policy.termination_reason || policy.Reason || "Unknown";
      terminationReasons[reason] = (terminationReasons[reason] || 0) + 1;
    });

    // Geographic distribution with termination breakdown
    const stateDistribution = {};
    policyData.forEach((policy) => {
      const state = policy.issue_state || "Unknown";
      if (!stateDistribution[state]) {
        stateDistribution[state] = {
          count: 0,
          totalPremium: 0,
          avgPremium: 0,
          nsfCount: 0,
          cancellationCount: 0,
          terminationRate: 0,
        };
      }
      stateDistribution[state].count++;
      stateDistribution[state].totalPremium += policy.annual_premium || 0;

      if (policy.source === "nsf" || policy.termination_type === "nsf") {
        stateDistribution[state].nsfCount++;
      } else if (
        policy.source === "cancellation" ||
        policy.termination_type === "cancellation"
      ) {
        stateDistribution[state].cancellationCount++;
      }
    });

    // Calculate state averages and termination rates
    Object.keys(stateDistribution).forEach((state) => {
      const dist = stateDistribution[state];
      dist.avgPremium = dist.count > 0 ? dist.totalPremium / dist.count : 0;
      dist.terminationRate = (
        ((dist.nsfCount + dist.cancellationCount) / dist.count) *
        100
      ).toFixed(1);
    });

    // Timing insights
    const currentDate = new Date();
    const recentTerminations = policyData.filter((p) => {
      if (!p.paid_to_date) return false;
      const daysSince = Math.ceil(
        (currentDate - p.paid_to_date) / (1000 * 60 * 60 * 24)
      );
      return daysSince <= 30;
    }).length;

    const urgentRecovery = policyData.filter((p) => {
      if (!p.paid_to_date || !p.annual_premium) return false;
      const daysSince = Math.ceil(
        (currentDate - p.paid_to_date) / (1000 * 60 * 60 * 24)
      );
      return daysSince <= 60 && p.annual_premium >= 1500;
    }).length;

    // High-value cancellation recovery opportunities
    const highValueCancellations = cancellationPolicies.filter(
      (p) => p.annual_premium >= 1000 && p.duration <= 90
    ).length;

    // Enhanced insights
    const insights = {
      highRiskAgents: Object.entries(agentPerformance)
        .filter(([_, perf]) => perf.riskScore > 15)
        .sort((a, b) => b[1].riskScore - a[1].riskScore)
        .slice(0, 5)
        .map(([agent, perf]) => ({
          agent,
          riskScore: perf.riskScore.toFixed(1),
          nsfCount: perf.nsfCount,
          cancellationCount: perf.cancellationCount,
          retentionScore: perf.retentionScore.toFixed(1),
        })),

      topProducts: Object.entries(productPerformance)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([product, perf]) => ({
          product,
          count: perf.count,
          avgPremium: perf.avgPremium,
          terminationRate: perf.terminationRate,
          nsfCount: perf.nsfCount,
          cancellationCount: perf.cancellationCount,
        })),

      topStates: Object.entries(stateDistribution)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([state, dist]) => ({
          state,
          count: dist.count,
          avgPremium: dist.avgPremium,
          terminationRate: dist.terminationRate,
          nsfCount: dist.nsfCount,
          cancellationCount: dist.cancellationCount,
        })),

      recentTerminations,
      urgentRecovery,
      highValueCancellations,
      avgPremium: totalPolicies > 0 ? totalPremium / totalPolicies : 0,
      medianDuration: getMedian(validDurations),
    };

    setAnalytics({
      totalPolicies,
      nsfCount,
      cancellationCount,
      avgDuration: Math.round(avgDuration) || 0,
      avgNsfDuration: Math.round(avgNsfDuration) || 0,
      avgCancellationDuration: Math.round(avgCancellationDuration) || 0,
      totalPremium,
      premiumDistribution,
      terminationDistribution,
      productPerformance,
      agentPerformance,
      terminationReasons,
      stateDistribution,
      insights,
    });
  };

  // Helper function to calculate median
  const getMedian = (numbers) => {
    if (numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  // Generate Action Items and Retention Tasks
  const generateActionItems = async (policyData) => {
    try {
      // Generate traditional action items
      const actionGenerator = new ActionGenerator();
      const generatedActions = actionGenerator.generateActions(policyData);
      setActions(generatedActions);

      // Generate retention tasks for the team
      const tasks = await twilioTaskService.generateRetentionTasks(policyData);
      const taskArray = Array.isArray(tasks) ? tasks : [];
      setRetentionTasks(taskArray);

      // Send notifications for high-priority tasks
      for (const task of taskArray.filter((t) => t.priority === "high")) {
        await twilioTaskService.sendTaskNotification(task);
        await twilioTaskService.saveTask(task);
      }

      console.log(`📋 Generated ${taskArray.length} retention tasks`);
    } catch (error) {
      console.error("Error generating actions:", error);
    }
  };

  // Dynamic Data Query System
  const applyFilters = useCallback(
    (sourceData) => {
      let filtered = [...sourceData];

      // Apply filters
      if (filters.dateRange.start) {
        filtered = filtered.filter(
          (item) =>
            new Date(item.issue_date) >= new Date(filters.dateRange.start)
        );
      }
      if (filters.dateRange.end) {
        filtered = filtered.filter(
          (item) => new Date(item.issue_date) <= new Date(filters.dateRange.end)
        );
      }
      if (filters.product) {
        filtered = filtered.filter((item) =>
          (item.Product || item.product)
            ?.toLowerCase()
            .includes(filters.product.toLowerCase())
        );
      }
      if (filters.agent) {
        filtered = filtered.filter((item) =>
          (item.WA_Name || item.agent_name)
            ?.toLowerCase()
            .includes(filters.agent.toLowerCase())
        );
      }
      if (filters.premiumRange) {
        const [min, max] = filters.premiumRange.split("-").map(Number);
        filtered = filtered.filter((item) => {
          if (max)
            return item.annual_premium >= min && item.annual_premium <= max;
          return item.annual_premium >= min;
        });
      }
      if (filters.state) {
        filtered = filtered.filter((item) =>
          item.issue_state?.toLowerCase().includes(filters.state.toLowerCase())
        );
      }
      if (filters.reason) {
        filtered = filtered.filter(
          (item) =>
            item.Reason?.toLowerCase().includes(filters.reason.toLowerCase()) ||
            item.termination_reason
              ?.toLowerCase()
              .includes(filters.reason.toLowerCase())
        );
      }
      if (filters.dataSource && filters.dataSource !== "all") {
        filtered = filtered.filter(
          (item) =>
            item.source === filters.dataSource ||
            item.termination_type === filters.dataSource
        );
      }
      if (filters.terminationType && filters.terminationType !== "all") {
        filtered = filtered.filter(
          (item) =>
            item.termination_type === filters.terminationType ||
            item.source === filters.terminationType
        );
      }

      // Apply search
      if (searchTerm) {
        filtered = filtered.filter((item) =>
          Object.values(item).some((value) =>
            value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
          )
        );
      }

      return filtered;
    },
    [filters, searchTerm]
  );

  // Filter and Sort Logic with Dynamic Analytics
  useEffect(() => {
    const filtered = applyFilters(data);

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    setFilteredData(filtered);

    // Calculate analytics on filtered data for dynamic insights
    if (filtered.length > 0) {
      calculateAnalytics(filtered);
    }

    setCurrentPage(1);
  }, [data, filters, searchTerm, sortConfig, applyFilters]);

  // Effect to update combined data when individual arrays change
  useEffect(() => {
    const combined = [...nsfData, ...cancellationData];
    if (combined.length !== data.length) {
      console.log(
        `🔄 Updating combined data: NSF: ${nsfData.length}, Cancellation: ${cancellationData.length}, Total: ${combined.length}`
      );
      setData(combined);
      setFilteredData(combined);
      if (combined.length > 0) {
        calculateAnalytics(combined);
        calculateDataFreshness(combined);
      }
    }
  }, [nsfData, cancellationData, data.length]);

  // Sort handler
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Email handlers
  const handleSendEmail = async (type, data) => {
    try {
      setLoading(true);
      await emailService.sendEmail(type, data);
      alert("Email sent successfully!");
    } catch (error) {
      console.error("Email sending failed:", error);
      alert("Failed to send email");
    } finally {
      setLoading(false);
    }
  };

  // N8N workflow trigger
  const triggerWorkflow = async (workflowType, data) => {
    try {
      setLoading(true);
      await n8nService.triggerWorkflow(workflowType, data);
      alert("Workflow triggered successfully!");
    } catch (error) {
      console.error("Workflow trigger failed:", error);
      alert("Failed to trigger workflow");
    } finally {
      setLoading(false);
    }
  };

  // Export data
  const exportData = () => {
    const csv = Papa.unparse(filteredData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "policy-data-export.csv");
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Task Management Handlers
  const handleTaskUpdate = async (taskId, status) => {
    try {
      setRetentionTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status,
                completed_at: status === "completed" ? new Date() : null,
              }
            : task
        )
      );

      // Update task in database
      const { error } = await DatabaseService.supabase
        .from("retention_tasks")
        .update({
          status,
          completed_at:
            status === "completed" ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("task_id", taskId);

      if (error) {
        console.error("Error updating task:", error);
      } else {
        console.log(`✅ Task ${taskId} updated to ${status}`);
      }
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const clearDatabase = async () => {
    if (
      window.confirm(
        "Are you sure you want to clear all data from the database? This action cannot be undone."
      )
    ) {
      try {
        setDbLoading(true);
        await DatabaseService.clearAllPolicies();

        // Clear local state
        setData([]);
        setNsfData([]);
        setCancellationData([]);
        setFilteredData([]);
        setRetentionTasks([]);
        setActions([]);

        console.log("✅ Database cleared successfully");
        alert("Database cleared successfully!");
      } catch (error) {
        console.error("❌ Error clearing database:", error);
        alert("Failed to clear database. Please try again.");
      } finally {
        setDbLoading(false);
      }
    }
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // Dynamic Chart data based on filtered results
  const chartData = useMemo(() => {
    const sourceData = filteredData.length > 0 ? filteredData : data;
    if (sourceData.length === 0)
      return {
        premiumDistribution: [],
        productPerformance: [],
        terminationDistribution: [],
        terminationReasons: [],
        agentPerformance: [],
        monthlyTrends: [],
      };

    // Premium distribution
    const premiumRanges = {
      "Under $500": 0,
      "$500 - $1,000": 0,
      "$1,000 - $2,000": 0,
      "$2,000+": 0,
    };

    sourceData.forEach((item) => {
      const premium = item.annual_premium || 0;
      if (premium < 500) premiumRanges["Under $500"]++;
      else if (premium < 1000) premiumRanges["$500 - $1,000"]++;
      else if (premium < 2000) premiumRanges["$1,000 - $2,000"]++;
      else premiumRanges["$2,000+"]++;
    });

    const premiumDistribution = Object.entries(premiumRanges).map(
      ([name, value]) => ({ name, value })
    );

    // Product performance - count NSFs and cancellations per product
    const productCounts = {};
    sourceData.forEach((item) => {
      const product = item.Product || item.product || "Unknown";
      if (!productCounts[product]) {
        productCounts[product] = {
          name: product,
          nsf: 0,
          cancellation: 0,
          count: 0,
          premium: 0,
          nsfCount: 0,
          cancellationCount: 0,
          terminationRate: 0,
        };
      }
      productCounts[product].count++;
      productCounts[product].premium += item.annual_premium || 0;

      if (item.source === "nsf" || item.termination_type === "nsf") {
        productCounts[product].nsf++;
        productCounts[product].nsfCount++;
      } else {
        productCounts[product].cancellation++;
        productCounts[product].cancellationCount++;
      }
    });

    const productPerformance = Object.values(productCounts)
      .map((product) => ({
        ...product,
        terminationRate: (
          ((product.nsf + product.cancellation) / product.count) *
          100
        ).toFixed(1),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Termination distribution (NSF vs Cancellation)
    const terminationCounts = { NSF: 0, Cancellation: 0 };
    sourceData.forEach((item) => {
      if (item.source === "nsf" || item.termination_type === "nsf") {
        terminationCounts.NSF++;
      } else {
        terminationCounts.Cancellation++;
      }
    });

    const terminationDistribution = Object.entries(terminationCounts).map(
      ([name, value]) => ({ name, value })
    );

    // Termination reasons
    const reasonCounts = {};
    sourceData.forEach((item) => {
      const reason = item.termination_reason || item.Reason || "Unknown";
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });

    const terminationReasons = Object.entries(reasonCounts).map(
      ([name, value]) => ({ name, value })
    );

    // Agent performance (top 10 by volume)
    const agentCounts = {};
    sourceData.forEach((item) => {
      const agent = item.agent_name || item.WA_Name || "Unknown";
      if (!agentCounts[agent]) {
        agentCounts[agent] = { name: agent, count: 0, nsf: 0, cancellation: 0 };
      }
      agentCounts[agent].count++;
      if (item.source === "nsf" || item.termination_type === "nsf") {
        agentCounts[agent].nsf++;
      } else {
        agentCounts[agent].cancellation++;
      }
    });

    const agentPerformance = Object.values(agentCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Monthly trends
    const monthlyData = {};
    sourceData.forEach((item) => {
      const date = new Date(item.issue_date);
      if (!isNaN(date.getTime())) {
        const monthKey = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: monthKey,
            nsf: 0,
            cancellation: 0,
            total: 0,
          };
        }
        monthlyData[monthKey].total++;
        if (item.source === "nsf" || item.termination_type === "nsf") {
          monthlyData[monthKey].nsf++;
        } else {
          monthlyData[monthKey].cancellation++;
        }
      }
    });

    const monthlyTrends = Object.values(monthlyData)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Last 12 months

    return {
      premiumDistribution,
      productPerformance,
      terminationDistribution,
      terminationReasons,
      agentPerformance,
      monthlyTrends,
    };
  }, [filteredData, data]);

  // Navigation items
  const navigationItems = [
    { id: "dashboard", name: "Dashboard", icon: TrendingUp },
    {
      id: "tasks",
      name: "Tasks",
      icon: CheckCircle,
      badge: Array.isArray(retentionTasks)
        ? retentionTasks.filter((t) => t.status === "open").length
        : 0,
    },
    { id: "analytics", name: "Analytics", icon: DollarSign },
  ];

  // Mobile Navigation Component
  const MobileNavigation = () => (
    <div className="md:hidden bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-lg font-semibold text-gray-900">
          {navigationItems.find((item) => item.id === currentView)?.name}
        </h2>
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <Users className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {showMobileMenu && (
        <div className="border-t border-gray-200 bg-gray-50">
          <div className="grid grid-cols-3 gap-1 p-2">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id);
                  setShowMobileMenu(false);
                }}
                className={`
                  flex flex-col items-center space-y-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors relative
                  ${
                    currentView === item.id
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100"
                  }
                `}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
                {item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Desktop Navigation Component
  const DesktopNavigation = () => (
    <div className="hidden md:flex bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`
                flex items-center space-x-2 px-1 py-4 border-b-2 text-sm font-medium transition-colors relative
                ${
                  currentView === item.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }
              `}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
              {item.badge > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center ml-2">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className={`flex ${
              isMobile ? "flex-col space-y-4" : "justify-between items-center"
            } py-6`}
          >
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-xl shadow-lg">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1
                  className={`${
                    isMobile ? "text-xl" : "text-3xl"
                  } font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent`}
                >
                  Policy Persistency Tracker
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Insurance NSF Analysis & Action Management
                </p>
              </div>
            </div>

            <div
              className={`flex ${
                isMobile ? "flex-col space-y-2" : "items-center space-x-3"
              }`}
            >
              {/* Database Status */}
              <div className="flex items-center space-x-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    dbConnected ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span className="text-xs text-gray-600">
                  {dbConnected ? "Database Connected" : "Database Disconnected"}
                </span>
              </div>

              {/* Data Freshness Indicator */}
              {dataFreshness && (
                <div
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${
                    dataFreshness.color === "green"
                      ? "bg-green-50 text-green-700 border-green-200"
                      : dataFreshness.color === "yellow"
                      ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                      : dataFreshness.color === "orange"
                      ? "bg-orange-50 text-orange-700 border-orange-200"
                      : "bg-red-50 text-red-700 border-red-200"
                  }`}
                >
                  <span className="mr-1">{dataFreshness.icon}</span>
                  {dataFreshness.message}
                </div>
              )}

              <div
                className={`flex ${
                  isMobile ? "flex-col space-y-2" : "items-center space-x-3"
                }`}
              >
                <div className="text-sm text-gray-600">
                  Showing {filteredData.length} of {data.length} records
                </div>

                <div
                  className={`flex ${
                    isMobile ? "flex-col space-y-2" : "space-x-2"
                  }`}
                >
                  <button
                    onClick={() => setShowActionQueue(true)}
                    className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-green-700 text-white rounded-xl shadow-lg hover:from-emerald-700 hover:to-green-800 transition-all duration-200 transform hover:scale-105 relative"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">Actions</span>
                    {actions.length > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold shadow-lg animate-bounce-subtle">
                        {actions.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={loadDataFromDatabase}
                    disabled={dbLoading}
                    className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-105 disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${dbLoading ? "animate-spin" : ""}`}
                    />
                    <span className="font-medium">Refresh</span>
                  </button>

                  <button
                    onClick={exportData}
                    className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl shadow-lg hover:from-slate-700 hover:to-slate-800 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    disabled={filteredData.length === 0}
                  >
                    <Download className="h-4 w-4" />
                    <span className="font-medium">Export</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <MobileNavigation />
      <DesktopNavigation />

      {/* Main Content */}
      <div className="flex-1">
        {currentView === "tasks" && (
          <TaskDashboard
            tasks={retentionTasks}
            onTaskUpdate={handleTaskUpdate}
          />
        )}

        {currentView === "dashboard" && (
          <div className="flex min-h-screen">
            {/* Sidebar Filters - Always Visible */}
            {data.length > 0 && (
              <aside className="w-80 bg-white/70 backdrop-blur-sm shadow-xl border-r border-gray-200 p-6 overflow-y-auto">
                <div className="sticky top-0">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <Filter className="h-5 w-5 mr-2 text-blue-600" />
                      Smart Filters
                    </div>
                    <div className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {filteredData.length}
                    </div>
                  </h3>

                  {/* Data Source Summary */}
                  {data.length > 0 && (
                    <div className="mb-4 p-3 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg">
                      <div className="text-xs text-gray-600 space-y-1">
                        <div className="flex justify-between">
                          <span>NSF Records:</span>
                          <span className="font-medium text-red-600">
                            {nsfData.length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cancellation Records:</span>
                          <span className="font-medium text-yellow-600">
                            {cancellationData.length}
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-gray-300 pt-1">
                          <span>Total Combined:</span>
                          <span className="font-medium text-blue-600">
                            {data.length}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Data Freshness Detail */}
                  {dataFreshness && (
                    <div
                      className={`mb-4 p-3 rounded-lg border ${
                        dataFreshness.color === "green"
                          ? "bg-green-50 border-green-200"
                          : dataFreshness.color === "yellow"
                          ? "bg-yellow-50 border-yellow-200"
                          : dataFreshness.color === "orange"
                          ? "bg-orange-50 border-orange-200"
                          : "bg-red-50 border-red-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-800">
                          Data Freshness
                        </span>
                        <span className="text-lg">{dataFreshness.icon}</span>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        <div className="flex justify-between">
                          <span>Latest Data:</span>
                          <span className="font-medium">
                            {dataFreshness.latestDate}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Age:</span>
                          <span
                            className={`font-medium ${
                              dataFreshness.color === "green"
                                ? "text-green-600"
                                : dataFreshness.color === "yellow"
                                ? "text-yellow-600"
                                : dataFreshness.color === "orange"
                                ? "text-orange-600"
                                : "text-red-600"
                            }`}
                          >
                            {dataFreshness.daysOld} day
                            {dataFreshness.daysOld === 1 ? "" : "s"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Active Filters Indicator */}
                  {Object.values(filters).some((value) =>
                    typeof value === "string"
                      ? value !== ""
                      : value.start !== "" || value.end !== ""
                  ) && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-800">
                          Filters Active
                        </span>
                        <button
                          onClick={() =>
                            setFilters({
                              dateRange: { start: "", end: "" },
                              product: "",
                              agent: "",
                              premiumRange: "",
                              state: "",
                              reason: "",
                              dataSource: "",
                              terminationType: "",
                            })
                          }
                          className="text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Data Source Toggle */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data Source
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() =>
                          setFilters((prev) => ({ ...prev, dataSource: "" }))
                        }
                        className={`px-3 py-2 text-xs rounded-lg font-medium transition-all ${
                          !filters.dataSource
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() =>
                          setFilters((prev) => ({ ...prev, dataSource: "nsf" }))
                        }
                        className={`px-3 py-2 text-xs rounded-lg font-medium transition-all ${
                          filters.dataSource === "nsf"
                            ? "bg-red-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        NSF
                      </button>
                      <button
                        onClick={() =>
                          setFilters((prev) => ({
                            ...prev,
                            dataSource: "cancellation",
                          }))
                        }
                        className={`px-3 py-2 text-xs rounded-lg font-medium transition-all ${
                          filters.dataSource === "cancellation"
                            ? "bg-yellow-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>

                  {/* Date Range */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date Range
                    </label>
                    <div className="space-y-2">
                      <input
                        type="date"
                        value={filters.dateRange.start}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            dateRange: {
                              ...prev.dateRange,
                              start: e.target.value,
                            },
                          }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="Start Date"
                      />
                      <input
                        type="date"
                        value={filters.dateRange.end}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            dateRange: {
                              ...prev.dateRange,
                              end: e.target.value,
                            },
                          }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="End Date"
                      />
                    </div>
                  </div>

                  {/* Premium Range */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Premium Range
                    </label>
                    <select
                      value={filters.premiumRange}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          premiumRange: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">All Ranges</option>
                      <option value="0-500">Under $500</option>
                      <option value="500-1000">$500 - $1,000</option>
                      <option value="1000-2000">$1,000 - $2,000</option>
                      <option value="2000-999999">$2,000+</option>
                    </select>
                  </div>

                  {/* Product Filter */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product
                    </label>
                    <input
                      type="text"
                      value={filters.product}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          product: e.target.value,
                        }))
                      }
                      placeholder="Search products..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>

                  {/* Agent Filter */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Agent
                    </label>
                    <input
                      type="text"
                      value={filters.agent}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          agent: e.target.value,
                        }))
                      }
                      placeholder="Search agents..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>

                  {/* State Filter */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State
                    </label>
                    <input
                      type="text"
                      value={filters.state}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          state: e.target.value,
                        }))
                      }
                      placeholder="Search states..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>

                  {/* Clear Filters */}
                  <button
                    onClick={() =>
                      setFilters({
                        dateRange: { start: "", end: "" },
                        product: "",
                        agent: "",
                        premiumRange: "",
                        state: "",
                        reason: "",
                        dataSource: "",
                        terminationType: "",
                      })
                    }
                    className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 flex items-center justify-center"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Clear All Filters
                  </button>

                  {/* Filter Impact Summary */}
                  {filteredData.length !== data.length && (
                    <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">
                        Filter Impact
                      </h4>
                      <div className="space-y-1 text-xs text-blue-700">
                        <div className="flex justify-between">
                          <span>Original Records:</span>
                          <span className="font-medium">{data.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Filtered Records:</span>
                          <span className="font-medium">
                            {filteredData.length}
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-blue-200 pt-1">
                          <span>Filtered Out:</span>
                          <span className="font-medium text-red-600">
                            {data.length - filteredData.length} (
                            {(
                              ((data.length - filteredData.length) /
                                data.length) *
                              100
                            ).toFixed(1)}
                            %)
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </aside>
            )}

            {/* Main Content Area */}
            <main
              className={`flex-1 px-4 sm:px-6 lg:px-8 py-8 ${
                data.length > 0 ? "" : "max-w-7xl mx-auto"
              }`}
            >
              {/* Enhanced Multi-File Upload Section */}
              {data.length === 0 && (
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-8 mb-8 animate-fade-in">
                  {/* Upload Mode Selection */}
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      Select Data Type
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => setUploadMode("detect")}
                        className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                          uploadMode === "detect"
                            ? "bg-blue-600 text-white shadow-lg"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        Auto-Detect
                      </button>
                      <button
                        onClick={() => setUploadMode("nsf")}
                        className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                          uploadMode === "nsf"
                            ? "bg-red-600 text-white shadow-lg"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        NSF Data
                      </button>
                      <button
                        onClick={() => setUploadMode("cancellation")}
                        className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                          uploadMode === "cancellation"
                            ? "bg-yellow-600 text-white shadow-lg"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        Cancellation Data
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {uploadMode === "detect" &&
                        "Automatically detect file type based on column headers"}
                      {uploadMode === "nsf" &&
                        "Upload NSF (Non-Sufficient Funds) policy data"}
                      {uploadMode === "cancellation" &&
                        "Upload voluntary cancellation policy data"}
                    </p>
                  </div>

                  <div
                    className="border-2 border-dashed border-blue-300 rounded-2xl p-12 text-center hover:border-blue-500 hover:bg-blue-50/50 transition-all duration-300 group"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 rounded-2xl w-16 h-16 mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                      <Upload className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">
                      Upload Policy Data
                    </h3>
                    <p className="text-gray-600 mb-6 text-lg">
                      Drag and drop your CSV file here, or click to browse
                    </p>
                    <p className="text-sm text-gray-500 mb-6">
                      Supports both NSF and Cancellation data formats
                    </p>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:from-blue-700 hover:to-indigo-700 cursor-pointer transition-all duration-200 transform hover:scale-105"
                    >
                      <Upload className="h-5 w-5 mr-2" />
                      Choose File
                    </label>
                    {loading && (
                      <div className="mt-6">
                        <div className="bg-gray-200 rounded-full h-3 shadow-inner">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-300 shadow-sm"
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                        <p className="text-sm text-gray-500 mt-2 animate-pulse">
                          Processing your file...
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Data Summary - Show even when data exists */}
              {data.length > 0 && (
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-6 mb-8">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Data Summary
                      </h3>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <span>NSF Records: {analytics.nsfCount || 0}</span>
                        <span>
                          Cancellation Records:{" "}
                          {analytics.cancellationCount || 0}
                        </span>
                        <span>
                          Total Records: {analytics.totalPolicies || 0}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {/* Database Status Indicator */}
                      <div className="flex items-center px-3 py-2 rounded-lg bg-gray-100 text-sm">
                        <Database
                          className={`h-4 w-4 mr-2 ${
                            dbConnected ? "text-green-600" : "text-red-600"
                          }`}
                        />
                        <span
                          className={
                            dbConnected ? "text-green-700" : "text-red-700"
                          }
                        >
                          {dbConnected ? "Connected" : "Disconnected"}
                        </span>
                      </div>

                      {/* Refresh Data Button */}
                      <button
                        onClick={loadDataFromDatabase}
                        disabled={dbLoading}
                        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg shadow-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
                      >
                        <RefreshCw
                          className={`h-4 w-4 mr-2 ${
                            dbLoading ? "animate-spin" : ""
                          }`}
                        />
                        {dbLoading ? "Loading..." : "Refresh"}
                      </button>

                      {/* Clear Database Button */}
                      <button
                        onClick={async () => {
                          if (
                            window.confirm(
                              "Are you sure you want to clear all data from the database? This action cannot be undone."
                            )
                          ) {
                            try {
                              setDbLoading(true);
                              await DatabaseService.clearAllPolicies();
                              setData([]);
                              setNsfData([]);
                              setCancellationData([]);
                              setFilteredData([]);
                              setAnalytics({});
                              setDataFreshness(null);
                              setActions([]);
                              console.log("✅ Database cleared successfully");
                              alert("Database cleared successfully!");
                            } catch (error) {
                              console.error(
                                "❌ Error clearing database:",
                                error
                              );
                              alert(
                                `Error clearing database: ${error.message}`
                              );
                            } finally {
                              setDbLoading(false);
                            }
                          }
                        }}
                        disabled={dbLoading}
                        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white font-medium rounded-lg shadow-lg hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Clear DB
                      </button>

                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="add-file-upload"
                      />
                      <label
                        htmlFor="add-file-upload"
                        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-lg shadow-lg hover:from-green-700 hover:to-emerald-700 cursor-pointer transition-all duration-200 transform hover:scale-105"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add More Data
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Analytics Dashboard */}
              {data.length > 0 && (
                <>
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">
                            Total Policies
                          </p>
                          <p className="text-3xl font-bold text-gray-900 mt-2">
                            {analytics.totalPolicies?.toLocaleString() || 0}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            NSF: {analytics.nsfCount || 0} | Cancellations:{" "}
                            {analytics.cancellationCount || 0}
                          </p>
                        </div>
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3 rounded-xl shadow-lg">
                          <Users className="h-8 w-8 text-white" />
                        </div>
                      </div>
                    </div>
                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">
                            Total Premium
                          </p>
                          <p className="text-3xl font-bold text-gray-900 mt-2">
                            ${analytics.totalPremium?.toLocaleString() || 0}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Avg: $
                            {Math.round(
                              analytics.insights?.avgPremium || 0
                            ).toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-gradient-to-r from-emerald-500 to-green-600 p-3 rounded-xl shadow-lg">
                          <DollarSign className="h-8 w-8 text-white" />
                        </div>
                      </div>
                    </div>
                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">
                            Avg Duration
                          </p>
                          <p className="text-3xl font-bold text-gray-900 mt-2">
                            {analytics.avgDuration || 0} days
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            NSF: {analytics.avgNsfDuration || 0}d | Cancel:{" "}
                            {analytics.avgCancellationDuration || 0}d
                          </p>
                        </div>
                        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-3 rounded-xl shadow-lg">
                          <Calendar className="h-8 w-8 text-white" />
                        </div>
                      </div>
                    </div>
                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">
                            Urgent Actions
                          </p>
                          <p className="text-3xl font-bold text-gray-900 mt-2">
                            {analytics.insights?.urgentRecovery || 0}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            High-Value Cancel:{" "}
                            {analytics.insights?.highValueCancellations || 0}
                          </p>
                        </div>
                        <div className="bg-gradient-to-r from-red-500 to-red-600 p-3 rounded-xl shadow-lg">
                          <AlertTriangle className="h-8 w-8 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Insights Panel */}
                  {analytics.insights && (
                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-6 mb-8">
                      <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                        <TrendingUp className="h-6 w-6 mr-2 text-blue-600" />
                        Smart Insights
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* High Risk Agents */}
                        <div className="bg-gradient-to-br from-red-50 to-orange-50 p-4 rounded-xl border border-red-200">
                          <h4 className="font-semibold text-red-800 mb-3 flex items-center">
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            High Risk Agents
                          </h4>
                          {analytics.insights.highRiskAgents?.length > 0 ? (
                            <div className="space-y-2">
                              {analytics.insights.highRiskAgents
                                .slice(0, 3)
                                .map((agent, index) => (
                                  <div
                                    key={index}
                                    className="flex justify-between items-center"
                                  >
                                    <span className="text-sm text-gray-700 truncate">
                                      {agent.agent}
                                    </span>
                                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                                      Risk: {agent.riskScore}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-600">
                              No high-risk agents identified
                            </p>
                          )}
                        </div>

                        {/* Top Products */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
                          <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                            <TrendingUp className="h-4 w-4 mr-2" />
                            Top NSF Products
                          </h4>
                          {analytics.insights.topProducts?.length > 0 ? (
                            <div className="space-y-2">
                              {analytics.insights.topProducts
                                .slice(0, 3)
                                .map((product, index) => (
                                  <div
                                    key={index}
                                    className="flex justify-between items-center"
                                  >
                                    <span className="text-sm text-gray-700 truncate">
                                      {product.product}
                                    </span>
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                      {product.count}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-600">
                              No product data available
                            </p>
                          )}
                        </div>

                        {/* Top States */}
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
                          <h4 className="font-semibold text-green-800 mb-3 flex items-center">
                            <DollarSign className="h-4 w-4 mr-2" />
                            Top States by Volume
                          </h4>
                          {analytics.insights.topStates?.length > 0 ? (
                            <div className="space-y-2">
                              {analytics.insights.topStates
                                .slice(0, 3)
                                .map((state, index) => (
                                  <div
                                    key={index}
                                    className="flex justify-between items-center"
                                  >
                                    <span className="text-sm text-gray-700 truncate">
                                      {state.state}
                                    </span>
                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                      {state.count}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-600">
                              No state data available
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Enhanced Charts Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                    {/* Premium Distribution */}
                    <div className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                        <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                        Premium Distribution
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={chartData.premiumDistribution}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) =>
                              `${name} ${(percent * 100).toFixed(0)}%`
                            }
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {chartData.premiumDistribution.map(
                              (entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={COLORS[index % COLORS.length]}
                                />
                              )
                            )}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Termination Distribution */}
                    <div className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                        <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
                        NSF vs Cancellation
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={chartData.terminationDistribution}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) =>
                              `${name} ${(percent * 100).toFixed(0)}%`
                            }
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {chartData.terminationDistribution.map(
                              (entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={
                                    entry.name === "NSF" ? "#ef4444" : "#f59e0b"
                                  }
                                />
                              )
                            )}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Product Performance */}
                    <div className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                        <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                        Top Products
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={chartData.productPerformance.slice(0, 5)}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="name"
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="nsfCount" fill="#ef4444" name="NSF" />
                          <Bar
                            dataKey="cancellationCount"
                            fill="#f59e0b"
                            name="Cancellation"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Agent Performance */}
                    <div className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                        <Users className="h-5 w-5 mr-2 text-purple-600" />
                        Top Agents by Volume
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData.agentPerformance.slice(0, 5)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="name"
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="nsf" fill="#ef4444" name="NSF" />
                          <Bar
                            dataKey="cancellation"
                            fill="#f59e0b"
                            name="Cancellation"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Monthly Trends */}
                    <div className="bg-white rounded-lg shadow p-6 col-span-1 lg:col-span-2">
                      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                        <Calendar className="h-5 w-5 mr-2 text-indigo-600" />
                        Monthly Trends
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData.monthlyTrends}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="nsf"
                            stroke="#ef4444"
                            strokeWidth={2}
                            name="NSF"
                          />
                          <Line
                            type="monotone"
                            dataKey="cancellation"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            name="Cancellation"
                          />
                          <Line
                            type="monotone"
                            dataKey="total"
                            stroke="#06b6d4"
                            strokeWidth={2}
                            name="Total"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Termination Reasons */}
                    <div className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                        <AlertCircle className="h-5 w-5 mr-2 text-orange-600" />
                        Termination Reasons
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={chartData.terminationReasons.slice(0, 8)}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="name"
                            angle={-45}
                            textAnchor="end"
                            height={100}
                          />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" fill="#f97316" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Search and Data Table */}
                  <div className="bg-white rounded-lg shadow">
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium text-gray-900">
                          Policy Data
                        </h3>
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                            <input
                              type="text"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              placeholder="Search all fields..."
                              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <span className="text-sm text-gray-600">
                            {filteredData.length} of {data.length} policies
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            {[
                              "Policy Number",
                              "Agent",
                              "Product",
                              "Premium",
                              "Issue Date",
                              "Duration",
                              "Type",
                              "Reason",
                              "State",
                            ].map((header) => (
                              <th
                                key={header}
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() =>
                                  handleSort(
                                    header.toLowerCase().replace(" ", "_")
                                  )
                                }
                              >
                                <div className="flex items-center space-x-1">
                                  <span>{header}</span>
                                  {sortConfig.key ===
                                    header.toLowerCase().replace(" ", "_") &&
                                    (sortConfig.direction === "asc" ? (
                                      <ArrowUp className="h-4 w-4" />
                                    ) : (
                                      <ArrowDown className="h-4 w-4" />
                                    ))}
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {currentItems.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {item.policy_nbr}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {item.agent_name || item.WA_Name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {item.product || item.Product}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                ${item.annual_premium?.toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(item.issue_date).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <span
                                  className={`px-2 py-1 text-xs rounded-full ${
                                    item.duration == null || item.duration === 0
                                      ? "bg-gray-100 text-gray-800"
                                      : item.duration < 30
                                      ? "bg-red-100 text-red-800"
                                      : item.duration < 90
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-green-100 text-green-800"
                                  }`}
                                >
                                  {item.duration == null || item.duration === 0
                                    ? "Invalid Date"
                                    : `${item.duration} days`}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <span
                                  className={`px-2 py-1 text-xs rounded-full ${
                                    item.source === "nsf" ||
                                    item.termination_type === "nsf"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-yellow-100 text-yellow-800"
                                  }`}
                                >
                                  {item.source === "nsf" ||
                                  item.termination_type === "nsf"
                                    ? "NSF"
                                    : "Cancellation"}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {item.termination_reason || item.Reason}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {item.issue_state}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                        <div className="flex-1 flex justify-between sm:hidden">
                          <button
                            onClick={() =>
                              setCurrentPage((prev) => Math.max(prev - 1, 1))
                            }
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() =>
                              setCurrentPage((prev) =>
                                Math.min(prev + 1, totalPages)
                              )
                            }
                            disabled={currentPage === totalPages}
                            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                          >
                            Next
                          </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm text-gray-700">
                              Showing{" "}
                              <span className="font-medium">
                                {indexOfFirstItem + 1}
                              </span>{" "}
                              to{" "}
                              <span className="font-medium">
                                {Math.min(indexOfLastItem, filteredData.length)}
                              </span>{" "}
                              of{" "}
                              <span className="font-medium">
                                {filteredData.length}
                              </span>{" "}
                              results
                            </p>
                          </div>
                          <div>
                            <nav
                              className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                              aria-label="Pagination"
                            >
                              <button
                                onClick={() =>
                                  setCurrentPage((prev) =>
                                    Math.max(prev - 1, 1)
                                  )
                                }
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                              >
                                Previous
                              </button>
                              {/* Smart Pagination - Show max 7 pages */}
                              {(() => {
                                const maxVisible = 7;
                                const half = Math.floor(maxVisible / 2);
                                let startPage = Math.max(1, currentPage - half);
                                let endPage = Math.min(
                                  totalPages,
                                  startPage + maxVisible - 1
                                );

                                // Adjust if we're near the end
                                if (endPage - startPage < maxVisible - 1) {
                                  startPage = Math.max(
                                    1,
                                    endPage - maxVisible + 1
                                  );
                                }

                                const pages = [];

                                // Show first page if not in range
                                if (startPage > 1) {
                                  pages.push(
                                    <button
                                      key={1}
                                      onClick={() => setCurrentPage(1)}
                                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                                    >
                                      1
                                    </button>
                                  );
                                  if (startPage > 2) {
                                    pages.push(
                                      <span
                                        key="start-ellipsis"
                                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500"
                                      >
                                        ...
                                      </span>
                                    );
                                  }
                                }

                                // Show visible pages
                                for (let i = startPage; i <= endPage; i++) {
                                  pages.push(
                                    <button
                                      key={i}
                                      onClick={() => setCurrentPage(i)}
                                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                        currentPage === i
                                          ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                                          : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                                      }`}
                                    >
                                      {i}
                                    </button>
                                  );
                                }

                                // Show last page if not in range
                                if (endPage < totalPages) {
                                  if (endPage < totalPages - 1) {
                                    pages.push(
                                      <span
                                        key="end-ellipsis"
                                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500"
                                      >
                                        ...
                                      </span>
                                    );
                                  }
                                  pages.push(
                                    <button
                                      key={totalPages}
                                      onClick={() => setCurrentPage(totalPages)}
                                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                                    >
                                      {totalPages}
                                    </button>
                                  );
                                }

                                return pages;
                              })()}
                              <button
                                onClick={() =>
                                  setCurrentPage((prev) =>
                                    Math.min(prev + 1, totalPages)
                                  )
                                }
                                disabled={currentPage === totalPages}
                                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                              >
                                Next
                              </button>
                            </nav>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </main>
          </div>
        )}

        {currentView === "analytics" && (
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Advanced Analytics
              </h2>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-gray-600">
                  Advanced analytics view coming soon...
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Queue Modal */}
      {showActionQueue && (
        <ActionQueue
          actions={actions}
          onClose={() => setShowActionQueue(false)}
          onSendEmail={handleSendEmail}
          onTriggerWorkflow={triggerWorkflow}
          onUpdateActions={setActions}
        />
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-4">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-lg font-medium">Processing...</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
