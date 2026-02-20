interface KachaLogoProps {
  /** 'icon' = K mark only, 'inline' = K mark + "Kacha" text */
  variant?: 'icon' | 'inline'
  /** Diameter of the icon circle in px */
  size?: number
  /** Background color for the icon circle. Defaults to #88e7fa */
  iconBg?: string
  /** Extra class names on the outer wrapper */
  className?: string
  /** Text colour class for the "Kacha" label (inline variant only) */
  textClassName?: string
  /** True when placed on a dark/coloured background — uses a semi-white circle */
  onDark?: boolean
}

export function KachaLogo({
  variant = 'inline',
  size = 32,
  iconBg,
  className = '',
  textClassName = 'text-gray-900',
  onDark = false,
}: KachaLogoProps) {
  const bg = iconBg ?? (onDark ? 'rgba(255,255,255,0.20)' : '#88e7fa')
  // inner image occupies 75% of the circle so there's a visible border effect
  const imgSize = Math.round(size * 0.75)

  const IconMark = () => (
    <span
      aria-hidden
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: '50%',
        background: bg,
        overflow: 'hidden',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-icon.png"
        alt=""
        width={imgSize}
        height={imgSize}
        style={{
          width: imgSize,
          height: imgSize,
          objectFit: 'contain',
          // Force the K to render as white so it pops on any bg colour
          filter: 'brightness(0) invert(1)',
        }}
      />
    </span>
  )

  if (variant === 'icon') {
    return (
      <span className={className}>
        <IconMark />
      </span>
    )
  }

  // inline: circle icon + wordmark text
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <IconMark />
      <span
        className={`font-bold tracking-tight leading-none ${textClassName}`}
        style={{ fontSize: Math.round(size * 0.62) }}
      >
        Kacha
      </span>
    </span>
  )
}
