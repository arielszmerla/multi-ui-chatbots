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

// Utility functions for response filtering and formatting
const ResponseUtils = {
  isValidResponse(response) {
    return response && response.length > 10 && 
           !response.includes("Error:") && !response.includes("No tab open");
  },

  getValidResponses() {
    return Object.entries(collectedResponses)
      .filter(([_, response]) => this.isValidResponse(response));
  },

  formatForSummary(entries) {
    return entries.map(([model, response]) => `**${model.toUpperCase()}:**\n${response}`).join('\n\n');
  }
};

// Simplified summary generation
async function generateSummary() {
  const method = DOM.get("summary-method").value;
  const summarySection = DOM.get("summary-section");
  const summaryContent = DOM.get("summary-content");
  const summaryButton = DOM.get("generate-summary");

  // Setup loading state
  summarySection.classList.remove("hidden");
  summaryContent.innerHTML = '<div class="text-center text-muted">Generating summary...</div>';
  summaryButton.disabled = true;
  summaryButton.textContent = "Generating...";

  try {
    let summary;
    
    if (method === "browser") {
      summary = await generateBrowserBasedSummary();
    } else {
      const apiKey = DOM.get("openai-api-key").value.trim();
      if (!apiKey) throw new Error("Please configure your OpenAI API key first.");
      summary = await callOpenAI(apiKey, createSummaryPrompt());
    }

    summaryContent.innerHTML = summary;
  } catch (error) {
    console.error("Error generating summary:", error);
    summaryContent.innerHTML = `<div style="color: red;">Error generating summary: ${error.message}</div>`;
  } finally {
    summaryButton.disabled = false;
    summaryButton.textContent = "Regenerate Summary";
  }
}

async function generateBrowserBasedSummary() {
  if (!isModelLoaded) {
    throw new Error("Real LLM not loaded. Please wait for DistilGPT-2 model download to complete.");
  }

  const validResponses = ResponseUtils.getValidResponses();
  if (validResponses.length === 0) {
    throw new Error("No valid responses to summarize");
  }

  const combinedText = `Original Prompt: "${currentPrompt}"\n\nResponses:\n${ResponseUtils.formatForSummary(validResponses)}`;
  const summary = await generateBrowserSummary(combinedText);

  return `<div style="margin-bottom: 10px;"><strong>Real Neural LLM Analysis:</strong></div>
<div style="padding: 10px; background: #f8f9fa; border-radius: 4px; line-height: 1.5;">
${summary}
</div>
<div style="margin-top: 10px; font-size: 11px; color: #666;">
Generated using DistilGPT-2 neural language model (67MB, runs locally, completely private)
</div>`;
}

// Simplified prompt creation
function createSummaryPrompt() {
  const validResponses = ResponseUtils.formatForSummary(ResponseUtils.getValidResponses());

  return `Please analyze and summarize the following AI model responses to this prompt:

**Original Prompt:** "${currentPrompt}"

**Responses:**

${validResponses}

Please provide:
1. **Key Similarities:** What did all models agree on?
2. **Key Differences:** Where did the models diverge?  
3. **Unique Insights:** What unique perspectives did each model offer?
4. **Quality Assessment:** Which response was most comprehensive/accurate?
5. **Consolidated Answer:** Combine the best elements into one cohesive response.

Format your response clearly with the above sections.`;
}

// Simplified OpenAI API call
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
        { role: "system", content: "You are an expert AI analyst. Provide clear, structured comparisons and summaries of AI model responses." },
        { role: "user", content: prompt }
      ],
      max_tokens: 1500,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return (await response.json()).choices[0].message.content;
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
  return browserSummarizer.summarize(text);
}

function updateModelStatus(status) {
  DOM.get("model-status").textContent = status;
}

function updateSummaryButtonState() {
  const method = DOM.get("summary-method").value;
  const hasValidResponses = ResponseUtils.getValidResponses().length > 0;
  
  const canSummarize = hasValidResponses && (
    method === "browser" ? isModelLoaded : DOM.get("openai-api-key").value.trim().length > 0
  );

  DOM.get("generate-summary").classList.toggle("hidden", !canSummarize);
}

// Enable/disable send button based on prompt input
function updateSendButton() {
  DOM.get("send").disabled = !DOM.get("prompt").value.trim();
}

