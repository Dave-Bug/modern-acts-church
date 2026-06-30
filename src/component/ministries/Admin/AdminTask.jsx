import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  FaHome, FaSpinner, FaPlus, FaTimes,
  FaArrowUp, FaArrowDown, FaMinus,
  FaHistory, FaChartLine, FaCalendar,
  FaExclamationTriangle, FaUsers, FaCalendarAlt, FaEdit,
  FaTrophy, FaExclamationCircle, FaChartBar, FaCalendarWeek,
  FaClipboardCheck, FaStar, FaCheck, FaCheckCircle, FaRegCircle,
  FaClock, FaBullhorn, FaMicrophone, FaLightbulb, FaDoorOpen,
  FaHandHoldingHeart, FaMusic, FaVideo, FaUserFriends, FaPrayingHands
} from "react-icons/fa";
import { supabase } from "../../../Services/supabase";

// ─── Service Definitions ────────────────────────────────────────────────────

const SERVICE_CONFIGS = [
  {
    key: "Prayer Works",
    emoji: "🙏",
    colors: {
      cardBorder: "border-violet-200",
      headerGrad: "from-violet-600 to-violet-800",
      scoreBg: "bg-violet-50",
      scoreText: "text-violet-700",
      bar: "bg-violet-500",
      barTrack: "bg-violet-100",
      cardBorderColor: "border-violet-200",
      button: "bg-violet-600 hover:bg-violet-700",
      ghostBtn: "bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100",
      light: "violet",
    },
    checklist: [
      { name: "Message Relevance", description: "Overall impact of word such as burden for souls, and spiritual breakthrough" },
      { name: "Worship & Soaking", description: "Quality of worship leading, atmosphere of God's presence, and time spent in soaking prayer" },
      { name: "Team Readiness", description: "Punctuality, spiritual preparation, and preparedness of prayer team members" },
      { name: "Media & Sound", description: "Audio clarity, lyric projection, and technical support quality" },
      { name: "Prayer Intercessory", description: "Depth and Intensity of prayers of Prayer Warriors" },
      { name: "Ushering & Attendance", description: "Number of participants and consistency of prayer warriors present" },
    ],
  },
  {
    key: "Sunday Service",
    emoji: "⛪",
    colors: {
      cardBorder: "border-emerald-200",
      headerGrad: "from-emerald-600 to-emerald-800",
      scoreBg: "bg-emerald-50",
      scoreText: "text-emerald-700",
      bar: "bg-emerald-500",
      barTrack: "bg-emerald-100",
      cardBorderColor: "border-emerald-200",
      button: "bg-emerald-600 hover:bg-emerald-700",
      ghostBtn: "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100",
      light: "emerald",
    },
    checklist: [
      { name: "Worship Quality", description: "Musical excellence, spiritual engagement, and congregation participation in worship" },
      { name: "Bible Reading", description: "Clarity of preaching, biblical depth, and practical application of the sermon" },
      { name: "Media Execution", description: "Visual presentation quality, livestream performance, and multimedia integration" },
      { name: "Thites & Offering", description: "Effectiveness of altar call, number of responses, and follow-up readiness" },
      { name: "Team Coordination", description: "Smooth transitions between segments, ushering efficiency, and inter-team communication" },
      { name: "Ushering & Attendance", description: "Total congregation count, visitor retention, and member consistency" },
    ],
  },
  {
    key: "Young Adult Night",
    emoji: "⚡",
    colors: {
      cardBorder: "border-amber-200",
      headerGrad: "from-amber-500 to-amber-700",
      scoreBg: "bg-amber-50",
      scoreText: "text-amber-700",
      bar: "bg-amber-500",
      barTrack: "bg-amber-100",
      cardBorderColor: "border-amber-200",
      button: "bg-amber-500 hover:bg-amber-600",
      ghostBtn: "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100",
      light: "amber",
    },
    checklist: [
      { name: "Worship Energy", description: "Vibrancy of worship, youth participation, and contemporary relevance of song selection" },
      { name: "Message Relevance", description: "Topic relatability to young adults, addressing real-life issues, and engaging delivery" },
      { name: "Youth Engagement", description: "Interaction level, small group participation, and social connection among attendees" },
      { name: "Media & Sound", description: "DJ/mix quality, lighting effects, and social media content capture" },
      { name: "Team Coordination", description: "Youth leader synergy, event flow, and volunteer mobilization" },
      { name: "Attendance", description: "Young adult turnout, first-timer ratio, and retention from previous events" },
    ],
  },
];

// ─── Pre-Service Checklist Definitions ────────────────────────────────────────
const PRE_SERVICE_CHECKLISTS = {
  "Prayer Works": [
    { id: "pw_1", label: "Prayer room cleaned & arranged", icon: FaDoorOpen, category: "Setup" },
    { id: "pw_2", label: "Worship instruments tuned & tested", icon: FaMusic, category: "Audio" },
    { id: "pw_3", label: "Sound system & microphones working", icon: FaMicrophone, category: "Audio" },
    { id: "pw_4", label: "Lyrics/projection slides ready", icon: FaVideo, category: "Media" },
    { id: "pw_5", label: "Prayer team briefed & assigned", icon: FaUserFriends, category: "Team" },
    { id: "pw_6", label: "Offering baskets prepared", icon: FaHandHoldingHeart, category: "Logistics" },
    { id: "pw_7", label: "Refreshments set up", icon: FaClock, category: "Logistics" },
    { id: "pw_8", label: "Emergency exits clear", icon: FaDoorOpen, category: "Safety" },
    { id: "pw_9", label: "First-aid kit available", icon: FaHandHoldingHeart, category: "Safety" },
    { id: "pw_10", label: "Announcements prepared", icon: FaBullhorn, category: "Communication" },
  ],
  "Sunday Service": [
    { id: "ss_1", label: "Sanctuary cleaned & arranged", icon: FaDoorOpen, category: "Setup" },
    { id: "ss_2", label: "Worship team sound-checked", icon: FaMusic, category: "Audio" },
    { id: "ss_3", label: "All microphones tested", icon: FaMicrophone, category: "Audio" },
    { id: "ss_4", label: "Livestream setup & tested", icon: FaVideo, category: "Media" },
    { id: "ss_5", label: "Lyrics & sermon slides ready", icon: FaVideo, category: "Media" },
    { id: "ss_6", label: "Ushers briefed & stationed", icon: FaUserFriends, category: "Team" },
    { id: "ss_7", label: "Offering team ready", icon: FaHandHoldingHeart, category: "Team" },
    { id: "ss_8", label: "Altar prayer team available", icon: FaPrayingHands, category: "Team" },
    { id: "ss_9", label: "Parking attendants on duty", icon: FaDoorOpen, category: "Logistics" },
    { id: "ss_10", label: "Visitor welcome packs ready", icon: FaHandHoldingHeart, category: "Logistics" },
    { id: "ss_11", label: "Children's ministry staffed", icon: FaUserFriends, category: "Team" },
    { id: "ss_12", label: "Emergency plan reviewed", icon: FaExclamationTriangle, category: "Safety" },
    { id: "ss_13", label: "Announcements & bulletin ready", icon: FaBullhorn, category: "Communication" },
    { id: "ss_14", label: "Pastor/guest speaker briefed", icon: FaMicrophone, category: "Communication" },
    { id: "ss_15", label: "Temperature & ventilation checked", icon: FaLightbulb, category: "Setup" },
  ],
  "Young Adult Night": [
    { id: "ya_1", label: "Venue decorated & themed", icon: FaDoorOpen, category: "Setup" },
    { id: "ya_2", label: "DJ/sound equipment tested", icon: FaMusic, category: "Audio" },
    { id: "ya_3", label: "Microphones for games/hosts", icon: FaMicrophone, category: "Audio" },
    { id: "ya_4", label: "Lighting & effects programmed", icon: FaLightbulb, category: "Media" },
    { id: "ya_5", label: "Social media stories prepared", icon: FaVideo, category: "Media" },
    { id: "ya_6", label: "Small group leaders briefed", icon: FaUserFriends, category: "Team" },
    { id: "ya_7", label: "Registration/check-in ready", icon: FaClipboardCheck, category: "Logistics" },
    { id: "ya_8", label: "Food & refreshments arranged", icon: FaClock, category: "Logistics" },
    { id: "ya_9", label: "Security team on duty", icon: FaDoorOpen, category: "Safety" },
    { id: "ya_10", label: "Emergency contacts posted", icon: FaExclamationTriangle, category: "Safety" },
    { id: "ya_11", label: "Icebreakers & games prepared", icon: FaBullhorn, category: "Communication" },
    { id: "ya_12", label: "Speaker/message AV checked", icon: FaMicrophone, category: "Communication" },
  ],
};

