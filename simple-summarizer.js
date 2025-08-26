// Simple approach for browser LLM - use a lightweight alternative
window.simpleSummarizer = {
    available: true,
    summarize: function (text, options = {}) {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
        if (sentences.length <= 3) return text;

        // Score sentences by length and keyword frequency
        const scores = sentences.map((sentence, i) => {
            const words = sentence.toLowerCase().split(/\s+/);
            const score = words.length +
                (words.some(w => ['important', 'key', 'main', 'significant'].includes(w)) ? 5 : 0) +
                (i === 0 ? 3 : 0) + // First sentence bonus
                (i === sentences.length - 1 ? 2 : 0); // Last sentence bonus
            return { sentence: sentence.trim(), score, index: i };
        });

        // Get top 3 sentences
        const topSentences = scores
            .sort((a, b) => b.score - a.score)
            .slice(0, Math.min(3, Math.ceil(sentences.length / 3)))
            .sort((a, b) => a.index - b.index)
            .map(s => s.sentence);

        return topSentences.join('. ') + '.';
    }
};

// Notify that our simple summarizer is ready
setTimeout(() => {
    window.dispatchEvent(new CustomEvent('simpleSummarizerReady'));
}, 100); 