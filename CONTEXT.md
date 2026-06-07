# CareerPilot — Context

**Current Task**: Hackathon-ready polish: LLM roadmaps, cover letter generator, dashboard live jobs, application funnel chart, README rewrite.

## Key Decisions
- Roadmap LLM calls Groq/NVIDIA (fallback to 8 static steps); cover letter uses same `_call_llm`
- All user-facing endpoints use user-scoped Supabase client — zero admin client leaks
- Email reminders deferred (overkill for hackathon demo)

## Next Steps
- (Optional) Clerk JWT template in Supabase dashboard for production RLS
- (Optional) Email reminders if desired post-hackathon
