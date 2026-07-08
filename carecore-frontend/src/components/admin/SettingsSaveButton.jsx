import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function SettingsSaveButton({ loading, onClick }) {
  return (
    <Button 
      onClick={onClick} 
      disabled={loading}
      className="rounded-xl gap-2"
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {loading ? "Saving..." : "Save Settings"}
    </Button>
  );
}