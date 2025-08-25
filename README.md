# 🤖 LLM Comparator Extension

A powerful Chrome extension that allows you to send the same prompt to multiple AI models simultaneously and compare their responses side-by-side. Perfect for evaluating different AI perspectives, testing prompt effectiveness, and making informed decisions about which AI to use for specific tasks.

## 🎯 Features

### Core Functionality
- **🚀 Concurrent Processing**: Send prompts to multiple AI models simultaneously for faster comparisons
- **🎯 Selective Model Targeting**: Choose which AI models to query using checkboxes
- **📱 One-Click Tab Management**: Open required AI model tabs directly from the extension
- **⚡ Real-time Response Display**: See responses appear as each AI completes processing
- **🔄 Smart Input Handling**: Works with modern contenteditable interfaces (ChatGPT, Claude, AskMe)

### Supported AI Models
- **ChatGPT** (chatgpt.com) - OpenAI's conversational AI
- **Claude** (claude.ai) - Anthropic's AI assistant  
- **AskMe** (askme.mobileye.com) - Internal Mobileye AI assistant

### User Experience
- **✅ Visual Status Updates**: Clear feedback showing "Starting...", "Sending...", and response states
- **🎨 Modern UI**: Clean, responsive interface with hover effects and visual feedback
- **⚙️ Smart Defaults**: AskMe pre-selected for Mobileye users
- **🔗 Tab Integration**: Seamlessly integrates with existing browser tabs

## 📦 Installation

### Prerequisites
- Google Chrome or Chromium-based browser
- Access to the supported AI platforms (accounts logged in)

### Install Steps

1. **Download the Extension**
   ```bash
   git clone https://github.com/arielszmerla/multi-ui-chatbots.git
   cd multi-ui-chatbots
   ```

2. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the extension folder
   - The extension icon should appear in your toolbar

3. **Grant Permissions**
   - The extension will request permissions for:
     - `https://chatgpt.com/*`
     - `https://claude.ai/*` 
     - `https://askme.mobileye.com/*`
   - Click "Allow" to enable functionality

## 🚀 Usage

### Quick Start
1. **Open AI Model Tabs** (optional)
   - Click the extension icon
   - Use "Open Tab" buttons to open required AI platforms
   - Or manually open tabs for ChatGPT, Claude, and/or AskMe

2. **Select Models**
   - Check the boxes for AI models you want to query
   - AskMe is selected by default

3. **Send Prompt**
   - Type your prompt in the text area
   - Click "Send"
   - Watch as all selected models process simultaneously

4. **Compare Responses**
   - Responses appear in real-time as each AI completes
   - Compare quality, style, accuracy, and approach side-by-side

### Advanced Usage

#### Prompt Testing Workflow
1. Open all three AI model tabs using "Open Tab" buttons
2. Select all models for comprehensive comparison
3. Test different prompt variations to see how each AI responds
4. Use results to choose the best AI for your specific use case

#### Model-Specific Scenarios
- **Creative Writing**: Compare ChatGPT vs Claude for storytelling
- **Technical Questions**: Test AskMe vs ChatGPT for Mobileye-specific queries
- **General Knowledge**: Use all three for comprehensive perspective

## 🔧 Technical Details

### Architecture
- **Manifest V3** Chrome extension with modern APIs
- **Concurrent Processing** using `Promise.all()` for simultaneous execution
- **Content Script Injection** for dynamic interaction with AI interfaces
- **Advanced DOM Manipulation** supporting React/contenteditable components

### Key Technologies
- **Chrome Extension APIs**: `chrome.tabs`, `chrome.scripting`
- **Modern JavaScript**: ES6+, async/await, DOM manipulation
- **CSS3**: Flexbox layouts, hover effects, transitions
- **Event-driven Architecture**: Real-time UI updates

### Input Handling
The extension intelligently handles different input methods:
- **ChatGPT**: `#prompt-textarea > p` contenteditable detection
- **Claude**: ProseMirror `p[data-placeholder]` targeting  
- **AskMe**: ProseMirror contenteditable with class management
- **Fallbacks**: Traditional textarea and keyboard event simulation

### Response Detection
Sophisticated response capture using multiple strategies:
- **Primary selectors**: Model-specific response containers
- **Streaming detection**: Waits for AI completion before scraping
- **Fallback methods**: Multiple DOM query strategies for reliability
- **Content filtering**: Removes UI elements and focuses on actual responses

## 📁 File Structure

```
multi-ui-chatbots/
├── manifest.json          # Chrome extension manifest with permissions
├── popup.html             # Extension popup UI with model selection
├── popup.js               # Main logic for concurrent processing
├── content.js             # Placeholder content script
└── README.md              # This documentation
```

### File Descriptions

- **`manifest.json`**: Defines extension permissions, content scripts, and metadata
- **`popup.html`**: Creates the user interface with checkboxes, buttons, and response areas
- **`popup.js`**: Contains all the logic for tab management, concurrent processing, and AI interaction
- **`content.js`**: Minimal content script (currently placeholder)

## 🛠️ Development

### Prerequisites for Development
- Basic knowledge of Chrome Extension APIs
- Understanding of modern JavaScript (ES6+)
- Familiarity with DOM manipulation and async programming

### Testing
1. Make code changes
2. Go to `chrome://extensions/`
3. Click reload button on the extension
4. Test with different AI models and prompts

### Debugging
- Right-click extension popup → "Inspect" to access DevTools
- Check console logs for detailed execution information
- Monitor network requests in the background tab DevTools

## 🔮 Future Enhancements

### Planned Features
- **📊 Response Analytics**: Quality scoring, response time tracking, word counts
- **💾 History Management**: Save and compare previous prompt/response sessions
- **📤 Export Options**: Save comparisons to PDF, CSV, or Markdown
- **🎨 UI Improvements**: Dark mode, resizable panels, keyboard shortcuts
- **🔧 Advanced Settings**: Custom AI model URLs, prompt templates
- **📈 Performance Metrics**: Track usage patterns and model preferences

### Potential Integrations
- **VS Code Extension**: Compare code suggestions and explanations
- **Slack/Discord Bots**: Team-based AI comparisons
- **Note-taking Apps**: Direct integration with Notion, Obsidian
- **API Support**: Add support for additional AI models and APIs

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and test thoroughly
4. **Commit your changes**: `git commit -m 'Add amazing feature'`
5. **Push to branch**: `git push origin feature/amazing-feature`
6. **Open a Pull Request**

### Contribution Ideas
- Add support for new AI models
- Improve response detection algorithms  
- Enhance UI/UX design
- Add export/import functionality
- Create automated testing suite

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- **OpenAI** for ChatGPT API and interface inspiration
- **Anthropic** for Claude AI capabilities
- **Mobileye** for internal AskMe AI platform
- **Chrome Extension Community** for development resources and best practices

## 📞 Support

For questions, issues, or feature requests:
- **GitHub Issues**: [Report bugs or request features](https://github.com/arielszmerla/multi-ui-chatbots/issues)
- **Discussions**: Share ideas and get community support

---

**Built with ❤️ for the AI community**

*Compare smarter, decide faster, build better with AI.*
