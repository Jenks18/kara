interface KachaLogoProps {
  /**
   * 'inline' — full wordmark (K + "Kacha" text) using logo-combined.png, best for navbars
   * 'icon'   — square K icon using logo-url.png, best for avatars / small badges
   */
  variant?: 'inline' | 'icon'
  /** Height of the logo in px. Width is calculated from the image's natural aspect ratio. */
  height?: number
  /** Extra class names on the wrapper element */
  className?: string
}

export function KachaLogo({
  variant = 'inline',
  height = 36,
  className = '',
}: KachaLogoProps) {
  if (variant === 'icon') {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/logo-url.png"
        alt="Kacha"
        height={height}
        width={height}
        style={{ height, width: height, objectFit: 'contain', flexShrink: 0 }}
        className={className}
      />
    )
  }

  // inline: full combined wordmark (K mark + "Kacha" text) — natural aspect ratio 461:259 ≈ 1.78
  const width = Math.round(height * (461 / 259))
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-combined.png"
      alt="Kacha"
      height={height}
      width={width}
      style={{ height, width: 'auto', objectFit: 'contain', flexShrink: 0 }}
      className={className}
    />
  )
}
