import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  FaHome, FaSearch, FaSpinner, FaCogs, FaTags, FaCalendarAlt, 
  FaPlus, FaCheckCircle, FaRegCircle, FaTrash, FaClock, FaTimes,
  FaChevronLeft, FaChevronRight, FaInfoCircle
} from "react-icons/fa";
import { supabase } from "../../../Services/supabase";

export default function AdministrationDept() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Custom Inline Calendar Matrix States
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState("");
  
  // Modal State Triggers
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // "create" or "view"
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Form Fields State
  const [eventTitle, setEventTitle] = useState("");
  const [department, setDepartment] = useState("General Office");
  const [eventTime, setEventTime] = useState("");
  const [description, setDescription] = useState("");
  const [itemsList, setItemsList] = useState([]);
  const [newItemName, setNewItemName] = useState("");

  useEffect(() => {
    fetchAdminLogs();
    // Default select today's date string signature on init (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];
    setSelectedDateStr(today);
  }, []);

  async function fetchAdminLogs() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("administration_logs")
        .select("*")
        .order("target_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error("Error fetching administrative profiles:", err.message);
    } finally {
      setLoading(false);
    }
  }

  // --- Calendar Generator Logic Block ---
  const daysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const startDayOfWeek = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const handlePrevMonth = () => {
    setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1));
  };

  // Check if a specific calendar cell timestamp string has events mapped to it
  const getEventsForDate = (dateStr) => {
    return logs.filter(log => log.target_date === dateStr);
  };

  const handleDateClick = (dateStr) => {
    setSelectedDateStr(dateStr);
    const dayEvents = getEventsForDate(dateStr);

    if (dayEvents.length > 0) {
      // If events exist, open the first one in detailed view inspect layout mode
      setSelectedEvent(dayEvents[0]);
      setModalMode("view");
      setIsModalOpen(true);
    } else {
      // Otherwise trigger empty form creation prompt block
      setModalMode("create");
      setIsModalOpen(true);
    }
  };

  // --- Dynamic Checkbox Sub-lists Handlers ---
  const addChecklistItem = () => {
    if (!newItemName.trim()) return;
    setItemsList([...itemsList, { name: newItemName.trim(), checked: false }]);
    setNewItemName("");
  };

  const toggleItemCheck = (index) => {
    const updated = [...itemsList];
    updated[index].checked = !updated[index].checked;
    setItemsList(updated);
  };

  // Toggle checklist status natively from the inline row viewer context window 
  const toggleRowItemCheckDirect = async (eventObj, itemIndex) => {
    const updatedItems = [...eventObj.needed_items];
    updatedItems[itemIndex].checked = !updatedItems[itemIndex].checked;
    
    try {
      const { error } = await supabase
        .from("administration_logs")
        .update({ needed_items: updatedItems })
        .eq("id", eventObj.id);

      if (error) throw error;
      // Optimistic update state reload execution trigger
      setLogs(logs.map(l => l.id === eventObj.id ? { ...l, needed_items: updatedItems } : l));
      if (selectedEvent && selectedEvent.id === eventObj.id) {
        setSelectedEvent({ ...selectedEvent, needed_items: updatedItems });
      }
    } catch (err) {
      console.error("Failed to update status live hook:", err.message);
    }
  };

  const resetFormModal = () => {
    setIsModalOpen(false);
    setEventTitle("");
    setDepartment("General Office");
    setEventTime("");
    setDescription("");
    setItemsList([]);
    setNewItemName("");
    setSelectedEvent(null);
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!eventTitle.trim() || !selectedDateStr) return;

    try {
      const payload = {
        target_date: selectedDateStr,
        title: eventTitle.trim(),
        department: department,
        description: description.trim(),
        event_time: eventTime || null,
        needed_items: itemsList,
        status: "Pending"
      };

      const { error } = await supabase
        .from("administration_logs")
        .insert([payload]);

      if (error) throw error;
      
      resetFormModal();
      await fetchAdminLogs();
    } catch (err) {
      console.error("Error creating scheduled admin event:", err.message);
    }
  };

  const formatDateLabel = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-PH", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const filteredLogs = logs.filter((item) => {
    const taskTitle = (item.title || "").toLowerCase();
    const assignedDept = (item.department || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = taskTitle.includes(query) || assignedDept.includes(query);
    const matchesStatus = statusFilter === "All" || (item.status || "Pending") === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const displayedLogs = filteredLogs.slice(0, 15);

  // Compile calendar construction dimensions maps
  const numDays = daysInMonth(currentCalendarDate);
  const startOffset = startDayOfWeek(currentCalendarDate);
  const calendarCells = [];

  for (let i = 0; i < startOffset; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= numDays; d++) {
    const year = currentCalendarDate.getFullYear();
    const month = String(currentCalendarDate.getMonth() + 1).padStart(2, '0');
    const day = String(d).padStart(2, '0');
    calendarCells.push(`${year}-${month}-${day}`);
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900 antialiased overflow-x-hidden relative">
      {/* Return Navigation Utility Anchor */}
      <div className="fixed top-4 left-4 z-40">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 bg-white/90 backdrop-blur border border-slate-200 px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors shadow-xs"
        >
          <FaHome className="text-base" /> Back to Core
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8 pt-16">
        {/* Department Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2">
              <FaCogs className="text-blue-600" /> Administration <span className="text-blue-600">Department</span>
            </h1>
            <p className="text-xs font-semibold text-slate-400 uppercase mt-0.5 tracking-wider">
              Logistics & scheduling command module dashboard
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 bg-slate-200/60 p-1 rounded-xl border border-slate-200/40">
            {["All", "Active", "Completed", "Pending"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === status ? "bg-white text-blue-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Interactive Panel Splitter Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT CONTAINER: Embedded Highlight-Driven Monthly Matrix Calendar */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                <FaCalendarAlt className="text-blue-500" /> Operational Matrix
              </h2>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
                <button onClick={handlePrevMonth} className="p-1.5 hover:bg-white rounded-md text-slate-600 transition-colors cursor-pointer"><FaChevronLeft className="text-[10px]" /></button>
                <button onClick={handleNextMonth} className="p-1.5 hover:bg-white rounded-md text-slate-600 transition-colors cursor-pointer"><FaChevronRight className="text-[10px]" /></button>
              </div>
            </div>

            <div className="text-center font-bold text-sm text-slate-800 mb-3 capitalize">
              {currentCalendarDate.toLocaleString("en-PH", { month: "long", year: "numeric" })}
            </div>

            {/* Calendar Weekday Matrix Headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => <div key={d} className="py-1">{d}</div>)}
            </div>

            {/* Grid Construction Engine */}
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((cellDate, index) => {
                if (!cellDate) return <div key={`empty-${index}`} className="aspect-square" />;
                
                const dayNum = cellDate.split('-')[2];
                const dayEvents = getEventsForDate(cellDate);
                const hasEvents = dayEvents.length > 0;
                const isSelected = cellDate === selectedDateStr;

                return (
                  <button
                    key={cellDate}
                    onClick={() => handleDateClick(cellDate)}
                    className={`aspect-square relative flex flex-col items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      isSelected 
                        ? "bg-blue-600 border-blue-600 text-white shadow-xs" 
                        : hasEvents 
                        ? "bg-blue-50/80 border-blue-200 text-blue-700 hover:bg-blue-100" 
                        : "bg-slate-50/50 border-transparent text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span>{parseInt(dayNum)}</span>
                    {/* Event Color Dot Flag Indicator Marker */}
                    {hasEvents && !isSelected && (
                      <span className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-500" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-400 italic">Click highlighted day to inspect profiles</span>
              <button 
                onClick={() => { setModalMode("create"); setIsModalOpen(true); }}
                className="text-[10px] bg-slate-900 text-white font-black px-2 py-1 rounded-lg hover:bg-slate-800 flex items-center gap-1"
              >
                <FaPlus className="text-[8px]" /> Force Add
              </button>
            </div>
          </div>

          {/* RIGHT CONTAINER: Search Filter Table Deck */}
          <div className="lg:col-span-8 space-y-3">
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex items-center gap-2.5">
              <FaSearch className="text-slate-400 ml-1 text-sm flex-shrink-0" />
              <input
                type="text"
                placeholder="Search logs by activity task title or responsible area..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm font-medium text-slate-800 focus:outline-none"
              />
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              {loading ? (
                <div className="flex items-center justify-center py-16"><FaSpinner className="animate-spin text-blue-500 text-xl" /></div>
              ) : displayedLogs.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400 font-bold">No running records mapped.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-3 px-4">Date Target</th>
                        <th className="py-3 px-4">Operation / Task Name</th>
                        <th className="py-3 px-4">Department Area</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {displayedLogs.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-400 text-xs">
                            {item.target_date} {item.event_time ? `| ${item.event_time}` : ""}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800">{item.title}</td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded border border-slate-200 font-bold">
                              {item.department}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => { setSelectedEvent(item); setModalMode("view"); setIsModalOpen(true); }}
                              className="text-xs bg-blue-50 text-blue-600 font-bold px-2.5 py-1 rounded-lg border border-blue-100 hover:bg-blue-100 cursor-pointer"
                            >
                              Inspect Details
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

        </div>
      </div>

      {/* COMPOSITE INTERACTIVE VIEW / CREATE MODAL OVERLAY */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Modal Header Mapping */}
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-800 flex items-center gap-1.5">
                  <FaCalendarAlt className={modalMode === "view" ? "text-emerald-600" : "text-blue-600"} />
                  {modalMode === "view" ? "Operational Logistics Blueprint" : "Plan Administrative Task"}
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-0.5">
                  Target: {formatDateLabel(selectedDateStr)}
                </p>
              </div>
              <button onClick={resetFormModal} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"><FaTimes /></button>
            </div>

            {/* Modal Context Segment Switcher Conditional Route */}
            {modalMode === "view" && selectedEvent ? (
              /* ================= MODE: VIEW LOGISTICS AND EVENT DETAILS ================= */
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-0.5">Event Title / Operation</span>
                  <h2 className="text-lg font-black text-slate-800 tracking-tight">{selectedEvent.title}</h2>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-150/60">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Department Area</span>
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1 mt-0.5">
                      <FaTags className="text-[10px] text-blue-500" /> {selectedEvent.department}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Target Time Slot</span>
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1 mt-0.5">
                      <FaClock className="text-[10px] text-amber-500" /> {selectedEvent.event_time || "Not specified"}
                    </span>
                  </div>
                </div>

                {/* Logistics Bullet Needed Checklist Node Display */}
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-2">Required Materials Logistics Checklist</span>
                  {(!selectedEvent.needed_items || selectedEvent.needed_items.length === 0) ? (
                    <p className="text-xs font-medium text-slate-400 italic bg-slate-50 text-center py-4 rounded-xl border border-dashed">
                      No item logistics checklist attached to this registry timeline block.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {selectedEvent.needed_items.map((item, index) => (
                        <button
                          key={index}
                          onClick={() => toggleRowItemCheckDirect(selectedEvent, index)}
                          className="w-full flex items-center gap-3 bg-white px-3 py-2 border border-slate-150/80 rounded-xl hover:bg-slate-50 transition-colors text-left cursor-pointer shadow-2xs select-none"
                        >
                          {item.checked ? (
                            <FaCheckCircle className="text-emerald-500 text-base flex-shrink-0" />
                          ) : (
                            <FaRegCircle className="text-slate-300 text-base flex-shrink-0" />
                          )}
                          <span className={`text-xs font-bold text-slate-700 ${item.checked ? "line-through text-slate-400 font-normal decoration-slate-300" : ""}`}>
                            {item.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedEvent.description && (
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">Summary Memo Description</span>
                    <div className="bg-slate-50/50 border rounded-xl p-2.5 text-xs font-medium text-slate-600 leading-relaxed">
                      {selectedEvent.description}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 italic flex items-center gap-1">
                    <FaInfoCircle /> Click list rows to toggle status metrics
                  </span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setModalMode("create"); }}
                      className="text-xs font-bold px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 cursor-pointer"
                    >
                      Schedule Another
                    </button>
                    <button onClick={resetFormModal} className="text-xs font-black px-4 py-1.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 cursor-pointer">
                      Close View
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* ================= MODE: CREATE AN EVENT LOG ENTRY ================= */
              <form onSubmit={handleCreateEvent} className="p-5 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Event Title / Primary Operation *</label>
                  <input
                    type="text" required placeholder="e.g., General Assembly Logistics Pack"
                    value={eventTitle} onChange={(e) => setEventTitle(e.target.value)}
                    className="w-full text-sm font-semibold text-slate-800 border border-slate-200 focus:border-blue-500 bg-slate-50/50 rounded-xl px-3 py-2 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Department Scope Area</label>
                    <select
                      value={department} onChange={(e) => setDepartment(e.target.value)}
                      className="w-full text-xs font-bold text-slate-700 border border-slate-200 bg-slate-50/50 rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
                    >
                      <option value="General Office">General Office</option>
                      <option value="Logistics">Logistics</option>
                      <option value="Media & IT">Media & IT</option>
                      <option value="Sanctuary Maintenance">Sanctuary Maintenance</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Target Time Slot (Optional)</label>
                    <input
                      type="text" placeholder="e.g., 9:00 AM - 1:00 PM"
                      value={eventTime} onChange={(e) => setEventTime(e.target.value)}
                      className="w-full text-xs font-semibold text-slate-700 border border-slate-200 bg-slate-50/50 rounded-xl px-3 py-2 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Sub-item Needed Checklist Form Component Grid */}
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/30">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Needed Materials Logistics List</label>
                  <div className="flex gap-1.5 mb-2">
                    <input
                      type="text" placeholder="Add item (e.g., Flowers, Red Carpet)"
                      value={newItemName} onChange={(e) => setNewItemName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addChecklistItem(); } }}
                      className="w-full text-xs font-medium text-slate-800 border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 focus:outline-none"
                    />
                    <button type="button" onClick={addChecklistItem} className="bg-slate-800 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 flex-shrink-0 cursor-pointer"><FaPlus /> Add</button>
                  </div>

                  {itemsList.length > 0 && (
                    <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                      {itemsList.map((item, index) => (
                        <div key={index} className="flex items-center justify-between bg-white px-2 py-1.5 border border-slate-100 rounded-lg shadow-2xs">
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-2">○ {item.name}</span>
                          <button type="button" onClick={() => removeChecklistItem(index)} className="text-slate-300 hover:text-rose-500 p-0.5 cursor-pointer"><FaTrash className="text-[9px]" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Additional Notes Memo</label>
                  <textarea
                    rows="2" placeholder="Provide supplementary operational details here..."
                    value={description} onChange={(e) => setDescription(e.target.value)}
                    className="w-full text-xs font-medium text-slate-800 border border-slate-200 focus:border-blue-500 bg-slate-50/50 rounded-xl px-3 py-2 focus:outline-none resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button type="button" onClick={resetFormModal} className="text-xs font-bold px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer">Cancel</button>
                  <button type="submit" disabled={!eventTitle.trim()} className="text-xs font-black px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all disabled:opacity-40 cursor-pointer">Okay</button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}
    </div>
  );
}