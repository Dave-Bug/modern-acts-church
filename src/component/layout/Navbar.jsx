
import { useEffect, useState } from "react";

import {
  FaChurch,
  FaBars,
  FaTimes,
} from "react-icons/fa";

import {
  Link,
  useLocation,
} from "react-router-dom";

import Container from "./Container";

export default function Navbar() {
  const location = useLocation();

  const [active, setActive] = useState("home");
  const [typed, setTyped] = useState("");
  const [showMinistries, setShowMinistries] =
    useState(false);

  const [menuOpen, setMenuOpen] =
    useState(false);

  // Scroll Active Detection
  useEffect(() => {
    if (
      location.pathname === "/ministries"
    ) {
      setActive("ministries");
      return;
    }

    const sections = [
      "home",
      "about",
      "services",
    ];

    const handleScroll = () => {
      let current = "home";

      sections.forEach((id) => {
        const el =
          document.getElementById(id);

        if (el) {
          const top =
            el.getBoundingClientRect().top;

          if (top <= 150) {
            current = id;
          }
        }
      });

      setActive(current);
    };

    window.addEventListener(
      "scroll",
      handleScroll
    );

    handleScroll();

    return () =>
      window.removeEventListener(
        "scroll",
        handleScroll
      );
  }, [location.pathname]);

  // Secret Ministries Unlock
  useEffect(() => {
    const targetWord = "maco";

    const handleKeyDown = (e) => {
      const char = e.key.toLowerCase();

      if (/^[a-z0-9]$/.test(char)) {
        const newTyped = typed + char;

        setTyped(newTyped);

        if (
          newTyped.endsWith(targetWord)
        ) {
          setShowMinistries(true);
          setTyped("");
        }

        if (
          newTyped.length >
          targetWord.length
        ) {
          setTyped(
            newTyped.slice(
              -targetWord.length
            )
          );
        }
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () =>
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
  }, [typed]);

  const linkClass = (id) =>
    `relative px-2 py-1 transition font-medium ${
      active === id
        ? "text-sky-400"
        : "text-white hover:text-sky-400"
    }`;

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-slate-950/70 backdrop-blur-xl border-b border-white/10">
      <Container>
        <div className="flex items-center justify-between h-16 md:h-20">

          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-3"
          >
            <div className="bg-gradient-to-br from-sky-400 to-blue-600 p-2.5 md:p-3 rounded-2xl shadow-lg">
              <FaChurch className="text-white text-lg md:text-xl" />
            </div>

            <div>
              <h1 className="text-white font-bold text-sm sm:text-lg md:text-2xl tracking-wide leading-tight">
                Modern Acts Church
              </h1>

              <p className="text-slate-400 text-[10px] sm:text-xs md:text-sm">
                Faith • Worship • Community
              </p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">

            <a
              href="/#home"
              className={linkClass("home")}
            >
              Home

              {active === "home" && (
                <span className="absolute left-0 -bottom-1 w-full h-[2px] bg-sky-400 rounded-full" />
              )}
            </a>

            <a
              href="/#about"
              className={linkClass("about")}
            >
              About

              {active === "about" && (
                <span className="absolute left-0 -bottom-1 w-full h-[2px] bg-sky-400 rounded-full" />
              )}
            </a>

            <a
              href="/#services"
              className={linkClass(
                "services"
              )}
            >
              Services

              {active === "services" && (
                <span className="absolute left-0 -bottom-1 w-full h-[2px] bg-sky-400 rounded-full" />
              )}
            </a>

            {showMinistries && (
              <Link
                to="/ministries"
                className={linkClass(
                  "ministries"
                )}
              >
                Ministries

                {active ===
                  "ministries" && (
                  <span className="absolute left-0 -bottom-1 w-full h-[2px] bg-sky-400 rounded-full" />
                )}
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() =>
              setMenuOpen(!menuOpen)
            }
            className="md:hidden text-white text-xl"
          >
            {menuOpen ? (
              <FaTimes />
            ) : (
              <FaBars />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden flex flex-col gap-5 pb-6 pt-2 text-white">

            <a
              href="/#home"
              onClick={() =>
                setMenuOpen(false)
              }
              className={linkClass("home")}
            >
              Home
            </a>

            <a
              href="/#about"
              onClick={() =>
                setMenuOpen(false)
              }
              className={linkClass("about")}
            >
              About
            </a>

            <a
              href="/#services"
              onClick={() =>
                setMenuOpen(false)
              }
              className={linkClass(
                "services"
              )}
            >
              Services
            </a>

            {showMinistries && (
              <Link
                to="/ministries"
                onClick={() =>
                  setMenuOpen(false)
                }
                className={linkClass(
                  "ministries"
                )}
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

