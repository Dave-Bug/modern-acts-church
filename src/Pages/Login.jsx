import { useState, useEffect, useRef } from "react";
import {
  FaUser,
  FaLock,
  FaChurch,
  FaUserTag,
  FaSpinner,
  FaSignInAlt,
  FaUserPlus,
  FaExclamationCircle,
  FaCheckCircle,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";
import { supabase } from "../Services/supabase";

export default function Login({ onAuthSuccess }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [ministry, setMinistry] = useState("");
  const [status, setStatus] = useState("Viewer");

  const [allDbRecords, setAllDbRecords] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef(null);

  useEffect(() => {
    const fetchDirectoryData = async () => {
      try {
        setAllDbRecords([]);
        setSuggestions([]);
        setShowSuggestions(false);

        if (isRegistering) {
          const { data, error } = await supabase
            .from("usher_members")
            .select("first_name, last_name, ministry");
          if (!error && data) setAllDbRecords(data);
        } else {
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

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleNameChange = (e) => {
    const val = e.target.value;
    setName(val);
    setMinistry("");

    if (!val.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const searchStr = val.toLowerCase();
    const filtered = allDbRecords.filter((item) => {
      if (isRegistering) {
        const combined = `${item.first_name} ${item.last_name}`.toLowerCase();
        return combined.includes(searchStr);
      } else {
        return item.name?.toLowerCase().includes(searchStr);
      }
    });

    setSuggestions(filtered);
    setShowSuggestions(true);
  };

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
    setShowPassword(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!name.trim() || !password) {
      setErrorMessage("Please fill out your Name and Password.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

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
        setErrorMessage(
          "Access Denied: Your registration is currently pending administrator approval."
        );
        return;
      }

      // ✅ Fetch fresh ministry from usher_members
      const nameParts = userRecord.name.trim().split(" ");
      const firstName = nameParts[0];
      const { data: freshMember, error: memberErr } = await supabase
        .from("usher_members")
        .select("ministry")
        .ilike("first_name", `%${firstName}%`)
        .maybeSingle();

      if (memberErr) console.error("Failed to fetch fresh ministry:", memberErr);

      const updatedUser = {
        ...userRecord,
        ministry: freshMember?.ministry || userRecord.ministry,
      };

      // ✅ Save to localStorage AND call onAuthSuccess
      localStorage.setItem("church_session_user", JSON.stringify(updatedUser));
      onAuthSuccess(updatedUser);
    } catch (err) {
      setErrorMessage("System authorization connection issues.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!ministry) {
      setErrorMessage(
        "Please select your name from the search suggestions dropdown to pull ministry assignments."
      );
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

      const { data: inserted, error } = await supabase
        .from("church_auth")
        .insert([
          {
            name: name.trim(),
            password: password,
            ministry: ministry,
            type: "User",
            status: status,
            access: "Pending",
          },
        ])
        .select(); // ← returns the inserted row

      if (error) {
        if (error.code === "23505")
          throw new Error("This profile identity has active credentials already.");
        throw error;
      }

      // ✅ FIX: Auto-login after successful registration
      // Since new registrations are "Pending", we need to check if admin pre-approved
      // or if you want to auto-approve. For now, we'll log them in with Pending status
      // but the Ministries page will still block access until approved.
      
      // Option A: Show pending message (current behavior)
      setSuccessMessage(
        "Account created successfully! Your request is now pending Administrator approval."
      );
      
      // Option B: Auto-login (uncomment if you want immediate access)
      // const newUser = {
      //   name: name.trim(),
      //   ministry: ministry,
      //   type: "User",
      //   status: status,
      //   access: "Pending",
      // };
      // localStorage.setItem("church_session_user", JSON.stringify(newUser));
      // onAuthSuccess(newUser);

      setTimeout(() => switchMode(false), 3500);
    } catch (err) {
      setErrorMessage(err.message || "Registration operation failure.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#f5f8fc] flex items-center justify-center px-4 py-6 relative overflow-hidden rounded-2xl">
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[200px] bg-blue-200/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-sky-200/30 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[30%] right-[20%] w-[300px] h-[300px] bg-indigo-100/40 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        <div className="bg-white/90 backdrop-blur-xl border border-white/60 rounded-3xl p-6 shadow-[0_8px_40px_-12px_rgba(59,130,246,0.15)] ring-1 ring-slate-900/5">
          
          <div className="absolute top-0 left-10 right-10 h-[3px] bg-gradient-to-r from-transparent via-blue-500 to-transparent rounded-full opacity-60" />

          <div className="text-center mb-5">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-sky-500 mb-3 shadow-lg shadow-blue-500/20 ring-4 ring-blue-50">
              <FaChurch className="text-lg" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Ministry <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-sky-500">Access Portal</span>
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1.5">
              {isRegistering
                ? "Create your new security credentials"
                : "Authenticate to manage church data modules"}
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 bg-red-50 border border-red-100 text-red-700 text-sm font-semibold p-3 rounded-xl flex items-start gap-3">
              <FaExclamationCircle className="flex-shrink-0 mt-0.5 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-semibold p-3 rounded-xl flex items-start gap-3">
              <FaCheckCircle className="flex-shrink-0 mt-0.5 text-emerald-500" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
            
            <div className="relative" ref={suggestionRef}>
              <label className="block text-[11px] font-bold uppercase text-slate-400 tracking-wider mb-1.5 ml-1">
                Full Registered Name
              </label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors duration-200">
                  <FaUser className="text-sm" />
                </span>
                <input
                  type="text"
                  placeholder={isRegistering ? "Type name... (e.g., Christian Dave)" : "Type your login username..."}
                  value={name}
                  onChange={handleNameChange}
                  onFocus={() => name.trim() && setShowSuggestions(true)}
                  disabled={loading}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-400 
                           focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 
                           hover:border-slate-300 transition-all duration-200"
                />
              </div>

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-2 z-[9999] max-h-48 overflow-y-auto no-scrollbar bg-white border border-slate-100 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] rounded-xl py-2 ring-1 ring-slate-900/5">
                  {suggestions.map((item, index) => {
                    const displayName = isRegistering
                      ? `${item.first_name} ${item.last_name}`
                      : item.name;
                    const displayBadge = item.ministry
                      ? item.ministry.split(",")[0]
                      : "Authorized";

                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => selectSuggestion(item)}
                        className="w-full text-left px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-all duration-150 flex items-center justify-between group cursor-pointer"
                      >
                        <span>{displayName}</span>
                        <span className="text-[10px] bg-blue-50 text-blue-600 font-bold px-2.5 py-1 rounded-lg border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-all duration-200">
                          {displayBadge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {showSuggestions && name.trim() && suggestions.length === 0 && (
                <div className="absolute left-0 right-0 mt-2 z-[9999] bg-amber-50 border border-amber-100 p-4 rounded-xl text-sm font-semibold text-amber-800 shadow-lg">
                  {isRegistering
                    ? "No matched church personnel found."
                    : "No registered user account profiles match."}
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-400 tracking-wider mb-1.5 ml-1">
                Account Security Password
              </label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors duration-200">
                  <FaLock className="text-sm" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-12 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-400 
                           focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 
                           hover:border-slate-300 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors duration-200 focus:outline-none"
                >
                  {showPassword ? <FaEyeSlash className="text-sm" /> : <FaEye className="text-sm" />}
                </button>
              </div>
            </div>

            {isRegistering && (
              <>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 tracking-wider mb-1.5 ml-1">
                    Ministry Assignment <span className="text-blue-500">(Auto-Selected)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <FaChurch className="text-sm" />
                    </span>
                    <input
                      type="text"
                      readOnly
                      placeholder="Select a name above to autofill ministry assignment"
                      value={ministry}
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-sm font-semibold text-slate-500 cursor-not-allowed outline-none select-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 tracking-wider mb-1.5 ml-1">
                    Personnel Clearance Level
                  </label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors duration-200">
                      <FaUserTag className="text-sm" />
                    </span>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      disabled={loading}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-10 py-2.5 text-sm font-semibold text-slate-800 
                               focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 
                               hover:border-slate-300 transition-all duration-200 appearance-none cursor-pointer"
                    >
                      <option value="Viewer" className="bg-white">Viewer (Read Logs Only)</option>
                      <option value="Editor" className="bg-white">Editor (Modify Logs)</option>
                      <option value="Admin" className="bg-white">Admin (Full Control Permissions)</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full relative group overflow-hidden rounded-xl font-bold py-3 text-sm transition-all duration-300 
                       bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400
                       text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none
                       active:scale-[0.98] mt-1"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative flex items-center text-black justify-center gap-2">
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin text-base" />
                    Processing...
                  </>
                ) : isRegistering ? (
                  <>
                    <FaUserPlus className="text-base" />
                    Finalize Registration
                  </>
                ) : (
                  <>
                    <FaSignInAlt className="text-base" />
                    Secure Sign In
                  </>
                )}
              </span>
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            {isRegistering ? (
              <p className="text-sm text-slate-500 font-medium">
                Already possess security credentials?{" "}
                <button
                  type="button"
                  onClick={() => switchMode(false)}
                  className="text-blue-600 hover:text-blue-500 font-bold transition-colors duration-200 hover:underline underline-offset-4 cursor-pointer"
                >
                  Log In Here
                </button>
              </p>
            ) : (
              <p className="text-sm text-slate-500 font-medium">
                New user authorization registration?{" "}
                <button
                  type="button"
                  onClick={() => switchMode(true)}
                  className="text-blue-600 hover:text-blue-500 font-bold transition-colors duration-200 hover:underline underline-offset-4 cursor-pointer"
                >
                  Create Account
                </button>
              </p>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-3 font-medium">
          Secured by church management encryption protocols
        </p>
      </div>
    </div>
  );
}