/**
 * Document analysis hook — triggers OCR and IEP goal analysis
 * via the ai-proxy Edge Function, caches results in memory.
 * Phase 4: Sprint S32
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { Document, IEPAnalysisResult } from '@/types/database';

const EDGE_FN_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai-proxy`;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? '';
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

interface UseDocumentAnalysisReturn {
  isAnalyzing: boolean;
  isExtracting: boolean;
  error: string | null;
  extractText: (document: Document, imageBase64: string) => Promise<string | null>;
  analyzeIEP: (extractedText: string, mode?: 'parse' | 'full') => Promise<IEPAnalysisResult | null>;
  getCachedAnalysis: (documentId: string) => IEPAnalysisResult | null;
  generateMeetingPrep: (analysis: IEPAnalysisResult, context: MeetingPrepContext) => Promise<string | null>;
  compareIEPs: (analysis1: IEPAnalysisResult, analysis2: IEPAnalysisResult) => IEPComparisonResult;
}

export interface MeetingPrepContext {
  childName: string;
  childAge: string | null;
  diagnoses: string[];
  regionalCenter: string | null;
  schoolDistrict: string | null;
}

export interface IEPComparisonResult {
  newGoals: Array<{ domain: string; goalText: string }>;
  removedGoals: Array<{ domain: string; goalText: string }>;
  changedGoals: Array<{
    domain: string;
    oldGoal: string;
    newGoal: string;
    improved: boolean;
  }>;
  unchangedCount: number;
  progressSummary: string;
}

export function useDocumentAnalysis(): UseDocumentAnalysisReturn {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, IEPAnalysisResult>>(new Map());

  /** S31: Extract text from document image via OCR */
  const extractText = useCallback(async (
    document: Document,
    imageBase64: string
  ): Promise<string | null> => {
    setIsExtracting(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(EDGE_FN_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'ocr',
          documentId: document.id,
          imageBase64,
          mimeType: document.mime_type ?? 'image/png',
        }),
      });

      if (!response.ok) throw new Error(`OCR failed (${response.status})`);
      const data = await response.json();
      return data.extractedText ?? null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OCR extraction failed');
      return null;
    } finally {
      setIsExtracting(false);
    }
  }, []);

  /** S33-S35: Analyze IEP goals with parsing, weakness detection, and suggestions */
  const analyzeIEP = useCallback(async (
    extractedText: string,
    mode: 'parse' | 'full' = 'full'
  ): Promise<IEPAnalysisResult | null> => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(EDGE_FN_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'analyze-iep',
          extractedText,
          analysisType: mode,
        }),
      });

      if (!response.ok) throw new Error(`IEP analysis failed (${response.status})`);
      const analysis = await response.json() as IEPAnalysisResult;

      if (analysis.goals) {
        return analysis;
      }
      throw new Error('Invalid analysis response');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'IEP analysis failed');
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  /** Get cached analysis for a document */
  const getCachedAnalysis = useCallback((documentId: string): IEPAnalysisResult | null => {
    return cacheRef.current.get(documentId) ?? null;
  }, []);

  /** S37: Compare two IEP analyses side-by-side */
  const compareIEPs = useCallback((
    older: IEPAnalysisResult,
    newer: IEPAnalysisResult
  ): IEPComparisonResult => {
    const olderDomains = new Map(older.goals.map((g) => [g.domain + '|' + g.goalText.slice(0, 50), g]));
    const newerDomains = new Map(newer.goals.map((g) => [g.domain + '|' + g.goalText.slice(0, 50), g]));

    const newGoals: IEPComparisonResult['newGoals'] = [];
    const removedGoals: IEPComparisonResult['removedGoals'] = [];
    const changedGoals: IEPComparisonResult['changedGoals'] = [];
    let unchangedCount = 0;

    // Find new and changed goals
    for (const [key, goal] of newerDomains) {
      const oldGoal = olderDomains.get(key);
      if (!oldGoal) {
        // Check if same domain exists with different text (changed)
        const sameDomain = older.goals.find((g) => g.domain === goal.domain);
        if (sameDomain) {
          const oldStrength = sameDomain.strength === 'weak' ? 0 : sameDomain.strength === 'adequate' ? 1 : 2;
          const newStrength = goal.strength === 'weak' ? 0 : goal.strength === 'adequate' ? 1 : 2;
          changedGoals.push({
            domain: goal.domain,
            oldGoal: sameDomain.goalText,
            newGoal: goal.goalText,
            improved: newStrength > oldStrength,
          });
        } else {
          newGoals.push({ domain: goal.domain, goalText: goal.goalText });
        }
      } else {
        unchangedCount++;
      }
    }

    // Find removed goals
    for (const [key, goal] of olderDomains) {
      if (!newerDomains.has(key) && !changedGoals.some((c) => c.domain === goal.domain)) {
        removedGoals.push({ domain: goal.domain, goalText: goal.goalText });
      }
    }

    const progressSummary = `${newGoals.length} new goals, ${removedGoals.length} removed, ${changedGoals.length} changed, ${unchangedCount} unchanged. ${changedGoals.filter((c) => c.improved).length} of ${changedGoals.length} changes show improvement.`;

    return { newGoals, removedGoals, changedGoals, unchangedCount, progressSummary };
  }, []);

  /** S38: Generate IEP meeting prep document */
  const generateMeetingPrep = useCallback(async (
    analysis: IEPAnalysisResult,
    context: MeetingPrepContext
  ): Promise<string | null> => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();

      const weakGoals = analysis.goals.filter((g) => g.strength === 'weak');
      const criticalIssues = analysis.goals.flatMap((g) => g.weaknesses.filter((w) => w.severity === 'critical'));

      const prompt = `Generate an IEP meeting preparation document for a parent. Use a warm but firm advocacy tone.

CHILD INFO:
- Name: ${context.childName}
- Age: ${context.childAge ?? 'Unknown'}
- Diagnoses: ${context.diagnoses.join(', ') || 'Not specified'}
- Regional Center: ${context.regionalCenter ?? 'Not specified'}
- School District: ${context.schoolDistrict ?? 'Not specified'}

IEP ANALYSIS SUMMARY:
- Total goals: ${analysis.summary.totalGoals}
- Strong: ${analysis.summary.strongCount}, Adequate: ${analysis.summary.adequateCount}, Weak: ${analysis.summary.weakCount}
- Critical issues: ${analysis.summary.criticalIssues}

WEAK GOALS TO ADDRESS:
${weakGoals.map((g) => `- [${g.domain}] ${g.goalText}\n  Issues: ${g.weaknesses.map((w) => w.issue).join('; ')}\n  Suggested: ${g.improvedGoal}`).join('\n\n')}

CRITICAL ISSUES:
${criticalIssues.map((w) => `- ${w.issue}: ${w.explanation}`).join('\n')}

Generate a meeting prep document with these sections:
1. Meeting Agenda Priorities (top 3 items to address)
2. Questions to Ask the Team (specific, goal-by-goal)
3. Improved Goal Language to Propose (for each weak goal)
4. Legal References to Support Your Requests (cite IDEA 300.320, CA Ed Code)
5. Action Items After the Meeting

Format as clean text the parent can print or share.`;

      const response = await fetch(EDGE_FN_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'chat',
          system: 'You are a special education advocacy expert helping parents prepare for IEP meetings. Be warm, encouraging, and specific.',
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) throw new Error('Meeting prep generation failed');

      // Collect non-streaming response
      const text = await response.text();
      const lines = text.split('\n');
      let fullText = '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const event = JSON.parse(data);
          if (event.type === 'content_block_delta' && event.delta?.text) {
            fullText += event.delta.text;
          }
        } catch { /* skip */ }
      }

      return fullText || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Meeting prep generation failed');
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return {
    isAnalyzing,
    isExtracting,
    error,
    extractText,
    analyzeIEP,
    getCachedAnalysis,
    generateMeetingPrep,
    compareIEPs,
  };
}
