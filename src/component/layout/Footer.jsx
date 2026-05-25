import Container from "./Container";
import { FaFacebook, FaInstagram, FaYoutube, FaMapMarkerAlt, FaEnvelope, FaPhone } from "react-icons/fa";

const quickLinks = [
  { label: "Home", href: "#home" },
  { label: "About Us", href: "#about" },
  { label: "Services", href: "#services" },
  { label: "Give", href: "#" },
];

const socialLinks = [
  { icon: <FaFacebook size={20} />, href: "#", label: "Facebook" },
  { icon: <FaInstagram size={20} />, href: "#", label: "Instagram" },
  { icon: <FaYoutube size={20} />, href: "#", label: "YouTube" },
];

export default function Footer() {
  return (
    <footer id="contact" className="relative bg-slate-950 border-t border-white/5 pt-20 pb-10">
      <Container>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg">
                M
              </div>
              <span className="text-white font-bold text-xl tracking-tight">
                Modern Acts Church
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed max-w-md mb-8">
              A vibrant community in Olongapo City where you can encounter God, 
              grow in faith, and build meaningful relationships. Everyone is welcome.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  aria-label={social.label}
                  className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-sky-500 hover:border-sky-500 transition-all duration-300"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold mb-6">Quick Links</h4>
            <ul className="space-y-3">
              {quickLinks.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="text-slate-400 hover:text-sky-400 transition-colors duration-300"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-white font-bold mb-6">Contact Us</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-slate-400">
                <FaMapMarkerAlt className="text-sky-400 mt-1 flex-shrink-0" size={16} />
                <span>Olongapo City, Zambales, Philippines</span>
              </li>
              <li className="flex items-center gap-3 text-slate-400">
                <FaEnvelope className="text-sky-400 flex-shrink-0" size={16} />
                <span>hello@modernacts.church</span>
              </li>
              <li className="flex items-center gap-3 text-slate-400">
                <FaPhone className="text-sky-400 flex-shrink-0" size={16} />
                <span>+63 912 345 6789</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} Modern Acts Church Olongapo. All rights reserved.
          </p>
          <p className="text-slate-600 text-sm">
            Made with love for the community
          </p>
        </div>
      </Container>
    </footer>
  );
}