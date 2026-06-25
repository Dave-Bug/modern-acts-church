import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaHome, FaPlus, FaWallet, FaArrowDown, FaArrowUp, FaSpinner, FaHistory, FaUser, FaPiggyBank, FaListUl, FaHandHoldingUsd, FaPrayingHands, FaCheckCircle, FaTimes, FaChartBar, FaCalendarAlt } from "react-icons/fa";
import { supabase } from "../../../Services/supabase";
import { useNavigate } from "react-router-dom";

const getCurrentMonthString = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
};

const getCurrentYear = () => new Date().getFullYear().toString();

export default function Finance() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [reportView, setReportView] = useState("monthly");
  const [selectedReportMonth, setSelectedReportMonth] = useState(getCurrentMonthString());

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  const [quickAmount, setQuickAmount] = useState("");
  const [quickCategory, setQuickCategory] = useState("Offering");
  const [quickDate, setQuickDate] = useState(new Date().toISOString().split('T')[0]); 
  const [quickDescription, setQuickDescription] = useState("");
  const [quickSubmitting, setQuickSubmitting] = useState(false);
  const [quickExistingId, setQuickExistingId] = useState(null);

  useEffect(() => {
    fetchFinancialData();
  }, []);

  // Auto-check for existing record when category, date, or transactions change
  useEffect(() => {
    checkExistingQuickAdd();
  }, [quickCategory, quickDate, transactions]);

  function checkExistingQuickAdd() {
    const dbCategory = quickCategory === "Offering" ? "Basket" : quickCategory;

    const existing = transactions.find(t => 
      t.date === quickDate && 
      t.transaction_type === "Income" &&
      t.category === dbCategory
    );

    if (existing) {
      setQuickAmount(existing.amount.toString());
      setQuickDescription(existing.description || quickCategory);
      setQuickExistingId(existing.id);
    } else {
      setQuickAmount("");
      setQuickDescription("");
      setQuickExistingId(null);
    }
  }

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
        .select("id, first_name, last_name, bindedto, is_tither, is_pledger, gross")
        .order("first_name", { ascending: true });
      if (rosterErr) throw rosterErr;
      setMembers(roster || []);
    } catch (err) {
      console.error("Error:", err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickAmount || parseFloat(quickAmount) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    try {
      setQuickSubmitting(true);
      const dbCategory = quickCategory === "Offering" ? "Basket" : quickCategory;

      const payload = {
        date: quickDate,
        transaction_type: "Income",
        category: dbCategory,
        amount: parseFloat(quickAmount),
        description: quickDescription || quickCategory,
        member_id: null
      };

      if (quickExistingId) {
        // UPDATE existing record
        const { error } = await supabase
          .from("church_finance")
          .update(payload)
          .eq("id", quickExistingId);
        if (error) throw error;
        setSuccessMessage(`Updated ${quickCategory} to ${formatCurrency(parseFloat(quickAmount))}`);
      } else {
        // INSERT new record
        const { error } = await supabase
          .from("church_finance")
          .insert([payload]);
        if (error) throw error;
        setSuccessMessage(`Added ${formatCurrency(parseFloat(quickAmount))} to ${quickCategory}`);
      }

      setShowSuccessModal(true);
      await fetchFinancialData();
    } catch (err) {
      console.error(err);
      alert(`Error: ${err.message}`);
    } finally {
      setQuickSubmitting(false);
    }
  };

  const getPartner = (memberId) => {
    if (!memberId) return null;
    const member = members.find(m => String(m.id) === String(memberId));
    if (!member || !member.bindedto) return null;
    return members.find(m => String(m.id) === String(member.bindedto)) || null;
  };

  const isSecondaryMember = (memberId) => {
    if (!memberId) return false;
    const member = members.find(m => String(m.id) === String(memberId));
    if (!member || !member.bindedto) return false;
    return parseInt(member.id) > parseInt(member.bindedto);
  };

  const currentYear = selectedReportMonth.split('-')[0];
  const monthPrefix = selectedReportMonth;
  const yearPrefix = currentYear;

  const isInPeriod = (date) => {
    if (reportView === "monthly") return date.startsWith(monthPrefix);
    return date.startsWith(yearPrefix + '-');
  };

  const activeTithers = members.filter(m => m.is_tither === true);
  const titheTransactions = transactions.filter(t => {
    const cat = (t.category || "").toLowerCase();
    return (cat === "tithes" || cat === "tithe") && isInPeriod(t.date);
  });

  const getTitheSummary = () => {
    const processed = new Set();
    let metCount = 0;
    let withRecordsCount = 0;
    let totalAmount = 0;

    activeTithers.forEach(m => {
      const mid = String(m.id);
      if (processed.has(mid)) return;

      const partner = getPartner(m.id);
      const targetGross = parseFloat(m.gross || 0);

      if (partner) {
        processed.add(mid);
        processed.add(String(partner.id));
        const primary = parseInt(mid) < parseInt(partner.id) ? m : partner;
        const secondary = parseInt(mid) < parseInt(partner.id) ? partner : m;
        const primaryGross = parseFloat(primary.gross || 0);
        const primaryTx = titheTransactions.filter(t => String(t.member_id) === String(primary.id));
        const secondaryTx = titheTransactions.filter(t => String(t.member_id) === String(secondary.id));
        const dateAmountMap = new Map();
        [...primaryTx, ...secondaryTx].forEach(t => {
          const key = `${t.date}_${t.amount}`;
          if (!dateAmountMap.has(key)) dateAmountMap.set(key, parseFloat(t.amount || 0));
        });
        let pairTotal = 0;
        dateAmountMap.forEach(amt => { pairTotal += amt; });
        if (pairTotal > 0) withRecordsCount++;
        if (primaryGross > 0 && pairTotal >= primaryGross) metCount++;
        totalAmount += pairTotal;
      } else {
        processed.add(mid);
        const memberTx = titheTransactions.filter(t => String(t.member_id) === mid);
        const memberTotal = memberTx.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        if (memberTotal > 0) withRecordsCount++;
        if (targetGross > 0 && memberTotal >= targetGross) metCount++;
        totalAmount += memberTotal;
      }
    });

    return { totalActive: activeTithers.length, withRecords: withRecordsCount, metGoal: metCount, totalAmount };
  };

  const offeringTransactions = transactions.filter(t => {
    const cat = (t.category || "").toLowerCase();
    return (cat === "offering" || cat === "basket" || cat.includes("offering") || cat.includes("basket")) && isInPeriod(t.date);
  });
  const offeringSummary = {
    recordCount: offeringTransactions.length,
    totalAmount: offeringTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
  };

  const activePledgers = members.filter(m => m.is_pledger === true);
  const pledgeTransactions = transactions.filter(t => {
    const cat = (t.category || "").toLowerCase();
    return (cat === "pledge" || cat.includes("pledge")) && isInPeriod(t.date);
  });

  const getPledgeSummary = () => {
    const processed = new Set();
    let withRecordsCount = 0;
    let totalAmount = 0;

    activePledgers.forEach(m => {
      const mid = String(m.id);
      if (processed.has(mid)) return;
      const partner = getPartner(m.id);
      if (partner) {
        processed.add(mid);
        processed.add(String(partner.id));
        const primary = parseInt(mid) < parseInt(partner.id) ? m : partner;
        const secondary = parseInt(mid) < parseInt(partner.id) ? partner : m;
        const primaryTx = pledgeTransactions.filter(t => String(t.member_id) === String(primary.id));
        const secondaryTx = pledgeTransactions.filter(t => String(t.member_id) === String(secondary.id));
        const dateAmountMap = new Map();
        [...primaryTx, ...secondaryTx].forEach(t => {
          const key = `${t.date}_${t.amount}`;
          if (!dateAmountMap.has(key)) dateAmountMap.set(key, parseFloat(t.amount || 0));
        });
        let pairTotal = 0;
        dateAmountMap.forEach(amt => { pairTotal += amt; });
        if (pairTotal > 0) withRecordsCount++;
        totalAmount += pairTotal;
      } else {
        processed.add(mid);
        const memberTx = pledgeTransactions.filter(t => String(t.member_id) === mid);
        const memberTotal = memberTx.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        if (memberTotal > 0) withRecordsCount++;
        totalAmount += memberTotal;
      }
    });

    return { totalActive: activePledgers.length, withRecords: withRecordsCount, totalAmount };
  };

  const titheSummary = getTitheSummary();
  const pledgeSummary = getPledgeSummary();

  const handleUpdateTransaction = async (id) => {
    if (!editFormData.amount || parseFloat(editFormData.amount) <= 0) {
      alert("Please specify a valid amount.");
      return;
    }
    try {
      setSubmitting(true);
      const amount = parseFloat(editFormData.amount);
      const memberId = editFormData.member_id ? parseInt(editFormData.member_id) : null;
      const payload = {
        date: editFormData.date,
        transaction_type: editFormData.transaction_type,
        category: editFormData.category,
        amount,
        description: editFormData.description || null,
        member_id: memberId
      };
      const { error } = await supabase.from("church_finance").update(payload).eq("id", id);
      if (error) throw error;

      if (memberId && (editFormData.category === "Tithes" || editFormData.category === "Pledge")) {
        const member = members.find(m => m.id === memberId);
        const partner = member?.bindedto ? members.find(m => String(m.id) === String(member.bindedto)) : null;
        if (partner) {
          const { data: partnerRecord, error: findErr } = await supabase
            .from("church_finance").select("*")
            .eq("member_id", partner.id).eq("date", editFormData.date)
            .eq("category", editFormData.category).maybeSingle();
          if (findErr) throw findErr;
          const partnerPayload = { ...payload, member_id: partner.id };
          if (partnerRecord) {
            const { error: updErr } = await supabase.from("church_finance").update(partnerPayload).eq("id", partnerRecord.id);
            if (updErr) throw updErr;
          } else {
            const { error: insErr } = await supabase.from("church_finance").insert([partnerPayload]);
            if (insErr) throw insErr;
          }
        }
      }

      setEditingId(null);
      setSuccessMessage("Entry updated successfully!");
      setShowSuccessModal(true);
    } catch (err) {
      console.error(err);
      alert(`Update Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const metrics = transactions.reduce((acc, item) => {
    const amt = parseFloat(item.amount || 0);
    const cat = (item.category || "").trim();
    const catLower = cat.toLowerCase();
    if (item.member_id && (catLower === "tithes" || catLower === "tithe" || catLower === "pledge" || catLower.includes("pledge"))) {
      if (isSecondaryMember(item.member_id)) return acc;
    }
    if (item.transaction_type === "Income") {
      acc.totalIncome += amt;
      if (catLower === "tithes" || catLower === "tithe") acc.tithes += amt;
      else if (catLower === "pledge" || catLower.includes("pledge")) acc.pledge += amt;
      else acc.offering += amt;
    } else if (item.transaction_type === "Expense") {
      acc.totalExpenses += amt;
    }
    return acc;
  }, { totalIncome: 0, totalExpenses: 0, tithes: 0, offering: 0, pledge: 0 });

  const netCashOnHand = metrics.totalIncome - metrics.totalExpenses;

  const formatCurrency = (value) => new Intl.NumberFormat("en-PH", {
    style: "currency", currency: "PHP",
    minimumFractionDigits: 2, maximumFractionDigits: 2
  }).format(value || 0);

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString("en-PH", {
    month: "short", day: "numeric", year: "numeric"
  });

  const getMemberName = (id) => {
    if (!id) return null;
    const match = members.find(m => m.id === parseInt(id));
    return match ? `${match.first_name} ${match.last_name}` : null;
  };

  return (
    <div className="min-h-screen w-full bg-[#f5f7fb] text-slate-900 antialiased overflow-x-hidden">

      {/* SUCCESS MODAL */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-xs w-full p-5 text-center">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <FaCheckCircle className="text-emerald-600 text-lg" />
            </div>
            <h3 className="font-black text-slate-900 text-base mb-1">Success!</h3>
            <p className="text-xs text-slate-500 mb-4">{successMessage}</p>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowSuccessModal(false); fetchFinancialData(); }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 font-bold py-2 rounded-xl text-xs transition-all"
              >
                Refresh
              </button>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl text-xs transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back Navigation */}
      <div className="fixed top-3 left-3 z-50">
        <Link
          to="/ministries"
          className="flex items-center gap-1.5 bg-white/80 backdrop-blur border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-blue-600 transition-colors shadow-sm"
        >
          <FaHome /><span className="hidden sm:inline">Back</span>
        </Link>
      </div>

      <div className="w-full max-w-5xl mx-auto px-3 sm:px-4 py-5 pt-14 sm:pt-9">

        {/* Header */}
        <div className="text-center mb-5">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight">
            Finance <span className="text-blue-600">Tracker</span>
          </h1>
        </div>

        {/* ===== METRICS ===== */}
        <div className="space-y-2 mb-4">

          {/* Net Cash — full width */}
          <div className="bg-blue-600 text-white rounded-xl px-4 py-3 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200 flex items-center gap-1.5">
              <FaWallet /> Net Cash on Hand
            </p>
            <p className="text-2xl sm:text-3xl font-black mt-0.5 tracking-tight">{formatCurrency(netCashOnHand)}</p>
          </div>

          {/* Income & Expense — 2 cols */}
          <div className="grid grid-cols-2 gap-2">
            <Link to="/ministries/finance/total-income" className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
              <p className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                <FaArrowUp className="text-emerald-500" /> Total Income
              </p>
              <p className="text-sm sm:text-base font-black text-emerald-600 mt-0.5 truncate">{formatCurrency(metrics.totalIncome)}</p>
            </Link>
            <Link to="/ministries/finance/expenses" className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
              <p className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                <FaArrowDown className="text-rose-500" /> Total Expense
              </p>
              <p className="text-sm sm:text-base font-black text-rose-600 mt-0.5 truncate">{formatCurrency(metrics.totalExpenses)}</p>
            </Link>
          </div>

          {/* Tithes / Offering / Pledge — 3 cols */}
          <div className="grid grid-cols-3 gap-2">
            <Link to="/ministries/finance/tithes" className="bg-white border border-slate-200 rounded-xl px-2 py-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
              <p className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-0.5">
                <FaPiggyBank className="text-blue-500" /> Tithes
              </p>
              <p className="text-sm sm:text-base font-black text-slate-900 mt-0.5 truncate">{formatCurrency(metrics.tithes)}</p>
            </Link>
            <Link to="/ministries/finance/offering" className="bg-white border border-slate-200 rounded-xl px-2 py-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
              <p className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-0.5">
                <FaHandHoldingUsd className="text-amber-500" /> Offering
              </p>
              <p className="text-sm sm:text-base font-black text-slate-900 mt-0.5 truncate">{formatCurrency(metrics.offering)}</p>
            </Link>
            <Link to="/ministries/finance/pledge" className="bg-white border border-slate-200 rounded-xl px-2 py-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
              <p className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-0.5">
                <FaPrayingHands className="text-purple-500" /> Pledge
              </p>
              <p className="text-sm sm:text-base font-black text-slate-900 mt-0.5 truncate">{formatCurrency(metrics.pledge)}</p>
            </Link>
          </div>
        </div>

        {/* ===== QUICK REPORT + RECENT ACTIVITY ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">

          {/* Quick Report — 2 cols on lg */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">

              {/* Header */}
              <div className="px-3 py-2.5 bg-slate-50/50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <FaChartBar className="text-blue-500 text-xs" />
                  <h3 className="text-xs font-black text-slate-800">Quick Report</h3>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <div className="flex bg-slate-100 rounded-lg p-0.5">
                    <button
                      onClick={() => setReportView("monthly")}
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        reportView === "monthly" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      }`}
                    >Monthly</button>
                    <button
                      onClick={() => setReportView("annual")}
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        reportView === "annual" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      }`}
                    >Annual</button>
                  </div>
                  {reportView === "monthly" && (
                    <input
                      type="month"
                      value={selectedReportMonth}
                      onChange={(e) => setSelectedReportMonth(e.target.value)}
                      className="max-w-[120px] bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-[11px] font-bold text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
                    />
                  )}
                  {reportView === "annual" && (
                    <span className="text-[11px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg px-2 py-0.5">
                      {currentYear}
                    </span>
                  )}
                </div>
              </div>

              {/* Cards */}
              <div className="p-2.5 space-y-2">

                {/* Tithes */}
                <Link to="/ministries/finance/tithes" className="block bg-blue-50/50 border border-blue-100 rounded-xl p-2.5 hover:shadow-md hover:-translate-y-0.5 transition-all">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FaPiggyBank className="text-blue-600 text-xs" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800 leading-tight">Tithes</p>
                      <p className="text-[10px] font-bold text-slate-400 leading-tight">
                        {reportView === "monthly" ? "This Month" : "This Year"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500">Met Goal</span>
                      <span className="text-xs font-black text-emerald-600">
                        {titheSummary.metGoal}<span className="text-slate-400 font-medium">/{titheSummary.totalActive}</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500">With Records</span>
                      <span className="text-xs font-black text-blue-600">
                        {titheSummary.withRecords}<span className="text-slate-400 font-medium">/{titheSummary.totalActive}</span>
                      </span>
                    </div>
                    <div className="pt-1 border-t border-blue-100 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Total</span>
                      <span className="text-sm font-black text-blue-600">{formatCurrency(titheSummary.totalAmount)}</span>
                    </div>
                  </div>
                </Link>

                {/* Offering */}
                <Link to="/ministries/finance/offering" className="block bg-amber-50/50 border border-amber-100 rounded-xl p-2.5 hover:shadow-md hover:-translate-y-0.5 transition-all">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FaHandHoldingUsd className="text-amber-600 text-xs" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800 leading-tight">Offering</p>
                      <p className="text-[10px] font-bold text-slate-400 leading-tight">
                        {reportView === "monthly" ? "This Month" : "This Year"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500">Records</span>
                      <span className="text-xs font-black text-amber-600">{offeringSummary.recordCount}</span>
                    </div>
                    <div className="pt-1 border-t border-amber-100 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Total</span>
                      <span className="text-sm font-black text-amber-600">{formatCurrency(offeringSummary.totalAmount)}</span>
                    </div>
                  </div>
                </Link>

                {/* Pledge */}
                <Link to="/ministries/finance/pledge" className="block bg-purple-50/50 border border-purple-100 rounded-xl p-2.5 hover:shadow-md hover:-translate-y-0.5 transition-all">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FaPrayingHands className="text-purple-600 text-xs" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800 leading-tight">Pledge</p>
                      <p className="text-[10px] font-bold text-slate-400 leading-tight">
                        {reportView === "monthly" ? "This Month" : "This Year"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500">With Records</span>
                      <span className="text-xs font-black text-purple-600">
                        {pledgeSummary.withRecords}<span className="text-slate-400 font-medium">/{pledgeSummary.totalActive}</span>
                      </span>
                    </div>
                    <div className="pt-1 border-t border-purple-100 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Total</span>
                      <span className="text-sm font-black text-purple-600">{formatCurrency(pledgeSummary.totalAmount)}</span>
                    </div>
                  </div>
                </Link>

                {/* Quick Add */}
                <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-2">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-6 h-6 bg-emerald-100 rounded-md flex items-center justify-center flex-shrink-0">
                      <FaPlus className="text-emerald-600 text-[10px]" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-slate-800 leading-tight">Quick Add</p>
                      <p className="text-[9px] font-bold text-slate-400 leading-tight">
                        {quickExistingId ? "Update existing record" : "Add to Total Income"}
                      </p>
                    </div>
                  </div>

                  {/* Warning if record exists */}
                  {quickExistingId && (
                    <div className="bg-amber-100 border border-amber-200 rounded-md px-2 py-1 mb-1.5">
                      <p className="text-[9px] text-amber-700 font-bold">
                        ⚠️ {quickCategory} already recorded on {formatDate(quickDate)}. Will update instead of add.
                      </p>
                    </div>
                  )}

                  <form onSubmit={handleQuickAdd} className="space-y-1.5">
                    {/* Date picker */}
                    <input
                      type="date"
                      value={quickDate}
                      onChange={(e) => setQuickDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-[11px] font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={quickAmount}
                        onChange={(e) => setQuickAmount(e.target.value)}
                        placeholder="₱ Amount"
                        required
                        className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-[11px] font-bold text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/10"
                      />
                      <select
                        value={quickCategory}
                        onChange={(e) => setQuickCategory(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-md px-1.5 py-1 text-[11px] font-bold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="Offering">Offering</option>
                        <option value="Tithes">Tithes</option>
                        <option value="Pledge">Pledge</option>
                      </select>
                    </div>
                    <input
                      type="text"
                      value={quickDescription}
                      onChange={(e) => setQuickDescription(e.target.value)}
                      placeholder="Description (optional)"
                      className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-700 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      disabled={quickSubmitting}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 font-bold py-1.5 rounded-md text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {quickSubmitting ? (
                        <><FaSpinner className="animate-spin text-[10px]" /> {quickExistingId ? "Updating..." : "Adding..."}</>
                      ) : (
                        <><FaPlus className="text-[10px]" /> {quickExistingId ? "Update" : "Add"}</>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity — 3 cols on lg */}
          <div className="lg:col-span-3">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-3 py-2.5 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FaHistory className="text-slate-400 text-xs" /> Recent Activity
                </h3>
                <span className="text-[11px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-bold">
                  {transactions.length} Total
                </span>
              </div>

              {loading && transactions.length === 0 ? (
                <div className="flex items-center justify-center py-10">
                  <FaSpinner className="animate-spin text-blue-500 mr-2" />
                  <span className="text-sm text-slate-500 font-medium">Loading...</span>
                </div>
              ) : transactions.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-slate-400 font-medium">No transactions yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {transactions.slice(0, 7).map((tx) => {
                    const isEditing = tx.id === editingId;
                    const isIncome = isEditing
                      ? editFormData.transaction_type === "Income"
                      : tx.transaction_type === "Income";

                    if (isEditing) {
                      return (
                        <div key={tx.id} className="p-3 bg-blue-50/50 border-l-4 border-blue-500 space-y-2">
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
                                value={editFormData.category === "Basket" ? "Offering" : editFormData.category}
                                onChange={(e) => {
                                  const selected = e.target.value;
                                  const dbValue = selected === "Offering" ? "Basket" : selected;
                                  setEditFormData(prev => ({ ...prev, category: dbValue }));
                                }}
                                className="w-full border border-slate-200 bg-white rounded-md px-2 py-1 text-xs font-semibold"
                              >
                                {editFormData.transaction_type === "Income" ? (
                                  <>
                                    <option value="Tithes">Tithes</option>
                                    <option value="Offering">Offering</option>
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

                          {editFormData.transaction_type === "Income" &&
                            (editFormData.category === "Tithes" || editFormData.category === "Pledge") && (
                              <div>
                                <label className="text-[9px] font-bold text-slate-500 uppercase">Contributor</label>
                                <select
                                  value={editFormData.member_id || ""}
                                  onChange={(e) => setEditFormData(prev => ({ ...prev, member_id: e.target.value }))}
                                  className="w-full border border-slate-200 bg-white rounded-md px-2 py-1 text-xs"
                                >
                                  <option value="">Select Contributor</option>
                                  {members.map(m => (
                                    <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                                  ))}
                                </select>
                              </div>
                          )}

                          <div>
                            <label className="text-[9px] font-bold text-slate-500 uppercase">Description</label>
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
                            >Cancel</button>
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => handleUpdateTransaction(tx.id)}
                              className="px-2.5 py-1 text-[11px] font-bold bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                            >
                              {submitting && <FaSpinner className="animate-spin text-[9px]" />}
                              Save
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={tx.id} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50/50 transition-colors">
                        {/* Left: date + badge */}
                        <div className="flex flex-col gap-0.5 flex-shrink-0 w-[78px]">
                          <span className="text-[10px] font-bold text-slate-400 leading-tight">
                            {formatDate(tx.date)}
                          </span>
                          <span className={`text-[9px] font-black uppercase tracking-wide px-1 py-0.5 rounded border w-fit leading-tight ${
                            isIncome
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}>
                            {tx.category}
                          </span>
                        </div>

                        {/* Middle: description + member */}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-800 truncate leading-tight">
                            {tx.description || <span className="text-slate-300 italic">No description</span>}
                          </p>
                          {tx.member_id && getMemberName(tx.member_id) && (
                            <p className="text-[9px] text-slate-400 font-medium truncate leading-tight">
                              {getMemberName(tx.member_id)}
                            </p>
                          )}
                        </div>

                        {/* Right: amount + edit */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={`text-xs font-bold tabular-nums ${isIncome ? "text-emerald-600" : "text-rose-600"}`}>
                            {isIncome ? "+" : "-"}{formatCurrency(tx.amount)}
                          </span>
                          <button
                            type="button"
                            onClick={() => { setEditingId(tx.id); setEditFormData({ ...tx }); }}
                            className="text-[10px] text-slate-400 font-bold hover:text-blue-600 cursor-pointer underline decoration-dotted whitespace-nowrap"
                          >Edit</button>
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