import { useState } from "react";

const NAVY = "#1B2A4A";
const TEAL = "#0891B2";
const CORAL = "#F97316";
const SAGE = "#10B981";
const DARK = "#334155";
const MID = "#64748B";
const LIGHT = "#F8FAFC";
const WHITE = "#FFFFFF";
const DEEP = "#0F172A";

const Phone = ({ children }) => (
  <div style={{ width: 375, height: 812, borderRadius: 44, background: WHITE, border: `3px solid ${DARK}`, overflow: "hidden", position: "relative", boxShadow: "0 25px 60px rgba(0,0,0,0.3)", fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif" }}>
    <div style={{ height: 50, background: WHITE, display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "0 28px 4px", fontSize: 14, fontWeight: 600, color: DARK }}>
      <span>9:41</span>
      <div style={{ width: 126, height: 34, background: DARK, borderRadius: 20, position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)" }} />
      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
        <svg width="16" height="12" viewBox="0 0 16 12"><rect x="0" y="5" width="3" height="7" rx="1" fill={DARK}/><rect x="4.5" y="3" width="3" height="9" rx="1" fill={DARK}/><rect x="9" y="1" width="3" height="11" rx="1" fill={DARK}/><rect x="13.5" y="0" width="3" height="12" rx="1" fill={DARK}/></svg>
        <svg width="24" height="12" viewBox="0 0 24 12"><rect x="0" y="0" width="22" height="12" rx="3" stroke={DARK} strokeWidth="1.5" fill="none"/><rect x="2" y="2" width="16" height="8" rx="1.5" fill={SAGE}/><rect x="23" y="4" width="2" height="4" rx="1" fill={DARK}/></svg>
      </div>
    </div>
    <div style={{ height: 762, overflowY: "auto", overflowX: "hidden" }}>{children}</div>
  </div>
);

const TabBar = ({ active = "home" }) => {
  const tabs = [
    { id: "home", icon: "🏠", label: "Home" },
    { id: "navigator", icon: "🤖", label: "Navigator" },
    { id: "tracker", icon: "💰", label: "Tracker" },
    { id: "docs", icon: "📄", label: "Documents" },
    { id: "profile", icon: "👤", label: "Profile" },
  ];
  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 83, background: WHITE, borderTop: "1px solid #E2E8F0", display: "flex", justifyContent: "space-around", alignItems: "flex-start", paddingTop: 8, paddingBottom: 28 }}>
      {tabs.map(t => (
        <div key={t.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, opacity: active === t.id ? 1 : 0.45 }}>
          <span style={{ fontSize: 22 }}>{t.icon}</span>
          <span style={{ fontSize: 10, fontWeight: active === t.id ? 700 : 500, color: active === t.id ? TEAL : MID }}>{t.label}</span>
        </div>
      ))}
    </div>
  );
};

