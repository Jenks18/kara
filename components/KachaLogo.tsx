import Image from 'next/image'

interface KachaLogoProps {
  /** 'icon' = K mark only, 'full' = wordmark only, 'inline' = K mark + "Kacha" text */
  variant?: 'icon' | 'full' | 'inline'
  /** Size of the icon container in px (icon/inline variants) */
  size?: number
  /** Background color for the icon circle. Defaults to #88e7fa */
  iconBg?: string
  /** Text color for "Kacha" label in inline variant */
  textClassName?: string
  className?: string
  /** Use a white background instead of the brand cyan — for use on dark/colored backgrounds */
  onDark?: boolean
}

export function KachaLogo({
  variant = 'inline',
  size = 32,
  iconBg,
  textClassName = 'text-gray-900',
  className = '',
  onDark = false,
}: KachaLogoProps) {
  const bg = iconBg ?? (onDark ? 'rgba(255,255,255,0.18)' : '#88e7fa')

  const IconMark = () => (
    <div
      className="flex items-center justify-center flex-shrink-0 rounded-full overflow-hidden"
      style={{ width: size, height: size, background: bg }}
    >
      <Image
        src="/logo-icon.png"
        alt="Kacha"
        width={size}
        height={size}
        className="object-contain"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )

  if (variant === 'icon') {
    return (
      <div className={className}>
        <IconMark />
      </div>
    )
  }

  if (variant === 'full') {
    return (
      <div
        className={`flex items-center justify-center rounded-xl overflow-hidden ${className}`}
        style={{ background: bg, padding: '6px 12px' }}
      >
        <Image
          src="/logo-full.png"
          alt="Kacha"
          width={120}
          height={40}
          className="object-contain"
          style={{ height: 40, width: 'auto' }}
        />
      </div>
    )
  }

  // inline: icon circle + text
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <IconMark />
      <span className={`font-bold tracking-tight ${textClassName}`} style={{ fontSize: size * 0.65 }}>
        Kacha
      </span>
    </div>
  )
}
