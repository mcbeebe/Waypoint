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
    + 'Schema: { "category": "...", "urgency": "low|medium|high", "needs_action": true|false, "emotional_state": "calm|stressed|crisis" }\n\n'
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
    + '- low: informational questions, planning ahead, general learning';

  var result = callClaude_(systemPrompt, question);
  var parsed = extractJson_(result);

  // Validate classification has required fields, fallback if not
  if (!parsed.category) parsed.category = 'navigation';
  if (!parsed.urgency) parsed.urgency = 'medium';
  if (parsed.needs_action === undefined) parsed.needs_action = false;
  if (!parsed.emotional_state) parsed.emotional_state = 'calm';
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

function getCategoryPrompt_(category, userProfile) {
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
      return injectProfileContext_(prompt, userProfile);
    }
  }

  // Fallback: built-in prompts
  return getBuiltInPrompt_(category, userProfile);
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

function getBuiltInPrompt_(category, profile) {
  var base = 'You are Waypoint\'s AI Navigator — a knowledgeable, empathetic guide for parents of children with disabilities in California. '
    + 'You combine deep knowledge of California disability law with practical, step-by-step guidance. '
    + 'You speak like a trusted friend who happens to be an expert advocate.\n\n';

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
      + 'KEY FACTS YOU ALWAYS APPLY:\n'
      + '- The Lanterman Act (W&I Code §4500+) guarantees services to persons with developmental disabilities regardless of ability to pay\n'
      + '- Services cannot be denied based solely on diagnosis or category of disability\n'
      + '- RC must complete intake assessment within 120 days (§4642)\n'
      + '- Parents can request any service; RC must provide written denial with appeal rights if refused\n'
      + '- The IPP is the governing document for all RC services (§4646)\n'
      + '- Fair hearing rights allow families to challenge any RC decision (§4710.5)\n'
      + '- Aid Paid Pending: file within 10 days to keep services during appeal\n'
      + '- Self-Determination Program allows families to manage their own budget\n'
      + '- POS disparities: document shows White families receive ~2x spending vs Latino families\n\n'
      + 'WHEN ANSWERING:\n'
      + '- Always cite the specific Lanterman Act section number\n'
      + '- Provide the exact timeline and deadline\n'
      + '- Include what to say to the service coordinator (exact script)\n'
      + '- Offer to draft any letters or requests\n\n'
      + profileContext,

    'iep': base
      + 'You specialize in IEP and school-based services under IDEA.\n\n'
      + 'KEY FACTS YOU ALWAYS APPLY:\n'
      + '- FAPE (Free Appropriate Public Education) is a legal right under IDEA\n'
      + '- Parents are equal members of the IEP team\n'
      + '- School must provide Prior Written Notice for any proposed change or refusal\n'
      + '- Parents have the right to an IEE at public expense if they disagree with the school\'s evaluation\n'
      + '- School has 15 calendar days to respond to evaluation request with an assessment plan\n'
      + '- 60 days from consent to complete evaluation\n'
      + '- 30 days from evaluation to hold IEP meeting\n'
      + '- SB 483 requirements apply in California\n'
      + '- Dispute options: mediation, due process hearing, CDE compliance complaint\n'
      + '- Parents can record IEP meetings (CA Ed Code §56341.1)\n'
      + '- Never sign the IEP at the meeting — take it home to review\n\n'
      + 'WHEN ANSWERING:\n'
      + '- Reference IDEA section and CA Education Code\n'
      + '- Explain procedural safeguards\n'
      + '- Suggest specific questions to ask at IEP meetings\n'
      + '- Offer to draft IEP meeting preparation documents\n'
      + '- Flag any timeline-sensitive deadlines\n\n'
      + profileContext,

    'benefits': base
      + 'You specialize in disability benefits and funding programs.\n\n'
      + 'KEY FACTS YOU ALWAYS APPLY:\n'
      + '- Funding waterfall: private insurance → Medi-Cal → CCS → Regional Center (payer of last resort)\n'
      + '- SSI: ~$943/month in CA, auto-enrolls in Medi-Cal\n'
      + '- IHSS: parents CAN be paid providers for children under 18; protective supervision available\n'
      + '- CalABLE: save up to $100K without affecting SSI ($2K normal limit)\n'
      + '- Medi-Cal waivers: HCBS waiver, Self-Determination waiver\n'
      + '- EPSDT: Medi-Cal MUST cover ALL medically necessary services for children under 21\n'
      + '- Institutional deeming for RC clients: only child\'s income counts\n'
      + '- RC reimbursements per POS standards\n\n'
      + 'WHEN ANSWERING:\n'
      + '- Identify ALL programs the family may qualify for\n'
      + '- Explain application process step by step\n'
      + '- Flag benefit cliffs and interaction effects\n'
      + '- Offer to draft applications or request letters\n\n'
      + profileContext,

    'insurance': base
      + 'You specialize in health insurance for disability services.\n\n'
      + 'KEY FACTS YOU ALWAYS APPLY:\n'
      + '- SB 946 mandates ABA coverage for autism — no dollar caps\n'
      + '- DMHC overturns ~60% of denials through Independent Medical Review\n'
      + '- Timely access: 15 business days for specialists\n'
      + '- Out-of-network exception if no in-network providers available\n'
      + '- Mental health parity applies to all plans\n'
      + '- Always get denials IN WRITING with specific contractual provision\n'
      + '- Expedited IMR available within 72 hours for urgent cases\n\n'
      + 'WHEN ANSWERING:\n'
      + '- Cite the specific CA insurance code or federal law\n'
      + '- Walk through the appeal process step by step\n'
      + '- Provide the exact language to use with insurance reps\n'
      + '- Offer to draft appeal letters\n\n'
      + profileContext,

    'rights': base
      + 'You specialize in disability rights, hearings, and complaints.\n\n'
      + 'KEY FACTS YOU ALWAYS APPLY:\n'
      + '- Fair Hearing for RC: 60 days to request, ALJ hearing within 50 days, decision within 80 days\n'
      + '- Aid Paid Pending: file within 10 days to keep services during appeal\n'
      + '- 4731 Complaint: RC director investigates within 20 working days\n'
      + '- CDE Compliance Complaint: investigated and findings issued within 60 days\n'
      + '- Due process hearing under IDEA: 2-year statute of limitations\n'
      + '- Disability Rights CA: 1-800-776-5746 (free legal help)\n\n'
      + 'WHEN ANSWERING:\n'
      + '- Identify the correct complaint/hearing mechanism\n'
      + '- Provide the exact timeline and filing steps\n'
      + '- Include who to contact and what to say\n'
      + '- Offer to draft complaint letters or hearing requests\n\n'
      + profileContext,

    'transitions': base
      + 'You specialize in transition planning for teens and young adults.\n\n'
      + 'KEY FACTS YOU ALWAYS APPLY:\n'
      + '- IEP transition planning starts at age 16 (by federal law)\n'
      + '- DOR (Dept of Rehabilitation) — apply at 15-16, waitlists are long\n'
      + '- DOR can fund college/trade school\n'
      + '- Transition Partnership Program for students 16+ in special ed\n'
      + '- Conservatorship vs. limited conservatorship vs. supported decision-making\n'
      + '- RC services continue into adulthood (Lanterman is lifelong)\n'
      + '- CalABLE accounts for financial planning\n\n'
      + 'WHEN ANSWERING:\n'
      + '- Address both short-term (school) and long-term (adult services) planning\n'
      + '- Coordinate across agencies (school, RC, DOR)\n'
      + '- Explain guardianship/conservatorship options\n'
      + '- Offer to draft transition-related documents\n\n'
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
      + '- Explain how systems interact and overlap\n'
      + '- Identify the most impactful immediate action\n'
      + '- Keep it simple — don\'t overwhelm with too many systems at once\n\n'
      + profileContext,
  };

  return categoryPrompts[category] || categoryPrompts['navigation'];
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

    // 3. Get category-specific system prompt
    var systemPrompt = getCategoryPrompt_(classification.category, userProfile);

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
      + '  "answer": "Direct answer in 2-4 clear sentences. If the user asked for a draft, explain that you can generate one and they should click the draft button below.",\n'
      + '  "action_steps": [\n'
      + '    {\n'
      + '      "step": 1,\n'
      + '      "action": "Specific action to take",\n'
      + '      "who": "Who to contact or what to do",\n'
      + '      "timeline": "When to do this",\n'
      + '      "script": "Exact words to say (if calling or writing someone)"\n'
      + '    }\n'
      + '  ],\n'
      + '  "rights_reminder": "One key legal right that applies here with the statute citation",\n'
      + '  "watch_out": "One important warning or common pitfall to avoid",\n'
      + '  "offer_to_draft": "Short description of the document Waypoint can draft for you (or null if not applicable)",\n'
      + '  "draft_type": "appeal_letter|iep_email|rc_request|iep_prep|complaint|general (or null)",\n'
      + '  "sources": ["Statute or code section cited"]\n'
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
    var draftPrompts = {
      'appeal_letter': 'Draft a formal insurance appeal letter for a parent of a child with disabilities in California. '
        + 'Include: today\'s date, policy/member info placeholders, the denial reason being appealed, '
        + 'a strong medical necessity argument citing specific functional limitations, '
        + 'legal citations (SB 946 if autism-related, Mental Health Parity Act, EPSDT if Medi-Cal), '
        + 'and a clear request for reversal. Address to the insurance company appeals department. '
        + 'Tone: firm, professional, factual. Use [BRACKETS] for information the parent needs to fill in.',

      'iep_email': 'Draft a professional email to a school district special education department. '
        + 'Be firm but collaborative. Cite IDEA and CA Education Code as appropriate. '
        + 'Include specific requests with deadlines based on legal timelines. '
        + 'Reference the parent\'s right to Prior Written Notice for any refusal. '
        + 'Use [BRACKETS] for information the parent needs to fill in.',

      'rc_request': 'Draft a formal request letter to the family\'s Regional Center. '
        + 'Reference the Lanterman Act entitlement principle (services based on need, not budget). '
        + 'Include relevant W&I Code sections. Be specific about the service being requested, '
        + 'the assessed need, and the timeline for response. '
        + 'Use [BRACKETS] for information the parent needs to fill in.',

      'iep_prep': 'Create a comprehensive IEP meeting preparation document. Include: '
        + '1) Agenda items to raise, 2) Specific questions to ask the team, '
        + '3) Rights reminders (recording, taking IEP home, bringing advocates), '
        + '4) Suggested goals based on the child\'s profile, '
        + '5) Red flags to watch for during the meeting. '
        + 'Format as a practical checklist the parent can print and bring.',

      'complaint': 'Draft a formal complaint document. Determine the correct mechanism '
        + '(4731 complaint for RC rights violations, CDE compliance complaint for school violations, '
        + 'DMHC complaint for insurance issues) based on the context. '
        + 'Include: specific rights or laws violated, dates and incidents, requested resolution, '
        + 'and the correct filing address/contact. '
        + 'Use [BRACKETS] for information the parent needs to fill in.',

      'general': 'Draft a professional letter or document based on the context provided. '
        + 'Be specific, cite relevant California laws when applicable, '
        + 'and include clear action items. '
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
    // Regional Center
    ['rc-001', 'regional-center', 'intake', 'RC Intake Process & Timelines',
      'Under the Lanterman Act (W&I Code §4642), Regional Centers must complete intake within 15 working days of referral. '
      + 'The full eligibility determination must happen within 120 days (§4643). No doctor referral is needed — anyone can self-refer. '
      + 'At intake, RC begins a multidisciplinary assessment. If eligible, an IPP meeting is held within 60 days of eligibility determination. '
      + 'Parents are equal members of the IPP team. Services authorized in the IPP must be delivered. '
      + 'If RC misses any timeline, document it and consider filing a 4731 complaint.',
      'Lanterman Act W&I Code §4642-4643', 'TRUE', now],

    ['rc-002', 'regional-center', 'ipp', 'IPP Rights & Process',
      'The Individual Program Plan (IPP) is your contract with Regional Center (§4646). '
      + 'It lists every service RC will provide or fund. You can request an IPP meeting anytime — RC must hold it within 30 days. '
      + 'Emergency IPP within 7 days. Be extremely specific: instead of "RC will provide therapy," write '
      + '"RC will fund 15 hours/week of ABA therapy with [provider], beginning [date], at a rate of $X/hour." '
      + 'If you disagree with the IPP, do NOT sign. Request a Fair Hearing (§4710.5). '
      + 'Aid Paid Pending: if you appeal within 10 days, existing services continue during the appeal.',
      'Lanterman Act W&I Code §4646, §4710.5', 'TRUE', now],

    ['rc-003', 'regional-center', 'services', 'RC Reimbursable Services & POS Standards',
      'Regional Center funds many services under Purchase of Service (POS) standards: '
      + 'ABA therapy (when insurance doesn\'t cover), speech therapy, OT, PT, respite care (code 862/864), '
      + 'behavioral support (code 062), diapers/supplies ages 3+ (code 840), adaptive equipment, '
      + 'transportation/mileage, camp/recreation, parent training, and Self-Determination Program (SDP). '
      + 'RC is "payer of last resort" — insurance and Medi-Cal pay first, RC fills gaps. '
      + 'IMPORTANT: POS spending data shows White families receive ~2x more than Latino families. '
      + 'Know what\'s available and request it specifically — the system won\'t always offer it proactively.',
      'Lanterman Act POS Standards', 'TRUE', now],

    ['rc-004', 'regional-center', 'appeals', 'Fair Hearings & 4731 Complaints',
      'Two main complaint mechanisms for Regional Center: '
      + '1) FAIR HEARING (§4710.5): For service denials or reductions. You have 60 days to request after Notice of Action. '
      + 'ALJ hearing within 50 days. Decision within 80 days. Aid Paid Pending if filed within 10 days — existing services CONTINUE. '
      + '2) 4731 COMPLAINT (§4731): For rights violations (SC not responding, not included in planning, language access, etc.). '
      + 'RC director must investigate within 20 working days. If unsatisfied, appeal to DDS within 15 working days. '
      + 'DDS final decision within 45 days. You can file both simultaneously. '
      + 'Free legal help: Disability Rights CA 1-800-776-5746.',
      'W&I Code §4710.5, §4731', 'TRUE', now],

    // IEP
    ['iep-001', 'iep', 'evaluation', 'Requesting a School Evaluation',
      'Under IDEA and CA Ed Code §56321, you have the right to request a comprehensive special education evaluation '
      + 'in ALL areas of suspected disability. Send your request IN WRITING via email AND certified mail to the Special Ed Director. '
      + 'The school has 15 CALENDAR days to respond with an Assessment Plan (not school days — calendar days). '
      + 'Once you sign the Assessment Plan, the school has 60 calendar days to complete the evaluation. '
      + 'After evaluation, the school has 30 days to hold an IEP meeting. '
      + 'CRITICAL: Ask them to evaluate in "all areas of suspected disability" — don\'t limit the request. '
      + 'If the school misses timelines, file a CDE compliance complaint at (916) 319-0800.',
      'IDEA, CA Ed Code §56321, §56344', 'TRUE', now],

    ['iep-002', 'iep', 'meetings', 'IEP Meeting Rights & Strategy',
      'You are an EQUAL member of the IEP team (IDEA §300.321). Key rights: '
      + '1) Bring anyone to the meeting (advocate, attorney, friend, therapist). '
      + '2) NEVER sign the IEP at the meeting — say "I\'d like to take this home to review." '
      + '3) Request audio recording (CA Ed Code §56341.1). '
      + '4) Get all evaluation reports 5 days BEFORE the meeting (§56329). '
      + '5) You can consent to parts and reject others. '
      + '6) If the school refuses your request, demand Prior Written Notice (PWN) — they must explain WHY in writing. '
      + '7) "We don\'t have the budget" is NOT a legal reason to deny services. '
      + '8) You can request an IEP meeting at ANY time during the year.',
      'IDEA §300.321, CA Ed Code §56341.1, §56329', 'TRUE', now],

    ['iep-003', 'iep', 'disputes', 'IEP Dispute Resolution Options',
      'When you disagree with the school district, you have multiple options: '
      + '1) CDE COMPLIANCE COMPLAINT: Free, filed with CA Dept of Education. CDE investigates within 60 days, '
      + 'can order corrective action. Best for procedural violations (missed timelines, IEP not implemented). '
      + 'Call (916) 319-0800 or write to CDE Special Education Division. '
      + '2) MEDIATION: Voluntary, free through the Office of Administrative Hearings. Both sides negotiate with a mediator. '
      + '3) DUE PROCESS HEARING: Formal hearing before an ALJ. 2-year statute of limitations. '
      + 'More adversarial but can result in compensatory services, placement changes, and attorney fees. '
      + '4) Independent Educational Evaluation (IEE) at public expense if you disagree with school\'s evaluation. '
      + 'Free legal help: Disability Rights CA 1-800-776-5746.',
      'IDEA §300.507-§300.516, CA Ed Code', 'TRUE', now],

    // Benefits
    ['ben-001', 'benefits', 'ssi', 'SSI for Children with Disabilities',
      'SSI provides ~$943/month in CA (federal + state supplement) for children with qualifying disabilities. '
      + 'The child must have a "medically determinable physical or mental impairment that results in marked and severe functional limitations." '
      + 'Family income and resources considered (under $2,000 countable resources). '
      + 'THE FUNCTION REPORT (SSA-3375-BK) IS THE MOST IMPORTANT DOCUMENT. '
      + 'Describe your child\'s WORST days, not their best. Be painfully specific: '
      + '"Cannot dress independently — puts clothes on backwards, cannot button or zip, requires full physical help for 30+ minutes." '
      + 'Get letters from EVERY provider. If denied, APPEAL within 60 days — never re-apply, always appeal. '
      + 'Approval rates improve significantly on appeal. Consider a disability attorney (contingency — no upfront cost). '
      + 'SSI auto-enrolls your child in Medi-Cal.',
      'SSA Regulations, 42 USC §1382c', 'TRUE', now],

    ['ben-002', 'benefits', 'ihss', 'IHSS — Parents as Paid Providers',
      'In-Home Supportive Services (IHSS) pays for caregiving so your child can live at home safely. '
      + 'Parents CAN be paid providers — one of the only programs that compensates family caregivers. '
      + 'Services: personal care (bathing, dressing, feeding), domestic tasks, protective supervision, '
      + 'paramedical tasks, transportation to medical appointments. '
      + 'Pay rate: $16-$20+/hour depending on county. Must have Medi-Cal to qualify. '
      + 'THE IN-HOME ASSESSMENT IS EVERYTHING: Keep a daily care log for 1-2 weeks before the visit. '
      + 'During the assessment, do NOT help your child "perform" — let the assessor see the real need. '
      + 'Protective supervision: additional hours for children who are a safety risk (wandering, no sense of danger). '
      + 'If you disagree with hours assigned, appeal within 90 days.',
      'W&I Code §12300+', 'TRUE', now],

    ['ben-003', 'benefits', 'funding', 'The Funding Waterfall',
      'California disability services follow a strict payer hierarchy: '
      + '1) PRIVATE INSURANCE (first payer) — employer plans, Covered CA '
      + '2) MEDI-CAL — covers what insurance doesn\'t. EPSDT for children under 21 covers ALL medically necessary services '
      + '3) CCS (California Children\'s Services) — for specific medical conditions '
      + '4) REGIONAL CENTER — payer of LAST resort, fills all remaining gaps '
      + 'Key: RC cannot deny services just because another payer hasn\'t been exhausted yet — RC must provide '
      + 'while helping the family access the primary payer. Parents should apply to ALL programs simultaneously — '
      + 'don\'t wait for one denial before applying to the next. '
      + 'CalABLE accounts: save up to $100K without affecting SSI eligibility ($2K normal limit). '
      + 'Open at CalABLE.ca.gov as soon as SSI is approved.',
      'CA disability funding hierarchy', 'TRUE', now],

    // Insurance
    ['ins-001', 'insurance', 'denials', 'Fighting Insurance Denials',
      'When insurance denies a service: 1) Get the denial IN WRITING with the specific contractual provision. '
      + '2) File an internal appeal (your right by law). Cite the specific diagnosis, medical necessity, and applicable law. '
      + '3) If internal appeal denied, file for Independent Medical Review (IMR). '
      + 'For HMOs: DMHC at 1-888-466-2219. For PPOs: CDI at 1-800-927-4357. '
      + 'DMHC overturns approximately 60% of denials through IMR. '
      + 'Standard IMR: 45 days. Expedited/urgent IMR: 72 hours. '
      + 'For autism/ABA: cite SB 946 (H&S Code §1374.73) — no dollar caps on behavioral health treatment. '
      + 'First denials are COMMON and NOT the end. Most families who appeal get a reversal.',
      'CA Health & Safety Code §1374.73, SB 946', 'TRUE', now],

    // Rights
    ['rts-001', 'rights', 'overview', 'Know Your Rights — Overview',
      'KEY CALIFORNIA DISABILITY RIGHTS FOR PARENTS: '
      + '1) Lanterman Act (W&I §4500+): Entitlement to RC services based on need, not budget. '
      + '2) IDEA: Right to FAPE, IEP, and procedural safeguards at school. '
      + '3) SB 946: Insurance must cover ABA for autism with no dollar caps. '
      + '4) EPSDT: Medi-Cal must cover ALL medically necessary services for children under 21. '
      + '5) Fair Hearing rights for RC, SSI, IHSS, and Medi-Cal decisions. '
      + '6) CDE complaints for school violations (free, effective). '
      + '7) 4731 complaints for RC rights violations. '
      + '8) Right to file with DMHC/CDI for insurance disputes. '
      + 'FREE LEGAL HELP: Disability Rights CA 1-800-776-5746. '
      + 'GOLDEN RULE: Never accept a verbal "no." Always demand the denial in writing with the legal basis.',
      'Multiple CA and federal statutes', 'TRUE', now],
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
  return { success: true, message: 'Waypoint AI Engine initialized. Add your ANTHROPIC_API_KEY in Project Settings → Script Properties.' };
}
