import { NextRequest, NextResponse } from 'next/server';

async function rankWithGemini(
  topThree: any[],
  originalPrompt: string
): Promise<string[]> {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey || apiKey === 'demo') {
      throw new Error('No API key');
    }

    const rankingPrompt = `You are evaluating the top 3 AI responses to rank them from best to worst.

Original Prompt: "${originalPrompt}"

Response A (${topThree[0].modelName}):
"${topThree[0].response}"

Response B (${topThree[1].modelName}):
"${topThree[1].response}"

Response C (${topThree[2].modelName}):
"${topThree[2].response}"

Based on quality, clarity, relevance, and accuracy, rank these responses from best (1st) to worst (3rd).

Respond with ONLY the letters in order, separated by commas. Example: A,B,C or B,C,A

Your ranking:`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: rankingPrompt }] }],
      }),
    });

    const data = await response.json();
    const rankingText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'A,B,C';

    // Parse ranking
    const letters = rankingText.trim().replace(/[^ABC,]/g, '').split(',');
    const mapping: { [key: string]: string } = {
      'A': topThree[0].modelId,
      'B': topThree[1].modelId,
      'C': topThree[2].modelId,
    };

    return letters.map((letter: string) => mapping[letter.trim()]).filter(Boolean);
  } catch (error) {
    console.error('Error ranking with Gemini:', error);
    // Demo ranking - return in original order
    return topThree.map(r => r.modelId);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { topThree, originalPrompt } = await request.json();

    const ranking = await rankWithGemini(topThree, originalPrompt);

    return NextResponse.json({ ranking });
  } catch (error) {
    console.error('Ranking error:', error);
    return NextResponse.json({ error: 'Failed to rank responses' }, { status: 500 });
  }
}
