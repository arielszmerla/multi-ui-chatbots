// REAL Browser LLM using locally bundled Transformers.js with ES modules
// Import the pipeline function from the local Transformers.js

class RealBrowserLLM {
    constructor() {
        this.pipeline = null;
        this.isLoaded = false;
        this.isLoading = false;
        this.available = true;
    }

    async initialize(progressCallback) {
        if (this.isLoading || this.isLoaded) return;

        this.isLoading = true;
        progressCallback?.("🔄 Initializing Real Neural LLM...");

        try {
            progressCallback?.("📦 Transformers.js loaded! Downloading DistilGPT-2 model (~67MB)...");

            // Initialize the actual text generation pipeline with DistilGPT-2
            this.pipeline = await pipeline(
                'text-generation',
                'Xenova/distilgpt2',
                {
                    revision: 'main',
                    progress_callback: (progress) => {
                        if (progress.status === 'downloading') {
                            const percent = Math.round((progress.loaded / progress.total) * 100);
                            progressCallback?.(`📥 Downloading model: ${percent}% (${this.formatBytes(progress.loaded)}/${this.formatBytes(progress.total)})`);
                        } else if (progress.status === 'loading') {
                            progressCallback?.("⚡ Loading model into memory...");
                        }
                    }
                }
            );

            this.isLoaded = true;
            this.isLoading = false;
            progressCallback?.("🧠 Real DistilGPT-2 model loaded and ready!");

        } catch (error) {
            this.isLoading = false;
            console.error("Failed to load real LLM:", error);

            // Provide specific error messages
            let errorMessage = "Unknown error";
            if (error.message.includes('pipeline')) {
                errorMessage = "Model initialization failed - try reloading the extension";
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                errorMessage = "Cannot download model - check internet connection";
            } else {
                errorMessage = error.message;
            }

            throw new Error(`Real LLM failed to load: ${errorMessage}`);
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async summarize(text) {
        if (!this.isLoaded || !this.pipeline) {
            throw new Error("Real LLM not loaded yet - please wait for DistilGPT-2 model download to complete");
        }

        const prompt = this.createAnalysisPrompt(text);

        try {
            // Generate text using the real neural language model
            const result = await this.pipeline(prompt, {
                max_new_tokens: 400,
                temperature: 0.8,
                top_p: 0.9,
                repetition_penalty: 1.15,
                do_sample: true,
                pad_token_id: 50256,
                eos_token_id: 50256,
            });

            const generated = result[0].generated_text;
            const analysis = generated.substring(prompt.length).trim();

            return this.formatRealAnalysis(analysis, prompt);

        } catch (error) {
            console.error("Real LLM generation failed:", error);
            throw new Error(`Neural text generation failed: ${error.message}`);
        }
    }

    createAnalysisPrompt(text) {
        // Parse the responses to understand what we're analyzing
        const responses = this.parseResponses(text);
        const modelNames = responses.map(r => r.model).join(', ');

        const prompt = `AI Model Comparison Analysis

Models compared: ${modelNames}

Task: Analyze the following AI model responses and provide structured insights.

Responses:
${text.substring(0, 600)}${text.length > 600 ? '...' : ''}

Analysis:

**Key Similarities:**
Models agreed on`;

        return prompt;
    }

    parseResponses(text) {
        const responses = [];
        const sections = text.split(/\*\*(CHATGPT|CLAUDE|ASKME):\*\*/i);

        for (let i = 1; i < sections.length; i += 2) {
            const model = sections[i]?.trim() || '';
            const content = sections[i + 1]?.trim().substring(0, 300) || '';
            if (content && content.length > 10) {
                responses.push({ model: model.toUpperCase(), content });
            }
        }
        return responses;
    }

    formatRealAnalysis(generatedText, originalPrompt) {
        let analysis = generatedText;

        // Clean up the generated text
        analysis = analysis.replace(/\n\s*\n/g, '\n');
        analysis = analysis.trim();

        // Ensure we have proper structure - the model should generate this naturally
        if (!analysis.includes('**Key Similarities:**')) {
            analysis = `**Key Similarities:**\n${analysis}`;
        }

        // Add footer to show this was generated by real LLM
        analysis += `\n\n*🧠 Generated by DistilGPT-2 neural language model (locally bundled)*`;

        return analysis;
    }
}

// Global instance
window.realBrowserLLM = new RealBrowserLLM();

// Compatibility interface
window.simpleSummarizer = {
    available: true,
    summarize: (text) => window.realBrowserLLM.summarize(text)
};

// Notify when ready (ES module loaded)
setTimeout(() => {
    window.dispatchEvent(new CustomEvent('simpleSummarizerReady'));
}, 100); 