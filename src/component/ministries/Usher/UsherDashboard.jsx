import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { FaHome, FaUsers, FaClipboardCheck } from "react-icons/fa";
import { supabase } from "../../../Services/supabase";

export default function UsherDashboardHub() {
  const navigate = useNavigate();
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getQuickStats() {
      try {
        const { count, error } = await supabase
          .from("usher_members")
          .select("*", { count: "exact", head: true });

        if (!error && count !== null) {
          setTotalCount(count);
        }
      } catch (err) {
        console.error("Error pulling quick stats:", err);
      } finally {
        setLoading(false);
      }
    }
    getQuickStats();
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      {/* Back Button */}
      <div className="fixed top-4 left-4 z-50">
        <Link
          to="/Ministries"
          className="flex items-center gap-2 bg-white/80 backdrop-blur border border-slate-200 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors"
        >
          <FaHome />
          Back
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10 md:py-14 pt-16">
        {/* Header */}
        <div className="text-center mb-8 md:mb-10">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-xl mx-auto mb-3">
            🙏
          </div>
          <h1 className="text-3xl md:text-5xl font-black">
            Usher <span className="text-blue-600">Ministry</span>
          </h1>
          <p className="text-slate-500 text-xs md:text-sm mt-2 max-w-sm mx-auto">
            Welcome back! Select a workspace module below to manage team operations.
          </p>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-5 max-w-3xl mx-auto">
          {/* Members Card */}
          <button
            onClick={() => navigate("/ministries/usher/ushermember")}
            className="bg-white/80 backdrop-blur border border-slate-200 rounded-xl p-5 md:p-6 text-left hover:shadow-md hover:-translate-y-1 transition-all duration-300 group"
          >
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-lg mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <FaUsers />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              See Members
            </h2>
            <p className="text-slate-500 text-xs md:text-sm leading-relaxed mb-3">
              View the full directory roster, add new recruits, alter designations, or manage team contact logs.
            </p>
            <span className="text-[10px] md:text-xs font-semibold text-slate-400 bg-slate-100 inline-block px-2.5 py-1 rounded-md">
              {loading ? "Counting..." : `${totalCount} Members Registered`}
            </span>
          </button>

          {/* Attendance Card */}
          <button
           onClick={() => navigate("/ministries/usher/usherattendance")}
            className="bg-white/80 backdrop-blur border border-slate-200 rounded-xl p-5 md:p-6 text-left hover:shadow-md hover:-translate-y-1 transition-all duration-300 group"
          >
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-lg mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <FaClipboardCheck />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              Check Attendance
            </h2>
            <p className="text-slate-500 text-xs md:text-sm leading-relaxed mb-3">
              Log service check-ins, record shift availability tracker data, and audit historical service roll calls.
            </p>
            <span className="text-[10px] md:text-xs font-semibold text-emerald-600 bg-emerald-50 inline-block px-2.5 py-1 rounded-md">
              Ready for Roll Call
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}