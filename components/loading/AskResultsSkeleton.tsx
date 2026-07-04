type AskResultsSkeletonProps = {
  variant?: "page" | "inline";
};

export function AskResultsSkeleton({ variant }: AskResultsSkeletonProps = {}) {
  return (
    <div
      className="ask-loader-overlay ask-loader-overlay-visible"
      role="status"
      aria-live="polite"
    >
      <div className="ask-loader-pop">
        <div className="sparkle-wrap" aria-hidden="true">
          <svg className="sparkle-main" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2C12 2 13.5 8.5 15 10C16.5 11.5 22 12 22 12C22 12 16.5 12.5 15 14C13.5 15.5 12 22 12 22C12 22 10.5 15.5 9 14C7.5 12.5 2 12 2 12C2 12 7.5 11.5 9 10C10.5 8.5 12 2 12 2Z"
              fill="currentColor"
            />
          </svg>
        </div>
        <p className="ask-loader-text">Sit back while we find your best card</p>
      </div>
    </div>
  );
}

