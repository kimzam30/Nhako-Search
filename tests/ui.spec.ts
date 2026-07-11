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
    
    // Find the FloatingNav
    const floatingNav = page.locator('div.fixed.bottom-6');
    
    // Note: the FloatingNav is rendered unconditionally (hidden on sign-in), so it should be present.
    // It is possible it's obscured by the z-[60] modal! Which is what we want!
    // But let's check intersection if both are visible.
    const navBox = await floatingNav.boundingBox();
    const playBox = await playLevelBtn.boundingBox();
    
    expect(navBox).not.toBeNull();
    expect(playBox).not.toBeNull();
    
    if (navBox && playBox) {
      // Check for overlap using bounding boxes
      const intersectX = navBox.x < playBox.x + playBox.width && navBox.x + navBox.width > playBox.x;
      const intersectY = navBox.y < playBox.y + playBox.height && navBox.y + navBox.height > playBox.y;
      
      expect(intersectX && intersectY).toBe(false);
    }
  });
});
