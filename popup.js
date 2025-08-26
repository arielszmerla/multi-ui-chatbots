// Global variables to track responses
let collectedResponses = {};
let currentPrompt = "";

// Browser LLM variables
let browserSummarizer = null;
let isModelLoaded = false;
let isModelLoading = false;

document.getElementById("send").addEventListener("click", async () => {
  const prompt = document.getElementById("prompt").value;
  currentPrompt = prompt;

  // Reset collected responses
  collectedResponses = {};

  // Hide summary section and button
  document.getElementById("summary-section").classList.add("hidden");
  document.getElementById("generate-summary").classList.add("hidden");

  // Get selected models
  const enabledModels = Array.from(document.querySelectorAll('input[name="model"]:checked')).map(cb => cb.value);

  const targets = [
    { name: "chatgpt", url: "https://chatgpt.com/*" },
    { name: "claude", url: "https://claude.ai/*" },
    { name: "askme", url: "https://askme.mobileye.com/*" }
  ];

  // Update visual state for all models
  for (const target of targets) {
    const responseDiv = document.getElementById(target.name);
    if (enabledModels.includes(target.name)) {
      responseDiv.classList.remove('disabled');
      responseDiv.innerHTML = `<b>${target.name}:</b><br>Starting...`;
    } else {
      responseDiv.classList.add('disabled');
      responseDiv.innerHTML = `<b>${target.name}:</b><br>Not selected`;
    }
  }

  // Process all selected models concurrently
  const processingPromises = targets
    .filter(target => enabledModels.includes(target.name))
    .map(async (target) => {
      try {
        const tabs = await chrome.tabs.query({ url: target.url });

        if (tabs.length === 0) {
          const noTabMessage = "No tab open";
          document.getElementById(target.name).innerHTML = `<b>${target.name}:</b><br>${noTabMessage}`;
          collectedResponses[target.name] = noTabMessage;
          return;
        }

        document.getElementById(target.name).innerHTML = `<b>${target.name}:</b><br>Sending...`;

        const [{ result }] = await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: sendPromptAndScrape,
          args: [prompt, target.name]
        });
        document.getElementById(target.name).innerHTML = `<b>${target.name}:</b><br>${result}`;
        collectedResponses[target.name] = result;
      } catch (error) {
        console.error(`Error with ${target.name}:`, error);
        const errorMessage = `Error: ${error.message}`;
        document.getElementById(target.name).innerHTML = `<b>${target.name}:</b><br>${errorMessage}`;
        collectedResponses[target.name] = errorMessage;
      }
    });

  // Wait for all models to complete
  await Promise.all(processingPromises);

  // Show summary button if we have responses and API key is configured
  updateSummaryButtonState();
});

// Summary functionality
document.getElementById("generate-summary").addEventListener("click", async () => {
  await generateSummary();
});

// API Key management - auto-save on input (with debounce)
let saveTimeout;
document.getElementById("openai-api-key").addEventListener("input", (e) => {
  const apiKey = e.target.value.trim();

  // Clear previous timeout
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  // Debounce the save operation
  saveTimeout = setTimeout(async () => {
    await saveApiKey(apiKey);
  }, 1000); // Save after 1 second of no typing

  // Update button visibility immediately
  updateSummaryButtonState();
});

// Manual save button
document.getElementById("save-api-key").addEventListener("click", async () => {
  const apiKey = document.getElementById("openai-api-key").value.trim();
  await saveApiKey(apiKey);
});

// Change API key button
document.getElementById("change-api-key").addEventListener("click", () => {
  showInputModeWithCurrentKey();
});

// Remove API key button
document.getElementById("remove-api-key").addEventListener("click", async () => {
  if (confirm("Are you sure you want to remove your API key?")) {
    await saveApiKey(""); // Save empty string to remove
  }
});

// Also save on blur to ensure it's saved
document.getElementById("openai-api-key").addEventListener("blur", async (e) => {
  const apiKey = e.target.value.trim();
  if (apiKey) {
    await saveApiKey(apiKey);
  }
});

