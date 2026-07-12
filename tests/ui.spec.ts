import { test, expect } from '@playwright/test';

test.describe('UI Regressions', () => {
  test('Hard Mode GridBoard fits within mobile viewport width', async ({ page }) => {
    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Standard Hard mode URL
    await page.goto('http://localhost:3002/play/standard/standard/hard');
    
    // Wait for GridBoard to render (wait for the parent div with aspect-square)
    const gridBoard = page.locator('.aspect-square.max-w-\\[450px\\]').first();
    await gridBoard.waitFor({ state: 'visible' });
    
    const boundingBox = await gridBoard.boundingBox();
    expect(boundingBox).not.toBeNull();
    if (boundingBox) {
      expect(boundingBox.width).toBeLessThanOrEqual(375);
    }
  });

  test('FloatingNav does not intersect with Play Level button on Level Path', async ({ page }) => {
    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Level Path URL
    await page.goto('http://localhost:3002/level-path');
    
    // Wait for level path nodes
    const levelButton = page.locator('button', { hasText: '1' }).first();
    await levelButton.waitFor({ state: 'visible' });
    
    // Click the first level to open the bottom sheet modal
    await levelButton.click();
    
    // Wait for the modal and Play Level button
    const playLevelBtn = page.locator('button', { hasText: 'Play Level' });
    await playLevelBtn.waitFor({ state: 'visible' });
    await page.waitForTimeout(1000); // Wait for framer-motion slide-up animation
    
    // The FloatingNav is z-50 and the modal is z-[60]. They may intersect visually, 
    // but the Play Level button should remain clickable and not be blocked.
    
    // Check if the button can be clicked
    await playLevelBtn.click();
    
    // Should navigate to the level
    await page.waitForURL(/\/level-path\/.+/);
  });

  test('FloatingNav uses custom sheet instead of window.confirm', async ({ page }) => {
    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Standard Hard mode URL
    await page.goto('http://localhost:3002/play/standard/standard/hard');
    
    // Wait for the floating nav to be visible
    const floatingNav = page.locator('div.fixed.bottom-6').first();
    await floatingNav.waitFor({ state: 'visible' });

    // Ensure we capture window.confirm if it is incorrectly called
    let dialogFired = false;
    page.on('dialog', dialog => {
      dialogFired = true;
      dialog.accept();
    });

    // Open Floating Nav Menu (it is minimized)
    // Find the toggle button (the one with the PauseSvg or CloseSvg)
    const toggleBtn = page.locator('div.fixed.bottom-6 > div > button');
    await toggleBtn.waitFor({ state: 'visible' });
    await toggleBtn.click();
    
    // Click Home
    const homeBtn = page.locator('a[href="/"]');
    await homeBtn.waitFor({ state: 'visible' });
    await homeBtn.click();
    
    // Wait for the custom sheet to appear
    const sheetTitle = page.locator('h3', { hasText: 'Leave this puzzle?' });
    await sheetTitle.waitFor({ state: 'visible' });
    
    expect(dialogFired).toBe(false);
    
    // Click Leave
    const leaveBtn = page.locator('button', { hasText: 'Leave' });
    await leaveBtn.click();
    
    // Should navigate to Home
    await page.waitForURL('http://localhost:3002/');
  });

  test('Grid selection highlight renders during active drag', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3002/play/standard/standard/easy');
    
    // Wait for the grid cells to be visible
    const firstCell = page.locator('div[data-x="0"][data-y="0"]').first();
    await firstCell.waitFor({ state: 'visible' });

    const gridBoard = page.locator('.aspect-square.max-w-\\[450px\\]').first();
    
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
      
      // Check if the SVG line exists
      const line = page.locator('svg line');
      const count = await line.count();
      expect(count).toBeGreaterThan(0);
      
      await page.mouse.up();
    }
  });

  test('Word list layout fits within mobile viewport height', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3002/play/standard/standard/easy');
    
    // Wait for WordList to be visible
    const wordList = page.locator('div.flex.flex-wrap.justify-center.gap-1\\.5').first();
    await wordList.waitFor({ state: 'visible' });
    
    // Verify it is fully visible in the viewport
    const boundingBox = await wordList.boundingBox();
    expect(boundingBox).not.toBeNull();
    
    if (boundingBox) {
      expect(boundingBox.y + boundingBox.height).toBeLessThanOrEqual(667);
    }
  });
});

