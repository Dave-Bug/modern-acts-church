import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, LabelList, AreaChart, Area
} from "recharts";
import { 
  FaHome, FaChartBar, FaChartLine, FaFilter, FaSpinner, FaUsers, FaCheckCircle, 
  FaStar, FaUserClock, FaCalendarAlt, FaChevronDown, FaChartPie, FaArrowUp, FaArrowDown,
  FaTimes, FaListUl, FaSearch, FaSortAmountDown, FaEye, FaDownload
} from "react-icons/fa";
import { supabase } from "../../../Services/supabase";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", 
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const ROLE_OPTIONS = ["Member", "Minister", "Visitor", "1st Timer", "2nd Timer"];

const VIEW_MODES = [
  { id: "All", label: "All", icon: FaChartPie },
  { id: "Per Tribe", label: "Tribe", icon: FaUsers },
  { id: "Per Service", label: "Service", icon: FaCalendarAlt },
  { id: "Per Role", label: "Role", icon: FaUserClock }
];

const CHART_COLORS = {
  present: "#10b981",
  absent: "#ef4444",
  primary: "#3b82f6",
  secondary: "#8b5cf6",
  accent: "#f59e0b",
  palette: [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", 
    "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1"
  ]
};

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOM TOOLTIP — now clickable to open drill-down
// ═══════════════════════════════════════════════════════════════════════════════
const CustomTooltip = ({ active, payload, label, viewType, onDrillDown }) => {
  if (!active || !payload || !payload.length) return null;

  const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-4 min-w-[200px] cursor-pointer hover:border-blue-300 transition-colors"
         onClick={() => onDrillDown && onDrillDown(label)}>
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
        <p className="text-sm font-bold text-slate-800">{label}</p>
        {viewType !== "All" && (
          <span className="text-xs text-slate-400 font-medium">{total} total</span>
        )}
      </div>
      <div className="space-y-1.5">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-sm text-slate-600 font-medium">{entry.name}</span>
            </div>
            <span className="text-sm font-bold text-slate-800">{entry.value}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-blue-500 font-bold mt-2 pt-2 border-t border-slate-50 flex items-center gap-1">
        <FaEye size={10} /> Click to see names
      </p>
    </div>
  );
};

