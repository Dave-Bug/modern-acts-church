import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FaHome, FaCalendarAlt, FaClipboardList, FaUserShield, FaLock } from "react-icons/fa";
import { supabase } from "../../../Services/supabase";

export default function AdministrationDashboardHub() {
  const navigate = useNavigate();
  const [totalEvents, setTotalEvents] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const [totalPendingUsers, setTotalPendingUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // 🔒 Security Check: Read status directly from church_session_user
    const verifyAdminClearance = () => {
      try {
        const storedUser = localStorage.getItem("church_session_user");
        
        if (!storedUser) {
          setIsAdmin(false);
          return;
        }

        const parsedUser = JSON.parse(storedUser);
        
        // Check status field directly from localStorage (case-insensitive)
        if (parsedUser.status && parsedUser.status.toLowerCase() === "admin") {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }

      } catch (err) {
        console.error("Security check failed:", err);
        setIsAdmin(false);
      }
    };

    async function getQuickStats() {
      try {
        setLoading(true);

        const { count: eventCount, error: eventError } = await supabase
          .from("administration_logs")
          .select("*", { count: "exact", head: true })
          .eq("type", "event");

        const { count: taskCount, error: taskError } = await supabase
          .from("administration_logs")
          .select("*", { count: "exact", head: true })
          .eq("type", "task");

        const { count: pendingCount, error: pendingError } = await supabase
          .from("church_auth")
          .select("*", { count: "exact", head: true })
          .eq("access", "Pending");

        if (!eventError && eventCount !== null) setTotalEvents(eventCount);
        if (!taskError && taskCount !== null) setTotalTasks(taskCount);
        if (!pendingError && pendingCount !== null) setTotalPendingUsers(pendingCount);

      } catch (err) {
        console.error("Error pulling administration quick stats:", err);
      } finally {
        setLoading(false);
      }
    }

    verifyAdminClearance();
    getQuickStats();
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      {/* Back Button */}
      <div className="fixed top-3 left-3 z-50 sm:top-4 sm:left-4">
        <Link
          to="/Ministries"
          className="flex items-center gap-2 bg-white/80 backdrop-blur border border-slate-200 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors shadow-sm"
        >
          <FaHome />
          <span className="hidden sm:inline">Back</span>
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10 md:py-14 pt-16 sm:pt-20">
        {/* Header */}
        <div className="text-center mb-8 md:mb-10">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-xl mx-auto mb-3">
            💼
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-black">
            Admin <span className="text-blue-600">Workspace</span>
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-2 max-w-sm mx-auto px-2">
            Welcome back! Select a workspace module below to manage church administration, logistics, and personnel security options.
          </p>
        </div>

        {/* Navigation Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5 max-w-5xl mx-auto">

          {/* Module 1: Events Card */}
          <button
            onClick={() => navigate("/ministries/administration/event")}
            className="bg-white/80 backdrop-blur border border-slate-200 rounded-xl p-5 sm:p-6 text-left hover:shadow-md hover:-translate-y-1 transition-all duration-300 group active:scale-[0.98]"
          >
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-lg mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <FaCalendarAlt />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-1">
              Manage Events
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed mb-3">
              Schedule master calendar activities, organize venue layouts, coordinate department time blocks, and monitor special services.
            </p>
            <span className="text-[10px] sm:text-xs font-semibold text-slate-400 bg-slate-100 inline-block px-2.5 py-1 rounded-md">
              {loading ? "Counting..." : `${totalEvents} Scheduled Events`}
            </span>
          </button>

          {/* Module 2: Tasks Card */}
          <button
            onClick={() => navigate("/ministries/administration/task")}
            className="bg-white/80 backdrop-blur border border-slate-200 rounded-xl p-5 sm:p-6 text-left hover:shadow-md hover:-translate-y-1 transition-all duration-300 group active:scale-[0.98]"
          >
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-lg mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <FaClipboardList />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-1">
              Operational Tasks
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed mb-3">
              Track operational action items, deploy material check-lists, assign team responsibilities, and monitor pending task streams.
            </p>
            <span className="text-[10px] sm:text-xs font-semibold text-emerald-600 bg-emerald-50 inline-block px-2.5 py-1 rounded-md">
              {loading ? "Counting..." : `${totalTasks} Active Tasks`}
            </span>
          </button>

          {/* Module 3: Account Management Card (Restricted) */}
          <button
            onClick={() => {
              if (isAdmin) {
                navigate("/ministries/administration/accounts");
              } else {
                alert("Security Clearance Denied: Only accounts with 'Admin' status can manage system accounts.");
              }
            }}
            className={`relative bg-white/80 backdrop-blur border border-slate-200 rounded-xl p-5 sm:p-6 text-left transition-all duration-300 sm:col-span-2 lg:col-span-1 ${
              isAdmin 
                ? "hover:shadow-md hover:-translate-y-1 group active:scale-[0.98] cursor-pointer" 
                : "opacity-70 cursor-not-allowed bg-slate-50/50"
            }`}
          >
            {!isAdmin && (
              <div className="absolute top-5 right-5 text-slate-300" title="Admin clearance required">
                <FaLock className="text-lg" />
              </div>
            )}

            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg mb-4 transition-colors ${
              isAdmin ? "bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white" : "bg-slate-200 text-slate-400"
            }`}>
              <FaUserShield />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
              Account Gatekeeper
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed mb-3">
              Review incoming profile logs, grant role access clearance parameters (Admin/Editor/Viewer), and approve secure registration fields.
            </p>
            <span className={`text-[10px] sm:text-xs font-semibold inline-block px-2.5 py-1 rounded-md ${
              !isAdmin ? "bg-slate-100 text-slate-400" :
              totalPendingUsers > 0 
                ? "bg-amber-50 text-amber-600 font-bold border border-amber-100 animate-pulse" 
                : "bg-indigo-50 text-indigo-600"
            }`}>
              {loading ? "Counting..." : !isAdmin ? "Restricted Access" : `${totalPendingUsers} Pending Requests`}
            </span>
          </button>

        </div>
      </div>
    </div>
  );
}