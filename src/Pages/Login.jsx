import { useState, useEffect, useRef } from "react";
import { FaUser, FaLock, FaChurch, FaUserTag, FaSpinner, FaSignInAlt, FaUserPlus, FaExclamationCircle, FaCheckCircle } from "react-icons/fa";
import { supabase } from "../Services/supabase";

export default function Login({ onAuthSuccess }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Form Fields State
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [ministry, setMinistry] = useState(""); 
  const [status, setStatus] = useState("Viewer"); // Admin, Editor, Viewer

  // 🔎 Live Suggestion Directories States
  const [allDbRecords, setAllDbRecords] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef(null);

  // Fetch directory list dynamically based on active mode (Sign In vs Create Account)
  useEffect(() => {
    const fetchDirectoryData = async () => {
      try {
        setAllDbRecords([]);
        setSuggestions([]);
        setShowSuggestions(false);

        if (isRegistering) {
          // Registration targets raw church members
          const { data, error } = await supabase
            .from("usher_members")
            .select("first_name, last_name, ministry");
          if (!error && data) setAllDbRecords(data);
        } else {
          // Login targets finalized credential profiles
          const { data, error } = await supabase
            .from("church_auth")
            .select("name, ministry");
          if (!error && data) setAllDbRecords(data);
        }
      } catch (err) {
        console.error("Failed to pre-fetch directory mapping:", err);
      }
    };

    fetchDirectoryData();
  }, [isRegistering]);

  // Handle outside clicks to close the dropdown securely
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // --- 🪄 LIVE UNIFIED FILTER LOGIC ---
  const handleNameChange = (e) => {
    const val = e.target.value;
    setName(val);
    setMinistry(""); // Flush old states mid-typing

    if (!val.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const searchStr = val.toLowerCase();

    const filtered = allDbRecords.filter((item) => {
      if (isRegistering) {
        // Matches combined strings for registration records
        const combined = `${item.first_name} ${item.last_name}`.toLowerCase();
        return combined.includes(searchStr);
      } else {
        // Simple direct name search string filter for logins
        return item.name?.toLowerCase().includes(searchStr);
      }
    });

    setSuggestions(filtered);
    setShowSuggestions(true);
  };

  // --- 🎯 USER CLICK ON SUGGESTION PANEL ---
  const selectSuggestion = (item) => {
    if (isRegistering) {
      setName(`${item.first_name} ${item.last_name}`);
      setMinistry(item.ministry);
    } else {
      setName(item.name);
    }
    setSuggestions([]);
    setShowSuggestions(false);
    setErrorMessage("");
  };

  const switchMode = (toRegister) => {
    setIsRegistering(toRegister);
    setErrorMessage("");
    setSuccessMessage("");
    setName("");
    setPassword("");
    setMinistry("");
    setStatus("Viewer");
  };

  // --- 🔐 SIGN IN SUBMIT ACTION ---
   const handleLogin = async (e) => {
    e.preventDefault();
    if (!name.trim() || !password) {
      setErrorMessage("Please fill out your Name and Password.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      // 1. Verify credentials from church_auth
      const { data: userRecord, error } = await supabase
        .from("church_auth")
        .select("name, ministry, type, status, access")
        .eq("name", name.trim())
        .eq("password", password)
        .maybeSingle();

      if (error) throw error;

      if (!userRecord) {
        setErrorMessage("Invalid credentials combination profile.");
        return;
      }

      if (userRecord.access !== "Approved") {
        setErrorMessage("Access Denied: Your registration is currently pending administrator approval.");
        return;
      }

      // 2. 🔄 FETCH FRESH MINISTRY from usher_members
      const nameParts = userRecord.name.trim().split(" ");
      const firstName = nameParts[0];

      const { data: freshMember, error: memberErr } = await supabase
        .from("usher_members")
        .select("ministry")
        .ilike("first_name", `%${firstName}%`)
        .maybeSingle();

      if (memberErr) console.error("Failed to fetch fresh ministry:", memberErr);

      // 3. Merge fresh ministry into the user record
      const updatedUser = {
        ...userRecord,
        ministry: freshMember?.ministry || userRecord.ministry
      };

      onAuthSuccess(updatedUser);

    } catch (err) {
      setErrorMessage("System authorization connection issues.");
    } finally {
      setLoading(false);
    }
  };

// --- 📝 REGISTRATION SUBMIT ACTION (Defaults to Pending status) ---
const handleRegister = async (e) => {
  e.preventDefault();
  
  if (!ministry) {
    setErrorMessage("Please select your name from the search suggestions dropdown to pull ministry assignments.");
    return;
  }

  if (password.length < 4) {
    setErrorMessage("Password safety standard minimum is 4 characters.");
    return;
  }

  try {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("church_auth")
      .insert([
        {
          name: name.trim(),
          password: password,
          ministry: ministry,
          type: "User",
          status: status,
          access: "Pending" // 🔒 Securely held in queue until approved by Admin
        }
      ]);

    if (error) {
      if (error.code === "23505") throw new Error("This profile identity has active credentials already.");
      throw error;
    }

    // Informing the user they must wait for approval
    setSuccessMessage("Account created successfully! Your request is now pending Administrator approval.");
    setTimeout(() => switchMode(false), 3500);

  } catch (err) {
    setErrorMessage(err.message || "Registration operation failure.");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-[#f5f7fb] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xs">
        
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Ministry <span className="text-blue-600">Access Portal</span>
          </h1>
          <p className="text-xs text-slate-400 font-semibold mt-1">
            {isRegistering ? "Create your new security credentials" : "Authenticate to manage church data modules"}
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 bg-red-50 border border-red-100 text-red-700 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
            <FaExclamationCircle className="flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
            <FaCheckCircle className="flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
          
          {/* Field 1: Live Interactive Autocomplete Search Box */}
          <div className="relative" ref={suggestionRef}>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
              Full Registered Name
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-400 text-xs"><FaUser /></span>
              <input
                type="text"
                placeholder={isRegistering ? "Type name... (e.g., Christian Dave)" : "Type your login username..."}
                value={name}
                onChange={handleNameChange}
                onFocus={() => name.trim() && setShowSuggestions(true)}
                disabled={loading}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* 💡 LIVE INTERACTIVE SUGGESTIONS DROPDOWN PANEL */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 z-[9999] max-h-48 overflow-y-auto bg-white border border-slate-200 shadow-2xl rounded-xl py-1.5">
                {suggestions.map((item, index) => {
                  const displayName = isRegistering ? `${item.first_name} ${item.last_name}` : item.name;
                  const displayBadge = item.ministry ? item.ministry.split(',')[0] : "Authorized";

                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => selectSuggestion(item)}
                      className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-between group cursor-pointer"
                    >
                      <span>{displayName}</span>
                      <span className="text-[10px] bg-blue-50 text-blue-600 font-semibold px-2 py-0.5 rounded-md group-hover:bg-blue-600 group-hover:text-black transition-all">
                        {displayBadge}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Fallback structural layout notice if nothing returns */}
            {showSuggestions && name.trim() && suggestions.length === 0 && (
              <div className="absolute left-0 right-0 mt-1 z-[9999] bg-amber-50 border border-amber-100 p-3 rounded-xl text-[11px] font-bold text-amber-800 shadow-2xl">
                {isRegistering ? "No matched church personnel found." : "No registered user account profiles match."}
              </div>
            )}
          </div>

          {/* Field 2: Password Input */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
              Account Security Password
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-400 text-xs"><FaLock /></span>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Conditional Layout (Registration Only Mode) */}
          {isRegistering && (
            <>
              {/* Field 3: Ministry Assignment (🔒 READ ONLY) */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                  Ministry Assignment (Auto-Selected)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-slate-400 text-xs"><FaChurch /></span>
                  <input
                    type="text"
                    readOnly
                    placeholder="Select a name above to autofill ministry assignment"
                    value={ministry}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-500 cursor-not-allowed outline-none select-none"
                  />
                </div>
              </div>

              {/* Field 4: Security Level Status Type */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                  Personnel Clearance Level
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-slate-400 text-xs"><FaUserTag /></span>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    disabled={loading}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Viewer">Viewer (Read Logs Only)</option>
                    <option value="Editor">Editor (Modify Logs)</option>
                    <option value="Admin">Admin (Full Control Permissions)</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-60 mt-2"
          >
            {loading ? (
              <><FaSpinner className="animate-spin text-sm" /> Processing...</>
            ) : isRegistering ? (
              <><FaUserPlus /> Finalize Registration</>
            ) : (
              <><FaSignInAlt /> Secure Sign In</>
            )}
          </button>
        </form>

        <div className="mt-6 border-t border-slate-100 pt-4 text-center">
          {isRegistering ? (
            <p className="text-xs text-slate-500 font-semibold">
              Already possess security credentials?{" "}
              <button
                type="button"
                onClick={() => switchMode(false)}
                className="text-blue-600 hover:underline font-bold cursor-pointer"
              >
                Log In Here
              </button>
            </p>
          ) : (
            <p className="text-xs text-slate-500 font-semibold">
              New user authorization registration?{" "}
              <button
                type="button"
                onClick={() => switchMode(true)}
                className="text-blue-600 hover:underline font-bold cursor-pointer"
              >
                Create Account
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
}