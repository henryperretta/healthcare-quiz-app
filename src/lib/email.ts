import { Resend } from 'resend';

// Initialize Resend only if API key is available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface QuizResults {
  session_id: string;
  correct_answers: number;
  total_questions: number;
  percentage: number;
  started_at: string;
  finished_at: string;
  email: string;
  responses: Array<{
    question: string;
    selected_answer: string;
    is_correct: boolean;
    explanation: string;
    source: string;
    article_title: string;
    article_url: string;
  }>;
}

export async function sendQuizResults(results: QuizResults): Promise<void> {
  if (!resend) {
    const error = 'RESEND_API_KEY not configured - email sending disabled';
    console.error(error);
    throw new Error(error);
  }

  const scoreMessage = getScoreMessage(results.percentage);
  const scoreColor = results.percentage >= 80 ? '#059669' : results.percentage >= 60 ? '#D97706' : '#DC2626';

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Healthcare Quiz Results</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1F2937; margin-bottom: 10px;">Healthcare Quiz Results</h1>
        <p style="color: #6B7280; font-size: 16px;">Thank you for taking our healthcare knowledge quiz!</p>
      </div>

      <div style="background: #F9FAFB; border-radius: 8px; padding: 30px; margin-bottom: 30px; text-align: center;">
        <div style="font-size: 48px; font-weight: bold; color: ${scoreColor}; margin-bottom: 10px;">
          ${results.percentage}%
        </div>
        <div style="font-size: 18px; color: #6B7280; margin-bottom: 15px;">
          ${results.correct_answers} out of ${results.total_questions} correct
        </div>
        <p style="font-size: 16px; color: #374151; margin: 0;">
          ${scoreMessage}
        </p>
      </div>

      <div style="margin-bottom: 30px;">
        <h2 style="color: #1F2937; border-bottom: 2px solid #E5E7EB; padding-bottom: 10px;">Question Review</h2>
        
        ${results.responses.map((response, index) => `
          <div style="border: 1px solid ${response.is_correct ? '#D1FAE5' : '#FEE2E2'}; background: ${response.is_correct ? '#F0FDF4' : '#FEF2F2'}; border-radius: 6px; padding: 15px; margin-bottom: 15px;">
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
              <strong style="color: #374151;">Question ${index + 1}</strong>
              <span style="margin-left: auto; font-size: 20px;">
                ${response.is_correct ? '✅' : '❌'}
              </span>
            </div>
            
            <p style="margin-bottom: 10px; color: #374151;">
              <strong>Q:</strong> ${response.question}
            </p>
            
            <p style="margin-bottom: 10px; padding: 8px; background: #FFF; border-radius: 4px; border-left: 3px solid #E5E7EB;">
              <strong>Your answer:</strong> ${response.selected_answer}
            </p>
            
            <p style="margin-bottom: 10px; padding: 8px; background: #EFF6FF; border-radius: 4px; border-left: 3px solid #3B82F6;">
              <strong>Explanation:</strong> ${response.explanation}
            </p>
            
            <p style="font-size: 12px; color: #6B7280; margin: 0;">
              <strong>Source:</strong> ${response.article_url ? 
                `<a href="${response.article_url}" target="_blank" rel="noopener noreferrer" style="color: #3B82F6; text-decoration: underline;">${response.article_title}</a>` : 
                response.article_title
              }
            </p>
          </div>
        `).join('')}
      </div>

      <div style="text-align: center; padding: 20px; background: #F3F4F6; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #1F2937; margin-bottom: 15px;">Keep Learning!</h3>
        <p style="color: #6B7280; margin-bottom: 15px;">
          Want to improve your healthcare knowledge? Take another quiz or explore our resources.
        </p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}" 
           style="display: inline-block; background: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 500;">
          Take Another Quiz
        </a>
      </div>

      <div style="text-align: center; color: #9CA3AF; font-size: 14px;">
        <p>This email was sent because you requested your quiz results.</p>
        <p>Healthcare Quiz App - Improving health literacy one question at a time.</p>
      </div>

    </body>
    </html>
  `;

  try {
    console.log('Attempting to send email with Resend...');
    console.log('From:', process.env.FROM_EMAIL || 'onboarding@resend.dev');
    console.log('To:', results.email);
    
    const result = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'C.R.A.P. Healthcare Quiz <onboarding@resend.dev>',
      to: results.email,
      subject: `Your C.R.A.P. Healthcare Quiz Results - ${results.percentage}% Score`,
      html: emailHtml,
      text: createPlainTextVersion(results),
      headers: {
        'X-Entity-Ref-ID': `quiz-results-${results.session_id}`,
        'List-Unsubscribe': '<mailto:unsubscribe@resend.dev>',
      },
    });

    console.log('Resend API response:', result);
    console.log(`Quiz results email sent successfully to ${results.email}`);
  } catch (error) {
    console.error('Failed to send quiz results email:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw error;
  }
}

function getScoreMessage(percentage: number): string {
  if (percentage >= 90) return 'Excellent! You have strong healthcare knowledge.';
  if (percentage >= 80) return 'Great job! Your healthcare knowledge is quite good.';
  if (percentage >= 70) return 'Good work! You have a solid foundation.';
  if (percentage >= 60) return 'Not bad! Consider reviewing some healthcare topics.';
  return 'Keep learning! Healthcare knowledge is important for everyone.';
}

function createPlainTextVersion(results: QuizResults): string {
  const scoreMessage = getScoreMessage(results.percentage);
  
  return `
C.R.A.P. HEALTHCARE QUIZ RESULTS
================================

Your Score: ${results.percentage}% (${results.correct_answers} out of ${results.total_questions} correct)
${scoreMessage}

QUESTION REVIEW
===============

${results.responses.map((response, index) => `
Question ${index + 1}: ${response.is_correct ? 'CORRECT ✓' : 'INCORRECT ✗'}

Q: ${response.question}

Your answer: ${response.selected_answer}

Explanation: ${response.explanation}

Source: ${response.article_title}${response.article_url ? ` - ${response.article_url}` : ''}

`).join('\n')}

Thank you for taking the C.R.A.P. Healthcare Quiz!
Visit ${process.env.NEXT_PUBLIC_APP_URL || 'https://healthcare-quiz-app.vercel.app'} to take another quiz.

This email was sent because you requested your quiz results.
Healthcare Quiz App - Improving health literacy one question at a time.
`.trim();
}