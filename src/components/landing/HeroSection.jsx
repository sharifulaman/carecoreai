import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden" style={{ background: "linear-gradient(135deg, #0b1220 0%, #0f1a2e 50%, #0b1220 100%)" }}>
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-[0.04] animate-pulse-slow" style={{ background: "radial-gradient(circle, #6aa8ff, transparent)" }} />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full opacity-[0.03] animate-float" style={{ background: "radial-gradient(circle, #4B8BF5, transparent)", animationDelay: "2s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.02]" style={{ background: "radial-gradient(circle, #6aa8ff, transparent)" }} />
      </div>

      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-5">
        <img src="https://media.base44.com/images/public/69e8b95bf83622ae112de61e/19a08dc3f_ChatGPTImageMay8202612_06_51PM.png" alt="CareCore AI" className="h-16 md:h-20 w-auto object-contain" />
        <Button onClick={() => base44.auth.redirectToLogin("/auth-redirect")} variant="outline" className="border-white/20 text-white hover:bg-white/10 hover:text-white backdrop-blur-sm">
          Log In
        </Button>
      </nav>

      {/* Hero content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="mb-8" />

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm mb-8">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-white/70 text-sm font-medium">Next Generation Platform</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight tracking-tight">
            The Next Generation
            <br />
            <span style={{ color: "#6aa8ff" }}>Care Management</span>
            <br />
            Platform
          </h1>

          <p className="mt-6 text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
            Designed for children's homes, supported accommodation, and adult care homes. AI-powered. Ofsted and CQC ready.
          </p>

          <div className="mt-10">
            <Button onClick={() => base44.auth.redirectToLogin("/auth-redirect")} size="lg" className="text-lg px-10 py-6 rounded-xl font-semibold shadow-lg shadow-primary/25" style={{ background: "linear-gradient(135deg, #4B8BF5, #6aa8ff)" }}>
              Log In to Your Account
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        <div className="flex flex-col items-center gap-2 text-white/30">
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <ChevronDown className="w-5 h-5 animate-bounce" />
        </div>
      </motion.div>
    </section>
  );
}