// Unified save function with fallback
async function saveApiKey(apiKey) {
  try {
    // Try Chrome storage first
    if (chrome && chrome.storage && chrome.storage.local) {
      if (apiKey) {
        await chrome.storage.local.set({ openaiApiKey: apiKey });
        updateApiStatus("API key saved (Chrome)");
        showSavedMode();
      } else {
        await chrome.storage.local.remove("openaiApiKey");
        updateApiStatus("API key not configured");
        showInputMode();
      }
    } else {
      // Fallback to localStorage
      if (apiKey) {
        localStorage.setItem("openaiApiKey", apiKey);
        updateApiStatus("API key saved (local)");
        showSavedMode();
      } else {
        localStorage.removeItem("openaiApiKey");
        updateApiStatus("API key not configured");
        showInputMode();
      }
    }
    updateSummaryButtonState();
  } catch (error) {
    console.error("Error saving API key:", error);
    updateApiStatus(`Error saving API key: ${error.message}`);
  }
}

async function loadApiKey() {
  try {
    let apiKey = null;

    // Try Chrome storage first
    if (chrome && chrome.storage && chrome.storage.local) {
      try {
        const result = await chrome.storage.local.get("openaiApiKey");
        apiKey = result.openaiApiKey;
      } catch (chromeError) {
        // Chrome storage failed, will try localStorage
      }
    }

    // Fallback to localStorage if Chrome storage failed or not available
    if (!apiKey) {
      apiKey = localStorage.getItem("openaiApiKey");
    }

    if (apiKey) {
      const apiKeyInput = document.getElementById("openai-api-key");
      apiKeyInput.value = apiKey; // Set value but it will be hidden
      updateApiStatus("API key configured");
      showSavedMode();
      // Check if we should show summary button
      updateSummaryButtonState();
    } else {
      updateApiStatus("API key not configured");
      showInputMode();
    }
  } catch (error) {
    console.error("Error loading API key:", error);
    updateApiStatus(`Error loading API key: ${error.message}`);
    showInputMode();
  }
}

function updateApiStatus(message) {
  document.getElementById("api-status").textContent = message;
}

// UI Mode switching functions
function showInputMode() {
  document.getElementById("api-key-input-mode").classList.remove("hidden");
  document.getElementById("api-key-saved-mode").classList.add("hidden");
  // Clear the input and focus it
  const input = document.getElementById("openai-api-key");
  input.value = "";
  input.focus();
}

function showSavedMode() {
  document.getElementById("api-key-input-mode").classList.add("hidden");
  document.getElementById("api-key-saved-mode").classList.remove("hidden");
}

function showInputModeWithCurrentKey() {
  document.getElementById("api-key-input-mode").classList.remove("hidden");
  document.getElementById("api-key-saved-mode").classList.add("hidden");
  // Keep the current API key in the input and focus it
  const input = document.getElementById("openai-api-key");
  input.focus();
  input.select(); // Select all text so user can easily replace it
}

function checkAndShowSummaryButton() {
  updateSummaryButtonState();
}

async function generateSummary() {
  const method = document.getElementById("summary-method").value;

  // Show summary section and loading state
  const summarySection = document.getElementById("summary-section");
  const summaryContent = document.getElementById("summary-content");

  summarySection.classList.remove("hidden");
  summaryContent.innerHTML = '<div class="text-center text-muted">Generating summary...</div>';

  // Disable summary button while processing
  const summaryButton = document.getElementById("generate-summary");
  summaryButton.disabled = true;
  summaryButton.textContent = "Generating...";

  try {
    let summary;

    if (method === "browser") {
      summary = await generateBrowserBasedSummary();
    } else if (method === "openai") {
      const apiKey = document.getElementById("openai-api-key").value.trim();
      if (!apiKey) {
        throw new Error("Please configure your OpenAI API key first.");
      }

      // Prepare the prompt for summarization
      const summaryPrompt = createSummaryPrompt();

      // Call OpenAI API
      summary = await callOpenAI(apiKey, summaryPrompt);
    }

    // Display the summary
    summaryContent.innerHTML = summary;

  } catch (error) {
    console.error("Error generating summary:", error);
    summaryContent.innerHTML = `<div style="color: red;">Error generating summary: ${error.message}</div>`;
  } finally {
    // Re-enable summary button
    summaryButton.disabled = false;
    summaryButton.textContent = "Regenerate Summary";
  }
}

