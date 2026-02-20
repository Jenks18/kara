interface KachaLogoProps {
  /**
   * 'inline' — full wordmark (K + "Kacha" text) using logo-combined.png, best for navbars
   * 'icon'   — square K icon using logo-url.png, best for avatars / small badges
   */
  variant?: 'inline' | 'icon'
  /** Height in px for the icon variant. Inline variant sizes itself naturally to fill its container. */
  height?: number
  /** Extra class names on the wrapper element */
  className?: string
}

export function KachaLogo({
  variant = 'inline',
  height = 40,
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

  // inline: render the combined wordmark at its natural proportions — size via className (e.g. h-10 w-auto)
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-combined.png"
      alt="Kacha"
      style={{ flexShrink: 0 }}
      className={className}
    />
  )
}
