import { motion } from "framer-motion";
import { ShieldCheck, Building2, Globe } from "lucide-react";

const badges = [
  { icon: ShieldCheck, title: "Ofsted", desc: "Children's Homes Regulations 2015" },
  { icon: Building2, title: "CQC", desc: "Care Quality Commission" },
  { icon: Globe, title: "International", desc: "Custom Compliance Framework" },
];

export default function ComplianceSection() {
  return (
    <section className="py-24 px-6" style={{ background: "#0b1220" }}>
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Built for UK Regulations. Ready for International Use.
          </h2>
          <p className="text-white/50 text-lg mb-12">
            Compliance frameworks baked into every module from the ground up.
          </p>
        </motion.div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          {badges.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="w-full sm:w-52 rounded-2xl p-6 border border-white/10 bg-white/5"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg, #4B8BF520, #6aa8ff20)" }}>
                <b.icon className="w-6 h-6" style={{ color: "#6aa8ff" }} />
              </div>
              <h3 className="text-white font-semibold text-lg">{b.title}</h3>
              <p className="text-white/40 text-sm mt-1">{b.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}