const RATING_LABELS = ["", "Poor", "Fair", "Average", "Good", "Excellent"];
const RATING_COLORS = [
  "", "text-red-600", "text-orange-500", "text-amber-500", "text-green-600", "text-emerald-600",
];
const RATING_BG_COLORS = [
  "", "bg-red-50", "bg-orange-50", "bg-amber-50", "bg-green-50", "bg-emerald-50",
];
const RATING_DESCRIPTIONS = [
  "",
  "Significant issues requiring immediate attention and major improvements",
  "Below expectations with noticeable gaps that need addressing soon",
  "Meets basic standards but has room for meaningful improvement",
  "Strong performance with minor areas that could be enhanced",
  "Outstanding execution that serves as a model for excellence",
];

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ─── Helpers ───────────────────────────────────────────────────────────────
const buildEmptyChecklist = (serviceKey) => {
  const cfg = SERVICE_CONFIGS.find((s) => s.key === serviceKey);
  return cfg ? cfg.checklist.map((item) => ({ 
    name: item.name, 
    rating: 0,
    description: item.description 
  })) : [];
};

const computeScore = (checklist) => {
  const rated = (checklist || []).filter((i) => (i.rating || 0) > 0);
  if (!rated.length) return 0;
  return parseFloat((rated.reduce((s, i) => s + i.rating, 0) / rated.length).toFixed(2));
};

const TrendIcon = ({ direction, className = "" }) =>
  direction === "up" ? (
    <FaArrowUp className={className} />
  ) : direction === "down" ? (
    <FaArrowDown className={className} />
  ) : (
    <FaMinus className={className} />
  );

