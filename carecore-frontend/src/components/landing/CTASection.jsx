import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";

export default function CTASection() {
  return (
    <section className="py-24 px-6" style={{ background: "#f8fafc" }}>
      <div className="max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Ready to get started?</h2>
          <p className="text-muted-foreground text-lg mb-8">
            Transform your care management with AI-powered tools built for the sector.
          </p>
          <Button onClick={() => base44.auth.redirectToLogin("/auth-redirect")} size="lg" className="text-lg px-10 py-6 rounded-xl font-semibold shadow-lg shadow-primary/25" style={{ background: "linear-gradient(135deg, #4B8BF5, #6aa8ff)" }}>
            Log In to Your Account
          </Button>
          <p className="text-muted-foreground text-sm mt-6">
            Access is by invitation only. Contact your administrator if you do not have login credentials.
          </p>
        </motion.div>
      </div>
    </section>
  );
}