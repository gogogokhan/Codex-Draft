"use client";

import { useState, useEffect, useCallback } from 'react';

// Tarayıcıda olup olmadığımızı kontrol et
const isBrowser = typeof window !== 'undefined';

export function usePersistentState<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const getInitialValue = useCallback((): T => {
    // Tarayıcıda değilsek, başlangıç değerini döndür
    if (!isBrowser) {
      return initialValue;
    }

    try {
      // localStorage'dan kaydedilmiş değeri al
      const item = window.localStorage.getItem(key);
      // Değer varsa JSON'dan parse et, yoksa başlangıç değerini kullan
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // Hata durumunda başlangıç değerini kullan ve hatayı logla
      console.warn(`Error reading localStorage key “${key}”:`, error);
      return initialValue;
    }
  }, [key, initialValue]);

  // State'i, localStorage'dan gelen değerle başlat
  const [storedValue, setStoredValue] = useState<T>(getInitialValue);

  // Değeri hem state'e hem de localStorage'a set eden fonksiyon
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      setStoredValue(currentStoredValue => {
        const valueToStore = value instanceof Function ? value(currentStoredValue) : value;
        if (isBrowser) {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
        return valueToStore;
      });
    } catch (error) {
      console.warn(`Error setting localStorage key “${key}”:`, error);
    }
  }, [key]);

  return [storedValue, setValue];
}
