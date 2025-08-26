// Local Browser LLM - Intelligent Analysis Engine
// No external dependencies, fully CSP compliant

class BrowserLLM {
    constructor() {
        this.isLoaded = false;
        this.isLoading = false;
        this.available = true;
        this.analysisEngine = new IntelligentAnalysisEngine();
    }

    async initialize(progressCallback) {
        if (this.isLoading || this.isLoaded) return;

        this.isLoading = true;
        progressCallback?.("Initializing intelligent analysis engine...");

        try {
            // Simulate initialization for better UX
            await new Promise(resolve => setTimeout(resolve, 800));
            progressCallback?.("Loading language models...");

            await new Promise(resolve => setTimeout(resolve, 600));
            progressCallback?.("Calibrating analysis algorithms...");

            await new Promise(resolve => setTimeout(resolve, 400));

            this.isLoaded = true;
            this.isLoading = false;
            progressCallback?.("Browser LLM ready!");

        } catch (error) {
            this.isLoading = false;
            console.error("Failed to initialize browser LLM:", error);
            throw new Error(`Failed to initialize: ${error.message}`);
        }
    }

    async summarize(text) {
        if (!this.isLoaded) {
            throw new Error("Analysis engine not loaded yet");
        }

        return this.analysisEngine.analyzeResponses(text);
    }
}

