// Global variables to track responses
let collectedResponses = {};
let currentPrompt = "";

// Real Neural LLM variables
let browserSummarizer = null;
let isModelLoaded = false;
let isModelLoading = false;

// Constants
const MODEL_TARGETS = [
  { name: "chatgpt", url: "https://chatgpt.com/*" },
  { name: "claude", url: "https://claude.ai/*" },
  { name: "askme", url: "https://askme.mobileye.com/*" }
];

// DOM element cache
const DOM = {
  elements: {},
  get(id) {
    if (!this.elements[id]) {
      this.elements[id] = document.getElementById(id);
    }
    return this.elements[id];
  }
};

// Utility functions
const ResponseUI = {
  updateStatus(modelName, status) {
    DOM.get(modelName).innerHTML = `<b>${modelName}:</b><br>${status}`;
  },

  setEnabled(modelName, enabled) {
    const div = DOM.get(modelName);
    if (enabled) {
      div.classList.remove('disabled');
      this.updateStatus(modelName, 'Starting...');
    } else {
      div.classList.add('disabled');
      this.updateStatus(modelName, 'Not selected');
    }
  }
};

DOM.get("send").addEventListener("click", async () => {
  const prompt = DOM.get("prompt").value;
  currentPrompt = prompt;

  // Reset collected responses
  collectedResponses = {};

  // Hide summary section and button
  DOM.get("summary-section").classList.add("hidden");
  DOM.get("generate-summary").classList.add("hidden");

  // Get selected models
  const enabledModels = Array.from(document.querySelectorAll('input[name="model"]:checked')).map(cb => cb.value);

  // Update visual state for all models
  for (const target of MODEL_TARGETS) {
    ResponseUI.setEnabled(target.name, enabledModels.includes(target.name));
  }

  // Process all selected models concurrently
  const processingPromises = MODEL_TARGETS
    .filter(target => enabledModels.includes(target.name))
    .map(async (target) => {
      try {
        const tabs = await chrome.tabs.query({ url: target.url });

        if (tabs.length === 0) {
          const noTabMessage = "No tab open";
          ResponseUI.updateStatus(target.name, noTabMessage);
          collectedResponses[target.name] = noTabMessage;
          return;
        }

        ResponseUI.updateStatus(target.name, "Sending...");

        const [{ result }] = await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: sendPromptAndScrape,
          args: [prompt, target.name]
        });
        ResponseUI.updateStatus(target.name, result);
        collectedResponses[target.name] = result;
      } catch (error) {
        console.error(`Error with ${target.name}:`, error);
        const errorMessage = `Error: ${error.message}`;
        ResponseUI.updateStatus(target.name, errorMessage);
        collectedResponses[target.name] = errorMessage;
      }
    });

  // Wait for all models to complete
  await Promise.all(processingPromises);

  // Show summary button if we have responses and API key is configured
  updateSummaryButtonState();
});

// Summary functionality
DOM.get("generate-summary").addEventListener("click", async () => {
  await generateSummary();
});