const getWeekNumber = (dateStr) => {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

// ─── Analytics Components ───────────────────────────────────────────────────

const MiniBar = ({ value, max = 5, colorClass = "bg-blue-500", trackClass = "bg-slate-100", height = "h-1.5", width = null }) => (
  <div className={`${trackClass} rounded-full overflow-hidden ${width || "flex-1"} ${height}`}>
    <div className={`h-full ${colorClass} rounded-full transition-all`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
  </div>
);

const ScoreBadge = ({ score, size = "sm" }) => {
  const color = score >= 4 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                score >= 3 ? "bg-amber-50 text-amber-700 border-amber-200" :
                score >= 2 ? "bg-orange-50 text-orange-700 border-orange-200" :
                "bg-red-50 text-red-700 border-red-200";
  return (
    <span className={`${size === "lg" ? "text-sm px-2.5 py-1" : "text-[10px] px-1.5 py-0.5"} font-black rounded-full border ${color}`}>
      {score.toFixed(1)}
    </span>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────
export default function ServicesReport() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("log"); // "log" | "edit" | "history" | "checklist"
  const [activeService, setActiveService] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [expandedReportId, setExpandedReportId] = useState(null);
  const [dashboardYear, setDashboardYear] = useState(new Date().getFullYear());
  const [dashboardMonth, setDashboardMonth] = useState(new Date().getMonth());
  const [activeDashboardTab, setActiveDashboardTab] = useState("annual");

  // ─── PRE-SERVICE CHECKLIST STATE (separate from ratings) ─────────────────
  const [preServiceChecks, setPreServiceChecks] = useState({});
  const [preServiceNotes, setPreServiceNotes] = useState("");
  const [preServiceDirector, setPreServiceDirector] = useState("");
  const [preServiceSaved, setPreServiceSaved] = useState(false);

  // ─── RATINGS FORM STATE ──────────────────────────────────────────────────
  const [formDate, setFormDate] = useState("");
  const [formAttendance, setFormAttendance] = useState("");
  const [formChecklist, setFormChecklist] = useState([]);
  const [formProblems, setFormProblems] = useState("");

  useEffect(() => { fetchReports(); }, []);

  async function fetchReports() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("service_reports")
        .select("*")
        .order("report_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error("Fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  }

  const getServiceReports = (key) =>
    reports.filter((r) => r.service_type === key).sort((a, b) => new Date(b.report_date) - new Date(a.report_date));

  const getServiceMeta = (key) => {
    const svcReports = getServiceReports(key);
    const latest = svcReports[0] || null;
    const previous = svcReports[1] || null;
    let trend = null;
    if (latest && previous) {
      const delta = parseFloat(((latest.overall_score ?? 0) - (previous.overall_score ?? 0)).toFixed(2));
      trend = { delta, direction: delta > 0.05 ? "up" : delta < -0.05 ? "down" : "stable" };
    }
    return { svcReports, latest, trend };
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PRE-SERVICE CHECKLIST HANDLERS (completely separate from ratings)
  // ═══════════════════════════════════════════════════════════════════════════

  const togglePreServiceCheck = (checkId) => {
    setPreServiceChecks(prev => ({ ...prev, [checkId]: !prev[checkId] }));
    setPreServiceSaved(false);
  };

  const getPreServiceProgress = (serviceKey) => {
    const items = PRE_SERVICE_CHECKLISTS[serviceKey] || [];
    const checked = items.filter(item => preServiceChecks[item.id]).length;
    return { checked, total: items.length, percent: items.length > 0 ? Math.round((checked / items.length) * 100) : 0 };
  };

  const resetPreService = () => {
    setPreServiceChecks({});
    setPreServiceNotes("");
    setPreServiceDirector("");
    setPreServiceSaved(false);
  };

  const handleSavePreService = async (e) => {
    e.preventDefault();
    const payload = {
      service_type: activeService.key,
      report_date: formDate || new Date().toISOString().split("T")[0],
      pre_service_checklist: preServiceChecks,
      pre_service_notes: preServiceNotes.trim() || null,
      pre_service_director: preServiceDirector.trim() || null,
      checklist: [], // empty — no ratings
      overall_score: null, // null — marks as pre-service only
      problems: null,
      attendance_count: null,
    };
    try {
      const { data, error } = await supabase.from("service_reports").insert([payload]).select();
      if (error) throw error;
      if (data?.length > 0) setReports((r) => [data[0], ...r]);
      setPreServiceSaved(true);
      setTimeout(() => {
        resetModal();
        resetPreService();
      }, 1200);
    } catch (err) {
      console.error("Save error:", err.message);
      alert(`Error: ${err.message}`);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RATINGS / LOG REPORT HANDLERS (completely separate from checklist)
  // ═══════════════════════════════════════════════════════════════════════════

  const setRating = (idx, val) => {
    setFormChecklist((prev) => prev.map((item, i) => (i === idx ? { ...item, rating: val } : item)));
  };

  const handleSaveReport = async (e) => {
    e.preventDefault();
    if (!formChecklist.some((i) => i.rating > 0)) {
      alert("Please rate at least one checklist item.");
      return;
    }
    const overall = computeScore(formChecklist);
    const payload = {
      service_type: activeService.key,
      report_date: formDate,
      attendance_count: formAttendance ? parseInt(formAttendance) : null,
      checklist: formChecklist,
      problems: formProblems.trim() || null,
      overall_score: overall,
      // No pre-service fields here
      pre_service_checklist: null,
      pre_service_notes: null,
      pre_service_director: null,
    };
    try {
      if (modalMode === "edit" && selectedReport) {
        const { error } = await supabase.from("service_reports").update(payload).eq("id", selectedReport.id);
        if (error) throw error;
        setReports((r) => r.map((x) => (x.id === selectedReport.id ? { ...x, ...payload } : x)));
      } else {
        const { data, error } = await supabase.from("service_reports").insert([payload]).select();
        if (error) throw error;
        if (data?.length > 0) setReports((r) => [data[0], ...r]);
      }
      resetModal();
    } catch (err) {
      console.error("Save error:", err.message);
      alert(`Error: ${err.message}`);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MODAL OPENERS (separate entry points)
  // ═══════════════════════════════════════════════════════════════════════════

  // Opens the PRE-SERVICE CHECKLIST modal only
  const openChecklist = (svc) => {
    setActiveService(svc);
    setSelectedReport(null);
    setFormDate(new Date().toISOString().split("T")[0]);
    resetPreService(); // clean slate
    setModalMode("checklist");
    setIsModalOpen(true);
  };

  // Opens the RATINGS / LOG REPORT modal only
  const [historyTab, setHistoryTab] = useState("ratings"); // "ratings" | "checklist"
  const openLog = (svc) => {
    setActiveService(svc);
    setSelectedReport(null);
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormAttendance("");
    setFormChecklist(buildEmptyChecklist(svc.key));
    setFormProblems("");
    setModalMode("log");
    setIsModalOpen(true);
  };

  // Opens EDIT mode for a ratings report
  const openEdit = (svc, report) => {
    setActiveService(svc);
    setSelectedReport(report);
    setFormDate(report.report_date);
    setFormAttendance(report.attendance_count?.toString() || "");
    const currentConfig = SERVICE_CONFIGS.find(s => s.key === svc.key);
    const configMap = new Map(currentConfig.checklist.map(c => [c.name, c.description]));
    setFormChecklist(
      report.checklist 
        ? report.checklist.map((i) => ({ ...i, description: i.description || configMap.get(i.name) || "" })) 
        : buildEmptyChecklist(svc.key)
    );
    setFormProblems(report.problems || "");
    setModalMode("edit");
    setIsModalOpen(true);
  };

  // Opens HISTORY view (shows both checklist-only and ratings entries)
  const openHistory = (svc) => {
    setActiveService(svc);
    setExpandedReportId(null);
    setModalMode("history");
    setIsModalOpen(true);
  };

  const resetModal = () => {
    setIsModalOpen(false);
    setActiveService(null);
    setSelectedReport(null);
    setFormDate("");
    setFormAttendance("");
    setFormChecklist([]);
    setFormProblems("");
    setExpandedReportId(null);
    setModalMode("log");
    resetPreService();
  };

  const trendBadgeStyle = (direction) => {
    if (direction === "up") return "bg-emerald-50 border border-emerald-200 text-emerald-700";
    if (direction === "down") return "bg-red-50 border border-red-200 text-red-600";
    return "bg-slate-100 border border-slate-200 text-slate-500";
  };

  const trendLabel = (direction) =>
    direction === "up" ? "Improving" : direction === "down" ? "Declining" : "Stable";

  // ─── Dashboard Analytics (unchanged) ──────────────────────────────────────
  const analytics = useMemo(() => {
    const byService = {};
    SERVICE_CONFIGS.forEach(svc => {
      byService[svc.key] = getServiceReports(svc.key);
    });

    const annualData = {};
    SERVICE_CONFIGS.forEach(svc => {
      annualData[svc.key] = Array(12).fill(null).map(() => ({ count: 0, total: 0, avg: 0 }));
      byService[svc.key].forEach(r => {
        const d = new Date(r.report_date);
        if (d.getFullYear() === dashboardYear && r.overall_score != null) {
          const m = d.getMonth();
          annualData[svc.key][m].count += 1;
          annualData[svc.key][m].total += (r.overall_score || 0);
        }
      });
      annualData[svc.key] = annualData[svc.key].map(m => ({
        ...m,
        avg: m.count > 0 ? parseFloat((m.total / m.count).toFixed(2)) : 0
      }));
    });

    const monthlyData = {};
    SERVICE_CONFIGS.forEach(svc => {
      monthlyData[svc.key] = {};
      byService[svc.key].forEach(r => {
        const d = new Date(r.report_date);
        if (d.getFullYear() === dashboardYear && d.getMonth() === dashboardMonth && r.overall_score != null) {
          const wk = getWeekNumber(r.report_date);
          if (!monthlyData[svc.key][wk]) monthlyData[svc.key][wk] = { count: 0, total: 0, reports: [] };
          monthlyData[svc.key][wk].count += 1;
          monthlyData[svc.key][wk].total += (r.overall_score || 0);
          monthlyData[svc.key][wk].reports.push(r);
        }
      });
      const weeks = Object.keys(monthlyData[svc.key]).sort((a, b) => a - b);
      monthlyData[svc.key] = weeks.map(wk => ({
        week: parseInt(wk),
        avg: parseFloat((monthlyData[svc.key][wk].total / monthlyData[svc.key][wk].count).toFixed(2)),
        count: monthlyData[svc.key][wk].count,
        reports: monthlyData[svc.key][wk].reports
      }));
    });

    const insights = {};
    SERVICE_CONFIGS.forEach(svc => {
      const svcReports = byService[svc.key].filter(r => r.overall_score != null);
      if (svcReports.length === 0) {
        insights[svc.key] = { strengths: [], weaknesses: [], avgScore: 0, topItem: null, bottomItem: null };
        return;
      }

      const itemScores = {};
      svc.checklist.forEach(item => {
        itemScores[item.name] = { total: 0, count: 0, description: item.description };
      });

      svcReports.forEach(r => {
        (r.checklist || []).forEach(item => {
          if (item.rating > 0 && itemScores[item.name]) {
            itemScores[item.name].total += item.rating;
            itemScores[item.name].count += 1;
          }
        });
      });

      const itemAvgs = Object.entries(itemScores)
        .filter(([_, v]) => v.count > 0)
        .map(([name, v]) => ({
          name,
          avg: parseFloat((v.total / v.count).toFixed(2)),
          description: v.description,
          count: v.count
        }))
        .sort((a, b) => b.avg - a.avg);

      const avgScore = parseFloat((svcReports.reduce((s, r) => s + (r.overall_score || 0), 0) / svcReports.length).toFixed(2));

      insights[svc.key] = {
        strengths: itemAvgs.filter(i => i.avg >= 4).slice(0, 3),
        weaknesses: itemAvgs.filter(i => i.avg < 3).slice(0, 3),
        avgScore,
        topItem: itemAvgs[0] || null,
        bottomItem: itemAvgs[itemAvgs.length - 1] || null,
        allItems: itemAvgs
      };
    });

    return { annualData, monthlyData, insights, byService };
  }, [reports, dashboardYear, dashboardMonth]);

  // ─── Dashboard Sub-Components (unchanged) ─────────────────────────────────

  const AnnualView = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-700 flex items-center gap-2">
          <FaCalendar className="text-blue-500" /> Annual Overview — {dashboardYear}
        </h3>
        <div className="flex gap-1">
          {[2024, 2025, 2026].map(y => (
            <button
              key={y}
              onClick={() => setDashboardYear(y)}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                dashboardYear === y 
                  ? "bg-blue-600 text-white" 
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] sm:text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left font-bold text-slate-500 px-3 py-2.5 w-32">Service</th>
                {MONTH_NAMES.map(m => (
                  <th key={m} className="text-center font-bold text-slate-400 px-1 py-2.5 w-12">{m}</th>
                ))}
                <th className="text-center font-bold text-slate-500 px-3 py-2.5">Avg</th>
              </tr>
            </thead>
            <tbody>
              {SERVICE_CONFIGS.map(svc => {
                const data = analytics.annualData[svc.key];
                const yearAvg = data.filter(d => d.count > 0).length > 0
                  ? parseFloat((data.filter(d => d.count > 0).reduce((s, d) => s + d.avg, 0) / data.filter(d => d.count > 0).length).toFixed(2))
                  : 0;
                return (
                  <tr key={svc.key} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{svc.emoji}</span>
                        <span className="font-bold text-slate-700 truncate">{svc.key}</span>
                      </div>
                    </td>
                    {data.map((d, i) => (
                      <td key={i} className="px-1 py-2.5 text-center">
                        {d.count > 0 ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={`font-black ${
                              d.avg >= 4 ? "text-emerald-600" : d.avg >= 3 ? "text-amber-600" : d.avg >= 2 ? "text-orange-600" : "text-red-600"
                            }`}>{d.avg.toFixed(1)}</span>
                            <div className={`w-6 h-1 rounded-full ${
                              d.avg >= 4 ? "bg-emerald-400" : d.avg >= 3 ? "bg-amber-400" : d.avg >= 2 ? "bg-orange-400" : "bg-red-400"
                            }`} style={{ opacity: 0.3 + (d.avg / 5) * 0.7 }} />
                          </div>
                        ) : (
                          <span className="text-slate-200 font-bold">—</span>
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-center">
                      <ScoreBadge score={yearAvg} size="sm" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <h4 className="text-xs font-black text-slate-700 mb-4 flex items-center gap-2">
          <FaChartBar className="text-blue-500" /> Combined Monthly Performance
        </h4>
        <div className="flex items-end gap-1 h-32 px-2">
          {MONTH_NAMES.map((m, i) => {
            const monthScores = SERVICE_CONFIGS.map(svc => analytics.annualData[svc.key][i].avg).filter(s => s > 0);
            const monthAvg = monthScores.length > 0 ? monthScores.reduce((a, b) => a + b, 0) / monthScores.length : 0;
            const hasData = monthScores.length > 0;
            return (
              <div key={m} className="flex-1 flex flex-col items-center gap-1.5">
                <span className={`text-[9px] font-bold ${hasData ? "text-slate-600" : "text-slate-300"}`}>
                  {hasData ? monthAvg.toFixed(1) : "—"}
                </span>
                <div className="w-full flex items-end gap-0.5 h-20">
                  {SERVICE_CONFIGS.map(svc => {
                    const score = analytics.annualData[svc.key][i].avg;
                    return score > 0 ? (
                      <div
                        key={svc.key}
                        title={`${svc.key}: ${score.toFixed(1)}`}
                        className={`flex-1 ${svc.colors.bar} rounded-t-sm opacity-80 hover:opacity-100 transition-opacity`}
                        style={{ height: `${(score / 5) * 100}%` }}
                      />
                    ) : (
                      <div key={svc.key} className="flex-1 bg-slate-100 rounded-t-sm" style={{ height: "4px" }} />
                    );
                  })}
                </div>
                <span className="text-[9px] font-bold text-slate-400">{m}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-slate-100">
          {SERVICE_CONFIGS.map(svc => (
            <div key={svc.key} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${svc.colors.bar}`} />
              <span className="text-[9px] font-bold text-slate-500">{svc.key}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const MonthlyView = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-black text-slate-700 flex items-center gap-2">
          <FaCalendarWeek className="text-blue-500" /> 
          Monthly Breakdown — {MONTH_NAMES[dashboardMonth]} {dashboardYear}
        </h3>
        <div className="flex gap-1 flex-wrap">
          {MONTH_NAMES.map((m, i) => (
            <button
              key={m}
              onClick={() => setDashboardMonth(i)}
              className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all ${
                dashboardMonth === i 
                  ? "bg-blue-600 text-white" 
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {SERVICE_CONFIGS.map(svc => {
        const weeks = analytics.monthlyData[svc.key];
        const hasData = weeks.length > 0;
        return (
          <div key={svc.key} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className={`bg-gradient-to-r ${svc.colors.headerGrad} px-4 py-2.5 flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{svc.emoji}</span>
                <span className="text-xs font-black text-white">{svc.key}</span>
              </div>
              {hasData && (
                <ScoreBadge score={weeks.reduce((s, w) => s + w.avg, 0) / weeks.length} />
              )}
            </div>
            
            {!hasData ? (
              <div className="p-6 text-center">
                <p className="text-xs font-bold text-slate-300">No reports for this month</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {weeks.map(wk => (
                  <div key={wk.week} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Week {wk.week} · {wk.count} report{wk.count !== 1 ? "s" : ""}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-black ${wk.avg >= 4 ? "text-emerald-600" : wk.avg >= 3 ? "text-amber-600" : "text-red-600"}`}>
                          {wk.avg.toFixed(1)}
                        </span>
                        <MiniBar value={wk.avg} colorClass={svc.colors.bar} trackClass={svc.colors.barTrack} width="w-20" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {wk.reports.map(r => (
                        <div key={r.id} className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-slate-500">{r.report_date}</span>
                            {r.attendance_count && (
                              <span className="text-[9px] text-slate-400 ml-2">{r.attendance_count} pax</span>
                            )}
                          </div>
                          <ScoreBadge score={r.overall_score || 0} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-end gap-1 h-12 px-1">
                    {weeks.map((wk, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[9px] font-bold text-slate-500">{wk.avg.toFixed(1)}</span>
                        <div 
                          className={`w-full ${svc.colors.bar} rounded-t-sm opacity-80`}
                          style={{ height: `${(wk.avg / 5) * 100}%` }}
                        />
                        <span className="text-[8px] font-bold text-slate-400">W{wk.week}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const InsightsView = () => (
    <div className="space-y-5">
      <h3 className="text-sm font-black text-slate-700 flex items-center gap-2">
        <FaTrophy className="text-blue-500" /> Service Insights & Performance Analysis
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {SERVICE_CONFIGS.map(svc => {
          const insight = analytics.insights[svc.key];
          const hasData = insight.allItems && insight.allItems.length > 0;
          
          return (
            <div key={svc.key} className={`bg-white rounded-2xl border ${svc.colors.cardBorder} shadow-sm overflow-hidden`}>
              <div className={`bg-gradient-to-r ${svc.colors.headerGrad} px-4 py-3`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{svc.emoji}</span>
                    <div>
                      <h4 className="text-sm font-black text-white">{svc.key}</h4>
                      <p className="text-[10px] font-bold text-white/60">
                        {analytics.byService[svc.key].filter(r => r.overall_score != null).length} rated reports
                      </p>
                    </div>
                  </div>
                  {hasData && <ScoreBadge score={insight.avgScore} size="lg" />}
                </div>
              </div>

              <div className="p-4 space-y-4">
                {!hasData ? (
                  <p className="text-xs font-bold text-slate-300 text-center py-4">No data available yet</p>
                ) : (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                        <FaTrophy className="text-emerald-500 text-xs mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider block">Strongest Area</span>
                          <span className="text-xs font-bold text-emerald-800 block truncate">{insight.topItem.name}</span>
                          <span className="text-[9px] text-emerald-600 block truncate">{insight.topItem.description}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <MiniBar value={insight.topItem.avg} colorClass="bg-emerald-500" trackClass="bg-emerald-100" width="w-16" />
                            <span className="text-[10px] font-black text-emerald-700">{insight.topItem.avg.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                        <FaExclamationCircle className="text-red-500 text-xs mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <span className="text-[9px] font-bold text-red-700 uppercase tracking-wider block">Weakest Area</span>
                          <span className="text-xs font-bold text-red-800 block truncate">{insight.bottomItem.name}</span>
                          <span className="text-[9px] text-red-600 block truncate">{insight.bottomItem.description}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <MiniBar value={insight.bottomItem.avg} colorClass="bg-red-500" trackClass="bg-red-100" width="w-16" />
                            <span className="text-[10px] font-black text-red-700">{insight.bottomItem.avg.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-2">All Areas Ranked</span>
                      {insight.allItems.map((item, idx) => (
                        <div key={item.name} className="flex items-center gap-2">
                          <span className={`text-[10px] font-black w-4 text-center ${
                            idx === 0 ? "text-emerald-600" : 
                            idx === insight.allItems.length - 1 ? "text-red-500" : "text-slate-400"
                          }`}>{idx + 1}</span>
                          <span className="text-[10px] font-bold text-slate-600 flex-1 truncate" title={item.description}>{item.name}</span>
                          <MiniBar value={item.avg} colorClass={
                            item.avg >= 4 ? "bg-emerald-400" : 
                            item.avg >= 3 ? "bg-amber-400" : 
                            item.avg >= 2 ? "bg-orange-400" : "bg-red-400"
                          } trackClass="bg-slate-100" width="w-20" height="h-1" />
                          <span className={`text-[10px] font-black w-6 text-right ${
                            item.avg >= 4 ? "text-emerald-600" : 
                            item.avg >= 3 ? "text-amber-600" : 
                            item.avg >= 2 ? "text-orange-600" : "text-red-600"
                          }`}>{item.avg.toFixed(1)}</span>
                        </div>
                      ))}
                    </div>

                    {(insight.strengths.length > 0 || insight.weaknesses.length > 0) && (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                        <div>
                          <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block mb-1.5">
                            {insight.strengths.length} Strength{insight.strengths.length !== 1 ? "s" : ""}
                          </span>
                          <div className="space-y-1">
                            {insight.strengths.map(s => (
                              <span key={s.name} className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-1.5 py-0.5 block truncate">
                                {s.name}
                              </span>
                            ))}
                            {insight.strengths.length === 0 && (
                              <span className="text-[9px] text-slate-300 italic">No clear strengths yet</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-red-600 uppercase tracking-wider block mb-1.5">
                            {insight.weaknesses.length} Weakness{insight.weaknesses.length !== 1 ? "es" : ""}
                          </span>
                          <div className="space-y-1">
                            {insight.weaknesses.map(w => (
                              <span key={w.name} className="text-[9px] font-bold text-red-700 bg-red-50 border border-red-100 rounded-md px-1.5 py-0.5 block truncate">
                                {w.name}
                              </span>
                            ))}
                            {insight.weaknesses.length === 0 && (
                              <span className="text-[9px] text-slate-300 italic">No major weaknesses</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <h4 className="text-xs font-black text-slate-700 mb-4 flex items-center gap-2">
          <FaChartBar className="text-blue-500" /> Cross-Service Comparison
        </h4>
        <div className="space-y-3">
          {SERVICE_CONFIGS.map(svc => {
            const insight = analytics.insights[svc.key];
            const hasData = insight.allItems && insight.allItems.length > 0;
            return (
              <div key={svc.key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{svc.emoji}</span>
                    <span className="text-xs font-bold text-slate-700">{svc.key}</span>
                  </div>
                  <span className="text-xs font-black text-slate-500">{hasData ? insight.avgScore.toFixed(1) : "—"}</span>
                </div>
                {hasData ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${svc.colors.bar} rounded-full`}
                        style={{ width: `${(insight.avgScore / 5) * 100}%` }}
                      />
                    </div>
                    <div className="flex gap-1">
                      {insight.strengths.slice(0, 2).map(s => (
                        <span key={s.name} className="text-[8px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5">
                          {s.name}
                        </span>
                      ))}
                      {insight.weaknesses.slice(0, 2).map(w => (
                        <span key={w.name} className="text-[8px] font-bold text-red-700 bg-red-50 border border-red-100 rounded px-1.5 py-0.5">
                          {w.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-2 bg-slate-100 rounded-full" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900 antialiased overflow-x-hidden relative">

      {/* Back Button */}
      <div className="fixed top-3 left-3 z-40 sm:top-4 sm:left-4">
        <Link
          to="/ministries/administration"
          className="flex items-center gap-2 bg-white/90 backdrop-blur border border-slate-200 px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors shadow-sm"
        >
          <FaHome className="text-base" />
          <span className="hidden sm:inline">Back to Dashboard</span>
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-5 sm:py-6 md:py-8 pt-14 sm:pt-16">

        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2">
            <FaChartLine className="text-blue-600 text-lg sm:text-xl" />
            Services <span className="text-blue-600">Report</span>
          </h1>
          <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase mt-0.5 tracking-wider">
            Ministry quality tracking & improvement analytics
          </p>
        </div>

        {/* Service Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <FaSpinner className="animate-spin text-blue-500 text-2xl" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            {SERVICE_CONFIGS.map((svc) => {
              const { svcReports, latest, trend } = getServiceMeta(svc.key);
              const { colors } = svc;
              const progress = getPreServiceProgress(svc.key);
              
              return (
                <div key={svc.key} className={`bg-white rounded-2xl border ${colors.cardBorder} shadow-sm overflow-hidden flex flex-col`}>
                  <div className={`bg-gradient-to-br ${colors.headerGrad} px-4 py-3 sm:px-5 sm:py-4`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{svc.emoji}</span>
                        <div>
                          <h2 className="text-sm sm:text-base font-black text-white leading-tight">{svc.key}</h2>
                          <p className="text-[10px] font-bold text-white/60 mt-0.5">
                            {svcReports.length} session{svcReports.length !== 1 ? "s" : ""} logged
                          </p>
                        </div>
                      </div>
                      {trend && (
                        <span className={`text-[9px] sm:text-[10px] font-black px-2 py-1 rounded-full flex items-center gap-1 flex-shrink-0 ${trendBadgeStyle(trend.direction)}`}>
                          <TrendIcon direction={trend.direction} />
                          {trendLabel(trend.direction)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-4 sm:p-5 flex-1 flex flex-col gap-3">
                    {!latest ? (
                      <div className="flex-1 flex flex-col items-center justify-center py-6 text-center gap-2">
                        <span className="text-4xl opacity-25">{svc.emoji}</span>
                        <p className="text-xs font-bold text-slate-400">No reports yet</p>
                        <p className="text-[10px] text-slate-300 font-medium">Start tracking this service</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-end justify-between">
                          <div className="flex items-baseline gap-1">
                            <span className={`text-3xl sm:text-4xl font-black ${colors.scoreText}`}>
                              {(latest.overall_score ?? 0).toFixed(1)}
                            </span>
                            <span className="text-sm font-bold text-slate-400">/ 5.0</span>
                          </div>
                          {trend && (
                            <div className="text-right">
                              <div className={`text-xs font-black flex items-center gap-1 justify-end ${
                                trend.direction === "up" ? "text-emerald-600" : trend.direction === "down" ? "text-red-500" : "text-slate-400"
                              }`}>
                                <TrendIcon direction={trend.direction} className="text-[9px]" />
                                {trend.delta > 0 ? "+" : ""}{trend.delta} pts
                              </div>
                              <div className="text-[9px] text-slate-400 font-medium">vs last session</div>
                            </div>
                          )}
                        </div>
                        <div className={`h-2 ${colors.barTrack} rounded-full overflow-hidden`}>
                          <div className={`h-full ${colors.bar} rounded-full transition-all duration-500`} style={{ width: `${((latest.overall_score ?? 0) / 5) * 100}%` }} />
                        </div>
                        {svcReports.length >= 2 && (
                          <div>
                            <span className="text-[9px] font-bold uppercase text-slate-300 tracking-wider block mb-1">Session Trend</span>
                            <div className="flex items-end gap-0.5 h-7 bg-slate-50 rounded-lg px-1.5 py-1 border border-slate-100">
                              {svcReports.slice(0, 6).reverse().map((r, i) => (
                                <div key={i} title={`${r.report_date}: ${(r.overall_score ?? 0).toFixed(1)}`} className={`flex-1 ${colors.bar} rounded-sm opacity-75 transition-all`} style={{ height: `${Math.max(12, ((r.overall_score ?? 0) / 5) * 100)}%` }} />
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="space-y-1.5">
                          {(latest.checklist || []).map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-500 w-28 sm:w-32 truncate flex-shrink-0" title={item.description || ""}>{item.name}</span>
                              <div className={`flex-1 h-1.5 ${colors.barTrack} rounded-full overflow-hidden`}>
                                <div className={`h-full ${colors.bar} rounded-full transition-all`} style={{ width: `${((item.rating || 0) / 5) * 100}%` }} />
                              </div>
                              <span className={`text-[10px] font-black w-14 text-right ${RATING_COLORS[item.rating || 0]}`}>{item.rating || "–"}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-100">
                          <span className="flex items-center gap-1"><FaCalendarAlt className="text-[9px]" />{latest.report_date}</span>
                          {latest.attendance_count != null && <span className="flex items-center gap-1"><FaUsers className="text-[9px]" />{latest.attendance_count} pax</span>}
                        </div>
                        {latest.problems && (
                          <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
                            <FaExclamationTriangle className="text-red-400 text-xs mt-0.5 flex-shrink-0" />
                            <span className="text-[10px] font-medium text-red-600 leading-relaxed line-clamp-2">{latest.problems}</span>
                          </div>
                        )}
                      </>
                    )}
                    
                    {/* ═══════════════════════════════════════════════════════════
                        ACTION BUTTONS — Two separate entry points
                        ═══════════════════════════════════════════════════════════ */}
                    <div className="flex flex-col gap-2 mt-auto pt-1">
                      <div className="flex gap-2">
                        {/* ── Pre-Service Checklist Button ── */}
                        <button
                          onClick={() => openChecklist(svc)}
                          className={`flex-1 text-[11px] sm:text-xs font-black px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-sm bg-white border ${colors.cardBorder} text-slate-700 hover:bg-slate-50`}
                        >
                          <FaClipboardCheck className="text-[9px]" /> Pre-Service Checklist
                        </button>
                        {/* ── Log Ratings Button ── */}
                        <button
                          onClick={() => openLog(svc)}
                          className={`flex-1 text-[11px] sm:text-xs font-black px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-sm ${colors.button}`}
                        >
                          <FaStar className="text-[9px]" /> Log Ratings
                        </button>
                      </div>
                      {svcReports.length > 0 && (
                        <button
                          onClick={() => openHistory(svc)}
                          className={`w-full text-[11px] sm:text-xs font-bold px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all ${colors.ghostBtn}`}
                        >
                          <FaHistory className="text-[9px]" /> View History
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── ANALYTICS DASHBOARD ─────────────────────────────────────────── */}
        {!loading && reports.filter(r => r.overall_score != null).length > 0 && (
          <div className="mt-8 sm:mt-10 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-800 flex items-center gap-2">
                  <FaChartBar className="text-blue-600" />
                  Analytics Dashboard
                </h2>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                  Performance trends, patterns & actionable insights
                </p>
              </div>
            </div>

            <div className="flex gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-fit">
              {[
                { key: "annual", label: "Annual", icon: FaCalendar },
                { key: "monthly", label: "Monthly", icon: FaCalendarWeek },
                { key: "insights", label: "Insights", icon: FaTrophy },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveDashboardTab(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    activeDashboardTab === tab.key
                      ? "bg-blue-600 text-emerald-600 shadow-sm"
                      : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <tab.icon className="text-[10px]" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="animate-in fade-in duration-300">
              {activeDashboardTab === "annual" && <AnnualView />}
              {activeDashboardTab === "monthly" && <MonthlyView />}
              {activeDashboardTab === "insights" && <InsightsView />}
            </div>
          </div>
        )}

        {!loading && reports.filter(r => r.overall_score != null).length === 0 && (
          <div className="mt-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
            <FaChartBar className="text-slate-200 text-4xl mx-auto mb-3" />
            <h3 className="text-sm font-black text-slate-400">Analytics Dashboard</h3>
            <p className="text-[10px] text-slate-300 font-medium mt-1">Log your first report to unlock insights</p>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL — Switches between Checklist-only and Ratings-only views
          ═══════════════════════════════════════════════════════════════════════ */}
      {isModalOpen && activeService && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh]">
            <div className={`bg-gradient-to-r ${activeService.colors.headerGrad} px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between flex-shrink-0`}>
              <div>
                <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                  <span>{activeService.emoji}</span>
                  {activeService.key}
                </h3>
                <p className="text-[10px] font-semibold text-white/60 mt-0.5">
                  {modalMode === "history" ? "Report History & Trend" : 
                   modalMode === "edit" ? "Edit Report Entry" : 
                   modalMode === "checklist" ? "Pre-Service Checklist" : "Log New Report"}
                </p>
              </div>
              <button onClick={resetModal} className="text-white/70 hover:text-white p-1 cursor-pointer active:scale-95 transition-transform">
                <FaTimes />
              </button>
            </div>

            {/* ═════════════════════════════════════════════════════════════════
                MODE: PRE-SERVICE CHECKLIST (no ratings, no attendance, no problems)
                ═════════════════════════════════════════════════════════════════ */}
            {modalMode === "checklist" && (
              <form onSubmit={handleSavePreService} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
                {/* Service Date */}
                <div>
                  <label className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Service Date *</label>
                  <input
                    type="date" required
                    value={formDate} onChange={(e) => setFormDate(e.target.value)}
                    className="w-full text-xs font-semibold text-slate-700 border border-slate-200 bg-slate-50/50 rounded-xl px-2.5 py-2 focus:outline-none"
                  />
                </div>

                {/* Director Name */}
                <div>
                  <label className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Service Director</label>
                  <input
                    type="text" placeholder="e.g., Pastor John"
                    value={preServiceDirector} onChange={(e) => setPreServiceDirector(e.target.value)}
                    className="w-full text-xs font-semibold text-slate-700 border border-slate-200 bg-slate-50/50 rounded-xl px-2.5 py-2 focus:outline-none"
                  />
                </div>

                {/* Progress Bar */}
                {(() => {
                  const progress = getPreServiceProgress(activeService.key);
                  return (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Checklist Progress</span>
                        <span className={`text-xs font-black ${progress.percent === 100 ? "text-emerald-600" : progress.percent >= 75 ? "text-amber-600" : "text-slate-500"}`}>
                          {progress.checked}/{progress.total} ({progress.percent}%)
                        </span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${progress.percent === 100 ? "bg-emerald-500" : activeService.colors.bar}`}
                          style={{ width: `${progress.percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Grouped Checklist Items */}
                <div className="space-y-3">
                  {(() => {
                    const items = PRE_SERVICE_CHECKLISTS[activeService.key] || [];
                    const grouped = items.reduce((acc, item) => {
                      if (!acc[item.category]) acc[item.category] = [];
                      acc[item.category].push(item);
                      return acc;
                    }, {});
                    
                    return Object.entries(grouped).map(([category, catItems]) => (
                      <div key={category} className="space-y-2">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${activeService.colors.bar}`} />
                          {category}
                        </span>
                        <div className="space-y-1.5">
                          {catItems.map(item => {
                            const isChecked = !!preServiceChecks[item.id];
                            const Icon = item.icon;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => togglePreServiceCheck(item.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left cursor-pointer active:scale-[0.98] ${
                                  isChecked 
                                    ? `${activeService.colors.scoreBg} border-${activeService.colors.light}-200` 
                                    : "bg-white border-slate-200 hover:border-slate-300"
                                }`}
                              >
                                <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                  isChecked 
                                    ? `${activeService.colors.bar} border-transparent` 
                                    : "border-slate-300"
                                }`}>
                                  {isChecked && <FaCheck className="text-white text-[10px]" />}
                                </div>
                                <Icon className={`text-xs flex-shrink-0 ${isChecked ? activeService.colors.scoreText : "text-slate-400"}`} />
                                <span className={`text-xs font-bold flex-1 ${isChecked ? "text-slate-700 line-through opacity-70" : "text-slate-700"}`}>
                                  {item.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Additional Notes</label>
                  <textarea
                    rows="2" placeholder="Any issues, delays, or special arrangements..."
                    value={preServiceNotes} onChange={(e) => setPreServiceNotes(e.target.value)}
                    className="w-full text-xs font-medium text-slate-800 border border-slate-200 focus:border-slate-400 bg-slate-50/50 rounded-xl px-3 py-2 focus:outline-none resize-none"
                  />
                </div>

                {/* Save */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button type="button" onClick={resetModal} className="text-xs font-bold px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer active:scale-95 transition-transform">
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={preServiceSaved}
                    className={`text-xs font-black px-5 py-2 rounded-xl shadow-sm transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                      preServiceSaved 
                        ? "bg-emerald-600 text-white" 
                        : activeService.colors.button
                    }`}
                  >
                    {preServiceSaved ? (
                      <><FaCheckCircle /> Saved!</>
                    ) : (
                      "Save Checklist"
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* ═════════════════════════════════════════════════════════════════
                MODE: LOG / EDIT RATINGS (no pre-service checklist items)
                ═════════════════════════════════════════════════════════════════ */}
            {(modalMode === "log" || modalMode === "edit") && (
              <form onSubmit={handleSaveReport} noValidate className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Service Date *</label>
                    <input type="date" required value={formDate} onChange={(e) => setFormDate(e.target.value)} className="w-full text-xs font-semibold text-slate-700 border border-slate-200 bg-slate-50/50 rounded-xl px-2.5 py-2 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Head Count (opt)</label>
                    <input type="number" min="0" placeholder="e.g., 85" value={formAttendance} onChange={(e) => setFormAttendance(e.target.value)}
                    className="w-full text-xs font-semibold text-slate-700 border border-slate-200 bg-slate-50/50 rounded-xl px-2.5 py-2 focus:outline-none"
                  />
                </div>
              </div>

              {/* Ratings Section */}
              <div>
                <label className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Service Evaluation · 1 = Poor → 5 = Excellent
                </label>
                <div className="space-y-3 bg-slate-50/50 border border-slate-200 rounded-xl p-3 sm:p-3.5">
                  {formChecklist.map((item, idx) => {
                    const currentRating = item.rating || 0;
                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <span className="text-[11px] sm:text-xs font-bold text-slate-700 block truncate">
                              {item.name}
                            </span>
                            <span className="text-[9px] text-slate-400 leading-tight block truncate">
                              {item.description}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {[1, 2, 3, 4, 5].map((val) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setRating(idx, val)}
                                className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 transition-all cursor-pointer active:scale-90 flex-shrink-0 flex items-center justify-center text-[9px] font-bold ${
                                  currentRating >= val
                                    ? `${activeService.colors.bar} border-transparent shadow-sm text-blue-600`
                                    : "border-slate-300 hover:border-slate-400 bg-white text-slate-300"
                                }`}
                              >
                                {val}
                              </button>
                            ))}
                            <span className={`text-[10px] font-black w-16 text-right ${RATING_COLORS[currentRating]}`}>
                              {currentRating > 0 ? RATING_LABELS[currentRating] : "—"}
                            </span>
                          </div>
                        </div>
                        {currentRating > 0 && (
                          <div className={`text-[9px] font-medium px-2 py-1 rounded-lg ${RATING_BG_COLORS[currentRating]} ${RATING_COLORS[currentRating]}`}>
                            {RATING_DESCRIPTIONS[currentRating]}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Problems */}
              <div>
                <label className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Problems Encountered (opt)
                </label>
                <textarea
                  rows="2"
                  placeholder="Note any technical issues, coordination problems, or concerns..."
                  value={formProblems}
                  onChange={(e) => setFormProblems(e.target.value)}
                  className="w-full text-xs font-medium text-slate-800 border border-slate-200 focus:border-slate-400 bg-slate-50/50 rounded-xl px-3 py-2 focus:outline-none resize-none"
                />
              </div>

              {/* Projected Score */}
              {formChecklist.some((i) => i.rating > 0) && (
                <div className={`${activeService.colors.scoreBg} border ${activeService.colors.cardBorder} rounded-xl px-3 py-2.5 flex items-center justify-between`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${activeService.colors.scoreText}`}>
                    Projected Score
                  </span>
                  <span className={`text-lg font-black ${activeService.colors.scoreText}`}>
                    {computeScore(formChecklist).toFixed(1)} / 5.0
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={resetModal}
                  className="text-xs font-bold px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer active:scale-95 transition-transform"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`text-xs font-black px-5 py-2 rounded-xl shadow-sm transition-all cursor-pointer active:scale-95 ${activeService.colors.button}`}
                >
                  {modalMode === "edit" ? "Update Report" : "Save Report"}
                </button>
              </div>
            </form>
          )}

          {/* ═════════════════════════════════════════════════════════════════
              MODE: HISTORY (shows both pre-service and ratings entries)
              ═════════════════════════════════════════════════════════════════ */}
          {modalMode === "history" && (
  <div className="flex flex-col flex-1 overflow-hidden">
    {/* Header with tabs */}
    <div className="px-4 sm:px-5 pt-3 pb-0 border-b border-slate-100 flex-shrink-0">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
          {getServiceReports(activeService.key).length} Total Reports
        </span>
        <button
          onClick={() => openLog(activeService)}
          className={`text-[10px] sm:text-xs font-black px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all ${activeService.colors.button}`}
        >
          <FaPlus className="text-[8px]" /> Log New
        </button>
      </div>
      
      {/* Tab Switcher */}
      <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg w-fit mb-3">
        <button
          onClick={() => setHistoryTab("ratings")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
            historyTab === "ratings"
              ? "bg-white text-slate-700 shadow-sm"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <FaStar className="text-[9px]" /> Ratings
        </button>
        <button
          onClick={() => setHistoryTab("checklist")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
            historyTab === "checklist"
              ? "bg-white text-slate-700 shadow-sm"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <FaClipboardCheck className="text-[9px]" /> Pre-Service
        </button>
      </div>
    </div>

    {/* Content */}
    <div className="overflow-y-auto flex-1 p-4 sm:p-5 space-y-2">
      {historyTab === "ratings" ? (
        /* ═══════════════════════════════════════════════════════════════
           RATINGS TAB — Only shows reports with overall_score
           ═══════════════════════════════════════════════════════════════ */
        (() => {
          const ratedReports = getServiceReports(activeService.key).filter(r => r.overall_score != null);
          
          if (ratedReports.length === 0) {
            return (
              <div className="text-center py-10">
                <FaStar className="text-slate-200 text-3xl mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-300">No ratings logged yet</p>
                <button
                  onClick={() => { resetModal(); openLog(activeService); }}
                  className={`mt-3 text-[10px] font-black px-4 py-2 rounded-lg ${activeService.colors.button}`}
                >
                  Log First Rating
                </button>
              </div>
            );
          }

          return ratedReports.map((report, idx) => {
            const prevReport = ratedReports[idx + 1];
            let repTrend = null;
            if (prevReport) {
              const delta = parseFloat(((report.overall_score ?? 0) - (prevReport.overall_score ?? 0)).toFixed(2));
              repTrend = { delta, direction: delta > 0.05 ? "up" : delta < -0.05 ? "down" : "stable" };
            }
            const isExpanded = expandedReportId === report.id;

            return (
              <div key={report.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                {/* Header */}
                <button
                  onClick={() => setExpandedReportId(isExpanded ? null : report.id)}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50/60 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black text-slate-700">{report.report_date}</span>
                    {report.attendance_count != null && (
                      <span className="text-[9px] font-bold text-slate-400 flex items-center gap-0.5">
                        <FaUsers className="text-[8px]" /> {report.attendance_count}
                      </span>
                    )}
                    {report.problems && (
                      <FaExclamationTriangle className="text-red-400 text-[9px]" title="Issues noted" />
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {repTrend && (
                      <span className={`text-[9px] font-black flex items-center gap-0.5 ${
                        repTrend.direction === "up" ? "text-emerald-600" : 
                        repTrend.direction === "down" ? "text-red-500" : "text-slate-400"
                      }`}>
                        <TrendIcon direction={repTrend.direction} />
                        {repTrend.delta > 0 ? "+" : ""}{repTrend.delta}
                      </span>
                    )}
                    <span className={`text-sm font-black ${activeService.colors.scoreText}`}>
                      {(report.overall_score ?? 0).toFixed(1)}
                    </span>
                    <div className={`h-1.5 w-10 ${activeService.colors.barTrack} rounded-full overflow-hidden`}>
                      <div
                        className={`h-full ${activeService.colors.bar} rounded-full`}
                        style={{ width: `${((report.overall_score ?? 0) / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-2 border-t border-slate-100 space-y-2.5">
                    {/* Ratings */}
                    {(report.checklist || []).length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                          Service Ratings
                        </span>
                        {(report.checklist || []).map((item, iIdx) => (
                          <div key={iIdx} className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span
                                className="text-[10px] font-bold text-slate-500 w-28 truncate flex-shrink-0"
                                title={item.description || ""}
                              >
                                {item.name}
                              </span>
                              <div className={`flex-1 h-1.5 ${activeService.colors.barTrack} rounded-full overflow-hidden`}>
                                <div
                                  className={`h-full ${activeService.colors.bar} rounded-full`}
                                  style={{ width: `${((item.rating || 0) / 5) * 100}%` }}
                                />
                              </div>
                              <span className={`text-[10px] font-black w-14 text-right ${RATING_COLORS[item.rating || 0]}`}>
                                {item.rating > 0 ? RATING_LABELS[item.rating] : "—"}
                              </span>
                            </div>
                            {item.description && (
                              <p className="text-[9px] text-slate-400 pl-[7.5rem] leading-tight">
                                {item.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Problems */}
                    {report.problems && (
                      <div className="flex items-start gap-1.5 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
                        <FaExclamationTriangle className="text-red-400 text-[10px] mt-0.5 flex-shrink-0" />
                        <span className="text-[10px] font-medium text-red-600 leading-relaxed">
                          {report.problems}
                        </span>
                      </div>
                    )}

                    {/* Edit Button */}
                    <div className="flex justify-end pt-0.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(activeService, report);
                        }}
                        className="text-[10px] font-bold px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
                      >
                        <FaEdit className="text-[9px]" /> Edit Entry
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          });
        })()
      ) : (
        /* ═══════════════════════════════════════════════════════════════
           PRE-SERVICE CHECKLIST TAB — Only shows reports with pre_service_checklist
           ═══════════════════════════════════════════════════════════════ */
        (() => {
          const checklistReports = getServiceReports(activeService.key).filter(
            r => r.pre_service_checklist && Object.keys(r.pre_service_checklist).length > 0
          );
          
          if (checklistReports.length === 0) {
            return (
              <div className="text-center py-10">
                <FaClipboardCheck className="text-slate-200 text-3xl mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-300">No pre-service checklists yet</p>
                <button
                  onClick={() => { resetModal(); openChecklist(activeService); }}
                  className={`mt-3 text-[10px] font-black px-4 py-2 rounded-lg ${activeService.colors.button}`}
                >
                  Log First Checklist
                </button>
              </div>
            );
          }

          return checklistReports.map((report) => {
            const isExpanded = expandedReportId === report.id;
            const checkedCount = Object.values(report.pre_service_checklist).filter(Boolean).length;
            const totalItems = (PRE_SERVICE_CHECKLISTS[activeService.key] || []).length;
            const percent = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

            return (
              <div key={report.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                {/* Header */}
                <button
                  onClick={() => setExpandedReportId(isExpanded ? null : report.id)}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50/60 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black text-slate-700">{report.report_date}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      percent === 100 
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                        : "bg-blue-50 text-blue-600 border border-blue-100"
                    }`}>
                      {checkedCount}/{totalItems} checked
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black ${
                      percent === 100 ? "text-emerald-600" : "text-blue-600"
                    }`}>
                      {percent}%
                    </span>
                    <div className="h-1.5 w-10 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          percent === 100 ? "bg-emerald-500" : activeService.colors.bar
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-2 border-t border-slate-100 space-y-2.5">
                    {/* Director */}
                    {report.pre_service_director && (
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                        <FaUserFriends className="text-slate-400 text-[9px]" />
                        Director: {report.pre_service_director}
                      </div>
                    )}

                    {/* Checked Items by Category */}
                    <div className="space-y-2">
                      {(() => {
                        const allItems = PRE_SERVICE_CHECKLISTS[activeService.key] || [];
                        const checkedIds = Object.entries(report.pre_service_checklist)
                          .filter(([_, v]) => v)
                          .map(([k]) => k);
                        
                        const grouped = allItems
                          .filter(item => checkedIds.includes(item.id))
                          .reduce((acc, item) => {
                            if (!acc[item.category]) acc[item.category] = [];
                            acc[item.category].push(item);
                            return acc;
                          }, {});

                        return Object.entries(grouped).map(([category, items]) => (
                          <div key={category}>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                              {category}
                            </span>
                            <div className="space-y-1">
                              {items.map(item => {
                                const Icon = item.icon;
                                return (
                                  <div key={item.id} className="flex items-center gap-2 text-[10px] font-bold text-slate-700">
                                    <FaCheckCircle className="text-emerald-500 text-[9px]" />
                                    <Icon className="text-slate-400 text-[9px]" />
                                    {item.label}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ));
                      })()}

                      {/* Unchecked items (optional — shows what's missing) */}
                      {(() => {
                        const allItems = PRE_SERVICE_CHECKLISTS[activeService.key] || [];
                        const uncheckedIds = Object.entries(report.pre_service_checklist)
                          .filter(([_, v]) => !v)
                          .map(([k]) => k);
                        
                        if (uncheckedIds.length === 0) return null;

                        const uncheckedItems = allItems.filter(item => uncheckedIds.includes(item.id));
                        
                        return (
                          <div className="pt-1">
                            <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider block mb-1">
                              Incomplete
                            </span>
                            <div className="space-y-1">
                              {uncheckedItems.map(item => {
                                const Icon = item.icon;
                                return (
                                  <div key={item.id} className="flex items-center gap-2 text-[10px] font-bold text-slate-400 opacity-60">
                                    <FaRegCircle className="text-slate-300 text-[9px]" />
                                    <Icon className="text-slate-300 text-[9px]" />
                                    {item.label}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Notes */}
                    {report.pre_service_notes && (
                      <div className="bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
                        <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider block mb-0.5">
                          Notes
                        </span>
                        <span className="text-[10px] font-medium text-amber-700 leading-relaxed">
                          {report.pre_service_notes}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          });
        })()
      )}
    </div>
  </div>
)}
        </div>
      </div>
    )}
  </div>
);
}