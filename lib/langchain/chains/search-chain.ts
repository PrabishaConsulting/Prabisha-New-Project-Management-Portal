// lib/langchain/search-chain.ts
import { searchSimilar } from '../vector-store';
import { GoogleGenAI } from '@google/genai';
import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface SearchChainConfig {
  projectId: string;
  userMessage: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  project?: any;
  /**
   * BCP-47 language code (e.g. 'en', 'ja', 'hi', 'fr', 'es', 'ar').
   * The AI will always respond in this language regardless of what language
   * the knowledge-base content or system prompt is written in.
   * Defaults to 'en'.
   */
  language?: string;
  /** Browser context passed from the frontend for richer humanised responses */
  clientContext?: {
    timezone?: string;
    pageUrl?: string;
    isReturning?: boolean;
  };
}

export interface SearchChainResult {
  response: string;
  htmlResponse: string;
  knowledgeContext?: string;
  sourcesUsed?: number;
  sourceUrls?: Array<{ title: string; url: string }>;
}

// ─── Timer utility ────────────────────────────────────────────────────────────
function timer(label: string) {
  const start = Date.now();
  return {
    end: () => {
      const ms = Date.now() - start;
      console.log(`⏱️ [search-chain] ${label}: ${ms}ms`);
      return ms;
    }
  };
}

// ─── Language directive ───────────────────────────────────────────────────────
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  ja: 'Japanese (日本語)',
  hi: 'Hindi (हिन्दी)',
  fr: 'French (Français)',
  es: 'Spanish (Español)',
  ar: 'Arabic (العربية)',
  zh: 'Chinese (中文)',
  de: 'German (Deutsch)',
};

function normalizeQuestion(q: string): string {
  return q
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(word => !/\b(what|is|the|a|an|how|does|do|can|i|my|me)\b/.test(word))
    .sort()
    .join(' ')
    .trim();
}

function hashQuestion(normalized: string): string {
  return createHash('sha256').update(normalized).digest('hex');
}

function languageDirective(language: string): string {
  const name = LANGUAGE_NAMES[language] ?? language;
  return `\
────────────────────────
LANGUAGE RULE (HIGHEST PRIORITY)
────────────────────────
You MUST respond exclusively in ${name}.
Do NOT switch languages for any reason — even if the source documents,
conversation history, or user message are in a different language.
All output HTML, labels, and prose must be in ${name}.

`;
}

// ─── Real-time intent detection ───────────────────────────────────────────────
interface RealtimeIntent {
  isRealtime: boolean;
  type: 'PRICE' | 'TIME' | 'AVAILABILITY' | 'NEWS' | 'WEATHER' | 'STOCK' | null;
}

const REALTIME_PATTERNS: Array<{ pattern: RegExp; type: RealtimeIntent['type'] }> = [
  { pattern: /\b(price|cost|how much|rate|fee|charge|pricing)\b/i, type: 'PRICE' },
  { pattern: /\b(time|clock|now|current time|what time|today|date|open|closed|hours)\b/i, type: 'TIME' },
  { pattern: /\b(available|availability|in stock|stock|inventory|left)\b/i, type: 'AVAILABILITY' },
  { pattern: /\b(news|latest|recent|update|today|breaking|just|happened)\b/i, type: 'NEWS' },
  { pattern: /\b(weather|temperature|forecast|rain|sunny)\b/i, type: 'WEATHER' },
  { pattern: /\b(stock|share price|market|nasdaq|nse|bse|crypto|bitcoin|eth)\b/i, type: 'STOCK' },
];

function detectRealtimeIntent(message: string): RealtimeIntent {
  for (const { pattern, type } of REALTIME_PATTERNS) {
    if (pattern.test(message)) {
      return { isRealtime: true, type };
    }
  }
  return { isRealtime: false, type: null };
}

