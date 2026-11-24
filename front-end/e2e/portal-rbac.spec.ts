import { test, expect } from '@playwright/test';

test.describe('E2E: Actor Portal Landing and RBAC Boundaries', () => {
  const actors = [
    {
      name: 'Traveler',
      role: 'traveler',
      email: 'Arjun@gmail.com',
      password: 'traveler123',
      portal: '/traveler/dashboard',
      forbiddenPortal: '/admin/dashboard',
    },
    {
      name: 'Guide',
      role: 'guide',
      email: 'Devansh@gmail.com',
      password: 'guide123',
      portal: '/guide/dashboard',
      forbiddenPortal: '/traveler/dashboard',
    },
    {
      name: 'Agency',
      role: 'agency',
      email: 'ops@horizontravel.com',
      password: 'horizon123',
      portal: '/agency/dashboard',
      forbiddenPortal: '/traveler/dashboard',
    },
    {
      name: 'Support',
      role: 'support',
      email: 'Aisha.johnson@gmail.com',
      password: 'support123',
      portal: '/support/dashboard',
      forbiddenPortal: '/traveler/dashboard',
    },
    {
      name: 'Admin',
      role: 'admin',
      email: 'admin@ticp.com',
      password: 'admin123',
      portal: '/admin/dashboard',
      forbiddenPortal: '/super/dashboard',
    },
    {
      name: 'Super Admin',
      role: 'superuser',
      email: 'superadmin@ticp.com',
      password: 'super123',
      portal: '/super/dashboard',
      forbiddenPortal: null,
    },
  ];

  for (const actor of actors) {
    test(`logs in as ${actor.name} (${actor.role}), lands on ${actor.portal}, and verifies boundaries`, async ({ page }) => {
      // 1. Visit Login page
      await page.goto('/login');

      // 2. Select actor button
      const actorBtn = page.getByTestId(`actor-btn-${actor.role}`);
      await actorBtn.click();

      // 3. Submit Login Form
      const submitBtn = page.locator('button[type="submit"]');
      await submitBtn.click();

      // 4. Verify user lands on their designated portal
      await page.waitForURL(`**${actor.portal}`, { timeout: 10000 });
      expect(page.url()).toContain(actor.portal);

      // 5. Verify boundary: attempting to navigate to a forbidden portal redirects to /unauthorized
      if (actor.forbiddenPortal) {
        await page.goto(actor.forbiddenPortal);
        await page.waitForURL('**/unauthorized', { timeout: 10000 });
        expect(page.url()).toContain('/unauthorized');
      }
    });
  }
});
