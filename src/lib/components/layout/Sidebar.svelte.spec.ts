import { page as browserPage } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Sidebar from './Sidebar.svelte';

// Mock SvelteKit page state
vi.mock('$app/state', () => ({
  page: {
    url: new URL('http://localhost/chat')
  }
}));

describe('Sidebar RBAC', () => {
  const baseUser = {
    name: 'Test User',
    email: 'test@hrag.local',
    isAdmin: false,
    isCompliance: false
  };

  it('hides Administration section for regular users', async () => {
    render(Sidebar, { user: baseUser });
    await expect.element(browserPage.getByText('Administration')).not.toBeInTheDocument();
    await expect.element(browserPage.getByText('Users & Groups')).not.toBeInTheDocument();
  });

  it('shows Administration section for admins', async () => {
    render(Sidebar, { user: { ...baseUser, isAdmin: true } });
    await expect.element(browserPage.getByText('Administration')).toBeInTheDocument();
    await expect.element(browserPage.getByText('Users & Groups')).toBeInTheDocument();
    await expect.element(browserPage.getByText('Audit Vault')).toBeInTheDocument();
  });

  it('hides Audit Vault for compliance users who are not admins', async () => {
    render(Sidebar, { user: { ...baseUser, isCompliance: true } });
    await expect.element(browserPage.getByText('Administration')).not.toBeInTheDocument();
    await expect.element(browserPage.getByText('Audit Vault')).not.toBeInTheDocument();
  });

  it('shows Audit Vault for admin + compliance', async () => {
     render(Sidebar, { user: { ...baseUser, isAdmin: true, isCompliance: true } });
     await expect.element(browserPage.getByText('Audit Vault')).toBeInTheDocument();
  });
});
