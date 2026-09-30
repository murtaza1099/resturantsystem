import { useRef, useCallback } from "react";

const useDebounceFunction = <T extends (...args: any[]) => void>(callback: T, delay: number) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback((...args: Parameters<T>) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
};

export default useDebounceFunction;
