import { motion } from "framer-motion";
import { Brain, ShieldCheck, BarChart3 } from "lucide-react";

const features = [
  { icon: Brain, title: "AI-Powered Reports", desc: "Generate professional visit reports, daily logs, and handover summaries using advanced AI — saving hours of administrative work." },
  { icon: ShieldCheck, title: "Full Compliance Management", desc: "Built-in Ofsted and CQC frameworks with automated alerts, fire safety checks, and audit-ready documentation." },
  { icon: BarChart3, title: "Real-Time Dashboards", desc: "Live insights across your entire organisation — risk levels, attendance, health appointments, and staff compliance at a glance." },
];

export default function FeaturesSection() {
  return (
    <section className="py-24 px-6" style={{ background: "#f8fafc" }}>
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">Built for the Care Sector</h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
            Everything your organisation needs to deliver outstanding care, in one platform.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="relative group"
            >
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-border/50 hover:shadow-lg hover:border-primary/20 transition-all duration-300 h-full">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6" style={{ background: "linear-gradient(135deg, #4B8BF5, #6aa8ff)" }}>
                  <f.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}