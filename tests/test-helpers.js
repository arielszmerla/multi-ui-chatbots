const path = require('path');

/**
 * Loads the extension popup, trying the extension URL first, falling back to file URL
 * @param {Object} page - Playwright page object
 * @param {string} extensionId - The extension ID
 * @returns {Promise<void>}
 */
async function loadExtensionPopup(page, extensionId) {
    try {
        // Try extension URL first
        await page.goto(`chrome-extension://${extensionId}/popup.html`, { timeout: 10000 });
        return;
    } catch (error) {
        console.log('Extension URL failed, falling back to file URL');

        // Mock Chrome APIs when using file URL
        await page.addInitScript(() => {
            window.chrome = {
                tabs: {
                    query: () => Promise.resolve([]),
                    create: () => Promise.resolve({ id: 123 }),
                    update: () => Promise.resolve(),
                },
                windows: { update: () => Promise.resolve() },
                scripting: {
                    executeScript: () => Promise.resolve([{ result: 'No tab open' }])
                },
                storage: {
                    local: {
                        get: () => Promise.resolve({}),
                        set: () => Promise.resolve(),
                        remove: () => Promise.resolve()
                    }
                }
            };
        });

        // Fallback to file URL
        const popupPath = path.resolve(__dirname, '../popup.html');
        await page.goto(`file://${popupPath}`);
    }
}

/**
 * Sets up Chrome API mocks for extension testing
 * @param {Object} page - Playwright page object
 * @returns {Promise<void>}
 */
async function setupChromeMocks(page) {
    await page.addInitScript(() => {
        if (!window.chrome) {
            window.chrome = {};
        }

        window.chrome.tabs = window.chrome.tabs || {
            query: () => Promise.resolve([]),
            create: () => Promise.resolve({ id: 123 }),
            update: () => Promise.resolve(),
        };

        window.chrome.windows = window.chrome.windows || {
            update: () => Promise.resolve()
        };

        window.chrome.scripting = window.chrome.scripting || {
            executeScript: () => Promise.resolve([{ result: 'No tab open' }])
        };

        window.chrome.storage = window.chrome.storage || {
            local: {
                get: () => Promise.resolve({}),
                set: () => Promise.resolve(),
                remove: () => Promise.resolve()
            }
        };
    });
}

module.exports = {
    loadExtensionPopup,
    setupChromeMocks
}; 