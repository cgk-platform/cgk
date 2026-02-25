import { useEffect, useRef } from 'react'

export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  options: { metaKey?: boolean; ctrlKey?: boolean } = {}
) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const metaMatch = options.metaKey ? e.metaKey || e.ctrlKey : true
      const ctrlMatch = options.ctrlKey ? e.ctrlKey : true

      if (e.key.toLowerCase() === key.toLowerCase() && metaMatch && ctrlMatch) {
        e.preventDefault()
        callbackRef.current()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [key, options.metaKey, options.ctrlKey])
}