// ========== SCREEN 1: HOME — AI as Quarterback ==========
const HomeScreen = () => (
  <Phone>
    <div style={{ padding: "0 20px", paddingBottom: 100 }}>
      <div style={{ padding: "8px 0 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 15, color: MID, margin: 0, fontWeight: 500 }}>Good morning, Mike 👋</p>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: NAVY, margin: "4px 0 0" }}>Maya's Dashboard</h1>
          </div>
          <div style={{ width: 42, height: 42, borderRadius: 21, background: `linear-gradient(135deg, ${TEAL}, ${SAGE})`, display: "flex", alignItems: "center", justifyContent: "center", color: WHITE, fontWeight: 700, fontSize: 16 }}>MB</div>
        </div>
      </div>
      {/* AI Action Queue — THE QUARTERBACK */}
      <div style={{ background: `linear-gradient(135deg, ${NAVY}, #1E3A5F)`, borderRadius: 16, padding: 18, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 14 }}>🤖</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: TEAL, textTransform: "uppercase", letterSpacing: 1 }}>AI Action Queue</span>
          <span style={{ marginLeft: "auto", fontSize: 11, background: CORAL, color: WHITE, padding: "2px 8px", borderRadius: 8, fontWeight: 700 }}>3 ready</span>
        </div>
        {[
          { icon: "✉️", title: "Email drafted → Dr. Patel", desc: "Requesting letter of medical necessity for OT appeal", action: "Review & Send", color: TEAL },
          { icon: "📝", title: "IEP edits ready for review", desc: "AI marked 4 goals as met, suggests 3 new goals", action: "Review Edits", color: CORAL },
          { icon: "💸", title: "Reimbursement request drafted", desc: "RCEB reimbursement for $340 adaptive equipment", action: "Review & Submit", color: SAGE },
        ].map((a, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 14px", marginBottom: i < 2 ? 8 : 0, border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 18, marginTop: 1 }}>{a.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: WHITE, margin: 0 }}>{a.title}</p>
                <p style={{ fontSize: 12, color: "#94A3B8", margin: "3px 0 0" }}>{a.desc}</p>
              </div>
            </div>
            <button style={{ width: "100%", height: 34, borderRadius: 8, background: a.color, border: "none", color: WHITE, fontSize: 12, fontWeight: 700, cursor: "pointer", marginTop: 8, letterSpacing: 0.3 }}>{a.action}</button>
          </div>
        ))}
      </div>
      {/* Deadline with AI action */}
      <div style={{ background: "#FFF7ED", borderRadius: 14, padding: "14px 16px", marginBottom: 14, border: "1px solid #FED7AA" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>⚠️</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#C2410C" }}>IEP REVIEW IN 12 DAYS</span>
        </div>
        <p style={{ fontSize: 14, fontWeight: 600, color: DARK, margin: "6px 0 2px" }}>Annual Review — April 14</p>
        <p style={{ fontSize: 12, color: MID, margin: "0 0 8px" }}>AI has prepared your meeting agenda + IEP edits</p>
        <button style={{ height: 32, borderRadius: 8, background: CORAL, border: "none", color: WHITE, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "0 14px" }}>View Prep Package →</button>
      </div>
      {/* Quick Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { icon: "🤖", label: "Ask AI\nAnything", bg: `${TEAL}12`, brd: `${TEAL}30` },
          { icon: "✉️", label: "Draft an\nEmail", bg: `${CORAL}12`, brd: `${CORAL}30` },
          { icon: "💰", label: "File a\nReimbursement", bg: `${SAGE}12`, brd: `${SAGE}30` },
          { icon: "📋", label: "Check My\nBenefits", bg: "#8B5CF612", brd: "#8B5CF630" },
        ].map(a => (
          <div key={a.label} style={{ height: 82, borderRadius: 14, background: a.bg, border: `1.5px solid ${a.brd}`, display: "flex", alignItems: "center", padding: "0 14px", gap: 12, cursor: "pointer" }}>
            <span style={{ fontSize: 26 }}>{a.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: DARK, lineHeight: 1.3, whiteSpace: "pre-line" }}>{a.label}</span>
          </div>
        ))}
      </div>
      {/* Upcoming */}
      <h3 style={{ fontSize: 15, fontWeight: 700, color: NAVY, margin: "0 0 8px" }}>Upcoming</h3>
      {[
        { time: "Tue 10:00 AM", title: "OT — Sarah Chen", tag: "Therapy", color: TEAL },
        { time: "Thu 11:00 AM", title: "Pediatrician Follow-up", tag: "Medical", color: CORAL },
      ].map((apt, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: i < 1 ? "1px solid #F1F5F9" : "none" }}>
          <div style={{ width: 4, height: 36, borderRadius: 2, background: apt.color }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: DARK, margin: 0 }}>{apt.title}</p>
            <p style={{ fontSize: 12, color: MID, margin: "2px 0 0" }}>{apt.time}</p>
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: apt.color, background: apt.color + "15", padding: "3px 8px", borderRadius: 6 }}>{apt.tag}</span>
        </div>
      ))}
    </div>
    <TabBar active="home" />
  </Phone>
);

