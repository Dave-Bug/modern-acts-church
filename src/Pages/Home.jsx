import Navbar from "../component/layout/Navbar";
import Hero from "../component/home/Hero";
import About from "../component/home/About";
import ServiceSchedule from "../component/home/ServiceSchedule";
import Footer from "../component/layout/Footer";

export default function Home() {
  return (
    <main className="relative">
      <Navbar />
      <Hero />
      <About />
      <ServiceSchedule />
    </main>
  );
}