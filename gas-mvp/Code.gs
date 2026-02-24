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
      + '- For reimbursement questions about pre-authorized services: focus on the paperwork process, timelines for submission, what documentation to include, and who to contact if there\'s a processing delay\n'
      + '- For general inquiries: explain the system clearly without implying the parent will need to fight\n'
      + '- Save legal citations for the "sources" field only — do NOT weave them into the conversational answer\n'
      + '- Use "rights_reminder" ONLY if there\'s a genuinely helpful right to know (not just to sound authoritative)\n';
  } else if (toneLevel === 'assertive') {
    tone += 'TONE: ASSERTIVE (firm, informed, empowering)\n'
      + '- The parent is experiencing some pushback — help them stand firm\n'
      + '- Mention relevant rights and timelines naturally, but don\'t lead with legal threats\n'
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
    + 'Match your tone to their situation. Start helpful, only get legal when the situation calls for it.\n\n';

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
      + '- Pre-authorized services: straightforward paperwork submission with receipts and documentation\n'
      + '- Non-pre-authorized claims: much harder — parent needs to show medical necessity, explain why they couldn\'t wait for authorization, and may face denial\n'
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
      + '  "empathy": "1-sentence validation of what the parent is feeling or facing",\n'
      + '  "answer": "Direct answer in 2-4 clear sentences using everyday language. Match the tone level. If collaborative, speak practically without legal jargon. If assertive, be firm but professional. If adversarial, be direct about rights and next steps. If the user asked for a draft, explain you can generate one via the button below.",\n'
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
      + '  "offer_to_draft": "Short description of the document Waypoint can draft for you (or null if not applicable)",\n'
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
