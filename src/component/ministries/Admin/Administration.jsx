import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FaHome, FaCalendarAlt, FaClipboardList } from "react-icons/fa";
import { supabase } from "../../../Services/supabase";

export default function AdministrationDashboardHub() {
  const navigate = useNavigate();
  const [totalEvents, setTotalEvents] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getQuickStats() {
      try {
        setLoading(true);

        // Fetch count for events from administration_logs table where type is 'event'
        const { count: eventCount, error: eventError } = await supabase
          .from("administration_logs")
          .select("*", { count: "exact", head: true })
          .eq("type", "event");

        // Fetch count for tasks from administration_logs table where type is 'task'
        const { count: taskCount, error: taskError } = await supabase
          .from("administration_logs")
          .select("*", { count: "exact", head: true })
          .eq("type", "task");

        if (!eventError && eventCount !== null) setTotalEvents(eventCount);
        if (!taskError && taskCount !== null) setTotalTasks(taskCount);

      } catch (err) {
        console.error("Error pulling administration quick stats:", err);
      } finally {
        setLoading(false);
      }
    }
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
            Welcome back! Select a workspace module below to manage church administration and logistics operations.
          </p>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-5 max-w-3xl mx-auto">

          {/* Events Card */}
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

          {/* Tasks Card */}
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

        </div>
      </div>
    </div>
  );
}