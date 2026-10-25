import { useCallback, useEffect, useState } from 'react'

const read = () => { try { return localStorage.getItem('pramaan.theme') !== 'light' } catch { return true } }

export function useTheme() {
  const [dark, setDark] = useState(read)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try { localStorage.setItem('pramaan.theme', dark ? 'dark' : 'light') } catch { /* ignore */ }
  }, [dark])
  const toggle = useCallback(() => setDark((d) => !d), [])
  return { dark, toggle }
}