// ─── Prompts ──────────────────────────────────────────────────────────────────
const QUERY_REWRITE_PROMPT = `
You are an expert search query optimizer for a semantic vector database.

Your task:
Generate 1-2 high-quality alternative search queries that improve retrieval coverage
while preserving the user's original intent exactly.

STRICT RULES:
- Do NOT change the meaning of the question
- Preserve all product names, brands, model numbers, and proper nouns
- Do NOT introduce new assumptions
- Each variation must target a different semantic angle (features, benefits, pricing, comparison, use case, etc.)
- 5-12 words per variation
- Avoid filler words

User question:
"{question}"

Output format (plain text, one per line, no numbering):
[variation]
[variation]
`;

const RAG_ANSWER_PROMPT = `
{languageDirective}
{systemPrompt}

You have access to relevant knowledge below. Use it to answer the user's question naturally — like a knowledgeable person who happens to have read this material, not like a search engine returning results.

────────────────────────
HOW TO USE THE CONTEXT
────────────────────────
- Answer from the context, but write like a human — don't quote chunks verbatim
- Synthesize information across chunks into a coherent, flowing answer
- If something isn't in the context, say so honestly rather than guessing
- Never fabricate URLs, prices, features, or policies

────────────────────────
TONE & STYLE
────────────────────────
- Conversational and direct — get to the point fast
- Use "I" naturally: "From what I can see...", "Based on this..."
- Vary sentence length — mix short punchy sentences with longer ones
- No corporate filler: no "Certainly!", "Great question!", "Of course!"
- If the answer is simple, keep it short. Don't pad.

────────────────────────
FORMAT
────────────────────────
- Wrap paragraphs in <p>
- Use <ul><li> for genuine lists (3+ items that are truly list-like)
- Use <strong> only for genuinely important terms or names
- No markdown, no <br> tags
- End with ONE natural follow-up question in <p class="follow-up-question">...</p>

────────────────────────
CITATION RULES
────────────────────────
When using info from a chunk that has a URL, cite inline:
<cite data-url="FULL_URL">Page Title</cite>
Do NOT invent URLs. Skip citation if no URL exists.

────────────────────────
CONTEXT:
{context}

USER:
{question}

Return ONLY clean HTML.
`;

const GENERAL_ANSWER_PROMPT = `
{languageDirective}
{systemPrompt}

USER:
{question}

────────────────────────
FORMAT
────────────────────────
- Wrap paragraphs in <p>
- Use <ul><li> for lists (3+ items)
- Use <strong> sparingly
- No markdown, no <br> tags

Return ONLY clean HTML.
`;

// ─── rewriteQuery ─────────────────────────────────────────────────────────────
export async function rewriteQuery(userMessage: string): Promise<string[]> {
  if (userMessage.trim().split(/\s+/).length <= 5) {
    console.log('⚡ [rewriteQuery] short query — skipping rewrite, using original only');
    return [userMessage];
  }

  const t = timer('rewriteQuery (LLM call)');
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: QUERY_REWRITE_PROMPT.replace('{question}', userMessage) }] }],
      config: { maxOutputTokens: 100, temperature: 0.3 },
    });
    t.end();

    const text = response.text ?? '';
    const variations = text
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(v => v.length > 0)
      .slice(0, 2);

    const queries = [userMessage, ...variations].slice(0, 2);
    console.log('🔄 Query variations:', queries);
    return queries;
  } catch (error) {
    t.end();
    console.error('Query rewrite error:', error);
    return [userMessage];
  }
}

