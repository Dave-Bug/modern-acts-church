import { useEffect, useState, useCallback } from "react";
import Container from "../layout/Container";
import { Link, useNavigate } from "react-router-dom";

import {
  FaVideo,
  FaMusic,
  FaHandsHelping,
  FaPiggyBank,
  FaUserCog,
  FaShieldAlt,
  FaBookOpen,
  FaArrowRight,
  FaHome,
  FaUserCircle,
  FaLock,
  FaExchangeAlt,
  FaTimes,
} from "react-icons/fa";
import Login from "../../Pages/Login";

const ministries = [
  { name: "Media Team", matchKey: "Multimedia", icon: FaVideo, desc: "Livestream & media production.", color: "blue", path: "/ministries/media" },
  { name: "Worship Team", matchKey: "Worship Team", icon: FaMusic, desc: "Leads worship & praise.", color: "sky", path: "/ministries/worshipteam" },
  { name: "Usher", matchKey: "Usher", icon: FaHandsHelping, desc: "Welcomes attendees.", color: "indigo", path: "/ministries/usher" },
  { name: "Finance", matchKey: "Finance", icon: FaPiggyBank, desc: "Handles church giving.", color: "slate", path: "/ministries/finance" },
  { name: "Admin", matchKey: "Admin Department", icon: FaUserCog, desc: "Church coordination.", color: "blue", path: "/ministries/administration" },
  { name: "Marshall", matchKey: "Marshall", icon: FaShieldAlt, desc: "Safety & order.", color: "sky", path: "/ministries/marshall" },
  { name: "Discipleship", matchKey: "DJ Team", icon: FaBookOpen, desc: "Spiritual growth.", color: "indigo", path: "/ministries/discipleshipjourney" },
];

const colorMap = {
  blue: { bg: "bg-blue-100", icon: "text-blue-600" },
  sky: { bg: "bg-sky-100", icon: "text-sky-600" },
  indigo: { bg: "bg-indigo-100", icon: "text-indigo-600" },
  slate: { bg: "bg-slate-200", icon: "text-slate-700" },
};

