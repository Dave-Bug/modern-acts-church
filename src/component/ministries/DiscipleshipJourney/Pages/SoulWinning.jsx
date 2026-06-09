import { useState, useEffect } from "react";
import { FaSearch, FaUser, FaCalendarAlt, FaSpinner, FaArrowRight } from "react-icons/fa";
import { supabase } from "../../../../Services/supabase";

export default function SoulWinning() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Women");
  const [editingMentorId, setEditingMentorId] = useState(null);
  const [mentorValue, setMentorValue] = useState("");

  useEffect(() => {
    fetchSoulWinningData();
  }, []);

  async function fetchSoulWinningData() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("consolidation_pipeline")
        .select("*")
        .eq("current_stage", "Soul Winning")
        .order("full_name", { ascending: true });

      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error("Soul Winning read error:", err.message);
    } finally {
      setLoading(false);
    }
  }

  // Handle Dropdown Status Change (Active / Inactive)
  const handleStatusChange = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from("consolidation_pipeline")
        .update({ soul_winning_status: newStatus })
        .eq("id", id);

      if (error) throw error;
      setRecords(records.map(r => r.id === id ? { ...r, soul_winning_status: newStatus } : r));
    } catch (err) {
      console.error("Status update fail:", err.message);
    }
  };

  const saveMentorUpdate = async (id) => {
    try {
      const { error } = await supabase
        .from("consolidation_pipeline")
        .update({ mentor: mentorValue.trim() || null })
        .eq("id", id);

      if (error) throw error;
      setRecords(records.map(r => r.id === id ? { ...r, mentor: mentorValue.trim() } : r));
      setEditingMentorId(null);
    } catch (err) {
      console.error("Mentor assignment fault:", err.message);
    }
  };

  const handleNextProcessHandoff = async (record) => {
    if (record.soul_winning_status !== "Active") {
      alert("Status tracking must be Active to shift to Soaking module.");
      return;
    }
    
    if (window.confirm(`Graduate ${record.full_name} to the Soaking track?`)) {
      try {
        const { error } = await supabase
          .from("consolidation_pipeline")
          .update({ 
            current_stage: "Soaking",
            soaking_status: "Active" // Set initial status for next view
          })
          .eq("id", record.id);

        if (error) throw error;
        setRecords(records.filter(r => r.id !== record.id));
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const filteredRecords = records.filter((r) => {
    if (r.gender_category !== activeTab) return false;
    const term = searchQuery.toLowerCase();
    return (
      (r.full_name || "").toLowerCase().includes(term) ||
      (r.mentor || "").toLowerCase().includes(term) ||
      (r.tribe || "").toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-5 animate-fadeIn">
      <div>
        <h1 className="text-xl font-black tracking-tight text-slate-900">Soul Winning Pipeline</h1>
        <p className="text-xs font-semibold text-slate-400 mt-0.5">Active relational evangelism tracking and mentor oversight dashboard</p>
      </div>

      <div className="flex border-b border-slate-200 gap-4">
        {["Women", "Men"].map((gender) => (
          <button
            key={gender}
            onClick={() => setActiveTab(gender)}
            className={`pb-2.5 px-1.5 text-xs sm:text-sm font-black border-b-2 relative top-[2px] transition-all cursor-pointer ${
              activeTab === gender ? "border-red-500 text-red-500" : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {gender}'s Active Lineup
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-xs flex items-center gap-2 max-w-md">
        <FaSearch className="text-slate-400 ml-1.5 text-xs" />
        <input
          type="text"
          placeholder="Filter names, tribes, mentors..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex items-center justify-center py-16"><FaSpinner className="animate-spin text-red-500 text-lg" /></div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-16 text-center text-xs font-bold text-slate-400">No records have been moved to Soul Winning yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[950px]">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Date Invited</th>
                  <th className="py-3 px-4">Invited By</th>
                  <th className="py-3 px-4 text-center">Age</th>
                  <th className="py-3 px-4">Tribe</th>
                  <th className="py-3 px-4">Mentor Assignment</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Soaking</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                {filteredRecords.map((person) => (
                  <tr key={person.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                      <FaUser className="text-slate-300 text-xs" /> {person.full_name}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <div className="flex items-center gap-1.5"><FaCalendarAlt className="text-slate-400 text-[11px]" /> {person.date_invited}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-bold">{person.invited_by || "Direct Intake"}</td>
                    <td className="py-3 px-4 text-center text-slate-700 font-mono">{person.age || "—"}</td>
                    <td className="py-3 px-4"><span className="text-slate-800 font-extrabold bg-slate-100 px-2 py-0.5 rounded-md text-[10px]">{person.tribe || "None"}</span></td>
                    <td className="py-3 px-4">
                      {editingMentorId === person.id ? (
                        <div className="flex items-center gap-1">
                          <input 
                            type="text" 
                            value={mentorValue} 
                            onChange={(e) => setMentorValue(e.target.value)}
                            onBlur={() => saveMentorUpdate(person.id)}
                            onKeyDown={(e) => e.key === 'Enter' && saveMentorUpdate(person.id)}
                            autoFocus
                            className="border border-slate-300 px-2 py-1 rounded-md text-xs font-semibold bg-white focus:outline-none"
                          />
                        </div>
                      ) : (
                        <div 
                          onClick={() => { setEditingMentorId(person.id); setMentorValue(person.mentor || ""); }}
                          className="text-blue-600 hover:underline cursor-pointer italic font-bold"
                        >
                          {person.mentor || "Assign Mentor +"}
                        </div>
                      )}
                    </td>
                    
                    {/* DROP DOWN SELECTION COLUMN */}
                    <td className="py-3 px-4 text-center">
                      <select
                        value={person.soul_winning_status === "Active" ? "Active" : "Inactive"}
                        onChange={(e) => handleStatusChange(person.id, e.target.value)}
                        className={`text-[11px] font-bold px-2 py-1 rounded border focus:outline-none cursor-pointer transition-colors ${
                          person.soul_winning_status === "Active"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : "bg-rose-50 border-rose-200 text-rose-700"
                        }`}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleNextProcessHandoff(person)}
                        disabled={person.soul_winning_status !== "Active"}
                        className={`text-[10px] font-black px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 mx-auto ${
                          person.soul_winning_status === "Active" 
                            ? "bg-slate-900 text-black hover:bg-slate-800 cursor-pointer active:scale-95" 
                            : "bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200"
                        }`}
                      >
                        Proceed <FaArrowRight className="text-[9px]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}