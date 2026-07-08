// ============================================================
// auth.js – Authentication logic
// ============================================================

const Auth = {
  SESSION_KEY: 'wms_session',

  login(username, password) {
    const user = USERS.find(u => u.username === username && u.password === password);
    if (!user) return null;
    const session = { username: user.username, role: user.role, region: user.region, displayName: user.displayName };
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    return session;
  },

  logout() {
    localStorage.removeItem(this.SESSION_KEY);
  },

  getSession() {
    try {
      return JSON.parse(localStorage.getItem(this.SESSION_KEY));
    } catch {
      return null;
    }
  },

  isLoggedIn() {
    return !!this.getSession();
  },

  isAdmin() {
    const s = this.getSession();
    return s && s.role === 'admin';
  },

  isRRM() {
    const s = this.getSession();
    return s && s.role === 'rrm';
  },

  getRegion() {
    const s = this.getSession();
    return s ? s.region : null;
  },
};
