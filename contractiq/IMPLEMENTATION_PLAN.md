# ContractIQ — Implementation Plan

## Status of Existing Code
- API routes: complete (all 8 routes)
- lib/: complete (supabase, openai, pdf, utils)
- hooks/: complete (useContractStore, usePageNavigation)
- UI primitives: button, badge, input, card, textarea
- Pages: scaffolded stubs — need full implementation
- Feature components: NOT YET CREATED

## What Needs Building

### Phase 1 — UI Primitives (no dependencies)
- components/ui/label.tsx
- components/ui/skeleton.tsx

### Phase 2 — Results Components (depend on UI primitives + hooks)
- components/results/TermCard.tsx         [extract + improve from [id]/page.tsx inline]
- components/results/KeyTermsPanel.tsx    [new — wraps TermCard list]
- components/results/PDFViewer.tsx        [new — react-pdf with page navigation]
- components/results/TextViewerFallback.tsx [new — [PAGE N] parser with page navigation]

### Phase 3 — Chat Components (depend on UI primitives + hooks)
- components/chat/ChatMessage.tsx         [extract + improve from [id]/page.tsx inline]
- components/chat/ChatInterface.tsx       [extract + improve with auto-scroll, history load]

### Phase 4 — Feature Components (depend on UI primitives + API)
- components/shared/FeedbackWidget.tsx    [new — thumbs up/down + comment]
- components/dashboard/ContractTable.tsx  [new — sortable table with StatusPill]

### Phase 5 — Page Rewrites (depend on all components above)
- app/(app)/contracts/[id]/page.tsx       [full rewrite — uses all Phase 2/3/4 components]
- app/(app)/dashboard/page.tsx            [rewrite as client component with sorting]
- app/(app)/contracts/new/page.tsx        [minor cleanup — already functional]

## Dependency Order
label, skeleton → TermCard, KeyTermsPanel, PDFViewer, TextViewerFallback,
                  ChatMessage, ChatInterface, FeedbackWidget, ContractTable
→ contracts/[id]/page.tsx, dashboard/page.tsx
