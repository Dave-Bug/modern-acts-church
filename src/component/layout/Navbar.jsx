
import { useEffect, useState, useRef } from "react";
import { FaBars, FaTimes } from "react-icons/fa";
import { Link, useLocation } from "react-router-dom";
import Container from "./Container";
import logo from "../../assets/logo.jpg";

export default function Navbar() {
  const location = useLocation();

  const [active, setActive] = useState("home");
  const [showMinistries, setShowMinistries] = useState(false); // Starts hidden as requested
  const [menuOpen, setMenuOpen] = useState(false);

  // Mobile tap counter refs
  const tapCount = useRef(0);
  const tapTimeout = useRef(null);

  // Active Scroll Detection & Location Checking
  useEffect(() => {
    // Highlighting fix: If user is on the /ministries page route, lock the active link highlight to ministries
    if (location.pathname === "/ministries") {
      setActive("ministries");
      return;
    }

    const sections = ["home", "about", "services"];

    const handleScroll = () => {
      let current = "home";

      sections.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;

        const top = el.getBoundingClientRect().top;
        if (top <= 180) current = id;
      });

      setActive(current);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [location.pathname]);

  // Unified unlock helper function
  const unlock = () => {
    setShowMinistries(true);
    localStorage.setItem("maco_unlocked", "true");
  };

  // Desktop secret: type "maco" (Optimized with functional update)
  useEffect(() => {
    const targetWord = "maco";

    const handleKeyDown = (e) => {
      const char = e.key.toLowerCase();

      if (/^[a-z0-9]$/.test(char)) {
        setActive((prev) => prev); 
        
        window.__maco_typed = (window.__maco_typed || "") + char;
        if (window.__maco_typed.endsWith(targetWord)) {
          unlock();
          window.__maco_typed = "";
        }
        if (window.__maco_typed.length > targetWord.length) {
          window.__maco_typed = window.__maco_typed.slice(-targetWord.length);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // MOBILE MULTI-TAP UNLOCK (3x Taps)
  const handleLogoTap = (e) => {
    e.preventDefault();
    e.stopPropagation();

    tapCount.current += 1;
    clearTimeout(tapTimeout.current);

    tapTimeout.current = setTimeout(() => {
      tapCount.current = 0;
    }, 2000);

    if (tapCount.current >= 3) {
      unlock();
      tapCount.current = 0;
    }
  };

  const linkClass = (id) =>
    `relative py-1 transition-all duration-300 font-medium ${
      active === id
        ? "text-sky-400"
        : "text-white/80 hover:text-sky-300"
    }`;

  const navItems = [
    { id: "home", label: "Home", href: "/#home" },
    { id: "about", label: "About", href: "/#about" },
    { id: "services", label: "Services", href: "/#services" },
  ];

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-slate-950/55 backdrop-blur-2xl border-b border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.25)]">
      <Container>
        <div className="flex items-center justify-between h-[72px] md:h-[84px]">

          {/* BRAND LOGO AREA */}
          <div className="flex items-center gap-3 group">
            {/* Click/Tap logic isolated on the logo image element */}
            <button
              onClick={handleLogoTap}
              className="relative w-11 h-11 md:w-14 md:h-14 rounded-2xl overflow-hidden border border-white/10 bg-white/5 shadow-xl ring-1 ring-sky-400/20 transition-all duration-500 group-hover:ring-sky-400/40 group-hover:scale-105 cursor-pointer focus:outline-none"
              aria-label="Secret Menu Trigger"
            >
              <img
                src={logo}
                alt="Church Logo"
                className="w-full h-full object-cover scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-sky-400/10 via-transparent to-blue-600/20" />
            </button>

            {/* Standard link remains on the text title for navigation */}
            <Link to="/" className="leading-tight">
              <h1 className="text-white font-bold tracking-wide text-sm sm:text-base md:text-[22px]">
                Modern Acts Church Olongapo
              </h1>
              <p className="text-slate-400 text-[10px] sm:text-xs md:text-sm tracking-wide">
                Faith • Worship • Community
              </p>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <a key={item.id} href={item.href} className={linkClass(item.id)}>
                {item.label}

                {/* Underline Highlight Spans Restored */}
                <span
                  className={`absolute left-0 -bottom-1 h-[2px] bg-sky-400 rounded-full transition-all duration-300 ${
                    active === item.id ? "w-full opacity-100" : "w-0 opacity-0"
                  }`}
                />
              </a>
            ))}

            {showMinistries && (
              <Link to="/ministries" className={linkClass("ministries")}>
                Ministries

                {/* Ministries Underline Highlight Span Restored */}
                <span
                  className={`absolute left-0 -bottom-1 h-[2px] bg-sky-400 rounded-full transition-all duration-300 ${
                    active === "ministries" ? "w-full opacity-100" : "w-0 opacity-0"
                  }`}
                />
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-white text-xl w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all"
          >
            {menuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {menuOpen && (
          <div className="md:hidden mb-5 rounded-3xl border border-white/10 bg-slate-900/95 backdrop-blur-2xl shadow-2xl p-5 flex flex-col gap-5">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`text-sm font-medium transition ${
                  active === item.id ? "text-sky-400" : "text-white/80"
                }`}
              >
                {item.label}
              </a>
            ))}

            {showMinistries && (
              <Link
                to="/ministries"
                onClick={() => setMenuOpen(false)}
                className={`text-sm font-medium ${
                  active === "ministries" ? "text-sky-400" : "text-white/80"
                }`}
              >
                Ministries
              </Link>
            )}
          </div>
        )}
      </Container>
    </nav>
  );
}

