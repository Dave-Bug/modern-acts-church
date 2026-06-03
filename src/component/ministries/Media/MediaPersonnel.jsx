import { useEffect, useState } from "react";
import { supabase } from "../../../Services/supabase";
import { FaHome } from "react-icons/fa";
import { Link } from "react-router-dom";

export default function MediaPersonnel() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    age: "",
    birthday: "",
    role: "",
    phone: "",
    email: "",
    photo_url: "",
  });

  const roles = [
    "Head",
    "Technical Director",
    "Camera Operator",
    "Video Editor",
    "Graphics Designer",
    "Livestream Operator",
    "Photographer",
    "Sound Engineer",
  ];

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("media_personnel")
      .select("*")
      .order("name");

    if (error) {
      console.error(error);
    } else {
      setMembers(data || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setForm({
      name: "",
      age: "",
      birthday: "",
      role: "",
      phone: "",
      email: "",
      photo_url: "",
    });
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      alert("Name is required");
      return;
    }

    if (editingId) {
      const { error } = await supabase
        .from("media_personnel")
        .update({
          name: form.name,
          age: form.age || null,
          birthday: form.birthday || null,
          role: form.role || null,
          phone: form.phone || null,
          email: form.email || null,
          photo_url: form.photo_url || null,
        })
        .eq("id", editingId);

      if (error) {
        alert(error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("media_personnel").insert([
        {
          name: form.name,
          age: form.age || null,
          birthday: form.birthday || null,
          role: form.role || null,
          phone: form.phone || null,
          email: form.email || null,
          photo_url: form.photo_url || null,
        },
      ]);

      if (error) {
        alert(error.message);
        return;
      }
    }

    resetForm();
    setShowForm(false);
    loadMembers();
  };

  const startEdit = (member) => {
    setForm({
      name: member.name || "",
      age: member.age || "",
      birthday: member.birthday || "",
      role: member.role || "",
      phone: member.phone || "",
      email: member.email || "",
      photo_url: member.photo_url || "",
    });
    setEditingId(member.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteMember = async (id) => {
    if (!window.confirm("Delete this member?")) return;

    const { error } = await supabase
      .from("media_personnel")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    loadMembers();
  };

  const getRoleColor = (role) => {
    const colors = {
      Head: "bg-purple-100 text-purple-800 border-purple-200",
      "Technical Director": "bg-blue-100 text-blue-800 border-blue-200",
      "Camera Operator": "bg-emerald-100 text-emerald-800 border-emerald-200",
      "Video Editor": "bg-rose-100 text-rose-800 border-rose-200",
      "Graphics Designer": "bg-pink-100 text-pink-800 border-pink-200",
      "Livestream Operator": "bg-cyan-100 text-cyan-800 border-cyan-200",
      Photographer: "bg-amber-100 text-amber-800 border-amber-200",
      "Sound Engineer": "bg-indigo-100 text-indigo-800 border-indigo-200",
    };
    return colors[role] || "bg-slate-100 text-slate-800 border-slate-200";
  };

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      {/* Back Button */}
      <div className="fixed top-4 left-4 z-50">
        <Link
          to="/Ministries/Media"
          className="flex items-center gap-2 bg-white/80 backdrop-blur border border-slate-200 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors"
        >
          <FaHome />
          Back
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10 md:py-14 pt-16">
        {/* Header */}
        <div className="text-center mb-8 md:mb-10">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-xl mx-auto mb-3">
            👥
          </div>
          <h1 className="text-3xl md:text-5xl font-black">
            Media <span className="text-blue-600">Personnel</span>
          </h1>
          <p className="text-slate-500 text-xs md:text-sm mt-2">
            Manage your Media Ministry team members
          </p>
        </div>

        {/* Add Member Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-black font-medium text-sm hover:bg-blue-700 transition-colors"
          >
            <span className="text-lg leading-none">+</span>
            Add Member
          </button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mb-8">
          <div className="bg-white/80 backdrop-blur border border-slate-200 rounded-xl p-4 md:p-5">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Members</p>
            <p className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">{members.length}</p>
          </div>
          <div className="bg-white/80 backdrop-blur border border-slate-200 rounded-xl p-4 md:p-5">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Roles Filled</p>
            <p className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">
              {new Set(members.map((m) => m.role).filter(Boolean)).size}
            </p>
          </div>
          <div className="bg-white/80 backdrop-blur border border-slate-200 rounded-xl p-4 md:p-5">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">With Photos</p>
            <p className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">
              {members.filter((m) => m.photo_url).length}
            </p>
          </div>
          <div className="bg-white/80 backdrop-blur border border-slate-200 rounded-xl p-4 md:p-5">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Leadership</p>
            <p className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">
              {members.filter((m) => m.role === "Head" || m.role === "Technical Director").length}
            </p>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white/80 backdrop-blur border border-slate-200 rounded-xl mb-8 overflow-hidden">
            <div className="bg-slate-900 px-6 py-4">
              <h2 className="text-lg font-bold text-white">
                {editingId ? "Edit Member" : "Add New Member"}
              </h2>
              <p className="text-slate-400 text-sm mt-0.5">
                {editingId ? "Update member information below" : "Fill in the details to add a new team member"}
              </p>
            </div>

            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. John Smith"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Age</label>
                  <input
                    type="number"
                    placeholder="e.g. 25"
                    value={form.age}
                    onChange={(e) => setForm({ ...form, age: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Birthday</label>
                  <input
                    type="date"
                    value={form.birthday}
                    onChange={(e) => setForm({ ...form, birthday: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a role...</option>
                    {roles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. +1 234 567 890"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. john@church.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Photo URL</label>
                  <input
                    type="url"
                    placeholder="https://example.com/photo.jpg"
                    value={form.photo_url}
                    onChange={(e) => setForm({ ...form, photo_url: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-slate-500">Leave empty to use a generated avatar</p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="px-6 py-2.5 rounded-lg bg-blue-600 text-black font-medium text-sm hover:bg-blue-700 transition-colors"
                >
                  Save Member
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="px-6 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-600 font-medium text-sm">Loading members...</p>
          </div>
        ) : members.length === 0 ? (
          /* Empty State */
          <div className="bg-white/80 backdrop-blur border border-slate-200 rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-3xl">
              👥
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">No team members yet</h2>
            <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
              Get started by adding your first Media Ministry team member to the roster.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-black px-6 py-2.5 rounded-xl font-medium text-sm transition-colors"
            >
              Add First Member
            </button>
          </div>
        ) : (
          /* Members Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
            {members.map((member) => (
              <div
                key={member.id}
                className="bg-white/80 backdrop-blur border border-slate-200 rounded-xl p-4 md:p-5 hover:shadow-md hover:-translate-y-1 transition-all duration-300"
              >
                {/* Avatar & Name */}
                <div className="flex items-center gap-3 mb-4">
                  {member.photo_url ? (
                    <img
                      src={member.photo_url}
                      alt={member.name}
                      className="w-14 h-14 rounded-xl object-cover bg-slate-100 flex-shrink-0"
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    className={`w-14 h-14 rounded-xl items-center justify-center text-lg font-bold text-white bg-slate-700 flex-shrink-0 ${
                      member.photo_url ? "hidden" : "flex"
                    }`}
                  >
                    {getInitials(member.name)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 truncate">{member.name}</h3>
                    {member.role && (
                      <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getRoleColor(member.role)}`}>
                        {member.role}
                      </span>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2.5 mb-4">
                  {member.age && (
                    <div className="flex items-center gap-2.5 text-sm text-slate-600">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-500">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <span className="text-xs">{member.age} years old</span>
                    </div>
                  )}

                  {member.birthday && (
                    <div className="flex items-center gap-2.5 text-sm text-slate-600">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-500">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span className="text-xs">
                        {new Date(member.birthday).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  )}

                  {member.phone && (
                    <div className="flex items-center gap-2.5 text-sm text-slate-600">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-500">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <a href={`tel:${member.phone}`} className="text-xs hover:text-blue-600 transition-colors">
                        {member.phone}
                      </a>
                    </div>
                  )}

                  {member.email && (
                    <div className="flex items-center gap-2.5 text-sm text-slate-600">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-500">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <a href={`mailto:${member.email}`} className="text-xs hover:text-blue-600 transition-colors truncate">
                        {member.email}
                      </a>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => startEdit(member)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg font-medium text-xs transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={() => deleteMember(member.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 py-2 rounded-lg font-medium text-xs transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}