# LLM Comparator Extension

A Chrome extension that allows you to send prompts to multiple AI models (ChatGPT, Claude, AskMe) simultaneously and get AI-powered summaries.

## Features

- **Multi-Model Comparison**: Send the same prompt to ChatGPT, Claude, and AskMe simultaneously
- **AI-Powered Summary**: Generate intelligent summaries and comparisons using OpenAI's GPT models
- **On-Demand Analysis**: Summary feature is triggered only when needed
- **Secure API Key Storage**: Your OpenAI API key is stored securely in browser storage

## Setup

1. Load the extension in Chrome (Developer mode)
2. **Configure OpenAI API Key**: In the extension popup, enter your OpenAI API key in the "OpenAI Settings" section
3. Open tabs for the AI services you want to use:
   - ChatGPT: https://chatgpt.com
   - Claude: https://claude.ai  
   - AskMe: https://askme.mobileye.com

## Usage

1. **Select Models**: Check the boxes for the AI models you want to query
2. **Enter Prompt**: Type your question/prompt in the text area
3. **Send**: Click "Send to Selected Models" - the extension will automatically:
   - Send your prompt to all selected models
   - Collect their responses
   - Show a "Generate Summary" button when responses are ready

4. **Generate Summary**: Click the "📊 Generate Summary" button to get an AI analysis that includes:
   - Key similarities between responses
   - Key differences and unique perspectives
   - Quality assessment of each response
   - Consolidated best-of-all-worlds answer

## Summary Features

The AI summary provides:
- **Comparative Analysis**: What models agreed/disagreed on
- **Unique Insights**: Special perspectives from each model
- **Quality Assessment**: Which response was most comprehensive
- **Consolidated Answer**: Best elements combined into one response

## Security Notes

- Your OpenAI API key is stored locally in Chrome's secure storage
- API calls are made directly from your browser to OpenAI
- No data is sent to third parties except OpenAI for summary generation
- You can remove your API key anytime by clearing the input field

## API Costs

The summary feature uses OpenAI's GPT-3.5-turbo model. Typical costs are very low (fractions of a cent per summary), but you're responsible for any OpenAI API usage charges.
