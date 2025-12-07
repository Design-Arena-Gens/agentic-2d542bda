import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'demo',
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'demo',
});

async function evaluateWithModel(
  evaluatorModelId: string,
  originalPrompt: string,
  responseToEval: string,
  respondentModel: string
): Promise<number> {
  const evalPrompt = `You are evaluating an AI response. Rate it on a scale of 1-10 based on quality, clarity, relevance, and accuracy.

Original Prompt: "${originalPrompt}"

Response from ${respondentModel}:
"${responseToEval}"

Provide ONLY a single number between 1-10 as your rating. No explanation needed.`;

  try {
    if (evaluatorModelId.startsWith('gpt-')) {
      const response = await openai.chat.completions.create({
        model: evaluatorModelId,
        messages: [{ role: 'user', content: evalPrompt }],
        max_tokens: 10,
        temperature: 0.3,
      });

      const score = parseFloat(response.choices[0].message.content || '5');
      return isNaN(score) ? 5 : Math.min(10, Math.max(1, score));
    } else if (evaluatorModelId.startsWith('claude-')) {
      const response = await anthropic.messages.create({
        model: evaluatorModelId,
        max_tokens: 10,
        messages: [{ role: 'user', content: evalPrompt }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '5';
      const score = parseFloat(text);
      return isNaN(score) ? 5 : Math.min(10, Math.max(1, score));
    } else if (evaluatorModelId === 'gemini-pro') {
      const apiKey = process.env.GOOGLE_API_KEY;
      if (!apiKey || apiKey === 'demo') {
        return Math.random() * 4 + 6; // Demo: 6-10
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: evalPrompt }] }],
        }),
      });

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '5';
      const score = parseFloat(text);
      return isNaN(score) ? 5 : Math.min(10, Math.max(1, score));
    }
  } catch (error) {
    console.error(`Error evaluating with ${evaluatorModelId}:`, error);
    // Return demo score
    return Math.random() * 4 + 6; // 6-10
  }

  return 5;
}

export async function POST(request: NextRequest) {
  try {
    const { responses, originalPrompt } = await request.json();

    // Cross-evaluate: each model evaluates all other responses
    const evaluatedResponses = await Promise.all(
      responses.map(async (response: any) => {
        const crossEvalScores: { [key: string]: number } = {};

        for (const evaluator of responses) {
          if (evaluator.modelId !== response.modelId) {
            const score = await evaluateWithModel(
              evaluator.modelId,
              originalPrompt,
              response.response,
              response.modelName
            );
            crossEvalScores[evaluator.modelId] = score;
          }
        }

        const scores = Object.values(crossEvalScores);
        const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

        return {
          ...response,
          crossEvalScores,
          avgScore,
        };
      })
    );

    // Sort by average score and get top 3
    const sorted = [...evaluatedResponses].sort((a, b) => b.avgScore - a.avgScore);
    const topThree = sorted.slice(0, 3);

    return NextResponse.json({ evaluatedResponses, topThree });
  } catch (error) {
    console.error('Evaluation error:', error);
    return NextResponse.json({ error: 'Failed to evaluate responses' }, { status: 500 });
  }
}
