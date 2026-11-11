export default function NotFound() {
  return (
    <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-20 text-center">
      <div className="w-24 h-24 rounded-[28px] bg-primary/10 border border-primary/20 flex items-center justify-center mb-8 shadow-sm">
        <svg
          className="h-10 w-10 text-primary"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m13.5 8.5-5 5" />
          <path d="m8.5 8.5 5 5" />
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>

      <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 mb-2">
        404
      </h1>
      <h2 className="text-2xl font-bold tracking-tight text-slate-800 mb-4">
        Page Not Found
      </h2>

      <p className="max-w-md text-[15px] font-medium text-slate-500 leading-relaxed mx-auto">
        The page you are looking for might have been removed, had its name
        changed, or is temporarily unavailable.
      </p>

      <a
        href="/"
        className="mt-10 inline-flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-[15px] font-bold tracking-wide text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md group"
      >
        Return to Hub
        <svg
          className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </a>
    </div>
  );
}