export default function Ministries() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [userMinistries, setUserMinistries] = useState([]);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Load profile state helper
  const loadUserSession = useCallback(() => {
    const sessionStr = localStorage.getItem("church_session_user");
    if (sessionStr) {
      try {
        const parsedUser = JSON.parse(sessionStr);
        setCurrentUser(parsedUser);

        if (parsedUser.ministry) {
          const list = parsedUser.ministry
            .split(",")
            .map((m) => m.trim().toLowerCase());
          setUserMinistries(list);
        } else {
          setUserMinistries([]);
        }
      } catch (e) {
        console.error("Failed to parse authenticated session details", e);
        setCurrentUser(null);
        setUserMinistries([]);
      }
    } else {
      setCurrentUser(null);
      setUserMinistries([]);
    }
  }, []);

  // Run on mount and when window regains focus
  useEffect(() => {
    loadUserSession();

    const handleStorageChange = (e) => {
      if (e.key === "church_session_user") {
        loadUserSession();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    const handleFocus = () => {
      loadUserSession();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadUserSession]);

  const hasAccess = (matchKey) => {
    if (!currentUser) return false;
    if (currentUser.status === "Admin") return true;
    return userMinistries.some((m) => m.includes(matchKey.toLowerCase()));
  };

  const handleCardClick = (e, m) => {
    if (!hasAccess(m.matchKey)) {
      e.preventDefault();
      alert(`Access Denied: Your account profile is not assigned to the ${m.name}.`);
    }
  };

  // ✅ FIX: Just open the modal — DON'T clear localStorage yet
  const handleSwitchAccount = () => {
    setShowAuthModal(true);
  };

  // ✅ FIX: Only clear old session when NEW login succeeds
  const handleAuthSuccess = (userRecord) => {
    // Clear old session first, then save new one
    localStorage.removeItem("church_session_user");
    localStorage.setItem("church_session_user", JSON.stringify(userRecord));
    
    // Update state immediately
    setCurrentUser(userRecord);
    if (userRecord.ministry) {
      const list = userRecord.ministry
        .split(",")
        .map((m) => m.trim().toLowerCase());
      setUserMinistries(list);
    } else {
      setUserMinistries([]);
    }
    setShowAuthModal(false);
  };

  // ✅ FIX: Closing modal just hides it — doesn't log out
  const handleCloseModal = () => {
    setShowAuthModal(false);
    // Don't touch localStorage or currentUser state
  };

  return (
    <section className="min-h-screen flex flex-col bg-[#f5f7fb] text-slate-900 relative overflow-hidden">
      {/* Header Controls */}
      <div className="fixed top-4 left-4 z-40">
        <Link
          to="/"
          className="flex items-center gap-2 bg-white/80 backdrop-blur border border-slate-200 shadow-sm px-3 py-2 rounded-xl text-sm font-medium hover:text-blue-600 transition-colors"
        >
          <FaHome />
          Home
        </Link>
      </div>

      {/* Profile Chip */}
      {currentUser && (
        <div className="fixed top-4 right-4 z-40 flex items-center gap-3 bg-white/90 backdrop-blur border border-slate-200 shadow-lg px-4 py-2 rounded-xl">
          <FaUserCircle className="text-slate-400 text-2xl flex-shrink-0" />
          <div className="flex flex-col text-left">
            <span className="text-xs font-black text-slate-800 leading-tight">
              {currentUser.name}
            </span>
            <span className="text-[10px] font-semibold text-slate-400 max-w-[150px] truncate leading-none mt-0.5">
              {currentUser.ministry || "No Ministry"}
            </span>
          </div>

          <span
            className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ml-1 ${
              currentUser.status === "Admin"
                ? "bg-red-50 text-red-600 border border-red-100"
                : currentUser.status === "Editor"
                ? "bg-amber-50 text-amber-600 border border-amber-100"
                : "bg-blue-50 text-blue-600 border border-blue-100"
            }`}
          >
            {currentUser.status || "Viewer"}
          </span>

          <button
            onClick={handleSwitchAccount}
            title="Switch Account Profile"
            className="ml-2 bg-slate-100 hover:bg-blue-50 border border-slate-200 text-slate-500 hover:text-blue-600 p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center text-xs"
          >
            <FaExchangeAlt />
          </button>
        </div>
      )}

      {/* Show login button if no user */}
      {!currentUser && !showAuthModal && (
        <div className="fixed top-4 right-4 z-40">
          <button
            onClick={() => setShowAuthModal(true)}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold px-4 py-2 rounded-xl shadow-lg transition-colors"
          >
            <FaUserCircle />
            Log In
          </button>
        </div>
      )}

      <Container className="flex-1 py-20">
        <div className="text-center mb-8 md:mb-10">
          <h2 className="text-3xl md:text-5xl font-black mb-2">
            Church <span className="text-blue-600">Ministries</span>
          </h2>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Select an authorized dashboard portal to manage operational records
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5 max-w-6xl mx-auto">
          {ministries.map((m, i) => {
            const Icon = m.icon;
            const theme = colorMap[m.color];
            const allowed = hasAccess(m.matchKey);

            return (
              <Link
                key={i}
                to={m.path}
                onClick={(e) => handleCardClick(e, m)}
                className={`group bg-white/80 backdrop-blur border border-slate-200 rounded-xl p-4 md:p-5 transition-all duration-300 block relative ${
                  allowed
                    ? "hover:shadow-md hover:-translate-y-1 cursor-pointer"
                    : "opacity-45 cursor-not-allowed bg-slate-100/50"
                }`}
              >
                {!allowed && (
                  <div className="absolute top-4 right-4 text-slate-400 text-xs bg-slate-200/60 p-1.5 rounded-lg">
                    <FaLock />
                  </div>
                )}

                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                    allowed ? `${theme.bg} ${theme.icon}` : "bg-slate-200 text-slate-400"
                  }`}
                >
                  <Icon />
                </div>

                <h3 className="font-bold text-base md:text-lg mb-1 text-slate-800">
                  {m.name}
                </h3>

                <p className="text-slate-500 text-xs md:text-sm leading-relaxed mb-3">
                  {m.desc}
                </p>

                <div
                  className={`flex items-center gap-2 text-xs font-semibold transition ${
                    allowed ? "text-slate-400 group-hover:text-blue-600" : "text-slate-300"
                  }`}
                >
                  {allowed ? "ENTER PORTAL" : "LOCKED"}
                  <FaArrowRight
                    size={10}
                    className={allowed ? "group-hover:translate-x-1 transition" : "hidden"}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </Container>

      <footer className="mt-auto border-t border-slate-200 text-center py-6 bg-white/60 backdrop-blur">
        <p className="text-slate-500 text-xs md:text-sm">
          Serve • Grow • Make Disciples
        </p>
      </footer>

      {/* Login Modal */}
      {showAuthModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-950/80 backdrop-blur-md transition-all duration-300"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseModal();
          }}
        >
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl bg-white border border-slate-100 p-2">
            {/* X CLOSE BUTTON */}
            <button
              onClick={handleCloseModal}
              className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
            >
              <FaTimes size={14} />
            </button>

            <Login onAuthSuccess={handleAuthSuccess} />
          </div>
        </div>
      )}
    </section>
  );
}