// ─── searchKnowledgeBases ─────────────────────────────────────────────────────
export async function searchKnowledgeBases(
  project: any,
  queries: string[]
): Promise<{
  context: string;
  sources: Array<{ title: string; url: string; score: number }>;
}> {
  if (!project.knowledgeBases?.length) return { context: '', sources: [] };

  const tTotal = timer(`searchKnowledgeBases (${queries.length} queries × ${project.knowledgeBases.length} KBs)`);

  const allResults: any[] = [];
  const seenContent = new Set<string>();
  const sourceUrls = new Map<string, { title: string; url: string; score: number }>();

  for (const query of queries) {
    for (const kb of project.knowledgeBases) {
      const tKb = timer(`  KB "${kb.name}" query: "${query.substring(0, 30)}"`);
      try {
        const results = await searchSimilar({
          query,
          projectId: project.id,
          knowledgeBaseId: kb.id,
          limit: 12,
          threshold: 0.3,
        });
        tKb.end();

        console.log(`📊 ${kb.name} (query: "${query}"): ${results.length} results`);
        if (results.length > 0) {
          const topScores = results.slice(0, 3).map(r => r.score.toFixed(3)).join(', ');
          console.log(`   Top scores: ${topScores}`);
        }

        for (const result of results) {
          const contentHash = result.content.substring(0, 100);
          if (!seenContent.has(contentHash)) {
            seenContent.add(contentHash);
            allResults.push({ ...result, kbName: kb.name, query });

            let sourceUrl = result.metadata?.source || result.metadata?.url;
            let sourceTitle = result.metadata?.title || result.metadata?.filename || kb.name;

            if (sourceUrl && (sourceUrl.startsWith('http://') || sourceUrl.startsWith('https://'))) {
              const existingSource = sourceUrls.get(sourceUrl);
              if (!existingSource || result.score > existingSource.score) {
                sourceUrls.set(sourceUrl, { title: sourceTitle || 'Untitled Source', url: sourceUrl, score: result.score });
              }
            }
          }
        }
      } catch (error) {
        tKb.end();
        console.error(`❌ ${kb.name}:`, error);
      }
    }
  }

  if (!allResults.length) {
    tTotal.end();
    console.log('❌ No results found');
    return { context: '', sources: [] };
  }

  allResults.sort((a, b) => (b.score || 0) - (a.score || 0));
  const top = selectDiverseResults(allResults, 15);

  console.log(`✅ Selected ${top.length} diverse results for context`);
  console.log(`   Score range: ${top[0]?.score.toFixed(3)} - ${top[top.length - 1]?.score.toFixed(3)}`);

  const formatted = top.map((r, i) => {
    const src = r.metadata?.source || r.metadata?.url;
    const title = r.metadata?.title;
    if (src && (src.startsWith('http://') || src.startsWith('https://')) && title) {
      return `[Source: ${title} (${src})]\n${r.content}`;
    }
    return r.content;
  }).join('\n\n---\n\n');

  const context = `KNOWLEDGE BASE CONTEXT:\n\n${formatted}\n\n(Total sources: ${top.length})`;

  const sources = Array.from(sourceUrls.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  tTotal.end();
  return { context, sources };
}

function selectDiverseResults(results: any[], limit: number): any[] {
  const selected: any[] = [];
  const keywords = new Set<string>();

  for (const result of results) {
    if (selected.length >= limit) break;
    const terms = result.content.toLowerCase().split(/\s+/).filter((w: string) => w.length > 4);
    const newTerms = terms.filter((t: string) => !keywords.has(t));
    const novelty = newTerms.length / Math.max(terms.length, 1);

    if (result.score > 0.5 || novelty > 0.3 || selected.length < 5) {
      selected.push(result);
      newTerms.forEach((t: string) => keywords.add(t));
    }
  }

  return selected;
}

function generateSystemPrompt(project: any, clientContext?: { timezone?: string; pageUrl?: string; isReturning?: boolean }): string {
  const directive = project.description?.trim() || "You are a helpful assistant for this project.";
  const name = project.name ? `You are assisting with the project: ${project.name}.` : '';

  // Real-time context
  const now = new Date();
  const tz = clientContext?.timezone || 'UTC';

  const userLocalTime = now.toLocaleString('en-US', {
    timeZone: tz,
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
  });

  const timeContext = `Current date & time (user's local): ${userLocalTime}`;

  const pageContext = clientContext?.pageUrl
    ? `User is currently on: ${clientContext.pageUrl}`
    : '';

  const returningContext = clientContext?.isReturning
    ? `This is a returning user continuing a previous conversation.`
    : `This is a new user — first interaction.`;

  const contextBlock = [timeContext, pageContext, returningContext].filter(Boolean).join('\n');

  return `${directive}

${name}

${contextBlock}

Tone & style:
- Talk like a real person, not a corporate FAQ bot
- Be warm, direct, and conversational — like a knowledgeable friend helping out
- Use "I" naturally. Say things like "I'd suggest...", "Honestly...", "The thing is..."
- Match the user's energy — casual if they're casual, detailed if they ask for detail
- Never start with "Certainly!", "Of course!", "Great question!" or similar filler
- If you don't know something, say so plainly — don't pad it with apologies
- Keep answers focused. Don't repeat yourself or over-explain`.trim();
}

// ─── HTML helpers ─────────────────────────────────────────────────────────────
function cleanHtmlResponse(html: string): string {
  let cleaned = html;
  cleaned = cleaned.replace(/>\s+</g, '><');
  cleaned = cleaned.trim();
  cleaned = cleaned.replace(/<\/p>/g, '</p>');
  cleaned = cleaned.replace(/<\/li>/g, '</li>');
  cleaned = cleaned.replace(/<\/ul>/g, '</ul>');
  cleaned = cleaned.replace(/<\/ol>/g, '</ol>');
  cleaned = cleaned.replace(/(<br\s*\/?>){2,}/gi, '<br>');
  cleaned = cleaned.replace(/^<br\s*\/?>/i, '');
  cleaned = cleaned.replace(/<br\s*\/?>$/i, '');
  cleaned = cleaned.replace(/<\/p><p>/g, '</p><p style="margin-top: 12px;">');
  cleaned = cleaned.replace(/<ul>/g, '<ul style="margin: 12px 0; padding-left: 24px;">');
  cleaned = cleaned.replace(/<ol>/g, '<ol style="margin: 12px 0; padding-left: 24px;">');
  cleaned = cleaned.replace(/<li>/g, '<li style="margin-bottom: 6px;">');
  cleaned = cleaned.replace(/^<p style="margin-top: 12px;">/, '<p>');

  cleaned = cleaned.replace(
    /<cite data-url="([^"]+)">([^<]+)<\/cite>/g,
    (_, url, label) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer" ` +
      `style="display:inline-flex;align-items:center;gap:3px;color:#2563eb;` +
      `font-size:0.75em;font-weight:500;text-decoration:none;` +
      `background:#eff6ff;border:1px solid #bfdbfe;border-radius:4px;` +
      `padding:1px 5px;margin-left:3px;vertical-align:middle;white-space:nowrap;" ` +
      `title="${label}">` +
      `<svg width="10" height="10" viewBox="0 0 12 12" fill="none" style="flex-shrink:0">` +
      `<path d="M2 10L10 2M10 2H4M10 2V8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>` +
      `</svg>${label}</a>`
  );

  if (!cleaned.startsWith('<div') && !cleaned.startsWith('<p')) {
    cleaned = `<div style="line-height: 1.6; color: #1f2937;">${cleaned}</div>`;
  } else if (cleaned.startsWith('<p')) {
    cleaned = `<div style="line-height: 1.6; color: #1f2937;">${cleaned}</div>`;
  }
  return cleaned;
}