// Summary Card
const SummaryCard = ({ icon: Icon, label, value, subtext, color }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-300 group cursor-pointer">
    <div className="flex items-center gap-2.5">
      <div className={`p-2 rounded-lg ${color.bg} ${color.text} group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider leading-none">{label}</p>
        <p className="text-xl font-black text-slate-800 leading-none mt-1">{value}</p>
        {subtext && <p className="text-[10px] text-slate-400 mt-0.5 font-medium leading-none">{subtext}</p>}
      </div>
    </div>
  </div>
);

export default function UsherAttendanceDashboard() {
  const [loading, setLoading] = useState(true);
  const [rawAttendance, setRawAttendance] = useState([]);
  const [rawMembers, setRawMembers] = useState([]);

  const [viewType, setViewType] = useState("All"); 
  const [selectedTribe, setSelectedTribe] = useState("All");
  const [selectedService, setSelectedService] = useState("All");
  const [selectedRole, setSelectedRole] = useState("All");
  const [activeChart, setActiveChart] = useState("bar");

  const [tribesList, setTribesList] = useState([]);
  const [servicesList, setServicesList] = useState([]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // DRILL-DOWN MODAL STATE
  // ═══════════════════════════════════════════════════════════════════════════════
  const [showDrillDown, setShowDrillDown] = useState(false);
  const [drillDownMonth, setDrillDownMonth] = useState(null);
  const [drillDownCategory, setDrillDownCategory] = useState(null); // e.g. "Present", "Absent", or a tribe name
  const [drillDownSearch, setDrillDownSearch] = useState("");
  const [drillDownStatusFilter, setDrillDownStatusFilter] = useState("All"); // "All" | "Present" | "Absent"

  // Fetch data
  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);

        // Fetch attendance with ALL fields needed for drill-down
        const { data, error } = await supabase
          .from("usher_attendance")
          .select("id, date, name, tribe, service, status, invited_by, created_at")
          .order("date", { ascending: false });

        if (error) throw error;

        const { data: roster, error: rosterErr } = await supabase
          .from("usher_members")
          .select("id, first_name, last_name, role, tribe, invited_by");

        if (rosterErr) throw rosterErr;
        setRawMembers(roster || []);

        const roleByName = {};
        (roster || []).forEach(m => {
          const fullName = `${m.first_name || ""} ${m.last_name || ""}`.trim().toLowerCase();
          if (fullName) roleByName[fullName] = m.role || "Unspecified";
        });

        const records = (data || []).map(r => {
          const normalizedName = (r.name || "").trim().toLowerCase();
          return { 
            ...r, 
            role: roleByName[normalizedName] || "Unspecified",
            displayName: r.name || "Unknown"
          };
        });

        setRawAttendance(records);

        const uniqueTribes = [...new Set(records.map(r => r.tribe || "N/A"))].filter(Boolean).sort();
        const uniqueServices = [...new Set(records.map(r => r.service || "Regular Service"))].filter(Boolean).sort();

        setTribesList(uniqueTribes);
        setServicesList(uniqueServices);
      } catch (err) {
        console.error("Error loading dashboard metrics:", err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CHART DATA GENERATION
  // ═══════════════════════════════════════════════════════════════════════════════
  const { chartData, keys, summaryStats } = useMemo(() => {
    const monthlyMap = MONTHS.reduce((acc, month) => {
      acc[month] = { month, Present: 0, Absent: 0 };
      return acc;
    }, {});

    const dynamicKeys = new Set();
    let totalPresent = 0;
    let totalAbsent = 0;
    let firstTimerCount = 0;
    let secondTimerCount = 0;

    rawAttendance.forEach(record => {
      if (!record.date) return;

      const dateObj = new Date(record.date);
      if (isNaN(dateObj.getTime())) return;

      const monthName = MONTHS[dateObj.getMonth()];
      const status = record.status === "Present" ? "Present" : "Absent";
      const tribe = record.tribe || "N/A";
      const service = record.service || "Regular Service";
      const role = record.role || "Unspecified";

      if (status === "Present") {
        totalPresent++;
        if (role === "1st Timer") firstTimerCount++;
        if (role === "2nd Timer") secondTimerCount++;
      } else {
        totalAbsent++;
      }

      // Apply filters
      if (viewType === "All") {
        if (selectedTribe !== "All" && tribe !== selectedTribe) return;
        if (selectedService !== "All" && service !== selectedService) return;
        if (selectedRole !== "All" && role !== selectedRole) return;

        monthlyMap[monthName][status] += 1;
      } 
      else if (viewType === "Per Tribe") {
        if (selectedService !== "All" && service !== selectedService) return;
        if (selectedRole !== "All" && role !== selectedRole) return;
        if (status === "Present") { 
          dynamicKeys.add(tribe);
          monthlyMap[monthName][tribe] = (monthlyMap[monthName][tribe] || 0) + 1;
        }
      } 
      else if (viewType === "Per Service") {
        if (selectedTribe !== "All" && tribe !== selectedTribe) return;
        if (selectedRole !== "All" && role !== selectedRole) return;
        if (status === "Present") {
          dynamicKeys.add(service);
          monthlyMap[monthName][service] = (monthlyMap[monthName][service] || 0) + 1;
        }
      }
      else if (viewType === "Per Role") {
        if (selectedTribe !== "All" && tribe !== selectedTribe) return;
        if (selectedService !== "All" && service !== selectedService) return;
        if (status === "Present") {
          dynamicKeys.add(role);
          monthlyMap[monthName][role] = (monthlyMap[monthName][role] || 0) + 1;
        }
      }
    });

    return {
      chartData: MONTHS.map(m => monthlyMap[m]),
      keys: Array.from(dynamicKeys).sort(),
      summaryStats: {
        totalRecords: rawAttendance.length,
        totalPresent,
        totalAbsent,
        firstTimerCount,
        secondTimerCount,
        attendanceRate: totalPresent + totalAbsent > 0 
          ? Math.round((totalPresent / (totalPresent + totalAbsent)) * 100) 
          : 0
      }
    };
  }, [rawAttendance, viewType, selectedTribe, selectedService, selectedRole]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // DRILL-DOWN: Get detailed records for a specific month + category
  // ═══════════════════════════════════════════════════════════════════════════════
  const getDrillDownRecords = () => {
    if (!drillDownMonth) return [];

    const monthIndex = MONTHS.indexOf(drillDownMonth);

    return rawAttendance.filter(record => {
      if (!record.date) return false;
      const dateObj = new Date(record.date);
      if (isNaN(dateObj.getTime())) return false;
      if (dateObj.getMonth() !== monthIndex) return false;

      const status = record.status === "Present" ? "Present" : "Absent";
      const tribe = record.tribe || "N/A";
      const service = record.service || "Regular Service";
      const role = record.role || "Unspecified";

      // Apply current filters
      if (selectedTribe !== "All" && tribe !== selectedTribe) return false;
      if (selectedService !== "All" && service !== selectedService) return false;
      if (selectedRole !== "All" && role !== selectedRole) return false;

      // For "All" view: filter by status if a specific bar was clicked
      if (viewType === "All" && drillDownCategory) {
        if (drillDownCategory !== status) return false;
      }

      // For breakdown views: filter by the category (tribe/service/role)
      if (viewType === "Per Tribe" && drillDownCategory) {
        if (status !== "Present") return false;
        if (tribe !== drillDownCategory) return false;
      }
      if (viewType === "Per Service" && drillDownCategory) {
        if (status !== "Present") return false;
        if (service !== drillDownCategory) return false;
      }
      if (viewType === "Per Role" && drillDownCategory) {
        if (status !== "Present") return false;
        if (role !== drillDownCategory) return false;
      }

      // Apply drill-down search
      if (drillDownSearch) {
        const searchLower = drillDownSearch.toLowerCase();
        const nameMatch = (record.displayName || "").toLowerCase().includes(searchLower);
        const tribeMatch = tribe.toLowerCase().includes(searchLower);
        const serviceMatch = service.toLowerCase().includes(searchLower);
        const roleMatch = role.toLowerCase().includes(searchLower);
        if (!nameMatch && !tribeMatch && !serviceMatch && !roleMatch) return false;
      }

      // Apply status filter in modal
      if (drillDownStatusFilter !== "All" && status !== drillDownStatusFilter) return false;

      return true;
    }).sort((a, b) => {
      // Sort by date descending, then by name
      const dateCompare = new Date(b.date) - new Date(a.date);
      if (dateCompare !== 0) return dateCompare;
      return (a.displayName || "").localeCompare(b.displayName || "");
    });
  };

  const drillDownRecords = getDrillDownRecords();

  const handleOpenDrillDown = (month, category = null) => {
    setDrillDownMonth(month);
    setDrillDownCategory(category);
    setDrillDownSearch("");
    setDrillDownStatusFilter("All");
    setShowDrillDown(true);
  };

  const handleCopyDrillDown = () => {
    const lines = drillDownRecords.map(r => {
      const status = r.status === "Present" ? "✅" : "❌";
      return `${status} ${r.displayName} | ${r.tribe || "N/A"} | ${r.service || "Regular"} | ${r.date}`;
    });
    const header = `${drillDownMonth} ${drillDownCategory || "All Records"} (${drillDownRecords.length})\n${"─".repeat(40)}`;
    navigator.clipboard.writeText([header, ...lines].join("\n"));
    alert(`${drillDownRecords.length} records copied to clipboard!`);
  };

  const handleExportDrillDown = () => {
    const headers = ["Name", "Date", "Tribe", "Service", "Status", "Role", "Invited By"];
    const rows = drillDownRecords.map(r => [
      r.displayName,
      r.date,
      r.tribe || "N/A",
      r.service || "Regular Service",
      r.status || "Absent",
      r.role || "Unspecified",
      r.invited_by || "N/A"
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Attendance_${drillDownMonth}_${drillDownCategory || "All"}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleViewTypeChange = (mode) => {
    setViewType(mode);
    setSelectedTribe("All");
    setSelectedService("All");
    setSelectedRole("All");
  };

  const { totalPresent, totalRecords, firstTimerCount, secondTimerCount, attendanceRate } = summaryStats;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 text-slate-900 pb-8">
      {/* Top Navigation */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
      <div className="fixed top-4 left-4 z-50">
        <Link
          to="/ministries/usher"
          className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors"
        >
          <FaHome />
          Back
        </Link>
      </div>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
                Attendance <span className="text-blue-600">Overview</span>
              </h1>
              <p className="text-xs text-slate-400 font-medium hidden sm:block">
                Real-time insights into your ministry attendance
              </p>
            </div>
          </div>
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <button onClick={() => setActiveChart("bar")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeChart === "bar" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>
              <FaChartBar className="inline mr-1" size={12} /> Bar
            </button>
            <button onClick={() => setActiveChart("line")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeChart === "line" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>
              <FaChartLine className="inline mr-1" size={12} /> Line
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto  px-4 sm:px-6 lg:px-8 pt-6 flex flex-col gap-6">

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 md:gap-3">
  <SummaryCard icon={FaUsers} label="Total Records" value={totalRecords} color={{ bg: "bg-blue-50", text: "text-blue-600" }} />
  <SummaryCard icon={FaCheckCircle} label="Present" value={totalPresent}  color={{ bg: "bg-emerald-50", text: "text-emerald-600" }} />
  <SummaryCard icon={FaStar} label="1st Timers" value={firstTimerCount} color={{ bg: "bg-amber-50", text: "text-amber-500" }} />
  <SummaryCard icon={FaUserClock} label="2nd Timers" value={secondTimerCount} color={{ bg: "bg-purple-50", text: "text-purple-600" }} />
  
  {/* Compact Attendance Rate Card */}
  <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-3 shadow-lg text-white flex items-center gap-3">
    <div className="flex-1 min-w-0">
      <p className="text-blue-100 text-[10px] font-bold uppercase tracking-wider leading-none">Attendance Rate</p>
      <p className="text-2xl font-black leading-none mt-1">{attendanceRate}%</p>
    </div>
    <div className="w-10 h-10 relative flex-shrink-0">
      <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="4"
        />
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="white"
          strokeWidth="4"
          strokeDasharray={`${attendanceRate}, 100`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold">
        {attendanceRate}
      </span>
    </div>
  </div>
</div>

        {/* Filter Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm">
          <div className="flex flex-col xl:flex-row xl:items-center gap-4">
            <div className="flex items-center gap-2 w-full xl:w-auto">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden md:block">View By</span>
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
                {VIEW_MODES.map((mode) => {
                  const Icon = mode.icon;
                  const isActive = viewType === mode.id;
                  return (
                    <button key={mode.id} type="button" onClick={() => handleViewTypeChange(mode.id)}
                      className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all whitespace-nowrap flex-1 md:flex-none ${
                        isActive ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200/50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                      }`}>
                      <Icon size={14} className={isActive ? "text-blue-500" : "text-slate-400"} />
                      {mode.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="h-px xl:h-8 xl:w-px bg-slate-200 hidden xl:block" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
              <div className="relative">
                <select disabled={viewType === "Per Tribe"} value={selectedTribe} onChange={(e) => setSelectedTribe(e.target.value)}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 text-sm font-semibold rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 disabled:opacity-40 transition-all cursor-pointer pr-10">
                  <option value="All">All Tribes</option>
                  {tribesList.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
              </div>
              <div className="relative">
                <select disabled={viewType === "Per Service"} value={selectedService} onChange={(e) => setSelectedService(e.target.value)}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 text-sm font-semibold rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 disabled:opacity-40 transition-all cursor-pointer pr-10">
                  <option value="All">All Services</option>
                  {servicesList.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
              </div>
              <div className="relative">
                <select disabled={viewType === "Per Role"} value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 text-sm font-semibold rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 disabled:opacity-40 transition-all cursor-pointer pr-10">
                  <option value="All">All Roles</option>
                  {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center h-[400px] shadow-sm">
            <FaSpinner className="animate-spin text-blue-500 text-4xl" />
            <p className="text-slate-500 text-sm font-medium mt-4">Loading your dashboard data...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Main Chart — CLICKABLE BARS/LINES */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 rounded-lg"><FaChartBar className="text-blue-500" size={18} /></div>
                  <div>
                    <h2 className="text-base md:text-lg font-bold text-slate-800">
                      {viewType === "All" ? "Monthly Headcount" : `${viewType.replace("Per ", "")} Breakdown`}
                    </h2>
                    <p className="text-xs text-slate-400 font-medium">
                      {viewType === "All" ? "Click any bar to see names" : "Click any bar to see who attended"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="w-full h-[300px] md:h-[380px]">
                <ResponsiveContainer width="100%" height="100%">
                  {activeChart === "bar" ? (
                    <BarChart data={chartData} margin={{ top: 30, right: 10, left: -10, bottom: 5 }}
                      onClick={(state) => {
                        if (state && state.activeLabel) {
                          handleOpenDrillDown(state.activeLabel);
                        }
                      }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" stroke="#94a3b8" tickLine={false} axisLine={false} 
                        tick={{ fill: '#64748b', fontWeight: 600, fontSize: 12 }} dy={10} />
                      <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <Tooltip content={<CustomTooltip viewType={viewType} onDrillDown={(month) => handleOpenDrillDown(month)} />} />

                      {viewType === "All" ? (
                        <>
                          <Bar dataKey="Present" fill={CHART_COLORS.present} radius={[6, 6, 0, 0]} maxBarSize={45}
                            onClick={(data) => handleOpenDrillDown(data.month, "Present")} style={{ cursor: 'pointer' }}>
                            <LabelList dataKey="Present" position="top" fill="#047857" 
                              formatter={(val) => val > 0 ? val : ""} style={{ fontSize: '11px', fontWeight: 'bold' }} dy={-4} />
                          </Bar>
                          <Bar dataKey="Absent" fill={CHART_COLORS.absent} radius={[6, 6, 0, 0]} maxBarSize={45}
                            onClick={(data) => handleOpenDrillDown(data.month, "Absent")} style={{ cursor: 'pointer' }}>
                            <LabelList dataKey="Absent" position="top" fill="#b91c1c" 
                              formatter={(val) => val > 0 ? val : ""} style={{ fontSize: '11px', fontWeight: 'bold' }} dy={-4} />
                          </Bar>
                        </>
                      ) : (
                        keys.map((key, index) => (
                          <Bar key={key} dataKey={key} fill={CHART_COLORS.palette[index % CHART_COLORS.palette.length]} 
                            name={key} radius={[4, 4, 0, 0]} stackId="a" maxBarSize={50}
                            onClick={(data) => handleOpenDrillDown(data.month, key)} style={{ cursor: 'pointer' }}>
                            <LabelList dataKey={key} position="center" fill="#ffffff" 
                              formatter={(val) => val > 0 ? val : ""} style={{ fontSize: '11px', fontWeight: '800' }} />
                          </Bar>
                        ))
                      )}
                    </BarChart>
                  ) : (
                    <LineChart data={chartData} margin={{ top: 30, right: 10, left: -10, bottom: 5 }}
                      onClick={(state) => {
                        if (state && state.activeLabel) {
                          handleOpenDrillDown(state.activeLabel);
                        }
                      }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" stroke="#94a3b8" tickLine={false} axisLine={false} 
                        tick={{ fill: '#64748b', fontWeight: 600, fontSize: 12 }} dy={10} />
                      <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <Tooltip content={<CustomTooltip viewType={viewType} onDrillDown={(month) => handleOpenDrillDown(month)} />} />

                      {viewType === "All" ? (
                        <>
                          <Line type="monotone" dataKey="Present" stroke={CHART_COLORS.present} strokeWidth={3} 
                            dot={{ r: 5, fill: CHART_COLORS.present, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7, strokeWidth: 0, onClick: (e) => handleOpenDrillDown(e.payload.month, "Present") }}>
                            <LabelList dataKey="Present" position="top" fill="#047857" 
                              formatter={(val) => val > 0 ? val : ""} style={{ fontSize: '11px', fontWeight: 'bold' }} dy={-8} />
                          </Line>
                          <Line type="monotone" dataKey="Absent" stroke={CHART_COLORS.absent} strokeWidth={2} strokeDasharray="6 4" 
                            dot={{ r: 4, fill: CHART_COLORS.absent, strokeWidth: 2, stroke: '#fff', onClick: (e) => handleOpenDrillDown(e.payload.month, "Absent") }}>
                            <LabelList dataKey="Absent" position="bottom" fill="#b91c1c" 
                              formatter={(val) => val > 0 ? val : ""} style={{ fontSize: '11px', fontWeight: 'bold' }} dy={8} />
                          </Line>
                        </>
                      ) : (
                        keys.map((key, index) => (
                          <Line key={key} type="monotone" dataKey={key} 
                            stroke={CHART_COLORS.palette[index % CHART_COLORS.palette.length]} name={key} strokeWidth={3} 
                            dot={{ r: 5, fill: CHART_COLORS.palette[index % CHART_COLORS.palette.length], strokeWidth: 2, stroke: '#fff', onClick: (e) => handleOpenDrillDown(e.payload.month, key) }}>
                            <LabelList dataKey={key} position="top" fill={CHART_COLORS.palette[index % CHART_COLORS.palette.length]} 
                              formatter={(val) => val > 0 ? val : ""} style={{ fontSize: '11px', fontWeight: 'bold' }} dy={-8} />
                          </Line>
                        ))
                      )}
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Secondary Chart — Area Chart */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-50 rounded-lg"><FaChartLine className="text-purple-500" size={18} /></div>
                  <div>
                    <h2 className="text-base md:text-lg font-bold text-slate-800">Trends Over Time</h2>
                    <p className="text-xs text-slate-400 font-medium">Click any point to drill down</p>
                  </div>
                </div>
              </div>
              <div className="w-full h-[300px] md:h-[380px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 20, right: 10, left: -10, bottom: 5 }}
                    onClick={(state) => {
                      if (state && state.activeLabel) {
                        handleOpenDrillDown(state.activeLabel);
                      }
                    }}>
                    <defs>
                      <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.present} stopOpacity={0.15}/>
                        <stop offset="95%" stopColor={CHART_COLORS.present} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.absent} stopOpacity={0.15}/>
                        <stop offset="95%" stopColor={CHART_COLORS.absent} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" stroke="#94a3b8" tickLine={false} axisLine={false} 
                      tick={{ fill: '#64748b', fontWeight: 600, fontSize: 12 }} dy={10} />
                    <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip viewType={viewType} onDrillDown={(month) => handleOpenDrillDown(month)} />} />

                    {viewType === "All" ? (
                      <>
                        <Area type="monotone" dataKey="Present" stroke={CHART_COLORS.present} strokeWidth={3}
                          fill="url(#colorPresent)" dot={{ r: 4, fill: CHART_COLORS.present, strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 6, strokeWidth: 0, onClick: (e) => handleOpenDrillDown(e.payload.month, "Present") }} />
                        <Area type="monotone" dataKey="Absent" stroke={CHART_COLORS.absent} strokeWidth={2} strokeDasharray="6 4"
                          fill="url(#colorAbsent)" dot={{ r: 3, fill: CHART_COLORS.absent, strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 6, strokeWidth: 0, onClick: (e) => handleOpenDrillDown(e.payload.month, "Absent") }} />
                      </>
                    ) : (
                      keys.slice(0, 3).map((key, index) => (
                        <Area key={key} type="monotone" dataKey={key} 
                          stroke={CHART_COLORS.palette[index % CHART_COLORS.palette.length]} strokeWidth={2}
                          fill={`url(#color${index})`} dot={{ r: 4, fill: CHART_COLORS.palette[index % CHART_COLORS.palette.length], strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 6, strokeWidth: 0, onClick: (e) => handleOpenDrillDown(e.payload.month, key) }} />
                      ))
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════════
          DRILL-DOWN MODAL — Shows WHO is behind each data point
          ═══════════════════════════════════════════════════════════════════════════════ */}
      {showDrillDown && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDrillDown(false); }}>
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-fadeIn">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div>
                <h2 className="text-lg font-black text-slate-800">
                  {drillDownMonth} {drillDownCategory ? `· ${drillDownCategory}` : ""}
                </h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  {drillDownRecords.length} {drillDownRecords.length === 1 ? "record" : "records"} found
                </p>
              </div>
              <button type="button" onClick={() => setShowDrillDown(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors">
                <FaTimes size={14} />
              </button>
            </div>

            {/* Search & Filter Bar */}
            <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-2">
              <div className="flex-1 relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                <input
                  type="text"
                  placeholder="Search name, tribe, service, role..."
                  value={drillDownSearch}
                  onChange={(e) => setDrillDownSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
              <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
                {["All", "Present", "Absent"].map(status => (
                  <button key={status} onClick={() => setDrillDownStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      drillDownStatusFilter === status
                        ? status === "Present" ? "bg-emerald-50 text-emerald-600" 
                          : status === "Absent" ? "bg-rose-50 text-rose-600"
                          : "bg-blue-50 text-blue-600"
                        : "text-slate-400 hover:text-slate-600"
                    }`}>
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Records List */}
            <div className="flex-1 overflow-y-auto p-4">
              {drillDownRecords.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FaListUl className="text-slate-300" size={24} />
                  </div>
                  <p className="text-sm font-bold text-slate-400">No records match your filters</p>
                  <p className="text-xs text-slate-300 mt-1">Try adjusting your search or status filter</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {drillDownRecords.map((record, idx) => {
                    const isPresent = record.status === "Present";
                    return (
                      <div key={record.id || idx}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                          isPresent 
                            ? "bg-emerald-50/30 border-emerald-100/60 hover:bg-emerald-50/60" 
                            : "bg-rose-50/30 border-rose-100/60 hover:bg-rose-50/60"
                        }`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isPresent ? "bg-emerald-100" : "bg-rose-100"
                        }`}>
                          {isPresent ? (
                            <FaCheckCircle className="text-emerald-500" size={14} />
                          ) : (
                            <FaTimes className="text-rose-400" size={14} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">
                            {record.displayName}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {record.tribe || "N/A"}
                            </span>
                            <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
                              {record.service || "Regular Service"}
                            </span>
                            <span className="text-[10px] font-bold text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded">
                              {record.role || "Unspecified"}
                            </span>
                            {record.invited_by && (
                              <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded">
                                via {record.invited_by}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            isPresent ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                          }`}>
                            {record.status || "Absent"}
                          </span>
                          <span className="text-[9px] text-slate-400 font-medium">
                            {record.date}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <p className="text-xs text-slate-400 font-medium">
                Showing {drillDownRecords.length} of {rawAttendance.length} total records
              </p>
              <div className="flex gap-2">
                <button onClick={handleCopyDrillDown} 
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors border border-blue-200">
                  <FaDownload size={11} /> Copy
                </button>
                <button onClick={handleExportDrillDown}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
                  <FaDownload size={11} /> Export CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}