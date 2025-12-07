'use client';

import { useState } from 'react';
import { Sparkles, Loader2, CheckCircle2, Trophy } from 'lucide-react';

const AVAILABLE_MODELS = [
  { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI' },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic' },
  { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'Anthropic' },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic' },
  { id: 'gemini-pro', name: 'Gemini Pro', provider: 'Google' },
];

interface ModelResponse {
  modelId: string;
  modelName: string;
  response: string;
  crossEvalScores: { [key: string]: number };
  avgScore: number;
}

export default function Home() {
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');
  const [imageData, setImageData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [responses, setResponses] = useState<ModelResponse[]>([]);
  const [topThree, setTopThree] = useState<ModelResponse[]>([]);
  const [geminiRanking, setGeminiRanking] = useState<string[]>([]);
  const [userChoice, setUserChoice] = useState<string | null>(null);
  const [stage, setStage] = useState<'input' | 'responses' | 'ranking'>('input');

  const toggleModel = (modelId: string) => {
    setSelectedModels(prev =>
      prev.includes(modelId)
        ? prev.filter(id => id !== modelId)
        : prev.length < 5
        ? [...prev, modelId]
        : prev
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageData(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (selectedModels.length < 4 || !prompt) {
      alert('Please select at least 4 models and enter a prompt');
      return;
    }

    setIsLoading(true);
    setStage('responses');

    try {
      // Step 1: Get initial responses
      const responseData = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          models: selectedModels,
          prompt,
          imageData,
        }),
      });

      const { responses: initialResponses } = await responseData.json();
      setResponses(initialResponses);

      // Step 2: Cross-evaluate
      const evalData = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responses: initialResponses,
          originalPrompt: prompt,
        }),
      });

      const { evaluatedResponses, topThree: top3 } = await evalData.json();
      setResponses(evaluatedResponses);
      setTopThree(top3);

      // Step 3: Get Gemini ranking
      const rankingData = await fetch('/api/final-ranking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topThree: top3,
          originalPrompt: prompt,
        }),
      });

      const { ranking } = await rankingData.json();
      setGeminiRanking(ranking);
      setStage('ranking');
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred. Please check your API keys.');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAlignment = () => {
    if (!userChoice || geminiRanking.length === 0) return null;
    const geminiTop = geminiRanking[0];
    if (userChoice === geminiTop) return 'Perfect';
    if (geminiRanking.includes(userChoice)) return 'Partial';
    return 'Different';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-8 h-8 text-indigo-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              AI Model Ranking Platform
            </h1>
          </div>
          <p className="text-gray-600">
            Test, compare, and rank multimodal AI responses
          </p>
        </div>

        {stage === 'input' && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Select Models (4-5)</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              {AVAILABLE_MODELS.map(model => (
                <button
                  key={model.id}
                  onClick={() => toggleModel(model.id)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedModels.includes(model.id)
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">{model.name}</div>
                  <div className="text-xs text-gray-500">{model.provider}</div>
                </button>
              ))}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Prompt</label>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows={4}
                placeholder="Enter your prompt here..."
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Upload Image (Optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              {imageData && (
                <img
                  src={imageData}
                  alt="Preview"
                  className="mt-3 max-w-xs rounded-lg"
                />
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={selectedModels.length < 4 || !prompt || isLoading}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Start Evaluation
                </>
              )}
            </button>
          </div>
        )}

        {stage === 'responses' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
              Model Responses & Cross-Evaluation
            </h2>
            <div className="space-y-4">
              {responses.map(resp => (
                <div
                  key={resp.modelId}
                  className="p-4 border border-gray-200 rounded-lg"
                >
                  <div className="font-semibold text-indigo-600 mb-2">
                    {resp.modelName}
                  </div>
                  <div className="text-sm text-gray-700 mb-2">
                    {resp.response}
                  </div>
                  {resp.avgScore > 0 && (
                    <div className="text-xs text-gray-500">
                      Average Score: {resp.avgScore.toFixed(2)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {stage === 'ranking' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Top 3 Responses
              </h2>
              <div className="space-y-4">
                {topThree.map((resp, idx) => (
                  <div
                    key={resp.modelId}
                    className="p-4 border-2 border-yellow-200 bg-yellow-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                      </span>
                      <span className="font-semibold">{resp.modelName}</span>
                      <span className="text-sm text-gray-500">
                        (Score: {resp.avgScore.toFixed(2)})
                      </span>
                    </div>
                    <div className="text-sm text-gray-700">{resp.response}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                Gemini Pro Final Ranking
              </h2>
              <ol className="list-decimal list-inside space-y-2">
                {geminiRanking.map(modelId => {
                  const model = topThree.find(r => r.modelId === modelId);
                  return (
                    <li key={modelId} className="text-gray-700">
                      {model?.modelName}
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                Your Choice
              </h2>
              <div className="space-y-3">
                {topThree.map(resp => (
                  <button
                    key={resp.modelId}
                    onClick={() => setUserChoice(resp.modelId)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      userChoice === resp.modelId
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{resp.modelName}</span>
                      {userChoice === resp.modelId && (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {userChoice && (
                <div className="mt-6 p-4 bg-indigo-50 rounded-lg">
                  <h3 className="font-semibold mb-2">Alignment Result</h3>
                  <div className="text-sm">
                    Your choice vs Gemini Pro:{' '}
                    <span className="font-semibold text-indigo-600">
                      {calculateAlignment()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setStage('input');
                setSelectedModels([]);
                setPrompt('');
                setImageData(null);
                setResponses([]);
                setTopThree([]);
                setGeminiRanking([]);
                setUserChoice(null);
              }}
              className="w-full py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700"
            >
              Start New Test
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
