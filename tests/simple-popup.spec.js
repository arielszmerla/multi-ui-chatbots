const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Simple Popup Tests (Direct HTML)', () => {

    test('should load popup HTML file and show basic elements', async ({ page }) => {
        // Load the popup HTML file directly
        const popupPath = path.resolve(__dirname, '../popup.html');
        await page.goto(`file://${popupPath}`);

        // Check main elements are present
        await expect(page.locator('#prompt')).toBeVisible();
        await expect(page.locator('#send')).toBeVisible();
        await expect(page.locator('input[name="model"][value="chatgpt"]')).toBeVisible();
        await expect(page.locator('input[name="model"][value="claude"]')).toBeVisible();
        await expect(page.locator('input[name="model"][value="askme"]')).toBeVisible();
    });

    test('should disable send button when prompt is empty', async ({ page }) => {
        const popupPath = path.resolve(__dirname, '../popup.html');
        await page.goto(`file://${popupPath}`);

        // Send button should be disabled initially
        await expect(page.locator('#send')).toBeDisabled();

        // Type something in prompt
        await page.fill('#prompt', 'Test prompt');
        await expect(page.locator('#send')).toBeEnabled();

        // Clear prompt
        await page.fill('#prompt', '');
        await expect(page.locator('#send')).toBeDisabled();
    });

    test('should show model selection checkboxes', async ({ page }) => {
        const popupPath = path.resolve(__dirname, '../popup.html');
        await page.goto(`file://${popupPath}`);

        // Check all model checkboxes are present and can be toggled
        const chatgptCheckbox = page.locator('input[name="model"][value="chatgpt"]');
        const claudeCheckbox = page.locator('input[name="model"][value="claude"]');
        const askmeCheckbox = page.locator('input[name="model"][value="askme"]');

        await expect(chatgptCheckbox).toBeVisible();
        await expect(claudeCheckbox).toBeVisible();
        await expect(askmeCheckbox).toBeVisible();

        // Test checkbox functionality
        await chatgptCheckbox.check();
        await expect(chatgptCheckbox).toBeChecked();

        await claudeCheckbox.check();
        await expect(claudeCheckbox).toBeChecked();

        await askmeCheckbox.uncheck();
        await expect(askmeCheckbox).not.toBeChecked();
    });

    test('should update response divs when models are selected/deselected', async ({ page }) => {
        const popupPath = path.resolve(__dirname, '../popup.html');
        await page.goto(`file://${popupPath}`);

        const chatgptDiv = page.locator('#chatgpt');
        const chatgptCheckbox = page.locator('input[name="model"][value="chatgpt"]');

        // Initially should show "Ready" when checked
        await chatgptCheckbox.check();
        await expect(chatgptDiv).toContainText('Ready');
        await expect(chatgptDiv).not.toHaveClass('disabled');

        // Should show "Not selected" when unchecked
        await chatgptCheckbox.uncheck();
        await expect(chatgptDiv).toContainText('Not selected');
        await expect(chatgptDiv).toHaveClass(/disabled/);
    });

    test('should show open tab buttons', async ({ page }) => {
        const popupPath = path.resolve(__dirname, '../popup.html');
        await page.goto(`file://${popupPath}`);

        // Check open tab buttons are present
        const chatgptOpenButton = page.locator('button[data-url="https://chatgpt.com"]');
        const claudeOpenButton = page.locator('button[data-url="https://claude.ai"]');
        const askmeOpenButton = page.locator('button[data-url="https://askme.mobileye.com"]');

        await expect(chatgptOpenButton).toBeVisible();
        await expect(claudeOpenButton).toBeVisible();
        await expect(askmeOpenButton).toBeVisible();

        // Test button text
        await expect(chatgptOpenButton).toContainText('Open Tab');
        await expect(claudeOpenButton).toContainText('Open Tab');
        await expect(askmeOpenButton).toContainText('Open Tab');
    });

    test('should show summary method selector', async ({ page }) => {
        const popupPath = path.resolve(__dirname, '../popup.html');
        await page.goto(`file://${popupPath}`);

        const summaryMethod = page.locator('#summary-method');
        await expect(summaryMethod).toBeVisible();

        // Check available options exist
        await expect(summaryMethod.locator('option[value="browser"]')).toBeAttached();
        await expect(summaryMethod.locator('option[value="openai"]')).toBeAttached();

        // Test changing method
        await summaryMethod.selectOption('openai');
        await expect(page.locator('#openai-settings')).toBeVisible();

        await summaryMethod.selectOption('browser');
        await expect(page.locator('#openai-settings')).toHaveClass(/hidden/);
    });

    test('should handle API key input', async ({ page }) => {
        const popupPath = path.resolve(__dirname, '../popup.html');
        await page.goto(`file://${popupPath}`);

        // Switch to OpenAI method to show API key input
        await page.selectOption('#summary-method', 'openai');

        const apiKeyInput = page.locator('#openai-api-key');
        const saveButton = page.locator('#save-api-key');

        await expect(apiKeyInput).toBeVisible();
        await expect(saveButton).toBeVisible();

        // Test API key input
        await apiKeyInput.fill('test-api-key-123');
        await expect(apiKeyInput).toHaveValue('test-api-key-123');
    });

    test('should show/hide summary section appropriately', async ({ page }) => {
        const popupPath = path.resolve(__dirname, '../popup.html');
        await page.goto(`file://${popupPath}`);

        const summarySection = page.locator('#summary-section');
        const generateSummaryButton = page.locator('#generate-summary');

        // Initially hidden
        await expect(summarySection).toHaveClass(/hidden/);
        await expect(generateSummaryButton).toHaveClass(/hidden/);
    });

    test('should show model status', async ({ page }) => {
        const popupPath = path.resolve(__dirname, '../popup.html');
        await page.goto(`file://${popupPath}`);

        const modelStatus = page.locator('#model-status');
        await expect(modelStatus).toBeVisible();
    });

    test('should handle form submission with no models selected', async ({ page }) => {
        const popupPath = path.resolve(__dirname, '../popup.html');
        await page.goto(`file://${popupPath}`);

        // Uncheck all models
        await page.uncheck('input[name="model"][value="chatgpt"]');
        await page.uncheck('input[name="model"][value="claude"]');
        await page.uncheck('input[name="model"][value="askme"]');

        // Add prompt and try to send
        await page.fill('#prompt', 'Test prompt');

        // Mock chrome APIs to prevent errors
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

        await page.click('#send');

        // Should show "Not selected" for all models
        await expect(page.locator('#chatgpt')).toContainText('Not selected');
        await expect(page.locator('#claude')).toContainText('Not selected');
        await expect(page.locator('#askme')).toContainText('Not selected');
    });

}); 