async function generateBrowserBasedSummary() {
  if (!isModelLoaded) {
    throw new Error("Browser model not loaded. Please download the model first.");
  }

  // Collect all valid responses
  const responses = [];
  for (const [model, response] of Object.entries(collectedResponses)) {
    if (response && response.length > 10 && !response.includes("Error:") && !response.includes("No tab open")) {
      responses.push(`**${model.toUpperCase()}:** ${response}`);
    }
  }

  if (responses.length === 0) {
    throw new Error("No valid responses to summarize");
  }

  // Combine responses
  const combinedText = `Original Prompt: "${currentPrompt}"\n\nResponses:\n${responses.join('\n\n')}`;

  // Generate summary using browser model
  const summary = await generateBrowserSummary(combinedText);

  // Format the summary nicely
  return `<div style="margin-bottom: 10px;"><strong>Browser-Generated Summary:</strong></div>
<div style="padding: 10px; background: #f8f9fa; border-radius: 4px; line-height: 1.5;">
${summary}
</div>
<div style="margin-top: 10px; font-size: 11px; color: #666;">
Generated using local browser model (private, no data sent externally)
</div>`;
}

function createSummaryPrompt() {
  let prompt = `Please analyze and summarize the following AI model responses to this prompt:\n\n`;
  prompt += `**Original Prompt:** "${currentPrompt}"\n\n`;
  prompt += `**Responses:**\n\n`;

  for (const [model, response] of Object.entries(collectedResponses)) {
    if (response && response.length > 10 && !response.includes("Error:") && !response.includes("No tab open")) {
      prompt += `**${model.toUpperCase()}:**\n${response}\n\n`;
    }
  }

  prompt += `Please provide:\n`;
  prompt += `1. **Key Similarities:** What did all models agree on?\n`;
  prompt += `2. **Key Differences:** Where did the models diverge?\n`;
  prompt += `3. **Unique Insights:** What unique perspectives did each model offer?\n`;
  prompt += `4. **Quality Assessment:** Which response was most comprehensive/accurate?\n`;
  prompt += `5. **Consolidated Answer:** Combine the best elements into one cohesive response.\n\n`;
  prompt += `Format your response clearly with the above sections.`;

  return prompt;
}

async function callOpenAI(apiKey, prompt) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert AI analyst. Provide clear, structured comparisons and summaries of AI model responses."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 1500,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Browser LLM Functions
async function initBrowserLLM() {
  if (isModelLoading || isModelLoaded) return;

  // Check if simple summarizer is available
  if (!window.simpleSummarizer || !window.simpleSummarizer.available) {
    updateModelStatus("Browser model: Simple summarizer not available");
    return;
  }

  try {
    isModelLoading = true;
    updateModelStatus("Initializing browser model...");

    // Simulate a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));

    // Use the simple summarizer
    browserSummarizer = window.simpleSummarizer;

    isModelLoaded = true;
    isModelLoading = false;
    updateModelStatus("Browser model: Ready");
    updateSummaryButtonState();

  } catch (error) {
    console.error("Error initializing browser model:", error);
    isModelLoading = false;
    updateModelStatus("Browser model: Failed to initialize - " + error.message);
  }
}

async function generateBrowserSummary(text) {
  if (!isModelLoaded || !browserSummarizer) {
    throw new Error("Browser model not loaded");
  }

  try {
    // Use our simple summarizer
    const summary = browserSummarizer.summarize(text);
    return summary;

  } catch (error) {
    console.error("Error generating browser summary:", error);
    throw error;
  }
}

function updateModelStatus(status) {
  document.getElementById("model-status").textContent = status;
}

function updateSummaryButtonState() {
  const method = document.getElementById("summary-method").value;
  const hasResponses = Object.keys(collectedResponses).length > 0;
  const hasValidResponses = Object.values(collectedResponses).some(response =>
    response && response.length > 10 && !response.includes("Error:") && !response.includes("No tab open")
  );

  let canSummarize = false;

  if (method === "browser") {
    canSummarize = hasResponses && hasValidResponses && isModelLoaded;
  } else if (method === "openai") {
    const hasApiKey = document.getElementById("openai-api-key").value.trim().length > 0;
    canSummarize = hasResponses && hasValidResponses && hasApiKey;
  }

  if (canSummarize) {
    document.getElementById("generate-summary").classList.remove("hidden");
  } else {
    document.getElementById("generate-summary").classList.add("hidden");
  }
}

// Enable/disable send button based on prompt input
function updateSendButton() {
  const prompt = document.getElementById("prompt").value.trim();
  const sendButton = document.getElementById("send");
  sendButton.disabled = prompt.length === 0;
}