// API Key management utility
const APIKeyManager = {
  saveTimeout: null,

  init() {
    // Auto-save on input (with debounce)
    DOM.get("openai-api-key").addEventListener("input", (e) => {
      const apiKey = e.target.value.trim();
      this.debouncedSave(apiKey);
      updateSummaryButtonState();
    });

    // Manual save button
    DOM.get("save-api-key").addEventListener("click", async () => {
      const apiKey = DOM.get("openai-api-key").value.trim();
      await this.save(apiKey);
    });

    // Change API key button
    DOM.get("change-api-key").addEventListener("click", () => {
      this.showInputModeWithCurrentKey();
    });

    // Remove API key button
    DOM.get("remove-api-key").addEventListener("click", async () => {
      if (confirm("Are you sure you want to remove your API key?")) {
        await this.save(""); // Save empty string to remove
      }
    });

    // Also save on blur to ensure it's saved
    DOM.get("openai-api-key").addEventListener("blur", async (e) => {
      const apiKey = e.target.value.trim();
      if (apiKey) {
        await this.save(apiKey);
      }
    });
  },

  debouncedSave(apiKey) {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(async () => {
      await this.save(apiKey);
    }, 1000);
  },

  async save(apiKey) {
    try {
      // Try Chrome storage first
      if (chrome && chrome.storage && chrome.storage.local) {
        if (apiKey) {
          await chrome.storage.local.set({ openaiApiKey: apiKey });
          this.updateStatus("API key saved (Chrome)");
          this.showSavedMode();
        } else {
          await chrome.storage.local.remove("openaiApiKey");
          this.updateStatus("API key not configured");
          this.showInputMode();
        }
      } else {
        // Fallback to localStorage
        if (apiKey) {
          localStorage.setItem("openaiApiKey", apiKey);
          this.updateStatus("API key saved (local)");
          this.showSavedMode();
        } else {
          localStorage.removeItem("openaiApiKey");
          this.updateStatus("API key not configured");
          this.showInputMode();
        }
      }
      updateSummaryButtonState();
    } catch (error) {
      console.error("Error saving API key:", error);
      this.updateStatus(`Error saving API key: ${error.message}`);
    }
  },

  async load() {
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
        DOM.get("openai-api-key").value = apiKey;
        this.updateStatus("API key configured");
        this.showSavedMode();
        updateSummaryButtonState();
      } else {
        this.updateStatus("API key not configured");
        this.showInputMode();
      }
    } catch (error) {
      console.error("Error loading API key:", error);
      this.updateStatus(`Error loading API key: ${error.message}`);
      this.showInputMode();
    }
  },

  updateStatus(message) {
    DOM.get("api-status").textContent = message;
  },

  showInputMode() {
    DOM.get("api-key-input-mode").classList.remove("hidden");
    DOM.get("api-key-saved-mode").classList.add("hidden");
    DOM.get("openai-api-key").value = "";
    DOM.get("openai-api-key").focus();
  },

  showSavedMode() {
    DOM.get("api-key-input-mode").classList.add("hidden");
    DOM.get("api-key-saved-mode").classList.remove("hidden");
  },

  showInputModeWithCurrentKey() {
    DOM.get("api-key-input-mode").classList.remove("hidden");
    DOM.get("api-key-saved-mode").classList.add("hidden");
    DOM.get("openai-api-key").focus();
  }
};

