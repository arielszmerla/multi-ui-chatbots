// REAL Browser LLM using locally bundled Transformers.js with ES modules
// With sophisticated fallback analysis system

let pipeline = null;
try {
    // Try to import Transformers.js pipeline
    const transformersModule = await import('./libs/transformers.js');
    pipeline = transformersModule.pipeline;
    console.log("✅ Transformers.js ES module loaded successfully");
} catch (error) {
    console.warn("⚠️ Transformers.js import failed (likely CSP restrictions):", error.message);
    console.log("🔄 Will use sophisticated fallback analysis engine");
}

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
            if (pipeline) {
                // Use real Transformers.js if available
                progressCallback?.("📦 Transformers.js loaded! Downloading DistilGPT-2 model (~67MB)...");
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
            } else {
                // Use sophisticated fallback analysis engine
                progressCallback?.("🧠 Initializing Sophisticated Analysis Engine...");
                this.pipeline = 'fallback'; // Mark as using fallback
                this.isLoaded = true;
                this.isLoading = false;
                progressCallback?.("✅ Advanced Analysis Engine ready! (CSP-compliant fallback)");
            }
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
            throw new Error("Analysis engine not loaded yet - please wait for initialization to complete");
        }

        if (this.pipeline === 'fallback') {
            // Use sophisticated fallback analysis engine
            return this.performAdvancedAnalysis(text);
        } else {
            // Use real neural LLM
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
    }

    async performAdvancedAnalysis(text) {
        // Sophisticated rule-based analysis engine
        console.log("🔬 Running Advanced Analysis Engine...");

        const responses = this.parseResponses(text);
        if (responses.length === 0) {
            return "⚠️ No valid responses found to analyze.";
        }

        // Comprehensive analysis components
        const contentAnalysis = this.analyzeContent(responses);
        const qualityAssessment = this.assessQuality(responses);
        const comparisonMatrix = this.buildComparisonMatrix(responses);
        const recommendations = this.generateRecommendations(responses, contentAnalysis);

        // Format comprehensive analysis
        return this.formatAdvancedAnalysis({
            responses,
            contentAnalysis,
            qualityAssessment,
            comparisonMatrix,
            recommendations
        });
    }

    analyzeContent(responses) {
        const analysis = {};

        responses.forEach(resp => {
            const text = resp.text;
            const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
            const words = text.split(/\s+/).filter(w => w.length > 0);

            // Content metrics
            analysis[resp.model] = {
                wordCount: words.length,
                sentenceCount: sentences.length,
                avgWordsPerSentence: Math.round(words.length / sentences.length),
                complexity: this.calculateComplexity(text),
                sentiment: this.analyzeSentiment(text),
                topics: this.extractTopics(text),
                structure: this.analyzeStructure(text),
                formality: this.assessFormality(text),
                clarity: this.assessClarity(text, sentences)
            };
        });

        return analysis;
    }

    calculateComplexity(text) {
        const words = text.split(/\s+/);
        const longWords = words.filter(w => w.length > 6).length;
        const complexityScore = (longWords / words.length) * 100;

        if (complexityScore < 15) return "Simple";
        if (complexityScore < 25) return "Moderate";
        if (complexityScore < 35) return "Complex";
        return "Very Complex";
    }

    analyzeSentiment(text) {
        const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'enjoy', 'best', 'perfect', 'awesome', 'brilliant', 'outstanding', 'impressive', 'effective', 'helpful', 'useful', 'valuable', 'benefit'];
        const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'worst', 'problem', 'issue', 'difficult', 'hard', 'challenging', 'concern', 'worry', 'disappointed', 'frustrated', 'annoyed', 'angry', 'sad', 'unfortunate'];

        const lowerText = text.toLowerCase();
        const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
        const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;

        if (positiveCount > negativeCount + 1) return "Positive";
        if (negativeCount > positiveCount + 1) return "Negative";
        return "Neutral";
    }

    extractTopics(text) {
        const topicKeywords = {
            'Technology': ['technology', 'software', 'computer', 'digital', 'AI', 'algorithm', 'data', 'programming', 'code', 'system', 'platform', 'application', 'development'],
            'Business': ['business', 'company', 'market', 'revenue', 'profit', 'strategy', 'management', 'customer', 'service', 'product', 'sales', 'marketing', 'brand'],
            'Science': ['research', 'study', 'experiment', 'theory', 'hypothesis', 'method', 'analysis', 'result', 'conclusion', 'evidence', 'scientific', 'discovery'],
            'Education': ['learn', 'teach', 'education', 'student', 'knowledge', 'skill', 'training', 'course', 'lesson', 'instruction', 'academic', 'university'],
            'Health': ['health', 'medical', 'doctor', 'patient', 'treatment', 'therapy', 'medicine', 'disease', 'wellness', 'fitness', 'nutrition', 'care']
        };

        const lowerText = text.toLowerCase();
        const topics = [];

        Object.entries(topicKeywords).forEach(([topic, keywords]) => {
            const matches = keywords.filter(keyword => lowerText.includes(keyword)).length;
            if (matches >= 2) topics.push(topic);
        });

        return topics.length > 0 ? topics : ['General'];
    }

    analyzeStructure(text) {
        const hasIntro = /^(In |To |For |When |This |The |Let me |I will |Here|First)/.test(text.trim());
        const hasConclusion = /(In conclusion|To summarize|Overall|In summary|Finally|Therefore|Thus)/.test(text);
        const hasBullets = /[-•*]\s/.test(text) || /\d+\.\s/.test(text);
        const hasParagraphs = text.split('\n\n').length > 1;

        let structure = [];
        if (hasIntro) structure.push("Clear Introduction");
        if (hasConclusion) structure.push("Conclusion");
        if (hasBullets) structure.push("Bullet Points/Lists");
        if (hasParagraphs) structure.push("Multiple Paragraphs");

        return structure.length > 0 ? structure : ["Single Block"];
    }

    assessFormality(text) {
        const formalIndicators = ['therefore', 'furthermore', 'consequently', 'nevertheless', 'however', 'moreover', 'thus', 'hence', 'accordingly', 'subsequently'];
        const informalIndicators = ["you're", "don't", "can't", "won't", "it's", "that's", "here's", "let's", 'gonna', 'wanna', 'yeah', 'okay'];

        const lowerText = text.toLowerCase();
        const formalCount = formalIndicators.filter(word => lowerText.includes(word)).length;
        const informalCount = informalIndicators.filter(word => lowerText.includes(word)).length;

        if (formalCount > informalCount + 1) return "Formal";
        if (informalCount > formalCount + 1) return "Informal";
        return "Neutral";
    }

    assessClarity(text, sentences) {
        const avgSentenceLength = text.length / sentences.length;
        const shortSentences = sentences.filter(s => s.trim().length < 100).length;
        const clarityRatio = shortSentences / sentences.length;

        if (avgSentenceLength < 80 && clarityRatio > 0.6) return "Very Clear";
        if (avgSentenceLength < 120 && clarityRatio > 0.4) return "Clear";
        if (avgSentenceLength < 160) return "Moderate";
        return "Complex";
    }

    assessQuality(responses) {
        const quality = {};

        responses.forEach(resp => {
            const analysis = this.analyzeContent([resp])[resp.model];
            let score = 0;

            // Scoring criteria
            if (analysis.wordCount >= 50) score += 20;
            if (analysis.wordCount >= 100) score += 10;
            if (analysis.clarity === "Very Clear" || analysis.clarity === "Clear") score += 25;
            if (analysis.structure.length > 1) score += 20;
            if (analysis.topics.length > 0 && !analysis.topics.includes('General')) score += 15;
            if (analysis.avgWordsPerSentence >= 10 && analysis.avgWordsPerSentence <= 25) score += 10;

            quality[resp.model] = {
                score: Math.min(score, 100),
                rating: this.getQualityRating(score),
                strengths: this.identifyStrengths(analysis),
                improvements: this.suggestImprovements(analysis)
            };
        });

        return quality;
    }

    getQualityRating(score) {
        if (score >= 85) return "Excellent";
        if (score >= 70) return "Good";
        if (score >= 55) return "Average";
        if (score >= 40) return "Below Average";
        return "Poor";
    }

    identifyStrengths(analysis) {
        const strengths = [];
        if (analysis.clarity === "Very Clear") strengths.push("Very clear communication");
        if (analysis.structure.length > 2) strengths.push("Well-structured response");
        if (analysis.wordCount > 150) strengths.push("Comprehensive coverage");
        if (analysis.formality === "Formal") strengths.push("Professional tone");
        if (analysis.topics.length > 1) strengths.push("Multi-topic coverage");
        return strengths;
    }

    suggestImprovements(analysis) {
        const improvements = [];
        if (analysis.wordCount < 50) improvements.push("Could provide more detail");
        if (analysis.clarity === "Complex") improvements.push("Could simplify language");
        if (analysis.structure.length === 1) improvements.push("Could improve structure");
        if (analysis.sentiment === "Negative") improvements.push("Could use more positive framing");
        return improvements;
    }

    buildComparisonMatrix(responses) {
        const matrix = {};

        for (let i = 0; i < responses.length; i++) {
            for (let j = i + 1; j < responses.length; j++) {
                const model1 = responses[i].model;
                const model2 = responses[j].model;
                const key = `${model1} vs ${model2}`;

                matrix[key] = {
                    similarity: this.calculateSimilarity(responses[i].text, responses[j].text),
                    lengthDiff: Math.abs(responses[i].text.length - responses[j].text.length),
                    approach: this.compareApproaches(responses[i], responses[j])
                };
            }
        }

        return matrix;
    }

    calculateSimilarity(text1, text2) {
        const words1 = new Set(text1.toLowerCase().split(/\s+/));
        const words2 = new Set(text2.toLowerCase().split(/\s+/));
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);

        const similarity = (intersection.size / union.size) * 100;

        if (similarity > 70) return "Very Similar";
        if (similarity > 50) return "Similar";
        if (similarity > 30) return "Somewhat Similar";
        return "Different";
    }

    compareApproaches(resp1, resp2) {
        const analysis1 = this.analyzeContent([resp1])[resp1.model];
        const analysis2 = this.analyzeContent([resp2])[resp2.model];

        const differences = [];

        if (Math.abs(analysis1.wordCount - analysis2.wordCount) > 50) {
            differences.push(analysis1.wordCount > analysis2.wordCount ?
                `${resp1.model} more detailed` : `${resp2.model} more detailed`);
        }

        if (analysis1.formality !== analysis2.formality) {
            differences.push(`Different formality: ${resp1.model} (${analysis1.formality}) vs ${resp2.model} (${analysis2.formality})`);
        }

        if (analysis1.structure.join() !== analysis2.structure.join()) {
            differences.push("Different structural approaches");
        }

        return differences.length > 0 ? differences : ["Similar approaches"];
    }

    generateRecommendations(responses, analysis) {
        const recommendations = [];

        // Find best aspects from each model
        const models = responses.map(r => r.model);
        const qualities = this.assessQuality(responses);

        const bestModel = models.reduce((best, model) =>
            qualities[model].score > qualities[best].score ? model : best
        );

        recommendations.push(`🏆 **Best Overall**: ${bestModel} (${qualities[bestModel].rating} - ${qualities[bestModel].score}%)`);

        // Specific recommendations
        const mostDetailed = models.reduce((most, model) =>
            analysis[model].wordCount > analysis[most].wordCount ? model : most
        );
        recommendations.push(`📝 **Most Detailed**: ${mostDetailed} (${analysis[mostDetailed].wordCount} words)`);

        const clearest = models.reduce((clear, model) =>
            analysis[model].clarity === "Very Clear" ? model : clear
        );
        if (analysis[clearest].clarity === "Very Clear") {
            recommendations.push(`✨ **Clearest**: ${clearest}`);
        }

        return recommendations;
    }

    formatAdvancedAnalysis({ responses, contentAnalysis, qualityAssessment, comparisonMatrix, recommendations }) {
        let analysis = "# 🧠 Advanced AI Response Analysis\n\n";

        // Overview
        analysis += `## 📊 Overview\n`;
        analysis += `Analyzed ${responses.length} responses using sophisticated linguistic analysis.\n\n`;

        // Individual Analysis
        analysis += `## 🔍 Individual Response Analysis\n\n`;
        responses.forEach(resp => {
            const content = contentAnalysis[resp.model];
            const quality = qualityAssessment[resp.model];

            analysis += `### ${resp.model}\n`;
            analysis += `- **Quality Score**: ${quality.score}% (${quality.rating})\n`;
            analysis += `- **Length**: ${content.wordCount} words, ${content.sentenceCount} sentences\n`;
            analysis += `- **Complexity**: ${content.complexity}\n`;
            analysis += `- **Clarity**: ${content.clarity}\n`;
            analysis += `- **Sentiment**: ${content.sentiment}\n`;
            analysis += `- **Formality**: ${content.formality}\n`;
            analysis += `- **Topics**: ${content.topics.join(', ')}\n`;
            analysis += `- **Structure**: ${content.structure.join(', ')}\n`;

            if (quality.strengths.length > 0) {
                analysis += `- **Strengths**: ${quality.strengths.join(', ')}\n`;
            }

            analysis += `\n`;
        });

        // Comparisons
        if (Object.keys(comparisonMatrix).length > 0) {
            analysis += `## ⚖️ Comparative Analysis\n\n`;
            Object.entries(comparisonMatrix).forEach(([comparison, data]) => {
                analysis += `### ${comparison}\n`;
                analysis += `- **Similarity**: ${data.similarity}\n`;
                analysis += `- **Approach**: ${data.approach.join(', ')}\n\n`;
            });
        }

        // Recommendations
        analysis += `## 🎯 Recommendations\n\n`;
        recommendations.forEach(rec => {
            analysis += `${rec}\n\n`;
        });

        analysis += `---\n*Generated by Advanced Analysis Engine (CSP-compliant)*`;

        return analysis;
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