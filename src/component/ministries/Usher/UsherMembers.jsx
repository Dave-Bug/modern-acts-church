import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaHome, FaUserPlus, FaTimes, FaTrashAlt, FaEdit, FaSearch, FaCalendarAlt, FaFileExcel } from "react-icons/fa";
import { Link } from "react-router-dom";
import { supabase } from "../../../Services/supabase"; // Adjust this path to your Supabase client setup

export default function UsherDashboard() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Input references for launching native picker interfaces programmatically
  const birthdateInputRef = useRef(null);
  const dateInvitedInputRef = useRef(null);
  
  // Search state query configuration
  const [searchQuery, setSearchQuery] = useState("");
  
  // New role filter state: can be "All", "Member", "Minister", or "Visitor"
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("All");
  
  // Track if we are editing an existing member (holds their ID) or adding a new one (null)
  const [editingMemberId, setEditingMemberId] = useState(null);

  // Form States explicit tracking (ministry initialized as empty string to allow optional/null state)
  const [firstName, setFirstName] = useState("");
  const [middleInitial, setMiddleInitial] = useState("");
  const [lastName, setLastName] = useState("");
  const [tribe, setTribe] = useState("");
  const [role, setRole] = useState("");
  const [ministry, setMinistry] = useState("");
  const [age, setAge] = useState("");
  const [number, setNumber] = useState("");
  const [invitedBy, setInvitedBy] = useState("");
  const [dateInvited, setDateInvited] = useState("");
  const [birthdate, setBirthdate] = useState("");

  // FETCH ROSTER FROM SUPABASE ON MOUNT
  const fetchMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("usher_members")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setMembers(data || []);
    } catch (err) {
      console.error("Error fetching database roster:", err.message);
      alert("Failed to load dashboard data pipeline.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  // EXCEL / CSV EXPORT ENGINE (Mobile Friendly, No Dependency Required)
  const handleExportExcel = () => {
    if (filteredMembers.length === 0) {
      return alert("No data available to export.");
    }

    // Explicitly target filteredMembers so users can filter search results before exporting
    const targetData = filteredMembers;
    // Define standard spreadsheet headers
    const headers = [
      "First Name",
      "Middle Initial",
      "Last Name",
      "Role",
      "Tribe",
      "Ministries",
      "Birthdate",
      "Age",
      "Contact Number",
      "Invited By",
      "Date Invited"
    ];
    // Map rows cleanly while handling null/comma string anomalies safely
    const rows = targetData.map((m) => [
      `"${(m.first_name || "").replace(/"/g, '""')}"`,
      `"${(m.middle_initial || "").replace(/"/g, '""')}"`,
      `"${(m.last_name || "").replace(/"/g, '""')}"`,
      `"${(m.role || "").replace(/"/g, '""')}"`,
      `"${(m.tribe || "").replace(/"/g, '""')}"`,
      `"${(m.ministry || "").replace(/"/g, '""')}"`,
      m.birthdate || "",
      m.age || "",
      `"${(m.number || "").replace(/"/g, '""')}"`,
      `"${(m.invited_by || "").replace(/"/g, '""')}"`,
      m.date_invited || ""
    ]);
    // Construct spreadsheet content format
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    // Create secure universal blob for mobile download handlers
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], {
      type: "text/csv;charset=utf-8;"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Usher_Ministry_Roster_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to handle fast-typing date formatting with smart forward-slashes
  const handleDateTextChange = (inputValue, setter) => {
    const digits = inputValue.replace(/\D/g, "").slice(0, 8);
    let formatted = "";
    
    if (digits.length > 0) {
      formatted += digits.slice(0, 4);
    }
    if (digits.length > 4) {
      formatted += "/" + digits.slice(4, 6);
    }
    if (digits.length > 6) {
      formatted += "/" + digits.slice(6, 8);
    }
    
    setter(formatted);
  };

  // Helper to safely reset form variables and close the modal cleanly
  const closeModalAndResetForm = () => {
    setEditingMemberId(null);
    setFirstName("");
    setMiddleInitial("");
    setLastName("");
    setBirthdate("");
    setTribe("");
    setRole("");
    setMinistry("");
    setAge("");
    setNumber("");
    setInvitedBy("");
    setDateInvited("");
    setShowModal(false);
  };

  // Trigger when the user clicks an edit button
  const handleEditClick = (member) => {
    setEditingMemberId(member.id);
    setFirstName(member.first_name || "");
    setMiddleInitial(member.middle_initial || "");
    setLastName(member.last_name || "");
    setTribe(member.tribe || "");
    setRole(member.role || "");
    setMinistry(member.ministry || "");
    setAge(member.age ? member.age.toString() : "");
    setNumber(member.number || "");
    setInvitedBy(member.invited_by || "");
    // Format database dashes (YYYY-MM-DD) to input slashes (YYYY/MM/DD)
    setBirthdate(member.birthdate ? member.birthdate.replace(/-/g, "/") : "");
    setDateInvited(member.date_invited ? member.date_invited.replace(/-/g, "/") : "");
    
    setShowModal(true);
  };

  const handleSaveMember = async (e) => {
    e.preventDefault();
    // 1. Validation: Ensure required fields are not empty
    if (!firstName.trim() || !lastName.trim()) {
      return alert("Error: First Name and Last Name are required fields.");
    }

    // 2. Strict Normalization Helper (Removes all spaces and converts to lowercase)
    const normalizeString = (str) => (str || "").replace(/\s+/g, "").toLowerCase();
    const targetFirst = normalizeString(firstName);
    const targetMiddle = normalizeString(normalizeString(middleInitial) ? middleInitial.replace(/\./g, "") : "");
    const targetLast = normalizeString(lastName);

    // 3. Check for Duplicates in the Existing Roster
    const identityExists = members.some((member) => {
      // If updating an existing record, skip matching it against itself
      if (editingMemberId && member.id === editingMemberId) return false;

      const currentFirst = normalizeString(member.first_name);
      const currentMiddle = normalizeString(member.middle_initial ? member.middle_initial.replace(/\./g, "") : "");
      const currentLast = normalizeString(member.last_name);

      return (
        currentFirst === targetFirst &&
        currentMiddle === targetMiddle &&
        currentLast === targetLast
      );
    });

    // 4. Block Submission if a Duplicate is Found
    if (identityExists) {
      const formattedMiddle = middleInitial.trim() ? middleInitial.trim() + " " : "";
      return alert(
        `Error: An entry for "${firstName.trim()} ${formattedMiddle}${lastName.trim()}" already exists in the system roster logs.`
      );
    }

    // Convert UI slash dates (YYYY/MM/DD) back into standard database dashes (YYYY-MM-DD) or fallback to null
    const formattedBirthdate = birthdate.trim() ? birthdate.replace(/\//g, "-") : null;
    const formattedDateInvited = dateInvited.trim() ? dateInvited.replace(/\//g, "-") : null;
    const parseAge = age.trim() ? parseInt(age, 10) : null;

    // Build the payload mapping accurately to Supabase snake_case columns
    const memberPayload = {
      first_name: firstName.trim(),
      middle_initial: middleInitial.trim(),
      last_name: lastName.trim(),
      tribe: tribe || null,
      role: role || null,
      ministry: ministry || null,
      age: parseAge,
      number: number.trim() || null,
      invited_by: invitedBy.trim() || null,
      date_invited: formattedDateInvited,
      birthdate: formattedBirthdate
    };

    // 5. Save Logic (Handles both Edit Mode and New Registration Mode via Live Supabase APIs)
    try {
      if (editingMemberId) {
        // Update existing live record
        const { data, error } = await supabase
          .from("usher_members")
          .update(memberPayload)
          .eq("id", editingMemberId)
          .select();
        if (error) throw error;

        setMembers((prevMembers) =>
          prevMembers.map((member) => (member.id === editingMemberId ? data[0] : member))
        );
      } else {
        // Insert new structural dataset row
        const { data, error } = await supabase
          .from("usher_members")
          .insert([memberPayload])
          .select();
        if (error) throw error;

        setMembers((prevMembers) => [data[0], ...prevMembers]);
      }
      
      closeModalAndResetForm();
    } catch (err) {
      console.error("Error saving data row item changes:", err.message);
      alert("Critical processing error: Could not sync mutations down to core registry infrastructure.");
    }
  };

  // DELETE MEMBER MUTATION
  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to remove this member from the team?")) return;
    try {
      const { error } = await supabase
        .from("usher_members")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setMembers(members.filter((m) => m.id !== id));
    } catch (err) {
      console.error("Error deleting record:", err.message);
      alert("Failed to remove data row object.");
    }
  };

  const getMinistryBadge = (minName) => {
    const colors = {
      "Usher": "bg-blue-100 text-blue-700 border-blue-200",
      "Multimedia": "bg-purple-100 text-purple-700 border-purple-200",
      "Worship Team": "bg-sky-100 text-sky-700 border-sky-200",
      "Marshall": "bg-slate-100 text-slate-700 border-slate-200",
      "DJ Team": "bg-amber-100 text-amber-700 border-amber-200",
      "Finance Department": "bg-emerald-100 text-emerald-700 border-emerald-200",
      "Admin Department": "bg-indigo-100 text-indigo-700 border-indigo-200",
      "Mac Kids": "bg-rose-100 text-rose-700 border-rose-200",
    };
    return colors[minName] || "bg-slate-100 text-slate-600 border-slate-200";
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Helper toggle engine to manipulate Multi-Select checkboxes array strings easily
  const handleMinistryCheckboxChange = (ministryId) => {
    let currentSelections = ministry ? ministry.split(", ") : [];
    if (currentSelections.includes(ministryId)) {
      currentSelections = currentSelections.filter((id) => id !== ministryId);
    } else {
      currentSelections.push(ministryId);
    }
    setMinistry(currentSelections.join(", "));
  };

  // UPDATED SEARCH AND DESIGNATION COMBINED FILTER ENGINE
  const filteredMembers = members.filter((member) => {
    // 1. Structural Designation Role filter rule
    if (selectedRoleFilter !== "All") {
      const currentRole = member.role || "";
      if (currentRole.toLowerCase() !== selectedRoleFilter.toLowerCase()) {
        return false;
      }
    }

    // 2. Standard Search Input dynamic mapping string verification
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    const fullName = `${member.first_name || ""} ${member.middle_initial || ""} ${member.last_name || ""}`.toLowerCase();
    const tribeName = (member.tribe || "").toLowerCase();
    const specificRole = (member.role || "").toLowerCase();
    const ministryRole = (member.ministry || "").toLowerCase();
    const ageValue = member.age ? member.age.toString() : "";
    const phoneNumber = (member.number || "").toLowerCase();
    const inviter = (member.invited_by || "").toLowerCase();
    const bdayText = member.birthdate ? formatDate(member.birthdate).toLowerCase() : "";
    const inviteDateText = member.date_invited ? formatDate(member.date_invited).toLowerCase() : "";

    return (
      fullName.includes(query) ||
      tribeName.includes(query) ||
      specificRole.includes(query) ||
      ministryRole.includes(query) ||
      ageValue.includes(query) ||
      phoneNumber.includes(query) ||
      inviter.includes(query) ||
      bdayText.includes(query) ||
      inviteDateText.includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      {/* Back Button */}
      <div className="fixed top-4 left-4 z-50">
        <Link
          to="/ministries/usher"
          className="flex items-center gap-2 bg-white/80 backdrop-blur border border-slate-200 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors"
        >
          <FaHome />
          Back
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10 md:py-14 pt-16">
        {/* Header */}
        <div className="text-center mb-8 md:mb-10">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-xl mx-auto mb-3">
            🙏
          </div>
          <h1 className="text-3xl md:text-5xl font-black">
            Usher <span className="text-blue-600">Ministry</span>
          </h1>
          <p className="text-slate-500 text-xs md:text-sm mt-2">
            Manage schedules, designations, and roster directory
          </p>
        </div>

        {/* Stats + Actions Layout Container */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mb-6">
          <div className="bg-white/80 backdrop-blur border border-slate-200 rounded-xl p-4 md:p-5">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Members</p>
            <p className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">
              {loading ? "..." : members.length}
            </p>
          </div>
          <div className="bg-white/80 backdrop-blur border border-slate-200 rounded-xl p-4 md:p-5">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Matches Found</p>
            <p className="text-2xl md:text-3xl font-bold text-emerald-600 mt-1">
              {loading ? "..." : filteredMembers.length}
            </p>
          </div>

          {/* Action Row Buttons */}
          <button
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 px-4 py-3 rounded-2xl font-bold text-sm shadow-[0_4px_20px_rgba(16,185,129,0.15)] transition-all cursor-pointer active:scale-[0.98]"
          >
            <FaFileExcel size={15} />
            <span>Export Excel</span>
          </button>

          <button
            onClick={() => { setEditingMemberId(null); setShowModal(true); }}
            className="flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-950 px-4 py-3 rounded-2xl font-bold text-sm shadow-[0_4px_20px_rgba(56,189,248,0.2)] transition-all cursor-pointer group active:scale-[0.98]"
          >
            <FaUserPlus className="transition-transform group-hover:scale-110" />
            <span>Add Member</span>
          </button>
        </div>

        {/* Filter Toolbar Area */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6 max-w-2xl">
          {/* Search Engine Input Component */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <FaSearch size={14} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, tribe, phone, role, dates..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-xs"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* ADDED: Compact Horizontal Pill Filters (Matches Attendance View Toggles) */}
          <div className="flex bg-slate-200/60 p-1 rounded-xl items-center self-start sm:self-auto overflow-x-auto max-w-full">
            {["All", "Member", "Minister", "Visitor"].map((roleType) => (
              <button
                key={roleType}
                type="button"
                onClick={() => setSelectedRoleFilter(roleType)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedRoleFilter === roleType
                    ? "bg-white text-blue-600 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {roleType}s
              </button>
            ))}
          </div>
        </div>

        {/* Table View Layout container */}
        <div className="bg-white/80 backdrop-blur border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              Syncing secure backend registry information...
            </div>
          ) : (
            <>
              {/* Desktop Roster Table View Layout */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Name</th>
                      <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Role</th>
                      <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Tribe</th>
                      <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Ministries</th>
                      <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Birthdate</th>
                      <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Age</th>
                      <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Contact Number</th>
                      <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Invited By</th>
                      <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Date Invited</th>
                      <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMembers.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="text-center py-12 text-slate-500 text-sm">
                          No records match your search criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredMembers.map((member) => (
                        <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-900">
                            {member.first_name}{member.middle_initial ? ` ${member.middle_initial}.` : ""} {member.last_name}
                          </td>
                          <td className="px-6 py-4 text-slate-700 font-medium">{member.role || "—"}</td>
                          <td className="px-6 py-4 text-slate-600 font-medium">{member.tribe || "—"}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1 max-w-[180px]">
                              {member.ministry ? (
                                member.ministry.split(", ").map((minItem) => (
                                  <span key={minItem} className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-medium border ${getMinistryBadge(minItem)}`}>
                                    {minItem}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-400 font-normal">—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-600">{formatDate(member.birthdate)}</td>
                          <td className="px-6 py-4 text-slate-600">{member.age || "—"}</td>
                          <td className="px-6 py-4 text-slate-600 font-mono text-xs">{member.number || "—"}</td>
                          <td className="px-6 py-4 text-slate-500 text-sm">{member.invited_by || "—"}</td>
                          <td className="px-6 py-4 text-slate-600">{formatDate(member.date_invited)}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => handleEditClick(member)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <FaEdit size={12} />
                              </button>
                              <button
                                onClick={() => handleDelete(member.id)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <FaTrashAlt size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* RE-ENGINEERED COMPACT MOBILE CARD ROW LAYOUT (Matches Attendance Layout Philosophy) */}
              <div className="md:hidden divide-y divide-slate-100 bg-white">
                {filteredMembers.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-sm">
                    No records match your search criteria.
                  </div>
                ) : (
                  filteredMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-all">
                      
                      {/* Left Side: Inline Content Cluster */}
                      <div className="flex flex-col space-y-1 min-w-0 flex-1 pr-3">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          {/* Main Name Heading */}
                          <h3 className="font-bold text-slate-900 text-[15px] truncate">
                            {member.first_name}{member.middle_initial ? ` ${member.middle_initial}.` : ""} {member.last_name}
                          </h3>
                          {/* Highlight Designation Badge */}
                          <span className="inline-block text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                            {member.role || "No Role"}
                          </span>
                        </div>

                        {/* Ministry Badges Inline Nested Row */}
                        {member.ministry && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {member.ministry.split(", ").map((minItem) => (
                              <span key={minItem} className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold border ${getMinistryBadge(minItem)}`}>
                                {minItem}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Inline Data Metrics (Conditional: Hides empty fields automatically to maximize space) */}
                        <div className="flex flex-wrap items-center text-xs text-slate-500 gap-x-2.5 gap-y-0.5 pt-0.5">
                          {member.tribe && (
                            <span className="flex items-center">
                              <span className="text-slate-400 font-medium mr-1">Tribe:</span>
                              <span className="text-slate-700 font-medium">{member.tribe}</span>
                            </span>
                          )}
                          {member.age && (
                            <span className="flex items-center before:content-['•'] before:mr-2 before:text-slate-300">
                              <span className="text-slate-400 font-medium mr-1">Age:</span>
                              <span className="text-slate-700">{member.age}</span>
                            </span>
                          )}
                          {member.number && (
                            <span className="flex items-center before:content-['•'] before:mr-2 before:text-slate-300">
                              <span className="text-slate-400 font-medium mr-1">Phone:</span>
                              <span className="text-slate-700 font-mono">{member.number}</span>
                            </span>
                          )}
                          {member.invited_by && (
                            <span className="flex items-center before:content-['•'] before:mr-2 before:text-slate-300">
                              <span className="text-slate-400 font-medium mr-1">Invited By:</span>
                              <span className="text-slate-700 italic">{member.invited_by}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right Side: Quick Clean Icon Action Buttons */}
                      <div className="flex items-center gap-1 flex-shrink-0 text-slate-400">
                        <button 
                          onClick={() => handleEditClick(member)}
                          className="p-2 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                          aria-label="Edit member"
                        >
                          <FaEdit size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(member.id)}
                          className="p-2 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                          aria-label="Delete member"
                        >
                          <FaTrashAlt size={13} />
                        </button>
                      </div>

                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Pop-up Form Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            onClick={closeModalAndResetForm}
          />
          <div className="relative bg-white w-full max-w-md rounded-xl shadow-lg overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingMemberId ? "Update Team Member" : "Register Team Member"}
                </h3>
              </div>
              <button
                onClick={closeModalAndResetForm}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
              >
                <FaTimes size={14} />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">First Name *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Juan"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">M.I.</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={middleInitial}
                    onChange={(e) => setMiddleInitial(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-900 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="D"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Dela Cruz"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tribe Designation</label>
                  <select
                    value={tribe}
                    onChange={(e) => setTribe(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Role Designation</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Role</option>
                    <option value="Member">Member</option>
                    <option value="Minister">Minister</option>
                    <option value="Visitor">Visitor</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Birthdate <span className="text-slate-400 font-normal normal-case">(YYYY/MM/DD)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={10}
                      value={birthdate}
                      onChange={(e) => handleDateTextChange(e.target.value, setBirthdate)}
                      className="w-full border border-slate-300 rounded-lg pl-4 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      placeholder="1975/05/12"
                    />
                    <button
                      type="button"
                      onClick={() => birthdateInputRef.current?.showPicker()}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-blue-500 cursor-pointer"
                    >
                      <FaCalendarAlt size={14} />
                    </button>
                    <input
                      type="date"
                      ref={birthdateInputRef}
                      value={birthdate && /^\d{4}\/\d{2}\/\d{2}$/.test(birthdate) ? birthdate.replace(/\//g, "-") : ""}
                      onChange={(e) => e.target.value && setBirthdate(e.target.value.replace(/-/g, "/"))}
                      className="absolute opacity-0 w-0 h-0 pointer-events-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Age Count</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="18"
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Contact Number</label>
                <input
                  type="text"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="09123456789"
                />
              </div>

              {/* Referral Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Invited By</label>
                  <input
                    type="text"
                    value={invitedBy}
                    onChange={(e) => setInvitedBy(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Leader Name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Date Invited <span className="text-slate-400 font-normal normal-case">(YYYY/MM/DD)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={10}
                      value={dateInvited}
                      onChange={(e) => handleDateTextChange(e.target.value, setDateInvited)}
                      className="w-full border border-slate-300 rounded-lg pl-4 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      placeholder="2025/11/24"
                    />
                    <button
                      type="button"
                      onClick={() => dateInvitedInputRef.current?.showPicker()}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-blue-500 cursor-pointer"
                    >
                      <FaCalendarAlt size={14} />
                    </button>
                    <input
                      type="date"
                      ref={dateInvitedInputRef}
                      value={dateInvited && /^\d{4}\/\d{2}\/\d{2}$/.test(dateInvited) ? dateInvited.replace(/\//g, "-") : ""}
                      onChange={(e) => e.target.value && setDateInvited(e.target.value.replace(/-/g, "/"))}
                      className="absolute opacity-0 w-0 h-0 pointer-events-none"
                    />
                  </div>
                </div>
              </div>

              {/* Ministry Categories Selection (Checkbox Grid Setup) */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Ministry Categories <span className="text-slate-400 font-normal normal-case">(Optional - Select all that apply)</span>
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 max-h-40 overflow-y-auto">
                  {[
                    { id: "Usher", label: "Usher" },
                    { id: "Multimedia", label: "Multimedia" },
                    { id: "Worship Team", label: "Worship Team" },
                    { id: "Marshall", label: "Marshall" },
                    { id: "DJ Team", label: "DJ Team" },
                    { id: "Finance Department", label: "Finance Department" },
                    { id: "Admin Department", label: "Admin Department" },
                    { id: "Mac Kids", label: "Children Ministry" },
                  ].map((item) => {
                    const isChecked = ministry ? ministry.split(", ").includes(item.id) : false;
                    return (
                      <label key={item.id} className="flex items-center gap-2.5 p-1.5 hover:bg-white rounded-md cursor-pointer transition-colors text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleMinistryCheckboxChange(item.id)}
                          className="rounded text-blue-600 focus:ring-blue-500 border-slate-300 w-4 h-4"
                        />
                        <span>{item.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={closeModalAndResetForm}
                  className="px-4 py-2.5 border border-slate-200 text-sm font-semibold rounded-xl text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-500 active:scale-95 transition-all shadow-xs"
                >
                  {editingMemberId ? "Save Modifications" : "Confirm Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}