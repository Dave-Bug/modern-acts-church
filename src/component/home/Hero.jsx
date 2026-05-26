import Container from "../layout/Container";

export default function Hero() {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center overflow-hidden"
    >
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center scale-110"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=2070')",
        }}
      />

      {/* Atmosphere Overlay */}
      <div className="absolute inset-0 bg-slate-900/60" />
      <div className="absolute inset-0 bg-gradient-to-r from-blue-900/30 via-transparent to-cyan-400/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

      {/* Content */}
      <Container className="relative z-10">
        <div className="max-w-5xl pl-2 md:pl-10 lg:pl-30">

          {/* Label */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-[2px] bg-sky-400" />

            <p className="uppercase tracking-[4px] text-sky-400 font-semibold text-sm">
              Modern Acts Church Olongapo
            </p>
          </div>

         {/* Main Heading */}
          <h1 className="text-white font-black leading-[0.95] mb-6 text-6xl md:text-4xl sm:text-5xl md:text-6xl lg:text-7xl lg:text-[95px]">
            A Place Where
            <span className="block text-sky-400">
              You Truly Belong
            </span>
          </h1>

          {/* Tagline */}
          <h2 className="text-white font-semibold leading-snug mb-8 text-2xl md:text-3xl lg:text-4xl">
            Come As You Are, Stay As You Grow
          </h2>

          {/* Description */}
          <p className="text-slate-100 text-lg md:text-xl leading-9 max-w-2xl mb-6">
            Step into a place of worship, encounter, and transformation —
            where lives are renewed, hearts are restored,
            and Jesus is at the center of everything we do.
          </p>

          {/* Sub spiritual line */}
          <p className="text-slate-300 text-sm md:text-base max-w-xl italic border-l-2 border-sky-400 pl-4">
            “For where two or three gather in My name, there am I with them.”
          </p>
        </div>
      </Container>

      {/* Bottom Fade */}
      <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-slate-950 to-transparent" />
    </section>
  );
}