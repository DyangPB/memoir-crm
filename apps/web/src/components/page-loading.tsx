type PageLoadingProps = {
  label?: string;
};

export function PageLoading({ label = "Fetching your memoir" }: PageLoadingProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <p className="text-caption text-ink-mute">{label}</p>
    </div>
  );
}
