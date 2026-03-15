import { useState, useRef } from "react";

// ─── Inline data (in production these would be imported) ───
// RC_REIMBURSABLE, FRUSTRATION_DEEP, analyzeEmailThread, generateEmailResponse,
// generateDeepRCActions, generateDeepSchoolActions, generateDeepInsuranceActions
// are all defined in waypoint-frustration-data.js — inlined here for single-file artifact

const C = {
  bg: "#F8F7F4", card: "#FFF", accent: "#2563EB", accentLight: "#EFF6FF",
  accentDark: "#1E40AF", urgent: "#DC2626", urgentLight: "#FEF2F2", urgentBorder: "#FECACA",
  success: "#059669", successLight: "#ECFDF5", successBorder: "#A7F3D0",
  warn: "#D97706", warnLight: "#FFFBEB", warnBorder: "#FDE68A",
  muted: "#6B7280", mutedLight: "#F3F4F6", border: "#E5E7EB",
  text: "#111827", textSec: "#4B5563", purple: "#7C3AED", purpleLight: "#F5F3FF",
  dark: "#1A1A2E", teal: "#0D9488", tealLight: "#F0FDFA", tealBorder: "#99F6E4",
  rose: "#E11D48", roseLight: "#FFF1F2", roseBorder: "#FECDD3",
  indigo: "#4F46E5", indigoLight: "#EEF2FF", indigoBorder: "#C7D2FE",
};

const RC_REIMBURSABLE = {
  categories: [
    { name: "Respite Care", code: "862/864", description: "In-home or out-of-home respite. Most-used RC service.", typical: "$15-40/hr", notes: "Must be in IPP. Parent CANNOT be respite provider for own child." },
    { name: "Behavioral Support", code: "062", description: "1:1 aide, community integration, social skills.", typical: "Varies — 2nd highest POS", notes: "Different from IHSS. RC-funded when school/insurance don't cover." },
    { name: "ABA Therapy", code: "Various", description: "Insurance primary — RC covers co-pays, gaps, denials.", typical: "$60-150/hr", notes: "Payer of last resort. Keep all EOBs from insurance." },
    { name: "Speech Therapy", code: "110/115", description: "When insurance + school don't provide enough.", typical: "$100-200/session", notes: "Insurance → School → RC. Keep denial records." },
    { name: "OT", code: "116", description: "Sensory, fine motor, daily living skills.", typical: "$100-200/session", notes: "Same hierarchy: insurance → school → RC." },
    { name: "Diapers / Supplies", code: "840", description: "Ages 3+ with documented medical need.", typical: "$50-150/month", notes: "Physician note required. Most families don't know this exists." },
    { name: "Adaptive Equipment", code: "Various", description: "AAC devices, adaptive strollers, sensory equipment, iPads.", typical: "Varies", notes: "Medi-Cal/insurance first. RC covers gaps." },
    { name: "Transportation", code: "Various", description: "Gas/mileage to appointments, bus passes.", typical: "IRS mileage rate", notes: "Keep a mileage log for authorized services." },
    { name: "Camp / Recreation", code: "Various", description: "Summer camp, adaptive sports, Special Olympics.", typical: "Varies", notes: "Must be in IPP. Ask about community integration." },
    { name: "Parent Training", code: "Various", description: "Behavior management, AAC, home programs.", typical: "Varies", notes: "Underutilized. Great alternative to waitlists." },
    { name: "Self-Determination (SDP)", code: "SDP", description: "Family controls budget. More flexibility.", typical: "Individual budget", notes: "Ask SC about enrollment status at your RC." },
  ],
  timeline_rules: {
    intake: { statutory: "15 days from referral", law: "W&I §4642" },
    eligibility: { statutory: "120 days from referral", law: "W&I §4643" },
    ipp: { statutory: "60 days from eligibility", law: "W&I §4646" },
    service_start: { statutory: "Reasonable time after IPP", law: "W&I §4648" },
    reimbursement: { statutory: "60 days (DDS directive)", law: "Title 17 CCR" },
    annual_review: { statutory: "Every 12 months", law: "W&I §4646.5" },
  },
};

