export default function ModalSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="h-12 bg-muted rounded-lg animate-pulse" />
      <div className="space-y-3">
        <div className="h-6 bg-muted rounded-lg animate-pulse w-2/3" />
        <div className="h-4 bg-muted rounded-lg animate-pulse" />
        <div className="h-4 bg-muted rounded-lg animate-pulse w-5/6" />
      </div>
      <div className="space-y-3">
        <div className="h-6 bg-muted rounded-lg animate-pulse w-2/3" />
        <div className="h-4 bg-muted rounded-lg animate-pulse" />
        <div className="h-4 bg-muted rounded-lg animate-pulse w-5/6" />
      </div>
    </div>
  );
}