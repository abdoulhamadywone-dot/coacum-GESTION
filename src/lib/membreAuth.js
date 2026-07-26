const STORAGE_KEY = "coacum_membre_session";

export const membreAuth = {
  login(membre) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(membre));
  },
  logout() {
    localStorage.removeItem(STORAGE_KEY);
  },
  getMembre() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch {
      return null;
    }
  },
  isLoggedIn() {
    return !!localStorage.getItem(STORAGE_KEY);
  },
  updateMembre(updates) {
    const current = this.getMembre();
    if (current) {
      const updated = { ...current, ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    }
    return null;
  },
};