function ensureHtmlFormat(text: string): string {
  if (/<[^>]+>/.test(text)) return text;

  const lines = text.split('\n');
  const output: string[] = [];
  let listBuffer: string[] = [];

  const flushList = () => {
    if (listBuffer.length > 0) {
      output.push(`<ul style="margin:10px 0;padding-left:22px;">${listBuffer.join('')}</ul>`);
      listBuffer = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) { flushList(); continue; }

    if (/^#{1,3}\s+/.test(line)) {
      flushList();
      const txt = line.replace(/^#{1,3}\s+/, '');
      output.push(`<p style="margin:14px 0 4px;font-weight:600;color:#111;">${txt}</p>`);
      continue;
    }

    if (/^\*\*[^*]+\*\*$/.test(line) || /^__[^_]+__$/.test(line)) {
      flushList();
      const txt = line.replace(/^\*\*|\*\*$|^__|__$/g, '');
      output.push(`<p style="margin:14px 0 4px;font-weight:600;color:#111;">${txt}</p>`);
      continue;
    }

    if (/^[-•*]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      const txt = line.replace(/^[-•*]\s+/, '').replace(/^\d+\.\s+/, '');
      const formatted = txt.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      listBuffer.push(`<li style="margin-bottom:5px;">${formatted}</li>`);
      continue;
    }

    flushList();
    const formatted = line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    output.push(`<p style="margin:8px 0;">${formatted}</p>`);
  }

  flushList();
  return output.join('');
}

function appendReadMoreSection(
  htmlResponse: string,
  sources: Array<{ title: string; url: string }>
): string {
  if (!sources.length) return htmlResponse;

  const inlineCiteUrls = new Set<string>();
  const citeRegex = /data-url="([^"]+)"/g;
  let match;
  while ((match = citeRegex.exec(htmlResponse)) !== null) {
    inlineCiteUrls.add(match[1]);
  }

  const allSourcesToShow = sources;

  const sourceItems = allSourcesToShow.map((source) => {
    let hostname = '';
    try { hostname = new URL(source.url).hostname.replace('www.', ''); } catch {}
    const isInline = inlineCiteUrls.has(source.url);

    return `<a href="${source.url}"
       target="_blank"
       rel="noopener noreferrer"
       style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:#f8fafc;border:1px solid ${isInline ? '#bfdbfe' : '#e2e8f0'};border-radius:8px;text-decoration:none;"
     >
      <span style="font-size:15px;flex-shrink:0">${isInline ? '🔵' : '🔗'}</span>
      <span style="display:flex;flex-direction:column;gap:1px;min-width:0;flex:1">
        <span style="font-size:13px;font-weight:600;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${source.title}</span>
        ${hostname ? `<span style="font-size:11px;color:#94a3b8">${hostname}</span>` : ''}
      </span>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="flex-shrink:0;color:#94a3b8">
        <path d="M2 10L10 2M10 2H4M10 2V8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </a>`;
  }).join('');

  const readMoreSection = `<div style="margin-top:20px;padding-top:16px;border-top:2px solid #f1f5f9">
  <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:#94a3b8;text-transform:uppercase;margin-bottom:10px">Sources</div>
  <div style="display:flex;flex-direction:column;gap:8px">${sourceItems}</div>
</div>`;

  return htmlResponse + readMoreSection;
}

