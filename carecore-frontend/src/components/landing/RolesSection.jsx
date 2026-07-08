import { motion } from "framer-motion";
import { ShieldCheck, Users, UserCheck, Heart } from "lucide-react";

const roles = [
  { icon: ShieldCheck, title: "Admin", desc: "Full organisational control — manage homes, staff, compliance, finances, and system configuration." },
  { icon: Users, title: "Team Leader", desc: "Oversee your team's work — review reports, manage risk escalations, and track compliance for your homes." },
  { icon: UserCheck, title: "Support Worker", desc: "Focus on care delivery — AI-assisted reports, daily logs, health tracking, and direct resident support." },
  { icon: Heart, title: "Residents", desc: "A friendly, accessible portal — view appointments, activities, and communicate with your key worker." },
];

export default function RolesSection() {
  return (
    <section className="py-24 px-6" style={{ background: "#0b1220" }}>
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white">Designed for Every Person in Your Organisation</h2>
          <p className="mt-4 text-white/50 text-lg">Role-based access ensures everyone sees exactly what they need.</p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {roles.map((r, i) => (
            <motion.div
              key={r.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl p-6 border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "linear-gradient(135deg, #4B8BF520, #6aa8ff20)" }}>
                <r.icon className="w-6 h-6" style={{ color: "#6aa8ff" }} />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{r.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{r.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}