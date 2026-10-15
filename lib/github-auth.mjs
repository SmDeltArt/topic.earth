// Informational UI state. Server handlers independently enforce permissions.
export const GitHubAuth = {
  user: null,
  async refresh() {
    try {
      const response = await fetch('/api/identity', { cache: 'no-store', credentials: 'same-origin' });
      this.user = response.ok ? (await response.json()).user : null;
    } catch { this.user = null; }
    window.dispatchEvent(new CustomEvent('topicIdentityChanged'));
    return this.user;
  },
  async submit(action) {
    const response = await fetch('/api/auth/csrf', { cache: 'no-store', credentials: 'same-origin' });
    if (!response.ok) throw new Error('GitHub authentication is not configured yet.');
    const { csrfToken } = await response.json();
    if (!csrfToken) throw new Error('Could not start authentication.');
    const form = document.createElement('form'); form.method = 'POST'; form.action = `/api/auth/${action}`;
    for (const [name, value] of Object.entries({ csrfToken, callbackUrl: location.origin })) {
      const input = document.createElement('input'); input.type = 'hidden'; input.name = name; input.value = value; form.append(input);
    }
    document.body.append(form); form.submit();
  },
  signIn() { return this.submit('signin/github'); },
  signOut() { return this.submit('signout'); }
};
