export function NoTextBanner() {
  return (
    <div
      role="alert"
      className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <p className="font-medium">No text extracted from this PDF</p>
      <p className="mt-1 text-amber-800/90">
        AI features need readable text. Re-upload a text-based PDF (not a scanned image-only
        file) from the dashboard.
      </p>
    </div>
  );
}
