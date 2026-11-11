import { Hero, Marquee, Nav, Problem, ProductShot } from "@/components/landing/hero";
import { Story } from "@/components/landing/story";
import { Architecture, Bento, CTA, FAQ, Footer, Principles, Scenario, Security, Workforce } from "@/components/landing/sections";

export default function Home() {
  return (
    <div className="min-h-dvh bg-bg">
      <Nav />
      <Hero />
      <Marquee />
      <ProductShot />
      <Problem />
      <Story />
      <Architecture />
      <Bento />
      <Security />
      <Workforce />
      <Scenario />
      <Principles />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
}