type IntentType = 'GREETING' | 'FEATURE' | 'GENERAL';

function detectIntent(message: string): IntentType {
  const text = message.trim().toLowerCase();

  const greetings = [
    'hi',
    'hello',
    'hey',
    'good morning',
    'good evening',
    'good afternoon'
  ];

  if (greetings.some(g => text === g || text.startsWith(g + ' '))) {
    return 'GREETING';
  }

  const featureKeywords = [
    'feature',
    'features',
    'pricing',
    'price',
    'plan',
    'plans',
    'cost',
    'how',
    'what',
    'use case',
    'use cases',
    'example',
    'examples',
    'capability',
    'capabilities',
    'integration',
    'integrations',
    'benefits',
    'advantages'
  ];

  if (featureKeywords.some(keyword => text.includes(keyword))) {
    return 'FEATURE';
  }

  return 'GENERAL';
}

// ─── generateRAGResponse ──────────────────────────────────────────────────────
export async function generateRAGResponse(
  project: any,
  userMessage: string,
  language = 'en'
): Promise<SearchChainResult> {
  console.group('🔍 generateRAGResponse');
  const tTotal = timer('generateRAGResponse [total]');

  const langDirective = languageDirective(language);

  const tStep1 = timer('Step 1: rewriteQuery');
  const queries = await rewriteQuery(userMessage);
  tStep1.end();

  const intent = detectIntent(userMessage);

  if (intent === 'GREETING') {
    let greetingText: string;

    if (language === 'en') {
      greetingText = `<p>Hi there 👋 How can I help you today?</p>`;
    } else {
      const tGreeting = timer('greeting fast-path LLM (non-English)');
      try {
        const response = await ai.models.generateContent({
          model: project.model || 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: `${langDirective}Reply to a friendly greeting in one short sentence wrapped in a <p> tag. Output only the HTML.` }] }],
          config: { maxOutputTokens: 60, temperature: 0.5 },
        });
        tGreeting.end();
        greetingText = response.text?.trim() || `<p>👋</p>`;
      } catch {
        tGreeting.end();
        greetingText = `<p>👋</p>`;
      }
    }

    const htmlResponse = `<div style="line-height:1.6;color:#1f2937;">${greetingText}</div>`;
    tTotal.end();
    console.groupEnd();
    return {
      response: greetingText,
      htmlResponse,
      knowledgeContext: '',
      sourcesUsed: 0,
      sourceUrls: []
    };
  }

  const tStep2 = timer(`Step 2: vector search (smart, ${project.knowledgeBases?.length ?? 0} KBs)`);
  const tPhase2a = timer('  Phase 2a: original query search');
  const originalQuery = queries[0];
  const searchresults = (await Promise.all(
    project.knowledgeBases.map((kb: any) =>
      searchSimilar({
        query: originalQuery,
        projectId: project.id,
        knowledgeBaseId: kb.id,
        limit: 6,
        threshold: 0.3
      }).catch(err => {
        console.error(`KB ${kb.name} search failed:`, err);
        return [];
      })
    )
  )).flat();
  tPhase2a.end();

  const bestScore = searchresults.reduce((max, r) => Math.max(max, r.score ?? 0), 0);
  console.log(`   └─ ${searchresults.length} results, best score: ${bestScore.toFixed(3)}`);
  tStep2.end();

  const tProcess = timer('Step 2b: processSearchResults');
  const { context: knowledgeContext, sources } = processSearchResults(searchresults.flat(), project);
  tProcess.end();

  console.log(`   └─ knowledgeContext length: ${knowledgeContext.length} chars, sources: ${sources.length}`);

  const strongContext = bestScore >= 0.45 && knowledgeContext.length > 0;

  const systemPrompt = generateSystemPrompt(project);
  const prompt = strongContext
    ? RAG_ANSWER_PROMPT
        .replace('{languageDirective}', langDirective)
        .replace('{systemPrompt}', systemPrompt)
        .replace('{context}', knowledgeContext)
        .replace('{question}', userMessage)
    : GENERAL_ANSWER_PROMPT
        .replace('{languageDirective}', langDirective)
        .replace('{systemPrompt}', systemPrompt)
        .replace('{question}', userMessage);

  const tLLM = timer(`Step 3: LLM generateText (${project.model || 'gemini-2.5-flash'})`);
  const response = await ai.models.generateContent({
    model: project.model || 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      maxOutputTokens: project.max_tokens || 800,
      temperature: project.temperature ?? 0.9,
    },
  });
  const text = response.text ?? '';
  tLLM.end();

  console.log(`   └─ LLM output length: ${text.length} chars`);

  const tHtml = timer('Step 4: cleanHtml + appendReadMore');
  let cleaned = cleanHtmlResponse(ensureHtmlFormat(text));

  const isKnowledgeIntent = intent === 'FEATURE' || intent === 'GENERAL';
  const shortMessage = userMessage.trim().length < 20;
  const shouldShowSources = strongContext && isKnowledgeIntent && !shortMessage && cleaned.length > 120;

  const htmlResponse = shouldShowSources
    ? appendReadMoreSection(cleaned, sources)
    : cleaned;
  tHtml.end();

  tTotal.end();
  console.groupEnd();

  return {
    response: text,
    htmlResponse,
    knowledgeContext,
    sourcesUsed: sources.length,
    sourceUrls: sources
  };
}

