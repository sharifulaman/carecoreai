import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function PhotoUpload({ currentUrl, onUploaded, size = "md" }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef();

  const sizes = {
    sm: "w-10 h-10 text-sm",
    md: "w-16 h-16 text-xl",
    lg: "w-24 h-24 text-3xl",
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Only JPG, PNG or WEBP accepted");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Max file size is 5MB");
      return;
    }
    setUploading(true);
    setProgress(30);
    try {
      setProgress(60);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setProgress(100);
      onUploaded(file_url);
      toast.success("Photo uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="relative group cursor-pointer" onClick={() => !uploading && inputRef.current?.click()}>
      <div className={`${sizes[size]} rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-border group-hover:border-primary transition-colors`}>
        {uploading ? (
          <div className="flex flex-col items-center gap-0.5">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-[8px] text-primary">{progress}%</span>
          </div>
        ) : currentUrl ? (
          <img src={currentUrl} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <Camera className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        )}
      </div>
      {!uploading && (
        <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Camera className="w-4 h-4 text-white" />
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
    </div>
  );
}