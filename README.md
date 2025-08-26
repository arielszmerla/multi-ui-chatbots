# LLM Comparator Extension

A Chrome extension that allows you to send prompts to multiple AI models (ChatGPT, Claude, AskMe) simultaneously and get AI-powered summaries with **two analysis options**: local browser LLM or OpenAI API.

## 🎯 Features

- **Multi-Model Comparison**: Send the same prompt to ChatGPT, Claude, and AskMe simultaneously
- **Dual Analysis Options**:
  - **Local Browser LLM**: Intelligent analysis engine running entirely in your browser (free, private)
  - **OpenAI API**: Cloud-based analysis using GPT-3.5-turbo (higher quality, requires API key)
- **Intelligent Comparative Analysis**: Get structured insights with similarities, differences, and consolidated answers
- **Complete Privacy Option**: Local analysis never sends data externally
- **Smart UI Controls**: Settings adapt based on your chosen analysis method
- **One-Click Tab Management**: Automatically open AI service tabs

## 🚀 Setup

1. **Load Extension**: Load the extension in Chrome (Developer mode)
2. **Open AI Service Tabs**: Use the "Open Tab" buttons or manually navigate to:
   - ChatGPT: https://chatgpt.com
   - Claude: https://claude.ai  
   - AskMe: https://askme.mobileye.com
3. **Choose Analysis Method**:
   - **For Local Analysis**: No setup required - works immediately offline
   - **For OpenAI Analysis**: Configure your OpenAI API key in the extension popup

## 📖 Usage

### Basic Workflow
1. **Select Models**: Check the boxes for the AI models you want to query
2. **Enter Prompt**: Type your question/prompt in the text area
3. **Send**: Click "Send" - the extension will automatically:
   - Send your prompt to all selected models
   - Collect their responses in real-time
   - Show analysis options when responses are ready

### Analysis Options

#### 🏠 Local Browser LLM (Recommended)
- **Setup**: None required
- **Cost**: Completely free
- **Privacy**: 100% local - no data leaves your browser
- **Features**: Intelligent analysis with keyword extraction, pattern recognition, and quality assessment

#### ☁️ OpenAI API
- **Setup**: Requires OpenAI API key
- **Cost**: Pay-per-use (typically fractions of a cent per summary)
- **Privacy**: Data sent to OpenAI for processing
- **Features**: Advanced language model analysis

### Summary Analysis Includes
- **Key Similarities**: What all models agreed on
- **Key Differences**: Where models diverged in their approaches
- **Unique Insights**: Special perspectives each model contributed
- **Quality Assessment**: Which response was most comprehensive/accurate
- **Consolidated Answer**: Best elements combined into one cohesive response

## 🔧 Technical Features

### Local Browser LLM Engine
- **Intelligent Response Parsing**: Automatically identifies and extracts model responses
- **Keyword Analysis**: Extracts and analyzes important themes and concepts
- **Pattern Recognition**: Identifies questions, examples, and structured content
- **Complexity Measurement**: Analyzes sentence structure and lexical diversity
- **Quality Scoring**: Multi-factor assessment of response comprehensiveness
- **Sentence Consolidation**: Combines best elements while avoiding duplication

### Security & Privacy
- **CSP Compliant**: No external script dependencies
- **Local Storage**: API keys stored securely in Chrome's storage
- **No External Dependencies**: Local analysis works completely offline
- **Selective Privacy**: Choose between local processing or cloud analysis

## 🛠️ Configuration

### OpenAI API Setup (Optional)
1. Get an API key from [OpenAI](https://platform.openai.com/api-keys)
2. In the extension popup, select "OpenAI API (Cloud-based)" from the Summary Method dropdown
3. Enter your API key in the OpenAI settings section
4. The extension will securely store your key for future use

### Browser LLM (Default)
- **Auto-Initialize**: Loads automatically when extension opens
- **No Configuration**: Works out of the box
- **Offline Capable**: Functions without internet connection
- **Instant Analysis**: No external API delays

## 💰 Costs

- **Local Browser LLM**: Completely free forever
- **OpenAI API**: Uses GPT-3.5-turbo model (~$0.001-0.002 per summary)

## 🔐 Privacy & Security

### Local Analysis Mode
- ✅ Zero external data transmission
- ✅ Complete privacy - analysis happens in your browser
- ✅ No API keys required
- ✅ Works offline

### OpenAI Analysis Mode  
- ⚠️ Data sent to OpenAI for processing
- ✅ API key stored locally in Chrome's secure storage
- ✅ Direct browser-to-OpenAI communication
- ✅ No third-party data collection

## 🎨 UI Improvements

- **Adaptive Interface**: Settings automatically show/hide based on selected analysis method
- **Better Layout**: Summary controls positioned logically below model outputs
- **Real-time Status**: Progress tracking for local LLM initialization
- **One-click Tab Management**: Built-in buttons to open AI service tabs

## 🚀 Performance

- **Local Analysis**: Instant results, no network delays
- **Smart Caching**: Models stay loaded for repeated use
- **Efficient Parsing**: Optimized for real-time response processing
- **Background Processing**: Non-blocking analysis operations

## 🔄 Version History

- **v1.1**: Added local browser LLM with intelligent analysis engine
- **v1.0**: Initial release with OpenAI-powered summaries
