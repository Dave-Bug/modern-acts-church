import { useState, useEffect } from "react";
import { 
  FaSearch, FaSpinner, 
  FaRegSquare, FaCheckSquare, FaChevronRight 
} from "react-icons/fa";
import { supabase } from "../../../../Services/supabase";

export default function Soaking() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Women");
  const [editingCell, setEditingCell] = useState(null); 
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    fetchSoakingData();
  }, []);

  async function fetchSoakingData() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("consolidation_pipeline")
        .select("*")
        .ilike("current_stage", "Soaking")
        .order("full_name", { ascending: true });

      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error("Soaking data read error:", err.message);
    } finally {
      setLoading(false);
    }
  }

  // Robust parsing to treat "true", true, 1, and "Completed" as checked (truthy)
  const parseBool = (val) => {
    if (val === true || val === 1) return true;
    if (!val) return false;
    const str = String(val).trim().toUpperCase();
    return str === "TRUE" || str === "COMPLETED";
  };

  // Toggle checks safely, writing back a string format ("Completed" vs "Pending") if your DB prefers strings
  const toggleCheckbox = async (id, field, currentVal) => {
    // If it was truthy, turn it to "Pending". If it was falsy, turn it to "Completed"
    const newVal = currentVal ? "Pending" : "Completed";
    try {
      const { error } = await supabase
        .from("consolidation_pipeline")
        .update({ [field]: newVal })
        .eq("id", id);

      if (error) throw error;
      setRecords(records.map(r => r.id === id ? { ...r, [field]: newVal } : r));
    } catch (err) {
      console.error("Column status toggle fault:", err.message);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from("consolidation_pipeline")
        .update({ soaking_status: newStatus })
        .eq("id", id);

      if (error) throw error;
      setRecords(records.map(r => r.id === id ? { ...r, soaking_status: newStatus } : r));
    } catch (err) {
      console.error("Pipeline status update error:", err.message);
    }
  };

  const handleRemarksChange = async (id, newRemarks) => {
    try {
      const { error } = await supabase
        .from("consolidation_pipeline")
        .update({ remarks_for_lr: newRemarks })
        .eq("id", id);

      if (error) throw error;
      setRecords(records.map(r => r.id === id ? { ...r, remarks_for_lr: newRemarks } : r));
    } catch (err) {
      console.error("Remarks update error:", err.message);
    }
  };

  const saveTextUpdate = async (id, field) => {
    try {
      const { error } = await supabase
        .from("consolidation_pipeline")
        .update({ [field]: editValue.trim() || null })
        .eq("id", id);

      if (error) throw error;
      setRecords(records.map(r => r.id === id ? { ...r, [field]: editValue.trim() } : r));
      setEditingCell(null);
    } catch (err) {
      console.error("Sync error:", err.message);
    }
  };

  const handleProceedToSchooling = async (record) => {
    if (window.confirm(`Proceed ${record.full_name} to the Schooling Module?`)) {
      try {
        const { error } = await supabase
          .from("consolidation_pipeline")
          .update({ 
            current_stage: "Schooling",
            schooling_status: "Active"
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
      (r.tribe || "").toLowerCase().includes(term) ||
      (r.mentor || "").toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-5 animate-fadeIn">
      <div>
        <h1 className="text-xl font-black tracking-tight text-slate-900">Soaking Pipeline</h1>
        <p className="text-xs font-semibold text-slate-400 mt-0.5">Manage Life Class tracks, Life Start lessons, and Encounter processes</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4">
        {["Women", "Men"].map((gender) => (
          <button
            key={gender}
            onClick={() => setActiveTab(gender)}
            className={`pb-2.5 px-1.5 text-xs sm:text-sm font-black border-b-2 relative top-[2px] transition-all cursor-pointer ${
              activeTab === gender ? "border-cyan-500 text-cyan-600" : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {gender}'s Soaking
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-xs flex items-center gap-2 max-w-md">
        <FaSearch className="text-slate-400 ml-1.5 text-xs" />
        <input
          type="text"
          placeholder="Search name, tribe, or assigned mentor..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
        />
      </div>

      {/* Table Section */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex items-center justify-center py-16"><FaSpinner className="animate-spin text-cyan-500 text-lg" /></div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-16 text-center text-xs font-bold text-slate-400">No active profiles processing in this tract.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1400px]">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800 text-[9px] font-black uppercase text-slate-300 tracking-wider text-center">
                  <th colSpan="6" className="py-2 border-r border-slate-800 text-left px-4">Demographics Information</th>
                  <th colSpan="1" className="py-2 border-r border-slate-800 bg-slate-800/50">Life</th>
                  <th colSpan="5" className="py-2 border-r border-slate-800 bg-cyan-950/40 text-cyan-300">Life Start</th>
                  <th colSpan="1" className="py-2 border-r border-slate-800">Oversight</th>
                  <th colSpan="2" className="py-2 border-r border-slate-800 bg-indigo-950/40 text-indigo-300">Life Retreat Modules</th>
                  <th colSpan="1" className="py-2 border-r border-slate-800 bg-slate-800">Status</th>
                  <th colSpan="1" className="py-2 bg-slate-950 text-slate-200">Schooling</th>
                </tr>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-3">Date Invited</th>
                  <th className="py-3 px-3">Invited By</th>
                  <th className="py-3 px-2 text-center">Age</th>
                  <th className="py-3 px-3">Tribe</th>
                  <th className="py-3 px-4 border-r border-slate-200">Mentor Assignment</th>
                  <th className="py-3 px-3 text-center border-r border-slate-200 bg-slate-50/50">Life</th>
                  <th className="py-3 px-3 text-center bg-cyan-50/20 text-cyan-700">WTL</th>
                  <th className="py-3 px-3 text-center bg-cyan-50/20 text-cyan-700">Bible/Dev</th>
                  <th className="py-3 px-3 text-center bg-cyan-50/20 text-cyan-700">Prayer</th>
                  <th className="py-3 px-3 text-center bg-cyan-50/20 text-cyan-700">Group/Ch</th>
                  <th className="py-3 px-3 text-center bg-cyan-50/20 text-cyan-700 border-r border-slate-200">Sharing</th>
                  <th className="py-3 px-4 border-r border-slate-200">Remarks for LR</th>
                  <th className="py-3 px-3 text-center bg-indigo-50/20 text-indigo-700">Pre-Life</th>
                  <th className="py-3 px-3 text-center bg-indigo-50/20 text-indigo-700 border-r border-slate-200">Retreat</th>
                  <th className="py-3 px-4 text-center border-r border-slate-200">Status</th>
                  <th className="py-3 px-4 text-center text-slate-700 font-extrabold">Schooling(SOD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                {filteredRecords.map((person) => {
                  // Run every individual metric flag through our central parser helper
                  const isLifeClassChecked = parseBool(person.life_class);
                  const isWtlChecked = parseBool(person.ls_wtl);
                  const isBibleChecked = parseBool(person.ls_bible_devotion);
                  const isPrayerChecked = parseBool(person.ls_prayer);
                  const isGroupChecked = parseBool(person.ls_lifegroup_church);
                  const isSharingChecked = parseBool(person.ls_sharing_others);
                  
                  const hasPreRetreat = parseBool(person.lr_pre_retreat);
                  const hasLifeRetreat = parseBool(person.lr_life_retreat);

                  const isStatusActive = person.soaking_status?.toUpperCase() === "ACTIVE";
                  const isRemarksReady = person.remarks_for_lr?.toUpperCase() === "READY";

                  // Condition for showing the Proceed button
                  const isReadyToProceed = hasPreRetreat && hasLifeRetreat && isStatusActive && isRemarksReady;

                  return (
                    <tr key={person.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{person.full_name}</td>
                      <td className="py-3.5 px-3 text-slate-400 font-mono text-[11px]">{person.date_invited || "—"}</td>
                      <td className="py-3.5 px-3 text-slate-500 text-[11px] font-bold">{person.invited_by || "—"}</td>
                      <td className="py-3.5 px-2 text-center font-mono">{person.age || "—"}</td>
                      <td className="py-3.5 px-3">
                        <span className="text-cyan-700 bg-cyan-50 border border-cyan-100 px-2 py-0.5 rounded font-bold text-[10px] uppercase">
                          {person.tribe || "VISITOR"}
                        </span>
                      </td>

                      {/* Mentor Cell */}
                      <td className="py-3.5 px-4 border-r border-slate-200">
                        {editingCell?.id === person.id && editingCell?.field === "mentor" ? (
                          <input
                            type="text" value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => saveTextUpdate(person.id, "mentor")}
                            onKeyDown={(e) => e.key === "Enter" && saveTextUpdate(person.id, "mentor")}
                            autoFocus
                            className="border border-slate-300 text-xs px-1.5 py-0.5 rounded focus:outline-none w-full max-w-[130px]"
                          />
                        ) : (
                          <div 
                            onClick={() => { setEditingCell({ id: person.id, field: "mentor" }); setEditValue(person.mentor || ""); }}
                            className="text-blue-600 hover:text-blue-700 font-bold text-[11px] cursor-pointer"
                          >
                            {person.mentor || "Assign Mentor +"}
                          </div>
                        )}
                      </td>

                      {/* Life Track Checkbox */}
                      <td className="py-3.5 px-3 text-center border-r border-slate-200 bg-slate-50/40">
                        <button 
                          onClick={() => toggleCheckbox(person.id, "life_class", isLifeClassChecked)}
                          className="text-base text-cyan-600 cursor-pointer align-middle focus:outline-none"
                        >
                          {isLifeClassChecked ? <FaCheckSquare /> : <FaRegSquare className="text-slate-300" />}
                        </button>
                      </td>

                      {/* Life Start Columns */}
                      <td className="py-3.5 px-3 text-center bg-cyan-50/10">
                        <button onClick={() => toggleCheckbox(person.id, "ls_wtl", isWtlChecked)} className="text-base text-cyan-600 cursor-pointer align-middle focus:outline-none">
                          {isWtlChecked ? <FaCheckSquare /> : <FaRegSquare className="text-slate-300" />}
                        </button>
                      </td>
                      <td className="py-3.5 px-3 text-center bg-cyan-50/10">
                        <button onClick={() => toggleCheckbox(person.id, "ls_bible_devotion", isBibleChecked)} className="text-base text-cyan-600 cursor-pointer align-middle focus:outline-none">
                          {isBibleChecked ? <FaCheckSquare /> : <FaRegSquare className="text-slate-300" />}
                        </button>
                      </td>
                      <td className="py-3.5 px-3 text-center bg-cyan-50/10">
                        <button onClick={() => toggleCheckbox(person.id, "ls_prayer", isPrayerChecked)} className="text-base text-cyan-600 cursor-pointer align-middle focus:outline-none">
                          {isPrayerChecked ? <FaCheckSquare /> : <FaRegSquare className="text-slate-300" />}
                        </button>
                      </td>
                      <td className="py-3.5 px-3 text-center bg-cyan-50/10">
                        <button onClick={() => toggleCheckbox(person.id, "ls_lifegroup_church", isGroupChecked)} className="text-base text-cyan-600 cursor-pointer align-middle focus:outline-none">
                          {isGroupChecked ? <FaCheckSquare /> : <FaRegSquare className="text-slate-300" />}
                        </button>
                      </td>
                      <td className="py-3.5 px-3 text-center bg-cyan-50/10 border-r border-slate-200">
                        <button onClick={() => toggleCheckbox(person.id, "ls_sharing_others", isSharingChecked)} className="text-base text-cyan-600 cursor-pointer align-middle focus:outline-none">
                          {isSharingChecked ? <FaCheckSquare /> : <FaRegSquare className="text-slate-300" />}
                        </button>
                      </td>

                      {/* Remarks Selection Dropdown */}
                      <td className="py-3.5 px-4 border-r border-slate-200 max-w-[160px]">
                        <select
                          value={isRemarksReady ? "Ready" : "Unready"}
                          onChange={(e) => handleRemarksChange(person.id, e.target.value)}
                          className={`text-[11px] font-bold px-2 py-1 rounded border focus:outline-none cursor-pointer transition-colors ${
                            isRemarksReady
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                              : "bg-rose-50 border-rose-200 text-rose-700"
                          }`}
                        >
                          <option value="Ready">Ready</option>
                          <option value="Unready">Unready</option>
                        </select>
                      </td>

                      {/* Life Retreat Checkboxes */}
                      <td className="py-3.5 px-3 text-center bg-indigo-50/10">
                        <button onClick={() => toggleCheckbox(person.id, "lr_pre_retreat", hasPreRetreat)} className="text-base text-emerald-500 cursor-pointer align-middle focus:outline-none">
                          {hasPreRetreat ? <FaCheckSquare /> : <FaRegSquare className="text-slate-300" />}
                        </button>
                      </td>
                      <td className="py-3.5 px-3 text-center bg-indigo-50/10 border-r border-slate-200">
                        <button onClick={() => toggleCheckbox(person.id, "lr_life_retreat", hasLifeRetreat)} className="text-base text-emerald-500 cursor-pointer align-middle focus:outline-none">
                          {hasLifeRetreat ? <FaCheckSquare /> : <FaRegSquare className="text-slate-300" />}
                        </button>
                      </td>

                      {/* Soaking Status Dropdown */}
                      <td className="py-3.5 px-4 text-center border-r border-slate-200">
                        <select
                          value={isStatusActive ? "Active" : "Inactive"}
                          onChange={(e) => handleStatusChange(person.id, e.target.value)}
                          className={`text-[11px] font-bold px-2 py-1 rounded border focus:outline-none cursor-pointer transition-colors uppercase ${
                            isStatusActive
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                              : "bg-rose-50 border-rose-200 text-rose-700"
                          }`}
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </td>

                      {/* Action Button Column */}
                      <td className="py-3.5 px-4 text-center font-bold">
                        {isReadyToProceed ? (
                          <button
                            onClick={() => handleProceedToSchooling(person)}
                            className="inline-flex items-center gap-1.5 text-[11px] font-black bg-blue-600 text-black hover:bg-blue-700 px-3 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer active:translate-x-0.5 animate-pulse"
                          >
                            Proceed <FaChevronRight className="text-[8px]" />
                          </button>
                        ) : (
                          <span className="text-slate-300 font-bold text-[11px]">Onprocess</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}