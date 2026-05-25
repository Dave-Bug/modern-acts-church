import { FaChurch } from "react-icons/fa";
import Container from "./Container";

export default function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-slate-900/40 backdrop-blur-xl border-b border-white/10">

      <Container>

        <div className="flex items-center justify-between h-20">

          {/* Logo */}
          <div className="flex items-center gap-4">

            <div className="bg-gradient-to-br from-sky-400 to-blue-600 p-3 rounded-2xl shadow-lg">
              <FaChurch className="text-white text-xl" />
            </div>

            <div>
              <h1 className="text-white font-bold text-2xl tracking-wide">
                Modern Acts Church Olongapo
              </h1>

              <p className="text-slate-400 text-sm">
                Faith • Worship • Community
              </p>
            </div>

          </div>

          {/* Nav */}
          <div className="hidden md:flex items-center gap-8 text-white font-medium">

            <a href="#home" className="hover:text-sky-400 transition">
              Home
            </a>

            <a href="#about" className="hover:text-sky-400 transition">
              About
            </a>

            <a href="#services" className="hover:text-sky-400 transition">
              Services
            </a>

            <button className="bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-3 rounded-full font-semibold hover:scale-105 transition duration-300 shadow-xl">
              Visit Us
            </button>

          </div>

        </div>

      </Container>

    </nav>
  );
}