// Summary generation functionality  
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
    throw new Error("Real LLM not loaded. Please wait for DistilGPT-2 model download to complete.");
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

  // Generate summary using real neural LLM
  const summary = await generateBrowserSummary(combinedText);

  // Format the summary nicely
  return `<div style="margin-bottom: 10px;"><strong>Real Neural LLM Analysis:</strong></div>
<div style="padding: 10px; background: #f8f9fa; border-radius: 4px; line-height: 1.5;">
${summary}
</div>
<div style="margin-top: 10px; font-size: 11px; color: #666;">
Generated using DistilGPT-2 neural language model (67MB, runs locally, completely private)
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

// Real Neural LLM Functions
async function initBrowserLLM() {
  if (isModelLoading || isModelLoaded) return;

  // Check if Real Browser LLM is available
  if (!window.realBrowserLLM || !window.realBrowserLLM.available) {
    updateModelStatus("Real Neural LLM: Library not available");
    return;
  }

  try {
    isModelLoading = true;
    updateModelStatus("Loading response compiler...");

    // Initialize Simple Response Compiler with progress tracking
    await window.realBrowserLLM.initialize((progressMessage) => {
      updateModelStatus(`Simple Compiler: ${progressMessage}`);
    });

    // Use the real neural LLM instance
    browserSummarizer = window.simpleSummarizer; // This uses the realBrowserLLM under the hood

    isModelLoaded = true;
    isModelLoading = false;
    updateModelStatus("Real Neural LLM: DistilGPT-2 ready!");
    updateSummaryButtonState();

  } catch (error) {
    console.error("Error initializing Real Neural LLM:", error);
    isModelLoading = false;
    updateModelStatus(`Real Neural LLM: Failed to load - ${error.message}`);
  }
}

async function generateBrowserSummary(text) {
  if (!isModelLoaded || !browserSummarizer) {
    throw new Error("Real Neural LLM not loaded");
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
  DOM.get("model-status").textContent = status;
}

function updateSummaryButtonState() {
  const method = DOM.get("summary-method").value;
  const hasResponses = Object.keys(collectedResponses).length > 0;
  const hasValidResponses = Object.values(collectedResponses).some(response =>
    response && response.length > 10 && !response.includes("Error:") && !response.includes("No tab open")
  );

  let canSummarize = false;

  if (method === "browser") {
    canSummarize = hasResponses && hasValidResponses && isModelLoaded;
  } else if (method === "openai") {
    const hasApiKey = DOM.get("openai-api-key").value.trim().length > 0;
    canSummarize = hasResponses && hasValidResponses && hasApiKey;
  }

  if (canSummarize) {
    DOM.get("generate-summary").classList.remove("hidden");
  } else {
    DOM.get("generate-summary").classList.add("hidden");
  }
}

// Enable/disable send button based on prompt input
function updateSendButton() {
  const prompt = DOM.get("prompt").value.trim();
  DOM.get("send").disabled = prompt.length === 0;
}

// Add event listeners to update visual state when checkboxes change
document.addEventListener('DOMContentLoaded', () => {
  // Initialize API key management
  APIKeyManager.init();
  APIKeyManager.load();

  // Add input listener to prompt textarea
  DOM.get("prompt").addEventListener("input", updateSendButton);

  // Initialize send button state
  updateSendButton();

  // Initialize OpenAI settings visibility based on default summary method
  const initialMethod = document.getElementById("summary-method").value;
  const openaiSettings = document.getElementById("openai-settings");
  if (initialMethod === "browser") {
    openaiSettings.classList.add("hidden");
  }

  // Summary method selection event listener
  document.getElementById("summary-method").addEventListener("change", (e) => {
    const method = e.target.value;
    const openaiSettings = document.getElementById("openai-settings");

    if (method === "browser") {
      openaiSettings.classList.add("hidden");
      if (!isModelLoaded && !isModelLoading) {
        updateModelStatus("Real Neural LLM: Model not downloaded yet");
      }
    } else {
      openaiSettings.classList.remove("hidden");
    }

    updateSummaryButtonState();
  });

  // Listen for Real Neural LLM ready event
  window.addEventListener('simpleSummarizerReady', () => {
    updateModelStatus("Simple Response Compiler ready!");

    // Auto-initialize Real Neural LLM when ready
    console.log("SimpleSummarizerReady event fired, isModelLoaded:", isModelLoaded, "isModelLoading:", isModelLoading);
    if (!isModelLoaded && !isModelLoading) {
      console.log("Starting initBrowserLLM...");
      setTimeout(() => initBrowserLLM(), 500); // Small delay to ensure everything is ready
    }
  });

  // No manual download needed for simple compiler

  // Initialize Real Neural LLM immediately if available
  if (window.simpleSummarizer && window.simpleSummarizer.available && !isModelLoaded && !isModelLoading) {
    initBrowserLLM();
  }

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

    // Try to find submit button with comprehensive AskMe-specific selectors
    const submitButton = document.querySelector('button[aria-label="Send Message"]') ||
      document.querySelector('button[data-testid="send-button"]') ||
      document.querySelector('button[title*="Send"]') ||
      document.querySelector('button[type="submit"]') ||
      document.querySelector('svg[data-icon="send"]')?.closest('button') ||
      document.querySelector('[data-testid="send-icon"]')?.closest('button') ||
      document.querySelector('[class*="send"]')?.closest('button') ||
      document.querySelector('[class*="submit"]')?.closest('button') ||
      document.querySelector('button[class*="primary"]') ||
      Array.from(document.querySelectorAll('button:not([disabled])')).find(btn => {
        const text = btn.textContent?.toLowerCase()?.trim() || '';
        const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
        const className = btn.className?.toLowerCase() || '';
        return text.includes('send') || text.includes('submit') || text === 'go' ||
          ariaLabel.includes('send') || ariaLabel.includes('submit') ||
          className.includes('send') || className.includes('submit');
      });
    console.log("AskMe submit button found:", !!submitButton);

    if (submitButton && !submitButton.disabled) {
      console.log("Clicking AskMe submit button");
      submitButton.click();
    } else {
      // Simulate comprehensive Enter key sequence
      const activeElement = askmeInputP || document.querySelector("textarea") || document.querySelector('.ProseMirror');
      console.log("AskMe trying Enter key on element:", !!activeElement);
      if (activeElement) {
        // Complete key event sequence
        const keyDownEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true,
          composed: true
        });

        const keyPressEvent = new KeyboardEvent('keypress', {
          key: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true
        });

        const keyUpEvent = new KeyboardEvent('keyup', {
          key: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true
        });

        activeElement.dispatchEvent(keyDownEvent);
        activeElement.dispatchEvent(keyPressEvent);
        activeElement.dispatchEvent(keyUpEvent);
        console.log("AskMe Enter key events dispatched");
      }
    }

    // Multiple retry attempts for AskMe
    for (let retry = 0; retry < 3; retry++) {
      await new Promise(r => setTimeout(r, 200));

      const sendButtonRetry = document.querySelector('button[aria-label*="Send"]:not([disabled])') ||
        document.querySelector('button[title*="Send"]:not([disabled])') ||
        Array.from(document.querySelectorAll('button:not([disabled])')).find(btn =>
          btn.textContent?.toLowerCase().includes('send')
        );

      if (sendButtonRetry) {
        console.log(`AskMe retry ${retry + 1}: Clicking send button`);
        sendButtonRetry.click();
        break;
      }
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