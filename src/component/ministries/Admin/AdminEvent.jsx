import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  FaHome, FaSearch, FaSpinner, FaCalendarAlt, 
  FaPlus, FaCheckCircle, FaRegCircle, FaTrash, FaClock, FaTimes,
  FaChevronLeft, FaChevronRight, FaInfoCircle, FaTags
} from "react-icons/fa";
import { supabase } from "../../../Services/supabase";

export default function AdminEvent() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Calendar Engine Matrix States
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState("");

  // Modal Triggers
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
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
    const today = new Date().toISOString().split('T')[0];
    setSelectedDateStr(today);
  }, []);

  async function fetchAdminLogs() {
    try {
      setLoading(true);
      // Added limit(10) to pull only the 10 most recent event items
      const { data, error } = await supabase
        .from("administration_logs")
        .select("*")
        .eq("type", "event")
        .order("target_date", { ascending: false })
        .limit(10);

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error("Error fetching admin events:", err.message);
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

  const getEventsForDate = (dateStr) => {
    return logs.filter(log => log.target_date === dateStr);
  };

  const handleDateClick = (dateStr) => {
    setSelectedDateStr(dateStr);
    const dayEvents = getEventsForDate(dateStr);

    if (dayEvents.length > 0) {
      setSelectedEvent(dayEvents[0]);
      setModalMode("view");
      setIsModalOpen(true);
    } else {
      setModalMode("create");
      setIsModalOpen(true);
    }
  };

  // --- Sub-list Handlers ---
  const addChecklistItem = () => {
    if (!newItemName.trim()) return;
    setItemsList([...itemsList, { name: newItemName.trim(), checked: false }]);
    setNewItemName("");
  };

  const removeChecklistItem = (index) => {
    setItemsList(itemsList.filter((_, i) => i !== index));
  };

  const toggleRowItemCheckDirect = async (eventObj, itemIndex) => {
    const updatedItems = [...eventObj.needed_items];
    updatedItems[itemIndex].checked = !updatedItems[itemIndex].checked;

    try {
      const { error } = await supabase
        .from("administration_logs")
        .update({ needed_items: updatedItems })
        .eq("id", eventObj.id);

      if (error) throw error;
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
        status: "Pending",
        type: "event"
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

  // Changed slice limit from 15 to 10 for consistency
  const displayedLogs = filteredLogs.slice(0, 10);

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
      <div className="fixed top-3 left-3 z-40 sm:top-4 sm:left-4">
        <Link
          to="/ministries/administration"
          className="flex items-center gap-2 bg-white/90 backdrop-blur border border-slate-200 px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors shadow-sm"
        >
          <FaHome className="text-base" />
          <span className="hidden sm:inline">Back to Dashboard</span>
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-5 sm:py-6 md:py-8 pt-14 sm:pt-16">
        {/* Header Layout */}
        <div className="mb-5 sm:mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2">
              <FaCalendarAlt className="text-blue-600 text-lg sm:text-xl" /> Manage <span className="text-blue-600">Events</span>
            </h1>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase mt-0.5 tracking-wider">
              Calendar Matrix & Logistics Master System (Top 10 Recent)
            </p>
          </div>

          <div className="flex flex-wrap gap-1 bg-slate-200/60 p-1 rounded-xl border border-slate-200/40 self-start md:self-auto">
            {["All", "Active", "Completed", "Pending"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === status ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Workspace Layout Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">

          {/* Calendar Deck Grid */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-[10px] sm:text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                <FaCalendarAlt className="text-blue-500" /> Operational Matrix
              </h2>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
                <button onClick={handlePrevMonth} className="p-1.5 hover:bg-white rounded-md text-slate-600 transition-colors cursor-pointer active:scale-95"><FaChevronLeft className="text-[10px]" /></button>
                <button onClick={handleNextMonth} className="p-1.5 hover:bg-white rounded-md text-slate-600 transition-colors cursor-pointer active:scale-95"><FaChevronRight className="text-[10px]" /></button>
              </div>
            </div>

            <div className="text-center font-bold text-sm text-slate-800 mb-2 sm:mb-3 capitalize">
              {currentCalendarDate.toLocaleString("en-PH", { month: "long", year: "numeric" })}
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => <div key={d} className="py-1">{d}</div>)}
            </div>

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
                    className={`aspect-square relative flex flex-col items-center justify-center rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer border min-h-[32px] sm:min-h-[40px] ${
                      isSelected 
                        ? "bg-blue-600 border-blue-600 text-emerald-500 shadow-sm" 
                        : hasEvents 
                        ? "bg-blue-50/80 border-blue-200 text-blue-700 hover:bg-blue-100" 
                        : "bg-slate-50/50 border-transparent text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span>{parseInt(dayNum)}</span>
                    {hasEvents && !isSelected && (
                      <span className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-500" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 sm:mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 italic">Click calendar day to inspect events</span>
              <button 
                onClick={() => { setModalMode("create"); setIsModalOpen(true); }}
                className="text-[10px] sm:text-xs bg-slate-900 font-black px-2 py-1 rounded-lg hover:bg-slate-800 flex items-center gap-1 active:scale-95 transition-transform"
              >
                <FaPlus className="text-[8px]" /> Force Add
              </button>
            </div>
          </div>

          {/* Table Deck View List */}
          <div className="lg:col-span-8 space-y-3">
            <div className="bg-white border border-slate-200 rounded-xl p-2.5 sm:p-3 shadow-sm flex items-center gap-2.5">
              <FaSearch className="text-slate-400 ml-1 text-sm flex-shrink-0" />
              <input
                type="text"
                placeholder="Search event schedules or target tracking areas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm font-medium text-slate-800 focus:outline-none"
              />
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              {loading ? (
                <div className="flex items-center justify-center py-12 sm:py-16"><FaSpinner className="animate-spin text-blue-500 text-xl" /></div>
              ) : displayedLogs.length === 0 ? (
                <div className="py-10 sm:py-12 text-center text-sm text-slate-400 font-bold">No running event rosters found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-100 text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-2.5 sm:py-3 px-3 sm:px-4">Date Target</th>
                        <th className="py-2.5 sm:py-3 px-3 sm:px-4">Operation / Event Title</th>
                        <th className="py-2.5 sm:py-3 px-3 sm:px-4">Department Area</th>
                        <th className="py-2.5 sm:py-3 px-3 sm:px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                      {displayedLogs.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="py-2.5 sm:py-3 px-3 sm:px-4 whitespace-nowrap font-bold text-slate-400 text-[10px] sm:text-xs">
                            {item.target_date} {item.event_time ? `| ${item.event_time}` : ""}
                          </td>
                          <td className="py-2.5 sm:py-3 px-3 sm:px-4 font-bold text-slate-800">{item.title}</td>
                          <td className="py-2.5 sm:py-3 px-3 sm:px-4">
                            <span className="inline-flex items-center bg-slate-100 text-slate-600 text-[9px] sm:text-[10px] px-2 py-0.5 rounded border border-slate-200 font-bold">
                              {item.department}
                            </span>
                          </td>
                          <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-center">
                            <button
                              onClick={() => { setSelectedEvent(item); setModalMode("view"); setIsModalOpen(true); }}
                              className="text-[10px] sm:text-xs bg-blue-50 text-blue-600 font-bold px-2 sm:px-2.5 py-1 rounded-lg border border-blue-100 hover:bg-blue-100 cursor-pointer active:scale-95 transition-transform"
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

      {/* Modal View Block Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh]">

            <div className="bg-slate-50 px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-800 flex items-center gap-1.5">
                  <FaCalendarAlt className={modalMode === "view" ? "text-emerald-600" : "text-blue-600"} />
                  {modalMode === "view" ? "Operational Logistics Blueprint" : "Plan Master Event"}
                </h3>
                <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider mt-0.5">
                  Target: {formatDateLabel(selectedDateStr)}
                </p>
              </div>
              <button onClick={resetFormModal} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer active:scale-95 transition-transform"><FaTimes /></button>
            </div>

            {modalMode === "view" && selectedEvent ? (
              <div className="p-4 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto flex-1">
                <div>
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-0.5">Event Title / Operation</span>
                  <h2 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">{selectedEvent.title}</h2>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4 bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-150/60">
                  <div>
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Department Scope Area</span>
                    <span className="text-[11px] sm:text-xs font-bold text-slate-700 flex items-center gap-1 mt-0.5">
                      <FaTags className="text-[10px] text-blue-500" /> {selectedEvent.department}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Target Time Slot</span>
                    <span className="text-[11px] sm:text-xs font-bold text-slate-700 flex items-center gap-1 mt-0.5">
                      <FaClock className="text-[10px] text-amber-500" /> {selectedEvent.event_time || "Not specified"}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-2">Required Materials Logistics Checklist</span>
                  {(!selectedEvent.needed_items || selectedEvent.needed_items.length === 0) ? (
                    <p className="text-xs font-medium text-slate-400 italic bg-slate-50 text-center py-3 sm:py-4 rounded-xl border border-dashed">
                      No item logistics checklist attached.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-40 sm:max-h-48 overflow-y-auto pr-1">
                      {selectedEvent.needed_items.map((item, index) => (
                        <button
                          key={index}
                          onClick={() => toggleRowItemCheckDirect(selectedEvent, index)}
                          className="w-full flex items-center gap-3 bg-white px-3 py-2 border border-slate-150/80 rounded-xl hover:bg-slate-50 transition-colors text-left cursor-pointer shadow-sm select-none active:scale-[0.99]"
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
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">Summary Memo Description</span>
                    <div className="bg-slate-50/50 border rounded-xl p-2.5 text-xs font-medium text-slate-600 leading-relaxed">
                      {selectedEvent.description}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 italic flex items-center gap-1">
                    <FaInfoCircle /> Click lines to toggle status metrics
                  </span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setModalMode("create")}
                      className="text-[10px] sm:text-xs font-bold px-2.5 sm:px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 cursor-pointer active:scale-95 transition-transform"
                    >
                      Schedule Another
                    </button>
                    <button onClick={resetFormModal} className="text-[10px] sm:text-xs font-black px-3 sm:px-4 py-1.5 bg-slate-900 rounded-xl hover:bg-slate-800 cursor-pointer active:scale-95 transition-transform">
                      Close View
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateEvent} className="p-4 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Event Title / Primary Operation *</label>
                  <input
                    type="text" required placeholder="e.g., Sunday Service Logistics"
                    value={eventTitle} onChange={(e) => setEventTitle(e.target.value)}
                    className="w-full text-sm font-semibold text-slate-800 border border-slate-200 focus:border-blue-500 bg-slate-50/50 rounded-xl px-3 py-2 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Department Scope Area</label>
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
                    <label className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Target Time Slot</label>
                    <input
                      type="text" placeholder="e.g., 9:00 AM - 1:00 PM"
                      value={eventTime} onChange={(e) => setEventTime(e.target.value)}
                      className="w-full text-xs font-semibold text-slate-700 border border-slate-200 bg-slate-50/50 rounded-xl px-3 py-2 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl p-2.5 sm:p-3 bg-slate-50/30">
                  <label className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Needed Materials Logistics List</label>
                  <div className="flex gap-1.5 mb-2">
                    <input
                      type="text" placeholder="Add item (e.g., Communal Bread Cups)"
                      value={newItemName} onChange={(e) => setNewItemName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addChecklistItem(); } }}
                      className="w-full text-xs font-medium text-slate-800 border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 focus:outline-none"
                    />
                    <button type="button" onClick={addChecklistItem} className="bg-slate-800 font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 flex-shrink-0 cursor-pointer active:scale-95 transition-transform"><FaPlus /> Add</button>
                  </div>

                  {itemsList.length > 0 && (
                    <div className="space-y-1 max-h-28 sm:max-h-32 overflow-y-auto pr-1">
                      {itemsList.map((item, index) => (
                        <div key={index} className="flex items-center justify-between bg-white px-2 py-1.5 border border-slate-100 rounded-lg shadow-sm">
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-2">○ {item.name}</span>
                          <button type="button" onClick={() => removeChecklistItem(index)} className="text-slate-300 hover:text-rose-500 p-0.5 cursor-pointer active:scale-95 transition-transform"><FaTrash className="text-[9px]" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Additional Notes Memo</label>
                  <textarea
                    rows="2" placeholder="Provide supplementary setup descriptions here..."
                    value={description} onChange={(e) => setDescription(e.target.value)}
                    className="w-full text-xs font-medium text-slate-800 border border-slate-200 focus:border-blue-500 bg-slate-50/50 rounded-xl px-3 py-2 focus:outline-none resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button type="button" onClick={resetFormModal} className="text-xs font-bold px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer active:scale-95 transition-transform">Cancel</button>
                  <button type="submit" disabled={!eventTitle.trim()} className="text-xs font-black px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-sm transition-all disabled:opacity-40 cursor-pointer active:scale-95 transition-transform">Save Event</button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