// ========== SCREEN 2: AI NAVIGATOR — Agent Mode ==========
const NavigatorScreen = () => (
  <Phone>
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "8px 20px 10px", borderBottom: "1px solid #E2E8F0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: NAVY, margin: 0 }}>AI Navigator</h2>
          <button style={{ fontSize: 13, color: TEAL, fontWeight: 600, background: "none", border: "none" }}>+ New</button>
        </div>
        <p style={{ fontSize: 11, color: MID, margin: "3px 0 0" }}>Answers cite law • Drafts emails • Writes appeals</p>
      </div>
      <div style={{ flex: 1, padding: "14px 20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14, paddingBottom: 150 }}>
        {/* User */}
        <div style={{ alignSelf: "flex-end", maxWidth: "82%" }}>
          <div style={{ background: TEAL, borderRadius: "18px 18px 4px 18px", padding: "11px 15px", color: WHITE, fontSize: 15, lineHeight: 1.45 }}>Insurance denied Maya's OT. Can you handle the appeal?</div>
        </div>
        {/* AI Agent Response */}
        <div style={{ alignSelf: "flex-start", maxWidth: "90%" }}>
          <div style={{ background: LIGHT, borderRadius: "18px 18px 18px 4px", padding: "14px 16px", border: "1px solid #E2E8F0" }}>
            <p style={{ fontSize: 15, color: DARK, margin: "0 0 10px", lineHeight: 1.45 }}>On it. Here's what I've done and what I need from you:</p>
            {/* Completed actions */}
            {[
              { status: "done", text: "Pulled Maya's OT evaluation from your documents" },
              { status: "done", text: "Drafted appeal letter citing CA Insurance Code §10145.3 and Mental Health Parity Act" },
              { status: "done", text: "Drafted email to Sarah Chen requesting a medical necessity letter" },
              { status: "wait", text: "Need you to review & approve the appeal letter" },
              { status: "wait", text: "Need you to send the email to Sarah (I can't send directly)" },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ minWidth: 20, height: 20, borderRadius: 10, background: s.status === "done" ? SAGE : "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: WHITE, marginTop: 1 }}>{s.status === "done" ? "✓" : "○"}</div>
                <p style={{ fontSize: 14, color: s.status === "done" ? MID : DARK, margin: 0, lineHeight: 1.35, textDecoration: s.status === "done" ? "none" : "none" }}>{s.text}</p>
              </div>
            ))}
            {/* Action buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
              <button style={{ height: 40, borderRadius: 10, background: TEAL, border: "none", color: WHITE, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>📝 Review Appeal Letter</button>
              <button style={{ height: 40, borderRadius: 10, background: CORAL, border: "none", color: WHITE, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>✉️ Review Email to Sarah Chen</button>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
              {["CA Ins. Code §10145.3", "Parity Act", "Lanterman §4648"].map(s => (
                <span key={s} style={{ fontSize: 10, color: TEAL, background: `${TEAL}10`, padding: "3px 7px", borderRadius: 4, fontWeight: 500 }}>{s}</span>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, margin: "5px 0 0 8px" }}>
            <span style={{ fontSize: 11, color: MID }}>2:34 PM</span>
            <span style={{ fontSize: 14, cursor: "pointer" }}>👍</span>
            <span style={{ fontSize: 14, cursor: "pointer", opacity: 0.4 }}>👎</span>
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 83, left: 0, right: 0, padding: "10px 20px", background: WHITE, borderTop: "1px solid #E2E8F0" }}>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1, height: 44, borderRadius: 22, background: LIGHT, border: "1.5px solid #E2E8F0", padding: "0 16px", display: "flex", alignItems: "center", fontSize: 14, color: MID }}>Ask anything or tell me what to do...</div>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: TEAL, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: WHITE, fontSize: 18 }}>↑</div>
        </div>
      </div>
      <TabBar active="navigator" />
    </div>
  </Phone>
);

// ========== SCREEN 3: EMAIL DRAFT ==========
const EmailDraftScreen = () => (
  <Phone>
    <div style={{ padding: "0 20px", paddingBottom: 100 }}>
      <div style={{ padding: "8px 0 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><span style={{ color: MID }}>← Back to Navigator</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${TEAL}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🤖</div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: NAVY, margin: 0 }}>AI-Drafted Email</h2>
            <p style={{ fontSize: 12, color: MID, margin: 0 }}>Review, edit, and send</p>
          </div>
        </div>
      </div>
      {/* Email preview */}
      <div style={{ border: "1.5px solid #E2E8F0", borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ background: LIGHT, padding: "12px 16px", borderBottom: "1px solid #E2E8F0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: MID, fontWeight: 500 }}>To:</span>
            <span style={{ fontSize: 13, color: DARK }}>sarah.chen@eastbayot.com</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: MID, fontWeight: 500 }}>Subject:</span>
            <span style={{ fontSize: 13, color: DARK, fontWeight: 600 }}>Medical Necessity Letter for Maya Beebe — OT Services</span>
          </div>
        </div>
        <div style={{ padding: 16 }}>
          <p style={{ fontSize: 14, color: DARK, margin: "0 0 12px", lineHeight: 1.55 }}>Dear Sarah,</p>
          <p style={{ fontSize: 14, color: DARK, margin: "0 0 12px", lineHeight: 1.55 }}>I'm writing regarding my daughter Maya Beebe (DOB: 3/14/2022), who has been receiving OT services at your practice. Our insurance (Blue Shield) has denied continued OT beyond 20 sessions.</p>
          <p style={{ fontSize: 14, color: DARK, margin: "0 0 12px", lineHeight: 1.55 }}>To support our appeal, we need a letter of medical necessity from you that addresses:</p>
          <div style={{ padding: "8px 0 8px 8px" }}>
            {["Maya's current functional limitations", "Why continued OT is medically necessary", "Expected outcomes if services continue vs. are discontinued", "Specific goals that require additional sessions"].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "flex-start" }}>
                <span style={{ fontSize: 12, color: TEAL, fontWeight: 700, marginTop: 1 }}>•</span>
                <span style={{ fontSize: 14, color: DARK, lineHeight: 1.4 }}>{item}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 14, color: DARK, margin: "8px 0 12px", lineHeight: 1.55 }}>Our appeal deadline is May 28, 2026, so we'd appreciate receiving this letter by May 15 if possible.</p>
          <p style={{ fontSize: 14, color: DARK, margin: "0 0 4px", lineHeight: 1.55 }}>Thank you so much for your continued support of Maya's progress.</p>
          <p style={{ fontSize: 14, color: DARK, margin: "12px 0 0", lineHeight: 1.55 }}>Best regards,<br/>Mike Beebe</p>
        </div>
      </div>
      <div style={{ background: `${TEAL}08`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, border: `1px solid ${TEAL}20` }}>
        <p style={{ fontSize: 12, color: TEAL, fontWeight: 600, margin: 0 }}>🤖 AI Note</p>
        <p style={{ fontSize: 12, color: MID, margin: "4px 0 0", lineHeight: 1.4 }}>I included the specific points insurers look for in medical necessity letters. You can edit anything above before sending.</p>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button style={{ flex: 1, height: 48, borderRadius: 12, background: TEAL, border: "none", color: WHITE, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Open in Mail ✉️</button>
        <button style={{ width: 48, height: 48, borderRadius: 12, background: LIGHT, border: "1.5px solid #E2E8F0", fontSize: 16, cursor: "pointer" }}>📋</button>
      </div>
    </div>
  </Phone>
);

// ========== SCREEN 4: IEP REDLINE ==========
const IEPRedlineScreen = () => (
  <Phone>
    <div style={{ padding: "0 20px", paddingBottom: 100 }}>
      <div style={{ padding: "8px 0 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><span style={{ color: MID }}>← Back</span></div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: NAVY, margin: 0 }}>IEP Review: AI Suggestions</h2>
        <p style={{ fontSize: 13, color: MID, margin: "4px 0 0" }}>Maya's IEP 2025–2026 • 4 edits suggested</p>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: WHITE, background: TEAL, padding: "6px 12px", borderRadius: 8 }}>All (4)</span>
        <span style={{ fontSize: 12, color: SAGE, background: `${SAGE}12`, padding: "6px 12px", borderRadius: 8, border: `1px solid ${SAGE}30` }}>Goals Met (2)</span>
        <span style={{ fontSize: 12, color: CORAL, background: `${CORAL}12`, padding: "6px 12px", borderRadius: 8, border: `1px solid ${CORAL}30` }}>New Goals (2)</span>
      </div>
      {/* Edits */}
      {[
        { type: "met", label: "GOAL MET ✓", title: "Fine Motor: Grasp and release small objects", current: "Maya will grasp and release 1-inch objects with 80% accuracy by June 2026.", ai: "Based on Sarah Chen's March progress report, Maya is achieving 92% accuracy. Recommend marking as MET and advancing to next goal.", color: SAGE },
        { type: "met", label: "GOAL MET ✓", title: "Communication: Use 2-word phrases", current: "Maya will use 2-word phrases to make requests in 4 of 5 opportunities.", ai: "Dr. Patel's speech report shows Maya consistently using 3-word phrases. Recommend marking as MET.", color: SAGE },
        { type: "new", label: "NEW GOAL +", title: "Sensory: Self-regulation in group settings", current: null, ai: "Based on Maya's behavioral data, I recommend adding a sensory regulation goal: 'Maya will use a self-regulation strategy (deep breathing, sensory break request) when overstimulated in group settings, in 3 of 5 opportunities.'", color: CORAL },
        { type: "new", label: "INCREASE SERVICES +", title: "Request OT increase to 3x weekly", current: "Current: 2x weekly OT sessions", ai: "Maya's progress on fine motor goals shows she benefits significantly from OT. With the fine motor goal met, I recommend increasing to 3x weekly to target new goals. Draft request letter attached.", color: CORAL },
      ].map((edit, i) => (
        <div key={i} style={{ borderRadius: 14, border: `1.5px solid ${edit.color}30`, marginBottom: 12, overflow: "hidden" }}>
          <div style={{ background: `${edit.color}12`, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: edit.color }}>{edit.label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: DARK }}>{edit.title}</span>
          </div>
          <div style={{ padding: 14 }}>
            {edit.current && (
              <div style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: MID }}>CURRENT IEP</span>
                <p style={{ fontSize: 13, color: DARK, margin: "4px 0 0", lineHeight: 1.4, background: "#FEE2E2", padding: "6px 10px", borderRadius: 6, borderLeft: "3px solid #EF4444", textDecoration: edit.type === "met" ? "line-through" : "none", textDecorationColor: "#EF4444" }}>{edit.current}</p>
              </div>
            )}
            <div>
              <span style={{ fontSize: 11, fontWeight: 600, color: TEAL }}>🤖 AI RECOMMENDATION</span>
              <p style={{ fontSize: 13, color: DARK, margin: "4px 0 0", lineHeight: 1.4, background: `${TEAL}08`, padding: "6px 10px", borderRadius: 6, borderLeft: `3px solid ${TEAL}` }}>{edit.ai}</p>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button style={{ flex: 1, height: 34, borderRadius: 8, background: edit.color, border: "none", color: WHITE, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Accept</button>
              <button style={{ flex: 1, height: 34, borderRadius: 8, background: LIGHT, border: "1.5px solid #E2E8F0", color: DARK, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Edit</button>
              <button style={{ width: 34, height: 34, borderRadius: 8, background: LIGHT, border: "1.5px solid #E2E8F0", fontSize: 12, cursor: "pointer" }}>✕</button>
            </div>
          </div>
        </div>
      ))}
      <button style={{ width: "100%", height: 48, borderRadius: 12, background: TEAL, border: "none", color: WHITE, fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 8 }}>Generate Parent Agenda with Edits 📋</button>
    </div>
  </Phone>
);

// ========== SCREEN 5: REIMBURSEMENT TRACKER ==========
const ReimbursementScreen = () => (
  <Phone>
    <div style={{ padding: "0 20px", paddingBottom: 100 }}>
      <div style={{ padding: "8px 0 16px" }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: NAVY, margin: 0 }}>Reimbursements</h2>
        <p style={{ fontSize: 13, color: MID, margin: "4px 0 0" }}>Track every dollar owed to you</p>
      </div>
      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
        {[
          { label: "Pending", amount: "$1,240", color: CORAL },
          { label: "Approved", amount: "$680", color: TEAL },
          { label: "Received", amount: "$2,340", color: SAGE },
        ].map(s => (
          <div key={s.label} style={{ background: `${s.color}10`, borderRadius: 12, padding: "12px 10px", textAlign: "center", border: `1px solid ${s.color}25` }}>
            <p style={{ fontSize: 20, fontWeight: 800, color: s.color, margin: 0 }}>{s.amount}</p>
            <p style={{ fontSize: 11, color: MID, margin: "2px 0 0", fontWeight: 600 }}>{s.label}</p>
          </div>
        ))}
      </div>
      {/* AI-Drafted Reimbursement */}
      <div style={{ background: `${TEAL}06`, borderRadius: 14, padding: 16, marginBottom: 16, border: `1.5px solid ${TEAL}20` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 14 }}>🤖</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: TEAL }}>AI-Ready Submission</span>
        </div>
        <p style={{ fontSize: 14, fontWeight: 600, color: DARK, margin: "0 0 4px" }}>RCEB Reimbursement — Adaptive Swing ($340)</p>
        <p style={{ fontSize: 12, color: MID, margin: "0 0 10px", lineHeight: 1.4 }}>AI drafted the request form citing POS code 862 (Specialized Equipment). Attached receipt and OT recommendation letter.</p>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ flex: 1, height: 36, borderRadius: 8, background: TEAL, border: "none", color: WHITE, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Review & Submit</button>
          <button style={{ width: 36, height: 36, borderRadius: 8, background: WHITE, border: "1.5px solid #E2E8F0", fontSize: 14, cursor: "pointer" }}>📝</button>
        </div>
      </div>
      {/* Reimbursement list */}
      <h3 style={{ fontSize: 14, fontWeight: 700, color: NAVY, margin: "0 0 10px" }}>Recent Claims</h3>
      {[
        { title: "Blue Shield — OT sessions (Jan-Feb)", amount: "$480", status: "Pending", days: "Submitted 18 days ago", color: CORAL, ai: "If not resolved in 12 days, AI will draft follow-up" },
        { title: "RCEB — Respite care hours (Feb)", amount: "$760", status: "Approved", days: "Payment expected in 2 weeks", color: TEAL, ai: null },
        { title: "Blue Shield — ABA authorization", amount: "$2,340", status: "Received", days: "Deposited Mar 12", color: SAGE, ai: null },
        { title: "RCEB — Sensory equipment", amount: "$180", status: "Pending", days: "Submitted 8 days ago", color: CORAL, ai: null },
      ].map((r, i) => (
        <div key={i} style={{ padding: "12px 0", borderBottom: i < 3 ? "1px solid #F1F5F9" : "none" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: DARK, margin: 0 }}>{r.title}</p>
              <p style={{ fontSize: 12, color: MID, margin: "2px 0 0" }}>{r.days}</p>
              {r.ai && <p style={{ fontSize: 11, color: TEAL, margin: "4px 0 0", fontStyle: "italic" }}>🤖 {r.ai}</p>}
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: DARK, margin: 0 }}>{r.amount}</p>
              <span style={{ fontSize: 11, fontWeight: 600, color: r.color, background: r.color + "12", padding: "2px 8px", borderRadius: 4 }}>{r.status}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
    <TabBar active="tracker" />
  </Phone>
);

// ========== SCREEN 6: BENEFITS CHECKER ==========
const BenefitsScreen = () => (
  <Phone>
    <div style={{ padding: "0 20px", paddingBottom: 100 }}>
      <div style={{ padding: "8px 0 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><span style={{ color: MID }}>←</span></div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: NAVY, margin: 0 }}>Maya's Benefits</h2>
        <p style={{ fontSize: 13, color: MID, margin: "4px 0 0" }}>ASD • Age 3 • Alameda County • RCEB</p>
      </div>
      {[
        { name: "Regional Center Services", status: "Receiving", icon: "✅", desc: "ABA, respite, equipment through RCEB", color: SAGE, action: null },
        { name: "SSI ($967/month)", status: "AI Drafted Application", icon: "🤖", desc: "You likely qualify. AI has pre-filled the SSI application based on Maya's profile.", color: TEAL, action: "Review Application" },
        { name: "IHSS (Personal Care Hours)", status: "Likely Eligible", icon: "🎯", desc: "AI can draft the county application and the self-assessment form.", color: TEAL, action: "Have AI Draft It" },
        { name: "ABLE Account", status: "Eligible", icon: "🎯", desc: "Tax-advantaged savings. AI can walk you through setup in 10 minutes.", color: TEAL, action: "Start Setup" },
        { name: "Medical Expense Deduction", status: "AI Tracking", icon: "🤖", desc: "You're $1,720 from the threshold. AI is tracking all qualifying expenses.", color: SAGE, action: null },
        { name: "Medi-Cal Waiver", status: "Check Eligibility", icon: "❓", desc: "May qualify for HCBS waiver. AI needs your income range to check.", color: CORAL, action: "Answer 2 Questions" },
      ].map((b, i) => (
        <div key={i} style={{ borderRadius: 14, border: "1.5px solid #E2E8F0", padding: 14, marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 18 }}>{b.icon}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: DARK, margin: 0 }}>{b.name}</p>
              <span style={{ fontSize: 11, fontWeight: 600, color: b.color, background: b.color + "15", padding: "2px 8px", borderRadius: 4, display: "inline-block", marginTop: 3 }}>{b.status}</span>
            </div>
          </div>
          <p style={{ fontSize: 13, color: MID, margin: "8px 0 0", lineHeight: 1.4 }}>{b.desc}</p>
          {b.action && <button style={{ marginTop: 8, height: 34, borderRadius: 8, background: TEAL, border: "none", color: WHITE, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "0 14px" }}>{b.action}</button>}
        </div>
      ))}
    </div>
    <TabBar active="home" />
  </Phone>
);

// ========== SCREEN 7: CUSTOMER JOURNEY FLOW ==========
const JourneyFlow = () => {
  const phases = [
    {
      name: "DISCOVER",
      color: "#8B5CF6",
      subtitle: "Parent finds Waypoint",
      steps: [
        { text: "Child diagnosed with disability", icon: "🏥" },
        { text: "Parent searches for help (FB group, therapist referral, Google)", icon: "🔍" },
        { text: "Finds Waypoint (app store, referral link, provider rec)", icon: "📱" },
        { text: "Downloads app", icon: "⬇️" },
      ]
    },
    {
      name: "ONBOARD",
      color: TEAL,
      subtitle: "Tell us about your child",
      steps: [
        { text: "Create account (email / Apple / Google)", icon: "🔐" },
        { text: "Add child: name, DOB, diagnosis", icon: "👶" },
        { text: "Select state + Regional Center", icon: "📍" },
        { text: "Add insurance carrier", icon: "🏥" },
        { text: "AI generates personalized benefits list", icon: "🤖" },
      ]
    },
    {
      name: "FIRST VALUE",
      color: SAGE,
      subtitle: "Immediate 'aha' moment",
      steps: [
        { text: "See all programs you're eligible for — many you didn't know about", icon: "💡" },
        { text: "Ask AI: 'What should I do first?'", icon: "🤖" },
        { text: "AI gives prioritized next steps with specific actions", icon: "✅" },
        { text: "Upload existing IEP or evaluation → AI analyzes it", icon: "📄" },
      ]
    },
    {
      name: "AI TAKES ACTION",
      color: CORAL,
      subtitle: "AI does the work — parent reviews",
      steps: [
        { text: "AI drafts emails to providers, school, RC coordinator", icon: "✉️" },
        { text: "AI writes insurance appeal letters with legal citations", icon: "📝" },
        { text: "AI reviews IEP and suggests edits / new goals", icon: "🔍" },
        { text: "AI drafts reimbursement requests with receipts attached", icon: "💰" },
        { text: "AI prepares IEP/IPP meeting agendas with talking points", icon: "📋" },
        { text: "Parent reviews, edits if needed, hits send/submit", icon: "👆" },
      ]
    },
    {
      name: "TRACK & MANAGE",
      color: NAVY,
      subtitle: "Ongoing case management",
      steps: [
        { text: "Expense tracker logs every dollar — categories + funding sources", icon: "💰" },
        { text: "Reimbursement tracker follows up automatically", icon: "📊" },
        { text: "Deadline engine alerts before IEP reviews, appeal windows, SSI reviews", icon: "⏰" },
        { text: "Document vault stores IEPs, evaluations, letters — organized + searchable", icon: "📁" },
        { text: "AI proactively surfaces: 'You're $1,720 from the tax deduction threshold'", icon: "💡" },
      ]
    },
    {
      name: "GROW & EXPAND",
      color: SAGE,
      subtitle: "Long-term value",
      steps: [
        { text: "Age transitions: AI guides from Early Start → school-age → adulthood", icon: "📈" },
        { text: "New benefits discovered as eligibility changes", icon: "🎯" },
        { text: "Refer other parents → both get free month", icon: "🤝" },
        { text: "Community insights: 'Families like yours also got...'", icon: "👥" },
        { text: "Lifetime financial planning: ABLE accounts, trust planning, SSI management", icon: "🏦" },
      ]
    },
  ];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {phases.map((phase, pi) => (
        <div key={pi} style={{ marginBottom: 28 }}>
          {/* Phase header */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 22, background: phase.color, display: "flex", alignItems: "center", justifyContent: "center", color: WHITE, fontWeight: 800, fontSize: 16, boxShadow: `0 4px 14px ${phase.color}44` }}>{pi + 1}</div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: WHITE, margin: 0, letterSpacing: 1 }}>{phase.name}</h3>
              <p style={{ fontSize: 13, color: "#94A3B8", margin: 0 }}>{phase.subtitle}</p>
            </div>
          </div>
          {/* Steps */}
          <div style={{ marginLeft: 22, borderLeft: `2px solid ${phase.color}40`, paddingLeft: 28 }}>
            {phase.steps.map((step, si) => (
              <div key={si} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12, position: "relative" }}>
                <div style={{ position: "absolute", left: -36, top: 4, width: 14, height: 14, borderRadius: 7, background: DEEP, border: `2px solid ${phase.color}`, boxShadow: `0 0 0 3px ${DEEP}` }} />
                <span style={{ fontSize: 18, minWidth: 26, marginTop: -2 }}>{step.icon}</span>
                <p style={{ fontSize: 14, color: "#CBD5E1", margin: 0, lineHeight: 1.45 }}>{step.text}</p>
              </div>
            ))}
          </div>
          {/* Connector */}
          {pi < phases.length - 1 && (
            <div style={{ marginLeft: 22, height: 16, display: "flex", alignItems: "center" }}>
              <div style={{ width: 2, height: 16, background: `linear-gradient(${phase.color}40, ${phases[pi+1].color}40)`, marginLeft: 0 }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ========== MAIN APP ==========
const screens = [
  { id: "home", name: "Home (AI Queue)", component: HomeScreen },
  { id: "navigator", name: "AI Navigator", component: NavigatorScreen },
  { id: "email", name: "AI Email Draft", component: EmailDraftScreen },
  { id: "iep", name: "IEP AI Redline", component: IEPRedlineScreen },
  { id: "reimburse", name: "Reimbursements", component: ReimbursementScreen },
  { id: "benefits", name: "Benefits", component: BenefitsScreen },
  { id: "journey", name: "Customer Journey", component: null },
];

export default function WaypointMockups() {
  const [active, setActive] = useState(0);
  const isJourney = screens[active].id === "journey";
  const Screen = screens[active].component;

  return (
    <div style={{ minHeight: "100vh", background: DEEP, fontFamily: "'SF Pro Display', -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: WHITE, margin: 0 }}>Waypoint — UX Mockups & Journey</h1>
          <p style={{ fontSize: 14, color: "#94A3B8", margin: "6px 0 0" }}>AI does the work. Parent reviews and approves.</p>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 5, marginBottom: 32, flexWrap: "wrap" }}>
          {screens.map((s, i) => (
            <button key={s.id} onClick={() => setActive(i)} style={{ padding: "7px 14px", borderRadius: 10, border: "none", cursor: "pointer", background: active === i ? TEAL : "rgba(255,255,255,0.06)", color: active === i ? WHITE : "#94A3B8", fontSize: 12.5, fontWeight: active === i ? 700 : 500, transition: "all 0.2s" }}>{s.name}</button>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          {isJourney ? <JourneyFlow /> : <div><Screen /><p style={{ textAlign: "center", fontSize: 12, color: MID, marginTop: 14 }}>{active + 1} of {screens.length} — {screens[active].name}</p></div>}
        </div>
      </div>
    </div>
  );
}