const FRUSTRATION_DEEP = {
  rc_issue_type: { question: "What's going on with Regional Center?", options: [
    { label: "They're not responding / too slow", value: "slow_response", emoji: "⏰" },
    { label: "Reimbursement is delayed or denied", value: "reimbursement", emoji: "💸" },
    { label: "Service Coordinator isn't helping", value: "sc_quality", emoji: "👤" },
    { label: "Services were denied or reduced", value: "service_denied", emoji: "🚫" },
    { label: "I don't know what I can get reimbursed for", value: "what_covered", emoji: "❓" },
    { label: "I have emails/documents to share", value: "upload_evidence", emoji: "📎" },
  ]},
  rc_slow_what: { question: "What are you waiting for?", options: [
    { label: "Intake appointment", value: "intake", emoji: "📋" },
    { label: "Eligibility decision", value: "eligibility", emoji: "🔬" },
    { label: "IPP meeting", value: "ipp", emoji: "📝" },
    { label: "Service authorization", value: "service_auth", emoji: "✅" },
    { label: "SC to return call/email", value: "sc_response", emoji: "📞" },
    { label: "Reimbursement payment", value: "reimbursement_wait", emoji: "💰" },
  ]},
  rc_slow_duration: { question: "How long have you been waiting?", options: [
    { label: "1-2 weeks", value: "1_2_weeks", emoji: "📅" },
    { label: "3-4 weeks", value: "3_4_weeks", emoji: "⚠️" },
    { label: "1-2 months", value: "1_2_months", emoji: "🚨" },
    { label: "3+ months", value: "3_plus_months", emoji: "🔴" },
  ]},
  rc_reimburse_issue: { question: "What's happening with the reimbursement?", options: [
    { label: "Submitted claim, no payment", value: "waiting", emoji: "⏳" },
    { label: "Claim was denied", value: "denied", emoji: "🚫" },
    { label: "Don't know how to submit", value: "how_to", emoji: "❓" },
    { label: "Partial payment", value: "partial", emoji: "💸" },
    { label: "Didn't know I could get reimbursed", value: "didnt_know", emoji: "😮" },
  ]},
  school_issue_type: { question: "What's going on with the school?", options: [
    { label: "Evaluation too slow", value: "eval_delay", emoji: "⏰" },
    { label: "IEP not being implemented", value: "iep_not_implemented", emoji: "🚫" },
    { label: "Want to change goals/services", value: "iep_change", emoji: "📝" },
    { label: "Suspension / discipline issues", value: "discipline", emoji: "⚠️" },
    { label: "Disagree with evaluation", value: "disagree_eval", emoji: "👎" },
    { label: "I have emails/documents to share", value: "upload_evidence", emoji: "📎" },
  ]},
  insurance_issue_type: { question: "What's going on with insurance?", options: [
    { label: "Authorization denied", value: "auth_denied", emoji: "🚫" },
    { label: "Not enough hours", value: "low_hours", emoji: "⏰" },
    { label: "No in-network providers", value: "no_providers", emoji: "🔍" },
    { label: "Billing dispute", value: "billing", emoji: "💸" },
    { label: "I have a denial letter to share", value: "upload_evidence", emoji: "📎" },
  ]},
};

