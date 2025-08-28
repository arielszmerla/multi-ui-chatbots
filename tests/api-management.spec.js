const { test, expect } = require('@playwright/test');
const { loadExtensionPopup } = require('./test-helpers');

test.describe('API Key Management', () => {
    const extensionId = 'lkfkhhpmcjplcgpdlpbphgfjebgjeocc';

    test.beforeEach(async ({ context }) => {
        // Extension ID is now hardcoded for reliability
    });

    test('should handle API key input and auto-save with debounce', async ({ context }) => {
        const page = await context.newPage();
        await loadExtensionPopup(page, extensionId);

        // Switch to OpenAI method
        await page.selectOption('#summary-method', 'openai');

        const apiKeyInput = page.locator('#openai-api-key');
        const apiStatus = page.locator('#api-status');

        // Type API key (should trigger debounced save)
        await apiKeyInput.fill('sk-test1234567890abcdef');

        // Wait for debounce timeout (1 second)
        await page.waitForTimeout(1100);

        // Should show saved status
        await expect(apiStatus).toContainText('API key saved');
    });

    test('should switch between input and saved modes', async ({ context }) => {
        const page = await context.newPage();
        await loadExtensionPopup(page, extensionId);

        // Switch to OpenAI method
        await page.selectOption('#summary-method', 'openai');

        const apiKeyInput = page.locator('#openai-api-key');
        const saveButton = page.locator('#save-api-key');
        const changeButton = page.locator('#change-api-key');
        const removeButton = page.locator('#remove-api-key');
        const inputMode = page.locator('#api-key-input-mode');
        const savedMode = page.locator('#api-key-saved-mode');

        // Initially in input mode
        await expect(inputMode).toBeVisible();
        await expect(savedMode).toHaveClass(/hidden/);

        // Save an API key
        await apiKeyInput.fill('sk-test1234567890abcdef');
        await saveButton.click();

        // Should switch to saved mode
        await expect(savedMode).toBeVisible();
        await expect(inputMode).toHaveClass(/hidden/);

        // Click change button
        await changeButton.click();

        // Should switch back to input mode with current key
        await expect(inputMode).toBeVisible();
        await expect(savedMode).toHaveClass(/hidden/);
        await expect(apiKeyInput).toHaveValue('sk-test1234567890abcdef');
    });

    test('should handle API key removal', async ({ context }) => {
        const page = await context.newPage();
        await loadExtensionPopup(page, extensionId);

        // Switch to OpenAI method
        await page.selectOption('#summary-method', 'openai');

        const apiKeyInput = page.locator('#openai-api-key');
        const saveButton = page.locator('#save-api-key');
        const removeButton = page.locator('#remove-api-key');
        const inputMode = page.locator('#api-key-input-mode');
        const savedMode = page.locator('#api-key-saved-mode');
        const apiStatus = page.locator('#api-status');

        // Save an API key first
        await apiKeyInput.fill('sk-test1234567890abcdef');
        await saveButton.click();
        await expect(savedMode).toBeVisible();

        // Mock the confirm dialog to return true
        await page.evaluate(() => {
            window.confirm = () => true;
        });

        // Remove the API key
        await removeButton.click();

        // Should switch back to input mode
        await expect(inputMode).toBeVisible();
        await expect(savedMode).toHaveClass(/hidden/);
        await expect(apiStatus).toContainText('API key not configured');
    });

    test('should validate summary button visibility based on API key and responses', async ({ context }) => {
        const page = await context.newPage();
        await loadExtensionPopup(page, extensionId);

        const generateSummaryButton = page.locator('#generate-summary');

        // Initially hidden (no responses)
        await expect(generateSummaryButton).toHaveClass(/hidden/);

        // Switch to OpenAI method
        await page.selectOption('#summary-method', 'openai');

        // Still hidden without API key
        await expect(generateSummaryButton).toHaveClass(/hidden/);

        // Add API key
        const apiKeyInput = page.locator('#openai-api-key');
        await apiKeyInput.fill('sk-test1234567890abcdef');
        await page.locator('#save-api-key').click();

        // Still hidden without responses
        await expect(generateSummaryButton).toHaveClass(/hidden/);
    });

    test('should handle browser summary method selection', async ({ context }) => {
        const page = await context.newPage();
        await loadExtensionPopup(page, extensionId);

        const summaryMethod = page.locator('#summary-method');
        const openaiSettings = page.locator('#openai-settings');
        const modelStatus = page.locator('#model-status');

        // Initially browser method should be selected and OpenAI settings hidden
        await expect(summaryMethod).toHaveValue('browser');
        await expect(openaiSettings).toHaveClass(/hidden/);

        // Switch to OpenAI
        await summaryMethod.selectOption('openai');
        await expect(openaiSettings).toBeVisible();

        // Switch back to browser
        await summaryMethod.selectOption('browser');
        await expect(openaiSettings).toHaveClass(/hidden/);
        await expect(modelStatus).toBeVisible();
    });

    test('should show API status messages correctly', async ({ context }) => {
        const page = await context.newPage();
        await loadExtensionPopup(page, extensionId);

        // Switch to OpenAI method
        await page.selectOption('#summary-method', 'openai');

        const apiStatus = page.locator('#api-status');

        // Should show initial status
        await expect(apiStatus).toContainText('API key not configured');

        // Add API key
        const apiKeyInput = page.locator('#openai-api-key');
        await apiKeyInput.fill('sk-test1234567890abcdef');
        await page.locator('#save-api-key').click();

        // Should show saved status
        await expect(apiStatus).toContainText('API key');
    });

    test('should handle blur event to save API key', async ({ context }) => {
        const page = await context.newPage();
        await loadExtensionPopup(page, extensionId);

        // Switch to OpenAI method
        await page.selectOption('#summary-method', 'openai');

        const apiKeyInput = page.locator('#openai-api-key');
        const apiStatus = page.locator('#api-status');

        // Focus input, type, then blur
        await apiKeyInput.focus();
        await apiKeyInput.fill('sk-test1234567890abcdef');
        await apiKeyInput.blur();

        // Should trigger save on blur
        await expect(apiStatus).toContainText('API key saved');
    });

    test('should not save empty API key on blur', async ({ context }) => {
        const page = await context.newPage();
        await loadExtensionPopup(page, extensionId);

        // Switch to OpenAI method
        await page.selectOption('#summary-method', 'openai');

        const apiKeyInput = page.locator('#openai-api-key');
        const apiStatus = page.locator('#api-status');

        // Focus input with empty value then blur
        await apiKeyInput.focus();
        await apiKeyInput.blur();

        // Should not change status
        await expect(apiStatus).toContainText('API key not configured');
    });
}); 