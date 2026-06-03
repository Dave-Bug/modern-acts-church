
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaHome, FaPlus, FaWallet, FaArrowDown, FaArrowUp, FaSpinner, FaHistory, FaUser, FaPiggyBank } from "react-icons/fa";
import { supabase } from "../../Services/supabase";

export default function Finance() {
  const [transactions, setTransactions] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // New transaction input state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    transaction_type: "Income",
    category: "Tithes",
    amount: "",
    description: "",
    member_id: ""
  });

  // Track editing row variables
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  useEffect(() => {
    if (formData.transaction_type === "Expense") {
      setFormData(prev => ({ ...prev, category: "Expenses", member_id: "" }));
    } else {
      setFormData(prev => ({ ...prev, category: "Tithes" }));
    }
  }, [formData.transaction_type]);

  useEffect(() => {
    fetchFinancialData();
  }, []);

  async function fetchFinancialData() {
    try {
      setLoading(true);
      const { data: ledger, error: ledgerErr } = await supabase
        .from("church_finance")
        .select("*")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (ledgerErr) throw ledgerErr;
      setTransactions(ledger || []);

      const { data: roster, error: rosterErr } = await supabase
        .from("usher_members")
        .select("id, first_name, last_name")
        .order("first_name", { ascending: true });
      if (rosterErr) throw rosterErr;
      setMembers(roster || []);
    } catch (err) {
      console.error("Error:", err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmitTransaction = async (e) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert("Please specify a valid amount.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        date: formData.date,
        transaction_type: formData.transaction_type,
        category: formData.category,
        amount: parseFloat(formData.amount),
        description: formData.description || null,
        member_id: formData.member_id ? parseInt(formData.member_id) : null
      };

      const { error } = await supabase.from("church_finance").insert([payload]);
      if (error) throw error;

      setFormData({
        date: new Date().toISOString().split("T")[0],
        transaction_type: "Income",
        category: "Tithes",
        amount: "",
        description: "",
        member_id: ""
      });

      await fetchFinancialData();
      alert("Entry saved!");
    } catch (err) {
      console.error(err);
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTransaction = async (id) => {
    if (!editFormData.amount || parseFloat(editFormData.amount) <= 0) {
      alert("Please specify a valid amount.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        date: editFormData.date,
        transaction_type: editFormData.transaction_type,
        category: editFormData.category,
        amount: parseFloat(editFormData.amount),
        description: editFormData.description || null,
        member_id: editFormData.member_id ? parseInt(editFormData.member_id) : null
      };

      const { error } = await supabase
        .from("church_finance")
        .update(payload)
        .eq("id", id);

      if (error) throw error;

      setEditingId(null);
      await fetchFinancialData();
      alert("Entry updated successfully!");
    } catch (err) {
      console.error(err);
      alert(`Update Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const metrics = transactions.reduce((acc, item) => {
    const amt = parseFloat(item.amount || 0);
    if (item.transaction_type === "Income") {
      acc.totalIncome += amt;
      if (item.category === "Tithes") acc.tithes += amt;
      if (item.category === "Basket") acc.basket += amt;
      if (item.category === "Pledge") acc.pledge += amt;
    } else if (item.transaction_type === "Expense") {
      acc.totalExpenses += amt;
    }
    return acc;
  }, { totalIncome: 0, totalExpenses: 0, tithes: 0, basket: 0, pledge: 0 });

  const netCashOnHand = metrics.totalIncome - metrics.totalExpenses;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value || 0);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const getMemberName = (id) => {
    const match = members.find(m => m.id === parseInt(id));
    return match ? `${match.first_name} ${match.last_name}` : "General";
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900 antialiased overflow-x-hidden">
      {/* Back Navigation Button */}
      <div className="fixed top-4 left-4 z-50">
        <Link
          to="/ministries/usher"
          className="flex items-center gap-2 bg-white/90 backdrop-blur border border-slate-200 px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors shadow-xs"
        >
          <FaHome className="text-base" /> Back
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8 pt-16">
        {/* Core Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-4xl font-black tracking-tight">
            Finance <span className="text-blue-600">Ledger</span>
          </h1>
        </div>

        {/* --- ADJUSTED METRICS SYSTEM (NO SCROLLBARS) --- */}
        <div className="space-y-2 mb-4">
          {/* Main Hero Card: Net Cash on Hand */}
          <div className="bg-blue-600 text-white rounded-xl p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-200 flex items-center gap-1.5">
              <FaWallet /> Net Cash on Hand
            </p>
            <p className="text-xl md:text-3xl font-black mt-0.5 tracking-tight">{formatCurrency(netCashOnHand)}</p>
          </div>

          {/* Row 1: Total Income and Total Expense Side-by-Side */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
              <p className="text-[11px] font-bold uppercase text-slate-400 flex items-center gap-1">
                <FaArrowUp className="text-emerald-500" /> Total Income
              </p>
              <p className="text-base md:text-xl font-black text-emerald-600 mt-0.5 truncate">{formatCurrency(metrics.totalIncome)}</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
              <p className="text-[11px] font-bold uppercase text-slate-400 flex items-center gap-1">
                <FaArrowDown className="text-rose-500" /> Total Expense
              </p>
              <p className="text-base md:text-xl font-black text-rose-600 mt-0.5 truncate">{formatCurrency(metrics.totalExpenses)}</p>
            </div>
          </div>

          {/* Row 2: Tithes, Basket, and Pledge Breakdown underneath */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs">
              <p className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1 truncate">
                <FaPiggyBank className="text-blue-500 text-[10px] hidden sm:inline" /> Tithes
              </p>
              <p className="text-sm md:text-base font-black text-slate-900 mt-0.5 truncate">{formatCurrency(metrics.tithes)}</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs">
              <p className="text-[10px] font-bold uppercase text-slate-400 truncate">Basket</p>
              <p className="text-sm md:text-base font-black text-slate-900 mt-0.5 truncate">{formatCurrency(metrics.basket)}</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs">
              <p className="text-[10px] font-bold uppercase text-slate-400 truncate">Pledge</p>
              <p className="text-sm md:text-base font-black text-slate-900 mt-0.5 truncate">{formatCurrency(metrics.pledge)}</p>
            </div>
          </div>
        </div>

        {/* --- MAIN OPERATIONAL SECTION --- */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          
          {/* Form Column */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2 border-b border-slate-100 pb-1.5">
                <FaPlus className="text-blue-500" /> New Entry Details
              </h3>

              <form onSubmit={handleSubmitTransaction} className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Type</label>
                    <select
                      value={formData.transaction_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, transaction_type: e.target.value }))}
                      className="w-full border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="Income">Income</option>
                      <option value="Expense">Expense</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      {formData.transaction_type === "Income" ? (
                        <>
                          <option value="Tithes">Tithes</option>
                          <option value="Basket">Basket</option>
                          <option value="Pledge">Pledge</option>
                        </>
                      ) : (
                        <option value="Expenses">Expenses</option>
                      )}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Amount (₱)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      required
                      value={formData.amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-2 text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Date</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                {formData.transaction_type === "Income" && (formData.category === "Tithes" || formData.category === "Pledge") && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Contributor Reference</label>
                    <select
                      value={formData.member_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, member_id: e.target.value }))}
                      className="w-full border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">General / Anonymous</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Notes / Description</label>
                  <input
                    type="text"
                    placeholder="Brief description..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || submitting}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 font-bold py-2.5 px-4 rounded-xl transition-all text-sm shadow-xs cursor-pointer mt-1 focus:outline-none"
                >
                  {submitting ? <FaSpinner className="animate-spin text-base" /> : <FaPlus className="text-xs" />}
                  <span>Save Record Entry</span>
                </button>
              </form>
            </div>
          </div>

          {/* History Column */}
          <div className="lg:col-span-3">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <FaHistory className="text-slate-400" /> Recent Activity (Max 5)
                </h3>
                <span className="text-[11px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-bold">
                  {transactions.length} Total Logs
                </span>
              </div>

              {loading && transactions.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <FaSpinner className="animate-spin text-blue-500 mr-2 text-base" />
                  <span className="text-sm text-slate-500 font-medium">Loading ledger data...</span>
                </div>
              ) : transactions.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-slate-400 font-medium">No recorded transactions found.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {transactions.slice(0, 5).map((tx) => {
                    const isEditing = tx.id === editingId;
                    const isIncome = isEditing ? editFormData.transaction_type === "Income" : tx.transaction_type === "Income";

                    if (isEditing) {
                      return (
                        <div key={tx.id} className="p-3.5 bg-blue-50/50 border-l-4 border-blue-500 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] font-bold text-slate-500 uppercase">Type</label>
                              <select
                                value={editFormData.transaction_type}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditFormData(prev => ({
                                    ...prev,
                                    transaction_type: val,
                                    category: val === "Expense" ? "Expenses" : "Tithes",
                                    member_id: val === "Expense" ? "" : prev.member_id
                                  }));
                                }}
                                className="w-full border border-slate-200 bg-white rounded-md px-2 py-1 text-xs font-semibold"
                              >
                                <option value="Income">Income</option>
                                <option value="Expense">Expense</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-slate-500 uppercase">Category</label>
                              <select
                                value={editFormData.category}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, category: e.target.value }))}
                                className="w-full border border-slate-200 bg-white rounded-md px-2 py-1 text-xs font-semibold"
                              >
                                {editFormData.transaction_type === "Income" ? (
                                  <>
                                    <option value="Tithes">Tithes</option>
                                    <option value="Basket">Basket</option>
                                    <option value="Pledge">Pledge</option>
                                  </>
                                ) : (
                                  <option value="Expenses">Expenses</option>
                                )}
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] font-bold text-slate-500 uppercase">Amount (₱)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={editFormData.amount}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, amount: e.target.value }))}
                                className="w-full border border-slate-200 bg-white rounded-md px-2 py-1 text-xs font-bold"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-slate-500 uppercase">Date</label>
                              <input
                                type="date"
                                value={editFormData.date}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, date: e.target.value }))}
                                className="w-full border border-slate-200 bg-white rounded-md px-2 py-1 text-xs font-semibold"
                              />
                            </div>
                          </div>

                          {editFormData.transaction_type === "Income" && (editFormData.category === "Tithes" || editFormData.category === "Pledge") && (
                            <div>
                              <label className="text-[9px] font-bold text-slate-500 uppercase">Contributor</label>
                              <select
                                value={editFormData.member_id || ""}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, member_id: e.target.value }))}
                                className="w-full border border-slate-200 bg-white rounded-md px-2 py-1 text-xs"
                              >
                                <option value="">General / Anonymous</option>
                                {members.map(m => (
                                  <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          <div>
                            <label className="text-[9px] font-bold text-slate-500 uppercase">Notes</label>
                            <input
                              type="text"
                              value={editFormData.description || ""}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                              className="w-full border border-slate-200 bg-white rounded-md px-2 py-1 text-xs"
                            />
                          </div>

                          <div className="flex justify-end gap-1.5 pt-1">
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => setEditingId(null)}
                              className="px-2.5 py-1 text-[11px] font-bold bg-slate-200 text-slate-700 rounded hover:bg-slate-300 disabled:opacity-50 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => handleUpdateTransaction(tx.id)}
                              className="px-2.5 py-1 text-[11px] font-bold bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                            >
                              {submitting && <FaSpinner className="animate-spin text-[9px]" />}
                              Save
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={tx.id} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-50/50 transition-colors">
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold text-slate-400 tracking-wider">
                              {formatDate(tx.date)}
                            </span>
                            <span className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.25 rounded border ${
                              isIncome 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}>
                              {tx.category}
                            </span>
                          </div>
                          
                          <p className="text-xs font-semibold text-slate-800 truncate max-w-[150px] sm:max-w-xs">
                            {tx.description || <span className="text-slate-300 italic">No notes linked</span>}
                          </p>
                          
                          {tx.member_id && (
                            <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                              <FaUser className="w-2 h-2 text-slate-300" /> {getMemberName(tx.member_id)}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-right flex-shrink-0">
                          <div className="flex flex-col items-end">
                            <span className={`text-sm font-bold tracking-tight ${isIncome ? "text-emerald-600" : "text-slate-900"}`}>
                              {isIncome ? "+" : "-"}{formatCurrency(tx.amount)}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(tx.id);
                                setEditFormData({ ...tx });
                              }}
                              className="text-[10px] text-blue-500 font-bold hover:underline cursor-pointer"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

