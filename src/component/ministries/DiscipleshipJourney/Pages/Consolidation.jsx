import { useState, useEffect } from "react";
import { 
  FaSearch, FaSpinner, FaPlus, FaTimes, FaCheck, 
  FaRegSquare, FaCheckSquare, FaChevronRight,
  FaChevronDown, FaChevronUp, FaUser, FaCalendarAlt, FaIdCard
} from "react-icons/fa";
import { supabase } from "../../../../Services/supabase";

export default function Consolidation() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Women");

  // Track which mobile profile card row structure index is expanded
  const [expandedRowId, setExpandedRowId] = useState(null);

  // Inline editing tracker states
  const [editingCell, setEditingCell] = useState(null); // { id, field }
  const [editValue, setEditValue] = useState("");

  // List of handlers filtered by "DJ Team" ministry
  const [djTeamHandlers, setDjTeamHandlers] = useState([]);

  // Creation Form Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [middleInitial, setMiddleInitial] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateInvited, setDateInvited] = useState("");
  const [invitedBy, setInvitedBy] = useState("");
  const [age, setAge] = useState("");
  const [tribe, setTribe] = useState(""); 

  // Global Visitor Lookup search states (Top search layout)
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupResults, setLookupResults] = useState([]);
  const [searchingLookup, setSearchingLookup] = useState(false);

  // "Invited By" Minister search lookup states
  const [ministerResults, setMinisterResults] = useState([]);
  const [searchingMinister, setSearchingMinister] = useState(false);
  const [showMinisterDropdown, setShowMinisterDropdown] = useState(false);

  useEffect(() => {
    fetchConsolidationData();
    fetchDJTeamHandlers();
    setDateInvited(new Date().toISOString().split("T")[0]);
  }, []);

  // Debounced effect for Main Visitor Lookup search
  useEffect(() => {
    if (!lookupQuery.trim()) {
      setLookupResults([]);
      return;
    }
    const delayDebounce = setTimeout(() => {
      searchExistingVisitors(lookupQuery);
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [lookupQuery]);

  // Debounced effect for "Invited By" Minister search lookup
  useEffect(() => {
    if (!invitedBy.trim()) {
      setMinisterResults([]);
      return;
    }
    const delayDebounce = setTimeout(() => {
      searchExistingMinisters(invitedBy);
    }, 350);
    return () => clearTimeout(delayDebounce);
  }, [invitedBy]);

  async function fetchConsolidationData() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("consolidation_pipeline")
        .select("*")
        .eq("current_stage", "Consolidation")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error("Error loading consolidation records:", err.message);
    } finally {
      setLoading(false);
    }
  }

  // Dynamic Array Search handling multiple ministries per member
  async function fetchDJTeamHandlers() {
    try {
      const { data, error } = await supabase
        .from("usher_members")
        .select("first_name, last_name, ministry");

      if (error) throw error;

      if (data) {
        const filtered = data.filter((member) => {
          if (!member.ministry) return false;
          if (Array.isArray(member.ministry)) {
            return member.ministry.includes("DJ Team");
          }
          if (typeof member.ministry === "string") {
            return member.ministry.toLowerCase().includes("dj team");
          }
          return false;
        });
        setDjTeamHandlers(filtered);
      }
    } catch (err) {
      console.error("Error evaluating DJ Team array matching profiles:", err.message);
    }
  }

  // Look up existing visitors from usher_members (Main autofill lookup)
  async function searchExistingVisitors(query) {
    try {
      setSearchingLookup(true);
      const { data, error } = await supabase
        .from("usher_members")
        .select("first_name, middle_initial, last_name, age, tribe, invited_by, date_invited")
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
        .limit(5);

      if (error) throw error;
      setLookupResults(data || []);
    } catch (err) {
      console.error("Error looking up existing member names:", err.message);
    } finally {
      setSearchingLookup(false);
    }
  }

  // Look up ministers from usher_members for the "Invited By" field
  async function searchExistingMinisters(query) {
    try {
      setSearchingMinister(true);
      const { data, error } = await supabase
        .from("usher_members")
        .select("first_name, last_name")
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
        .limit(5);

      if (error) throw error;
      setMinisterResults(data || []);
    } catch (err) {
      console.error("Error matching ministers:", err.message);
    } finally {
      setSearchingMinister(false);
    }
  }

  const handleSelectExistingMember = (member) => {
    setFirstName(member.first_name || "");
    setMiddleInitial(member.middle_initial || "");
    setLastName(member.last_name || "");
    setAge(member.age ? member.age.toString() : "");
    setTribe(member.tribe || "");
    setInvitedBy(member.invited_by || "");
    if (member.date_invited) {
      setDateInvited(member.date_invited);
    }
    setLookupQuery("");
    setLookupResults([]);
  };

  const handleSelectMinister = (minister) => {
    const fullName = `${minister.first_name} ${minister.last_name}`;
    setInvitedBy(fullName);
    setMinisterResults([]);
    setShowMinisterDropdown(false);
  };

  const handleCreateEntry = async (e) => {
    e.preventDefault();
    
    const cleanFirstName = firstName.trim();
    const cleanMiddleInitial = middleInitial.trim() ? middleInitial.trim().replace(/\./g, "").toUpperCase() : null;
    const cleanLastName = lastName.trim();
    const parsedAge = age ? parseInt(age, 10) : null;
    const cleanTribe = tribe || "N/A";
    const cleanInvitedBy = invitedBy.trim() || null;

    if (!cleanFirstName || !cleanLastName || !dateInvited) {
      return alert("First Name, Last Name, and Date Invited are required.");
    }

    const localDuplicate = records.some(
      (r) =>
        (r.first_name || "").toLowerCase() === cleanFirstName.toLowerCase() &&
        (r.last_name || "").toLowerCase() === cleanLastName.toLowerCase()
    );

    if (localDuplicate) {
      return alert(`Duplicate Error: "${cleanFirstName} ${cleanLastName}" already exists.`);
    }

    try {
      setLoading(true);

      const { data: remotePipelineDup, error: pipelineCheckError } = await supabase
        .from("consolidation_pipeline")
        .select("id")
        .ilike("first_name", cleanFirstName)
        .ilike("last_name", cleanLastName)
        .maybeSingle();

      if (pipelineCheckError) throw pipelineCheckError;

      if (remotePipelineDup) {
        setLoading(false);
        return alert(`Database Collision Alert: Someone named "${cleanFirstName} ${cleanLastName}" is already running in this consolidation track.`);
      }

      const consolidationPayload = {
        first_name: cleanFirstName,
        middle_initial: cleanMiddleInitial,
        last_name: cleanLastName,
        gender_category: activeTab,
        date_invited: dateInvited,
        invited_by: cleanInvitedBy,
        age: parsedAge,
        tribe: cleanTribe,
        conso_1_done: false,
        conso_1_by: null,
        conso_2_done: false,
        conso_2_by: null,
        current_stage: "Consolidation",
        proceed_status: "Consolidating"
      };

      const usherMembersPayload = {
        first_name: cleanFirstName,
        middle_initial: cleanMiddleInitial,
        last_name: cleanLastName,
        role: "Visitor",
        tribe: cleanTribe,
        ministry: null, 
        age: parsedAge,
        number: null,
        invited_by: cleanInvitedBy,
        date_invited: dateInvited,
        birthdate: null
      };

      const { data: existingUsher } = await supabase
        .from("usher_members")
        .select("id")
        .ilike("first_name", cleanFirstName)
        .ilike("last_name", cleanLastName)
        .maybeSingle();

      const promises = [supabase.from("consolidation_pipeline").insert([consolidationPayload]).select()];
      
      if (!existingUsher) {
        promises.push(supabase.from("usher_members").insert([usherMembersPayload]));
      }

      const [consoResponse] = await Promise.all(promises);
      if (consoResponse.error) throw consoResponse.error;

      if (consoResponse.data) {
        setRecords([consoResponse.data[0], ...records]);
      }
      
      setFirstName("");
      setMiddleInitial("");
      setLastName("");
      setInvitedBy("");
      setAge("");
      setTribe("");
      setDateInvited(new Date().toISOString().split("T")[0]);
      setLookupQuery("");
      setLookupResults([]);
      setIsModalOpen(false);

      alert("Visitor pipeline entry synchronized successfully!");
    } catch (err) {
      alert("Error saving transaction data records: " + err.message);
    } finally {
      setLoading(false);
    }
  };

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

  const saveTextUpdate = async (id, field, valueToSave) => {
    const finalValue = valueToSave !== undefined ? valueToSave.trim() : editValue.trim();
    try {
      const { error } = await supabase
        .from("consolidation_pipeline")
        .update({ [field]: finalValue || null })
        .eq("id", id);

      if (error) throw error;
      setRecords(records.map(r => r.id === id ? { ...r, [field]: finalValue } : r));
      setEditingCell(null);
    } catch (err) {
      console.error("Failed to update field:", err.message);
    }
  };

  const handleProceedPipeline = async (record) => {
    const isReady = record.conso_1_done && record.conso_2_done;
    if (!isReady) return; 

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
      setRecords(records.filter(r => r.id !== record.id));
    } catch (err) {
      alert("Error shifting track forward: " + err.message);
    }
  };

  const toggleMobileRowExpansion = (id) => {
    setExpandedRowId(expandedRowId === id ? null : id);
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
    <div className="space-y-4 animate-fadeIn pb-12">
      {/* Module Title Block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900">Consolidation Module</h1>
          <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Track visitors, milestones, and pipeline updates</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-slate-900 hover:bg-slate-800 text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs w-full sm:w-auto"
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
            className={`pb-2 px-1 text-xs sm:text-sm font-black border-b-2 relative top-[2px] transition-all cursor-pointer ${
              activeTab === gender ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {gender}'s Track
          </button>
        ))}
      </div>

      {/* Module Search Bar Layout */}
      <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-2xs flex items-center gap-2 w-full max-w-md">
        <FaSearch className="text-slate-400 ml-1.5 text-xs" />
        <input
          type="text"
          placeholder="Search name, tribe, or connector..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
        />
      </div>

      {/* Main Content Area: Responsive Switch Block */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><FaSpinner className="animate-spin text-blue-600 text-lg" /></div>
      ) : filteredRecords.length === 0 ? (
        <div className="py-16 text-center text-xs font-bold text-slate-400 bg-white border border-slate-200 rounded-xl">No active profiles found.</div>
      ) : (
        <>
          {/* ================= DESKTOP VIEW MESH DATA GRID (Visible md Screen Up) ================= */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1050px]">
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
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                  {filteredRecords.map((person) => {
                    const isReadyToProceed = person.conso_1_done && person.conso_2_done;
                    return (
                      <tr key={person.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{person.full_name}</td>
                        <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">{person.date_invited || "—"}</td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium">{person.invited_by || "—"}</td>
                        <td className="py-3.5 px-3 text-center font-mono">{person.age || "—"}</td>
                        
                        {/* TRIBES DESKTOP SELECTION CELL */}
                        <td className="py-3.5 px-4">
                          {editingCell?.id === person.id && editingCell?.field === "tribe" ? (
                            <select
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => saveTextUpdate(person.id, "tribe")}
                              autoFocus
                              className="border border-slate-300 text-[11px] px-1 py-0.5 rounded focus:outline-none w-28 text-blue-600 font-black bg-white"
                            >
                              <option value="">Select Tribe</option>
                              <option value="Samuel/Abraham">Samuel/Abraham</option>
                              <option value="Leah/Ruth">Leah/Ruth</option>
                              <option value="Yeshua">Yeshua</option>
                              <option value="Daniel">Daniel</option>
                              <option value="Esther">Esther</option>
                              <option value="Sarah">Sarah</option>
                              <option value="Josiah">Josiah</option>
                              <option value="N/A">N/A</option>
                            </select>
                          ) : (
                            <span 
                              onClick={() => { setEditingCell({ id: person.id, field: "tribe" }); setEditValue(person.tribe || ""); }}
                              className="text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded font-bold text-[10px] tracking-wide uppercase cursor-pointer transition-colors"
                            >
                              {person.tribe || "VISITOR"}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-center bg-slate-50/30">
                          <button 
                            onClick={() => toggleCheckbox(person.id, "conso_1_done", person.conso_1_done)}
                            className="text-base text-blue-600 hover:text-blue-700 transition-transform active:scale-95 cursor-pointer align-middle"
                          >
                            {person.conso_1_done ? <FaCheckSquare /> : <FaRegSquare className="text-slate-300" />}
                          </button>
                        </td>

                        {/* CONSO 1 HANDLER DESKTOP DROPDOWN */}
                        <td className="py-3.5 px-4 bg-slate-50/30">
                          {editingCell?.id === person.id && editingCell?.field === "conso_1_by" ? (
                            <select
                              value={editValue}
                              onChange={(e) => {
                                setEditValue(e.target.value);
                                saveTextUpdate(person.id, "conso_1_by", e.target.value);
                              }}
                              onBlur={() => saveTextUpdate(person.id, "conso_1_by")}
                              autoFocus
                              className="border border-slate-300 text-[11px] px-1.5 py-0.5 rounded focus:outline-none w-full max-w-[140px] bg-white font-medium text-slate-700"
                            >
                              <option value="">Select Handler</option>
                              {djTeamHandlers.map((h, i) => {
                                const name = `${h.first_name} ${h.last_name}`;
                                return <option key={i} value={name}>{name}</option>;
                              })}
                            </select>
                          ) : (
                            <div 
                              onClick={() => { setEditingCell({ id: person.id, field: "conso_1_by" }); setEditValue(person.conso_1_by || ""); }}
                              className="text-slate-700 hover:text-slate-900 cursor-pointer min-h-[16px] text-[11px]"
                            >
                              {person.conso_1_by || <span className="text-slate-300 italic">Assign DJ Team...</span>}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-center bg-slate-100/20">
                          <button 
                            onClick={() => toggleCheckbox(person.id, "conso_2_done", person.conso_2_done)}
                            className="text-base text-blue-600 hover:text-blue-700 transition-transform active:scale-95 cursor-pointer align-middle"
                          >
                            {person.conso_2_done ? <FaCheckSquare /> : <FaRegSquare className="text-slate-300" />}
                          </button>
                        </td>

                        {/* CONSO 2 HANDLER DESKTOP DROPDOWN */}
                        <td className="py-3.5 px-4 bg-slate-100/20">
                          {editingCell?.id === person.id && editingCell?.field === "conso_2_by" ? (
                            <select
                              value={editValue}
                              onChange={(e) => {
                                setEditValue(e.target.value);
                                saveTextUpdate(person.id, "conso_2_by", e.target.value);
                              }}
                              onBlur={() => saveTextUpdate(person.id, "conso_2_by")}
                              autoFocus
                              className="border border-slate-300 text-[11px] px-1.5 py-0.5 rounded focus:outline-none w-full max-w-[140px] bg-white font-medium text-slate-700"
                            >
                              <option value="">Select Handler</option>
                              {djTeamHandlers.map((h, i) => {
                                const name = `${h.first_name} ${h.last_name}`;
                                return <option key={i} value={name}>{name}</option>;
                              })}
                            </select>
                          ) : (
                            <div 
                              onClick={() => { setEditingCell({ id: person.id, field: "conso_2_by" }); setEditValue(person.conso_2_by || ""); }}
                              className="text-slate-700 hover:text-slate-900 cursor-pointer min-h-[16px] text-[11px]"
                            >
                              {person.conso_2_by || <span className="text-slate-300 italic">Assign DJ Team...</span>}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleProceedPipeline(person)}
                            disabled={!isReadyToProceed}
                            className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-md transition-all ${
                              isReadyToProceed 
                                ? "bg-emerald-600 hover:bg-emerald-700 shadow-xs cursor-pointer active:translate-x-0.5" 
                                : "bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed"
                            }`}
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
          </div>

          {/* ================= MOBILE EXPANDABLE INFO CARDS SYSTEM (Visible Below md Screens) ================= */}
          <div className="block md:hidden space-y-3">
            {filteredRecords.map((person) => {
              const isExpanded = expandedRowId === person.id;
              const isReadyToProceed = person.conso_1_done && person.conso_2_done;

              return (
                <div 
                  key={person.id} 
                  className={`bg-white border rounded-xl overflow-hidden shadow-2xs transition-all ${
                    isExpanded ? "border-blue-500 ring-1 ring-blue-500/20" : "border-slate-200"
                  }`}
                >
                  {/* Card Visible Main Core Title Content Layer Row */}
                  <div 
                    onClick={() => toggleMobileRowExpansion(person.id)}
                    className="p-3.5 flex items-center justify-between gap-2 cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 truncate text-sm">{person.full_name}</p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[11px] text-slate-400">
                        <span className="font-mono bg-slate-200/60 text-slate-600 px-1.5 py-0.5 rounded text-[10px]">
                          Age: {person.age || "—"}
                        </span>
                        <span className="font-bold text-blue-600 uppercase tracking-wide text-[10px]">
                          {person.tribe || "VISITOR"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {/* Visual Done Badges Check indicators for immediate oversight */}
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${person.conso_1_done ? "bg-blue-500" : "bg-slate-200"}`} title="Conso 1 Status" />
                        <div className={`w-2 h-2 rounded-full ${person.conso_2_done ? "bg-blue-500" : "bg-slate-200"}`} title="Conso 2 Status" />
                      </div>
                      <div className="text-slate-400 p-1">
                        {isExpanded ? <FaChevronUp className="text-xs" /> : <FaChevronDown className="text-xs" />}
                      </div>
                    </div>
                  </div>

                  {/* Mobile Slid-Down Drawer Sheet Expansion Panel */}
                  {isExpanded && (
                    <div className="p-3.5 border-t border-slate-100 bg-white space-y-3.5 text-xs animate-fadeIn">
                      
                      {/* Basic Profile Details Section */}
                      <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Date Invited</p>
                          <p className="font-mono font-bold text-slate-700 flex items-center gap-1.5">
                            <FaCalendarAlt className="text-slate-300 text-[10px]" /> {person.date_invited || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Invited By</p>
                          <p className="font-medium text-slate-700 truncate flex items-center gap-1.5">
                            <FaUser className="text-slate-300 text-[10px]" /> {person.invited_by || "—"}
                          </p>
                        </div>
                      </div>

                      {/* Interactive Section 1: Tribe Dynamic Editing option */}
                      <div className="flex items-center justify-between gap-4 py-1 border-b border-slate-100">
                        <span className="font-bold text-slate-500">Assigned Tribe:</span>
                        <select
                          value={person.tribe || ""}
                          onChange={(e) => saveTextUpdate(person.id, "tribe", e.target.value)}
                          className="border border-slate-200 bg-slate-50 font-bold text-blue-600 rounded-lg px-2 py-1 text-xs focus:outline-none"
                        >
                          <option value="">Select Tribe</option>
                          <option value="Samuel/Abraham">Samuel/Abraham</option>
                          <option value="Leah/Ruth">Leah/Ruth</option>
                          <option value="Yeshua">Yeshua</option>
                          <option value="Daniel">Daniel</option>
                          <option value="Esther">Esther</option>
                          <option value="Sarah">Sarah</option>
                          <option value="Josiah">Josiah</option>
                          <option value="N/A">N/A</option>
                        </select>
                      </div>

                      {/* Interactive Section 2: Conso 1 Blocks fields */}
                      <div className="space-y-2 p-2.5 bg-blue-50/20 border border-blue-100 rounded-xl">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-slate-700 text-[11px] tracking-wide uppercase">Consolidation Phase 1</span>
                          <button 
                            onClick={() => toggleCheckbox(person.id, "conso_1_done", person.conso_1_done)}
                            className="flex items-center gap-1.5 font-bold text-blue-600 cursor-pointer text-xs"
                          >
                            {person.conso_1_done ? <FaCheckSquare className="text-sm" /> : <FaRegSquare className="text-sm text-slate-400" />}
                            <span>Mark Completed</span>
                          </button>
                        </div>
                        <div className="flex items-center justify-between gap-4 pt-1">
                          <span className="text-slate-500 font-medium text-[11px]">Consolidated By:</span>
                          <select
                            value={person.conso_1_by || ""}
                            onChange={(e) => saveTextUpdate(person.id, "conso_1_by", e.target.value)}
                            className="border border-slate-200 bg-white text-slate-700 rounded-lg px-2 py-1 text-xs focus:outline-none max-w-[160px]"
                          >
                            <option value="">Select DJ Team Handler</option>
                            {djTeamHandlers.map((h, i) => {
                              const name = `${h.first_name} ${h.last_name}`;
                              return <option key={i} value={name}>{name}</option>;
                            })}
                          </select>
                        </div>
                      </div>

                      {/* Interactive Section 3: Conso 2 Blocks fields */}
                      <div className="space-y-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-slate-700 text-[11px] tracking-wide uppercase">Consolidation Phase 2</span>
                          <button 
                            onClick={() => toggleCheckbox(person.id, "conso_2_done", person.conso_2_done)}
                            className="flex items-center gap-1.5 font-bold text-blue-600 cursor-pointer text-xs"
                          >
                            {person.conso_2_done ? <FaCheckSquare className="text-sm" /> : <FaRegSquare className="text-sm text-slate-400" />}
                            <span>Mark Completed</span>
                          </button>
                        </div>
                        <div className="flex items-center justify-between gap-4 pt-1">
                          <span className="text-slate-500 font-medium text-[11px]">Consolidated By:</span>
                          <select
                            value={person.conso_2_by || ""}
                            onChange={(e) => saveTextUpdate(person.id, "conso_2_by", e.target.value)}
                            className="border border-slate-200 bg-white text-slate-700 rounded-lg px-2 py-1 text-xs focus:outline-none max-w-[160px]"
                          >
                            <option value="">Select DJ Team Handler</option>
                            {djTeamHandlers.map((h, i) => {
                              const name = `${h.first_name} ${h.last_name}`;
                              return <option key={i} value={name}>{name}</option>;
                            })}
                          </select>
                        </div>
                      </div>

                      {/* Promotion Submit Button Container block */}
                      <div className="pt-2">
                        <button
                          onClick={() => handleProceedPipeline(person)}
                          disabled={!isReadyToProceed}
                          className={`w-full flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider py-2.5 rounded-xl transition-all ${
                            isReadyToProceed 
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs" 
                              : "bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed"
                          }`}
                        >
                          Proceed to Soul Winning Track <FaChevronRight className="text-[9px]" />
                        </button>
                        {!isReadyToProceed && (
                          <p className="text-center text-[10px] text-slate-400 mt-1.5 font-medium">
                            * Complete both Conso milestones to clear promotion.
                          </p>
                        )}
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ================= DATA INTAKE FORM MODAL ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 z-50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col animate-scaleUp max-h-[90vh]">
            <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between text-white shrink-0">
              <h3 className="text-xs font-black uppercase tracking-wider">
                Log New Profile ({activeTab})
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer p-1"><FaTimes /></button>
            </div>

            <form onSubmit={handleCreateEntry} className="p-4 space-y-4 text-xs overflow-y-auto">
              
              {/* TOP VISITOR LOOKUP FEATURE */}
              <div className="relative bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <label className="block text-[9px] font-black text-blue-600 uppercase mb-1">
                  Autofill from Existing Usher Members List
                </label>
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1.5 shadow-2xs">
                  <FaSearch className="text-slate-400 ml-1 text-[10px]" />
                  <input
                    type="text"
                    placeholder="Type name to search and choose autofill..."
                    value={lookupQuery}
                    onChange={(e) => setLookupQuery(e.target.value)}
                    className="w-full bg-transparent font-semibold text-slate-700 focus:outline-none text-[11px]"
                  />
                  {searchingLookup && <FaSpinner className="animate-spin text-blue-500 text-xs mr-1" />}
                </div>

                {lookupResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-[102%] bg-white border border-slate-200 rounded-xl shadow-lg max-h-40 overflow-y-auto z-50 divide-y divide-slate-100">
                    {lookupResults.map((member, index) => (
                      <div
                        key={index}
                        onClick={() => handleSelectExistingMember(member)}
                        className="p-2.5 hover:bg-slate-50 cursor-pointer flex justify-between items-center transition-colors"
                      >
                        <div>
                          <p className="font-bold text-slate-900">
                            {member.first_name} {member.middle_initial ? `${member.middle_initial}. ` : ""}{member.last_name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">Tribe: {member.tribe || "N/A"}</p>
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
                          Select
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Separator Divider line */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-[9px] text-slate-400 font-bold uppercase tracking-widest">Profile Details</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {/* Names Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">First Name *</label>
                  <input
                    type="text" required placeholder="Juan" value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full font-semibold border border-slate-200 bg-slate-50 rounded-xl px-2.5 py-2 focus:outline-none focus:bg-white focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">M.I.</label>
                  <input
                    type="text" maxLength={2} placeholder="D" value={middleInitial}
                    onChange={(e) => setMiddleInitial(e.target.value)}
                    className="w-full font-semibold border border-slate-200 bg-slate-50 rounded-xl px-2.5 py-2 sm:text-center focus:outline-none focus:bg-white focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Last Name *</label>
                  <input
                    type="text" required placeholder="Dela Cruz" value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full font-semibold border border-slate-200 bg-slate-50 rounded-xl px-2.5 py-2 focus:outline-none focus:bg-white focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Date Invited *</label>
                  <input
                    type="date" required value={dateInvited}
                    onChange={(e) => setDateInvited(e.target.value)}
                    className="w-full font-semibold border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 focus:outline-none focus:bg-white text-xs"
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

              {/* Hybrid "Invited By" Search & Dynamic Dropdown Option for Tribes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Invited By</label>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 focus-within:bg-white focus-within:border-blue-500">
                    <input
                      type="text" 
                      placeholder="Who invited them?" 
                      value={invitedBy}
                      onFocus={() => setShowMinisterDropdown(true)}
                      onChange={(e) => {
                        setInvitedBy(e.target.value);
                        setShowMinisterDropdown(true);
                      }}
                      className="w-full font-semibold bg-transparent py-1.5 focus:outline-none text-xs text-slate-700"
                    />
                    {searchingMinister && <FaSpinner className="animate-spin text-blue-500 text-[10px] ml-1" />}
                  </div>

                  {showMinisterDropdown && ministerResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-[102%] bg-white border border-slate-200 rounded-xl shadow-lg max-h-36 overflow-y-auto z-50 divide-y divide-slate-100">
                      {ministerResults.map((min, index) => (
                        <div
                          key={index}
                          onClick={() => handleSelectMinister(min)}
                          className="p-2 hover:bg-slate-50 cursor-pointer font-bold text-slate-800 text-[11px] transition-colors flex items-center justify-between"
                        >
                          <span>{min.first_name} {min.last_name}</span>
                          <span className="text-[9px] text-slate-400 font-normal italic">Usher Member</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Tribe / Status</label>
                  <select
                    value={tribe}
                    onChange={(e) => setTribe(e.target.value)}
                    className="w-full font-semibold border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 focus:outline-none focus:bg-white text-xs text-slate-700 cursor-pointer h-[38px]"
                  >
                    <option value="">Select Tribe</option>
                    <option value="Samuel/Abraham">Samuel/Abraham</option>
                    <option value="Leah/Ruth">Leah/Ruth</option>
                    <option value="Yeshua">Yeshua</option>
                    <option value="Daniel">Daniel</option>
                    <option value="Esther">Esther</option>
                    <option value="Sarah">Sarah</option>
                    <option value="Josiah">Josiah</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>
              </div>

              {/* Submit / Action Controls */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 shrink-0">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsModalOpen(false);
                    setShowMinisterDropdown(false);
                  }} 
                  className="font-bold text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="bg-blue-600 font-black px-4 py-1.5 rounded-lg hover:bg-blue-700 shadow-sm transition-transform active:scale-95">
                  Save 
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

