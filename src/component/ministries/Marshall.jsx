import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaHome, FaShieldAlt, FaCalendarAlt, FaUsers, FaExclamationTriangle, FaCheckCircle, FaPlus } from "react-icons/fa";
import { supabase } from "../../Services/supabase";

export default function MarshallTeam() {
  const [shifts, setShifts] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [{ data: shiftData }, { data: incidentData }] = await Promise.all([
        supabase.from("marshall_shifts").select("*").order("date", { ascending: true }),
        supabase.from("marshall_incidents").select("*").order("created_at", { ascending: false }).limit(5)
      ]);

      setShifts(shiftData || []);
      setIncidents(incidentData || []);
    } catch (err) {
      console.error("Error fetching marshall data:", err);
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
          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center text-xl mx-auto mb-3">
            <FaShieldAlt />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-black">
            Marshall <span className="text-indigo-600">Team</span>
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-2 max-w-sm mx-auto">
            Manage safety shifts, incident reports, and security protocols for church operations.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 md:gap-5 max-w-3xl mx-auto mb-8">
          <div className="bg-white/80 backdrop-blur border border-slate-200 rounded-xl p-4 text-center">
            <FaCalendarAlt className="text-indigo-500 text-lg mx-auto mb-2" />
            <div className="text-xl font-black text-slate-800">{shifts.length}</div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase">Active Shifts</div>
          </div>
          <div className="bg-white/80 backdrop-blur border border-slate-200 rounded-xl p-4 text-center">
            <FaUsers className="text-indigo-500 text-lg mx-auto mb-2" />
            <div className="text-xl font-black text-slate-800">8</div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase">On Duty</div>
          </div>
          <div className="bg-white/80 backdrop-blur border border-slate-200 rounded-xl p-4 text-center">
            <FaExclamationTriangle className="text-indigo-500 text-lg mx-auto mb-2" />
            <div className="text-xl font-black text-slate-800">{incidents.length}</div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase">Reports</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Shift Schedule */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Duty Shifts</h2>
              <button className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors">
                <FaPlus size={10} /> Add Shift
              </button>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="text-center py-12 text-sm text-slate-400">Loading shifts...</div>
              ) : shifts.length === 0 ? (
                <div className="text-center py-12">
                  <FaShieldAlt className="text-slate-200 text-4xl mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-500">No shifts scheduled</p>
                  <p className="text-xs text-slate-400 mt-1">Add a new duty shift to start tracking coverage.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {shifts.map((s) => (
                    <div key={s.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-4 hover:border-indigo-200 transition-colors">
                      <div>
                        <div className="font-bold text-slate-800">{s.location || "Main Sanctuary"}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{new Date(s.date).toLocaleDateString()} • {s.time || "TBD"}</div>
                      </div>
                      <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                        {s.marshall || "Unassigned"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Incident Reports */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Recent Incidents</h2>
              <button className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors">
                <FaPlus size={10} /> Log Report
              </button>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="text-center py-12 text-sm text-slate-400">Loading reports...</div>
              ) : incidents.length === 0 ? (
                <div className="text-center py-12">
                  <FaCheckCircle className="text-emerald-200 text-4xl mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-500">All clear</p>
                  <p className="text-xs text-slate-400 mt-1">No incident reports on file.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {incidents.map((inc) => (
                    <div key={inc.id} className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        inc.severity === "High" ? "bg-red-500" : inc.severity === "Medium" ? "bg-amber-500" : "bg-emerald-500"
                      }`} />
                      <div className="flex-1">
                        <div className="font-bold text-slate-800 text-sm">{inc.title || "Incident Report"}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{inc.description || "No details provided."}</div>
                        <div className="text-[10px] text-slate-400 mt-1">{new Date(inc.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}