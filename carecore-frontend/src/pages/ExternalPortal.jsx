import { useOutletContext } from "react-router-dom";
import { FileText, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ExternalPortal() {
  const { user } = useOutletContext();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl p-8">
        <h1 className="text-2xl font-bold">Welcome {user?.full_name || "Guest"}</h1>
        <p className="text-muted-foreground mt-1">You have access to records for your linked residents.</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Shared Records
        </h2>
        <p className="text-sm text-muted-foreground">No records have been shared with you yet. Your administrator will approve records for your access.</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          Messages
        </h2>
        <Button variant="outline" className="w-full rounded-xl">
          Message Key Worker
        </Button>
      </div>
    </div>
  );
}