import { useState, useEffect } from 'react';

/**
 * useDebounce - Custom React Hook pour temporiser la valeur d'une entrée de recherche
 * ou de filtre afin d'éviter les rendus et calculs inutiles.
 * 
 * @param value Valeur à temporiser (ex: terme de recherche)
 * @param delay Délai en millisecondes (défaut: 250ms)
 * @returns Valeur stabilisée après expiration du délai
 */
export function useDebounce<T>(value: T, delay = 250): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
