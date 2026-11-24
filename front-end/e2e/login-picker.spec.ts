import { test, expect } from '@playwright/test';

test.describe('E2E: Login Actor Picker & Credential Auto-Fill', () => {
  test('selects each of the six actors in the login picker and verifies email/password auto-fill', async ({ page }) => {
    await page.goto('/login');

    // Confirm actor picker header is displayed
    const pickerHeader = page.locator('text=Choose Actor (Academic Demo Mode)');
    await expect(pickerHeader).toBeVisible();

    const actors = [
      { key: 'traveler', name: 'Traveler', email: 'Arjun@gmail.com', password: 'traveler123' },
      { key: 'guide', name: 'Guide', email: 'Devansh@gmail.com', password: 'guide123' },
      { key: 'agency', name: 'Agency', email: 'ops@horizontravel.com', password: 'horizon123' },
      { key: 'support', name: 'Support', email: 'Aisha.johnson@gmail.com', password: 'support123' },
      { key: 'admin', name: 'Admin', email: 'admin@ticp.com', password: 'admin123' },
      { key: 'superuser', name: 'Super Admin', email: 'superadmin@ticp.com', password: 'super123' },
    ];

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[placeholder="••••••••"]');

    for (const actor of actors) {
      // Find button matching actor
      const actorBtn = page.getByTestId(`actor-btn-${actor.key}`);
      await actorBtn.click();

      // Verify email input auto-filled
      await expect(emailInput).toHaveValue(actor.email);

      // Verify password input auto-filled
      await expect(passwordInput).toHaveValue(actor.password);
    }
  });

  test('confirms the picker is hidden when VITE_SHOW_DEMO_ACCOUNTS=false', async ({ page }) => {
    // Inject flag overriding demo accounts to false
    await page.addInitScript(() => {
      (window as any).__OVERRIDE_SHOW_DEMO_ACCOUNTS__ = false;
    });

    await page.goto('/login');

    // Picker must not be in DOM
    const pickerHeader = page.locator('text=Choose Actor (Academic Demo Mode)');
    await expect(pickerHeader).toHaveCount(0);

    // Inputs should be empty initially
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveValue('');
  });
});