function extractSourceUrl(r: any): { url: string; title: string } | null {
  const m = r.metadata || {};
  const url =
    m.source ||
    m.url ||
    m.link ||
    m.pageUrl ||
    r.source ||
    null;

  if (!url || !(url.startsWith('http://') || url.startsWith('https://'))) return null;

  const title =
    m.title ||
    m.name ||
    m.filename ||
    m.page_title ||
    (() => {
      try {
        const u = new URL(url);
        const path = u.pathname.replace(/\/$/, '').split('/').filter(Boolean).pop() || '';
        const readable = path.replace(/[-_]/g, ' ').replace(/\.[^.]+$/, '');
        return readable
          ? `${readable.charAt(0).toUpperCase()}${readable.slice(1)}`
          : u.hostname;
      } catch {
        return url;
      }
    })();

  return { url, title };
}

function processSearchResults(allResults: any[], project: any) {
  const seen = new Set();
  const uniqueResults = allResults
    .filter(r => {
      const isDuplicate = seen.has(r.content.substring(0, 100));
      seen.add(r.content.substring(0, 100));
      return !isDuplicate;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const context = uniqueResults.map((r, i) => {
    const src = extractSourceUrl(r);
    if (src?.url && src?.title) {
      return `[Source: ${src.title} (${src.url})]\n${r.content}`;
    }
    return r.content;
  }).join('\n\n');

  const sourceMap = new Map<string, { title: string; url: string }>();
  for (const r of uniqueResults) {
    const src = extractSourceUrl(r);
    if (src && !sourceMap.has(src.url)) {
      sourceMap.set(src.url, src);
    }
  }
  const sources = Array.from(sourceMap.values()).slice(0, 5);

  if (uniqueResults.length > 0) {
    console.log('🔍 Sample result metadata:', JSON.stringify(uniqueResults[0]?.metadata, null, 2));
    console.log(`🔗 Sources found: ${sources.length}`, sources.map(s => s.url));
  }

  return { context, sources };
}

// ─── executeSearchChain ───────────────────────────────────────────────────────
export async function executeSearchChain(config: SearchChainConfig): Promise<SearchChainResult> {
  console.group('⛓️ executeSearchChain');
  const tTotal = timer('executeSearchChain [total]');

  const {
    projectId,
    userMessage,
    project: preloadedProject,
    language = 'en',
  } = config;

  const realtimeIntent = detectRealtimeIntent(userMessage);
  
  let project = preloadedProject ?? null;
  if (!project) {
    const tProject = timer('prisma: fetch project + relations (no preload)');
    project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        knowledgeBases: { select: { id: true, name: true } },
      }
    });
    tProject.end();
  } else {
    console.log('✅ [executeSearchChain] using pre-fetched project — skipped DB call');
  }

  if (!project) throw new Error('Project not found');

  const { response, htmlResponse, knowledgeContext, sourcesUsed, sourceUrls } =
    await generateRAGResponse(
      project,
      userMessage,
      language
    );

  tTotal.end();
  console.groupEnd();

  return {
    response: htmlResponse,
    htmlResponse,
    knowledgeContext,
    sourcesUsed,
    sourceUrls
  };
}

