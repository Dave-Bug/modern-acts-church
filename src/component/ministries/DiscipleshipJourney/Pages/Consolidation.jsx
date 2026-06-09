import { useState, useEffect } from "react";
import { 
  FaSearch, FaSpinner, FaPlus, FaTimes, FaCheck, 
  FaRegSquare, FaCheckSquare, FaChevronRight 
} from "react-icons/fa";
import { supabase } from "../../../../Services/supabase";

export default function Consolidation() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Women");

  // Inline editing tracker states
  const [editingCell, setEditingCell] = useState(null); // { id, field }
  const [editValue, setEditValue] = useState("");

  // Creation Form Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [dateInvited, setDateInvited] = useState("");
  const [invitedBy, setInvitedBy] = useState("");
  const [age, setAge] = useState("");
  const [tribe, setTribe] = useState("VISITOR");

  useEffect(() => {
    fetchConsolidationData();
    // Default the date input field to today's date
    setDateInvited(new Date().toISOString().split("T")[0]);
  }, []);

  async function fetchConsolidationData() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("consolidation_pipeline")
        .select("*")
        .eq("current_stage", "Consolidation")
        .order("full_name", { ascending: true });

      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error("Error loading consolidation records:", err.message);
    } finally {
      setLoading(false);
    }
  }

  // Handle addition of a new visitor log row
  const handleCreateEntry = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !dateInvited) return;

    const payload = {
      full_name: fullName.trim(),
      gender_category: activeTab,
      date_invited: dateInvited,
      invited_by: invitedBy.trim() || null,
      age: age ? parseInt(age, 10) : null,
      tribe: tribe.trim() || "VISITOR",
      conso_1_done: false,
      conso_1_by: null,
      conso_2_done: false,
      conso_2_by: null,
      current_stage: "Consolidation",
      proceed_status: "Consolidating"
    };

    try {
      const { data, error } = await supabase
        .from("consolidation_pipeline")
        .insert([payload])
        .select();

      if (error) throw error;
      if (data) setRecords([...records, data[0]]);
      
      // Reset state form values and close out modal view
      setFullName("");
      setInvitedBy("");
      setAge("");
      setTribe("VISITOR");
      setDateInvited(new Date().toISOString().split("T")[0]);
      setIsModalOpen(false);
    } catch (err) {
      alert("Error adding entry: " + err.message);
    }
  };

  // Toggle Boolean Checkboxes (Conso 1 / Conso 2)
  const toggleCheckbox = async (id, field, currentVal) => {
    const newVal = !currentVal;
    try {
      const { error } = await supabase
        .from("consolidation_pipeline")
        .update({ [field]: newVal })
        .eq("id", id);

      if (error) throw error;
      setRecords(records.map(r => r.id === id ? { ...r, [field]: newVal } : r));
    } catch (err) {
      console.error("Failed to update checkbox status:", err.message);
    }
  };

  // Save Text Input updates (Consolidated By, Tribes, etc.)
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
      console.error("Failed to update text field:", err.message);
    }
  };

  // Move profile into Soul Winning ONLY if Conso 1 and Conso 2 are fully completed
  const handleProceedPipeline = async (record) => {
    const isReady = record.conso_1_done && record.conso_2_done;
    if (!isReady) return; // Locked guard clause

    const confirmMove = window.confirm(`Move ${record.full_name} to the Soul Winning track?`);
    if (!confirmMove) return;

    try {
      const { error } = await supabase
        .from("consolidation_pipeline")
        .update({ 
          current_stage: "Soul Winning",
          proceed_status: "Ready to Proceed" 
        })
        .eq("id", record.id);

      if (error) throw error;
      // Animate out from table view arrays
      setRecords(records.filter(r => r.id !== record.id));
    } catch (err) {
      alert("Error shifting track forward: " + err.message);
    }
  };

  const filteredRecords = records.filter((r) => {
    if (r.gender_category !== activeTab) return false;
    const term = searchQuery.toLowerCase();
    return (
      (r.full_name || "").toLowerCase().includes(term) ||
      (r.invited_by || "").toLowerCase().includes(term) ||
      (r.tribe || "").toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Module Title Block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900">Consolidation Module</h1>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">Track initial visitors, follow-up milestones, and pipeline progression</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-slate-900 hover:bg-slate-800 text-black text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-xs self-start"
        >
          <FaPlus /> Add New Record
        </button>
      </div>

      {/* Tab Selectors */}
      <div className="flex border-b border-slate-200 gap-4">
        {["Women", "Men"].map((gender) => (
          <button
            key={gender}
            onClick={() => setActiveTab(gender)}
            className={`pb-2.5 px-1.5 text-xs sm:text-sm font-black border-b-2 relative top-[2px] transition-all cursor-pointer ${
              activeTab === gender ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {gender}'s Consolidation
          </button>
        ))}
      </div>

      {/* Search Layout input */}
      <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-xs flex items-center gap-2 max-w-md">
        <FaSearch className="text-slate-400 ml-1.5 text-xs" />
        <input
          type="text"
          placeholder="Search visitor name, tribe, or connector..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
        />
      </div>

      {/* Primary Data Grid Structure matching image_c59e44.png */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex items-center justify-center py-16"><FaSpinner className="animate-spin text-blue-600 text-lg" /></div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-16 text-center text-xs font-bold text-slate-400">No active consolidation profiles found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-black uppercase text-slate-300 tracking-wider">
                  <th className="py-3.5 px-4">Names</th>
                  <th className="py-3.5 px-4">Date Invited</th>
                  <th className="py-3.5 px-4">Invited By</th>
                  <th className="py-3.5 px-3 text-center">Age</th>
                  <th className="py-3.5 px-4">Tribe</th>
                  <th className="py-3.5 px-3 text-center bg-slate-850">Conso 1</th>
                  <th className="py-3.5 px-4 bg-slate-850">Consolidated By</th>
                  <th className="py-3.5 px-3 text-center bg-slate-800">Conso 2</th>
                  <th className="py-3.5 px-4 bg-slate-800">Consolidated By</th>
                  <th className="py-3.5 px-4 text-center">Soul Winning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                {filteredRecords.map((person) => {
                  const isReadyToProceed = person.conso_1_done && person.conso_2_done;

                  return (
                    <tr key={person.id} className="hover:bg-slate-50/40 transition-colors">
                      
                      {/* NAMES */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">{person.full_name}</td>
                      
                      {/* DATE INVITED */}
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">{person.date_invited || "—"}</td>
                      
                      {/* INVITED BY */}
                      <td className="py-3.5 px-4 text-slate-700 font-medium">{person.invited_by || "—"}</td>
                      
                      {/* AGE */}
                      <td className="py-3.5 px-3 text-center font-mono">{person.age || "—"}</td>
                      
                      {/* TRIBES */}
                      <td className="py-3.5 px-4">
                        {editingCell?.id === person.id && editingCell?.field === "tribe" ? (
                          <input
                            type="text" value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => saveTextUpdate(person.id, "tribe")}
                            onKeyDown={(e) => e.key === "Enter" && saveTextUpdate(person.id, "tribe")}
                            autoFocus
                            className="border border-slate-300 text-xs px-1.5 py-0.5 rounded focus:outline-none w-24 text-blue-600 font-bold"
                          />
                        ) : (
                          <span 
                            onClick={() => { setEditingCell({ id: person.id, field: "tribe" }); setEditValue(person.tribe || ""); }}
                            className="text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded font-bold text-[10px] tracking-wide uppercase cursor-pointer transition-colors"
                          >
                            {person.tribe || "VISITOR"}
                          </span>
                        )}
                      </td>

                      {/* CONSO 1 CHECKBOX */}
                      <td className="py-3.5 px-3 text-center bg-slate-50/30">
                        <button 
                          onClick={() => toggleCheckbox(person.id, "conso_1_done", person.conso_1_done)}
                          className="text-base text-blue-600 hover:text-blue-700 transition-transform active:scale-95 cursor-pointer align-middle"
                        >
                          {person.conso_1_done ? <FaCheckSquare /> : <FaRegSquare className="text-slate-300" />}
                        </button>
                      </td>

                      {/* CONSO 1 CONSOLIDATED BY */}
                      <td className="py-3.5 px-4 bg-slate-50/30">
                        {editingCell?.id === person.id && editingCell?.field === "conso_1_by" ? (
                          <input
                            type="text" value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => saveTextUpdate(person.id, "conso_1_by")}
                            onKeyDown={(e) => e.key === "Enter" && saveTextUpdate(person.id, "conso_1_by")}
                            autoFocus
                            className="border border-slate-300 text-xs px-1.5 py-0.5 rounded focus:outline-none w-full max-w-[120px]"
                        />
                        ) : (
                          <div 
                            onClick={() => { setEditingCell({ id: person.id, field: "conso_1_by" }); setEditValue(person.conso_1_by || ""); }}
                            className="text-slate-700 hover:text-slate-900 cursor-pointer min-h-[16px] text-[11px]"
                          >
                            {person.conso_1_by || <span className="text-slate-300 italic">Assign handler...</span>}
                          </div>
                        )}
                      </td>

                      {/* CONSO 2 CHECKBOX */}
                      <td className="py-3.5 px-3 text-center bg-slate-100/20">
                        <button 
                          onClick={() => toggleCheckbox(person.id, "conso_2_done", person.conso_2_done)}
                          className="text-base text-blue-600 hover:text-blue-700 transition-transform active:scale-95 cursor-pointer align-middle"
                        >
                          {person.conso_2_done ? <FaCheckSquare /> : <FaRegSquare className="text-slate-300" />}
                        </button>
                      </td>

                      {/* CONSO 2 CONSOLIDATED BY */}
                      <td className="py-3.5 px-4 bg-slate-100/20">
                        {editingCell?.id === person.id && editingCell?.field === "conso_2_by" ? (
                          <input
                            type="text" value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => saveTextUpdate(person.id, "conso_2_by")}
                            onKeyDown={(e) => e.key === "Enter" && saveTextUpdate(person.id, "conso_2_by")}
                            autoFocus
                            className="border border-slate-300 text-xs px-1.5 py-0.5 rounded focus:outline-none w-full max-w-[120px]"
                          />
                        ) : (
                          <div 
                            onClick={() => { setEditingCell({ id: person.id, field: "conso_2_by" }); setEditValue(person.conso_2_by || ""); }}
                            className="text-slate-700 hover:text-slate-900 cursor-pointer min-h-[16px] text-[11px]"
                          >
                            {person.conso_2_by || <span className="text-slate-300 italic">Assign handler...</span>}
                          </div>
                        )}
                      </td>

                      {/* CONDITIONAL PROCEED ACTION */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleProceedPipeline(person)}
                          disabled={!isReadyToProceed}
                          className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-md transition-all ${
                            isReadyToProceed 
                              ? "bg-emerald-600 hover:bg-emerald-700 shadow-xs cursor-pointer active:translate-x-0.5" 
                              : "bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed"
                          }`}
                          title={isReadyToProceed ? "Promote to Soul Winning Track" : "Complete both Conso 1 and Conso 2 to proceed"}
                        >
                          Proceed <FaChevronRight className="text-[8px]" />
                        </button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= DATA INTAKE FORM MODAL ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 z-50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col animate-scaleUp">
            <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between text-white">
              <h3 className="text-xs font-black uppercase tracking-wider">
                Log New Consolidation Profile ({activeTab})
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer p-1"><FaTimes /></button>
            </div>

            <form onSubmit={handleCreateEntry} className="p-4 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Full Name *</label>
                <input
                  type="text" required placeholder="Visitor Full Name" value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full font-semibold border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 focus:outline-none focus:bg-white focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Date Invited *</label>
                  <input
                    type="date" required value={dateInvited}
                    onChange={(e) => setDateInvited(e.target.value)}
                    className="w-full font-semibold border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 focus:outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Age</label>
                  <input
                    type="number" placeholder="Years" value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full font-semibold border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Invited By</label>
                  <input
                    type="text" placeholder="Who invited them?" value={invitedBy}
                    onChange={(e) => setInvitedBy(e.target.value)}
                    className="w-full font-semibold border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 focus:outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Tribe / Status</label>
                  <input
                    type="text" placeholder="e.g., VISITOR" value={tribe}
                    onChange={(e) => setTribe(e.target.value)}
                    className="w-full font-semibold border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="font-bold text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded-lg">Cancel</button>
                <button type="submit" className="bg-blue-600 text-white font-black px-4 py-1.5 rounded-lg hover:bg-blue-700 shadow-sm transition-transform active:scale-95">
                  Save Visitor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

