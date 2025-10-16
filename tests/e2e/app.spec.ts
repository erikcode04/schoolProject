import { test, expect } from '@playwright/test';

test('should navigate between pages', async ({ page }) => {
    await page.goto('/');

    // Check home page
    await expect(page.locator('h1')).toContainText('Hem');
    await expect(page.locator('.navigation button')).toContainText('Hantera Items');

    // Navigate to items page
    await page.click('#nav-items');
    await expect(page.locator('h1')).toContainText('Hantera Items');

    // Check navigation back to home
    await page.click('#nav-home');
    await expect(page.locator('h1')).toContainText('Hem');
});

test('should create, edit and delete items', async ({ page }) => {
    await page.goto('/items');

    // Check no items initially
    await expect(page.locator('.no-items')).toContainText('Inga items finns ännu');

    // Create new item
    await page.fill('#name', 'Test Item');
    await page.fill('#description', 'Detta är en test beskrivning');
    await page.click('#submit-btn');

    // Verify item was created
    await expect(page.locator('.item-card')).toContainText('Test Item');
    await expect(page.locator('.item-card')).toContainText('Detta är en test beskrivning');

    // Edit the item
    await page.click('.edit-btn');
    await expect(page.locator('#name')).toHaveValue('Test Item');
    await page.fill('#name', 'Updated Test Item');
    await page.click('#submit-btn');

    // Verify item was updated
    await expect(page.locator('.item-card')).toContainText('Updated Test Item');

    // Delete the item
    page.on('dialog', dialog => dialog.accept());
    await page.click('.delete-btn');

    // Verify item was deleted
    await expect(page.locator('.no-items')).toContainText('Inga items finns ännu');
});