// ─── simpleSearch ─────────────────────────────────────────────────────────────
export async function simpleSearch(
  projectId: string,
  query: string,
  options?: {
    limit?: number;
    threshold?: number;
    includeKnowledgeBaseNames?: boolean;
  }
): Promise<Array<{ content: string; score: number; metadata?: any; kbName?: string }>> {
  const t = timer('simpleSearch [total]');

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { knowledgeBases: true }
  });
  if (!project) throw new Error('Project not found');

  const allResults: any[] = [];
  const seenContent = new Set<string>();

  for (const kb of project.knowledgeBases || []) {
    const tKb = timer(`  simpleSearch KB: "${kb.name}"`);
    try {
      const results = await searchSimilar({
        query,
        projectId: project.id,
        knowledgeBaseId: kb.id,
        limit: options?.limit || 8,
        threshold: options?.threshold || 0.3,
      });
      tKb.end();

      for (const result of results) {
        const contentHash = result.content.substring(0, 100);
        if (!seenContent.has(contentHash)) {
          seenContent.add(contentHash);
          allResults.push(options?.includeKnowledgeBaseNames ? { ...result, kbName: kb.name } : result);
        }
      }
    } catch (error) {
      tKb.end();
      console.error(`Knowledge base ${kb.name} search error:`, error);
    }
  }

  allResults.sort((a, b) => (b.score || 0) - (a.score || 0));
  t.end();
  return allResults.slice(0, options?.limit || 10);
}

