import { chromium } from 'playwright';

export async function openBrowser() {
  try {
    return await chromium.launch({ headless: true, ...(process.env.PETER_DELIVERY_CHROMIUM ? { executablePath: process.env.PETER_DELIVERY_CHROMIUM } : {}) });
  } catch (error) {
    throw new Error('Chromium unavailable. Run peter-deliver setup-browser, or set PETER_DELIVERY_CHROMIUM to a Chromium executable.', { cause: error });
  }
}

export async function offlinePage(browser, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1100, height: 800 }, deviceScaleFactor: 2, ...options });
  await context.route('**/*', route => route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  return page;
}
