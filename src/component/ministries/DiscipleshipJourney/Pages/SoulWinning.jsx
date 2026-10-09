import { useState, useEffect } from "react";
import { 
  FaSearch, FaUser, FaCalendarAlt, FaSpinner, FaArrowRight,
  FaChevronDown, FaChevronUp, FaUserCheck, FaIdCard 
} from "react-icons/fa";
import { supabase } from "../../../../Services/supabase";

export default function SoulWinning() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Women");
  const [editingMentorId, setEditingMentorId] = useState(null);
  const [mentorValue, setMentorValue] = useState("");

  // Dynamic dropdown list for Ministers / Mentors
  const [ministers, setMinisters] = useState([]);
  
  // Mobile accordion state toggle mapping
  const [expandedCardId, setExpandedCardId] = useState(null);

  useEffect(() => {
    fetchSoulWinningData();
    fetchMinistersList();
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

  // Fetch full list from usher_members to populate choices
  async function fetchMinistersList() {
    try {
      const { data, error } = await supabase
        .from("usher_members")
        .select("first_name, last_name")
        .order("first_name", { ascending: true });

      if (error) throw error;
      setMinisters(data || []);
    } catch (err) {
      console.error("Error reading ministers list database registers:", err.message);
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

  const saveMentorUpdate = async (id, selectedValue) => {
    const finalValue = selectedValue !== undefined ? selectedValue : mentorValue;
    try {
      const { error } = await supabase
        .from("consolidation_pipeline")
        .update({ mentor: finalValue.trim() || null })
        .eq("id", id);

      if (error) throw error;
      setRecords(records.map(r => r.id === id ? { ...r, mentor: finalValue.trim() } : r));
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
            soaking_status: "Active" 
          })
          .eq("id", record.id);

        if (error) throw error;
        setRecords(records.filter(r => r.id !== record.id));
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const toggleCardExpansion = (id) => {
    setExpandedCardId(expandedCardId === id ? null : id);
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
    <div className="space-y-5 animate-fadeIn pb-6">
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
          <div className="flex items-center justify-center py-16">
            <FaSpinner className="animate-spin text-red-500 text-lg" />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-16 text-center text-xs font-bold text-slate-400">
            No records have been moved to Soul Winning yet.
          </div>
        ) : (
          <>
            {/* ================= DESKTOP BREAKPOINT VIEW ================= */}
            <div className="hidden md:block overflow-x-auto">
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
                        <div className="flex items-center gap-1.5">
                          <FaCalendarAlt className="text-slate-400 text-[11px]" /> {person.date_invited}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-bold">{person.invited_by || "Direct Intake"}</td>
                      <td className="py-3 px-4 text-center text-slate-700 font-mono">{person.age || "—"}</td>
                      <td className="py-3 px-4">
                        <span className="text-slate-800 font-extrabold bg-slate-100 px-2 py-0.5 rounded-md text-[10px]">
                          {person.tribe || "None"}
                        </span>
                      </td>
                      
                      {/* DESKTOP RE-ENGINEERED TO SELECT MINISTERS DROPDOWN */}
                      <td className="py-3 px-4">
                        {editingMentorId === person.id ? (
                          <select
                            value={person.mentor || ""}
                            onChange={(e) => {
                              setMentorValue(e.target.value);
                              saveMentorUpdate(person.id, e.target.value);
                            }}
                            onBlur={() => setEditingMentorId(null)}
                            autoFocus
                            className="border border-slate-300 rounded-lg p-1 text-[11px] bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500 max-w-[180px]"
                          >
                            <option value="">Select Mentor</option>
                            {ministers.map((m, idx) => {
                              const fullName = `${m.first_name} ${m.last_name}`;
                              return <option key={idx} value={fullName}>{fullName}</option>;
                            })}
                          </select>
                        ) : (
                          <div 
                            onClick={() => { setEditingMentorId(person.id); setMentorValue(person.mentor || ""); }}
                            className="text-blue-600 hover:underline cursor-pointer italic font-bold"
                          >
                            {person.mentor || "Assign Mentor +"}
                          </div>
                        )}
                      </td>
                      
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
                              ? "bg-slate-900 hover:bg-slate-800 cursor-pointer active:scale-95" 
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

            {/* ================= MOBILE CARDS SYSTEM (Below md viewports) ================= */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredRecords.map((person) => {
                const isExpanded = expandedCardId === person.id;
                const isActive = person.soul_winning_status === "Active";

                return (
                  <div key={person.id} className="p-4 space-y-3 bg-white">
                    {/* Top Core Info Bar */}
                    <div 
                      onClick={() => toggleCardExpansion(person.id)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 truncate">{person.full_name}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Invited: <span className="text-slate-600 font-medium">{person.date_invited || "—"}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                          isActive ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-rose-50 border-rose-100 text-rose-700"
                        }`}>
                          {isActive ? "Active" : "Inactive"}
                        </span>
                        <div className="text-slate-400 p-1">
                          {isExpanded ? <FaChevronUp className="text-xs" /> : <FaChevronDown className="text-xs" />}
                        </div>
                      </div>
                    </div>

                    {/* Detailed Collapsible View Area */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-slate-100 space-y-3.5 text-xs animate-fadeIn text-slate-600">
                        
                        {/* Summary Metadata Metrics */}
                        <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <div>
                            <span className="text-[10px] uppercase font-black text-slate-400 block tracking-wider">Invited By</span>
                            <span className="font-bold text-slate-700">{person.invited_by || "Direct Intake"}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-black text-slate-400 block tracking-wider">Age / Tribe</span>
                            <span className="font-bold text-slate-700">{person.age || "—"}</span> 
                            <span className="ml-1.5 text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-800 font-black">{person.tribe || "None"}</span>
                          </div>
                        </div>

                        {/* SELECT MENTOR DROPDOWN ON MOBILE */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <FaUserCheck className="text-slate-400 text-xs" /> Assign Mentor Profile
                          </label>
                          <select
                            value={person.mentor || ""}
                            onChange={(e) => saveMentorUpdate(person.id, e.target.value)}
                            className="w-full border border-slate-200 bg-white font-semibold rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-700 h-[38px] cursor-pointer"
                          >
                            <option value="">Select Mentor</option>
                            {ministers.map((m, idx) => {
                              const fullName = `${m.first_name} ${m.last_name}`;
                              return <option key={idx} value={fullName}>{fullName}</option>;
                            })}
                          </select>
                        </div>

                        {/* CHANGE TRACK STATUS ON MOBILE */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <FaIdCard className="text-slate-400 text-xs" /> Pipeline Tracking Status
                          </label>
                          <select
                            value={person.soul_winning_status === "Active" ? "Active" : "Inactive"}
                            onChange={(e) => handleStatusChange(person.id, e.target.value)}
                            className={`w-full text-xs font-black uppercase rounded-xl px-3 py-2 border focus:outline-none h-[38px] cursor-pointer transition-colors ${
                              isActive
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : "bg-rose-50 border-rose-200 text-rose-700"
                            }`}
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                          </select>
                        </div>

                        {/* PROCEED PIPELINE HANDOFF CONTROL BUTTON */}
                        <div className="pt-1">
                          <button
                            onClick={() => handleNextProcessHandoff(person)}
                            disabled={!isActive}
                            className={`w-full flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider py-2.5 rounded-xl transition-all ${
                              isActive 
                                ? "bg-slate-900 hover:bg-slate-800 shadow-xs" 
                                : "bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed"
                            }`}
                          >
                            Proceed to Soaking Stage <FaArrowRight className="text-[9px]" />
                          </button>
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