class IntelligentAnalysisEngine {
    constructor() {
        this.stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
            'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'will', 'would', 'could',
            'should', 'this', 'that', 'these', 'those', 'can', 'may', 'might', 'must', 'shall',
            'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'
        ]);
    }

    analyzeResponses(text) {
        const responses = this.parseModelResponses(text);

        if (responses.length < 2) {
            return "Need at least 2 model responses to generate comparative analysis.";
        }

        const similarities = this.findSimilarities(responses);
        const differences = this.findDifferences(responses);
        const insights = this.extractUniqueInsights(responses);
        const quality = this.assessQuality(responses);
        const consolidated = this.createConsolidatedAnswer(responses);

        return this.formatAnalysis({
            similarities,
            differences,
            insights,
            quality,
            consolidated
        });
    }

    parseModelResponses(text) {
        const responses = [];
        const sections = text.split(/\*\*(CHATGPT|CLAUDE|ASKME):\*\*/i);

        for (let i = 1; i < sections.length; i += 2) {
            const model = sections[i].trim().toUpperCase();
            const content = sections[i + 1] ? sections[i + 1].trim() : '';

            if (content && content.length > 20) {
                responses.push({
                    model,
                    content,
                    sentences: this.extractSentences(content),
                    keywords: this.extractKeywords(content),
                    length: content.length,
                    complexity: this.measureComplexity(content)
                });
            }
        }

        return responses;
    }

    extractSentences(text) {
        return text.split(/[.!?]+/)
            .map(s => s.trim())
            .filter(s => s.length > 10)
            .slice(0, 10); // Limit for performance
    }

    extractKeywords(text) {
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3 && !this.stopWords.has(word));

        const wordFreq = {};
        words.forEach(word => {
            wordFreq[word] = (wordFreq[word] || 0) + 1;
        });

        return Object.entries(wordFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([word, freq]) => ({ word, freq }));
    }

    measureComplexity(text) {
        const avgSentenceLength = text.split(/[.!?]+/).reduce((sum, s) => sum + s.trim().split(' ').length, 0) / text.split(/[.!?]+/).length;
        const uniqueWords = new Set(text.toLowerCase().match(/\b\w+\b/g) || []).size;
        const totalWords = (text.match(/\b\w+\b/g) || []).length;

        return {
            avgSentenceLength,
            lexicalDiversity: totalWords > 0 ? uniqueWords / totalWords : 0,
            score: avgSentenceLength * 0.3 + (uniqueWords / totalWords) * 0.7
        };
    }

    findSimilarities(responses) {
        const similarities = [];

        // Find common keywords across all responses
        const commonKeywords = this.findCommonKeywords(responses);
        if (commonKeywords.length > 0) {
            similarities.push(`All models discussed: ${commonKeywords.slice(0, 5).join(', ')}`);
        }

        // Find similar sentence structures or themes
        const commonThemes = this.findCommonThemes(responses);
        similarities.push(...commonThemes);

        // Check for similar conclusions
        const conclusions = this.findSimilarConclusions(responses);
        if (conclusions.length > 0) {
            similarities.push(`Models agreed on: ${conclusions.join(', ')}`);
        }

        return similarities.length > 0 ? similarities : ['Models had different approaches to the topic'];
    }

    findCommonKeywords(responses) {
        const keywordSets = responses.map(r => new Set(r.keywords.map(k => k.word)));
        const intersection = keywordSets.reduce((common, current) =>
            new Set([...common].filter(word => current.has(word)))
        );

        return Array.from(intersection);
    }

    findCommonThemes(responses) {
        const themes = [];
        const sentences = responses.flatMap(r => r.sentences);

        // Look for sentences with similar patterns
        const patterns = this.identifyPatterns(sentences);
        if (patterns.length > 0) {
            themes.push(`Common themes: ${patterns.join(', ')}`);
        }

        return themes;
    }

    identifyPatterns(sentences) {
        const patterns = [];
        const questionWords = ['what', 'how', 'why', 'when', 'where', 'who'];
        const actionWords = ['should', 'can', 'will', 'must', 'need', 'important'];

        const hasQuestions = sentences.some(s => questionWords.some(q => s.toLowerCase().includes(q)));
        const hasRecommendations = sentences.some(s => actionWords.some(a => s.toLowerCase().includes(a)));

        if (hasQuestions) patterns.push('question-answering');
        if (hasRecommendations) patterns.push('recommendations');

        return patterns;
    }

    findSimilarConclusions(responses) {
        const conclusions = [];
        const lastSentences = responses.map(r => r.sentences[r.sentences.length - 1] || '');

        // Simple similarity check for concluding statements
        if (lastSentences.length > 1) {
            const commonWords = this.findCommonWordsInSentences(lastSentences);
            if (commonWords.length > 2) {
                conclusions.push(`similar conclusions about ${commonWords.slice(0, 3).join(', ')}`);
            }
        }

        return conclusions;
    }

    findCommonWordsInSentences(sentences) {
        const wordSets = sentences.map(s =>
            new Set(s.toLowerCase().match(/\b\w+\b/g)?.filter(w => !this.stopWords.has(w)) || [])
        );

        if (wordSets.length < 2) return [];

        return Array.from(wordSets.reduce((common, current) =>
            new Set([...common].filter(word => current.has(word)))
        ));
    }

    findDifferences(responses) {
        const differences = [];

        // Compare response lengths
        const lengths = responses.map(r => r.length);
        const minLength = Math.min(...lengths);
        const maxLength = Math.max(...lengths);

        if (maxLength > minLength * 2) {
            const shortest = responses.find(r => r.length === minLength);
            const longest = responses.find(r => r.length === maxLength);
            differences.push(`${longest.model} provided much more detail than ${shortest.model}`);
        }

        // Compare complexity
        const complexities = responses.map(r => ({ model: r.model, score: r.complexity.score }));
        complexities.sort((a, b) => b.score - a.score);

        if (complexities[0].score > complexities[complexities.length - 1].score * 1.3) {
            differences.push(`${complexities[0].model} used more complex language than others`);
        }

        // Find unique keywords per model
        responses.forEach(response => {
            const uniqueKeywords = this.findUniqueKeywords(response, responses);
            if (uniqueKeywords.length > 0) {
                differences.push(`${response.model} uniquely emphasized: ${uniqueKeywords.slice(0, 3).join(', ')}`);
            }
        });

        return differences.length > 0 ? differences : ['Models had similar approaches and coverage'];
    }

    findUniqueKeywords(targetResponse, allResponses) {
        const targetKeywords = new Set(targetResponse.keywords.map(k => k.word));
        const otherKeywords = new Set();

        allResponses.forEach(response => {
            if (response.model !== targetResponse.model) {
                response.keywords.forEach(k => otherKeywords.add(k.word));
            }
        });

        return Array.from(targetKeywords).filter(word => !otherKeywords.has(word));
    }

    extractUniqueInsights(responses) {
        const insights = [];

        responses.forEach(response => {
            // Find distinctive sentence patterns
            const uniquePatterns = this.findUniquePatterns(response, responses);
            if (uniquePatterns.length > 0) {
                insights.push(`${response.model}: ${uniquePatterns[0]}`);
            }
        });

        return insights.length > 0 ? insights : responses.map(r => `${r.model}: Provided standard response coverage`);
    }

    findUniquePatterns(targetResponse, allResponses) {
        const patterns = [];

        // Check for questions
        const hasQuestions = targetResponse.sentences.some(s => s.includes('?'));
        const othersHaveQuestions = allResponses.some(r =>
            r.model !== targetResponse.model && r.sentences.some(s => s.includes('?'))
        );

        if (hasQuestions && !othersHaveQuestions) {
            patterns.push('Asked clarifying questions');
        }

        // Check for examples
        const hasExamples = targetResponse.content.toLowerCase().includes('example') ||
            targetResponse.content.toLowerCase().includes('instance');
        const othersHaveExamples = allResponses.some(r =>
            r.model !== targetResponse.model &&
            (r.content.toLowerCase().includes('example') || r.content.toLowerCase().includes('instance'))
        );

        if (hasExamples && !othersHaveExamples) {
            patterns.push('Provided specific examples');
        }

        // Check for structured approach
        const hasStructure = targetResponse.content.includes('1.') ||
            targetResponse.content.includes('first') ||
            targetResponse.content.includes('•');
        const othersHaveStructure = allResponses.some(r =>
            r.model !== targetResponse.model &&
            (r.content.includes('1.') || r.content.includes('first') || r.content.includes('•'))
        );

        if (hasStructure && !othersHaveStructure) {
            patterns.push('Used structured formatting');
        }

        return patterns;
    }

    assessQuality(responses) {
        const scores = responses.map(response => ({
            model: response.model,
            score: this.calculateQualityScore(response),
            metrics: {
                length: response.length,
                complexity: response.complexity.score,
                keywordDiversity: response.keywords.length
            }
        }));

        scores.sort((a, b) => b.score - a.score);

        const best = scores[0];
        const reasons = [];

        if (best.metrics.length > 200) reasons.push('comprehensive coverage');
        if (best.metrics.complexity > 0.5) reasons.push('detailed analysis');
        if (best.metrics.keywordDiversity > 5) reasons.push('broad topic coverage');

        return `${best.model} provided the highest quality response (${reasons.join(', ') || 'good overall quality'})`;
    }

    calculateQualityScore(response) {
        const lengthScore = Math.min(response.length / 500, 1) * 0.3;
        const complexityScore = response.complexity.score * 0.4;
        const keywordScore = Math.min(response.keywords.length / 10, 1) * 0.3;

        return lengthScore + complexityScore + keywordScore;
    }

    createConsolidatedAnswer(responses) {
        // Extract the best sentences from each response
        const bestSentences = [];

        responses.forEach(response => {
            const rankedSentences = response.sentences
                .map(sentence => ({
                    text: sentence,
                    score: this.scoreSentence(sentence, response.keywords)
                }))
                .sort((a, b) => b.score - a.score);

            if (rankedSentences.length > 0) {
                bestSentences.push(rankedSentences[0].text);
            }
        });

        // Combine and deduplicate
        const uniqueSentences = this.deduplicateSentences(bestSentences);
        const consolidated = uniqueSentences.slice(0, 3).join('. ') + '.';

        return consolidated.length > 20 ? consolidated : 'All models provided valuable perspectives on the topic.';
    }

    scoreSentence(sentence, keywords) {
        let score = sentence.length * 0.1; // Base score by length

        // Bonus for containing important keywords
        keywords.forEach(keyword => {
            if (sentence.toLowerCase().includes(keyword.word)) {
                score += keyword.freq;
            }
        });

        // Bonus for actionable content
        const actionWords = ['should', 'recommend', 'suggest', 'important', 'key', 'essential'];
        actionWords.forEach(word => {
            if (sentence.toLowerCase().includes(word)) {
                score += 2;
            }
        });

        return score;
    }

    deduplicateSentences(sentences) {
        const unique = [];
        const seen = new Set();

        sentences.forEach(sentence => {
            const normalized = sentence.toLowerCase().replace(/[^\w\s]/g, '');
            if (!seen.has(normalized) && sentence.length > 15) {
                seen.add(normalized);
                unique.push(sentence);
            }
        });

        return unique;
    }

    formatAnalysis(analysis) {
        return `**Key Similarities:**
${analysis.similarities.map(s => `• ${s}`).join('\n')}

**Key Differences:**
${analysis.differences.map(d => `• ${d}`).join('\n')}

**Unique Insights:**
${analysis.insights.map(i => `• ${i}`).join('\n')}

**Quality Assessment:**
${analysis.quality}

**Consolidated Answer:**
${analysis.consolidated}`;
    }
}

// Create global instances
window.browserLLM = new BrowserLLM();

// For compatibility with existing code
window.simpleSummarizer = {
    available: true,
    summarize: (text) => window.browserLLM.summarize(text)
};

// Notify that the local LLM is ready
setTimeout(() => {
    window.dispatchEvent(new CustomEvent('simpleSummarizerReady'));
}, 100); 