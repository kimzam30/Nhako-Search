import { test, expect } from '@playwright/test';

test.describe('UI Regressions', () => {
  test('Hard Mode GridBoard fits within mobile viewport width', async ({ page }) => {
    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Standard Hard mode URL
    await page.goto('http://localhost:3002/play/standard/standard/hard');
    
    // Wait for GridBoard to render (wait for the parent div with aspect-square)
    const gridBoard = page.locator('.aspect-square.grid-board').first();
    await gridBoard.waitFor({ state: 'visible' });
    
    const boundingBox = await gridBoard.boundingBox();
    expect(boundingBox).not.toBeNull();
    if (boundingBox) {
      expect(boundingBox.width).toBeLessThanOrEqual(375);
    }
  });

  test('Tab bar does not block the Play level button on Level Path', async ({ page }) => {
    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Level Path URL
    await page.goto('http://localhost:3002/level-path');
    
    // Wait for level path nodes
    const levelButton = page.getByRole('button', { name: /^Level 1\b/ }).first();
    await levelButton.waitFor({ state: 'visible' });
    
    // Click the first level to open the bottom sheet modal
    await levelButton.click();
    
    // Wait for the modal and Play Level button
    const playLevelBtn = page.getByRole('link', { name: /Play (level|again)/ });
    await playLevelBtn.waitFor({ state: 'visible' });
    await page.waitForTimeout(1000); // Wait for framer-motion slide-up animation
    
    // The FloatingNav is z-50 and the modal is z-[60]. They may intersect visually, 
    // but the Play Level button should remain clickable and not be blocked.
    
    // Check if the button can be clicked
    await playLevelBtn.click();
    
    // Should navigate to the level
    await page.waitForURL(/\/level-path\/.+/);
  });

  test('Leaving a game uses a custom sheet, not window.confirm', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3002/play/standard/standard/hard');
    await page.locator('[data-x="0"][data-y="0"]').waitFor({ state: 'visible' });

    let dialogFired = false;
    page.on('dialog', dialog => {
      dialogFired = true;
      dialog.accept();
    });

    // Gameplay is immersive: the top bar's Close button is the way out.
    await page.getByRole('button', { name: 'Leave game' }).click();
    await expect(page.getByRole('dialog', { name: 'Leave this game?' })).toBeVisible();
    expect(dialogFired).toBe(false);

    await page.getByRole('button', { name: 'Leave', exact: true }).click();
    // A deep-linked game has no in-app history, so Close lands on its parent.
    await page.waitForURL('http://localhost:3002/play/standard');
  });

  test('Grid selection highlight renders during active drag', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3002/play/standard/standard/easy');
    
    // Wait for the grid cells to be visible
    const firstCell = page.locator('div[data-x="0"][data-y="0"]').first();
    await firstCell.waitFor({ state: 'visible' });

    const gridBoard = page.locator('.aspect-square.grid-board').first();
    
    const firstBox = await firstCell.boundingBox();
    expect(firstBox).not.toBeNull();
    
    if (firstBox) {
      // Start drag from the first cell
      await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
      await page.mouse.down();
      
      // Move mouse to the third cell (assuming they are in a row)
      await page.mouse.move(firstBox.x + firstBox.width * 2.5, firstBox.y + firstBox.height / 2, { steps: 10 });
      
      // Screenshot mid-drag
      await gridBoard.screenshot({ path: 'test-results/grid-drag.png' });
      
      // The selection is drawn as a hand-drawn path in the overlay.
      const line = page.locator('[role="grid"] svg path');
      const count = await line.count();
      expect(count).toBeGreaterThan(0);
      
      await page.mouse.up();
    }
  });

  test('Word list layout fits within mobile viewport height', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3002/play/standard/standard/easy');
    
    // Wait for WordList to be visible
    const wordList = page.locator('ul[aria-label="Words to find"]').first();
    await wordList.waitFor({ state: 'visible' });
    
    // Verify it is fully visible in the viewport
    const boundingBox = await wordList.boundingBox();
    expect(boundingBox).not.toBeNull();
    
    if (boundingBox) {
      expect(boundingBox.y + boundingBox.height).toBeLessThanOrEqual(667);
    }
  });
});

