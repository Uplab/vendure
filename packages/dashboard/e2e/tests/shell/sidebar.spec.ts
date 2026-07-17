import { expect, test } from '@playwright/test';

test.describe('Dashboard shell sidebar', () => {
    test('shows the platform sidebar-toggle shortcut', async ({ page }) => {
        await page.goto('/');
        const trigger = page.locator('[data-sidebar="trigger"]').first();
        await trigger.hover();
        await expect(page.getByText(/Toggle sidebar/)).toBeVisible();
        await expect(page.getByText(/(⌘B|Ctrl\+B)/)).toBeVisible();
    });

    test('navigates with keytips and restores a collapsed sidebar', async ({ page }) => {
        await page.goto('/');
        const sidebar = page.locator('[data-slot="sidebar"]');
        await page.locator('[data-sidebar="trigger"]').first().click();
        await expect(sidebar).toHaveAttribute('data-state', 'collapsed');

        await page.keyboard.press('g');
        await expect(sidebar).toHaveAttribute('data-state', 'expanded');
        await expect(sidebar.getByText('P', { exact: true })).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(sidebar).toHaveAttribute('data-state', 'collapsed');

        await page.keyboard.press('g');
        await expect(sidebar).toHaveAttribute('data-state', 'expanded');
        await expect(sidebar).toHaveAttribute('data-state', 'collapsed', { timeout: 2_000 });

        await page.keyboard.press('g');
        await page.keyboard.press('p');
        await expect(page).toHaveURL(/\/products$/);
        await expect(sidebar).toHaveAttribute('data-state', 'collapsed');
    });

    test('does not trigger navigation while typing', async ({ page }) => {
        await page.goto('/profile');
        const firstName = page
            .locator('[data-slot="field"]')
            .filter({ hasText: 'First name' })
            .getByRole('textbox');
        await firstName.focus();
        await page.keyboard.type('gp');
        await expect(page).toHaveURL(/\/profile$/);
    });
});
