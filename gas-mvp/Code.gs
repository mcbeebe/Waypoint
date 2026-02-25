// ═══════════════════════════════════════════════════════
// WAYPOINT MVP — Google Apps Script Backend
// Serves the web app, manages Google Sheet backend,
// and runs the AI Navigator Engine (GAS Lite)
// ═══════════════════════════════════════════════════════

// ─── Configuration ───
var AI_CONFIG = {
  MODEL: 'claude-sonnet-4-5-20250929',
  MAX_TOKENS: 2000,
  API_URL: 'https://api.anthropic.com/v1/messages',
  API_VERSION: '2023-06-01',
};

function getApiKey_() {
  return PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
}

// ─── Web App Entry Point ───
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Waypoint — Your Child\'s Journey, Mapped')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ═══════════════════════════════════════════════════════
// SHEET SETUP — Creates all tabs on first run
// ═══════════════════════════════════════════════════════

function getOrCreateSheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers && headers.length) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

function initSheets() {
  // Original MVP tabs
  getOrCreateSheet_('Users', [
    'id', 'email', 'parentName', 'childName', 'diagnosis', 'age',
    'diagnosedBy', 'rcStatus', 'iepStatus', 'insurance', 'zipCode',
    'regionalCenter', 'createdAt', 'lastActive'
  ]);
  getOrCreateSheet_('ActionLog', [
    'userId', 'actionId', 'title', 'status', 'completedAt', 'followUpAnswer', 'notes'
  ]);
  getOrCreateSheet_('Sessions', [
    'userId', 'sessionStart', 'lastScreen', 'checkInData'
  ]);

  // AI Engine tabs
  getOrCreateSheet_('KnowledgeBase', [
    'id', 'category', 'subcategory', 'title', 'content', 'source', 'active', 'createdAt'
  ]);
  getOrCreateSheet_('Prompts', [
    'category', 'system_prompt', 'active', 'version', 'updatedAt'
  ]);
  getOrCreateSheet_('InteractionLog', [
    'timestamp', 'userId', 'question', 'category', 'urgency',
    'emotionalState', 'response', 'contextUsed', 'feedback', 'feedbackNote'
  ]);
  getOrCreateSheet_('DraftLog', [
    'timestamp', 'userId', 'draftType', 'originalQuestion', 'draft', 'status'
  ]);
  getOrCreateSheet_('ChatSessions', [
    'sessionId', 'userId', 'startedAt', 'messageCount', 'lastCategory'
  ]);
}

// ═══════════════════════════════════════════════════════
// USER MANAGEMENT (existing)
// ═══════════════════════════════════════════════════════

