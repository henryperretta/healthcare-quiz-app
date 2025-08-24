import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const MCQ_GENERATION_PROMPT = `You are creating healthcare literacy MCQs from healthcare articles. Your goal is to help people understand healthcare topics better through educational quizzes.

Guidelines:
- Generate 2-3 questions per article
- Focus on factual information from the article
- Avoid providing medical advice or treatment recommendations
- Each question must have exactly 4 choices (A, B, C, D)
- Only ONE choice should be correct
- Include a brief explanation (1-2 sentences) for why the correct answer is right
- Include a source quote or section reference from the article
- Questions should test comprehension and retention of key healthcare concepts

Output the response in this exact JSON schema only:
{
  "article_url": "<string>",
  "questions": [{
    "prompt": "<single clear question>",
    "choices": ["Choice A text", "Choice B text", "Choice C text", "Choice D text"],
    "answer_index": 0,
    "explanation": "Why the correct answer is correct, 1–2 sentences",
    "source_quote": "Short quote or section reference"
  }]
}

IMPORTANT: The answer_index should be 0, 1, 2, or 3 corresponding to the correct choice. Vary this randomly across questions - do not always use the same index.`;

export const MCQ_VERIFICATION_PROMPT = `You are reviewing healthcare MCQs for quality and accuracy. Verify that:

1. Each question has exactly one correct answer
2. The correct answer is factually accurate based on the source material
3. Incorrect options are plausible but clearly wrong
4. The explanation is clear and educational
5. No medical advice is being given - only educational information

For each question, respond with:
- "APPROVED" if the question meets all criteria
- "NEEDS_REVISION: [specific issue]" if there are problems

Review this MCQ:`;

export async function generateMCQs(articleUrl: string, cleanText: string, articleTitle: string) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: MCQ_GENERATION_PROMPT
        },
        {
          role: "user",
          content: `Article URL: ${articleUrl}
Article Title: ${articleTitle}

Article Content:
${cleanText}

Generate 2-3 educational MCQs based on this healthcare article. Focus on key facts and concepts that would help readers better understand the healthcare topic.`
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    return JSON.parse(response);
  } catch (error) {
    console.error('Error generating MCQs:', error);
    throw error;
  }
}

export async function verifyMCQ(question: {
  prompt: string;
  choices: string[];
  answer_index: number;
  explanation: string;
  source_quote: string;
}) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: MCQ_VERIFICATION_PROMPT
        },
        {
          role: "user",
          content: JSON.stringify(question, null, 2)
        }
      ],
      temperature: 0.1
    });

    const response = completion.choices[0].message.content;
    return response?.includes('APPROVED') ? 'approved' : 'needs_revision';
  } catch (error) {
    console.error('Error verifying MCQ:', error);
    return 'error';
  }
}