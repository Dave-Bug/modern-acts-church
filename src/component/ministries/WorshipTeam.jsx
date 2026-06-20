import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaHome, FaMusic, FaCalendarAlt, FaUsers, FaMicrophone, FaPlus } from "react-icons/fa";
import { supabase } from "../../Services/supabase";

export default function WorshipTeam() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("worship_schedules")
        .select("*")
        .order("date", { ascending: true });

      if (!error) setSchedules(data || []);
    } catch (err) {
      console.error("Error fetching worship schedules:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      {/* Back Button */}
      <div className="fixed top-3 left-3 z-50">
        <Link
          to="/Ministries"
          className="flex items-center gap-2 bg-white/80 backdrop-blur border border-slate-200 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors shadow-sm"
        >
          <FaHome />
          <span className="hidden sm:inline">Back</span>
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-10 md:py-14 pt-16 sm:pt-20">
        {/* Header */}
        <div className="text-center mb-8 md:mb-10">
          <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center text-xl mx-auto mb-3">
            <FaMusic />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-black">
            Worship <span className="text-sky-600">Team</span>
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-2 max-w-sm mx-auto">
            Schedule worship services, manage song lineups, and coordinate team rotations.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 md:gap-5 max-w-3xl mx-auto mb-8">
          <div className="bg-white/80 backdrop-blur border border-slate-200 rounded-xl p-4 text-center">
            <FaCalendarAlt className="text-sky-500 text-lg mx-auto mb-2" />
            <div className="text-xl font-black text-slate-800">{schedules.length}</div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase">Upcoming</div>
          </div>
          <div className="bg-white/80 backdrop-blur border border-slate-200 rounded-xl p-4 text-center">
            <FaUsers className="text-sky-500 text-lg mx-auto mb-2" />
            <div className="text-xl font-black text-slate-800">12</div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase">Members</div>
          </div>
          <div className="bg-white/80 backdrop-blur border border-slate-200 rounded-xl p-4 text-center">
            <FaMicrophone className="text-sky-500 text-lg mx-auto mb-2" />
            <div className="text-xl font-black text-slate-800">4</div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase">This Week</div>
          </div>
        </div>

        {/* Schedule List */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800">Service Schedule</h2>
            <button className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors">
              <FaPlus size={10} /> New Schedule
            </button>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-12 text-sm text-slate-400">Loading schedules...</div>
            ) : schedules.length === 0 ? (
              <div className="text-center py-12">
                <FaMusic className="text-slate-200 text-4xl mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-500">No upcoming schedules</p>
                <p className="text-xs text-slate-400 mt-1">Create a new worship service lineup to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {schedules.map((s) => (
                  <div key={s.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-4 hover:border-sky-200 transition-colors">
                    <div>
                      <div className="font-bold text-slate-800">{s.title || "Worship Service"}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{new Date(s.date).toLocaleDateString()} • {s.time || "TBD"}</div>
                    </div>
                    <div className="text-xs font-bold text-sky-600 bg-sky-50 px-3 py-1 rounded-full border border-sky-100">
                      {s.leader || "Unassigned"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}