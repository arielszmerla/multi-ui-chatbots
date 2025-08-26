// Simple Response Compiler
// Just compiles responses one after another - no complex analysis

class SimpleResponseCompiler {
    constructor() {
        this.isLoaded = true;
        this.isLoading = false;
        this.available = true;
    }

    async initialize(progressCallback) {
        // No initialization needed
        progressCallback?.("✅ Simple Response Compiler ready!");
    }

    async summarize(text) {
        console.log("📝 Compiling responses...");

        try {
            const responses = this.parseResponses(text);

            if (responses.length === 0) {
                return "⚠️ No responses found to compile. Make sure responses are formatted with **CHATGPT:**, **CLAUDE:**, or **ASKME:** headers.";
            }

            return this.compileResponses(responses);

        } catch (error) {
            console.error("Response compilation failed:", error);
            throw new Error(`Response compilation failed: ${error.message}`);
        }
    }

    parseResponses(text) {
        const responses = [];

        if (!text || typeof text !== 'string') {
            console.warn('Invalid input text');
            return responses;
        }

        const sections = text.split(/\*\*(CHATGPT|CLAUDE|ASKME):\*\*/i);

        for (let i = 1; i < sections.length; i += 2) {
            const model = sections[i]?.trim() || '';
            const content = sections[i + 1]?.trim() || '';

            if (content && content.length > 10) {
                responses.push({
                    model: model.toUpperCase(),
                    text: content
                });
            }
        }

        console.log('Found responses:', responses.length);
        return responses;
    }

    compileResponses(responses) {
        let compilation = "# 📋 Response Compilation\n\n";

        compilation += `Found ${responses.length} response(s):\n\n`;

        // Just list each response one after another
        responses.forEach((response, index) => {
            compilation += `## ${index + 1}. ${response.model}\n\n`;
            compilation += `${response.text}\n\n`;
            compilation += `---\n\n`;
        });

        compilation += `*📝 Simple compilation of ${responses.length} responses*`;

        return compilation;
    }
}

// Global instance
window.realBrowserLLM = new SimpleResponseCompiler();

// Compatibility interface
window.simpleSummarizer = {
    available: true,
    summarize: (text) => window.realBrowserLLM.summarize(text)
};

// Notify when ready
setTimeout(() => {
    window.dispatchEvent(new CustomEvent('simpleSummarizerReady'));
}, 100); 