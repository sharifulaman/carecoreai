export default function FooterSection() {
  return (
    <footer className="py-8 px-6 border-t" style={{ background: "#0b1220", borderColor: "rgba(255,255,255,0.05)" }}>
      <div className="max-w-6xl mx-auto flex flex-col items-center gap-4">
        <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm" style={{ background: "linear-gradient(135deg, #4B8BF5, #6aa8ff)" }}>
              C
            </div>
            <span className="text-white/80 font-medium">CareCore AI</span>
          </div>
          <p className="text-white/30 text-sm">&copy; {new Date().getFullYear()} CareCore AI. All rights reserved.</p>
          <p className="text-white/30 text-sm">Secure. Encrypted. GDPR Compliant.</p>
        </div>
        <div className="w-full border-t text-center pt-4 space-y-1" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <p className="text-white/50 text-xs font-medium">
            Created & Conceptualised by <span className="text-white/70 font-semibold">Morsalin Ahmed Chowdhury</span>
          </p>
          <p className="text-white/25 text-xs">
            ⚠️ This software, its concept, design, and all associated intellectual property are the exclusive property of Morsalin Ahmed Chowdhury.
            Unauthorised copying, reproduction, distribution, modification, or use of any part of this platform — in whole or in part — is strictly prohibited and may result in legal action.
          </p>
        </div>
      </div>
    </footer>
  );
}