// Consolidated initialization
document.addEventListener('DOMContentLoaded', () => {
  // Initialize all managers
  const managers = {
    api: APIKeyManager,
    summary: {
      init() {
        const summaryMethod = DOM.get("summary-method");
        const openaiSettings = DOM.get("openai-settings");

        // Initialize visibility
        openaiSettings.classList.toggle("hidden", summaryMethod.value === "browser");

        summaryMethod.addEventListener("change", (e) => {
          openaiSettings.classList.toggle("hidden", e.target.value === "browser");
          updateSummaryButtonState();
        });
      }
    },
    models: {
      init() {
        document.querySelectorAll('input[name="model"]').forEach(checkbox => {
          const updateUI = () => {
            const status = checkbox.checked ? 'Ready' : 'Not selected';
            ResponseUI.setEnabled(checkbox.value, checkbox.checked);
            if (checkbox.checked) ResponseUI.updateStatus(checkbox.value, status);
          };

          checkbox.addEventListener('change', updateUI);
          updateUI(); // Initialize
        });
      }
    },
    tabs: {
      init() {
        document.querySelectorAll('.btn-small[data-url]').forEach(button => {
          button.addEventListener('click', async () => {
            const url = button.getAttribute('data-url');

            try {
              const existingTabs = await chrome.tabs.query({ url: url + '/*' });

              if (existingTabs.length > 0) {
                await chrome.tabs.update(existingTabs[0].id, { active: true });
                await chrome.windows.update(existingTabs[0].windowId, { focused: true });
              } else {
                await chrome.tabs.create({ url: url, active: true });
              }

              this.showFeedback(button, 'Opened!', '#90EE90');
            } catch (error) {
              console.error('Error opening tab:', error);
              this.showFeedback(button, 'Error', '#FFB6C1');
            }
          });
        });
      },

      showFeedback(button, text, color) {
        const original = { text: button.textContent, bg: button.style.background };
        button.textContent = text;
        button.style.background = color;
        setTimeout(() => {
          button.textContent = original.text;
          button.style.background = original.bg;
        }, 1000);
      }
    }
  };

  // Initialize everything
  Object.values(managers).forEach(manager => manager.init());

  // Initialize other components
  DOM.get("prompt").addEventListener("input", updateSendButton);
  updateSendButton();

  // Browser LLM initialization
  const initBrowserLLM = async () => {
    if (isModelLoading || isModelLoaded || !window.realBrowserLLM?.available) return;

    try {
      isModelLoading = true;
      updateModelStatus("Loading response compiler...");

      await window.realBrowserLLM.initialize((progress) => {
        updateModelStatus(`Simple Compiler: ${progress}`);
      });

      browserSummarizer = window.simpleSummarizer;
      isModelLoaded = true;
      isModelLoading = false;
      updateModelStatus("Real Neural LLM: DistilGPT-2 ready!");
      updateSummaryButtonState();
    } catch (error) {
      console.error("Error initializing Real Neural LLM:", error);
      isModelLoading = false;
      updateModelStatus(`Real Neural LLM: Failed to load - ${error.message}`);
    }
  };

  // Event listeners for LLM
  window.addEventListener('simpleSummarizerReady', () => {
    updateModelStatus("Simple Response Compiler ready!");
    if (!isModelLoaded && !isModelLoading) {
      setTimeout(initBrowserLLM, 500);
    }
  });

  if (window.simpleSummarizer?.available && !isModelLoaded && !isModelLoading) {
    initBrowserLLM();
  }
});

