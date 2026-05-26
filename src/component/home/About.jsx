import Container from "../layout/Container";
import { FaHeart, FaBible, FaHandsHelping } from "react-icons/fa";

const values = [
  {
    icon: <FaHeart size={24} />,
    title: "Love God",
    description:
      "We exist to worship God with all our hearts, living a life fully devoted to Him in every area.",
  },
  {
    icon: <FaHandsHelping size={24} />,
    title: "Love People",
    description:
      "We are called to love others sincerely, serving with humility, kindness, and compassion.",
  },
  {
    icon: <FaBible size={24} />,
    title: "Make Disciples",
    description:
      "We grow and guide others in faith, helping people follow Jesus and live out His Word daily.",
  },
];

export default function About() {
  return (
   <section
  id="about"
  className="relative min-h-screen flex items-center py-24 bg-slate-950 overflow-hidden"
>
      {/* Background Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-sky-500/5 rounded-full blur-[120px]" />

      <Container className="relative z-10 w-full">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Left Column — Image */}
          <div className="relative group">
            <div className="relative rounded-3xl overflow-hidden aspect-[4/5] max-w-md mx-auto lg:mx-0">
              <img
                src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=1932&auto=format&fit=crop"
                alt="Church community gathering"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
              
              {/* Floating Badge */}
              <div className="absolute bottom-6 left-6 right-6 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
                <p className="text-sky-400 font-semibold text-sm uppercase tracking-wider mb-1">Est. 2023</p>
                <p className="text-white font-bold text-lg">Growing in Faith Together</p>
              </div>
            </div>
            
            {/* Decorative Frame */}
            <div className="absolute -top-4 -right-4 w-full h-full border-2 border-sky-500/20 rounded-3xl -z-10" />
          </div>

          {/* Right Column — Content */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-[2px] bg-sky-400 rounded-full" />
              <p className="uppercase tracking-[0.2em] text-sky-400 font-semibold text-xs">
                Who We Are
              </p>
            </div>

            <h2 className="text-4xl md:text-5xl font-black text-white leading-tight mb-6">
              A Church That
              <span className="text-sky-400"> Feels Like Home</span>
            </h2>

            <p className="text-slate-400 text-lg leading-relaxed mb-8">
              Modern Acts Church is a vibrant community in Olongapo City dedicated to 
              creating an environment where everyone can encounter God, grow in faith, 
              and build meaningful relationships. We believe church should be a place 
              of hope, healing, and transformation.
            </p>

            <p className="text-slate-400 text-lg leading-relaxed mb-12">
              Whether you're exploring faith for the first time or looking for a church 
              family to call home, you'll find open arms and authentic community here.
            </p>

            {/* Values Grid */}
            <div className="space-y-6">
              {values.map((value, index) => (
                <div
                  key={index}
                  className="flex gap-5 group"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500/10 to-blue-600/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:from-sky-500 group-hover:to-blue-600 group-hover:text-white transition-all duration-300">
                    {value.icon}
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg mb-1">{value.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{value.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}