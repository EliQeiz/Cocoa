type BuildProofBrandProps = {
  className?: string;
  compact?: boolean;
  inverse?: boolean;
};

export function BuildProofBrand({ className = "", compact = false, inverse = false }: BuildProofBrandProps) {
  return (
    <div className={`buildproof-brand ${compact ? "is-compact" : ""} ${inverse ? "is-inverse" : ""} ${className}`.trim()} aria-label="BuildProof by AuraFlow">
      <svg className="buildproof-mark" viewBox="0 0 40 40" aria-hidden="true">
        <path d="M4 14.5 20 5l16 9.5H4Z" />
        <path d="M7 16.5h26M9 32.5h22M6 36h28" />
        <path d="M11 18.5v12M17 18.5v12M23 18.5v12M29 18.5v12" />
      </svg>
      <span className="buildproof-wordmark">
        <strong>BuildProof</strong>
        <small>by AuraFlow</small>
      </span>
    </div>
  );
}
