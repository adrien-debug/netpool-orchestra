import { Hero } from "@/components/hero";
import { Features } from "@/components/features";
import { Agents } from "@/components/agents";
import { Pricing } from "@/components/pricing";
import { Download } from "@/components/download";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Agents />
        <Pricing />
        <Download />
      </main>
      <Footer />
    </>
  );
}