// ─── streamRAGResponse ────────────────────────────────────────────────────────
export async function streamRAGResponse(
  project: any,
  userMessage: string,
  onChunk?: (chunk: string) => void,
  language = 'en',
  clientContext?: { timezone?: string; pageUrl?: string; isReturning?: boolean }
): Promise<ReadableStream<string>> {
  console.group('🌊 streamRAGResponse');
  const tTotal = timer('streamRAGResponse setup [total before stream starts]');

  const langDirective = languageDirective(language);

  const intent = detectIntent(userMessage);

  if (intent === 'GREETING') {
    let greetingText: string;

    if (language === 'en') {
      greetingText = `<p>Hi there 👋 How can I help you today?</p>`;
    } else {
      try {
        const response = await ai.models.generateContent({
          model: project.model || 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: `${langDirective}Reply to a friendly greeting in one short sentence wrapped in a <p> tag. Output only the HTML.` }] }],
          config: { maxOutputTokens: 60, temperature: 0.5 },
        });
        greetingText = response.text?.trim() || `<p>👋</p>`;
      } catch {
        greetingText = `<p>👋</p>`;
      }
    }

    tTotal.end();
    console.groupEnd();
    return new ReadableStream({
      start(controller) {
        controller.enqueue(greetingText);
        controller.close();
      }
    });
  }

  const tRewrite = timer('rewriteQuery');
  const queries = await rewriteQuery(userMessage);
  tRewrite.end();

  const tSearch = timer('searchKnowledgeBases');
  const { context: knowledgeContext, sources } = await searchKnowledgeBases(project, queries);
  tSearch.end();

  const systemPrompt = generateSystemPrompt(project, clientContext);
  const prompt = knowledgeContext
    ? RAG_ANSWER_PROMPT
        .replace('{languageDirective}', langDirective)
        .replace('{systemPrompt}', systemPrompt)
        .replace('{context}', knowledgeContext)
        .replace('{question}', userMessage)
    : GENERAL_ANSWER_PROMPT
        .replace('{languageDirective}', langDirective)
        .replace('{systemPrompt}', systemPrompt)
        .replace('{question}', userMessage);

  const tStreamInit = timer('streamText init (LLM call start)');
  const streamResult = await ai.models.generateContentStream({
    model: project.model || 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      maxOutputTokens: project.max_tokens || 800,
      temperature: project.temperature ?? 0.9,
    },
  });
  tStreamInit.end();

  tTotal.end();
  console.log('📡 Stream open — chunks will arrive asynchronously');
  console.groupEnd();

  let fullText = '';
  let chunkCount = 0;
  const tStreamRead = timer('streamRAGResponse: reading all chunks');

  const stream = new ReadableStream<string>({
    async start(controller) {
      for await (const chunk of streamResult) {
        const piece = chunk.text ?? '';
        if (!piece) continue;
        chunkCount++;
        fullText += piece;
        controller.enqueue(piece);
        onChunk?.(piece);
      }

      tStreamRead.end();
      console.log(`   └─ chunks: ${chunkCount}, total chars: ${fullText.length}`);

      const htmlResponse = cleanHtmlResponse(ensureHtmlFormat(fullText));
      const finalHtml = sources.length > 0
        ? appendReadMoreSection(htmlResponse, sources)
        : htmlResponse;

      // Note: No DB persistence since conversations/messages tables are removed
      console.log('✅ Stream completed (no persistence - stateless mode)');

      controller.close();
    }
  });

  return stream;
}