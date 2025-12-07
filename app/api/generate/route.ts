import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'demo',
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'demo',
});

async function generateWithGPT(model: string, prompt: string, imageData?: string | null) {
  try {
    const messages: any[] = [
      {
        role: 'user',
        content: imageData
          ? [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageData } },
            ]
          : prompt,
      },
    ];

    const response = await openai.chat.completions.create({
      model,
      messages,
      max_tokens: 500,
    });

    return response.choices[0].message.content || 'No response';
  } catch (error) {
    console.error(`Error with ${model}:`, error);
    return `[Demo Response from ${model}] This is a simulated response analyzing the prompt. The actual API integration would require valid API keys.`;
  }
}

async function generateWithClaude(model: string, prompt: string, imageData?: string | null) {
  try {
    const content: any[] = [{ type: 'text', text: prompt }];

    if (imageData) {
      const base64Data = imageData.split(',')[1];
      const mediaType = imageData.split(';')[0].split(':')[1];
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: base64Data,
        },
      });
    }

    const response = await anthropic.messages.create({
      model,
      max_tokens: 500,
      messages: [{ role: 'user', content }],
    });

    return response.content[0].type === 'text' ? response.content[0].text : 'No response';
  } catch (error) {
    console.error(`Error with ${model}:`, error);
    return `[Demo Response from ${model}] This is a simulated response analyzing the prompt. The actual API integration would require valid API keys.`;
  }
}

async function generateWithGemini(prompt: string, imageData?: string | null) {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey || apiKey === 'demo') {
      throw new Error('No API key');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

    const body = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
  } catch (error) {
    console.error('Error with Gemini:', error);
    return '[Demo Response from Gemini Pro] This is a simulated response analyzing the prompt. The actual API integration would require valid API keys.';
  }
}

export async function POST(request: NextRequest) {
  try {
    const { models, prompt, imageData } = await request.json();

    const responses = await Promise.all(
      models.map(async (modelId: string) => {
        let response = '';
        let modelName = '';

        if (modelId.startsWith('gpt-')) {
          modelName = modelId === 'gpt-4' ? 'GPT-4' : 'GPT-3.5 Turbo';
          response = await generateWithGPT(modelId, prompt, imageData);
        } else if (modelId.startsWith('claude-')) {
          modelName = modelId.includes('opus')
            ? 'Claude 3 Opus'
            : modelId.includes('sonnet')
            ? 'Claude 3 Sonnet'
            : 'Claude 3 Haiku';
          response = await generateWithClaude(modelId, prompt, imageData);
        } else if (modelId === 'gemini-pro') {
          modelName = 'Gemini Pro';
          response = await generateWithGemini(prompt, imageData);
        }

        return {
          modelId,
          modelName,
          response,
          crossEvalScores: {},
          avgScore: 0,
        };
      })
    );

    return NextResponse.json({ responses });
  } catch (error) {
    console.error('Generate error:', error);
    return NextResponse.json({ error: 'Failed to generate responses' }, { status: 500 });
  }
}
