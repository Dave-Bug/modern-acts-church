import { useEffect, useState, useRef } from "react";
import { FaBars, FaTimes } from "react-icons/fa";
import { Link, useLocation } from "react-router-dom";
import Container from "./Container";
import logo from "../../assets/logo.jpg";

export default function Navbar() {
  const location = useLocation();

  const [active, setActive] = useState("home");
  
  // 🔥 HIGHLIGHT: Defaults to false so it is always hidden on first load.
  // Change to `localStorage.getItem("maco_unlocked") === "true"` if you want it persistent later.
  const [showMinistries, setShowMinistries] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Mobile tap counter refs
  const tapCount = useRef(0);
  const tapTimeout = useRef(null);

  // Active Scroll Detection
  useEffect(() => {
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
        
        // Custom wrapper logic to track keys seamlessly without state dependency loops
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

  // MOBILE MULTI-TAP UNLOCK
  const handleLogoTap = (e) => {
    e.preventDefault();
    e.stopPropagation();

    tapCount.current += 1;
    clearTimeout(tapTimeout.current);

    tapTimeout.current = setTimeout(() => {
      tapCount.current = 0;
    }, 2000);

    // Activates precisely on 3 taps
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
    <nav className="fixed top-0 left-0 w-full z-50 bg-slate-950/55 backdrop-blur-2xl border-b border-white/5">
      <Container>
        <div className="flex items-center justify-between h-[72px] md:h-[84px]">

          {/* BRAND LOGO AREA */}
          <div className="flex items-center gap-3 group">
            {/* 🔥 HIGHLIGHT: Click/Tap logic isolated here to prevent Router <Link> overrides */}
            <button
              onClick={handleLogoTap}
              className="relative w-11 h-11 md:w-14 md:h-14 rounded-2xl overflow-hidden border border-white/10 bg-white/5 ring-1 ring-sky-400/20 cursor-pointer focus:outline-none"
              aria-label="Secret Menu Trigger"
            >
              <img
                src={logo}
                alt="Logo"
                className="w-full h-full object-cover scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-sky-400/10 to-blue-600/20" />
            </button>

            {/* Standard link remains on the text for normal home navigation */}
            <Link to="/" className="leading-tight">
              <h1 className="text-white font-bold text-sm md:text-[22px]">
                Modern Acts Church
              </h1>
              <p className="text-slate-400 text-xs">
                Faith • Worship • Community
              </p>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <a key={item.id} href={item.href} className={linkClass(item.id)}>
                {item.label}
              </a>
            ))}

            {showMinistries && (
              <Link to="/ministries" className={linkClass("ministries")}>
                Ministries
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-white w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10"
          >
            {menuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden mt-3 mb-5 p-5 rounded-3xl bg-slate-900/95 border border-white/10 flex flex-col gap-5">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={linkClass(item.id)}
              >
                {item.label}
              </a>
            ))}

            {showMinistries && (
              <Link
                to="/ministries"
                onClick={() => setMenuOpen(false)}
                className={linkClass("ministries")}
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