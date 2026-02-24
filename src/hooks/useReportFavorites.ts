import { useState, useCallback } from "react";

export function useReportFavorites(tenantId: string) {
  const key = `report-favorites-${tenantId}`;

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(key) || "[]");
    } catch {
      return [];
    }
  });

  const toggleFavorite = useCallback((reportId: string) => {
    setFavorites((prev) => {
      const next = prev.includes(reportId)
        ? prev.filter((id) => id !== reportId)
        : [...prev, reportId];
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  }, [key]);

  const isFavorite = useCallback((reportId: string) => favorites.includes(reportId), [favorites]);

  return { favorites, toggleFavorite, isFavorite };
}