// Add event listeners to update visual state when checkboxes change
document.addEventListener('DOMContentLoaded', () => {
  // Load saved API key
  loadApiKey();

  // Add input listener to prompt textarea
  document.getElementById("prompt").addEventListener("input", updateSendButton);

  // Initialize send button state
  updateSendButton();

  // Summary method selection event listener
  document.getElementById("summary-method").addEventListener("change", (e) => {
    const method = e.target.value;
    const openaiSettings = document.querySelector(".compact-settings:last-child");

    if (method === "browser") {
      openaiSettings.style.opacity = "0.5";
      if (!isModelLoaded && !isModelLoading) {
        updateModelStatus("Browser model: Not downloaded");
      }
    } else {
      openaiSettings.style.opacity = "1";
    }

    updateSummaryButtonState();
  });

  // Listen for simple summarizer loading event
  window.addEventListener('simpleSummarizerReady', () => {
    updateModelStatus("Browser model: Available");
    // Auto-initialize since simple summarizer is always ready
    if (!isModelLoaded && !isModelLoading) {
      initBrowserLLM();
    }
  });

  const checkboxes = document.querySelectorAll('input[name="model"]');
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      const responseDiv = document.getElementById(checkbox.value);
      if (checkbox.checked) {
        responseDiv.classList.remove('disabled');
        responseDiv.innerHTML = `<b>${checkbox.value}:</b><br>Ready`;
      } else {
        responseDiv.classList.add('disabled');
        responseDiv.innerHTML = `<b>${checkbox.value}:</b><br>Not selected`;
      }
    });
  });

  // Initialize the visual state
  checkboxes.forEach(checkbox => {
    const responseDiv = document.getElementById(checkbox.value);
    if (checkbox.checked) {
      responseDiv.classList.remove('disabled');
      responseDiv.innerHTML = `<b>${checkbox.value}:</b><br>Ready`;
    } else {
      responseDiv.classList.add('disabled');
      responseDiv.innerHTML = `<b>${checkbox.value}:</b><br>Not selected`;
    }
  });

  // Add event listeners for "Open Tab" buttons
  const openTabButtons = document.querySelectorAll('.btn-small[data-url]');
  openTabButtons.forEach(button => {
    button.addEventListener('click', async () => {
      const url = button.getAttribute('data-url');
      const modelName = button.parentElement.querySelector('label').textContent.trim();

      try {
        // Check if tab already exists
        const existingTabs = await chrome.tabs.query({ url: url + '/*' });

        if (existingTabs.length > 0) {
          // Focus existing tab
          await chrome.tabs.update(existingTabs[0].id, { active: true });
          await chrome.windows.update(existingTabs[0].windowId, { focused: true });
        } else {
          // Create new tab
          await chrome.tabs.create({ url: url, active: true });
        }

        // Brief visual feedback
        button.textContent = 'Opened!';
        button.style.background = '#90EE90';
        setTimeout(() => {
          button.textContent = 'Open Tab';
          button.style.background = '';
        }, 1000);

      } catch (error) {
        console.error(`Error opening ${modelName} tab:`, error);
        button.textContent = 'Error';
        button.style.background = '#FFB6C1';
        setTimeout(() => {
          button.textContent = 'Open Tab';
          button.style.background = '';
        }, 1000);
      }
    });
  });
});

