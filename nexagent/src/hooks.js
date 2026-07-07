import { useEffect, useRef, useState } from 'react'

// Liefert true, sobald das Element ins Blickfeld scrollt (einmalig).
export function useInView(options = { threshold: 0.25 }) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || inView) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true)
        obs.disconnect()
      }
    }, options)
    obs.observe(el)
    return () => obs.disconnect()
  }, [inView])

  return [ref, inView]
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

// Hash-basiertes Routing: '' (Startseite), 'intern', 'impressum', 'datenschutz'
export function useHashRoute() {
  const [route, setRoute] = useState(() => window.location.hash.replace('#', ''))
  useEffect(() => {
    const onHash = () => setRoute(window.location.hash.replace('#', ''))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  return route
}