function saveUser(userData) {
  try {
    var sheet = getOrCreateSheet_('Users', [
      'id', 'email', 'parentName', 'childName', 'diagnosis', 'age',
      'diagnosedBy', 'rcStatus', 'iepStatus', 'insurance', 'zipCode',
      'regionalCenter', 'createdAt', 'lastActive'
    ]);
    var id = Utilities.getUuid();
    var now = new Date().toISOString();
    sheet.appendRow([
      id,
      userData.email || '',
      userData.parentName || '',
      userData.childName || '',
      userData.diagnosis || '',
      userData.age || '',
      userData.diagnosedBy || '',
      userData.rcStatus || '',
      userData.iepStatus || '',
      userData.insurance || '',
      userData.zipCode || '',
      userData.regionalCenter || '',
      now,
      now
    ]);
    return { success: true, userId: id };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function logAction(userId, actionId, title, status, followUpAnswer, notes) {
  try {
    var sheet = getOrCreateSheet_('ActionLog', [
      'userId', 'actionId', 'title', 'status', 'completedAt', 'followUpAnswer', 'notes'
    ]);
    sheet.appendRow([
      userId, actionId, title, status,
      status === 'completed' ? new Date().toISOString() : '',
      followUpAnswer || '',
      notes || ''
    ]);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function logSession(userId, screen, checkInData) {
  try {
    var sheet = getOrCreateSheet_('Sessions', [
      'userId', 'sessionStart', 'lastScreen', 'checkInData'
    ]);
    sheet.appendRow([
      userId,
      new Date().toISOString(),
      screen,
      JSON.stringify(checkInData || {})
    ]);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ─── Analytics helpers ───
function getUserCount() {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
    if (!sheet) return 0;
    return Math.max(0, sheet.getLastRow() - 1);
  } catch (e) {
    return 0;
  }
}

function getActionStats() {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ActionLog');
    if (!sheet || sheet.getLastRow() <= 1) return { total: 0, completed: 0 };
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues();
    var total = data.length;
    var completed = data.filter(function(r) { return r[3] === 'completed'; }).length;
    return { total: total, completed: completed };
  } catch (e) {
    return { total: 0, completed: 0 };
  }
}

// ═══════════════════════════════════════════════════════
// AI ENGINE — Claude API Integration
// ═══════════════════════════════════════════════════════

function callClaude_(systemPrompt, userMessage) {
  var apiKey = getApiKey_();
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set. Go to Project Settings → Script Properties and add it.');
  }

  var payload = {
    model: AI_CONFIG.MODEL,
    max_tokens: AI_CONFIG.MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }]
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': AI_CONFIG.API_VERSION
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var resp = UrlFetchApp.fetch(AI_CONFIG.API_URL, options);
  var code = resp.getResponseCode();

  if (code !== 200) {
    var errBody = resp.getContentText();
    Logger.log('Claude API error ' + code + ': ' + errBody);
    throw new Error('AI service error (' + code + '). Please try again.');
  }

  var data = JSON.parse(resp.getContentText());
  return data.content[0].text;
}

// ─── Robust JSON Extraction ───
// Handles: code fences, leading/trailing prose, nested braces
function extractJson_(text) {
  // Strip code fences
  text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  // Try direct parse first (ideal case)
  try { return JSON.parse(text); } catch (e) {}

  // Find the first '{' and match to its closing '}'
  var start = text.indexOf('{');
  if (start < 0) {
    return { empathy: '', answer: text, action_steps: [], rights_reminder: null, watch_out: null, offer_to_draft: null, draft_type: null, sources: [] };
  }

  var depth = 0;
  var inString = false;
  var escape = false;
  var end = -1;

  for (var i = start; i < text.length; i++) {
    var c = text.charAt(i);
    if (escape) { escape = false; continue; }
    if (c === '\\') { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === '{') depth++;
    if (c === '}') { depth--; if (depth === 0) { end = i; break; } }
  }

  if (end > start) {
    var jsonStr = text.substring(start, end + 1);
    try { return JSON.parse(jsonStr); } catch (e) {
      Logger.log('JSON extraction parse error: ' + e.toString() + ' | extracted: ' + jsonStr.substring(0, 200));
    }
  }

  // Final fallback: wrap raw text
  Logger.log('JSON extraction failed completely. Raw text: ' + text.substring(0, 300));
  return { empathy: '', answer: text, action_steps: [], rights_reminder: null, watch_out: null, offer_to_draft: null, draft_type: null, sources: [] };
}

// ═══════════════════════════════════════════════════════
// AI ENGINE — Classification
// ═══════════════════════════════════════════════════════

function classifyQuestion_(question) {
  var systemPrompt = 'You classify parent questions about disability services in California.\n'
    + 'Return ONLY valid JSON — no markdown, no code fences, no explanation.\n'
    + 'Schema: { "category": "...", "urgency": "low|medium|high", "needs_action": true|false, "emotional_state": "calm|stressed|crisis", "tone_level": "collaborative|assertive|adversarial", "claim_context": "..." }\n\n'
    + 'Categories:\n'
    + '- regional-center: Regional Center, Early Start, IPP, vendored services, POS standards, Lanterman Act\n'
    + '- iep: IEP, 504, school services, evaluations, placement, FAPE, IDEA\n'
    + '- benefits: SSI, IHSS, Medi-Cal, CCS, ABLE, respite, SDP, reimbursements\n'
    + '- insurance: coverage, denials, appeals, prior auth, medical necessity, SB 946\n'
    + '- rights: fair hearings, complaints, legal rights, timelines, disputes, 4731\n'
    + '- navigation: general guidance, provider finding, system overview, getting started\n'
    + '- transitions: aging out, DOR, vocational rehab, conservatorship, adult services\n\n'
    + 'Urgency rules:\n'
    + '- high: deadlines within days, active denials, crisis situations, rights violations\n'
    + '- medium: upcoming meetings, pending applications, general concerns\n'
    + '- low: informational questions, planning ahead, general learning\n\n'
    + 'TONE LEVEL — this is critical:\n'
    + '- collaborative: Default. Parent is asking how something works, exploring options, has a pre-authorized service and needs process help, is building a relationship with an agency, or is at the beginning of their journey. No conflict yet.\n'
    + '- assertive: Parent is experiencing delays, getting the runaround, being told "no" informally, or feels something isn\'t right. They need to know their rights and stand firm, but haven\'t been formally denied yet.\n'
    + '- adversarial: Parent has received a formal denial, rights are being violated, deadlines are being missed despite requests, or they need to file complaints/appeals/hearings. Active conflict.\n\n'
    + 'CLAIM CONTEXT — briefly describe the specific situation:\n'
    + 'Examples: "pre-authorized reimbursement paperwork question", "first-time RC inquiry", "formal service denial needing appeal", "routine IEP prep", "school refusing evaluation request"\n'
    + 'This helps calibrate the response tone and content.';

  var result = callClaude_(systemPrompt, question);
  var parsed = extractJson_(result);

  // Validate classification has required fields, fallback if not
  if (!parsed.category) parsed.category = 'navigation';
  if (!parsed.urgency) parsed.urgency = 'medium';
  if (parsed.needs_action === undefined) parsed.needs_action = false;
  if (!parsed.emotional_state) parsed.emotional_state = 'calm';
  if (!parsed.tone_level) parsed.tone_level = 'collaborative';
  if (!parsed.claim_context) parsed.claim_context = '';
  return parsed;
}

// ═══════════════════════════════════════════════════════
// AI ENGINE — Knowledge Base Retrieval
// ═══════════════════════════════════════════════════════

function getRelevantKnowledge_(question, category) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('KnowledgeBase');
  if (!sheet || sheet.getLastRow() <= 1) return '';

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var catCol = headers.indexOf('category');
  var contentCol = headers.indexOf('content');
  var titleCol = headers.indexOf('title');
  var activeCol = headers.indexOf('active');

  // Filter by category + active
  var categoryRows = data.slice(1).filter(function(row) {
    var isActive = activeCol >= 0 ? (row[activeCol] === true || row[activeCol] === 'TRUE' || row[activeCol] === 'Yes') : true;
    return row[catCol] === category && isActive;
  });

  // If no category match, include all active rows
  if (categoryRows.length === 0) {
    categoryRows = data.slice(1).filter(function(row) {
      var isActive = activeCol >= 0 ? (row[activeCol] === true || row[activeCol] === 'TRUE' || row[activeCol] === 'Yes') : true;
      return isActive;
    });
  }

  if (categoryRows.length === 0) return '';

  // Keyword relevance scoring
  var words = question.toLowerCase().split(/\s+/).filter(function(w) { return w.length > 3; });

  var scored = categoryRows.map(function(row) {
    var content = (row[contentCol] || '').toString().toLowerCase();
    var title = (row[titleCol] || '').toString().toLowerCase();
    var score = 0;
    words.forEach(function(word) {
      if (title.indexOf(word) >= 0) score += 3;
      if (content.indexOf(word) >= 0) score += 1;
    });
    // Boost exact category matches
    if (row[catCol] === category) score += 2;
    return { content: row[contentCol], title: row[titleCol], score: score };
  });

  return scored
    .sort(function(a, b) { return b.score - a.score; })
    .slice(0, 5)
    .filter(function(r) { return r.score > 0; })
    .map(function(r) { return '## ' + r.title + '\n' + r.content; })
    .join('\n\n---\n\n');
}

// ═══════════════════════════════════════════════════════
// AI ENGINE — Category-Specific Prompts
// ═══════════════════════════════════════════════════════

function getCategoryPrompt_(category, userProfile, toneLevel, claimContext) {
  // Try to load from Prompts sheet
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Prompts');
  if (sheet && sheet.getLastRow() > 1) {
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var catCol = headers.indexOf('category');
    var promptCol = headers.indexOf('system_prompt');
    var activeCol = headers.indexOf('active');

    var row = data.slice(1).find(function(r) {
      return r[catCol] === category && (r[activeCol] === true || r[activeCol] === 'TRUE' || r[activeCol] === 'Yes');
    });

    if (row && row[promptCol]) {
      var prompt = row[promptCol].toString();
      prompt = injectProfileContext_(prompt, userProfile);
      prompt += getToneGuidance_(toneLevel, claimContext);
      return prompt;
    }
  }

  // Fallback: built-in prompts
  return getBuiltInPrompt_(category, userProfile, toneLevel, claimContext);
}

function injectProfileContext_(prompt, profile) {
  if (!profile) return prompt;
  return prompt
    .replace(/\{child_name\}/g, profile.childName || 'your child')
    .replace(/\{regional_center\}/g, profile.regionalCenter || 'your Regional Center')
    .replace(/\{school_district\}/g, profile.schoolDistrict || 'your school district')
    .replace(/\{diagnosis\}/g, profile.diagnosis || 'not specified')
    .replace(/\{age\}/g, profile.age || 'not specified')
    .replace(/\{insurance\}/g, profile.insurance || 'not specified')
    .replace(/\{rc_status\}/g, profile.rcStatus || 'unknown')
    .replace(/\{iep_status\}/g, profile.iepStatus || 'unknown')
    .replace(/\{benefits\}/g, profile.benefits || 'none specified');
}

// ─── Tone Guidance Generator ───
function getToneGuidance_(toneLevel, claimContext) {
  var tone = '\n\nTONE CALIBRATION — READ THIS CAREFULLY:\n';
  tone += 'Situation context: ' + (claimContext || 'general inquiry') + '\n\n';

  if (toneLevel === 'collaborative') {
    tone += 'TONE: COLLABORATIVE (warm, helpful, practical)\n'
      + '- Speak like a knowledgeable friend helping them navigate a process\n'
      + '- Focus on practical "how-to" steps, not legal ammunition\n'
      + '- DO NOT cite statute numbers or legal codes unless the parent specifically asks about their rights\n'
      + '- DO NOT use phrases like "you are entitled to," "the law requires," or "they must" — instead say "you can ask for," "the process is," "here\'s how it works"\n'
      + '- Frame agencies (RC, school, insurance) as partners to work WITH, not adversaries\n'
      + '- Remember that service coordinators and school staff are often overworked and well-meaning — assume good intent first\n'
      + '- For reimbursement questions about pre-authorized services: focus on the paperwork process, timelines for submission, what documentation to include, and who to contact if there\'s a processing delay\n'
      + '- For delays or slow responses: suggest a polite follow-up email or call before assuming anything adversarial\n'
      + '- For general inquiries: explain the system clearly without implying the parent will need to fight\n'
      + '- Save legal citations for the "sources" field only — do NOT weave them into the conversational answer\n'
      + '- Use "rights_reminder" ONLY if there\'s a genuinely helpful right to know (not just to sound authoritative)\n';
  } else if (toneLevel === 'assertive') {
    tone += 'TONE: ASSERTIVE (firm, informed, empowering)\n'
      + '- The parent may be experiencing some pushback — but FIRST ask what has happened so far\n'
      + '- CRITICAL: Before jumping to assertive advice, use the clarifying_question field to ask what steps they\'ve already taken. '
      + 'Have they called? Emailed? Spoken to a supervisor? The answer changes your advice significantly.\n'
      + '- If they HAVE already tried normal channels: mention relevant rights and timelines naturally, but don\'t lead with legal threats\n'
      + '- If you DON\'T KNOW what they\'ve tried: give preliminary guidance but note it may change based on their situation\n'
      + '- Use phrases like "you have the right to," "they are required to respond within X days," and "ask them to put that in writing"\n'
      + '- Provide scripts that are firm but professional — not adversarial\n'
      + '- Include one key legal citation that\'s directly relevant, but don\'t pile on multiple statutes\n'
      + '- For non-pre-authorized reimbursement claims: explain the appeal process and what documentation strengthens the case, but frame it as "making your case stronger" not "suing them"\n'
      + '- Frame it as: "You\'re not being unreasonable — here\'s how to advocate effectively"\n';
  } else if (toneLevel === 'adversarial') {
    tone += 'TONE: ADVERSARIAL (forceful, legally grounded, action-oriented)\n'
      + '- The parent has been formally denied or their rights are being actively violated\n'
      + '- Now IS the time to cite specific statutes, deadlines, and complaint mechanisms\n'
      + '- Use phrases like "they are in violation of," "you have the legal right to," "file a formal complaint"\n'
      + '- Provide exact statute numbers, filing deadlines, and escalation paths\n'
      + '- Include specific complaint mechanisms (4731, CDE, DMHC, fair hearing)\n'
      + '- Draft language should be formal and legally precise\n'
      + '- Frame it as: "You\'ve tried the nice way — here\'s how to enforce your rights"\n';
  }

  return tone;
}

function getBuiltInPrompt_(category, profile, toneLevel, claimContext) {
  var base = 'You are Waypoint\'s AI Navigator — a knowledgeable, empathetic guide for parents of children with disabilities in California. '
    + 'You combine deep knowledge of California disability law with practical, step-by-step guidance. '
    + 'You speak like a trusted friend who happens to be an expert advocate.\n\n'
    + 'IMPORTANT: You know the law deeply, but you don\'t lead with it. Most parents are not in a fight — they\'re just trying to figure out a complicated system. '
    + 'Match your tone to their situation. Start helpful, only get legal when the situation calls for it.\n\n'
    + '#1 RULE — ANSWER WHAT THEY ASKED:\n'
    + 'Always address the parent\'s specific question or request FIRST before offering additional guidance. '
    + 'If they ask you to draft an email, your primary job is to set up that draft (set offer_to_draft and draft_type). '
    + 'If they ask about a specific process, explain that process — don\'t redirect to an IEP meeting or another action unless they asked. '
    + 'If they ask for information, give them the information. '
    + 'You can always suggest next steps AFTER answering their question, but never let suggestions overshadow or replace the direct answer. '
    + 'The parent is the expert on their own situation — respect their request and deliver what they asked for.\n\n'
    + 'CLARIFYING QUESTIONS RULE — THIS IS MANDATORY:\n'
    + 'ALWAYS include a clarifying question in EVERY response, regardless of tone level. '
    + 'Good follow-up questions show the parent you are listening and help you give better advice. Examples:\n'
    + '- Collaborative: "Can you tell me a bit more about your child\'s current services?" or "Have you already started the intake process?"\n'
    + '- Assertive: "Have you already tried reaching out by phone or email? What response did you get?"\n'
    + '- Adversarial: "Do you have the denial in writing? When was it dated?"\n'
    + '- Informational: "Would you like me to go deeper on any of these steps?" or "Is there a specific part of this process you are most worried about?"\n'
    + 'The clarifying question should feel like a natural follow-up, not a gate that blocks your advice. '
    + 'Still provide your full answer AND the clarifying question — the question helps refine follow-up guidance.\n\n'
    + 'SPECIFICITY RULE:\n'
    + 'Be as specific as possible using the family\'s profile. If you know their Regional Center, name it. '
    + 'If they have a service coordinator, suggest emailing that person directly. '
    + 'Give exact steps ("email your SC at [RC name] with the subject line...") rather than generic advice ("contact your Regional Center"). '
    + 'When relevant, suggest the parent check their specific RC\'s website for local forms and processes.\n\n'
    + 'PROACTIVE OFFERS RULE:\n'
    + 'At the end of your response, proactively offer to help with the next logical step. '
    + 'If the parent might need to send an email or letter, set offer_to_draft. '
    + 'If they might benefit from more resources, mention it in your answer. '
    + 'Don\'t wait for them to ask — anticipate what they\'ll need next.\n\n';

  var profileContext = '';
  if (profile && profile.childName) {
    profileContext = 'FAMILY CONTEXT:\n'
      + '- Child: ' + (profile.childName || 'Not specified') + '\n'
      + '- Age range: ' + (profile.age || 'Not specified') + '\n'
      + '- Diagnosis: ' + (profile.diagnosis || 'Not specified') + '\n'
      + '- Regional Center status: ' + (profile.rcStatus || 'Unknown') + '\n'
      + '- IEP status: ' + (profile.iepStatus || 'Unknown') + '\n'
      + '- Insurance: ' + (profile.insurance || 'Unknown') + '\n'
      + '- Regional Center: ' + (profile.regionalCenter || 'Not determined') + '\n\n';
  }

  var categoryPrompts = {
    'regional-center': base
      + 'You specialize in California Regional Centers and the Lanterman Act.\n\n'
      + 'YOUR KNOWLEDGE (use as needed based on tone level — don\'t dump all of this on every answer):\n'
      + '- The Lanterman Act (W&I Code §4500+) guarantees services to persons with developmental disabilities\n'
      + '- RC must complete intake assessment within 120 days (§4642)\n'
      + '- The IPP is the governing document for all RC services (§4646)\n'
      + '- Fair hearing rights (§4710.5), Aid Paid Pending within 10 days\n'
      + '- Self-Determination Program, POS standards, reimbursement processes\n'
      + '- Each of CA\'s 21 Regional Centers has its own local processes and culture\n\n'
      + 'REIMBURSEMENT NUANCES:\n'
      + '- Pre-authorized services: straightforward paperwork submission with receipts and documentation. Payment delays are usually processing issues, not adversarial — stay collaborative and suggest a polite follow-up email to the service coordinator first.\n'
      + '- IMPORTANT: If a parent mentions a reimbursement delay, ASK whether this is for a pre-authorized service or a new/unauthorized claim. This changes the entire approach.\n'
      + '- Non-pre-authorized claims: much harder — parent needs to show medical necessity, explain why they couldn\'t wait for authorization, and may face denial\n'
      + '- Remember that RC service coordinators often manage 60+ cases — delays are often about workload, not bad faith. Assume good intent first.\n'
      + '- Vendor vs. non-vendor services have different reimbursement paths\n'
      + '- Each RC may have different forms and submission processes\n\n'
      + profileContext,

    'iep': base
      + 'You specialize in IEP and school-based services under IDEA.\n\n'
      + 'YOUR KNOWLEDGE (use as needed based on tone level):\n'
      + '- FAPE is a legal right; parents are equal IEP team members\n'
      + '- Prior Written Notice required for any proposed change or refusal\n'
      + '- Right to IEE at public expense, evaluation timelines (15/60/30 days)\n'
      + '- SB 483, recording rights (Ed Code §56341.1)\n'
      + '- Dispute options: mediation, due process, CDE compliance complaint\n\n'
      + 'WHEN ANSWERING:\n'
      + '- For routine IEP prep: focus on practical preparation, questions to ask, what to bring\n'
      + '- For concerns about services: help them articulate what they want and how to ask\n'
      + '- For disputes: then bring in procedural safeguards and legal citations\n'
      + '- Suggest taking the IEP home to review before signing (always good advice, not a legal threat)\n\n'
      + profileContext,

    'benefits': base
      + 'You specialize in disability benefits and funding programs.\n\n'
      + 'YOUR KNOWLEDGE (use as needed based on tone level):\n'
      + '- Funding waterfall: private insurance → Medi-Cal → CCS → Regional Center (payer of last resort)\n'
      + '- SSI: ~$943/month in CA, auto-enrolls in Medi-Cal\n'
      + '- IHSS: parents CAN be paid providers; protective supervision available\n'
      + '- CalABLE: save up to $100K without affecting SSI\n'
      + '- EPSDT: Medi-Cal covers all medically necessary services for children under 21\n'
      + '- RC reimbursements per POS standards\n\n'
      + 'WHEN ANSWERING:\n'
      + '- Identify programs the family may qualify for\n'
      + '- Explain application processes step by step in plain language\n'
      + '- Flag benefit interactions (e.g., SSI + CalABLE)\n'
      + '- Only cite statutes if the family is being denied something they qualify for\n\n'
      + profileContext,

    'insurance': base
      + 'You specialize in health insurance for disability services.\n\n'
      + 'YOUR KNOWLEDGE (use as needed based on tone level):\n'
      + '- SB 946 mandates ABA coverage for autism — no dollar caps\n'
      + '- DMHC overturns ~60% of denials through IMR\n'
      + '- Timely access standards, out-of-network exceptions\n'
      + '- Mental health parity, expedited IMR for urgent cases\n\n'
      + 'WHEN ANSWERING:\n'
      + '- For coverage questions: explain what\'s typically covered and how to verify with their plan\n'
      + '- For pre-authorization help: walk through the process collaboratively\n'
      + '- For denials: THEN bring in appeal rights, IMR, and specific legal citations\n'
      + '- Always distinguish between: "How do I get this covered?" (collaborative) vs. "They denied me" (adversarial)\n\n'
      + profileContext,

    'rights': base
      + 'You specialize in disability rights, hearings, and complaints.\n\n'
      + 'YOUR KNOWLEDGE:\n'
      + '- Fair Hearing for RC: 60 days to request, ALJ hearing within 50 days\n'
      + '- Aid Paid Pending: file within 10 days to keep services during appeal\n'
      + '- 4731 Complaint: RC director investigates within 20 working days\n'
      + '- CDE Compliance Complaint: findings within 60 days\n'
      + '- Due process hearing under IDEA: 2-year statute of limitations\n'
      + '- Disability Rights CA: 1-800-776-5746\n\n'
      + 'NOTE: If someone is asking about rights, they\'re usually already in an assertive or adversarial situation. '
      + 'Match the energy — but still check whether they\'re asking informational ("what are my rights?") vs. '
      + 'action-oriented ("how do I file a complaint?"). The former gets education, the latter gets procedure.\n\n'
      + profileContext,

    'transitions': base
      + 'You specialize in transition planning for teens and young adults.\n\n'
      + 'YOUR KNOWLEDGE (use as needed based on tone level):\n'
      + '- IEP transition planning starts at age 16\n'
      + '- DOR: apply at 15-16, can fund college/trade school\n'
      + '- Conservatorship vs. limited conservatorship vs. supported decision-making\n'
      + '- RC services continue into adulthood (Lanterman is lifelong)\n'
      + '- CalABLE accounts for financial planning\n\n'
      + 'WHEN ANSWERING:\n'
      + '- Focus on practical planning steps, not legal complexity\n'
      + '- Coordinate across agencies (school, RC, DOR) in plain language\n'
      + '- Only cite statutes if there\'s a dispute about transition services\n\n'
      + profileContext,

    'navigation': base
      + 'You provide general guidance on navigating California\'s disability service systems.\n\n'
      + 'KEY SYSTEMS TO KNOW:\n'
      + '- Regional Center (21 in CA) — Lanterman Act services\n'
      + '- School District — IDEA/IEP services\n'
      + '- Insurance — private + Medi-Cal coverage\n'
      + '- SSI/IHSS — federal/state cash benefits\n'
      + '- DOR — vocational rehabilitation\n\n'
      + 'WHEN ANSWERING:\n'
      + '- Help parents understand which system to engage first\n'
      + '- Keep it simple — one or two next steps, not five systems at once\n'
      + '- Use everyday language, not legal jargon\n'
      + '- Save statute citations for when they actually need to know their rights\n\n'
      + 'SPECIAL: NEW DIAGNOSIS SITUATIONS\n'
      + 'If a parent just received a diagnosis or is at the very beginning of their journey, lead with emotional support. '
      + 'Acknowledge this is a big moment — they may feel overwhelmed, scared, or uncertain. '
      + 'Validate that it\'s normal to feel that way and that they\'re already doing the right thing by seeking help. '
      + 'Then give them ONE clear first step (usually: call your local Regional Center). '
      + 'Also mention: parent support groups, local Family Resource Centers, and online communities where they can connect with other parents who\'ve been through the same thing. '
      + 'Don\'t flood them with five systems at once — just the first step and emotional grounding.\n\n'
      + profileContext,
  };

  var prompt = categoryPrompts[category] || categoryPrompts['navigation'];
  prompt += getToneGuidance_(toneLevel, claimContext);
  return prompt;
}

// ═══════════════════════════════════════════════════════
// AI ENGINE — Main Pipeline: askWaypoint()
// ═══════════════════════════════════════════════════════

function askWaypoint(question, userProfile) {
  try {
    // 1. Classify the question
    var classification = classifyQuestion_(question);

    // 2. Retrieve relevant knowledge
    var context = getRelevantKnowledge_(question, classification.category);

    // 3. Get category-specific system prompt (with tone calibration)
    var systemPrompt = getCategoryPrompt_(classification.category, userProfile, classification.tone_level, classification.claim_context);

    // 4. Build the generation prompt with context + response format
    var fullPrompt = systemPrompt
      + '\n\nRESPONSE FORMAT — CRITICAL RULES:\n'
      + '1. Your ENTIRE response must be a single JSON object. Nothing before it. Nothing after it.\n'
      + '2. Do NOT include markdown, code fences, commentary, or any text outside the JSON.\n'
      + '3. Do NOT draft the actual letter/email in your response — just describe what you CAN draft in "offer_to_draft".\n'
      + '   The user will click a button to generate the draft separately.\n'
      + '4. If the user asks you to draft something, set offer_to_draft and draft_type, but do NOT include the draft text.\n\n'
      + 'JSON Schema:\n'
      + '{\n'
      + '  "empathy": "1-2 sentence validation of what the parent is feeling or facing. For new diagnoses or overwhelming situations, be warmer and more supportive.",\n'
      + '  "clarifying_question": "REQUIRED — always include ONE natural follow-up question. For assertive/adversarial: ask what steps they have taken so far. For collaborative: ask what specific aspect they want to explore further. For informational: ask if they want more detail on any part. Make it feel conversational, like a friend checking in.",\n'
      + '  "answer": "ANSWER WHAT THEY ASKED FIRST. If they asked for a draft, acknowledge that and set offer_to_draft. If they asked about a process, explain that process. Then add 2-4 clear sentences of guidance using everyday language. Be specific — name their RC if known, suggest exact actions. Match the tone level. Do NOT redirect to something they did not ask about (e.g., do not suggest an IEP meeting if they asked about reimbursement).",\n'
      + '  "action_steps": [\n'
      + '    {\n'
      + '      "step": 1,\n'
      + '      "action": "Specific action to take",\n'
      + '      "who": "Who to contact or what to do",\n'
      + '      "timeline": "When to do this",\n'
      + '      "script": "Exact words to say — match the tone! Collaborative scripts are friendly and cooperative. Assertive scripts are firm and professional. Adversarial scripts cite specific rights."\n'
      + '    }\n'
      + '  ],\n'
      + '  "rights_reminder": "One key legal right IF relevant to this situation. For collaborative tone, use null unless there is a genuinely useful right to mention. For assertive/adversarial, include the specific right with citation.",\n'
      + '  "watch_out": "One important warning or common pitfall — practical advice, not a legal threat",\n'
      + '  "offer_to_draft": "Proactively offer to draft something if the situation calls for it — don\'t wait for them to ask. Examples: email to SC, appeal letter, IEP meeting request. Be specific about what you\'d draft. Null only if no written communication would help.",\n'
      + '  "draft_type": "appeal_letter|iep_email|rc_request|iep_prep|complaint|general (or null)",\n'
      + '  "sources": ["Statute or code section — for collaborative tone keep this minimal or empty; for adversarial include all relevant citations"]\n'
      + '}\n\n'
      + 'REMEMBER: Output ONLY the JSON object. No text before or after. No draft content. Just the JSON.\n';

    if (context) {
      fullPrompt += '\n\nRELEVANT KNOWLEDGE BASE CONTEXT:\n' + context + '\n';
    }

    // 5. Generate response
    var responseText = callClaude_(fullPrompt, question);

    // 6. Extract JSON robustly — handle code fences, leading/trailing text
    var response = extractJson_(responseText);

    // 7. Log the interaction
    logAIInteraction_(
      userProfile ? userProfile.userId : null,
      question,
      classification.category,
      classification.urgency,
      classification.emotional_state,
      response,
      context ? 'KB context used' : 'No KB context'
    );

    // 8. Return combined result
    return {
      success: true,
      category: classification.category,
      urgency: classification.urgency,
      emotional_state: classification.emotional_state,
      needs_action: classification.needs_action,
      tone_level: classification.tone_level,
      empathy: response.empathy || '',
      clarifying_question: response.clarifying_question || null,
      answer: response.answer || '',
      action_steps: response.action_steps || [],
      rights_reminder: response.rights_reminder || null,
      watch_out: response.watch_out || null,
      offer_to_draft: response.offer_to_draft || null,
      draft_type: response.draft_type || null,
      sources: response.sources || []
    };

  } catch (e) {
    Logger.log('askWaypoint error: ' + e.toString());
    return {
      success: false,
      error: e.message || e.toString(),
      category: 'navigation',
      urgency: 'low'
    };
  }
}

// ═══════════════════════════════════════════════════════
// AI ENGINE — Draft Generation
// ═══════════════════════════════════════════════════════

function generateDraft(draftType, userProfile, originalQuestion, aiResponse) {
  try {
    // Determine tone from the AI response context
    var toneLevel = (aiResponse && aiResponse.tone_level) || 'assertive';

    var draftPrompts = {
      'appeal_letter': 'Draft a formal insurance appeal letter for a parent of a child with disabilities in California. '
        + 'Include: today\'s date, policy/member info placeholders, the denial reason being appealed, '
        + 'a strong medical necessity argument citing specific functional limitations, '
        + 'legal citations (SB 946 if autism-related, Mental Health Parity Act, EPSDT if Medi-Cal), '
        + 'and a clear request for reversal. Address to the insurance company appeals department. '
        + 'Tone: firm, professional, factual — this IS an adversarial situation so legal citations are appropriate. '
        + 'Use [BRACKETS] for information the parent needs to fill in.',

      'iep_email': toneLevel === 'collaborative'
        ? 'Draft a professional, friendly email to a school district special education department. '
          + 'The parent is working cooperatively with the school — keep the tone warm and collaborative. '
          + 'Make specific requests clearly but without citing legal codes or implying threats. '
          + 'Frame requests positively: "We\'d love to discuss..." not "We demand..." '
          + 'Use [BRACKETS] for information the parent needs to fill in.'
        : 'Draft a professional email to a school district special education department. '
          + 'Be firm but professional. Reference IDEA timelines and the parent\'s right to Prior Written Notice. '
          + (toneLevel === 'adversarial' ? 'Cite specific Education Code sections. Make clear the parent is aware of their legal rights and expects compliance. ' : 'Mention relevant timelines without being threatening. ')
          + 'Use [BRACKETS] for information the parent needs to fill in.',

      'rc_request': toneLevel === 'collaborative'
        ? 'Draft a polite, professional request letter to the family\'s Regional Center Service Coordinator. '
          + 'The parent is asking for a service through normal channels — this is a collaborative request, not a demand. '
          + 'Be specific about the service, the child\'s needs, and what the family is hoping for. '
          + 'Do NOT cite Lanterman Act sections or legal codes — just make a clear, well-supported request. '
          + 'Frame it as: "We believe [child] would benefit from..." not "We are entitled to..." '
          + 'Use [BRACKETS] for information the parent needs to fill in.'
        : toneLevel === 'assertive'
        ? 'Draft a firm but professional request letter to the family\'s Regional Center. '
          + 'The parent has been experiencing delays or pushback. Be specific about the service requested and the assessed need. '
          + 'Mention that services are based on individual need and request a written response within a reasonable timeline. '
          + 'You may reference the IPP process but avoid heavy legal citations unless directly relevant. '
          + 'Use [BRACKETS] for information the parent needs to fill in.'
        : 'Draft a formal request letter to the family\'s Regional Center. '
          + 'The parent has been denied or is facing significant resistance. '
          + 'Reference the Lanterman Act entitlement principle and include relevant W&I Code sections. '
          + 'Be specific about the service, the assessed need, and the timeline for response. '
          + 'Include fair hearing rights if the request is denied. '
          + 'Use [BRACKETS] for information the parent needs to fill in.',

      'iep_prep': 'Create a comprehensive IEP meeting preparation document. Include: '
        + '1) Agenda items to raise, 2) Specific questions to ask the team, '
        + '3) Practical reminders (recording option, taking IEP home to review, bringing an advocate or support person), '
        + '4) Suggested goals or areas to discuss based on the child\'s profile, '
        + '5) Things to watch for during the meeting. '
        + 'Keep the tone practical and empowering — this is about preparation, not confrontation. '
        + 'Format as a practical checklist the parent can print and bring.',

      'complaint': 'Draft a formal complaint document. Determine the correct mechanism '
        + '(4731 complaint for RC rights violations, CDE compliance complaint for school violations, '
        + 'DMHC complaint for insurance issues) based on the context. '
        + 'Include: specific rights or laws violated, dates and incidents, requested resolution, '
        + 'and the correct filing address/contact. '
        + 'This IS an adversarial document — legal precision and specific citations are appropriate here. '
        + 'Use [BRACKETS] for information the parent needs to fill in.',

      'general': toneLevel === 'collaborative'
        ? 'Draft a clear, friendly letter or document based on the context provided. '
          + 'Keep it professional but warm. Focus on practical communication, not legal positioning. '
          + 'Only cite California laws if directly relevant and helpful, not to intimidate. '
          + 'Use [BRACKETS] for information the parent needs to fill in.'
        : 'Draft a professional letter or document based on the context provided. '
          + 'Be specific and cite relevant California laws as appropriate for the level of conflict. '
          + 'Include clear action items. '
          + 'Use [BRACKETS] for information the parent needs to fill in.'
    };

    var systemPrompt = draftPrompts[draftType] || draftPrompts['general'];
    systemPrompt += '\n\nReturn the complete draft as plain text (not JSON). Use clear formatting with line breaks.';

    var userMsg = 'FAMILY CONTEXT:\n'
      + 'Child: ' + (userProfile.childName || '[Child Name]') + '\n'
      + 'Age range: ' + (userProfile.age || 'Not specified') + '\n'
      + 'Diagnosis: ' + (userProfile.diagnosis || 'Not specified') + '\n'
      + 'Regional Center: ' + (userProfile.regionalCenter || 'Not specified') + '\n'
      + 'School District: ' + (userProfile.schoolDistrict || 'Not specified') + '\n'
      + 'Insurance: ' + (userProfile.insurance || 'Not specified') + '\n\n'
      + 'ORIGINAL QUESTION:\n' + (originalQuestion || 'Not provided') + '\n\n'
      + 'AI GUIDANCE PROVIDED:\n' + JSON.stringify(aiResponse || {});

    var draft = callClaude_(systemPrompt, userMsg);

    // Log the draft
    var sheet = getOrCreateSheet_('DraftLog', [
      'timestamp', 'userId', 'draftType', 'originalQuestion', 'draft', 'status'
    ]);
    sheet.appendRow([
      new Date().toISOString(),
      userProfile.userId || '',
      draftType,
      originalQuestion || '',
      draft.substring(0, 5000), // truncate for sheet storage
      'generated'
    ]);

    return { success: true, draft: draft, draftType: draftType };

  } catch (e) {
    Logger.log('generateDraft error: ' + e.toString());
    return { success: false, error: e.message || e.toString() };
  }
}

// ═══════════════════════════════════════════════════════
// AI ENGINE — Interaction Logging
// ═══════════════════════════════════════════════════════

function logAIInteraction_(userId, question, category, urgency, emotionalState, response, contextNote) {
  try {
    var sheet = getOrCreateSheet_('InteractionLog', [
      'timestamp', 'userId', 'question', 'category', 'urgency',
      'emotionalState', 'response', 'contextUsed', 'feedback', 'feedbackNote'
    ]);
    sheet.appendRow([
      new Date().toISOString(),
      userId || '',
      question,
      category,
      urgency,
      emotionalState || '',
      JSON.stringify(response).substring(0, 5000),
      contextNote || '',
      '', // feedback filled later
      ''  // feedbackNote filled later
    ]);
  } catch (e) {
    Logger.log('logAIInteraction_ error: ' + e.toString());
  }
}

function submitFeedback(question, feedback, feedbackNote) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('InteractionLog');
    if (!sheet || sheet.getLastRow() <= 1) return { success: false };

    // Find the most recent row matching this question
    var data = sheet.getDataRange().getValues();
    var qCol = data[0].indexOf('question');
    var fbCol = data[0].indexOf('feedback');
    var fnCol = data[0].indexOf('feedbackNote');

    for (var i = data.length - 1; i >= 1; i--) {
      if (data[i][qCol] === question) {
        sheet.getRange(i + 1, fbCol + 1).setValue(feedback);
        if (feedbackNote) sheet.getRange(i + 1, fnCol + 1).setValue(feedbackNote);
        return { success: true };
      }
    }
    return { success: false };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ═══════════════════════════════════════════════════════
// AI ENGINE — Email Analysis (AI-powered upgrade)
// ═══════════════════════════════════════════════════════

function analyzeEmailAI(emailText, userProfile) {
  try {
    var systemPrompt = 'You are Waypoint\'s Email Analyzer — an expert in California disability law who reviews emails '
      + 'from Regional Centers, school districts, and insurance companies on behalf of parents.\n\n'
      + 'Analyze the email and return ONLY valid JSON:\n'
      + '{\n'
      + '  "summary": "1-2 sentence plain-English summary of what this email is saying",\n'
      + '  "sender_type": "regional_center|school|insurance|government|unknown",\n'
      + '  "tone_assessment": "How the sender\'s tone reads (cooperative, bureaucratic, dismissive, threatening, etc.)",\n'
      + '  "red_flags": [\n'
      + '    { "flag": "Description of the issue", "severity": "high|medium|low", "law_cited": "Relevant statute" }\n'
      + '  ],\n'
      + '  "action_items": [\n'
      + '    { "action": "What to do", "deadline": "When", "urgency": "high|medium|low" }\n'
      + '  ],\n'
      + '  "rights_at_stake": ["List of specific rights that may be affected"],\n'
      + '  "suggested_response": "Brief description of how to respond",\n'
      + '  "offer_to_draft": "What Waypoint can draft in response (or null)"\n'
      + '}';

    var responseText = callClaude_(systemPrompt, 'EMAIL TO ANALYZE:\n\n' + emailText);
    var result = extractJson_(responseText);

    return { success: true, analysis: result };

  } catch (e) {
    return { success: false, error: e.message || e.toString() };
  }
}

// ═══════════════════════════════════════════════════════
// KNOWLEDGE BASE — Seed initial content
// ═══════════════════════════════════════════════════════

function seedKnowledgeBase() {
  var sheet = getOrCreateSheet_('KnowledgeBase', [
    'id', 'category', 'subcategory', 'title', 'content', 'source', 'active', 'createdAt'
  ]);

  // Only seed if empty
  if (sheet.getLastRow() > 1) return { success: true, message: 'KB already has data' };

  var now = new Date().toISOString();
  var entries = [
    // Regional Center (5 articles)
    ['rc-001', 'regional-center', 'lanterman-act', 'Lanterman Act Key Sections & Rights',
      'The Lanterman Developmental Disabilities Services Act (Welfare & Institutions Code §4500-4846) is the foundational California law guaranteeing services to people with developmental disabilities. Unlike most government programs, the Lanterman Act creates an entitlement — meaning services are based on individual need, not budget availability. Regional Centers cannot deny services simply because they lack funding.\n\nWho Qualifies\nUnder §4512, a developmental disability means a disability that originates before age 18, is expected to continue indefinitely, and constitutes a substantial disability. Qualifying conditions include intellectual disability, cerebral palsy, epilepsy, autism, and conditions requiring similar services. The key phrase is "conditions requiring treatment similar to that required for persons with intellectual disability" — this is how many children with rare diagnoses qualify.\n\nCore Rights Under the Lanterman Act\nSection 4502 establishes that persons with developmental disabilities have the same legal rights as other citizens, plus the right to treatment and habilitation services. Section 4501 declares it state policy that services be available to all eligible individuals regardless of age, degree of disability, or income. Section 4646 mandates the Individual Program Plan (IPP) as the vehicle for delivering services. Section 4648 requires Regional Centers to find and fund services needed to implement the IPP.\n\nPayer of Last Resort\nA critical concept: Regional Center is the payer of last resort (§4659). This means RC pays only after all other funding sources (private insurance, Medi-Cal, school district, etc.) have been exhausted. In practice, this means your child may have services funded by multiple agencies simultaneously. However, RC cannot refuse to authorize a service simply because another agency might cover it — RC must ensure the service is provided while pursuing reimbursement from other payers.\n\nWhat to Say to Your Service Coordinator\nIf RC denies a service request, say: "I understand your position, but under Lanterman Act Section 4648, Regional Center is required to find and fund services identified in the IPP. I\'d like this denial in writing with the specific legal basis, and I want to be informed of my fair hearing rights."\n\nCommon Pitfall\nMany families accept verbal denials. RC is required to provide written notice of any denial or reduction of services, including the reason and your right to appeal. Never accept a "no" over the phone without requesting the written Notice of Action.',
      'Lanterman Act W&I Code §4500-4846', 'TRUE', now],

    ['rc-002', 'regional-center', 'intake', 'Intake Process & 120-Day Timeline',
      'When a child is referred to Regional Center, a specific legal timeline kicks in. Understanding these deadlines is critical because they are enforceable rights, not suggestions.\n\nStep-by-Step Intake Process\nStep 1 — Referral: Anyone can refer a child to RC (parent, doctor, teacher, etc.). Call your local RC and request an intake appointment. There are 21 Regional Centers in California, each serving a specific geographic area. Find yours at dds.ca.gov. Step 2 — Initial Contact: RC must make initial contact within 15 working days of receiving the referral (§4642). This is usually a phone call to schedule the intake assessment. Step 3 — Intake Assessment: A multidisciplinary team evaluates your child. This may include psychological testing, developmental assessments, medical review, and parent interviews. You can request assessments in your preferred language. Step 4 — Eligibility Determination: RC must determine eligibility within 120 days of the initial referral (§4643). If your child is under age 3, they may qualify for Early Start services while the full evaluation is pending. Step 5 — IPP Meeting: If eligible, RC must schedule an Individual Program Plan (IPP) meeting within 60 days of the eligibility determination. This is where you and the RC team decide what services your child will receive.\n\nWhat to Bring to Intake\nBring all existing evaluations (school, private, medical), your child\'s most recent IEP if they have one, medical records documenting the diagnosis, and a written list of your concerns and what services you believe your child needs. The more documentation you bring, the stronger your case for eligibility and services.\n\nIf RC Misses the 120-Day Deadline\nSay: "Under W&I Code §4643, the eligibility determination was due by [date]. I\'m requesting an immediate determination and would like to understand why the timeline was not met. If I need to file a complaint, please provide me with the process." You can file a Section 4731 complaint with the RC director if timelines are consistently missed.\n\nEarly Start Exception\nChildren under age 3 with an established risk condition or developmental delay may begin receiving Early Start services before the full eligibility determination is complete. This is a critical pathway — do not wait for full RC eligibility if your child is under 3.',
      'Lanterman Act W&I Code §4642-4643', 'TRUE', now],

    ['rc-003', 'regional-center', 'ipp', 'IPP Rights and Process',
      'The Individual Program Plan (IPP) is the single most important document in your relationship with Regional Center. It is a legally binding agreement that specifies every service RC will provide or fund for your child. Think of it as a contract — if a service is in the IPP, RC must deliver it.\n\nYour Rights in the IPP Process\nUnder §4646, you are an equal member of the IPP team. You have the right to: participate in all planning meetings, invite anyone you choose to attend (advocate, family member, therapist), receive the IPP document in your preferred language, request changes to the IPP at any time, and disagree with the team\'s recommendations without losing existing services.\n\nHow to Prepare for an IPP Meeting\nBefore the meeting, write down every service your child needs with specific details. Instead of writing "RC will provide therapy," write "RC will fund 3 hours per week of in-home ABA therapy with a BCBA-supervised provider, starting within 30 days." Specificity is your most powerful tool. Bring documentation supporting each request: evaluations, doctor recommendations, school reports, or letters from therapists.\n\nRequesting an IPP Meeting\nYou can request an IPP meeting at any time — you do not have to wait for the annual review. RC must hold the meeting within 30 days of your request. For emergencies (such as losing a provider or a sudden regression), request an emergency IPP, which must be held within 7 days. Always make requests in writing (email is fine) and keep a copy.\n\nIf You Disagree with the IPP\nNever sign an IPP you disagree with. Signing indicates agreement. Instead, write on the IPP: "I do not agree with [specific item]. I am requesting a fair hearing." You can sign for the parts you do agree with and note disagreement on specific items. Under §4646, you can also request mediation through the RC before pursuing a fair hearing.\n\nScript for Requesting a New Service\n"I\'d like to add [specific service] to [child\'s name]\'s IPP. Here is the supporting documentation from [doctor/therapist/evaluation]. Under the Lanterman Act, services are based on individual need as identified in the IPP. Can we schedule an IPP amendment meeting within 30 days?"',
      'Lanterman Act W&I Code §4646, §4646.5', 'TRUE', now],

    ['rc-004', 'regional-center', 'pos', 'Purchase of Service (POS) Standards',
      'Purchase of Service (POS) standards govern what Regional Center will pay for and how much. Each of California\'s 21 Regional Centers publishes its own POS standards, which means the services available and rates paid can vary significantly from one RC to another.\n\nWhat POS Covers\nCommon services funded through POS include: Applied Behavior Analysis (ABA) therapy, speech and language therapy, occupational therapy, respite care (in-home and out-of-home), day programs and activity centers, supported living services, transportation, adaptive equipment, camp and social recreation, parent training, and independent living skills training. This is not an exhaustive list — if a service is identified as needed in the IPP, RC should fund it regardless of whether it appears in the standard POS list.\n\nHow to Find Your RC\'s POS Standards\nEvery RC is required to publish its POS standards and make them available to families. Ask your service coordinator for a copy, or check your RC\'s website. You can also request the data from the Department of Developmental Services (DDS) at dds.ca.gov. POS data is public and must be provided in a format that allows comparison across demographic groups.\n\nPOS Disparity Data\nA critical issue: POS expenditure data consistently shows significant racial and ethnic disparities in RC spending. White families receive approximately twice the per-capita spending compared to Latino families across most Regional Centers. DDS publishes annual POS expenditure data by RC, ethnicity, age, and residence type. Families can use this data to advocate for equitable services. If your family is receiving significantly fewer services than the RC average for your child\'s age and diagnosis, cite the POS data in your advocacy.\n\nWhen RC Says "We Don\'t Fund That"\nIf your service coordinator says a service is not covered, ask: "Can you show me the specific POS standard or DDS directive that excludes this service? Under §4648, Regional Center is required to purchase services identified in the IPP. I\'d like the denial in writing with the legal basis." Often, services that are verbally described as "not covered" are actually available but rarely requested.\n\nVendor vs. Voucher\nRC can provide services through vendored providers (agencies on RC\'s approved list) or through vouchers that allow you to choose your own provider. If you cannot find a vendored provider or face long waitlists, request a voucher arrangement. RC may also approve an out-of-network provider if no vendored provider is available within a reasonable distance or timeframe.',
      'Lanterman Act POS Standards, DDS Directives', 'TRUE', now],

    ['rc-005', 'regional-center', 'fair-hearing', 'Fair Hearing Procedures',
      'A fair hearing is your formal right to challenge any Regional Center decision you disagree with — including denials, reductions, or terminations of services. Fair hearings are conducted by an Administrative Law Judge (ALJ) through the Office of Administrative Hearings (OAH) and are a powerful tool for families.\n\nWhen to File a Fair Hearing\nYou can request a fair hearing whenever RC: denies a service you requested, reduces an existing service, terminates a service, fails to implement an IPP, or refuses to hold an IPP meeting. You must file within 60 days of receiving the Notice of Action (the written denial). However, there is a critical exception: if you file within 10 days, you trigger Aid Paid Pending.\n\nAid Paid Pending\nThis is the most important concept in RC appeals. If you file your fair hearing request within 10 calendar days of the Notice of Action, RC must continue providing the service at its current level until the hearing decision is issued. This is called "Aid Paid Pending" and it prevents RC from cutting services while you fight the decision. Missing the 10-day window means the reduction or termination takes effect during the appeal.\n\nThe Fair Hearing Process\nStep 1: Request the hearing in writing to OAH and send a copy to your RC. Include your name, child\'s name, RC case number, and what decision you are appealing. Step 2: RC must offer an informal meeting to try to resolve the dispute before the hearing. Step 3: The hearing is scheduled within 50 days of your request. Step 4: At the hearing, you present your case to the ALJ. You can bring witnesses, documents, and an advocate or attorney. Step 5: The ALJ issues a written decision within 80 days of your request. Step 6: If you win, RC must implement the decision within 5 working days.\n\nPreparing for the Hearing\nGather: the Notice of Action, your child\'s IPP, all relevant evaluations and assessments, letters from providers supporting the service, and the Lanterman Act sections that support your position. Free legal help is available from Disability Rights California (1-800-776-5746) and local Family Resource Centers.\n\nScript for Requesting a Fair Hearing\n"I received the Notice of Action dated [date] regarding [service]. I disagree with this decision and am requesting a fair hearing under W&I Code §4710.5. I am filing within 10 days and request that Aid Paid Pending be applied to maintain current services during the appeal process. Please confirm receipt of this request."',
      'Lanterman Act W&I Code §4710.5-4716', 'TRUE', now],

    // IEP (5 articles)
    ['iep-001', 'iep', 'idea-fape', 'IDEA Procedural Safeguards & FAPE',
      'The Individuals with Disabilities Education Act (IDEA) is the federal law that guarantees every child with a disability the right to a Free Appropriate Public Education (FAPE). FAPE is not optional — it is a legal entitlement, and school districts must provide it at no cost to families.\n\nWhat FAPE Means in Practice\nFAPE requires that your child receive special education and related services that: are provided at public expense, meet state standards, include an appropriate preschool, elementary, or secondary education, and are provided in conformity with the IEP. The Supreme Court ruled in Endrew F. v. Douglas County (2017) that IEPs must be "reasonably calculated to enable a child to make progress appropriate in light of the child\'s circumstances." This raised the bar from the old "some educational benefit" standard — your child\'s IEP must be designed for meaningful progress.\n\nKey Procedural Safeguards\nIDEA includes extensive procedural protections: Prior Written Notice (PWN) — the school must notify you in writing before proposing or refusing any change to your child\'s identification, evaluation, placement, or services. Informed Consent — the school cannot evaluate or place your child without your written consent. Access to Records — you have the right to inspect and copy all educational records. Parent Participation — you are an equal member of the IEP team and must be included in all decisions. Independent Educational Evaluation (IEE) — if you disagree with the school\'s evaluation, you can request an IEE at public expense.\n\nEvaluation Timelines\nWhen you request an evaluation, the school has 15 calendar days to respond with an assessment plan. Once you consent to the plan, the school has 60 calendar days to complete the evaluation. The IEP meeting must be held within 30 calendar days of the evaluation being completed. These timelines are legally enforceable — if the school misses them, document the violation and reference it in any dispute.\n\nWhat to Say If the School Resists\n"Under IDEA, my child has the right to a Free Appropriate Public Education. I am making a formal request for [evaluation/service/meeting] in writing. Please provide Prior Written Notice if you intend to refuse this request, including the specific reasons and the data you relied upon."',
      'IDEA §300.1-300.818, 20 U.S.C. §1400', 'TRUE', now],

    ['iep-002', 'iep', 'ca-ed-code', 'California Education Code & SB 483',
      'California\'s Education Code provides additional protections beyond federal IDEA. In several important areas, California law gives families stronger rights than federal law alone.\n\nKey California-Specific Protections\nAssessment Plan Timelines: Under CA Ed Code §56321, the school must provide a proposed assessment plan within 15 calendar days of receiving a referral for evaluation — this is stricter than IDEA\'s "reasonable time" standard. Recording IEP Meetings: CA Ed Code §56341.1 explicitly allows parents to audio-record IEP meetings. You must give 24 hours\' notice, and the school may also record. This is a powerful tool — recordings prevent "he said, she said" disputes. Parent\'s Right to Participate: §56341.1 also requires that IEP meetings be scheduled at a mutually agreed-upon time and place. The school cannot schedule meetings when they know you cannot attend. Stay-Put Rights: When a dispute arises, your child stays in their current placement until the dispute is resolved. This is similar to RC\'s Aid Paid Pending and prevents the school from moving your child while you fight a decision.\n\nSB 483 — IEP Meeting Reforms\nSenate Bill 483 added several important requirements to California IEP law. Schools must provide parents with a copy of the IEP within a reasonable time after the meeting. Schools must include certain required statements in every IEP, including how the child\'s disability affects their involvement in the general curriculum. Schools must document that parents were informed of their procedural safeguards at each meeting. SB 483 also strengthened requirements around transition planning for students aged 16 and older.\n\nCalifornia vs. Federal: Where CA Is Stronger\n15-day assessment plan deadline (federal has no specific timeline for the plan itself). Explicit right to record IEP meetings. Stronger non-public school placement protections. Extended school year (ESY) must be considered for all students with IEPs, not just those who show regression. California also requires that IEP goals be measurable and include specific criteria and timelines for evaluation.\n\nPractical Tip\nAlways cite both IDEA and CA Education Code in your communications. Example: "Under IDEA §300.322 and CA Ed Code §56341.1, I am requesting that the IEP meeting be rescheduled to a time when I can attend. I am also providing 24-hour notice that I will be audio-recording the meeting."',
      'CA Education Code §56000-56865, SB 483', 'TRUE', now],

    ['iep-003', 'iep', 'meeting-process', 'IEP Meeting Process & Parent Preparation',
      'The IEP meeting is where decisions about your child\'s education are made. How you prepare for and participate in this meeting directly affects the services your child receives. You are an equal member of the IEP team — not a guest.\n\nBefore the Meeting\nRequest all evaluation reports and draft IEP documents at least 5 days before the meeting so you can review them. Write down your top 3-5 concerns and the specific services or goals you want to discuss. Gather supporting documentation: private evaluations, therapist letters, medical reports, and work samples showing your child\'s current performance. Invite someone for support — an advocate, family member, or therapist who knows your child. Under IDEA §300.321, you have the right to bring anyone with "knowledge or special expertise" about your child.\n\nDuring the Meeting\nTake notes or record the meeting (give 24-hour notice in California). Ask the team to explain any data or terms you don\'t understand — jargon can obscure important details. For every proposed goal, ask: "How will we measure progress? What does success look like? What happens if my child isn\'t making progress by the next review?" If the school proposes something you disagree with, state your disagreement clearly and ask for Prior Written Notice if they refuse your request.\n\nCritical Rule: Never Sign at the Meeting\nYou are never required to sign the IEP on the spot. Say: "I appreciate the team\'s work. I\'d like to take the IEP home to review before signing. I\'ll provide my response within [timeframe]." This gives you time to consult with advocates, review the details, and ensure nothing was missed. Signing at the meeting under pressure is the single most common mistake parents make.\n\nQuestions to Ask at Every IEP Meeting\nWhat data are you using to support this recommendation? How does this goal align with grade-level standards? What related services (speech, OT, counseling) does my child need to access the curriculum? What is the least restrictive environment for my child? How will you communicate progress to me between meetings? What happens if my child doesn\'t meet these goals?\n\nAfter the Meeting\nSend a follow-up email summarizing what was decided: "Thank you for the IEP meeting on [date]. My understanding of the decisions made is: [list]. Please confirm this is accurate or let me know if I\'ve misunderstood anything." This creates a paper trail that protects you if there are later disagreements about what was agreed upon.',
      'IDEA §300.321-300.328, CA Ed Code §56341', 'TRUE', now],

    ['iep-004', 'iep', 'disputes', 'Dispute Resolution Options',
      'When you disagree with the school district about your child\'s special education, you have several formal options. Understanding which mechanism to use and when is critical for effective advocacy.\n\nOption 1: Mediation\nMediation is a voluntary process where a neutral mediator helps you and the school reach an agreement. It\'s free, typically scheduled within 30 days, and can resolve disputes faster than other options. Agreements reached in mediation are legally binding. Mediation works best when both sides are willing to compromise. Request mediation through your SELPA (Special Education Local Plan Area) or through OAH.\n\nOption 2: Due Process Hearing\nA due process hearing is a formal legal proceeding before an Administrative Law Judge. You file a complaint with OAH specifying what you believe the school did wrong and what remedy you want. The school must respond within 10 days. A resolution session (similar to mediation) is held within 15 days. If not resolved, the hearing occurs within 45 days of the filing. You have a 2-year statute of limitations from the date you knew or should have known about the violation. You can represent yourself or hire an attorney. If you win, the school may be required to reimburse your attorney fees.\n\nOption 3: CDE Compliance Complaint\nFile with the California Department of Education if the school violated a specific IDEA or state law requirement (not for disagreements about what\'s appropriate, but for failures to follow the law). CDE must investigate and issue findings within 60 days. Complaints can cover violations from the past year. CDE can order corrective actions including compensatory services. This is often the best option for procedural violations like missed timelines, failure to provide PWN, or not implementing IEP services.\n\nOption 4: OCR Complaint\nFile with the Office for Civil Rights (U.S. Department of Education) for discrimination claims under Section 504 or ADA. OCR investigates whether the school discriminated based on disability. This is the right mechanism if your child is being excluded, harassed, or treated differently because of their disability.\n\nWhich Option to Choose\nStart with mediation if you believe the school is acting in good faith but you disagree on services. Use a CDE complaint if the school broke a clear procedural rule. Reserve due process for significant disputes about FAPE, placement, or when the school is unwilling to negotiate. You can pursue multiple options simultaneously — a CDE complaint does not prevent you from also filing for due process.',
      'IDEA §300.507-300.516, CA Ed Code §56500-56507', 'TRUE', now],

    ['iep-005', 'iep', 'iee', 'Independent Educational Evaluations (IEE)',
      'An Independent Educational Evaluation (IEE) is an assessment conducted by a qualified examiner who is not employed by the school district. It is one of the most powerful tools available to parents, and the school may be required to pay for it.\n\nWhen to Request an IEE\nYou have the right to request an IEE at public expense whenever you disagree with an evaluation conducted by the school. Common reasons include: you believe the school\'s assessment was incomplete or inaccurate, the school used inappropriate tests, the evaluator did not observe your child in the right settings, or the school\'s findings don\'t match what you see at home and what private providers report.\n\nHow to Request\nPut your request in writing: "I disagree with the school district\'s [type] evaluation of [child\'s name] completed on [date]. Under IDEA §300.502 and CA Ed Code §56329, I am requesting an Independent Educational Evaluation at public expense." You do not need to specify why you disagree — simply stating disagreement is sufficient.\n\nWhat the School Can Do\nThe school has two options: approve the IEE at public expense, or file for due process to prove their evaluation was appropriate. The school cannot simply ignore your request, delay indefinitely, or require you to explain your reasons in detail. If the school files for due process and the ALJ rules the school\'s evaluation was appropriate, you can still get the IEE — you just have to pay for it yourself. However, the IEP team must still consider the results.\n\nChoosing an Evaluator\nThe school may provide criteria for the IEE (such as evaluator qualifications and geographic area), but these criteria must be the same as what the school uses for its own assessments. The school cannot unreasonably restrict your choice. Ask other parents, parent advocacy groups, or Disability Rights California for recommendations of evaluators experienced with your child\'s specific needs.\n\nUsing the IEE Results\nOnce complete, the IEP team must consider the IEE results at the next IEP meeting. "Consider" means the team must review and discuss the findings, though they are not required to follow every recommendation. If the IEE supports additional services, use it as evidence in your IEP advocacy. If the school disagrees with the IEE, ask them to document specifically why they are rejecting the independent evaluator\'s recommendations.\n\nCommon Pitfall\nTiming matters. Request the IEE as soon as possible after receiving the school\'s evaluation. While there is no strict deadline in California, waiting too long can weaken your position. Also, you are generally entitled to one IEE at public expense per school evaluation — not one per year.',
      'IDEA §300.502, CA Ed Code §56329', 'TRUE', now],

    // Benefits (5 articles)
    ['ben-001', 'benefits', 'ssi', 'SSI for Children with Disabilities',
      'Supplemental Security Income (SSI) provides monthly cash payments to children with disabilities from low-income families. In California, the combined federal and state SSI payment for a child is approximately $943 per month (2024 rates). SSI also automatically enrolls your child in Medi-Cal, which covers medical services with no premiums or copays.\n\nEligibility Requirements\nYour child must have a physical or mental condition that results in "marked and severe functional limitations" and is expected to last at least 12 months or result in death. Family income and resources are considered: generally, a family of 4 earning less than roughly $45,000-55,000 annually may qualify, though the calculation is complex and depends on household composition. The resource limit is $2,000 for an individual or $3,000 for a couple (not counting your home or one vehicle). A critical exception for RC clients: "institutional deeming" means only the child\'s income and resources count, not the parents\' — ask your RC service coordinator about this.\n\nApplication Process\nApply at your local Social Security office or call 1-800-772-1213. Bring: your child\'s birth certificate, Social Security number, medical records documenting the disability, school records including IEP, names and contact information for all treating providers, and proof of family income and resources. The process typically takes 3-6 months. If denied, you have 60 days to appeal. SSI denials are overturned on appeal at a high rate — do not accept the first denial without appealing.\n\nThe SSI Benefits Cliff\nBe aware: when a child on SSI turns 18, they are re-evaluated under adult criteria, which are different. However, if they continue to qualify, parental income is no longer counted ("deeming" stops), which often results in qualification even for families who didn\'t qualify under child rules. Plan for the age-18 transition with your RC service coordinator.\n\nProtecting SSI Eligibility\nThe $2,000 resource limit means you must be extremely careful about savings, gifts, and inheritances in your child\'s name. A CalABLE account allows saving up to $100,000 without affecting SSI eligibility. A Special Needs Trust is another option for larger amounts. Never put money directly into an account in your child\'s name without consulting a benefits planner.',
      'Social Security Act Title XVI, SSA POMS', 'TRUE', now],

    ['ben-002', 'benefits', 'ihss', 'IHSS — Parents as Paid Providers',
      'In-Home Supportive Services (IHSS) pays caregivers to help people with disabilities live safely at home. For families of children with disabilities, IHSS is transformative because parents can be paid providers for their own children under 18.\n\nWhat IHSS Covers\nIHSS authorizes hours for specific care tasks: domestic services (housekeeping, meal prep, laundry related to the child\'s disability), personal care (bathing, dressing, feeding, toileting, grooming), accompaniment to medical appointments, paramedical services (as directed by a doctor, like administering medication or wound care), and protective supervision (for children who cannot safely be left alone due to cognitive impairment). Protective supervision is especially important — it can authorize the most hours and recognizes that many children with developmental disabilities require constant monitoring.\n\nHow to Apply\nApply through your county social services office. A social worker will conduct an in-home assessment to evaluate your child\'s functional needs. Important tips: be completely honest about your child\'s worst days, not their best. Demonstrate what your child cannot do independently, not what they can do with maximum support. Have documentation ready: doctor\'s letters describing care needs, your child\'s IEP, RC records, and a log of daily care tasks with time estimates.\n\nParents as Providers\nOnce IHSS is approved, you (the parent) can enroll as the provider through the IHSS payroll system. You\'ll receive an hourly wage (varies by county, typically $16-20/hour) for the authorized hours. This is real income — it\'s taxable and counts toward Social Security credits. You can also receive IHSS overtime pay. Register through your county\'s Public Authority or IHSS office.\n\nIf Your Hours Are Too Low\nIf the assessment results in fewer hours than your child needs, you have the right to request a reassessment and to appeal. Say: "I believe the assessed hours do not accurately reflect my child\'s care needs. I would like to request a reassessment and, if necessary, a state hearing to present additional documentation." IHSS fair hearings follow a similar process to RC fair hearings, and Aid Paid Pending applies if you file within 10 days of a reduction.',
      'W&I Code §12300-12330, CDSS IHSS Program', 'TRUE', now],

    ['ben-003', 'benefits', 'funding-waterfall', 'The Funding Waterfall — Who Pays for What',
      'One of the most confusing aspects of disability services is figuring out which agency or program pays for what. California uses a "funding waterfall" — a hierarchy of payers that determines who is financially responsible for each service. Understanding this waterfall prevents you from paying out-of-pocket for services that should be covered.\n\nThe Waterfall Order\nThe general order of financial responsibility is: 1) Private health insurance (your employer or marketplace plan), 2) Medi-Cal (California\'s Medicaid program), 3) CCS (California Children\'s Services for specific medical conditions), 4) School district (for educationally-related services under IDEA), 5) Regional Center (payer of last resort under the Lanterman Act). Each level pays only for what the levels above do not cover.\n\nWhy This Matters for Families\nIn practice, your child may receive services funded by multiple agencies simultaneously. For example: insurance covers 20 hours of ABA per week, the school provides speech therapy through the IEP, RC funds respite care and social skills groups, Medi-Cal covers medications and doctor visits, and IHSS pays you for in-home caregiving. The agencies are supposed to coordinate, but in reality, families often need to manage these relationships themselves.\n\nCommon Traps to Avoid\nRC saying "insurance should cover that" and refusing to authorize: RC cannot simply deny a service because insurance might cover it. RC must ensure the service is provided and can seek reimbursement from insurance afterward. School saying "that\'s a medical service": Schools must provide any service a child needs to access their education, even if the service has a medical component (like nursing or catheterization). Insurance denying a service: If insurance denies it, Medi-Cal (via EPSDT) must cover all medically necessary services for children under 21 — this is one of the strongest mandates in the system.\n\nEPSDT: The Safety Net\nEarly and Periodic Screening, Diagnostic, and Treatment (EPSDT) is a Medi-Cal mandate that requires coverage of ALL medically necessary services for children under 21, even if the service is not otherwise covered by the state Medi-Cal plan. If insurance denies a service your child needs and they are on Medi-Cal, EPSDT is your backstop. This includes ABA, speech, OT, PT, mental health services, and more.',
      'Multiple sources: Lanterman Act, IDEA, Insurance Code', 'TRUE', now],

    ['ben-004', 'benefits', 'medi-cal', 'Medi-Cal Waivers & EPSDT',
      'Medi-Cal (California\'s Medicaid program) offers several waiver programs that provide enhanced services beyond standard Medi-Cal coverage. For families of children with developmental disabilities, these waivers can unlock critical services.\n\nHome and Community-Based Services (HCBS) Waiver\nThe HCBS waiver provides services that help individuals with developmental disabilities live in the community instead of institutions. Services may include: habilitation, day programs, respite, supported employment, transition services, and environmental accessibility adaptations. Regional Center administers HCBS waiver services for its clients. If your child is an RC client and on Medi-Cal, ask about HCBS waiver services.\n\nSelf-Determination Program (SDP)\nSDP is a waiver program that gives families control over their RC budget. Instead of RC choosing vendors and services, you receive an individual budget and decide how to spend it on services your child needs. You can hire your own providers, set your own schedules, and be more creative about service delivery. Enrollment is managed by your Regional Center. The program has expanded statewide and is no longer limited to a pilot group.\n\nEPSDT — The Most Powerful Benefit\nEarly and Periodic Screening, Diagnostic, and Treatment (EPSDT) is a federal Medicaid requirement that applies to all children under 21 on Medi-Cal. Under EPSDT, Medi-Cal must cover any service that is "medically necessary" to correct or ameliorate a defect, illness, or condition — even if the service is not in the standard Medi-Cal benefit package. This includes behavioral health services, ABA therapy, speech and language therapy, occupational therapy, physical therapy, skilled nursing, durable medical equipment, and mental health treatment. If a provider says your child\'s Medi-Cal plan doesn\'t cover a service, cite EPSDT and request a formal denial so you can appeal.\n\nInstitutional Deeming for SSI/Medi-Cal\nIf your child is a Regional Center client, their SSI and Medi-Cal eligibility may be evaluated using "institutional deeming" — meaning only the child\'s income and resources are counted, not the parents\'. This is a huge benefit for middle-income families who might not otherwise qualify. Ask your RC service coordinator specifically about institutional deeming.',
      'W&I Code, 42 U.S.C. §1396d(r) (EPSDT)', 'TRUE', now],

    ['ben-005', 'benefits', 'calable', 'CalABLE Accounts & Financial Planning',
      'CalABLE (Achieving a Better Life Experience) accounts allow people with disabilities to save money without losing eligibility for SSI, Medi-Cal, IHSS, and other means-tested benefits. This solves one of the biggest problems families face: the $2,000 SSI resource limit that penalizes saving.\n\nHow CalABLE Works\nYou can contribute up to $18,000 per year (2024 limit, adjusts annually) into a CalABLE account. The account can hold up to $100,000 before it affects SSI eligibility (SSI payments are suspended, not terminated, while the balance exceeds $100K, and resume when it drops below). The full balance is exempt from Medi-Cal asset limits with no cap. Funds grow tax-free and withdrawals are tax-free when used for qualified disability expenses.\n\nQualified Disability Expenses\nCalABLE funds can be used for a broad range of expenses related to the beneficiary\'s disability: education (tuition, books, tutoring), housing (rent, mortgage, utilities, home modifications), transportation (vehicle purchase, rideshare, public transit), employment support (job training, assistive technology), health and wellness (medical expenses, therapies, dental, vision, fitness), assistive technology (communication devices, adaptive equipment), personal support (caregiver expenses, supervision), and financial management and legal fees. The definition is intentionally broad — most expenses that maintain or improve quality of life qualify.\n\nWho Can Open an Account\nThe beneficiary must have had a qualifying disability onset before age 26. The account is in the beneficiary\'s name, but a parent or legal representative can manage it. Open an account at CalABLE.ca.gov. There are no income restrictions for opening an account, and anyone (family, friends, employers) can contribute.\n\nCalABLE vs. Special Needs Trust\nCalABLE is simpler and cheaper to set up (no attorney needed), but has lower contribution limits. A Special Needs Trust has no contribution cap and can hold unlimited assets, but requires an attorney to establish and a trustee to manage. Many families use both: CalABLE for day-to-day savings and accessible funds, and a Special Needs Trust for larger assets like inheritances or lawsuit settlements. Both protect benefit eligibility.',
      'CA Gov Code §4875-4891, ABLE Act', 'TRUE', now],

    // Insurance (3 articles)
    ['ins-001', 'insurance', 'appeals', 'Insurance Appeal Process',
      'When your health insurance denies a service for your child, you have the right to appeal. California has one of the strongest insurance appeal systems in the country, and the odds are in your favor: the Department of Managed Health Care (DMHC) overturns approximately 60% of denials through Independent Medical Review.\n\nStep 1: Get the Denial in Writing\nAlways request a written denial that includes: the specific service denied, the contractual provision or medical criteria used, and information about your appeal rights. Do not accept verbal denials. Say: "I need the denial in writing, including the specific clinical criteria you used to make this decision and my appeal rights."\n\nStep 2: Internal Appeal\nFile a grievance/appeal with your insurance company within 180 days of the denial. Include: a letter explaining why the service is medically necessary, supporting documentation from your child\'s treating provider(s), relevant medical records, and any research or guidelines supporting the treatment. The insurance company must respond within 30 days (or 72 hours for urgent cases).\n\nStep 3: External Review (IMR)\nIf the internal appeal is denied, you can request an Independent Medical Review (IMR) through DMHC (for HMOs and some PPOs) or the California Department of Insurance (CDI, for other plans). The IMR is reviewed by independent doctors who are not affiliated with your insurance company. DMHC processes IMRs within 45 days (or 72 hours for urgent cases). The IMR decision is binding on the insurance company. File at DMHC: 1-888-466-2219 or healthhelp.ca.gov.\n\nKey California Laws That Help\nSB 946 mandates ABA coverage for autism with no dollar or visit caps. Mental Health Parity requires equal coverage for mental health and physical health. Timely access standards require insurers to offer specialist appointments within 15 business days. Out-of-network exceptions are required if no in-network provider is available within a reasonable time or distance.',
      'CA Health & Safety Code §1368-1368.04, CA Insurance Code', 'TRUE', now],

    ['ins-002', 'insurance', 'medical-necessity', 'Medical Necessity & Documentation',
      'Most insurance denials come down to one phrase: "not medically necessary." Understanding how insurance companies define medical necessity and how to fight their interpretation is the key to winning appeals.\n\nWhat "Medically Necessary" Means\nGenerally, a service is medically necessary if it is: required to diagnose or treat a medical condition, consistent with generally accepted standards of medical practice, not primarily for the convenience of the patient or provider, and the most appropriate level of service that can safely be provided. Insurance companies often interpret this narrowly, while federal law (especially for Medi-Cal under EPSDT) interprets it broadly. For children, the standard should include services that "correct or ameliorate" conditions, not just those that are strictly curative.\n\nBuilding Your Medical Necessity Case\nThe strongest appeals include: a detailed letter from the treating physician explaining why the service is necessary, referencing specific clinical guidelines or peer-reviewed research that support the treatment, demonstrating that your child\'s condition meets the clinical criteria for the service, showing that alternative treatments have been tried and failed (or explaining why they are not appropriate), and documenting the consequences of not receiving the service (regression, safety risks, functional decline).\n\nCommon Denial Reasons and Responses\n"Service is experimental": Provide evidence it\'s accepted standard of care (practice guidelines, research). "Not appropriate for age/diagnosis": Get your provider to explain why it is appropriate for your child\'s specific situation. "Reached maximum benefit": Show continued progress or explain that maintenance is medically necessary to prevent regression. "Custodial, not medical": Demonstrate the skilled care component (requires trained provider, not just supervision).\n\nDocumentation Tips\nKeep a binder or digital folder with: every denial letter, every appeal you\'ve filed, all supporting medical documentation, a log of phone calls (date, time, who you spoke with, what was said), and copies of your plan\'s Evidence of Coverage (EOC) showing the contractual obligations. The more organized your documentation, the stronger your appeal.',
      'CA Health & Safety Code, NCQA Guidelines', 'TRUE', now],

    ['ins-003', 'insurance', 'denials-eob', 'Understanding Denials & EOBs',
      'Explanation of Benefits (EOB) statements and denial letters contain critical information that most families overlook. Learning to read these documents can reveal errors, appeal opportunities, and coverage you didn\'t know you had.\n\nReading Your EOB\nAn EOB is not a bill — it\'s an explanation of what was submitted, what was covered, and what you may owe. Key fields to check: Procedure Code (CPT code) — was the correct service code submitted? Allowed Amount — the amount your plan recognizes for the service. Plan Payment — what insurance actually paid. Patient Responsibility — what you owe (copay, coinsurance, deductible). Denial Code — if denied, the specific reason code. Common billing errors include: wrong CPT code submitted, wrong diagnosis code, authorization not on file (even when you had one), and "timely filing" denials (provider submitted claim too late).\n\nTypes of Denials\nAdministrative denials are about paperwork: missing authorization, wrong codes, or late filing. These are often fixable without a formal appeal — call the provider\'s billing department and ask them to resubmit with the correct information. Clinical denials are about medical necessity: the insurance company\'s medical reviewer determined the service wasn\'t necessary. These require a formal appeal with clinical documentation. Contractual denials mean the service isn\'t covered under your plan. Check your Evidence of Coverage (EOC) carefully — sometimes the service is covered under a different benefit category.\n\nCommon Billing Errors to Catch\nServices billed under the wrong family member. Duplicate charges for the same service. In-network provider billed as out-of-network. Services billed without the required authorization (ask the provider to obtain retroactive auth). Diagnosis code that doesn\'t match the service provided. If you find an error, call both the provider\'s billing department and your insurance company to get it corrected and reprocessed.\n\nWhat to Do with Every Denial\nNever ignore a denial. For every denial: save the letter, note the appeal deadline (usually 180 days), determine if it\'s administrative or clinical, contact your provider for supporting documentation, and file the appeal. Even if you\'re unsure whether to fight it, file the appeal to preserve your rights — you can always withdraw later.',
      'CA Health & Safety Code, CA Insurance Code', 'TRUE', now],

    // Therapy Approaches (2 articles)
    ['ther-001', 'regional-center', 'pda', 'PDA (Pathological Demand Avoidance) — What Parents Need to Know',
      'Pathological Demand Avoidance (PDA) is a behavioral profile within the autism spectrum characterized by extreme resistance to everyday demands, driven by an anxiety-based need for control and autonomy. PDA is increasingly recognized by clinicians but is NOT a standalone diagnosis in the DSM-5 or ICD — it is considered a profile or presentation of autism.\n\nKey Features of PDA\nChildren with a PDA profile may show: obsessive avoidance of ordinary demands and requests, surface-level social skills that can mask underlying difficulties, rapid mood shifts between cooperation and extreme distress, use of role-play, excuses, or distraction as avoidance strategies, need for control in interactions with peers and adults, and intense reactions when they feel pressured to comply. Traditional behavioral approaches (like standard ABA with high demand structures) may actually increase distress in PDA children. Many families find that low-demand approaches, collaborative problem-solving, and building trust and autonomy work better.\n\nAccessing Services in California with PDA\nCritical: Because PDA is not a recognized diagnosis, it will not by itself qualify a child for Regional Center or school services. Your child needs a qualifying primary diagnosis — typically Autism Spectrum Disorder — with the PDA profile noted in the assessment. When seeking evaluations, ask the neuropsychologist if they are familiar with PDA profiles and can document it in the report. This documentation helps service providers understand your child\'s specific needs and tailor interventions appropriately.\n\nWhat to Tell Your Service Coordinator and IEP Team\nWhen requesting services, explain that your child has an autism diagnosis with a PDA profile, which means standard compliance-based approaches may not be effective. Request that providers have experience with demand-avoidant presentations. For the IEP, request that accommodations include reduced demands, choice-based activities, flexible scheduling, and sensory supports. For RC services, ask about providers trained in low-demand or relationship-based approaches.\n\nResources for Families\nPDA North America (pdanorthamerica.org) provides advocacy, education, and support. Journeys With PDA (journeyswithpda.com) offers coaching and educational consulting. Books such as "The Declarative Language Handbook" and "Uniquely Human" by Barry Prizant can also be helpful for understanding demand-avoidant profiles.',
      'PDA North America, Child Mind Institute, Clinical Research', 'TRUE', now],

    ['ther-002', 'regional-center', 'dir-floortime', 'DIR Floortime — An Alternative to ABA',
      'DIR Floortime (Developmental, Individual Difference, Relationship-based) is a therapeutic approach that focuses on building emotional connections and developmental capacities through play-based, child-led interactions. It was developed by Dr. Stanley Greenspan and is increasingly recognized as an evidence-based alternative to Applied Behavior Analysis (ABA) for children with autism and other developmental differences.\n\nHow DIR Floortime Works\nInstead of using structured behavioral targets and reinforcement (as in ABA), Floortime follows the child\'s lead and uses their natural interests and emotions to build engagement, communication, and thinking skills. A trained therapist (or parent) literally gets on the floor with the child and enters their world — joining their play, expanding interactions, and gradually building more complex communication and social-emotional skills. The "DIR" model considers: Developmental level (where the child is in their emotional and cognitive development), Individual differences (sensory processing, motor planning, communication style), and Relationship-based interactions (the emotional connection between child and caregiver).\n\nInsurance Coverage in California — SB 805\nHistorically, California\'s insurance mandate (SB 946) only covered ABA for autism, leaving families who preferred Floortime to pay out of pocket ($125-200/hour). In 2023, Governor Newsom signed SB 805, which expands the insurance mandate beyond ABA to include other evidence-based behavioral health treatments like DIR Floortime. This expansion takes effect by 2026. In the meantime, check with your insurance plan — some already cover Floortime under broader developmental therapy or behavioral health benefits.\n\nRegional Center Funding for Floortime\nRC can fund behavioral services including Floortime as an alternative to ABA. However, important nuance: RC typically funds one behavioral approach at a time — families have received Floortime instead of ABA through RC, but it is usually an either/or choice, not both simultaneously. To request Floortime through RC, ask for an IPP amendment and provide documentation from your child\'s provider explaining why Floortime is the appropriate approach for your child\'s individual profile. Some children, particularly those with PDA profiles or sensory sensitivities, respond much better to Floortime than to traditional ABA.\n\nFinding Providers\nICDL (icdl.com) maintains a provider directory and offers parent training courses. Profectum Foundation certifies DIR providers and has a directory. The PLAY Project has local provider listings. Beaming Health (beaminghealth.com) has a California-specific DIR Floortime provider search. Ask your RC service coordinator for vendored providers experienced with Floortime — some RCs have Floortime-trained vendors on their list.\n\nMedi-Cal Coverage\nUnder EPSDT, Medi-Cal must cover all medically necessary services for children under 21. If a licensed provider documents that Floortime is medically necessary for your child, Medi-Cal should cover it. If denied, appeal citing EPSDT requirements.',
      'SB 805, ICDL, Profectum Foundation, EPSDT', 'TRUE', now],

    // Rights (3 articles)
    ['rgt-001', 'rights', 'fair-hearings', 'Fair Hearing Rights Across Systems',
      'Fair hearings are formal proceedings where an independent judge reviews a government agency\'s decision. In California\'s disability system, fair hearings are available for Regional Center, SSI, IHSS, and Medi-Cal decisions. Each system has its own rules, but the core concept is the same: you have the right to challenge any decision that affects your child\'s services.\n\nRegional Center Fair Hearings\nFile within 60 days of the Notice of Action. Hearing is held within 50 days of your request. Decision issued within 80 days. Aid Paid Pending applies if filed within 10 days. File through the Office of Administrative Hearings (OAH). Free legal help: Disability Rights California 1-800-776-5746.\n\nSSI Fair Hearings\nIf SSI is denied or reduced, you have 60 days to request a hearing. Request "continuation of benefits" (similar to Aid Paid Pending) if filing within 10 days of a benefit reduction. The hearing is before a federal ALJ. You can request the hearing online at ssa.gov, by phone (1-800-772-1213), or at your local SS office.\n\nIHSS Fair Hearings\nRequest within 90 days of the notice of change. Aid Paid Pending if filed within 10 days. Hearing through the California Department of Social Services (CDSS). The hearing evaluates whether the assessed hours accurately reflect your child\'s care needs.\n\nMedi-Cal Fair Hearings\nRequest within 90 days of the denial. Aid Paid Pending if filed within 10 days. File through DHCS or your county Medi-Cal office. For managed care plans, you must first exhaust the plan\'s internal grievance process.\n\nUniversal Tips for All Hearings\nAlways file in writing and keep a copy. Always request Aid Paid Pending (or continuation of benefits) within 10 days. Bring organized documentation: the denial letter, relevant evaluations, provider letters, and the applicable law. You can bring an advocate or attorney. Practice your testimony: be clear, factual, and focused on your child\'s needs. The judge\'s decision is based on evidence, not emotion, but showing your child\'s real daily challenges is powerful evidence.',
      'W&I Code §4710.5, IDEA §300.507, 42 CFR §431.200', 'TRUE', now],

    ['rgt-002', 'rights', 'complaints', 'Filing Complaints — 4731, CDE, and OCR',
      'Complaints are different from fair hearings. While fair hearings challenge specific decisions about your child\'s services, complaints address systemic violations: when an agency breaks the rules. California has several complaint mechanisms depending on which agency is involved.\n\nSection 4731 Complaint (Regional Center)\nUnder W&I Code §4731, you can file a complaint with the Regional Center director about any violation of the Lanterman Act. The RC director must investigate and respond within 20 working days. Common reasons to file: RC is not implementing IPP services, service coordinator is unresponsive, RC is not following required timelines, or RC is applying blanket policies instead of individualized assessment. If unsatisfied with the director\'s response, escalate to the Department of Developmental Services (DDS).\n\nCDE Compliance Complaint (School District)\nFile with the California Department of Education if the school violated IDEA or state special education law. CDE must investigate and issue findings within 60 days. Covers violations from the past year. Common violations: failure to implement IEP services, missed evaluation timelines, failure to provide PWN, holding IEP meetings without required team members, or not offering extended school year. File online at cde.ca.gov or by mail. CDE can order corrective actions and compensatory services.\n\nOCR Complaint (Discrimination)\nFile with the U.S. Department of Education\'s Office for Civil Rights if your child is being discriminated against based on disability under Section 504 or Title II of the ADA. Examples: school excludes your child from activities because of disability, school fails to provide a 504 plan, bullying or harassment based on disability that the school fails to address. File within 180 days of the discrimination. OCR can investigate, negotiate resolution agreements, and refer cases for enforcement.\n\nWhen to Use Each Mechanism\nIf RC is violating the Lanterman Act, file a 4731 complaint. If the school is violating IDEA procedures, file a CDE complaint. If anyone is discriminating based on disability, file with OCR. You can file complaints with multiple agencies simultaneously, and a complaint does not prevent you from also pursuing a fair hearing or due process.',
      'W&I Code §4731, IDEA §300.151, OCR', 'TRUE', now],

    ['rgt-003', 'rights', 'timelines', 'Know Your Timelines — Critical Deadlines',
      'Missing a deadline in the disability system can mean losing your right to appeal, losing services during a dispute, or having to start a process over. This article compiles the most critical timelines every parent should know.\n\nThe 10-Day Rule (Most Important)\nAcross RC, SSI, IHSS, and Medi-Cal: if you file an appeal within 10 calendar days of a notice reducing or terminating services, the agency must continue providing services at the current level until the hearing decision. This is called Aid Paid Pending (RC, IHSS, Medi-Cal) or Continuation of Benefits (SSI). Missing this 10-day window means services are reduced or terminated while you wait for the hearing. Mark day 1 as the date the notice was mailed, not received.\n\nRegional Center Timelines\nInitial contact after referral: 15 working days. Eligibility determination: 120 days from referral. IPP meeting after eligibility: 60 days. IPP meeting upon request: 30 days. Emergency IPP: 7 days. Fair hearing request deadline: 60 days from Notice of Action. ALJ hearing: within 50 days of request. Decision: within 80 days of request. 4731 complaint investigation: 20 working days.\n\nSchool/IEP Timelines\nAssessment plan after referral: 15 calendar days. Evaluation after consent: 60 calendar days. IEP meeting after evaluation: 30 calendar days. Annual IEP review: every 12 months. Triennial reevaluation: every 3 years. Due process filing deadline: 2 years from the date you knew or should have known. CDE complaint: covers violations within past 1 year. CDE investigation: 60 days. PWN before any change: required before implementation.\n\nBenefits Timelines\nSSI application decision: 3-6 months typical. SSI appeal: 60 days from denial. IHSS appeal: 90 days from notice. Medi-Cal appeal: 90 days from notice. Insurance internal appeal: 180 days from denial. Insurance IMR (DMHC): no strict filing deadline but don\'t delay. Urgent IMR: 72-hour turnaround.\n\nPro Tip\nCreate a calendar specifically for disability-related deadlines. When you receive any notice from RC, school, SSA, or insurance, immediately calculate the key deadlines (especially the 10-day Aid Paid Pending window) and put them in your calendar with reminders at day 1, day 5, and day 8. Never let a deadline pass by accident.',
      'Multiple sources', 'TRUE', now],

    // Navigation (3 articles)
    ['nav-001', 'navigation', 'providers', 'Finding Providers — Therapists, Specialists, and Vendors',
      'Finding qualified providers for your child with a disability can feel overwhelming. Long waitlists, insurance restrictions, and the sheer number of therapy types make this one of the most common challenges families face. Here\'s a systematic approach.\n\nStart with Your Funding Sources\nBefore searching for providers, know who\'s paying: If Regional Center is funding the service, ask your service coordinator for their vendored provider list. RC-vendored providers are pre-approved and billing is handled for you. If insurance is paying, use your plan\'s provider directory but also call providers directly — directories are often outdated. If school is providing the service, it\'s delivered through the IEP and you don\'t need to find a provider (though you can request a specific type of provider in the IEP).\n\nWhere to Search\nYour Regional Center\'s provider list (call or check their website). Insurance provider directory (online or call member services). Psychology Today therapist directory (psychologytoday.com) — filter by specialty, insurance, and age. Local parent support groups (often the best source for provider recommendations). Family Resource Centers (FRCs) at your Regional Center. Your child\'s pediatrician for specialist referrals.\n\nQuestions to Ask Potential Providers\nDo you have experience with my child\'s specific diagnosis? What is your current waitlist time? Which insurance plans do you accept? Are you vendored with Regional Center? What is your approach/methodology? How do you measure and report progress? What does a typical session look like? How do you involve parents in treatment?\n\nWhen Waitlists Are Too Long\nIf you cannot find a provider within a reasonable timeframe: Ask RC for an out-of-area or non-vendored provider exception. File a timely access complaint with your insurance (they must provide specialists within 15 business days). Request the school provide the service through the IEP if it\'s educationally related. Ask about telehealth options, which often have shorter waitlists. Contact your local Family Resource Center for provider leads.',
      'General guidance', 'TRUE', now],

    ['nav-002', 'navigation', 'waitlists', 'Managing Waitlists — Strategies That Work',
      'Waitlists are a reality in California\'s disability service system. ABA therapy, developmental pediatricians, neuropsychological evaluations, and specialized therapists often have waitlists of 3-12 months. Here\'s how to manage them strategically.\n\nGet on Multiple Waitlists Simultaneously\nDon\'t wait for one provider to say no before contacting the next. Contact 5-10 providers at once and get on every relevant waitlist. When one opens up, take it and remove yourself from the others. This is the single most effective strategy for reducing wait times.\n\nUse Timely Access Standards\nCalifornia insurance law requires: routine specialist appointments within 15 business days, urgent appointments within 48 hours, and preventive care appointments within 30 business days. If your insurance cannot meet these timelines, they must offer an out-of-network provider at in-network rates. Document the waitlist times you\'re facing and file a complaint with DMHC if your insurer isn\'t meeting standards.\n\nBridge Services While Waiting\nWhile waiting for your preferred service, explore bridge options: telehealth versions of the therapy (shorter waitlists, can start immediately). Parent training programs (RC often funds parent-implemented ABA training). University clinics (often accept patients faster, supervised by experienced clinicians). Group therapy options (smaller waitlists than individual). School-based services through the IEP (no waitlists — they must provide what\'s in the IEP).\n\nTracking and Follow-Up\nCreate a simple spreadsheet tracking: provider name, date contacted, waitlist position, estimated wait time, follow-up dates, and notes. Call each provider monthly to check your status and ask if anything has opened up. Be polite but persistent. Providers sometimes have last-minute openings and will call the families who have been following up.\n\nEscalation Options\nIf wait times are unreasonable: Request your RC service coordinator advocate for expedited placement. File a timely access complaint with DMHC or CDI. Request "interim" services from RC while waiting for the preferred provider. Document everything — long waitlists can support fair hearing cases for alternative service delivery.',
      'General guidance, CA timely access standards', 'TRUE', now],

    ['nav-003', 'navigation', 'coordination', 'Coordinating Across Systems',
      'Your child may receive services from Regional Center, the school district, health insurance, Medi-Cal, IHSS, and SSI simultaneously. No single agency coordinates all of these — that job falls to you. Here\'s how to manage it effectively.\n\nMap Your Child\'s Service Landscape\nCreate a document listing every service your child receives: the service type, which agency funds it, the provider name, frequency, authorization dates, and renewal deadlines. This becomes your master reference. Update it whenever something changes. Share it with each provider and agency so they understand what else is happening.\n\nKey Coordination Points\nRC and School: These two systems serve your child simultaneously but have different mandates. RC covers developmental services; school covers educational services. Some services (like speech therapy) may be provided by both. Ensure they\'re not duplicating unnecessarily, but also ensure neither is deflecting responsibility. Insurance and Medi-Cal: If your child has both private insurance and Medi-Cal, private insurance is primary (pays first). Medi-Cal covers what insurance doesn\'t. Make sure both are billed correctly. RC and Insurance: RC is payer of last resort. Insurance should be billed first for clinical services. But RC cannot refuse to provide a service while waiting for insurance to process — they must ensure service delivery and seek reimbursement.\n\nCommunication Strategies\nKeep a communication log: date, who you talked to, what was discussed, what was agreed. Follow up every phone call with an email summary: "Per our conversation today, you confirmed that [action]. Please let me know if this is incorrect." Attend all meetings (IEP, IPP, IHSS assessment) with your service map in hand. Share reports across agencies: if a private evaluator recommends something, send it to both RC and school.\n\nWhen Agencies Point Fingers\nThe most common problem: Agency A says Agency B should pay, and Agency B says Agency A should pay. When this happens, cite the specific law that assigns responsibility: school must provide FAPE services regardless of whether RC exists (§300.154), RC must fund IPP services as payer of last resort (§4659), insurance must cover medically necessary services per your plan contract. Put the dispute in writing and cc both agencies. If unresolved, escalate through the complaint mechanisms (4731 for RC, CDE complaint for school, DMHC for insurance).',
      'General guidance', 'TRUE', now],

    // Transitions (2 articles)
    ['trn-001', 'transitions', 'early-start', 'Early Start to IEP (Age 3 Transition)',
      'When a child receiving Early Start services (IDEA Part C, administered by Regional Center) turns 3, they transition from Early Start to the school district\'s special education system (IDEA Part B). This is one of the most stressful transitions for families because the entire service delivery model changes. Planning ahead is essential.\n\nThe Timeline\nAt least 90 days before your child\'s 3rd birthday, a transition conference must be held with your Early Start service coordinator, the school district, and your family. The school district must complete evaluations and hold an IEP meeting before your child\'s 3rd birthday so services can begin on that date with no gap. If the school is not initiating this process, you need to push it.\n\nWhat Changes\nIn Early Start, services typically come to your home and focus on the family unit (IFSP model). After age 3, services shift to the school setting under an IEP. Therapy moves from home-based to school-based in many cases. Service hours may change significantly. Your child may start attending a preschool program. The focus shifts from family-centered to child-centered and education-focused.\n\nWhat to Do\nAt age 2.5, start preparing: request the transition conference if no one has contacted you. Gather all Early Start records: assessments, IFSP documents, progress reports. Request a comprehensive evaluation from the school district (don\'t rely solely on the Early Start assessments). If your child has been receiving ABA, speech, OT, or other therapies through RC or insurance, ensure these continue — the IEP may not cover the same intensity. Attend the IEP meeting prepared with specific requests for services and placement.\n\nCritical: Don\'t Lose RC Services\nTurning 3 does not mean your child loses Regional Center services. RC services continue separately from school services. Your child should have both an IEP (school) and an IPP (RC). Common mistake: families assume the school replaces RC. It doesn\'t. Ensure your RC service coordinator is planning for the continuation of RC-funded services that are not the school\'s responsibility.\n\nIf the School Says Your Child Doesn\'t Qualify\nIf the school determines your child is not eligible for special education, you can: request the evaluation data and review it, request an IEE at public expense if you disagree, file for due process, and continue RC and insurance-funded services in the meantime. Eligibility under IDEA (school) and the Lanterman Act (RC) use different criteria — your child can qualify for one and not the other.',
      'IDEA Part C to Part B, CA Ed Code §56441.11', 'TRUE', now],

    ['trn-002', 'transitions', 'adult', 'School to Adult Transition (Age 18/22)',
      'The transition from school to adult life is the longest and most complex transition in the disability system. Planning should start at age 14-16 and involves multiple agencies. The key principle: adult services are not automatic — you must apply for and secure each one separately.\n\nIEP Transition Planning\nFederal law requires transition planning in the IEP starting at age 16 (California recommends starting at 14). The transition plan must include: measurable post-secondary goals for education, employment, and independent living. Transition services to help reach those goals. The student\'s preferences and interests must drive the plan. Outside agencies (RC, DOR) should be invited to IEP meetings when transition is discussed.\n\nKey Agencies for Adult Transition\nRegional Center: RC services are lifelong under the Lanterman Act. Your child does not age out. However, the IPP should be updated to reflect adult goals: supported living, day programs, supported employment. Apply for adult services well before age 22. Department of Rehabilitation (DOR): DOR provides vocational rehabilitation, job training, supported employment, and can fund college or trade school. Apply at age 15-16 — waitlists are long. DOR services are separate from school and RC. Social Security (SSI/SSDI): At age 18, parental income is no longer counted ("deeming" stops). Many individuals who didn\'t qualify as children will qualify as adults. Apply for SSI at 18. IHSS: Continues into adulthood. Reassess hours based on adult needs.\n\nConservatorship vs. Alternatives\nWhen your child turns 18, they become a legal adult with full decision-making rights, regardless of disability. If they need support with decisions, you have options: Supported Decision-Making — the least restrictive option, where the individual makes their own decisions with help from trusted supporters. No court involvement needed. Limited Conservatorship — grants authority over specific areas (education, health, residence, finances, social) while preserving the individual\'s rights in other areas. Requires court approval. Full Conservatorship — rarely appropriate and increasingly disfavored. Courts prefer limited conservatorship for individuals with developmental disabilities. Power of Attorney — if your child can understand and consent, POA is simpler than conservatorship and preserves more autonomy.\n\nAge 22: End of School Entitlement\nThe right to FAPE ends when your child receives a diploma or turns 22 (whichever comes first). After that, educational services come through adult education, community college, or DOR-funded programs. Plan for this transition starting at age 18 — don\'t wait until the last year of school. Ensure your child\'s RC IPP and DOR plan are in place before school services end.',
      'IDEA §300.43, CA Ed Code §56460-56462, Lanterman Act', 'TRUE', now],
  ];

  entries.forEach(function(entry) {
    sheet.appendRow(entry);
  });

  return { success: true, message: 'Seeded ' + entries.length + ' knowledge base entries' };
}


// ═══════════════════════════════════════════════════════
// PROMPTS — Seed category system prompts
// ═══════════════════════════════════════════════════════

function seedPrompts() {
  var sheet = getOrCreateSheet_('Prompts', [
    'category', 'system_prompt', 'active', 'version', 'updatedAt'
  ]);

  if (sheet.getLastRow() > 1) return { success: true, message: 'Prompts already seeded' };

  var now = new Date().toISOString();
  var categories = ['regional-center', 'iep', 'benefits', 'insurance', 'rights', 'transitions', 'navigation'];

  categories.forEach(function(cat) {
    // Seed with a placeholder that triggers the built-in prompts
    sheet.appendRow([cat, '', 'FALSE', '1.0', now]);
  });

  return { success: true, message: 'Seeded prompt rows for ' + categories.length + ' categories. Edit the system_prompt column to customize.' };
}


// ═══════════════════════════════════════════════════════
// ENTITY NAVIGATION MATRIX KB v9.4 — 52 articles
// ═══════════════════════════════════════════════════════

function seedEntityKB() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('KnowledgeBase');
  if (!sheet) return { success: false, error: 'KnowledgeBase sheet not found. Run setupWaypoint() first.' };

  var now = new Date().toISOString();
  var entries = [

    // ═══════════════════════════════════════════════════════
    // STATE / CALIFORNIA ENTITIES
    // ═══════════════════════════════════════════════════════

    ['ent-rc', 'benefits', 'rc-guide', 'Regional Center (RC) — Complete Guide',
      'California has 21 Regional Centers operating under the Department of Developmental Services (DDS), established by the Lanterman Developmental Disabilities Services Act. Regional Centers are the gateway to state-funded services for children and adults with developmental disabilities.\n\n'
      + 'ELIGIBILITY: Five qualifying conditions: Intellectual Disability (ID), Cerebral Palsy (CP), Epilepsy, Autism Spectrum Disorder (ASD), and conditions requiring services similar to one of the above. Diagnosis must occur before age 18. There is NO income requirement for RC eligibility itself — though some services have Family Cost Participation (FCP) based on income.\n\n'
      + 'HOW TO APPLY: Self-referral or physician referral accepted. Once referred, the Regional Center must respond within 120 days and complete an assessment. An Individualized Program Plan (IPP) is developed at intake and reviewed annually.\n\n'
      + 'APPEALS: Families can request a Fair Hearing through the Office of Administrative Hearings (OAH) if they disagree with RC decisions. File the appeal within 30 days of denial. Mediation is also available.\n\n'
      + 'EQUITY CONCERNS: White children receive approximately 2x more spending than Latino children at 17 of 21 Regional Centers. This reflects systemic barriers and differences in service utilization.',
      'Lanterman Act, DDS, Undivided, DRC', 'TRUE', now],

    ['ent-ihss', 'benefits', 'ihss-guide', 'In-Home Supportive Services (IHSS) — Complete Guide',
      'IHSS is a county-administered program providing paid caregiving for individuals with functional limitations. Not age-restricted — children of all ages may qualify.\n\n'
      + 'SERVICES COVERED: Personal care (bathing, dressing, toileting), domestic services (light housekeeping, laundry), paramedical services (catheter care, wound dressing), meal preparation, and accompaniment to medical appointments.\n\n'
      + 'ELIGIBILITY: Must be Medi-Cal eligible AND have documented functional limitations in one or more activities of daily living. No specific diagnosis required.\n\n'
      + 'APPLICATION: Submit SOC 295 (IHSS application) to your county. Physician must complete SOC 873 confirming need. Assessment typically takes 30-45 days. Annual reassessment required. Can request increase anytime if needs change.\n\n'
      + 'PARENT AS PROVIDER: Parents CAN be paid IHSS providers for their own children in California. IHSS payments to parent providers are exempt income for both Medi-Cal and SSI purposes.\n\n'
      + 'APPEALS: State hearing through CDSS within 90 days of adverse decision.\n\n'
      + 'WORKFORCE CRISIS: 60%+ of CA counties lack sufficient IHSS caregivers. Rural areas hardest hit.',
      'IHSS, CDSS, SOC 295, SOC 873', 'TRUE', now],

    ['ent-medcal', 'benefits', 'medi-cal-guide', 'Medi-Cal — Complete Guide for Disability Families',
      'Medi-Cal is California\'s Medicaid program covering medical, dental, vision, mental health, therapies, durable medical equipment, and more.\n\n'
      + 'ELIGIBILITY: Income-based (children up to 266% FPL) OR categorical (SSI recipients auto-enrolled in CA). No resource limits for children under 21.\n\n'
      + 'EPSDT — THE HIDDEN SUPERPOWER: Under EPSDT (Early and Periodic Screening, Diagnostic and Treatment), Medi-Cal MUST cover ALL medically necessary services for children under 21. This is broader than regular Medi-Cal. If a licensed provider documents medical necessity, Medi-Cal should cover it — including services not listed in the standard benefit.\n\n'
      + 'ENROLLMENT: 45 days for income-based; 90 days for disability-based. Retroactive coverage up to 3 months. Annual renewal required.\n\n'
      + 'HCBS-DD WAIVER: Available to RC clients. Bypasses parental income for RC clients.\n\n'
      + 'APPEALS: Fair hearing through DHCS within 90 days. Managed care plan grievance/appeal. Independent Medical Review via DMHC for HMO plans.',
      'DHCS, EPSDT, Medi-Cal, HCBS-DD Waiver', 'TRUE', now],

    ['ent-ccs', 'benefits', 'ccs-guide', 'California Children\'s Services (CCS) — Complete Guide',
      'CCS provides specialized medical and related services to children under 21 with qualifying medical conditions.\n\n'
      + 'QUALIFYING CONDITIONS: 300+ conditions including cerebral palsy, spina bifida, heart defects, cancer, hemophilia, muscular dystrophy, cleft palate. Condition must be physically disabling or require medical intervention. NOT autism alone (unless with qualifying medical condition).\n\n'
      + 'COST STRUCTURE: Under $40K/yr: full coverage. Over $40K: may have cost participation. MTP (Medical Therapy Program) in schools has NO income limit.\n\n'
      + 'APPLICATION: Referral from physician or self-referral. County CCS office processes. 30-60 days for initial authorization.\n\n'
      + 'KEY TIP: Ask your pediatrician if your child\'s conditions are CCS-eligible. CCS is referral-dependent — many qualifying families miss it because nobody refers them.',
      'CCS, DHCS, Medical Therapy Program', 'TRUE', now],

    ['ent-earlystart', 'transitions', 'early-start-guide', 'Early Start (Part C) — Complete Guide for Infants & Toddlers',
      'Early Start is California\'s Part C Early Intervention program for infants and toddlers ages 0-3.\n\n'
      + 'ELIGIBILITY: 33% delay in ONE developmental area OR 25% delay in TWO areas, or established risk condition (Down syndrome, etc.). The threshold is lower than Lanterman Act eligibility.\n\n'
      + 'HOW IT WORKS: Referral to RC → Assessment within 45 days → IFSP developed → Services begin. No income requirement — services are free. Services delivered in natural environments (home, daycare).\n\n'
      + 'IFSP vs IEP: The IFSP is family-centered, reviewed every 6 months, and focuses on functional outcomes in natural environments.\n\n'
      + 'TRANSITION AT AGE 3: At approximately 2 years 9 months, transition planning begins. The school district must have an IEP in place by the child\'s 3rd birthday. This is where many children LOSE services — monitor closely.\n\n'
      + 'KEY TIP: Do NOT wait for a diagnosis to refer to Early Start. A developmental concern is enough. Self-refer by calling your local Regional Center directly.',
      'IDEA Part C, W&I Code §95000, Early Start', 'TRUE', now],

    ['ent-dds', 'benefits', 'dds-guide', 'Department of Developmental Services (DDS) — Overview',
      'DDS is the state agency overseeing all 21 Regional Centers and the service system for individuals with developmental disabilities.\n\n'
      + 'BUDGET: $18.7 billion (FY 2025-26) — largest in history.\n\n'
      + 'CASELOAD DATA: ASD is now 51% of RC caseload (first time majority). 10-year ASD growth: +156%. Hispanic families represent 41% of ASD caseload. 19% of ASD clients have co-occurring ID.\n\n'
      + 'TRANSPARENCY: DDS publishes annual reports with demographic data, service utilization, and equity metrics. Families and advocates can request data through public records requests.\n\n'
      + 'EQUITY INITIATIVES: DDS distributes Service Access & Equity (SAE) grants and AB 1215 Equity grants to address disparities. AB 1208 requires standardized quality measures across RCs.',
      'DDS, DDS Annual Report April 2025, AB 1208', 'TRUE', now],

    ['ent-dmhc', 'insurance', 'dmhc-guide', 'DMHC — HMO Regulation & Independent Medical Reviews',
      'DMHC (Department of Managed Health Care) regulates HMOs and managed care plans. CDI (Department of Insurance) regulates PPOs separately.\n\n'
      + 'KNOWING YOUR PLAN TYPE: Families must identify HMO vs PPO to file with the correct regulator. Check your insurance card or call member services.\n\n'
      + 'INTERNAL APPEALS: Plans have 30 days to resolve. Urgent cases: 72 hours.\n\n'
      + 'INDEPENDENT MEDICAL REVIEWS (IMRs): Free. DMHC reviews medical necessity independently. 45 days standard. IMR decisions are BINDING on the health plan. IMRs overturn approximately 60% of denials.\n\n'
      + 'ABA COVERAGE: SB 946 mandates ABA coverage for autism. SB 805 expands to include DIR Floortime and other evidence-based treatments by 2026.\n\n'
      + 'CA MENTAL HEALTH PARITY: Insurance must provide mental health coverage equivalent to medical/surgical coverage.',
      'DMHC, CDI, SB 946, SB 805, IMR', 'TRUE', now],

    ['ent-ssi', 'benefits', 'ssi-guide', 'SSI for Children with Disabilities — Complete Guide',
      'SSI provides monthly cash benefits for children with disabilities in families with limited income. In California, SSI recipients are auto-enrolled in Medi-Cal.\n\n'
      + 'CHILD ELIGIBILITY: Must have a medically determinable impairment causing marked and severe functional limitations, expected to last 12+ months.\n\n'
      + 'RESOURCE LIMITS: $2,000 individual / $3,000 couple. CalABLE first $100K excluded. IHSS income is exempt.\n\n'
      + 'AT AGE 18 — CRITICAL CHANGE: SSI re-evaluates under adult criteria using ONLY the individual\'s income/assets (not parents\'). Many denied as minors become eligible at 18. Apply as soon as your child turns 18.\n\n'
      + 'INITIAL DENIAL RATE: 60-70%. Do NOT give up — most approvals come on appeal.\n\n'
      + 'APPEAL PATH: Reconsideration → ALJ Hearing → Appeals Council → Federal Court. Must file within 60 days of denial.\n\n'
      + 'CDR: Continuing Disability Reviews every 1-7 years depending on severity.\n\n'
      + 'FUNCTION REPORT TIPS: Describe WORST days. Be specific about what they cannot do independently. Get help from therapists and doctors.',
      'SSA, 42 USC §1381, CalABLE', 'TRUE', now],

    ['ent-idea', 'iep', 'idea-guide', 'IDEA — Individuals with Disabilities Education Act',
      'IDEA is the federal law guaranteeing FAPE (Free Appropriate Public Education) for all children with disabilities.\n\n'
      + '13 DISABILITY CATEGORIES: Autism, Deaf-Blindness, Deafness, Emotional Disturbance, Hearing Impairment, Intellectual Disability, Multiple Disabilities, Orthopedic Impairment, Other Health Impairment (includes ADHD), Specific Learning Disability, Speech-Language Impairment, TBI, Visual Impairment.\n\n'
      + 'PART C: Ages 0-3 (Early Intervention through Regional Centers).\n'
      + 'PART B: Ages 3-21 (School district IEP services).\n\n'
      + 'CA TIMELINES: 15 days to respond to assessment request. 60 days to complete assessment. 30 days to hold IEP meeting. Annual IEP review. Triennial re-evaluation.\n\n'
      + 'FREE REGARDLESS OF STATUS: FAPE is free regardless of income or immigration status.\n\n'
      + 'DISPUTE RESOLUTION: IEP meeting request → Mediation → State complaint (CDE, 60 days) → Due process hearing (OAH, 45 days) → Federal court. Complaints filed within 1 year (CA) or 2 years (federal).\n\n'
      + 'IDENTIFICATION DISPARITIES: Hispanic/Latino students 40% less likely to be identified with autism. Black children misdiagnosed with ID instead of autism.',
      'IDEA, Ed Code §56000-56865, FAPE', 'TRUE', now],

    ['ent-cms', 'benefits', 'cms-epsdt-guide', 'CMS & EPSDT — The Strongest Medicaid Entitlement',
      'CMS (Centers for Medicare & Medicaid Services) oversees Medicaid. EPSDT is the federal Medicaid benefit for children under 21.\n\n'
      + 'EPSDT IS AN ENTITLEMENT: States MUST provide ANY medically necessary service for children under 21, even if not in the state Medicaid plan. This makes EPSDT extraordinarily powerful.\n\n'
      + 'COVERS: Evaluations, therapies (speech, OT, PT, behavioral), equipment, mental health, and other medically necessary services.\n\n'
      + 'ACCESS: Through Medi-Cal managed care plans. Many denials occur because plans don\'t understand EPSDT\'s broader entitlement.\n\n'
      + 'EPSDT DENIALS ARE HIGHLY APPEALABLE: Cite "medically necessary under EPSDT" in all appeal documents.\n\n'
      + 'MOST UNDERUTILIZED: Despite its power, EPSDT is one of the most underutilized federal entitlements. Knowing about it can unlock critical services.',
      'CMS, EPSDT, DHCS, Medi-Cal', 'TRUE', now],

    ['ent-tax', 'benefits', 'tax-benefits-guide', 'IRS Tax Benefits for Families with Disabled Children',
      'Several tax benefits exist for families supporting a child with a disability.\n\n'
      + 'MEDICAL EXPENSE DEDUCTION (Schedule A): Expenses exceeding 7.5% AGI. Includes: evaluations, prescribed tutoring, therapy, equipment, behavioral therapy, respite care, transportation to appointments. Physician letter of medical necessity required for tutoring/educational therapy.\n\n'
      + 'ABLE ACCOUNTS: CalABLE contributions grow tax-free. Withdrawals for disability expenses are tax-free.\n\n'
      + 'DEPENDENT CARE CREDIT: If paying for dependent care to enable parents to work (Form 2441).\n\n'
      + 'EARNED INCOME TAX CREDIT (EITC): Available to families with low-moderate income.\n\n'
      + 'IMPAIRMENT-RELATED WORK EXPENSE: Deduction for disability-related work expenses.\n\n'
      + 'KEY TIP: Keep detailed records and obtain physician letters. Consult a tax professional familiar with disability tax benefits.',
      'IRS Publication 502, CalABLE Act', 'TRUE', now],

    ['ent-dor', 'transitions', 'dor-guide', 'Department of Rehabilitation (DOR) — Vocational Services',
      'DOR provides vocational rehabilitation, job training, college support, and paid internships for people with disabilities. Key transition resource for youth 16+.\n\n'
      + 'ELIGIBILITY: Any disability creating barriers to employment. No income requirement. 60 days for eligibility determination.\n\n'
      + 'IPE: Individualized Plan for Employment outlining employment goal and services.\n\n'
      + 'CONNECTION: School should invite DOR to transition IEP meetings at age 16. Apply online or at local DOR office.\n\n'
      + 'ORDER OF SELECTION: DOR operates under Order of Selection — there is a waitlist. Highest-need individuals prioritized. RC can fund Job Development as a bridge.\n\n'
      + 'SERVICES: Vocational assessments, job training, Transition Partnership Program, college support, paid internships, assistive technology, job coaching.\n\n'
      + 'APPEALS: Client Assistance Program (CAP) for disputes.',
      'DOR, Rehab Act, IPE', 'TRUE', now],

    ['ent-insurance', 'insurance', 'insurance-complete-guide', 'Private Insurance — Coverage Mandates & Appeals',
      'Private insurance is the primary payer for medical, therapy, behavioral health, and DME.\n\n'
      + 'KEY CA LAWS: SB 946 requires ABA coverage for autism. SB 805 expands to DIR Floortime by 2026. CA Mental Health Parity requires equal behavioral health coverage.\n\n'
      + 'PRIOR AUTHORIZATION: 5-15 business days (72 hours for urgent). Re-auth typically every 6 months for ABA.\n\n'
      + 'WHEN DENIED — APPEAL PATH: Internal appeal (2 levels) → External review: DMHC for HMOs, CDI for PPOs → Independent Medical Review (binding, free, overturns ~60% of denials).\n\n'
      + 'OUT-OF-NETWORK: Pay upfront and submit superbill for reimbursement. If network has long waitlists, you may have right to out-of-network at in-network rates — file network adequacy complaint.\n\n'
      + 'PAYER HIERARCHY: Insurance is primary. Medi-Cal is secondary. RC is payer of last resort. Get denials in writing — you need them for RC to step in.',
      'SB 946, SB 805, DMHC, CDI', 'TRUE', now],

    ['ent-therapy', 'benefits', 'therapy-providers-guide', 'Therapy Providers — ABA, Speech, OT, PT',
      'Therapy services are coordinated across multiple funding sources.\n\n'
      + 'ABA: Autism diagnosis required. Waitlists weeks to months. Funded through insurance (SB 946), Medi-Cal, RC, or IEP.\n\n'
      + 'SPEECH-LANGUAGE (SLP): Typically shorter waitlists. School-based (IEP) differs from community-based (insurance/Medi-Cal/RC).\n\n'
      + 'OCCUPATIONAL THERAPY (OT): Fine motor, sensory, self-care, adaptive functioning.\n\n'
      + 'PHYSICAL THERAPY (PT): Gross motor function and mobility.\n\n'
      + 'AUTHORIZATION: Most require renewal every 3-12 months. Track expiration dates to prevent gaps.\n\n'
      + 'RURAL DESERTS: Many rural areas lack providers. DOR and RC can sometimes fund provider travel or telehealth.\n\n'
      + 'MULTI-PAYER COORDINATION: Insurance + Medi-Cal + RC + school can be complex. Track all authorizations carefully.',
      'ABA, SLP, OT, PT, SB 946', 'TRUE', now],

    // ═══════════════════════════════════════════════════════
    // EDUCATION ENTITIES
    // ═══════════════════════════════════════════════════════

    ['ent-iep', 'iep', 'iep-complete-guide', 'IEP Complete Guide — School District Services',
      'An IEP is a legal document specifying a student\'s present levels, annual goals, services, accommodations, modifications, and placement. Developed by team including parents, GenEd teacher, SpEd teacher, district rep, and evaluator.\n\n'
      + 'ELIGIBILITY: Must qualify under one of 13 IDEA disability categories AND disability must adversely affect educational performance.\n\n'
      + 'TIMELINE: IEP meeting within 30 days of eligibility. Annual review required. Triennial re-evaluation. Parent can request IEP meeting at any time.\n\n'
      + 'YOUR RIGHTS: Right to meaningful participation. Right to disagree and request IEE at public expense. Right to Prior Written Notice for any proposed change. Right to interpreter at all meetings. Can record with 24-hour notice in CA. Can bring anyone to meeting.\n\n'
      + 'DISPUTE RESOLUTION: Request new IEP meeting → Free mediation via CDE → State complaint (CDE, 60 days) → Due process hearing (OAH, 45 days) → Federal court.\n\n'
      + 'DRC publishes template letters for all common requests and disputes.',
      'IDEA, Ed Code §56000-56865, DRC', 'TRUE', now],

    ['ent-504', 'iep', '504-plan-guide', '504 Plan — Accommodations Guide',
      'A 504 Plan provides accommodations (not specialized instruction) for students with disabilities that substantially limit a major life activity.\n\n'
      + 'ELIGIBILITY: Any physical or mental impairment that substantially limits major life activities. Broader than IEP — does NOT require one of 13 IDEA categories. Common for ADHD, diabetes, anxiety, chronic illness.\n\n'
      + 'KEY DIFFERENCES FROM IEP: No specialized instruction. Fewer procedural protections. No due process hearing right under 504 alone — file OCR complaint (federal). Schools often offer 504 instead of IEP to avoid service obligations.\n\n'
      + 'COMMON ACCOMMODATIONS: Extended time, preferential seating, modified assignments, assistive technology, breaks, reduced homework.\n\n'
      + 'WHEN 504 MAY NOT BE ENOUGH: If your child needs specialized instruction (not just accommodations), push for IEP evaluation.',
      'Section 504, OCR, ADA', 'TRUE', now],

    ['ent-assessments', 'iep', 'iep-assessments-guide', 'IEP Assessments & IEE — Evaluation Guide',
      'Parents can request evaluation at any time. The district has 15 days to respond with an assessment plan, 60 days to complete, IEP within 30 days.\n\n'
      + 'COMPREHENSIVE ASSESSMENT: District MUST assess in ALL areas of suspected disability. If you suspect reading AND writing AND social-emotional issues, request assessment in all areas. Don\'t let district limit the scope.\n\n'
      + 'IEE (INDEPENDENT EDUCATIONAL EVALUATION): If you disagree with the district\'s assessment, you have the right to an IEE at public expense. No need to explain why. District must either fund the IEE or file due process to defend their own assessment.\n\n'
      + 'TRIENNIAL: Re-evaluation required every 3 years. Parent can request additional assessments anytime if new concerns arise.\n\n'
      + 'DRC TEMPLATE LETTERS: DRC provides template letters for requesting assessment and IEE. Use them.',
      'IDEA, Ed Code §56321, DRC', 'TRUE', now],

    ['ent-ermhs', 'iep', 'ermhs-guide', 'ERMHS — Mental Health Services in Schools',
      'ERMHS (Educationally Related Mental Health Services) are mental health supports provided through the IEP when a student\'s mental health needs affect their ability to access education.\n\n'
      + 'SERVICES: Individual/group counseling, social work, behavioral intervention, case management, and crisis intervention.\n\n'
      + 'LEGAL REQUIREMENT: Districts MUST provide ERMHS when the IEP team determines mental health services are necessary for FAPE. Same assessment timelines apply.\n\n'
      + 'COMMON PROBLEM: ERMHS is historically underfunded. Schools may claim they "don\'t provide mental health services." DRC clarifies: districts have a legal obligation to provide ERMHS when educationally necessary.\n\n'
      + 'HOW TO REQUEST: Request ERMHS assessment through the IEP team in writing. The assessment will determine if social-emotional or behavioral needs affect educational access.',
      'IDEA, Ed Code §56363.5, DRC', 'TRUE', now],

    ['ent-placement', 'iep', 'placement-lre-guide', 'IEP Placement & LRE Continuum',
      'Placement must follow Least Restrictive Environment (LRE) principle.\n\n'
      + 'LRE CONTINUUM: GenEd → GenEd with supports → Resource room → SDC (Special Day Class) → NPS (Non-Public School) → Residential → Home/Hospital. Start with least restrictive; move toward more restrictive only when necessary.\n\n'
      + 'NPS: CDE-certified separate school. IEP team determines placement. District pays all costs. Waitlists can be long.\n\n'
      + 'RESIDENTIAL: Most restrictive. 24-hour structured support. District/county funded if IEP team determines necessity.\n\n'
      + 'HOME/HOSPITAL: Temporary instruction when student cannot attend due to medical/mental health condition. Physician statement required. District must begin instruction within 5 school days.\n\n'
      + 'STAY PUT RIGHT: During disputes about placement, child remains in current placement unless parents agree otherwise.\n\n'
      + 'INDEPENDENT STUDY: Must be voluntary. IEP modified for IS delivery.\n\n'
      + 'HOMESCHOOLING: Options include Private School Affidavit, PSP, or charter IS. IMPORTANT: leaving public school may mean losing IEP services.',
      'IDEA, Ed Code §56040, LRE', 'TRUE', now],

    ['ent-transition', 'transitions', 'transition-iep-itp-guide', 'Transition IEP / ITP — Planning for Life After School',
      'ITP (Individualized Transition Plan) required at age 16 in CA. Covers post-secondary education, employment, and independent living.\n\n'
      + 'KEY COMPONENTS: Age-appropriate transition assessments. Post-secondary goals. Connection to DOR by 16. Diploma vs Certificate of Completion decision.\n\n'
      + 'SCHOOL-LEVEL TRANSITIONS: Transition IEPs for preschool→K, elementary→middle, middle→high. Schools should provide tours. Request transition IEP meeting before each move.\n\n'
      + 'COMMON PROBLEM: Transition planning starts too late. Schools may not connect to adult agencies. Start advocating for meaningful ITP at age 14-15.\n\n'
      + 'AGE 18: Age of majority — student may sign own IEP. Consider conservatorship/SDM/POA before 18th birthday.\n\n'
      + 'AGE 22: School services end. RC adult services, DOR, supported employment, and day programs continue.',
      'IDEA, Ed Code §56460, ITP', 'TRUE', now],

    ['ent-mtss', 'iep', 'mtss-rti-guide', 'MTSS/RTI — When Schools Cannot Delay Evaluation',
      'MTSS/RTI is a school-wide framework providing tiered support. Tier 1: universal instruction. Tier 2: small-group targeted. Tier 3: intensive individual. NOT special education.\n\n'
      + 'CRITICAL RULE: RTI CANNOT be used to delay a special education evaluation. Parent can request evaluation at ANY TIME regardless of RTI status. OSEP confirmed this.\n\n'
      + 'COMMON ILLEGAL DELAY: School says "We need to try RTI first before evaluating." This violates IDEA when parent has requested evaluation.\n\n'
      + 'YOUR RESPONSE: "Under IDEA, a parent\'s request for evaluation cannot be delayed by RTI. I am requesting an evaluation now." Put it in writing.\n\n'
      + 'RTI DATA IS USEFUL: Progress monitoring data from RTI can inform the IEP team, but it is NOT a prerequisite for evaluation.\n\n'
      + 'IF NO PROGRESS: After 6-8 weeks of RTI without progress, formally request special education evaluation in writing.',
      'IDEA, OSEP, Ed Code', 'TRUE', now],

    ['ent-progress', 'iep', 'progress-monitoring-comp-ed-guide', 'IEP Progress Monitoring & Compensatory Education',
      'Schools must report IEP progress at least as often as general education report cards. Data must be measurable.\n\n'
      + 'TRACKING: Use DRC\'s tracking log worksheet. Track services actually delivered vs what IEP specifies. Note missed sessions.\n\n'
      + 'LACK OF PROGRESS: If student isn\'t progressing, request IEP meeting to revise goals/services. Persistent lack of progress means the IEP isn\'t meeting needs.\n\n'
      + 'COMPENSATORY EDUCATION: If school failed to provide IEP services, request comp ed. NOT just hour-for-hour replacement — should put student in position they would have been if services were provided. Document all missed services.\n\n'
      + 'SCHOOLS RARELY OFFER COMP ED VOLUNTARILY: DRC\'s tracking log is essential evidence. File state complaint or due process if school refuses.',
      'IDEA, DRC Tracking Log', 'TRUE', now],

    ['ent-sped-ref', 'iep', 'sped-reference-guide', 'SpEd Reference — Timelines, Terms, Procedural Safeguards',
      'CA TIMELINES: 15 days to respond to assessment request. 60 days to complete assessments. 30 days to hold IEP meeting. Annual IEP review. Triennial re-evaluation every 3 years. Districts frequently miss timelines without consequence unless parents track and enforce.\n\n'
      + 'COMMON DISTRICT STATEMENTS (per DRC): "We don\'t do that here" — likely wrong. "Your child doesn\'t qualify" — request assessment anyway. "We need to wait and see" — you have right to request evaluation now. "We don\'t have the budget" — FAPE is not budget-dependent. "We don\'t provide mental health services" — ERMHS is required when needed.\n\n'
      + 'KEY TERMS: FAPE (Free Appropriate Public Education). LRE (Least Restrictive Environment). IEP (Individualized Education Program). SDC (Special Day Class). NPS (Non-Public School). BIP (Behavior Intervention Plan). FBA (Functional Behavior Assessment). PWN (Prior Written Notice).\n\n'
      + 'PROCEDURAL SAFEGUARDS: Written notice of rights provided at referral, parent request, and when filing complaint. Review annually. They explain due process rights, complaint procedures, and dispute resolution.',
      'DRC, IDEA, Ed Code §56000', 'TRUE', now],

    ['ent-iep-prep', 'iep', 'iep-meeting-prep-guide', 'IEP Meeting Preparation & Advocacy',
      'DRC publishes "17 Advocacy Tips" for IEP meetings.\n\n'
      + 'PREPARATION: Review current IEP. Gather assessments. Write parent concerns letter. Collect progress data. Organize work samples showing areas of need.\n\n'
      + 'WHAT TO BRING: Current IEP, all assessments, progress reports, parent concerns letter, list of requested services/goals, someone for support.\n\n'
      + 'RECORDING: You can record the meeting with 24-hour written notice in CA.\n\n'
      + 'YOUR ROLE: You are an EQUAL member of the IEP team. Not a guest. The school may have more people, but your input has equal weight.\n\n'
      + 'YOU CAN BRING ANYONE: Parent advocate, attorney, educational consultant, family member, friend, or anyone familiar with your child.\n\n'
      + 'TRAINING: PHP Education Advocacy Workshop (monthly, Wrightslaw-based curriculum). DRC IEP Prep Worksheet. Undivided IEP Assistant tool.',
      'DRC, Wrightslaw, PHP, Undivided', 'TRUE', now],

    ['ent-psych-eval', 'iep', 'psycho-ed-eval-guide', 'Psycho-Educational Evaluation Guide',
      'Comprehensive assessment typically including cognitive (IQ), academic achievement, processing, and social-emotional measures.\n\n'
      + 'TIMELINE: 60 days from signed assessment plan to completed evaluation. Triennial re-evaluation every 3 years.\n\n'
      + 'COST: Free through school district. Private evaluations $2K-$5K+.\n\n'
      + 'IF YOU DISAGREE: Request IEE (Independent Educational Evaluation) at public expense. District must fund it or file due process to defend their own assessment.\n\n'
      + 'UNDERSTANDING RESULTS: Reports use technical jargon. DRC publishes a plain-language guide. Request the evaluator explain results in everyday language. Get a copy of the full report.\n\n'
      + 'KEY TESTS: WISC-V (cognitive), Woodcock-Johnson (academic), Vineland (adaptive behavior), BASC-3 (behavioral/emotional).',
      'DRC, IDEA, Ed Code §56381', 'TRUE', now],

    ['ent-aac', 'benefits', 'aac-guide', 'AAC — Augmentative & Alternative Communication',
      'AAC provides communication tools for individuals who cannot rely on speech alone.\n\n'
      + 'RANGE: Low-tech (picture boards, PECS) to high-tech (speech-generating devices, eye-gaze systems).\n\n'
      + 'NO PREREQUISITE SKILLS: A common myth is that children must demonstrate certain skills before AAC. FALSE — AAC is for everyone regardless of cognitive level.\n\n'
      + 'PROCESS: AAC evaluation → trial period → device selection → funding authorization → implementation + training.\n\n'
      + 'FUNDING: Insurance, Medi-Cal (EPSDT), Regional Center, IEP (school provides for educational use). Multiple funding sources can be combined.\n\n'
      + 'EYE-GAZE: Advanced systems allow non-speaking individuals to communicate by looking at words/symbols. Requires specialized training.\n\n'
      + 'KEY: Professionals may underestimate communication potential. Advocate for AAC evaluation early.',
      'ASHA, Undivided, IDEA', 'TRUE', now],

    // ═══════════════════════════════════════════════════════
    // LEGAL / DISPUTE RESOLUTION
    // ═══════════════════════════════════════════════════════

    ['ent-oah', 'rights', 'oah-guide', 'OAH — Due Process & Fair Hearings',
      'OAH (Office of Administrative Hearings) is California\'s independent state agency conducting due process hearings (SpEd) and fair hearings (RC/IHSS). Decisions are binding.\n\n'
      + 'SPED DUE PROCESS: 45 days from filing to decision. Free to file. Resolution session required first.\n\n'
      + 'RC/IHSS FAIR HEARING: 50 days. Free to file.\n\n'
      + 'ATTORNEY FEES: Prevailing parent can recover reasonable attorney fees in SpEd cases (fee-shifting).\n\n'
      + 'APPEALS: SpEd: state/federal court within 90 days. RC: Superior Court within 30 days.\n\n'
      + 'REPRESENTATION MATTERS: Families with attorneys or trained advocates have significantly better outcomes. Consider DRC, PTI advocates, or private attorneys.',
      'OAH, IDEA, W&I Code', 'TRUE', now],

    ['ent-cde-ocr', 'rights', 'cde-ocr-complaint-guide', 'CDE State Complaints & OCR Federal Complaints',
      'Two distinct complaint systems for special education violations.\n\n'
      + 'CDE STATE COMPLAINT: Alleges IDEA/state SpEd law violation within past 1 year. Any person can file. CDE must resolve within 60 days. Focuses on systemic compliance.\n\n'
      + 'OCR FEDERAL COMPLAINT: Enforces Section 504/ADA disability discrimination. File within 180 days. Covers 504, access, bullying, restraint/seclusion. Not limited to SpEd.\n\n'
      + 'KEY DIFFERENCES: Due process (OAH) = individual remedies. State complaint = systemic compliance. OCR = civil rights discrimination.\n\n'
      + 'USE BOTH: You can file state complaint AND due process simultaneously. You can file OCR while pursuing due process. Different mechanisms, different outcomes.\n\n'
      + 'UNDERUTILIZED: Many families don\'t know about state and OCR complaints.',
      'CDE, OCR, IDEA, Section 504', 'TRUE', now],

    ['ent-serr-legal', 'rights', 'serr-legal-resources-guide', 'SERR Manual & Legal Resources',
      'DRC\'s SERR (Special Education Rights and Responsibilities) manual is the most comprehensive free SpEd law resource in California. Available in multiple languages at disabilityrightsca.org.\n\n'
      + 'FINDING LEGAL HELP: DRC provides direct representation for eligible cases (800-776-5746). PHP Resource Directory lists 3,000+ providers/advocates/attorneys. COPAA maintains national attorney/advocate directory.\n\n'
      + 'FEE-SHIFTING: Prevailing parent can recover attorney fees from school district. This protects access to legal representation.\n\n'
      + 'PRO BONO: Extremely limited in CA. Start with DRC and your PTI before pursuing private attorneys. Attorney fees: $250-$500+/hour.',
      'DRC, COPAA, PHP', 'TRUE', now],

    // ═══════════════════════════════════════════════════════
    // INFRASTRUCTURE
    // ═══════════════════════════════════════════════════════

    ['ent-selpa', 'iep', 'selpa-guide', 'SELPA & Community Advisory Committee (CAC)',
      'Every school district belongs to a SELPA (Special Education Local Plan Area). SELPAs coordinate SpEd services, resources, and policy across member districts.\n\n'
      + 'WHAT SELPAs DO: Manage resource allocation. Coordinate ADR (Alternative Dispute Resolution). Provide parent education. Maintain interagency agreements with Regional Centers.\n\n'
      + 'CAC (Community Advisory Committee): Every SELPA must maintain a CAC with parent and educator representation. CAC meetings are open to public, held quarterly minimum. Excellent for networking, learning about policies, advocating for systemic change.\n\n'
      + 'MANY PARENTS DON\'T KNOW: SELPAs and CACs exist. Attending gives insight into how your district allocates resources.',
      'CA SELPA Association, CDE', 'TRUE', now],

    ['ent-fec', 'rights', 'fec-seeds-guide', 'Family Empowerment Centers & CDE Support',
      'FECs (Family Empowerment Centers) are DDS-funded nonprofits providing free training, peer support, and resource navigation for families ages 3-22. Find at californiafamilyempowermentcenters.org.\n\n'
      + 'SEEDS OF PARTNERSHIP: Coordinates FECs statewide. CDE Constituent\'s Office: 800-926-0648, M-F 8am-5pm — direct phone support for families navigating SpEd. 24-hour callback.\n\n'
      + 'STATEWIDE POLICY: ACSE (Advisory Commission on Special Education) and SCDD (State Council on Developmental Disabilities) provide statewide policy recommendations.\n\n'
      + 'WHEN TO CONTACT: When you need navigation support, peer connection, or don\'t know where to start.',
      'DDS, CDE, Seeds of Partnership', 'TRUE', now],

    ['ent-wrightslaw', 'rights', 'wrightslaw-guide', 'Wrightslaw — National SpEd Law & Advocacy Resource',
      'Wrightslaw (wrightslaw.com) is the foundational national resource for SpEd law and advocacy.\n\n'
      + 'KEY RESOURCES: Book "From Emotions to Advocacy" is essential reading. Website covers assessment, IEPs, behavior, due process, transition, Section 504, ADA.\n\n'
      + 'PHP CONNECTION: PHP runs monthly Education Advocacy Workshops based on Wrightslaw curriculum. Free and bilingual.\n\n'
      + 'WHY IT MATTERS: Understanding your legal rights and how to advocate is the difference between reactive and proactive IEP meetings.',
      'Wrightslaw, PHP', 'TRUE', now],

    // ═══════════════════════════════════════════════════════
    // ADVOCACY & SUPPORT
    // ═══════════════════════════════════════════════════════

    ['ent-drc', 'rights', 'drc-guide', 'Disability Rights California (DRC) — Free Legal Help',
      'DRC is California\'s Protection & Advocacy organization providing FREE legal services.\n\n'
      + 'CONTACT: 800-776-5746. Serves all 58 counties.\n\n'
      + 'PUBLICATIONS: SERR manual (most comprehensive SpEd law resource). RULA manual (RC law and rights). Template letters for IEP requests, complaints, correspondence. SpEd Basics Toolkit. All free, in 12+ languages.\n\n'
      + 'OCRA: Ombudsman for Clients\' Rights Advocates — provides advocates for RC clients.\n\n'
      + 'DIRECT REPRESENTATION: For eligible cases (prioritizes systemic impact). Also provides phone consultations and written guidance.\n\n'
      + 'WHY DRC MATTERS: Created by attorneys who know CA SpEd law intimately. Always start with DRC.',
      'DRC, Protection & Advocacy Act', 'TRUE', now],

    ['ent-ca-ptis', 'rights', 'ca-pti-guide', 'California Parent Training & Information Centers',
      'California has 5 PTIs serving different regions, all free and bilingual English/Spanish.\n\n'
      + 'DREDF: 30 Northern CA counties. SpEd advocacy + civil rights. 800-253-2103. dredf.org.\n\n'
      + 'MATRIX Parent Network: Marin, Napa, Solano, Sonoma. Parent advisors, Sibshops, father groups. 800-578-2592. matrixparents.org.\n\n'
      + 'TASK: Imperial, LA, Orange, Riverside, San Bernardino, San Diego. AT Center, Camp TECHIE. 866-828-8275. taskca.org.\n\n'
      + 'EPU Children\'s Center: Central CA (12 counties — Merced, Madera, SLO, Santa Barbara, Ventura, Tulare, Kings, Kern, Inyo, Mono, Mariposa, Fresno). 844-445-0305.\n\n'
      + 'PHP (Parents Helping Parents): Santa Clara, San Mateo, Santa Cruz, San Benito, Monterey. Wrightslaw workshops, 3,000+ provider directory, peer support. 408-727-5775. php.com.\n\n'
      + 'ALL ARE FREE. All bilingual English/Spanish. Start with your regional PTI.',
      'IDEA Part D, PTI Network', 'TRUE', now],

    ['ent-national-advocacy', 'rights', 'national-advocacy-guide', 'National Advocacy Organizations & Parent Support',
      'Key national organizations providing free resources, peer support, and advocacy training.\n\n'
      + 'CPIR / Parent Center Hub (parentcenterhub.org): 1,100+ resources. Every state has at least one PTI. Free guides on IEPs, 504, transitions, dispute resolution.\n\n'
      + 'COPAA: Protects 9.5M children with disabilities. Attorney/advocate directory. SEAT certification. Files amicus briefs. copaa.org.\n\n'
      + 'P2P USA (Parent to Parent): Peer matching in all 50 states. Trained Support Parents with lived experience. Free. p2pusa.org.\n\n'
      + 'Understood.org: Serves 70M people. SLD/ADHD guides, Through My Eyes simulations, AAP partnership. understood.org.\n\n'
      + 'Hands & Voices: Deaf/Hard of Hearing families. ASTra advocacy program. handsandvoices.org.\n\n'
      + 'Family Voices: Children with special health care needs. F2F in every state. familyvoices.org.',
      'CPIR, COPAA, P2P USA, Understood.org', 'TRUE', now],

    // ═══════════════════════════════════════════════════════
    // FINANCIAL PLANNING
    // ═══════════════════════════════════════════════════════

    ['ent-calable', 'benefits', 'calable-guide', 'CalABLE Account — Tax-Advantaged Savings',
      'CalABLE is a tax-advantaged savings account for people with disabilities. Simpler and cheaper than a Special Needs Trust.\n\n'
      + 'ELIGIBILITY: Disability onset before age 26. Must be SSI/SSDI recipient OR have written diagnosis from licensed physician.\n\n'
      + 'HOW IT WORKS: Enroll online at CalABLE.ca.gov. Choose investment options. Contribute up to ~$18K/year.\n\n'
      + 'SSI INTERACTION: First $100K excluded from SSI resource limit. Over $100K: SSI suspended (NOT Medi-Cal — Medi-Cal protected regardless).\n\n'
      + 'ALLOWABLE USES: Housing, education, health, transportation, assistive technology, employment support, nutrition.\n\n'
      + 'VS SNT: CalABLE is simpler, cheaper (free online enrollment vs $2,500+ for SNT). Has contribution limit; SNT does not. Many families use both.\n\n'
      + 'KEY TIP: Open CalABLE even if you can only contribute small amounts. Creates a protected savings vehicle.',
      'CalABLE Act, ABLE Act', 'TRUE', now],

    ['ent-snt', 'benefits', 'snt-guide', 'Special Needs Trust (SNT) — Protecting Assets',
      'An SNT protects assets without losing SSI and Medi-Cal.\n\n'
      + 'FIRST-PARTY SNT: Funded with beneficiary\'s own assets (inheritance, settlement). Required Medicaid payback on death.\n\n'
      + 'THIRD-PARTY SNT: Funded with others\' assets (parents, grandparents). No Medicaid payback. Can be set up in estate plan.\n\n'
      + 'COST: Attorney fees $2,500-$7,000+. Pooled SNTs through nonprofits (e.g., PLAN of CA) are lower cost.\n\n'
      + 'TRUSTEE TIPS: Some payments (rent, food directly to beneficiary) can reduce SSI. Pay for disability-related expenses: medical costs, therapy copays, technology, recreation, personal care.\n\n'
      + 'WHEN NEEDED: If child may receive inheritance, settlement, or back-pay from SSI/SSDI. If you want to leave money without affecting benefits. If child turning 18 and may receive assets.\n\n'
      + 'CalABLE + SNT can complement each other.',
      '42 USC §1396p, OBRA 1993', 'TRUE', now],

    ['ent-conserv', 'transitions', 'conservatorship-guide', 'Conservatorship vs. Supported Decision-Making',
      'At age 18, your child becomes a legal adult. If they cannot manage their own affairs, you may need to establish legal authority.\n\n'
      + 'SUPPORTED DECISION-MAKING (SDM): Least restrictive. No court required. Free. Child retains all legal rights. Recognized in CA since 2023. RECOMMENDED FIRST OPTION.\n\n'
      + 'POWER OF ATTORNEY: Child voluntarily grants authority over specific areas. Requires capacity to understand what they\'re signing.\n\n'
      + 'LIMITED CONSERVATORSHIP: For RC-eligible adults. Court grants authority over specific areas (7 possible powers). Filing ~$500-800, attorney $2K-$5K+. Process 3-6 months. Fee waivers available.\n\n'
      + 'FULL CONSERVATORSHIP: Most restrictive. Generally NOT appropriate for developmental disabilities.\n\n'
      + 'TIMELINE: Start planning 6-12 months before 18th birthday.\n\n'
      + 'ALWAYS START WITH LEAST RESTRICTIVE: SDM first, then POA, then Limited Conservatorship only if needed.',
      'Probate Code, AB 1663, W&I Code', 'TRUE', now],

    // ═══════════════════════════════════════════════════════
    // JOURNEY MAPS
    // ═══════════════════════════════════════════════════════

    ['ent-autism-journey', 'navigation', 'autism-journey', 'Autism Journey Map — From Diagnosis to Services',
      'Autism affects 1 in 36 children (2.8%). DSM-5 299.00. Lanterman Act eligible. Average 12-18 months from first concern to full services.\n\n'
      + 'PHASE 1 — CONCERN & SCREENING: Document behaviors. Video record. Use CDC Milestone Tracker. M-CHAT-R/F screening at 18 and 24 months. Do NOT "wait and see." Self-refer to RC — no doctor needed.\n\n'
      + 'PHASE 2 — DIAGNOSIS & INTAKE: RC intake (120-day timeline). Dev pediatrician wait 3-6 months. If under 3: Early Start (45-day IFSP). If 3+: school district assessment simultaneously.\n\n'
      + 'PHASE 3 — SERVICE SETUP: IPP with RC. Insurance auth for ABA (SB 946). IEP with school. Apply Medi-Cal, IHSS.\n\n'
      + 'PHASE 4 — ONGOING: Annual IPP. Annual IEP. ABA re-auth every 6 months. Monitor progress.\n\n'
      + 'PHASE 5 — TRANSITIONS: Age 3 (Early Start→IEP). Age 14-16 (ITP begins). Age 18 (SSI adult re-eval, conservatorship/SDM, adult RC services). Age 22 (school ends).\n\n'
      + 'COMMON PITFALLS: Waiting for diagnosis before contacting RC. Accepting verbal denials. Not knowing about IHSS parent-as-provider. Missing 10-day Aid Paid Pending window. Not applying for SSI at 18.\n\n'
      + 'KEY RESOURCES: CHADD, Autism Speaks 100 Day Kit, PTIs, DRC.',
      'Lanterman Act, IDEA, SB 946, CDC, DRC', 'TRUE', now],

    ['ent-pda-journey', 'navigation', 'pda-journey', 'PDA (Pathological Demand Avoidance) Journey Map',
      'PDA is NOT a DSM-5 diagnosis. Navigated through autism/ASD pathways. Affects 2-5% of autistic individuals. Traditional ABA/reward systems often counterproductive.\n\n'
      + 'PHASE 1 — RECOGNITION: PDA is anxiety-driven avoidance of ALL perceived demands — even fun activities. Key markers: social manipulation strategies, surface sociability, extreme mood variability, comfort in role-play. EDA-Q screening at pdanorthamerica.org. NOT ordinary defiance.\n\n'
      + 'PHASE 2 — EDUCATION: PDA Society UK is gold standard resource. Low Demand Parenting (Amanda Diekman). Declarative Language Handbook. U.S. pathway: PDA → ASD evaluation → RC + IEP.\n\n'
      + 'PHASE 3 — EVALUATION: Find PDA-informed clinician (PDANA provider directory). Prepare 1-page PDA Profile Summary. Present within ASD evaluation. Clinician documents PDA characteristics.\n\n'
      + 'PHASE 4 — SERVICE ACCESS: Request low-demand, collaborative approach in IPP and IEP. ERMHS critical for school anxiety. Traditional ABA often INCREASES distress.\n\n'
      + 'PHASE 5 — SCHOOL: IEP accommodations for demand avoidance. Reduced homework, flexible attendance, anxiety-based supports. BIP must understand avoidance as anxiety, not defiance. NPS or home/hospital if school refusal.\n\n'
      + 'CRITICAL: Most U.S. clinicians don\'t know about PDA. Parents often blamed. Child frequently misdiagnosed as ODD.',
      'PDA Society UK, PDANA, Amanda Diekman, EDA-Q', 'TRUE', now],

    ['ent-adhd-journey', 'navigation', 'adhd-journey', 'ADHD Journey Map — Screening to School Services',
      '1 in 9 children (7.1M U.S.). DSM-5 recognized. 78% have co-occurring conditions. Three presentations: Inattentive (missed esp. in girls), Hyperactive-Impulsive, Combined.\n\n'
      + 'PHASE 1 — RECOGNITION: Vanderbilt Assessment Scales (#1 tool). Get BOTH teacher and parent forms. Free at nichq.org/adhd-toolkit.\n\n'
      + 'PHASE 2 — EVALUATION: Pediatrician screening. Complex cases: dev-behavioral pediatrician (UCSF, Stanford, UC Davis MIND, UCLA). Ages 4-5: behavioral therapy first. Ages 6+: medication + behavioral therapy.\n\n'
      + 'PHASE 3 — SCHOOL: ADHD does NOT qualify for Regional Center (unless co-occurring DD). School district is primary. IEP under OHI (Other Health Impairment) OR 504 plan.\n\n'
      + 'PHASE 4 — TREATMENT: Medication management. Behavioral therapy. Executive function coaching. Parent training (CHADD, ADDitude).\n\n'
      + 'PHASE 5 — TRANSITIONS: ITP at 16. College accommodations. DOR if employment barriers.\n\n'
      + 'KEY RESOURCES: CHADD (local chapters, parent training), ADDitude Magazine, Understood.org, AACAP.',
      'DSM-5, CHADD, ADDitude, Understood.org, AACAP', 'TRUE', now],

    ['ent-sli-journey', 'navigation', 'sli-journey', 'SLI (Speech/Language Impairment) Journey Map',
      '7-8% prevalence (1 in 14). 2nd largest SpEd category in CA (181K students). Covers Speech Sound Disorders, Language Disorders (DLD), Stuttering, Voice Disorders.\n\n'
      + 'PHASE 1 — RECOGNITION: ASHA milestones: 12mo = 1-2 words, 24mo = 50+ words, 36mo = 3-word sentences. Not babbling by 9 months is red flag. MUST rule out hearing loss first.\n\n'
      + 'PHASE 2 — EARLY INTERVENTION (0-3): Early Start through RC. IFSP. Hanen "It Takes Two to Talk" widely used. Services in natural environments.\n\n'
      + 'PHASE 3 — SCHOOL AGE: IEP under Speech/Language Impairment. District SLP provides therapy. School-based vs clinic-based have different scopes.\n\n'
      + 'PHASE 4 — AAC: For children who cannot rely on speech alone. No prerequisite skills. Low-tech to high-tech.\n\n'
      + 'BILINGUAL: Bilingualism does NOT cause SLI. Assessment must be culturally/linguistically appropriate. ASHA bilingual assessment position.\n\n'
      + 'RC ELIGIBILITY: CONDITIONAL — only if speech delay is part of qualifying developmental disability. School district is sole provider for speech-only.\n\n'
      + 'KEY RESOURCES: ASHA ProFind (SLP directory), Hanen Centre, NSA (stuttering), Reading Rockets.',
      'ASHA, Hanen, NSA, IDEA', 'TRUE', now],

    ['ent-sld-journey', 'navigation', 'sld-journey', 'SLD (Specific Learning Disability) Journey Map',
      'LARGEST SpEd category in CA (280,122 students, 32.9%). Includes dyslexia, dyscalculia, dysgraphia. NO Regional Center — school district only.\n\n'
      + 'PHASE 1 — CONCERN: Homework takes 3-4x expected time. Strong verbal skills but struggles with reading/math. Dyslexia = ~80% of LD. Matthew Effect: gap widens dramatically after 2nd grade.\n\n'
      + 'PHASE 2 — MTSS/RTI: Schools use RTI. CRITICAL: RTI CANNOT delay evaluation. Parent can request at ANY time. OSEP confirmed.\n\n'
      + 'PHASE 3 — EVALUATION: Psycho-educational eval: cognitive + achievement + processing skills. 60 days from consent.\n\n'
      + 'PHASE 4 — IEP: Specialized instruction (not just accommodations). Evidence-based reading: Orton-Gillingham, structured literacy. Measurable goals.\n\n'
      + 'PHASE 5 — ACCOMMODATIONS: Extended time, audio texts, speech-to-text, calculators, reduced homework. Assistive technology.\n\n'
      + 'TWICE EXCEPTIONAL (2e): Gifted + LD. May mask until middle school. Needs both enrichment AND specialized instruction.\n\n'
      + 'TAX BENEFITS: Private tutoring/evaluation may be deductible with physician letter.\n\n'
      + 'KEY RESOURCES: Understood.org, IDA, LDA, Decoding Dyslexia CA, Wrightslaw.',
      'IDEA, Understood.org, IDA, LDA, Wrightslaw', 'TRUE', now],

    ['ent-id-journey', 'navigation', 'id-journey', 'ID (Intellectual Disability) Journey Map',
      '1-3% prevalence. IQ ≤70 + adaptive deficits. Lifelong. Lanterman Act eligible. DUAL SYSTEM: School District (IEP) + Regional Center (IPP).\n\n'
      + 'PHASE 1 — RECOGNITION: Severe ID identified at birth (Down syndrome, genetic conditions). Milder ID may not surface until preschool/school age. DSM-5 severity based on ADAPTIVE functioning, not IQ alone.\n\n'
      + 'PHASE 2 — RC INTAKE: ID is one of 5 Lanterman Act qualifying conditions. Self-refer at any age. RC provides Early Start (0-3), ongoing service coordination (3+). School district provides IEP simultaneously.\n\n'
      + 'PHASE 3 — EVALUATION: Cognitive testing (WISC-V, Stanford-Binet). Adaptive behavior (Vineland, ABAS-3). Developmental history. Medical evaluation.\n\n'
      + 'PHASE 4 — SERVICES: IEP + IPP simultaneously. Speech, OT, PT, behavioral supports. ERMHS for social-emotional needs.\n\n'
      + 'PHASE 5 — TRANSITIONS: Age 18: SSI adult criteria, conservatorship/SDM, adult RC services. Age 22: school ends. DOR for employment. Supported living options.\n\n'
      + 'SELF-DETERMINATION PROGRAM: CA program for RC clients to direct their own services.\n\n'
      + 'KEY RESOURCES: The Arc, FRCNCA, UC Davis MIND Institute (Padres Para Padres), PHP, UCP.',
      'Lanterman Act, IDEA, The Arc, UC Davis MIND', 'TRUE', now],

    // ═══════════════════════════════════════════════════════
    // REFERENCE & NATIONAL RESOURCES
    // ═══════════════════════════════════════════════════════

    ['ent-diagnosis-matrix', 'navigation', 'diagnosis-eligibility-matrix', 'Diagnosis → Service Eligibility Quick Reference',
      'Different diagnoses qualify for different services in California.\n\n'
      + 'AUTISM: RC YES, IEP YES, SSI YES, IHSS YES, CCS conditional, Early Start YES.\n'
      + 'INTELLECTUAL DISABILITY: RC YES, IEP YES, SSI YES, IHSS YES, CCS conditional, Early Start YES.\n'
      + 'CEREBRAL PALSY: RC YES, IEP YES, CCS YES, SSI YES, IHSS YES, Early Start YES.\n'
      + 'EPILEPSY: RC YES, IEP YES, 504 YES, SSI YES, CCS YES, Early Start YES.\n'
      + 'DOWN SYNDROME: RC YES, IEP YES, SSI YES, IHSS YES, CCS conditional, Early Start YES.\n'
      + 'ADHD ONLY: RC NO, IEP conditional (OHI), 504 YES, IHSS NO, CCS NO.\n'
      + 'SPECIFIC LEARNING DISABILITY: RC NO, IEP YES, 504 YES, IHSS NO, CCS NO.\n'
      + 'SPEECH/LANGUAGE ONLY: RC conditional, IEP YES, 504 YES, IHSS NO, CCS NO.\n'
      + 'TRAUMATIC BRAIN INJURY: RC YES, IEP YES, CCS conditional, SSI YES, IHSS YES.\n'
      + 'DEAF/HARD OF HEARING: RC conditional, IEP YES, CCS conditional, SSI YES.\n'
      + 'EMOTIONAL DISTURBANCE: RC conditional, IEP YES, ERMHS YES, 504 YES.\n'
      + 'DYSLEXIA/DYSCALCULIA: RC NO, IEP YES, 504 YES, IHSS NO, CCS NO.\n'
      + 'MULTIPLE DISABILITIES: RC YES, IEP YES, SSI YES, IHSS YES, CCS YES, ERMHS YES, AAC YES.\n\n'
      + 'NOTE: "Conditional" means eligibility depends on severity, documentation, or comorbid conditions. Always verify with the specific agency.',
      'DDS, CDE, SSA', 'TRUE', now],

    ['ent-pti-map', 'navigation', 'ca-pti-coverage-map', 'CA PTI Coverage Map — Find Your Resources',
      'DREDF: 30 Northern CA counties (including Alameda, Contra Costa, Sacramento, San Joaquin + 26 more). 800-253-2103.\n\n'
      + 'MATRIX: Marin, Napa, Solano, Sonoma. 800-578-2592.\n\n'
      + 'TASK: Imperial, Los Angeles, Orange, Riverside, San Bernardino, San Diego. 866-828-8275.\n\n'
      + 'EPU: Fresno, Inyo, Kern, Kings, Madera, Mariposa, Merced, Mono, San Luis Obispo, Santa Barbara, Tulare, Ventura. 844-445-0305.\n\n'
      + 'PHP: Santa Clara, San Mateo, Santa Cruz, San Benito, Monterey. 408-727-5775.\n\n'
      + 'STATEWIDE: DRC (all 58 counties, 800-776-5746). FECs (varies by location, californiafamilyempowermentcenters.org). CDE Constituent\'s Office (all counties, 800-926-0648).\n\n'
      + 'PAID: Undivided ($115/mo, CA statewide). FREE: EdNavigator (national, ednavigator.org).',
      'IDEA Part D, PTI Network, CDE', 'TRUE', now],

    ['ent-age-timeline', 'navigation', 'age-navigation-timeline', 'Age-Based Navigation Timeline',
      'BIRTH-3: Early Start/RC, IFSP within 45 days, transition planning at 2.5, IEP by 3rd birthday. Open CalABLE account.\n\n'
      + 'AGES 3-5: IEP in place by 3rd birthday. Preschool placement. Apply SSI, IHSS. CalABLE.\n\n'
      + 'AGES 5-11: Annual IEP. Triennial re-eval. Track service delivery (DRC log). IEE rights. Request additional assessments if new concerns. CalABLE.\n\n'
      + 'AGES 11-14: Middle school transition IEP. ERMHS if needed. Prepare for ITP discussion. CalABLE.\n\n'
      + 'AGES 14-17: ITP required at 16. Connect DOR. Post-secondary planning. Diploma vs Certificate decision. CalABLE.\n\n'
      + 'AGES 18-22: SSI adult re-eval (apply immediately). Age of majority. Conservatorship/SDM decision. IEP until 22 or diploma. RC adult services.\n\n'
      + 'AGES 22+: RC IPP. Supported living. Employment support (DOR/RC). IHSS. SSI CDR monitoring.\n\n'
      + 'PLANNING: At each age, know what\'s coming next. Start transition planning 6-12 months early.',
      'IDEA, DDS, SSA, CalABLE', 'TRUE', now],

    ['ent-equity', 'rights', 'equity-disparities', 'Equity Disparities in California Disability Services',
      'Significant disparities exist across California\'s disability service systems.\n\n'
      + 'REGIONAL CENTER: White children receive ~2x more spending than Latino children at 17 of 21 RCs. South Central LA RC: $1,991/child with ASD vs Orange County RC: $18,356 — 9x difference. DDS $66M equity initiative.\n\n'
      + 'SCHOOLS: Hispanic/Latino 40% less likely identified with autism. Black children misdiagnosed with ID instead of autism. 10K+ teacher vacancies in rural/low-income. Black disabled students 3.63x more likely referred to law enforcement (DREDF data).\n\n'
      + 'WHAT YOU CAN DO: Request all available services — don\'t accept only what\'s offered. Ask specifically about services other families receive. Request documents in your preferred language. File 4731 complaint if RC not providing equitable services.\n\n'
      + 'SYSTEMIC SUPPORTS: DDS SAE grants fund disparity reduction. AB 1208 requires standardized quality measures. You have the right to appeal in your preferred language.',
      'DDS SAE Data, Public Counsel 2022, AB 1208, DREDF', 'TRUE', now],

    ['ent-national-adhd-sli', 'navigation', 'national-adhd-sli-resources', 'National Resources — ADHD & Speech-Language',
      'CHADD (chadd.org): Local chapters across U.S. Parent-to-Parent training. CDC-funded ADHD resource center. 800-233-4050.\n\n'
      + 'ADDitude Magazine (additudemag.com): Free ADHD guides, screening tools, medication info, parenting strategies.\n\n'
      + 'AACAP (aacap.org): Clinical guidelines for ADHD and child mental health. Medication treatment guides.\n\n'
      + 'ASHA (asha.org): 247,000+ SLPs. ProFind professional directory by ZIP. Developmental milestones. Bilingual assessment guidance.\n\n'
      + 'Hanen Centre (hanen.org): Evidence-based parent coaching. "It Takes Two to Talk" for language development. SLP training.\n\n'
      + 'NSA (westutter.org): Stuttering support groups, family programs, peer support.',
      'CHADD, ADDitude, AACAP, ASHA, Hanen, NSA', 'TRUE', now],

    ['ent-national-idd', 'navigation', 'national-idd-ld-resources', 'National Resources — IDD & Learning Disabilities',
      'The Arc (thearc.org): Largest IDD advocacy org. 600+ local chapters. Achieve with Us employment. Policy advocacy.\n\n'
      + 'FRCNCA (frcnca.org): CA family support network. Peer mentoring, advocacy training, language-accessible services.\n\n'
      + 'UC Davis MIND Institute: Peer support groups. Padres Para Padres (Spanish-language). Research-based info.\n\n'
      + 'UCP (ucp.org): My Child Without Limits parent resource. Provider locator. Family support.\n\n'
      + 'NCLD (ncld.org): LD policy advocacy. Family advocacy initiative. Evidence-based guides.\n\n'
      + 'LDA (ldaamerica.org): 200+ chapters. Sample evaluation request letters. LD resources.\n\n'
      + 'OAR (researchautism.org): Evidence-based autism practice resources. Life Journey Through Autism guides. Classroom grants.',
      'The Arc, FRCNCA, UC Davis MIND, UCP, NCLD, LDA, OAR', 'TRUE', now],

  ];

  // Batch write all entries at once for performance
  if (entries.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, entries.length, entries[0].length).setValues(entries);
  }

  return { success: true, message: 'Added ' + entries.length + ' Entity Navigation Matrix v9.4 KB articles' };
}