// Runs inside the target page
async function sendPromptAndScrape(prompt, who) {

  // 🔹 ChatGPT
  if (who === "chatgpt") {
    // Try the contenteditable approach first
    const promptDiv = document.querySelector("#prompt-textarea");
    const promptP = document.querySelector("#prompt-textarea > p");

    if (promptP) {
      // Clear existing content and set new content
      promptP.textContent = prompt;

      // Trigger input events for contenteditable
      promptDiv.dispatchEvent(new Event("input", { bubbles: true }));
      promptDiv.dispatchEvent(new Event("change", { bubbles: true }));

      // Set focus to make sure it's active
      promptP.focus();
    } else if (promptDiv) {
      // Fallback: set content directly on the main div
      promptDiv.textContent = prompt;
      promptDiv.dispatchEvent(new Event("input", { bubbles: true }));
      promptDiv.focus();
    } else {
      // Last fallback: try textarea
      const textarea = document.querySelector("textarea");
      if (!textarea) return "Input box not found";
      textarea.value = prompt;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    }

    // Try to find submit button
    const submitButton = document.querySelector('button[data-testid="send-button"]') ||
      document.querySelector('svg[data-testid="send-button"]')?.closest('button') ||
      document.querySelector('button[aria-label*="Send"]') ||
      document.querySelector('[data-testid="fruitjuice-send-button"]');

    // Wait a moment for the UI to update
    await new Promise(r => setTimeout(r, 500));

    if (submitButton && !submitButton.disabled) {
      submitButton.click();
    } else {
      // Simulate Enter key press more accurately
      const activeElement = promptP || promptDiv || document.querySelector("textarea");
      if (activeElement) {
        // First try keydown event
        const enterEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true,
          composed: true
        });
        activeElement.dispatchEvent(enterEvent);

        // Also try keypress
        const keyPressEvent = new KeyboardEvent('keypress', {
          key: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true
        });
        activeElement.dispatchEvent(keyPressEvent);

        // And keyup to complete the sequence
        const keyUpEvent = new KeyboardEvent('keyup', {
          key: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true
        });
        activeElement.dispatchEvent(keyUpEvent);
      }
    }

    // Alternative: try to find and click send button after content is set
    await new Promise(r => setTimeout(r, 100));
    const sendButtonRetry = document.querySelector('button[data-testid="send-button"]:not([disabled])');
    if (sendButtonRetry && !submitButton?.click) {
      sendButtonRetry.click();
    }

    // Wait for response with better detection
    await new Promise(r => setTimeout(r, 3000)); // Initial wait

    // Wait for streaming to complete
    let attempts = 0;
    while (attempts < 10) {
      const streamingIndicator = document.querySelector('[data-testid="stop-button"]') ||
        document.querySelector('.result-streaming') ||
        document.querySelector('[data-is-streaming="true"]');
      if (!streamingIndicator) break;
      await new Promise(r => setTimeout(r, 1000));
      attempts++;
    }

    // Try multiple selectors to find ChatGPT response
    let responseText = "";

    // Try data-message-author-role first
    const assistantMessages = Array.from(document.querySelectorAll('[data-message-author-role="assistant"]'));

    if (assistantMessages.length > 0) {
      const lastMessage = assistantMessages[assistantMessages.length - 1];
      responseText = lastMessage?.innerText?.trim();
    }

    // Fallback 1: Look for markdown content
    if (!responseText) {
      const markdownElements = Array.from(document.querySelectorAll('.markdown, .prose, [class*="markdown"]'));

      if (markdownElements.length > 0) {
        const lastMarkdown = markdownElements[markdownElements.length - 1];
        responseText = lastMarkdown?.innerText?.trim();
      }
    }

    // Fallback 2: Look for conversation messages
    if (!responseText) {
      const conversationMessages = Array.from(document.querySelectorAll('[data-testid*="conversation"] div, .conversation div, [role="presentation"] div'));

      // Get the last few and find one that looks like a response
      const recentMessages = conversationMessages.slice(-10);
      for (let i = recentMessages.length - 1; i >= 0; i--) {
        const text = recentMessages[i]?.innerText?.trim();
        if (text && text.length > 10 && !text.includes("Copy code")) {
          responseText = text;
          break;
        }
      }
    }

    // Fallback 3: Look for any text content that might be the response
    if (!responseText) {
      const allDivs = Array.from(document.querySelectorAll('div'));
      console.log("Total divs found:", allDivs.length);

      // Look for divs with substantial text content
      for (let i = allDivs.length - 1; i >= Math.max(0, allDivs.length - 50); i--) {
        const div = allDivs[i];
        const text = div?.innerText?.trim();

        // Skip if it's likely not a response
        if (!text ||
          text.length < 20 ||
          text.includes("Send a message") ||
          text.includes("ChatGPT") ||
          text.includes("Copy code") ||
          div.querySelector('button, input, textarea')) {
          continue;
        }

        responseText = text;
        console.log("Got response from div search:", responseText?.substring(0, 100));
        break;
      }
    }

    return responseText || "No response detected - check console for details";
  }

  // 🔹 Claude
  if (who === "claude") {
    // Try the contenteditable approach first (ProseMirror)
    const claudeInputP = document.querySelector('p[data-placeholder*="help you"]') ||
      document.querySelector('p[data-placeholder]') ||
      document.querySelector('.ProseMirror p');



    if (claudeInputP) {
      // Clear existing content and set new content
      claudeInputP.innerHTML = prompt;

      // Remove empty classes
      claudeInputP.classList.remove('is-empty', 'is-editor-empty');

      // Trigger input events for ProseMirror
      const inputEvent = new Event("input", { bubbles: true });
      claudeInputP.dispatchEvent(inputEvent);

      // Focus the element
      claudeInputP.focus();

      // Also trigger on parent if it exists
      const proseMirrorParent = claudeInputP.closest('.ProseMirror');
      if (proseMirrorParent) {
        proseMirrorParent.dispatchEvent(new Event("input", { bubbles: true }));
      }
    } else {
      // Fallback to textarea
      const textarea = document.querySelector("textarea");
      if (!textarea) return "Input box not found";
      textarea.value = prompt;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    }

    // Wait a moment for the UI to update
    await new Promise(r => setTimeout(r, 500));

    // Try to find submit button
    const submitButton = document.querySelector('button[aria-label="Send Message"]') ||
      document.querySelector('button[data-testid="send-button"]') ||
      document.querySelector('svg[data-icon="send"]')?.closest('button') ||
      document.querySelector('button:not([disabled])') &&
      Array.from(document.querySelectorAll('button:not([disabled])')).find(btn =>
        btn.textContent.includes('Send') || btn.getAttribute('aria-label')?.includes('Send'));

    if (submitButton && !submitButton.disabled) {
      submitButton.click();
    } else {
      // Simulate Enter key press
      const activeElement = claudeInputP || document.querySelector("textarea");
      if (activeElement) {
        const enterEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true,
          composed: true
        });
        activeElement.dispatchEvent(enterEvent);
      }
    }

    // Alternative: retry send button after content is set
    await new Promise(r => setTimeout(r, 100));
    const sendButtonRetry = document.querySelector('button[aria-label*="Send"]:not([disabled])');
    if (sendButtonRetry) {
      console.log("Retrying Claude send button click");
      sendButtonRetry.click();
    }

    // Wait for response
    await new Promise(r => setTimeout(r, 3000));

    // Wait for streaming to complete
    let attempts = 0;
    while (attempts < 10) {
      const streamingIndicator = document.querySelector('[data-is-streaming="true"]') ||
        document.querySelector('.loading') ||
        document.querySelector('[aria-label*="Stop"]');
      if (!streamingIndicator) break;
      await new Promise(r => setTimeout(r, 1000));
      attempts++;
    }

    console.log("Claude finished waiting for streaming, now looking for messages...");

    // Try multiple selectors to find Claude response
    let responseText = "";

    // Try Claude-specific selectors first
    const claudeMessages = Array.from(document.querySelectorAll('[data-is-streaming="false"]'));
    console.log("Claude streaming=false messages found:", claudeMessages.length);

    if (claudeMessages.length > 0) {
      const lastMessage = claudeMessages[claudeMessages.length - 1];
      responseText = lastMessage?.innerText?.trim();
      console.log("Got Claude response from streaming=false:", responseText?.substring(0, 100));
    }

    // Fallback 1: Look for message content
    if (!responseText) {
      const messageElements = Array.from(document.querySelectorAll('.font-claude-message, .prose, [class*="message"]'));
      console.log("Claude message elements found:", messageElements.length);

      if (messageElements.length > 0) {
        const lastMessage = messageElements[messageElements.length - 1];
        responseText = lastMessage?.innerText?.trim();
        console.log("Got Claude response from message elements:", responseText?.substring(0, 100));
      }
    }

    // Fallback 2: Look for conversation content
    if (!responseText) {
      const conversationDivs = Array.from(document.querySelectorAll('div[data-testid*="conversation"] div, .conversation div'));
      console.log("Claude conversation divs found:", conversationDivs.length);

      const recentDivs = conversationDivs.slice(-10);
      for (let i = recentDivs.length - 1; i >= 0; i--) {
        const text = recentDivs[i]?.innerText?.trim();
        if (text && text.length > 10 && !text.includes("Send a message")) {
          responseText = text;
          console.log("Got Claude response from conversation:", responseText?.substring(0, 100));
          break;
        }
      }
    }

    return responseText || "No Claude response detected - check console for details";
  }

  // 🔹 AskMe
  if (who === "askme") {
    // Try the contenteditable approach first (ProseMirror)
    const askmeInputP = document.querySelector('p[data-placeholder*="help you"]') ||
      document.querySelector('p[data-placeholder]') ||
      document.querySelector('.ProseMirror p');

    console.log("AskMe input p found:", !!askmeInputP);

    if (askmeInputP) {
      // Clear existing content and set new content
      askmeInputP.innerHTML = prompt;

      // Remove empty classes
      askmeInputP.classList.remove('is-empty', 'is-editor-empty');

      // Trigger input events for ProseMirror
      const inputEvent = new Event("input", { bubbles: true });
      askmeInputP.dispatchEvent(inputEvent);

      // Focus the element
      askmeInputP.focus();

      // Also trigger on parent if it exists
      const proseMirrorParent = askmeInputP.closest('.ProseMirror');
      if (proseMirrorParent) {
        proseMirrorParent.dispatchEvent(new Event("input", { bubbles: true }));
      }
    } else {
      // Fallback to textarea
      const textarea = document.querySelector("textarea");
      console.log("AskMe textarea fallback found:", !!textarea);
      if (!textarea) return "Input box not found";
      textarea.value = prompt;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    }

    // Wait a moment for the UI to update
    await new Promise(r => setTimeout(r, 500));

    // Try to find submit button
    const submitButton = document.querySelector('button[aria-label="Send Message"]') ||
      document.querySelector('button[data-testid="send-button"]') ||
      document.querySelector('svg[data-icon="send"]')?.closest('button') ||
      document.querySelector('button:not([disabled])') &&
      Array.from(document.querySelectorAll('button:not([disabled])')).find(btn =>
        btn.textContent.includes('Send') || btn.getAttribute('aria-label')?.includes('Send'));
    console.log("AskMe submit button found:", !!submitButton);

    if (submitButton && !submitButton.disabled) {
      submitButton.click();
    } else {
      // Simulate Enter key press
      const activeElement = askmeInputP || document.querySelector("textarea");
      if (activeElement) {
        const enterEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true,
          composed: true
        });
        activeElement.dispatchEvent(enterEvent);
      }
    }

    // Alternative: retry send button after content is set
    await new Promise(r => setTimeout(r, 100));
    const sendButtonRetry = document.querySelector('button[aria-label*="Send"]:not([disabled])');
    if (sendButtonRetry) {
      console.log("Retrying AskMe send button click");
      sendButtonRetry.click();
    }

    await new Promise(r => setTimeout(r, 8000));

    // Try multiple selectors to find AskMe response
    let responseText = "";

    // Try AskMe-specific selectors first - target the response container
    const responseContainer = document.querySelector("#response-content-container");
    console.log("AskMe response container found:", !!responseContainer);

    if (responseContainer) {
      // Get all p tags within the response container
      const responseParagraphs = Array.from(responseContainer.querySelectorAll("p"));
      if (responseParagraphs.length > 0) {
        responseText = responseParagraphs.map(p => p.innerText?.trim()).filter(text => text).join('\n\n');
        console.log("Got AskMe response from response-content-container:", responseText?.substring(0, 100));
      }
    }

    // Fallback 1: Try other AskMe selectors
    if (!responseText) {
      const askmeMessages = Array.from(document.querySelectorAll(".chat-response, .message-content, [data-role='assistant']"));
      console.log("AskMe response messages found:", askmeMessages.length);

      if (askmeMessages.length > 0) {
        const lastMessage = askmeMessages[askmeMessages.length - 1];
        responseText = lastMessage?.innerText?.trim();
        console.log("Got AskMe response from chat-response:", responseText?.substring(0, 100));
      }
    }

    // Fallback 2: Look for conversation content
    if (!responseText) {
      const conversationDivs = Array.from(document.querySelectorAll('div[data-testid*="conversation"] div, .conversation div, .chat-message div'));
      console.log("AskMe conversation divs found:", conversationDivs.length);

      const recentDivs = conversationDivs.slice(-10);
      for (let i = recentDivs.length - 1; i >= 0; i--) {
        const text = recentDivs[i]?.innerText?.trim();
        if (text && text.length > 10 && !text.includes("Send a message")) {
          responseText = text;
          console.log("Got AskMe response from conversation:", responseText?.substring(0, 100));
          break;
        }
      }
    }

    return responseText || "No AskMe response detected - check console for details";
  }

  return "Unsupported target";
}