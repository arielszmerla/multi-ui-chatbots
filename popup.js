document.getElementById("send").addEventListener("click", async () => {
  const prompt = document.getElementById("prompt").value;
  console.log("Prompt:", prompt);

  // Get selected models
  const enabledModels = Array.from(document.querySelectorAll('input[name="model"]:checked')).map(cb => cb.value);
  console.log("Enabled models:", enabledModels);

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
      console.log(`Checking tabs for ${target.name}:`, target.url);

      try {
        const tabs = await chrome.tabs.query({ url: target.url });
        console.log(`Found ${tabs.length} tabs for ${target.name}:`, tabs);

        if (tabs.length === 0) {
          document.getElementById(target.name).innerHTML = `<b>${target.name}:</b><br>No tab open`;
          return;
        }

        console.log(`Executing script on ${target.name} tab:`, tabs[0].id);
        document.getElementById(target.name).innerHTML = `<b>${target.name}:</b><br>Sending...`;

        const [{ result }] = await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: sendPromptAndScrape,
          args: [prompt, target.name]
        });

        console.log(`Result from ${target.name}:`, result);
        document.getElementById(target.name).innerHTML = `<b>${target.name}:</b><br>${result}`;
      } catch (error) {
        console.error(`Error with ${target.name}:`, error);
        document.getElementById(target.name).innerHTML = `<b>${target.name}:</b><br>Error: ${error.message}`;
      }
    });

  // Wait for all models to complete
  await Promise.all(processingPromises);
});

// Add event listeners to update visual state when checkboxes change
document.addEventListener('DOMContentLoaded', () => {
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
  const openTabButtons = document.querySelectorAll('.open-tab-btn');
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
          console.log(`Focused existing ${modelName} tab`);
        } else {
          // Create new tab
          await chrome.tabs.create({ url: url, active: true });
          console.log(`Created new ${modelName} tab`);
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
  console.log(`Running on ${who} with prompt:`, prompt);

  // 🔹 ChatGPT
  if (who === "chatgpt") {
    // Try the contenteditable approach first
    const promptDiv = document.querySelector("#prompt-textarea");
    const promptP = document.querySelector("#prompt-textarea > p");

    console.log("ChatGPT prompt div found:", !!promptDiv);
    console.log("ChatGPT prompt p found:", !!promptP);

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
      console.log("ChatGPT textarea fallback found:", !!textarea);
      if (!textarea) return "Input box not found";
      textarea.value = prompt;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    }

    // Try to find submit button
    const submitButton = document.querySelector('button[data-testid="send-button"]') ||
      document.querySelector('svg[data-testid="send-button"]')?.closest('button') ||
      document.querySelector('button[aria-label*="Send"]') ||
      document.querySelector('[data-testid="fruitjuice-send-button"]');
    console.log("ChatGPT submit button found:", !!submitButton);

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
      console.log("Retrying send button click");
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

    console.log("Finished waiting for streaming, now looking for messages...");

    // Try multiple selectors to find ChatGPT response
    let responseText = "";

    // Try data-message-author-role first
    const assistantMessages = Array.from(document.querySelectorAll('[data-message-author-role="assistant"]'));
    console.log("Assistant messages found:", assistantMessages.length);

    if (assistantMessages.length > 0) {
      const lastMessage = assistantMessages[assistantMessages.length - 1];
      responseText = lastMessage?.innerText?.trim();
      console.log("Got response from assistant role:", responseText?.substring(0, 100));
    }

    // Fallback 1: Look for markdown content
    if (!responseText) {
      const markdownElements = Array.from(document.querySelectorAll('.markdown, .prose, [class*="markdown"]'));
      console.log("Markdown elements found:", markdownElements.length);

      if (markdownElements.length > 0) {
        const lastMarkdown = markdownElements[markdownElements.length - 1];
        responseText = lastMarkdown?.innerText?.trim();
        console.log("Got response from markdown:", responseText?.substring(0, 100));
      }
    }

    // Fallback 2: Look for conversation messages
    if (!responseText) {
      const conversationMessages = Array.from(document.querySelectorAll('[data-testid*="conversation"] div, .conversation div, [role="presentation"] div'));
      console.log("Conversation messages found:", conversationMessages.length);

      // Get the last few and find one that looks like a response
      const recentMessages = conversationMessages.slice(-10);
      for (let i = recentMessages.length - 1; i >= 0; i--) {
        const text = recentMessages[i]?.innerText?.trim();
        if (text && text.length > 10 && !text.includes("Copy code")) {
          responseText = text;
          console.log("Got response from conversation:", responseText?.substring(0, 100));
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

    console.log("Claude input p found:", !!claudeInputP);

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
      console.log("Claude textarea fallback found:", !!textarea);
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
    console.log("Claude submit button found:", !!submitButton);

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