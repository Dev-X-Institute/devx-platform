/**
 * AI adapter. Apps call this interface, never a specific provider.
 * Godfred owns the real provider implementation (e.g. Gemini free tier).
 * Swapping providers should only mean writing a new class that implements AiProvider.
 *
 * Privacy rule: never pass names or other personal data to a free-tier provider.
 */
export interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
}

export interface AiProvider {
  /** Draft quiz questions from lesson text. A teacher must review them. */
  generateQuiz(lessonText: string, count: number): Promise<QuizQuestion[]>;
  /** Short explanation grounded in the given lesson text only. */
  explain(lessonText: string, question: string): Promise<string>;
}

/** Placeholder so the front end can be built before the real provider exists. */
export class MockAiProvider implements AiProvider {
  async generateQuiz(_lessonText: string, count: number): Promise<QuizQuestion[]> {
    return Array.from({ length: count }, (_, i) => ({
      question: `Sample question ${i + 1}`,
      options: ["A", "B", "C", "D"],
      answerIndex: 0,
    }));
  }
  async explain(_lessonText: string, question: string): Promise<string> {
    return `Mock answer for: ${question}`;
  }
}
