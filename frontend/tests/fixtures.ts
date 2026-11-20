import { test as baseTest, expect } from '@playwright/test';
import { addCoverageReport } from 'monocart-reporter';

export const test = baseTest.extend<{ autoCoverage: void }>({
  autoCoverage: [
    async ({ page, browserName }, use, testInfo) => {
      const isChromium = browserName === 'chromium';

      if (isChromium) {
        await page.coverage.startJSCoverage({
          resetOnNavigation: false,
        });
      }

      await use();

      if (isChromium) {
        const coverageList = await page.coverage.stopJSCoverage();
        await addCoverageReport(coverageList, testInfo);
      }
    },
    { auto: true },
  ],
});

export { expect };