// AI Service Handlers (extracted from sendPromptAndScrape)
const AIServiceHandlers = {
  // Common utilities for all services
  async setPromptText(element, prompt) {
    if (element.tagName === 'TEXTAREA') {
      element.value = prompt;
      element.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      // For contenteditable elements
      element.textContent = prompt;
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }
    element.focus();
  },

  async triggerSubmit(element, submitSelectors) {
    // Try to find submit button
    let submitButton = null;
    for (const selector of submitSelectors) {
      submitButton = document.querySelector(selector);
      if (submitButton) break;
    }

    if (submitButton && !submitButton.disabled) {
      submitButton.click();
      return true;
    }

    // Fallback to Enter key
    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true, composed: true
    });
    element.dispatchEvent(enterEvent);
    return false;
  },

  async waitForResponse(streamingSelectors, maxAttempts = 10) {
    await new Promise(r => setTimeout(r, 3000)); // Initial wait

    let attempts = 0;
    while (attempts < maxAttempts) {
      const isStreaming = streamingSelectors.some(selector => document.querySelector(selector));
      if (!isStreaming) break;
      await new Promise(r => setTimeout(r, 1000));
      attempts++;
    }
  },

  async chatgpt(prompt) {
    // Find input element
    const promptP = document.querySelector("#prompt-textarea > p");
    const promptDiv = document.querySelector("#prompt-textarea");
    const textarea = document.querySelector("textarea");

    const inputElement = promptP || promptDiv || textarea;
    if (!inputElement) return "Input box not found";

    await this.setPromptText(inputElement, prompt);
    await new Promise(r => setTimeout(r, 500));

    const submitSelectors = [
      'button[data-testid="send-button"]',
      'svg[data-testid="send-button"]',
      'button[aria-label*="Send"]',
      '[data-testid="fruitjuice-send-button"]'
    ];

    await this.triggerSubmit(inputElement, submitSelectors);

    const streamingSelectors = [
      '[data-testid="stop-button"]',
      '.result-streaming',
      '[data-is-streaming="true"]'
    ];

    await this.waitForResponse(streamingSelectors);

    // Try multiple selectors to find response
    const responseSelectors = [
      '[data-message-author-role="assistant"]',
      '.markdown, .prose, [class*="markdown"]',
      '[data-testid*="conversation"] div, .conversation div, [role="presentation"] div'
    ];

    for (const selector of responseSelectors) {
      const elements = Array.from(document.querySelectorAll(selector));
      if (elements.length > 0) {
        const lastElement = elements[elements.length - 1];
        const text = lastElement?.innerText?.trim();
        if (text && text.length > 10) return text;
      }
    }

    return "No response detected - check console for details";
  },

  async claude(prompt) {
    // Find input element
    const claudeInputP = document.querySelector('p[data-placeholder*="help you"]') ||
      document.querySelector('p[data-placeholder]') ||
      document.querySelector('.ProseMirror p');
    const textarea = document.querySelector("textarea");

    const inputElement = claudeInputP || textarea;
    if (!inputElement) return "Input box not found";

    if (claudeInputP) {
      claudeInputP.innerHTML = prompt;
      claudeInputP.classList.remove('is-empty', 'is-editor-empty');
      claudeInputP.dispatchEvent(new Event("input", { bubbles: true }));
      claudeInputP.focus();

      const proseMirrorParent = claudeInputP.closest('.ProseMirror');
      if (proseMirrorParent) {
        proseMirrorParent.dispatchEvent(new Event("input", { bubbles: true }));
      }
    } else {
      await this.setPromptText(inputElement, prompt);
    }

    await new Promise(r => setTimeout(r, 500));

    const submitSelectors = [
      'button[aria-label="Send Message"]',
      'button[data-testid="send-button"]',
      'svg[data-icon="send"]',
      'button[aria-label*="Send"]:not([disabled])'
    ];

    await this.triggerSubmit(inputElement, submitSelectors);

    const streamingSelectors = [
      '[data-is-streaming="true"]',
      '.loading',
      '[aria-label*="Stop"]'
    ];

    await this.waitForResponse(streamingSelectors);

    // Try multiple selectors to find response
    const responseSelectors = [
      '[data-is-streaming="false"]',
      '.font-claude-message, .prose, [class*="message"]',
      'div[data-testid*="conversation"] div, .conversation div'
    ];

    for (const selector of responseSelectors) {
      const elements = Array.from(document.querySelectorAll(selector));
      if (elements.length > 0) {
        const lastElement = elements[elements.length - 1];
        const text = lastElement?.innerText?.trim();
        if (text && text.length > 10 && !text.includes("Send a message")) return text;
      }
    }

    return "No Claude response detected - check console for details";
  },

  async askme(prompt) {
    // Find input element
    const askmeInputP = document.querySelector('p[data-placeholder*="help you"]') ||
      document.querySelector('p[data-placeholder]') ||
      document.querySelector('.ProseMirror p');
    const textarea = document.querySelector("textarea");

    const inputElement = askmeInputP || textarea;
    if (!inputElement) return "Input box not found";

    if (askmeInputP) {
      askmeInputP.innerHTML = prompt;
      askmeInputP.classList.remove('is-empty', 'is-editor-empty');
      askmeInputP.dispatchEvent(new Event("input", { bubbles: true }));
      askmeInputP.focus();

      const proseMirrorParent = askmeInputP.closest('.ProseMirror');
      if (proseMirrorParent) {
        proseMirrorParent.dispatchEvent(new Event("input", { bubbles: true }));
      }
    } else {
      await this.setPromptText(inputElement, prompt);
    }

    await new Promise(r => setTimeout(r, 500));

    const submitSelectors = [
      'button[aria-label="Send Message"]',
      'button[data-testid="send-button"]',
      'button[title*="Send"]',
      'button[type="submit"]',
      'svg[data-icon="send"]',
      '[data-testid="send-icon"]',
      '[class*="send"]',
      'button[class*="primary"]'
    ];

    await this.triggerSubmit(inputElement, submitSelectors);

    // Multiple retry attempts for AskMe
    for (let retry = 0; retry < 3; retry++) {
      await new Promise(r => setTimeout(r, 200));
      const retryButton = document.querySelector('button[aria-label*="Send"]:not([disabled])') ||
        document.querySelector('button[title*="Send"]:not([disabled])');
      if (retryButton) {
        retryButton.click();
        break;
      }
    }

    await new Promise(r => setTimeout(r, 8000));

    // Try multiple selectors to find response
    const responseContainer = document.querySelector("#response-content-container");
    if (responseContainer) {
      const responseParagraphs = Array.from(responseContainer.querySelectorAll("p"));
      if (responseParagraphs.length > 0) {
        return responseParagraphs.map(p => p.innerText?.trim()).filter(text => text).join('\n\n');
      }
    }

    const responseSelectors = [
      ".chat-response, .message-content, [data-role='assistant']",
      'div[data-testid*="conversation"] div, .conversation div, .chat-message div'
    ];

    for (const selector of responseSelectors) {
      const elements = Array.from(document.querySelectorAll(selector));
      if (elements.length > 0) {
        const lastElement = elements[elements.length - 1];
        const text = lastElement?.innerText?.trim();
        if (text && text.length > 10 && !text.includes("Send a message")) return text;
      }
    }

    return "No AskMe response detected - check console for details";
  }
};

// Runs inside the target page
async function sendPromptAndScrape(prompt, who) {
  if (AIServiceHandlers[who]) {
    return await AIServiceHandlers[who](prompt);
  }
  return "Unsupported target";
}