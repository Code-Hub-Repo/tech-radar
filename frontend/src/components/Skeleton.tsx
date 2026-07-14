interface SkeletonProps {
  shape: 'rect' | 'circle'
  width: number | string
  height: number | string
}

// Low-level shimmer primitive. Uses Tailwind's built-in animate-pulse (opacity loop) rather
// than a hand-rolled gradient-sweep keyframe — zero extra CSS, and prefers-reduced-motion is
// already handled globally: tokens.css's media query forces animation-duration/iteration-count
// to near-zero/once for every element, which neutralizes this pulse without any per-component
// suppression logic here.
export function Skeleton({ shape, width, height }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className="block animate-pulse bg-surface-raised"
      style={{
        width,
        height,
        borderRadius: shape === 'circle' ? '9999px' : '4px',
      }}
    />
  )
}