// ═══════════════════════════════════════════════════════
// SETUP — Run once to initialize everything
// ═══════════════════════════════════════════════════════

function setupWaypoint() {
  initSheets();
  seedKnowledgeBase();
  seedPrompts();
  initQASheet_();
  return { success: true, message: 'Waypoint AI Engine initialized. Add your ANTHROPIC_API_KEY in Project Settings → Script Properties.' };
}

// ═══════════════════════════════════════════════════════
// QA TESTING SYSTEM — Systematic test & feedback loop
// ═══════════════════════════════════════════════════════

function initQASheet_() {
  getOrCreateSheet_('QATests', [
    'id', 'question', 'expectedCategory', 'expectedTone', 'expectedBehavior',
    'actualCategory', 'actualTone', 'toneCorrect', 'categoryCorrect',
    'response', 'rating', 'feedback', 'runAt', 'status'
  ]);
}

/**
 * Load all QA test cases from the QATests sheet
 */
function getQATests() {
  try {
    initQASheet_();
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('QATests');
    if (!sheet || sheet.getLastRow() <= 1) return { success: true, tests: [] };

    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var tests = [];
    for (var i = 1; i < data.length; i++) {
      var row = {};
      for (var j = 0; j < headers.length; j++) {
        row[headers[j]] = data[i][j];
      }
      tests.push(row);
    }
    return { success: true, tests: tests };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * Add a new QA test case
 */
function addQATest(question, expectedCategory, expectedTone, expectedBehavior) {
  try {
    initQASheet_();
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('QATests');
    var id = 'qa-' + Date.now();
    sheet.appendRow([
      id, question, expectedCategory || '', expectedTone || '', expectedBehavior || '',
      '', '', '', '', '', '', '', '', 'pending'
    ]);
    return { success: true, id: id };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * Run a single QA test — sends the question through the full pipeline and records results
 */
function runQATest(testId, userProfile) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('QATests');
    if (!sheet || sheet.getLastRow() <= 1) return { success: false, error: 'No tests found' };

    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var idCol = headers.indexOf('id');
    var qCol = headers.indexOf('question');
    var expCatCol = headers.indexOf('expectedCategory');
    var expToneCol = headers.indexOf('expectedTone');
    var actCatCol = headers.indexOf('actualCategory');
    var actToneCol = headers.indexOf('actualTone');
    var toneCorrCol = headers.indexOf('toneCorrect');
    var catCorrCol = headers.indexOf('categoryCorrect');
    var respCol = headers.indexOf('response');
    var runAtCol = headers.indexOf('runAt');
    var statusCol = headers.indexOf('status');

    // Find the test row
    var rowIdx = -1;
    for (var i = 1; i < data.length; i++) {
      if (data[i][idCol] === testId) { rowIdx = i + 1; break; }
    }
    if (rowIdx < 0) return { success: false, error: 'Test not found: ' + testId };

    var question = data[rowIdx - 1][qCol];
    var expectedCat = data[rowIdx - 1][expCatCol];
    var expectedTone = data[rowIdx - 1][expToneCol];

    // Run through the full AI pipeline
    var result = askWaypoint(question, userProfile || {});

    // Score classification accuracy
    var catCorrect = expectedCat ? (result.category === expectedCat ? 'YES' : 'NO') : 'N/A';
    var toneCorrect = expectedTone ? (result.tone_level === expectedTone ? 'YES' : 'NO') : 'N/A';

    // Write results back to sheet
    sheet.getRange(rowIdx, actCatCol + 1).setValue(result.category || '');
    sheet.getRange(rowIdx, actToneCol + 1).setValue(result.tone_level || '');
    sheet.getRange(rowIdx, toneCorrCol + 1).setValue(toneCorrect);
    sheet.getRange(rowIdx, catCorrCol + 1).setValue(catCorrect);
    sheet.getRange(rowIdx, respCol + 1).setValue(JSON.stringify(result).substring(0, 5000));
    sheet.getRange(rowIdx, runAtCol + 1).setValue(new Date().toISOString());
    sheet.getRange(rowIdx, statusCol + 1).setValue('tested');

    return {
      success: true,
      testId: testId,
      question: question,
      category: result.category,
      tone_level: result.tone_level,
      categoryCorrect: catCorrect,
      toneCorrect: toneCorrect,
      empathy: result.empathy,
      answer: result.answer,
      action_steps: result.action_steps,
      rights_reminder: result.rights_reminder,
      watch_out: result.watch_out,
      offer_to_draft: result.offer_to_draft,
      sources: result.sources
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * Save rating and feedback for a QA test
 */
function rateQATest(testId, rating, feedback) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('QATests');
    if (!sheet || sheet.getLastRow() <= 1) return { success: false };

    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var idCol = headers.indexOf('id');
    var ratingCol = headers.indexOf('rating');
    var fbCol = headers.indexOf('feedback');
    var statusCol = headers.indexOf('status');

    for (var i = 1; i < data.length; i++) {
      if (data[i][idCol] === testId) {
        sheet.getRange(i + 1, ratingCol + 1).setValue(rating);
        sheet.getRange(i + 1, fbCol + 1).setValue(feedback || '');
        sheet.getRange(i + 1, statusCol + 1).setValue('reviewed');
        return { success: true };
      }
    }
    return { success: false, error: 'Test not found' };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * Get QA summary metrics
 */
function getQAMetrics() {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('QATests');
    if (!sheet || sheet.getLastRow() <= 1) return { success: true, metrics: { total: 0 } };

    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var catCorrCol = headers.indexOf('categoryCorrect');
    var toneCorrCol = headers.indexOf('toneCorrect');
    var ratingCol = headers.indexOf('rating');
    var statusCol = headers.indexOf('status');
    var catCol = headers.indexOf('actualCategory');

    var total = data.length - 1;
    var tested = 0, reviewed = 0;
    var catCorrect = 0, catTotal = 0;
    var toneCorrect = 0, toneTotal = 0;
    var ratingSum = 0, ratingCount = 0;
    var catBreakdown = {};

    for (var i = 1; i < data.length; i++) {
      var status = data[i][statusCol];
      if (status === 'tested' || status === 'reviewed') tested++;
      if (status === 'reviewed') reviewed++;

      if (data[i][catCorrCol] === 'YES') { catCorrect++; catTotal++; }
      else if (data[i][catCorrCol] === 'NO') { catTotal++; }

      if (data[i][toneCorrCol] === 'YES') { toneCorrect++; toneTotal++; }
      else if (data[i][toneCorrCol] === 'NO') { toneTotal++; }

      var r = Number(data[i][ratingCol]);
      if (r > 0) { ratingSum += r; ratingCount++; }

      var cat = data[i][catCol];
      if (cat) {
        if (!catBreakdown[cat]) catBreakdown[cat] = { count: 0, ratingSum: 0, ratingCount: 0 };
        catBreakdown[cat].count++;
        if (r > 0) { catBreakdown[cat].ratingSum += r; catBreakdown[cat].ratingCount++; }
      }
    }

    return {
      success: true,
      metrics: {
        total: total,
        tested: tested,
        reviewed: reviewed,
        pending: total - tested,
        categoryAccuracy: catTotal > 0 ? Math.round(catCorrect / catTotal * 100) : null,
        toneAccuracy: toneTotal > 0 ? Math.round(toneCorrect / toneTotal * 100) : null,
        avgRating: ratingCount > 0 ? (ratingSum / ratingCount).toFixed(1) : null,
        categoryBreakdown: catBreakdown
      }
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * Seed starter QA test questions covering all categories and tone levels
 */
function seedQATests() {
  var tests = [
    // Regional Center — collaborative
    ['How do I apply to Regional Center for my 2-year-old?', 'regional-center', 'collaborative', 'Should explain intake process, 120-day timeline, Early Start. No legal jargon.'],
    ['What paperwork do I need for RC reimbursement of pre-authorized respite?', 'regional-center', 'collaborative', 'Focus on forms, receipts, submission process. No Lanterman Act citations.'],
    // Regional Center — assertive
    ['My service coordinator hasn\'t returned my calls in 3 weeks about adding ABA to the IPP', 'regional-center', 'assertive', 'Firm advice on escalation, mention right to IPP meeting within 30 days. Not heavy legal.'],
    // Regional Center — adversarial
    ['RC denied our request for respite hours and I want to file a fair hearing', 'regional-center', 'adversarial', 'Should cite §4710.5, Aid Paid Pending 10-day rule, OAH process. Full legal support.'],

    // IEP — collaborative
    ['How should I prepare for my first IEP meeting?', 'iep', 'collaborative', 'Practical prep advice, what to bring, questions to ask. No legal threats.'],
    ['Can I record the IEP meeting?', 'iep', 'collaborative', 'Yes with 24hr notice, cite Ed Code §56341.1 if helpful, but keep it friendly.'],
    // IEP — assertive
    ['The school is 2 months late on completing my child\'s evaluation', 'iep', 'assertive', 'Mention 60-day timeline, suggest written follow-up, firm but not threatening.'],
    // IEP — adversarial
    ['School refuses to evaluate my child and won\'t give me prior written notice', 'iep', 'adversarial', 'Cite IDEA PWN requirements, mention CDE complaint and due process rights.'],

    // Benefits — collaborative
    ['What is IHSS and how do I apply as a parent provider?', 'benefits', 'collaborative', 'Explain IHSS, application steps, parent provider option. Practical and encouraging.'],
    ['How does CalABLE work with SSI?', 'benefits', 'collaborative', 'Explain $100K threshold, SSI interaction, tax benefits. Informational.'],

    // Insurance — collaborative
    ['Does my insurance cover ABA therapy for autism?', 'insurance', 'collaborative', 'Explain SB 946, how to verify with plan. Don\'t assume a fight.'],
    // Insurance — adversarial
    ['Insurance denied ABA therapy saying it\'s not medically necessary', 'insurance', 'adversarial', 'Cite SB 946, explain appeal + IMR process, DMHC 60% overturn rate.'],

    // Rights — assertive
    ['What are my rights if RC reduces my child\'s services?', 'rights', 'assertive', 'Explain Notice of Action, fair hearing, Aid Paid Pending. Educational but empowering.'],

    // Navigation — collaborative
    ['I just got my child\'s autism diagnosis, where do I start?', 'navigation', 'collaborative', 'Warm overview of RC, school, insurance paths. One or two next steps.'],
    ['What\'s the difference between RC and the school district?', 'navigation', 'collaborative', 'Clear comparison, no legal jargon, practical guidance.'],

    // Transitions — collaborative
    ['My child is turning 3, what happens with Early Start?', 'transitions', 'collaborative', 'Explain transition to IEP, keep RC services. Practical timeline.'],

    // Edge cases / nuance
    ['I submitted my reimbursement claim to RC but it\'s been 60 days with no payment', 'regional-center', 'assertive', 'For pre-authorized: focus on follow-up process. Mention escalation if needed but not full legal.'],
    ['RC says they don\'t fund swim lessons but my doctor recommended aquatic therapy', 'regional-center', 'assertive', 'Distinguish recreational vs therapeutic, suggest IPP amendment with medical documentation.'],
  ];

  var count = 0;
  tests.forEach(function(t) {
    addQATest(t[0], t[1], t[2], t[3]);
    count++;
  });

  return { success: true, message: 'Seeded ' + count + ' QA test cases' };
}

/**
 * Round 2: Creative stress-test QA questions — edge cases, multi-system,
 * emotional, ambiguous tone, unusual family structures, and tricky scenarios
 */
function seedQATestsRound2() {
  var tests = [
    // ─── MULTI-SYSTEM COLLISIONS (which system owns this?) ───
    ['My son gets speech therapy through his IEP but RC also has speech in his IPP — who is supposed to be paying and are we getting double-billed?',
      'navigation', 'collaborative',
      'Should explain payer-of-last-resort, school vs RC responsibilities for speech. No legal escalation. Should ask clarifying questions about the IPP and IEP details.'],

    ['Insurance denied OT, the school says OT isn\'t educationally necessary, and RC says insurance should cover it. My kid has no OT now. Nobody will pay.',
      'rights', 'assertive',
      'Classic finger-pointing scenario. Should identify that RC is payer of last resort. Should ask what denials they have in writing. Firm but not adversarial yet.'],

    // ─── EMOTIONAL CRISIS / EMPATHY TESTS ───
    ['I found out yesterday my 18-month-old has cerebral palsy and I haven\'t stopped crying. I don\'t even know what questions to ask. Please help.',
      'navigation', 'collaborative',
      'MUST lead with deep emotional support — this is a raw, fresh diagnosis moment. One simple next step (call RC). Mention parent support groups. DO NOT overwhelm with legal rights or five systems.'],

    ['I feel like the worst parent in the world because I missed the 10-day window to file Aid Paid Pending and now my daughter is losing her respite hours next week',
      'rights', 'assertive',
      'Must NOT make the parent feel worse. Acknowledge the stress. Explain what options remain (can still file fair hearing within 60 days, just without APR). Offer to help draft. Empathetic, not clinical.'],

    // ─── AMBIGUOUS TONE (could go either way) ───
    ['My service coordinator told me over the phone that RC doesn\'t cover parent training but I\'ve heard other families get it',
      'regional-center', 'assertive',
      'Tricky: verbal denial only. Should ask if they got anything in writing. Explain that RC does fund parent training for many families. Should NOT jump to "file a complaint" — should first suggest asking for the denial in writing and requesting an IPP meeting.'],

    ['The school keeps canceling my IEP meeting — this is the third time in two months',
      'iep', 'assertive',
      'Should ask clarifying question: how are they canceling? By phone? Email? Are they offering new dates? Then provide firm guidance about right to timely meeting. Should suggest putting the request in writing.'],

    // ─── UNUSUAL FAMILY STRUCTURES ───
    ['I\'m the grandmother raising my grandchild with Down syndrome. I don\'t have legal guardianship yet — can I still get RC services and attend IEP meetings?',
      'navigation', 'collaborative',
      'Must address the guardianship nuance — educational rights holder vs legal guardian. Explain that caregivers CAN access services. Warm and practical. Should mention how to become educational rights holder.'],

    ['We\'re a foster family and our foster child has autism. DCFS is involved. Can we request RC services or does the bio parent have to?',
      'regional-center', 'collaborative',
      'Must navigate foster care + RC eligibility carefully. Foster parents CAN request services. Should mention surrogate parent rights for IEP. Sensitive to the complexity.'],

    // ─── TRICKY CLASSIFICATION (keywords that mislead) ───
    ['My child\'s doctor says we need a neuropsych eval but I don\'t know if insurance, the school, or RC should do it',
      'navigation', 'collaborative',
      'Tests whether "neuropsych eval" triggers insurance or IEP. Correct answer: all three are options with different pros/cons. Should lay out the options clearly without legal jargon.'],

    ['Is Self-Determination worth it? Our RC coordinator says it\'s a lot of paperwork',
      'regional-center', 'collaborative',
      'Should explain SDP pros and cons honestly — more control but more admin work. Should NOT dismiss the coordinator\'s concern. Balanced, practical guidance.'],

    // ─── REIMBURSEMENT EDGE CASES (the #1 feedback theme) ───
    ['I paid out of pocket for ABA for 3 months while waiting for RC to find a vendor. Can I get reimbursed even though it wasn\'t pre-authorized?',
      'regional-center', 'assertive',
      'Non-pre-authorized retroactive reimbursement — this is the hard case. Should explain that it IS possible but difficult. Must ask if they have documentation, medical necessity letters. Should NOT promise reimbursement. Should offer to draft a request letter.'],

    ['My RC approved respite but the vendor is charging more than RC will reimburse. Am I stuck paying the difference?',
      'regional-center', 'collaborative',
      'Common vendor rate gap issue. Should explain POS rates, suggest asking RC for a rate exception or different vendor. Stay collaborative. Clarify if this is a vendored vs non-vendored provider.'],

    // ─── MULTI-PART / COMPLEX QUESTIONS ───
    ['My 17-year-old has an IEP and gets RC services. She turns 18 in 6 months. What do I need to do about conservatorship, SSI, and making sure her services continue?',
      'transitions', 'collaborative',
      'Three-part transition question. Should address: (1) conservatorship alternatives (supported decision-making first), (2) SSI application at 18 when deeming stops, (3) RC continues lifelong. Well-organized, not overwhelming.'],

    ['We just moved to California from Texas. My child had an IEP and was receiving ABA through Medicaid there. How do we transfer everything?',
      'navigation', 'collaborative',
      'Interstate transfer scenario. Should explain: (1) 30-day IEP transfer rule, (2) new RC intake needed, (3) Medi-Cal application, (4) insurance re-enrollment. Practical first steps.'],

    // ─── TESTING THE CLARIFYING QUESTION FEATURE ───
    ['RC isn\'t giving us what we need',
      'regional-center', 'assertive',
      'Intentionally vague — engine MUST ask clarifying questions. What service? What happened? What have they tried? Should NOT give specific legal advice without knowing the situation.'],

    ['Something is wrong with my child\'s school placement',
      'iep', 'assertive',
      'Very vague. Engine must ask: What type of placement? What\'s wrong? Has parent discussed with the IEP team? Should not jump to due process or legal options without understanding the problem.'],

    // ─── SENSITIVE / NUANCED SITUATIONS ───
    ['My ex-husband and I disagree about our child\'s IEP — he doesn\'t think she needs special education. Can he block the IEP?',
      'iep', 'collaborative',
      'Custody and IEP intersection. Both parents have rights. Should explain that either parent can request eval/services. Sensitive handling — should not take sides. Practical guidance.'],

    ['I think my child\'s therapist through RC isn\'t very good but I\'m afraid if I complain they\'ll take away the service entirely',
      'regional-center', 'collaborative',
      'Fear-based question. Must reassure that requesting a different provider does NOT risk losing the service. Explain how to request a vendor change through the IPP. Warm and encouraging.'],

    // ─── TESTING SPECIFICITY WITH PROFILE DATA ───
    ['What respite agencies are vendored with my Regional Center?',
      'regional-center', 'collaborative',
      'Should use the family\'s RC from their profile to give specific guidance. If RC is known, name it. Suggest calling that specific RC or checking their vendor list. Test whether profile data is used.'],

    // ─── RAPID-FIRE DEADLINE SCENARIO ───
    ['I just got a Notice of Action from RC reducing my son\'s ABA from 20 to 10 hours. The letter is dated 6 days ago. What do I do RIGHT NOW?',
      'rights', 'adversarial',
      'URGENT: 4 days left for Aid Paid Pending. Must immediately flag the 10-day window. Step 1: file fair hearing TODAY. Provide exact language. This IS the time for full legal citations. Should offer to draft the fair hearing request.'],
  ];

  var count = 0;
  tests.forEach(function(t) {
    addQATest(t[0], t[1], t[2], t[3]);
    count++;
  });

  return { success: true, message: 'Seeded ' + count + ' Round 2 QA test cases' };
}
