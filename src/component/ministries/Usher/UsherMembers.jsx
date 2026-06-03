
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaHome, FaUserPlus, FaTimes, FaTrashAlt, FaEdit, FaSearch } from "react-icons/fa";
import { Link } from "react-router-dom";
import { supabase } from "../../../Services/supabase"; // Adjust this path to your Supabase client setup

export default function UsherDashboard() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search state query configuration
  const [searchQuery, setSearchQuery] = useState("");
  
  // Track if we are editing an existing member (holds their ID) or adding a new one (null)
  const [editingMemberId, setEditingMemberId] = useState(null);

  // Form States explicit tracking
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [tribe, setTribe] = useState("");
  const [ministry, setMinistry] = useState("Usher");
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

  // Helper to safely reset form variables and close the modal cleanly
  const closeModalAndResetForm = () => {
    setEditingMemberId(null);
    setFirstName("");
    setLastName("");
    setBirthdate("");
    setTribe("");
    setMinistry("Usher");
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
    setLastName(member.last_name || "");
    setTribe(member.tribe || "");
    setMinistry(member.ministry || "Usher");
    setAge(member.age ? member.age.toString() : "");
    setNumber(member.number || "");
    setInvitedBy(member.invited_by || "");
    setDateInvited(member.date_invited || "");
    setBirthdate(member.birthdate || "");
    setShowModal(true);
  };

  // UNIFIED ADD / EDIT SAVING MUTATION
  const handleSaveMember = async (e) => {
    e.preventDefault();
    if (!firstName || !lastName || !ministry) return alert("Please fill out required fields.");

    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      tribe: tribe || null,
      birthdate: birthdate || null,
      ministry,
      age: age ? parseInt(age) : null,
      number: number || null,
      invited_by: invitedBy || null,
      date_invited: dateInvited || null,
    };

    try {
      if (editingMemberId) {
        // --- EDIT MODE MUTATION ---
        const { error } = await supabase
          .from("usher_members")
          .update(payload)
          .eq("id", editingMemberId);

        if (error) throw error;
      } else {
        // --- ADD MODE MUTATION ---
        const { error } = await supabase
          .from("usher_members")
          .insert([payload]);

        if (error) throw error;
      }

      // Refresh list and clear states
      fetchMembers();
      closeModalAndResetForm();
    } catch (err) {
      console.error("Error saving record:", err);
      alert(`Database Error: ${err.message || err.details || "Failed to finalize row configuration entry."}`);
    }
  };

  // DELETE MEMBER MUTATION
  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to remove this member from the usher team?")) return;

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

  const getRoleBadge = (role) => {
    const colors = {
      "Multimedia": "bg-purple-100 text-purple-700 border-purple-200",
      "Worship Team": "bg-sky-100 text-sky-700 border-sky-200",
      "Marshall": "bg-slate-100 text-slate-700 border-slate-200",
      "DJ Team": "bg-amber-100 text-amber-700 border-amber-200",
      "Finance Department": "bg-amber-100 text-amber-700 border-amber-200",
      "Admin Department": "bg-amber-100 text-amber-700 border-amber-200",
      "Mac Kids": "bg-amber-100 text-amber-700 border-amber-200",
    };
    return colors[role] || "bg-slate-100 text-slate-700 border-slate-200";
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // ALL-FIELDS FILTER ENGINE
  const filteredMembers = members.filter((member) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    // String field combinations
    const fullName = `${member.first_name || ""} ${member.last_name || ""}`.toLowerCase();
    const tribeName = (member.tribe || "").toLowerCase();
    const ministryRole = (member.ministry || "").toLowerCase();
    const ageValue = member.age ? member.age.toString() : "";
    const phoneNumber = (member.number || "").toLowerCase();
    const inviter = (member.invited_by || "").toLowerCase();
    
    // Date string combinations
    const bdayText = member.birthdate ? formatDate(member.birthdate).toLowerCase() : "";
    const inviteDateText = member.date_invited ? formatDate(member.date_invited).toLowerCase() : "";

    return (
      fullName.includes(query) ||
      tribeName.includes(query) ||
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

        {/* Stats + Add Button Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5 mb-6">
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
          <button
            onClick={() => { setEditingMemberId(null); setShowModal(true); }}
            className="flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-950 px-5 py-3 rounded-2xl font-bold text-sm shadow-[0_4px_20px_rgba(56,189,248,0.2)] transition-all cursor-pointer group active:scale-[0.98] col-span-2 md:col-span-1"
          >
            <FaUserPlus className="transition-transform group-hover:scale-110" />
            <span>Add New Member</span>
          </button>
        </div>

        {/* Unified Search Filter Input Component */}
        <div className="mb-6 relative max-w-md">
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

        {/* Members List - Mobile Cards / Desktop Table */}
        <div className="bg-white/80 backdrop-blur border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              Syncing secure backend registry information...
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Name</th>
                      <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Tribe</th>
                      <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Role / Ministry</th>
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
                        <td colSpan="9" className="text-center py-12 text-slate-500 text-sm">
                          {members.length === 0 ? "No members found. Click 'Add Member' to get started." : "No records match your search criteria."}
                        </td>
                      </tr>
                    ) : (
                      filteredMembers.map((member) => (
                        <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-900">
                            {member.first_name} {member.last_name}
                          </td>
                          <td className="px-6 py-4 text-slate-600 font-medium">{member.tribe || "—"}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium border ${getRoleBadge(member.ministry)}`}>
                              {member.ministry}
                            </span>
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

              {/* Mobile Device Cards View */}
              <div className="md:hidden divide-y divide-slate-100">
                {filteredMembers.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-sm">
                    {members.length === 0 ? "No members found. Tap 'Add Member' to get started." : "No records match your search criteria."}
                  </div>
                ) : (
                  filteredMembers.map((member) => (
                    <div key={member.id} className="p-4 hover:bg-slate-50/50 transition-colors space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-slate-900 text-sm">
                            {member.first_name} {member.last_name}
                          </h3>
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${getRoleBadge(member.ministry)}`}>
                            {member.ministry}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => handleEditClick(member)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <FaEdit size={11} />
                          </button>
                          <button
                            onClick={() => handleDelete(member.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <FaTrashAlt size={11} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-xs text-slate-500 pt-1">
                        <div><span className="font-medium text-slate-400">Tribe:</span> {member.tribe || "—"}</div>
                        <div><span className="font-medium text-slate-400">Age:</span> {member.age || "—"}</div>
                        <div className="col-span-2"><span className="font-medium text-slate-400">Birthdate:</span> {formatDate(member.birthdate)}</div>
                        <div className="col-span-2"><span className="font-medium text-slate-400">Phone:</span> {member.number || "—"}</div>
                        <div><span className="font-medium text-slate-400">Invited By:</span> {member.invited_by || "—"}</div>
                        <div><span className="font-medium text-slate-400">Invited Date:</span> {formatDate(member.date_invited)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Dynamic Pop-up Entry Modal Form */}
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
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingMemberId ? "Modify record metrics securely" : "Add record configuration metrics"}
                </p>
              </div>
              <button
                onClick={closeModalAndResetForm}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
              >
                <FaTimes size={14} />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="p-6 space-y-4">
              {/* Split Name Block row configuration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Juan"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Dela Cruz"
                  />
                </div>
              </div>

              {/* Form entries layout tracking */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Tribe Designation
                  </label>
                  <input
                    type="text"
                    value={tribe}
                    onChange={(e) => setTribe(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Samuel"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Birthdate
                  </label>
                  <input
                    type="date"
                    value={birthdate}
                    onChange={(e) => setBirthdate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Age Count
                  </label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="18"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Ministry Role / Category
                </label>
                <select
                  value={ministry}
                  onChange={(e) => setMinistry(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Usher">Usher</option>
                  <option value="Multimedia">Multimedia</option>
                  <option value="Worship Team">Worship Team</option>
                  <option value="Marshall">Marshall</option>
                  <option value="DJ Team">DJ Team</option>
                  <option value="Finance Department">Finance Department</option>
                  <option value="Admin Department">Admin Department</option>
                  <option value="Mac Kids">Mac Kids</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Contact Number
                </label>
                <input
                  type="text"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 0917XXXXXXX"
                />
              </div>

              {/* Invitation Row Group */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Invited By
                  </label>
                  <input
                    type="text"
                    value={invitedBy}
                    onChange={(e) => setInvitedBy(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Who invited them?"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Date Invited
                  </label>
                  <input
                    type="date"
                    value={dateInvited}
                    onChange={(e) => setDateInvited(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModalAndResetForm}
                  className="w-1/2 bg-white border border-slate-300 text-slate-700 py-2.5 rounded-lg font-medium text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-blue-600 hover:bg-blue-700 font-bold text-sm rounded-lg transition-colors shadow-sm"
                >
                  {editingMemberId ? "Update Changes" : "Save Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

