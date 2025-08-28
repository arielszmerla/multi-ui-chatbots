const { defineConfig, devices } = require('@playwright/test');
const path = require('path');

module.exports = defineConfig({
    testDir: './tests',
    fullyParallel: false, // Extensions need sequential testing
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1, // Run tests sequentially for extension
    reporter: 'html',
    use: {
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },

    projects: [
        {
            name: 'extension-tests',
            use: {
                ...devices['Desktop Chrome'],
                // Path to the extension
                args: [
                    `--disable-extensions-except=${path.resolve(__dirname)}`,
                    `--load-extension=${path.resolve(__dirname)}`,
                    '--disable-web-security',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding',
                    '--disable-dev-shm-usage',
                    '--no-sandbox',
                    '--disable-features=VizDisplayCompositor'
                ],
                // Increase timeout for extension operations
                actionTimeout: 15000,
                navigationTimeout: 45000
            },
        },
    ],
}); 