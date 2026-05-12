import { motion } from "framer-motion";
import { FileText, Shield, ClipboardList, Building2, Heart, GraduationCap } from "lucide-react";

const modules = [
  { icon: FileText, title: "Visit & Outreach Reports", desc: "AI-generated professional narratives from simple form inputs." },
  { icon: Shield, title: "Risk Assessment", desc: "Category-based risk tracking with AI pattern detection." },
  { icon: ClipboardList, title: "Daily Logs & Handovers", desc: "Continuous care records with automated shift summaries." },
  { icon: Building2, title: "Fire Safety & House Checks", desc: "Daily, weekly, and monthly compliance checklists." },
  { icon: Heart, title: "Health & Appointments", desc: "Full health profiles, medication tracking, and appointment management." },
  { icon: GraduationCap, title: "Education & College", desc: "Attendance monitoring, PEP tracking, and progress recording." },
];

export default function ModulesSection() {
  return (
    <section className="py-24 px-6" style={{ background: "#f8fafc" }}>
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">Everything Your Organisation Needs</h2>
          <p className="mt-4 text-muted-foreground text-lg">13 integrated modules covering every aspect of care delivery.</p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((m, i) => (
            <motion.div
              key={m.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-white rounded-xl p-6 border border-border/50 hover:shadow-md transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform" style={{ background: "linear-gradient(135deg, #4B8BF5, #6aa8ff)" }}>
                  <m.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{m.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{m.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-muted-foreground text-sm mt-8 italic">
          More modules coming — this platform grows with your organisation.
        </p>
      </div>
    </section>
  );
}