import { useState } from "react";

const stages = [
  {
    icon: "🔍",
    title: "Discovery",
    color: "#2E6B4F",
    bg: "#EAF5EF",
    items: [
      { label: "Facebook Groups", desc: "IEP parent communities (Special Ed Advocacy, IEP/504 Support) — #1 channel. Parents share resources aggressively." },
      { label: "Reddit", desc: "r/specialeducation, r/IEP, r/autism — helpful posts about IEP rights with natural tool mentions" },
      { label: "Advocacy Newsletters", desc: "Guest posts and reviews from trusted special education bloggers and advocates" },
      { label: "School Referrals", desc: "Parent liaisons and family engagement coordinators recommend to overwhelmed families" },
      { label: "Professional Referral", desc: "Advocates or attorneys send clients for document prep before first meeting" },
    ],
  },
  {
    icon: "🏠",
    title: "Landing Page",
    color: "#1B7A9B",
    bg: "#E8F4F8",
    items: [
      { label: "IEPClarity.ai", desc: "Single-page site with sample tracker, parent testimonials, and transparent pricing" },
      { label: "Tier Selection", desc: "Single ($29): One document parsed. Annual ($69): Full year of documents + amendments." },
      { label: "Trust Signals", desc: "Privacy-first messaging, data deletion policy, parent testimonials, 'no advocate needed' positioning" },
    ],
  },
  {
    icon: "📤",
    title: "Upload & Payment",
    color: "#7C3AED",
    bg: "#F3E8FF",
    items: [
      { label: "Document Upload", desc: "Parent uploads IEP or 504 plan as PDF (supports scans via OCR)" },
      { label: "Context Form", desc: "Child's grade, school district, specific concerns, upcoming meeting dates" },
      { label: "Stripe Checkout", desc: "Payment processed — refund guarantee if parse quality is unsatisfactory" },
      { label: "Confirmation", desc: "'Your documents are being processed — expect your tracker within 2 hours'" },
    ],
  },
  {
    icon: "⚙️",
    title: "AI Processing",
    color: "#059669",
    bg: "#ECFDF5",
    items: [
      { label: "Webhook → Make.com", desc: "Upload triggers automated orchestration pipeline" },
      { label: "Claude API Parsing", desc: "Extracts goals, services, accommodations, dates, service hours, responsible parties from document" },
      { label: "Tracker Generation", desc: "Creates structured spreadsheet + clean PDF summary with action items" },
      { label: "Completeness Check", desc: "Validates all IEP sections captured; flags if manual review needed" },
    ],
  },
  {
    icon: "📬",
    title: "Delivery",
    color: "#DC2626",
    bg: "#FEF2F2",
    items: [
      { label: "Email Delivery", desc: "Tracker spreadsheet + PDF summary sent within 2 hours of upload" },
      { label: "Tracker Contents", desc: "Goal tracker with progress indicators, deadline calendar, accommodation checklist, service hours log, meeting prep guide" },
      { label: "'Powered by Waypoint'", desc: "Footer CTA introduces the broader family navigation platform" },
    ],
  },
  {
    icon: "📧",
    title: "Email Nurture",
    color: "#D4834E",
    bg: "#FFF3EB",
    items: [
      { label: "Day 1", desc: "Delivery confirmation + satisfaction survey + request for testimonial" },
      { label: "Day 3", desc: "'3 things to do before your next IEP meeting' — actionable value email" },
      { label: "Day 7", desc: "Waypoint preview: 'There's more we can help with' — introduces broader platform" },
      { label: "Day 14", desc: "Subscription upsell: $9/mo for ongoing tracking, deadline reminders, meeting prep" },
    ],
  },
  {
    icon: "🚀",
    title: "Expansion & Waypoint",
    color: "#7C3AED",
    bg: "#F3E8FF",
    items: [
      { label: "→ Waypoint Waitlist", desc: "20% target conversion — parent joins broader family navigation platform" },
      { label: "→ Subscription", desc: "$9/mo ongoing tracking with deadline reminders and document updates" },
      { label: "→ Word-of-Mouth", desc: "Parent shares in Facebook groups — the most powerful growth channel" },
      { label: "→ B2B Pipeline", desc: "Advocates request bulk intake tool; attorneys need organized documentation" },
    ],
  },
];

export default function IEPJourney() {
  const [active, setActive] = useState(null);

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", background: "#FAFCFA", minHeight: "100vh", padding: "32px 24px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, color: "#2E6B4F", textTransform: "uppercase", marginBottom: 8 }}>Customer Journey</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111827", margin: 0, lineHeight: 1.2 }}>
            IEPClarity.ai
          </h1>
          <p style={{ color: "#6B7280", fontSize: 14, marginTop: 8 }}>From overwhelmed parent to empowered advocate — and into the Waypoint ecosystem</p>
        </div>

        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", left: 28, top: 20, bottom: 20, width: 3, background: "linear-gradient(to bottom, #2E6B4F, #1B7A9B, #7C3AED, #059669, #DC2626, #D4834E, #7C3AED)", borderRadius: 2, zIndex: 0 }} />

          {stages.map((stage, si) => (
            <div key={si} style={{ position: "relative", marginBottom: si < stages.length - 1 ? 16 : 0, paddingLeft: 68, zIndex: 1 }}>
              <div style={{
                position: "absolute", left: 12, top: 12, width: 34, height: 34, borderRadius: "50%",
                background: stage.color, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, zIndex: 2, boxShadow: `0 0 0 4px #FAFCFA, 0 0 0 6px ${stage.color}30`
              }}>
                {stage.icon}
              </div>

              <div
                onClick={() => setActive(active === si ? null : si)}
                style={{
                  background: "#FFFFFF",
                  border: `1px solid ${active === si ? stage.color : "#E5E7EB"}`,
                  borderRadius: 12,
                  padding: "16px 20px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: active === si ? `0 4px 16px ${stage.color}20` : "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: stage.color, textTransform: "uppercase", marginBottom: 2 }}>
                      Stage {si + 1}
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: "#111827" }}>{stage.title}</div>
                  </div>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", background: stage.bg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, color: stage.color, fontWeight: 700, transition: "transform 0.2s",
                    transform: active === si ? "rotate(180deg)" : "rotate(0deg)"
                  }}>▼</div>
                </div>

                {active === si && (
                  <div style={{ marginTop: 16 }}>
                    {stage.items.map((item, ii) => (
                      <div key={ii} style={{
                        display: "flex", gap: 12, padding: "10px 12px", marginBottom: ii < stage.items.length - 1 ? 6 : 0,
                        background: stage.bg, borderRadius: 8, borderLeft: `3px solid ${stage.color}`
                      }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 2 }}>{item.label}</div>
                          <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.5 }}>{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {si < stages.length - 1 && (
                <div style={{ textAlign: "center", padding: "4px 0", color: "#D1D5DB", fontSize: 12 }}>↓</div>
              )}
            </div>
          ))}
        </div>

        {/* Key Metrics Footer */}
        <div style={{ marginTop: 32, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            { metric: "<2 hrs", label: "Delivery Time" },
            { metric: ">90%", label: "Parse Accuracy" },
            { metric: "20%", label: "→ Waypoint Conv." },
            { metric: ">40%", label: "From FB Groups" },
          ].map((m, i) => (
            <div key={i} style={{ textAlign: "center", background: "#FFFFFF", borderRadius: 10, padding: "14px 8px", border: "1px solid #E5E7EB" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#2E6B4F" }}>{m.metric}</div>
              <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