// ─── Email Analysis Engine ───
function analyzeEmailThread(text) {
  const analysis = { promises: [], timeline_issues: [], red_flags: [], legal_citations: [], summary: "" };
  const lower = text.toLowerCase();
  [
    { p: /i will (follow up|get back|send|schedule|check|look into|reach out|call|email|forward|submit)[^.!?\n]{0,80}/gi, l: "Promise to follow up" },
    { p: /we('ll| will) (get|have|send|schedule|process|complete|review|update)[^.!?\n]{0,80}/gi, l: "Promise to act" },
    { p: /by (monday|tuesday|wednesday|thursday|friday|next week|end of week|tomorrow|end of day)[^.!?\n]{0,60}/gi, l: "Deadline commitment" },
  ].forEach(({p,l}) => { const m = text.match(p); if(m) m.forEach(x => analysis.promises.push({text:x.trim().slice(0,120),type:l})); });

  if (/waiting|still haven't|following up again|checking in again/i.test(lower)) analysis.timeline_issues.push("Pattern of repeated follow-ups — systemic delays");
  if (/\d+\s*(weeks?|months?)\s*ago/i.test(text)) analysis.timeline_issues.push("Extended wait time referenced");
  if (/no (response|reply|update|callback)/i.test(text)) analysis.timeline_issues.push("Non-response documented");
  if (/called (multiple|several|\d+) times/i.test(text)) analysis.timeline_issues.push("Multiple contact attempts");

  if (/not eligible|doesn't qualify|not covered|ineligible/i.test(text)) analysis.red_flags.push("Eligibility denial language — get written NOA with specific criteria");
  if (/budget|no funds?|waitlist|capacity|shortage/i.test(text)) analysis.red_flags.push("Budget/funding excuse — Lanterman entitlement is NOT budget-dependent");
  if (/generic (resource|service)/i.test(text)) analysis.red_flags.push("'Generic resource' claim — RC pushing cost. Demand written justification.");
  if (/not our responsibility|talk to (the|your) school|contact your insurance/i.test(text)) analysis.red_flags.push("Buck-passing — agency deferring responsibility inappropriately");
  if (/policy.{0,20}(changed|new|updated)/i.test(text)) analysis.red_flags.push("Policy change claim — request specific DDS directive number");
  if (/unfortunately|at this time|unable to|regret to/i.test(text)) analysis.red_flags.push("Soft denial language — get the decision in writing with legal basis");
  if (/verbal.{0,15}(agreement|authorization|approval)/i.test(text)) analysis.red_flags.push("Verbal-only agreement — ALWAYS get authorization in writing");

  if (/intake|referral/i.test(lower)) analysis.legal_citations.push("W&I §4642: Intake within 15 days");
  if (/eligib|evaluation/i.test(lower)) analysis.legal_citations.push("W&I §4643: Eligibility within 120 days");
  if (/ipp|program plan/i.test(lower)) analysis.legal_citations.push("W&I §4646: IPP within 60 days");
  if (/service.{0,20}(denied|won't|can't|refuse)/i.test(lower)) { analysis.legal_citations.push("W&I §4648: RC shall deliver IPP services"); analysis.legal_citations.push("W&I §4710.5: Right to Fair Hearing"); }
  if (/reimburse/i.test(lower)) analysis.legal_citations.push("Title 17 CCR: Timely claim processing");
  if (/iep|special ed/i.test(lower)) analysis.legal_citations.push("IDEA 34 CFR §300: FAPE requirements");
  if (/aba|behavioral health/i.test(lower)) analysis.legal_citations.push("CA SB 946: Behavioral health coverage for autism");
  analysis.legal_citations = [...new Set(analysis.legal_citations)];
  const parts = [];
  if (analysis.red_flags.length) parts.push(`${analysis.red_flags.length} red flag(s)`);
  if (analysis.promises.length) parts.push(`${analysis.promises.length} promise(s)`);
  if (analysis.timeline_issues.length) parts.push(`${analysis.timeline_issues.length} timeline issue(s)`);
  analysis.summary = parts.length ? parts.join(" • ") : "No major issues detected";
  return analysis;
}

function generateEmailResponse(analysis) {
  let b = `Dear [SC Name / RC],\n\nThank you for your email. I am writing to follow up and document our communication.\n\n`;
  if (analysis.promises.length) { b += `Confirming these commitments:\n`; analysis.promises.forEach(p=>{b+=`• "${p.text}"\n`}); b += `\nPlease confirm dates.\n\n`; }
  if (analysis.red_flags.length) { b += `I have concerns:\n`; analysis.red_flags.forEach(r=>{b+=`• ${r}\n`}); b += `\n`; }
  if (analysis.legal_citations.length) { b += `Applicable law:\n`; analysis.legal_citations.forEach(c=>{b+=`• ${c}\n`}); b += `\n`; }
  b += `If not resolved in 10 business days, I will:\n1. File 4731 complaint with DDS\n2. Contact Disability Rights CA (1-800-776-5746)\n3. Request Fair Hearing\n\nSincerely,\n[Your Name]`;
  return b;
}

function generateDeepRCActions(issueType, detail) {
  const actions = [];
  const rules = RC_REIMBURSABLE.timeline_rules;
  if (issueType === "slow_response") {
    let statutory="", law="";
    const w = detail.waitingFor||"";
    if(w==="intake"){statutory=rules.intake.statutory;law=rules.intake.law}
    else if(w==="eligibility"){statutory=rules.eligibility.statutory;law=rules.eligibility.law}
    else if(w==="ipp"){statutory=rules.ipp.statutory;law=rules.ipp.law}
    else if(w==="sc_response"){statutory="SC should respond within 2 business days";law="Lanterman duty of care"}
    else if(w==="service_auth"){statutory=rules.service_start.statutory;law=rules.service_start.law}
    else if(w==="reimbursement_wait"){statutory=rules.reimbursement.statutory;law=rules.reimbursement.law}
    const isV=["3_4_weeks","1_2_months","3_plus_months"].includes(detail.duration);
    const dur=(detail.duration||"").replace(/_/g," "), wl=w.replace(/_/g," ");
    actions.push({id:"rc_esc_"+Date.now(),priority:"urgent",agencyKey:"rceb",category:"escalation",
      title:isV?`⚠️ Timeline violation: ${statutory}`:`Follow up: ${wl}`,
      subtitle:`Waiting ${dur}. Requirement: ${statutory} (${law}).${isV?" Possible Lanterman violation.":""}`,
      agency:"RC → DDS", deadline:"This week",
      talkingPoints:[`I've waited ${dur} for ${wl}. Lanterman requires: ${statutory}.`,"I'd like to speak with your supervisor.","If not resolved in 5 days, I will file a 4731 complaint."],
      draftMessage:`Dear [RC Director],\n\nRe: Delay in ${wl} for [Child Name]\n\nTimeline:\n- Request date: [DATE]\n- Elapsed: ${dur}\n- Requirement: ${statutory} (${law})\n\nI request:\n1. Complete within 5 business days\n2. Written explanation for delay\n3. Supervisor contact\n\nOtherwise: 4731 complaint + DRC + Fair Hearing.\n\n[Your Name]`,
      documents:["Original request with date","Email/call log","Phone call notes"]});
    if(isV) actions.push({id:"rc_4731_"+Date.now(),priority:"high",agencyKey:"rceb",category:"escalation",
      title:"File 4731 complaint with DDS",subtitle:"DDS must investigate. RC has 20 business days to respond.",agency:"DDS",deadline:"If not resolved in 5 days",
      draftMessage:`To: California DDS\nRe: 4731 Complaint against [RC Name]\nConsumer: [Child], UCI #[if known]\n\nViolation: ${statutory} (${law})\nWaiting: ${dur}\nAttempts: [list]\n\nRequested: Immediate ${wl} + corrective action.\n\n[Your Name]`});
  }
  if(issueType==="reimbursement"){
    const ri=detail.reimburseIssue||"";
    if(ri==="denied")actions.push({id:"reimb_appeal",priority:"urgent",agencyKey:"rceb",category:"escalation",title:"Appeal reimbursement denial",subtitle:"Get denial in writing. Fair Hearing available.",agency:"RC/OAH",deadline:"This week",
      talkingPoints:["I need denial in writing with reason.","Is this in my IPP?","I want a Fair Hearing."],
      draftMessage:`Dear [RC Finance],\n\nAppealing denial of reimbursement.\nService: [describe]\nDates: [dates]\nAmount: $[amount]\nIPP auth: [ref]\n\nProvide: written denial + appeal instructions.\n\n[Your Name]`});
    if(ri==="waiting")actions.push({id:"reimb_follow",priority:"high",agencyKey:"rceb",category:"escalation",title:"Follow up on pending reimbursement",subtitle:"RC should process within 60 days.",agency:"RC",deadline:"Call this week",
      talkingPoints:["Claim submitted [date]. Status?","Who in finance can I contact?","Will escalate at 60 days."]});
    if(ri==="how_to"||ri==="didnt_know")actions.push({id:"reimb_guide",priority:"standard",agencyKey:"rceb",category:"support",title:"How to submit reimbursement claims",subtitle:"Step-by-step guide.",agency:"RC",
      talkingPoints:["1. Confirm service is in IPP","2. Get receipts (date, service, NPI, amount)","3. Fill out RC claim form (ask SC)","4. Attach: receipt + IPP page + proof of payment","5. Submit to RC finance + keep copies","6. Follow up at 30 days, escalate at 60"],
      documents:["RC claim form","Receipts","IPP authorization page","Proof of payment"]});
    if(ri==="partial")actions.push({id:"reimb_partial",priority:"high",agencyKey:"rceb",category:"escalation",title:"Dispute partial payment",subtitle:"Request written explanation of payment calculation.",agency:"RC",deadline:"This week",
      talkingPoints:["Received $X, submitted $Y. Explain difference.","What is the IPP-authorized rate?","Is this the vendor rate or different calculation?"]});
  }
  if(issueType==="sc_quality")actions.push({id:"change_sc",priority:"high",agencyKey:"rceb",category:"escalation",title:"Request new Service Coordinator",subtitle:"You have the right. Ask for program manager.",agency:"RC",deadline:"This week",
    talkingPoints:["I'd like a new SC.","Concerns: [not returning calls, not informing of services, not following through]."],
    draftMessage:`Dear [Program Manager],\n\nRequesting SC change for [Child].\nCurrent SC: [name]\nReasons:\n- [specifics]\n\nAssign new SC within 10 days.\n\n[Your Name]`});
  if(issueType==="service_denied")actions.push({id:"svc_appeal",priority:"urgent",agencyKey:"rceb",category:"escalation",title:"Appeal service denial",subtitle:"Demand written NOA. 30 days for Fair Hearing.",agency:"RC/OAH",deadline:"Within 30 days",
    talkingPoints:["I need written NOA with reasons.","Is this a generic resource determination?","I'm requesting Fair Hearing.","DRC: 1-800-776-5746"],
    draftMessage:`Dear [RC Director],\n\nAppealing denial of [service] for [Child].\n\nRequest:\n1. Written NOA with reason\n2. Regulation citation\n3. Fair Hearing procedures\n\nLanterman Act entitles [Name] to services per IPP.\n\n[Your Name]`});
  return actions;
}

// ─── Action Card Component ───
function ActionCard({action, onExpand, expanded, isCompleted, onToggle}) {
  const cat = action.category||"";
  const pr = {urgent:{bg:C.urgentLight,border:C.urgentBorder,badge:C.urgent,label:"DO THIS WEEK"},high:{bg:C.warnLight,border:C.warnBorder,badge:C.warn,label:"NEXT 30 DAYS"},standard:{bg:C.accentLight,border:"#BFDBFE",badge:C.accent,label:"WHEN READY"}};
  let p = isCompleted?{bg:C.successLight,border:C.successBorder,badge:C.success,label:"✓ DONE"}:pr[action.priority];
  if((cat==="escalation"||cat==="appeal")&&!isCompleted) p={bg:C.roseLight,border:C.roseBorder,badge:C.rose,label:"⚡ ESCALATION"};
  if(cat==="support"&&!isCompleted) p={bg:C.tealLight,border:C.tealBorder,badge:C.teal,label:"GUIDANCE"};
  return(
    <div style={{background:isCompleted?C.successLight:C.card,border:`1.5px solid ${isCompleted?C.successBorder:p.border}`,borderRadius:14,marginBottom:12,overflow:"hidden",opacity:isCompleted?0.6:1,boxShadow:expanded?"0 4px 20px rgba(0,0,0,0.07)":"0 1px 3px rgba(0,0,0,0.04)"}}>
      <div onClick={()=>onExpand()} style={{padding:"14px 18px",cursor:"pointer",display:"flex",alignItems:"flex-start",gap:12}}>
        <div onClick={e=>{e.stopPropagation();onToggle()}} style={{width:24,height:24,minWidth:24,borderRadius:7,border:`2px solid ${isCompleted?C.success:p.badge}`,background:isCompleted?C.success:"white",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",marginTop:2}}>
          {isCompleted&&<span style={{color:"white",fontSize:13,fontWeight:700}}>✓</span>}
        </div>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,flexWrap:"wrap"}}>
            <span style={{fontSize:9,fontWeight:700,letterSpacing:0.7,color:p.badge,background:p.bg,padding:"2px 7px",borderRadius:4}}>{p.label}</span>
            {action.agency&&<span style={{fontSize:9,color:C.muted,fontWeight:500}}>{action.agency}</span>}
            {action.deadline&&!isCompleted&&<span style={{fontSize:9,color:C.urgent,fontWeight:600}}>⏱ {action.deadline}</span>}
          </div>
          <div style={{fontSize:14,fontWeight:600,color:C.text,lineHeight:1.3,textDecoration:isCompleted?"line-through":"none"}}>{action.title}</div>
          <div style={{fontSize:12,color:C.textSec,marginTop:2,lineHeight:1.4}}>{action.subtitle}</div>
        </div>
        <div style={{fontSize:16,color:C.muted,transform:expanded?"rotate(180deg)":"rotate(0)",transition:"transform 0.2s",marginTop:3}}>▾</div>
      </div>
      {expanded&&<div style={{padding:"0 18px 16px 54px"}}>
        {action.talkingPoints&&<div style={{marginBottom:14}}><div style={{fontSize:10,fontWeight:700,color:C.accent,letterSpacing:0.5,marginBottom:6,textTransform:"uppercase"}}>📞 What to say / do</div><div style={{background:C.accentLight,borderRadius:8,padding:12,borderLeft:`3px solid ${C.accent}`}}>{action.talkingPoints.map((t,i)=><div key={i} style={{fontSize:12,lineHeight:1.5,marginBottom:i<action.talkingPoints.length-1?8:0}}>"{t}"</div>)}</div></div>}
        {action.draftMessage&&<div style={{marginBottom:14}}><div style={{fontSize:10,fontWeight:700,color:C.purple,letterSpacing:0.5,marginBottom:6,textTransform:"uppercase"}}>✉ Draft message</div><div style={{background:C.purpleLight,borderRadius:8,padding:12,borderLeft:`3px solid ${C.purple}`,fontSize:12,lineHeight:1.5,whiteSpace:"pre-line",maxHeight:280,overflowY:"auto"}}>{action.draftMessage}</div></div>}
        {action.documents&&<div><div style={{fontSize:10,fontWeight:700,color:C.warn,letterSpacing:0.5,marginBottom:6,textTransform:"uppercase"}}>📄 Documents needed</div>{action.documents.map((d,i)=><div key={i} style={{display:"flex",gap:6,marginBottom:3,fontSize:12,color:C.textSec}}><span style={{color:C.warn}}>○</span>{d}</div>)}</div>}
      </div>}
    </div>);
}

// ─── Main App ───
export default function WaypointFrustrationEngine() {
  const [phase, setPhase] = useState("start");
  const [target, setTarget] = useState(null);
  const [issueType, setIssueType] = useState(null);
  const [detail, setDetail] = useState({});
  const [detailStep, setDetailStep] = useState(0);
  const [actions, setActions] = useState([]);
  const [expanded, setExpanded] = useState(-1);
  const [completed, setCompleted] = useState(new Set());
  const [emailText, setEmailText] = useState("");
  const [emailAnalysis, setEmailAnalysis] = useState(null);
  const [showPanel, setShowPanel] = useState(null); // "reimbursement" | "email_analysis"
  const fileInputRef = useRef(null);

  const intake = {diagnosis:"autism",age:"3-5",rc_status:"active",iep_status:"active",insurance:"both"};

  const goBack = (toPhase) => { setPhase(toPhase); if(toPhase==="start"){setTarget(null);setIssueType(null);setDetail({});setActions([]);setCompleted(new Set());setEmailText("");setEmailAnalysis(null);} };

  // ─── File upload handler ───
  const handleFileUpload = (e) => {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setEmailText(ev.target.result);
      const analysis = analyzeEmailThread(ev.target.result);
      setEmailAnalysis(analysis);
      setShowPanel("email_analysis");
    };
    reader.readAsText(file);
  };

  const handlePasteAnalyze = () => {
    if(!emailText.trim()) return;
    const analysis = analyzeEmailThread(emailText);
    setEmailAnalysis(analysis);
    setShowPanel("email_analysis");
  };

  const useEmailResponse = () => {
    if(!emailAnalysis) return;
    const responseText = generateEmailResponse(emailAnalysis);
    const responseAction = {
      id:"email_resp_"+Date.now(), priority: emailAnalysis.red_flags.length?"urgent":"high",
      agencyKey:"rceb", category:"escalation",
      title: emailAnalysis.red_flags.length ? "⚠️ Red flags found — send this response" : "📧 Suggested response based on analysis",
      subtitle: `Found: ${emailAnalysis.summary}`,
      agency: target==="rc"?"RC":target==="school"?"School":"Insurance",
      deadline: emailAnalysis.red_flags.length ? "Send today" : "Send this week",
      draftMessage: responseText,
      talkingPoints: [
        ...emailAnalysis.red_flags.map(r=>`🚩 ${r}`),
        ...emailAnalysis.timeline_issues.map(t=>`⏰ ${t}`),
        ...(emailAnalysis.promises.length?[`📝 ${emailAnalysis.promises.length} promise(s) — hold them accountable`]:[]),
      ],
      documents:["Save copy of original thread","Screenshot emails","Log: date, time, who, what"],
    };
    setActions(prev=>[responseAction,...prev]);
    setShowPanel(null);
    setPhase("results");
    setExpanded(0);
  };

  // ─── STEP 1: Pick target ───
  if (phase === "start") {
    return (
      <div style={{maxWidth:460,margin:"0 auto",padding:24,fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif",background:C.bg,minHeight:"100vh"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:26,fontWeight:800,color:C.text}}>Waypoint</div>
          <div style={{fontSize:13,color:C.rose,fontWeight:600}}>😤 Frustration Deep-Dive</div>
          <div style={{fontSize:12,color:C.muted,marginTop:4}}>We'll dig into exactly what's happening and build your case.</div>
        </div>
        <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:14}}>Which system is giving you trouble?</div>
        {[
          {label:"Regional Center",value:"rc",emoji:"🏛",desc:"Response times, reimbursement, SC issues, service denials"},
          {label:"School District / IEP",value:"school",emoji:"🏫",desc:"Evaluation delays, IEP implementation, discipline, disagreements"},
          {label:"Insurance",value:"insurance",emoji:"💊",desc:"Denials, low hours, no providers, billing disputes"},
        ].map((o,i)=>(
          <button key={i} onClick={()=>{setTarget(o.value);setPhase("issue_type")}} style={{display:"block",width:"100%",padding:"14px 16px",borderRadius:12,fontSize:14,fontWeight:600,textAlign:"left",border:`1.5px solid ${C.border}`,background:"white",cursor:"pointer",color:C.text,marginBottom:8}}>
            <span style={{fontSize:20,marginRight:10}}>{o.emoji}</span>{o.label}
            <div style={{fontSize:11,color:C.muted,fontWeight:400,marginTop:2,marginLeft:30}}>{o.desc}</div>
          </button>
        ))}
      </div>
    );
  }

  // ─── STEP 2: Specific issue ───
  if (phase === "issue_type") {
    const cfg = target==="rc"?FRUSTRATION_DEEP.rc_issue_type:target==="school"?FRUSTRATION_DEEP.school_issue_type:FRUSTRATION_DEEP.insurance_issue_type;
    return (
      <div style={{maxWidth:460,margin:"0 auto",padding:24,fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif",background:C.bg,minHeight:"100vh"}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:26,fontWeight:800,color:C.text}}>Waypoint</div>
          <div style={{fontSize:13,color:C.rose,fontWeight:600}}>Diagnosing the problem</div>
        </div>
        <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:14}}>{cfg.question}</div>
        {cfg.options.map((o,i)=>(
          <button key={i} onClick={()=>{
            setIssueType(o.value);
            if(o.value==="what_covered"||o.value==="didnt_know"){setShowPanel("reimbursement");setPhase("results");return;}
            if(o.value==="upload_evidence"){setPhase("upload");return;}
            if(target==="rc"&&o.value==="slow_response"){setPhase("detail");setDetailStep(0);return;}
            if(target==="rc"&&o.value==="reimbursement"){setPhase("detail");setDetailStep(0);return;}
            // Direct action generation for other types
            const acts = generateDeepRCActions(o.value,{});
            setActions(acts);setExpanded(0);setPhase("results");
          }} style={{display:"block",width:"100%",padding:"12px 16px",borderRadius:10,fontSize:13,fontWeight:500,textAlign:"left",border:`1.5px solid ${C.border}`,background:"white",cursor:"pointer",marginBottom:8}}>
            <span style={{fontSize:18,marginRight:10}}>{o.emoji}</span>{o.label}
          </button>
        ))}
        <button onClick={()=>goBack("start")} style={{background:"none",border:"none",color:C.muted,fontSize:12,cursor:"pointer",padding:"10px 0"}}>← Back</button>
      </div>
    );
  }

  // ─── STEP 3: Detail drill-down (slow_response or reimbursement) ───
  if (phase === "detail") {
    let cfg;
    if(issueType==="slow_response"&&detailStep===0) cfg=FRUSTRATION_DEEP.rc_slow_what;
    else if(issueType==="slow_response"&&detailStep===1) cfg=FRUSTRATION_DEEP.rc_slow_duration;
    else if(issueType==="reimbursement"&&detailStep===0) cfg=FRUSTRATION_DEEP.rc_reimburse_issue;
    if(!cfg){setPhase("results");return null;}
    return (
      <div style={{maxWidth:460,margin:"0 auto",padding:24,fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif",background:C.bg,minHeight:"100vh"}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:26,fontWeight:800,color:C.text}}>Waypoint</div>
          <div style={{fontSize:13,color:C.rose,fontWeight:600}}>Getting specific</div>
        </div>
        <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:14}}>{cfg.question}</div>
        {cfg.options.map((o,i)=>(
          <button key={i} onClick={()=>{
            const newDetail = {...detail};
            if(issueType==="slow_response"&&detailStep===0){newDetail.waitingFor=o.value;setDetail(newDetail);setDetailStep(1);return;}
            if(issueType==="slow_response"&&detailStep===1){newDetail.duration=o.value;setDetail(newDetail);const acts=generateDeepRCActions("slow_response",newDetail);setActions(acts);setExpanded(0);setPhase("results");return;}
            if(issueType==="reimbursement"){
              newDetail.reimburseIssue=o.value;setDetail(newDetail);
              if(o.value==="didnt_know"){setShowPanel("reimbursement");setPhase("results");return;}
              const acts=generateDeepRCActions("reimbursement",newDetail);setActions(acts);setExpanded(0);setPhase("results");return;
            }
          }} style={{display:"block",width:"100%",padding:"12px 16px",borderRadius:10,fontSize:13,fontWeight:500,textAlign:"left",border:`1.5px solid ${C.border}`,background:"white",cursor:"pointer",marginBottom:8}}>
            <span style={{fontSize:18,marginRight:10}}>{o.emoji}</span>{o.label}
          </button>
        ))}
        <button onClick={()=>{if(detailStep>0)setDetailStep(detailStep-1);else setPhase("issue_type")}} style={{background:"none",border:"none",color:C.muted,fontSize:12,cursor:"pointer",padding:"10px 0"}}>← Back</button>
      </div>
    );
  }

  // ─── UPLOAD / PASTE EMAILS ───
  if (phase === "upload") {
    return (
      <div style={{maxWidth:460,margin:"0 auto",padding:24,fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif",background:C.bg,minHeight:"100vh"}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:26,fontWeight:800,color:C.text}}>Waypoint</div>
          <div style={{fontSize:13,color:C.indigo,fontWeight:600}}>📧 Email Analysis Engine</div>
        </div>
        <div style={{background:C.indigoLight,borderRadius:14,padding:18,border:`2px solid ${C.indigoBorder}`,marginBottom:16}}>
          <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:6}}>Paste or upload your email thread</div>
          <div style={{fontSize:12,color:C.textSec,lineHeight:1.5,marginBottom:12}}>Waypoint will read the conversation and identify: promises made, timeline violations, red flags, buck-passing, and applicable laws. Then generate a response email for you.</div>
          <textarea value={emailText} onChange={e=>setEmailText(e.target.value)}
            placeholder={"Paste your email thread here...\n\nExample:\n\nFrom: SC Name <sc@rceb.org>\nDate: Jan 15\n\nHi [Parent],\n\nI will follow up on the respite authorization by next week.\n\n---\n\nFrom: You\nDate: Feb 1\n\nHi [SC],\n\nI'm following up again — still no update on the respite authorization. It's been over 3 weeks since you said you'd look into it.\n\nAlso, I was told the reimbursement for OT co-pays is 'not our responsibility' and to contact my insurance. But these are in our IPP..."}
            style={{width:"100%",minHeight:200,borderRadius:10,border:`1.5px solid ${C.indigoBorder}`,padding:14,fontSize:13,fontFamily:"inherit",lineHeight:1.5,resize:"vertical",background:"white",boxSizing:"border-box"}} />
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <button onClick={handlePasteAnalyze} disabled={!emailText.trim()} style={{flex:1,padding:"12px",background:emailText.trim()?C.indigo:C.mutedLight,color:emailText.trim()?"white":C.muted,border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:emailText.trim()?"pointer":"default"}}>
              🔍 Analyze Email Thread
            </button>
            <button onClick={()=>fileInputRef.current?.click()} style={{padding:"12px 16px",background:"white",border:`1.5px solid ${C.indigoBorder}`,borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer",color:C.indigo}}>
              📎 Upload .txt
            </button>
            <input ref={fileInputRef} type="file" accept=".txt,.eml,.msg" onChange={handleFileUpload} style={{display:"none"}} />
          </div>
        </div>
        <div style={{background:C.card,borderRadius:12,padding:14,border:`1px solid ${C.border}`,fontSize:12,color:C.textSec,lineHeight:1.5}}>
          <div style={{fontWeight:700,color:C.text,marginBottom:4}}>💡 What Waypoint looks for:</div>
          <div>• <b>Promises:</b> "I will follow up," "by next week," "we'll schedule"</div>
          <div>• <b>Red flags:</b> Budget excuses, "not our responsibility," generic resource claims</div>
          <div>• <b>Timeline issues:</b> Repeated follow-ups, weeks/months of waiting</div>
          <div>• <b>Legal violations:</b> Missed statutory deadlines (15-day intake, 120-day eligibility)</div>
          <div>• <b>Soft denials:</b> "Unfortunately," "at this time," "unable to"</div>
        </div>
        <button onClick={()=>setPhase("issue_type")} style={{background:"none",border:"none",color:C.muted,fontSize:12,cursor:"pointer",padding:"12px 0"}}>← Back</button>
      </div>
    );
  }

  // ─── RESULTS with actions ───
  return (
    <div style={{maxWidth:500,margin:"0 auto",padding:24,fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif",background:C.bg,minHeight:"100vh"}}>
      <div style={{marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
          <div style={{fontSize:24,fontWeight:800,color:C.text}}>Waypoint</div>
          <div style={{fontSize:10,fontWeight:600,color:C.rose,background:C.roseLight,padding:"2px 7px",borderRadius:5}}>DEEP DIAGNOSTIC</div>
        </div>
        <div style={{display:"flex",gap:8,marginTop:6,flexWrap:"wrap"}}>
          <button onClick={()=>goBack("start")} style={{fontSize:11,color:C.muted,background:C.mutedLight,border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontWeight:500}}>↺ Start over</button>
          <button onClick={()=>setPhase("upload")} style={{fontSize:11,color:C.indigo,background:C.indigoLight,border:`1px solid ${C.indigoBorder}`,borderRadius:6,padding:"4px 10px",cursor:"pointer",fontWeight:600}}>📧 Analyze emails</button>
          {target==="rc"&&<button onClick={()=>setShowPanel("reimbursement")} style={{fontSize:11,color:C.teal,background:C.tealLight,border:`1px solid ${C.tealBorder}`,borderRadius:6,padding:"4px 10px",cursor:"pointer",fontWeight:600}}>💰 What RC reimburses</button>}
        </div>
      </div>

      {/* Actions */}
      {actions.length>0&&<div style={{fontSize:10,fontWeight:700,color:C.rose,letterSpacing:0.6,marginBottom:8,textTransform:"uppercase"}}>⚡ Your personalized action plan ({actions.length} steps)</div>}
      {actions.map((a,i)=>(
        <ActionCard key={a.id} action={a} expanded={expanded===i} onExpand={()=>setExpanded(expanded===i?-1:i)}
          isCompleted={completed.has(i)} onToggle={()=>setCompleted(prev=>{const n=new Set(prev);n.has(i)?n.delete(i):n.add(i);return n})} />
      ))}

      {actions.length===0&&!showPanel&&(
        <div style={{textAlign:"center",padding:40,color:C.muted}}>
          <div style={{fontSize:36,marginBottom:12}}>🔍</div>
          <div style={{fontSize:14}}>Select an issue to get your action plan</div>
        </div>
      )}

      {/* REIMBURSEMENT KNOWLEDGE BASE PANEL */}
      {showPanel==="reimbursement"&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",justifyContent:"flex-end"}} onClick={()=>setShowPanel(null)}>
          <div style={{width:"100%",maxWidth:500,background:C.bg,height:"100%",overflowY:"auto",padding:24,boxShadow:"-8px 0 32px rgba(0,0,0,0.15)"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
              <div><div style={{fontSize:20,fontWeight:800,color:C.text}}>💰 What RC Reimburses</div><div style={{fontSize:12,color:C.teal,fontWeight:600}}>Complete guide — know what's available</div></div>
              <button onClick={()=>setShowPanel(null)} style={{background:C.mutedLight,border:"none",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:16}}>×</button>
            </div>
            <div style={{background:C.warnLight,borderRadius:10,padding:12,marginBottom:14,fontSize:12,lineHeight:1.5,borderLeft:`3px solid ${C.warn}`}}>
              <b>Key:</b> RC is payer of last resort (Insurance → School → Medi-Cal → RC). But RC <b>must</b> cover gaps. Keep all denial letters and EOBs.
            </div>
            {RC_REIMBURSABLE.categories.map((cat,i)=>(
              <div key={i} style={{background:C.card,borderRadius:12,padding:14,marginBottom:8,border:`1px solid ${C.border}`}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <div style={{fontSize:14,fontWeight:700,color:C.text}}>{cat.name}</div>
                  <span style={{fontSize:9,fontWeight:600,color:C.accent,background:C.accentLight,padding:"2px 6px",borderRadius:4}}>POS {cat.code}</span>
                </div>
                <div style={{fontSize:12,color:C.textSec,lineHeight:1.4,marginBottom:4}}>{cat.description}</div>
                <div style={{fontSize:11,color:C.teal}}>💰 {cat.typical}</div>
                <div style={{fontSize:11,color:C.warn,marginTop:1}}>💡 {cat.notes}</div>
              </div>
            ))}
            <div style={{marginTop:16,fontSize:14,fontWeight:700,color:C.text,marginBottom:10}}>📋 Statutory Timelines</div>
            {Object.entries(RC_REIMBURSABLE.timeline_rules).map(([k,r])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.border}`,fontSize:12}}>
                <div style={{fontWeight:600,textTransform:"capitalize"}}>{k.replace(/_/g," ")}</div>
                <div style={{textAlign:"right",color:C.textSec}}>{r.statutory}<br/><span style={{fontSize:10,color:C.muted}}>{r.law}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EMAIL ANALYSIS PANEL */}
      {showPanel==="email_analysis"&&emailAnalysis&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",justifyContent:"flex-end"}} onClick={()=>setShowPanel(null)}>
          <div style={{width:"100%",maxWidth:500,background:C.bg,height:"100%",overflowY:"auto",padding:24,boxShadow:"-8px 0 32px rgba(0,0,0,0.15)"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
              <div><div style={{fontSize:20,fontWeight:800,color:C.text}}>📧 Email Analysis</div><div style={{fontSize:12,color:C.indigo,fontWeight:600}}>{emailAnalysis.summary}</div></div>
              <button onClick={()=>setShowPanel(null)} style={{background:C.mutedLight,border:"none",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:16}}>×</button>
            </div>
            {emailAnalysis.promises.length>0&&<div style={{background:C.accentLight,borderRadius:12,padding:14,marginBottom:12,border:`1px solid #BFDBFE`}}>
              <div style={{fontSize:10,fontWeight:700,color:C.accent,marginBottom:8,textTransform:"uppercase"}}>📝 Promises detected ({emailAnalysis.promises.length})</div>
              {emailAnalysis.promises.map((p,i)=><div key={i} style={{fontSize:12,marginBottom:4,padding:"4px 8px",background:"white",borderRadius:6}}>"{p.text}" <span style={{fontSize:10,color:C.muted}}>— {p.type}</span></div>)}
            </div>}
            {emailAnalysis.red_flags.length>0&&<div style={{background:C.urgentLight,borderRadius:12,padding:14,marginBottom:12,border:`1px solid ${C.urgentBorder}`}}>
              <div style={{fontSize:10,fontWeight:700,color:C.urgent,marginBottom:8,textTransform:"uppercase"}}>🚩 Red flags ({emailAnalysis.red_flags.length})</div>
              {emailAnalysis.red_flags.map((r,i)=><div key={i} style={{fontSize:12,marginBottom:4,padding:"4px 8px",background:"white",borderRadius:6}}>{r}</div>)}
            </div>}
            {emailAnalysis.timeline_issues.length>0&&<div style={{background:C.warnLight,borderRadius:12,padding:14,marginBottom:12,border:`1px solid ${C.warnBorder}`}}>
              <div style={{fontSize:10,fontWeight:700,color:C.warn,marginBottom:8,textTransform:"uppercase"}}>⏰ Timeline issues</div>
              {emailAnalysis.timeline_issues.map((t,i)=><div key={i} style={{fontSize:12,marginBottom:4}}>{t}</div>)}
            </div>}
            {emailAnalysis.legal_citations.length>0&&<div style={{background:C.tealLight,borderRadius:12,padding:14,marginBottom:12,border:`1px solid ${C.tealBorder}`}}>
              <div style={{fontSize:10,fontWeight:700,color:C.teal,marginBottom:8,textTransform:"uppercase"}}>⚖️ Applicable laws ({emailAnalysis.legal_citations.length})</div>
              {emailAnalysis.legal_citations.map((c,i)=><div key={i} style={{fontSize:12,marginBottom:4}}>{c}</div>)}
            </div>}
            {emailAnalysis.promises.length===0&&emailAnalysis.red_flags.length===0&&<div style={{background:C.successLight,borderRadius:12,padding:14,marginBottom:12,fontSize:13}}>No major issues detected. Communication looks straightforward. Keep documenting.</div>}
            <button onClick={useEmailResponse} style={{width:"100%",padding:"14px",background:C.indigo,color:"white",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer"}}>
              ✉️ Generate response email with findings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
