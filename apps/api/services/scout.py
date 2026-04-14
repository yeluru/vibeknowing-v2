import httpx
import logging
import json
import asyncio
from typing import List, Dict, Any, Optional
from config import settings
from database import SessionLocal

from models import CurriculumNode
from .ai import AIService

logger = logging.getLogger(__name__)

# High-signal learning domains for Scout layer
LEARNING_DOMAINS = [
    "youtube.com", "arxiv.org", "github.com",
    "docs.python.org", "pytorch.org", "tensorflow.org",
    "developer.mozilla.org", "aws.amazon.com", "cloud.google.com",
    "azure.microsoft.com", "kubernetes.io",
    "reactjs.org", "nextjs.org", "vuejs.org",
    "medium.com", "substack.com", "towardsdatascience.com",
    "kaggle.com", "huggingface.co", "openai.com",
    "coursera.org", "educative.io", "roadmap.sh",
    "cs231n.stanford.edu", "fast.ai", "deeplearning.ai",
    "web.dev", "realpython.com", "developer.chrome.com",
]


def classify_url(url: str) -> str:
    u = url.lower()
    if "youtube.com" in u or "youtu.be" in u:
        return "video"
    if u.endswith(".pdf") or "/pdf/" in u or "arxiv.org/pdf" in u or "filetype=pdf" in u:
        return "pdf"
    if any(d in u for d in ["github.com", "colab.research.google.com", "kaggle.com", "replit.com", "codepen.io"]):
        return "project"
    if any(d in u for d in ["docs.", "/docs/", "/documentation", "developer.", "/api/", "/reference/", "/spec/"]):
        return "documentation"
    return "article"


async def _tavily_search(
    query: str,
    api_key: str,
    max_results: int = 10,
    search_depth: str = "advanced",
    include_domains: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    """Single Tavily search call, returns raw classified results."""
    payload: Dict[str, Any] = {
        "api_key": api_key,
        "query": query,
        "search_depth": search_depth,
        "max_results": max_results,
        "include_answer": False,
    }
    if include_domains:
        payload["include_domains"] = include_domains

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.tavily.com/search",
                json=payload,
                timeout=15.0,
            )
            if resp.status_code != 200:
                logger.error(f"Tavily {resp.status_code} for: {query[:80]}")
                return []
            return [
                {
                    "title": r.get("title", query),
                    "url": r["url"],
                    "snippet": r.get("content", "")[:400],
                    "type": classify_url(r["url"]),
                }
                for r in resp.json().get("results", []) if r.get("url")
            ]
    except Exception as e:
        logger.error(f"Tavily search error for '{query[:80]}': {e}")
        return []


def _extract_scout_queries_from_lesson(lesson: Any, fallback_queries: List[str]) -> List[Dict[str, str]]:
    """
    Extract high-precision queries directly from the synthesized lesson content.
    Returns list of {"query": str, "intent": str} dicts.

    This is analogous to what Vanguard does with transcript text — the lesson IS
    the source document. The AI already wrote highly specific youtube_search
    strings for each concept during lesson synthesis. Use them directly.
    """
    queries = []

    if not lesson or not isinstance(lesson, dict):
        # No lesson yet — fall back to the pre-written search_requirements
        return [{"query": q, "intent": "direct"} for q in fallback_queries]

    # ── Layer A: AI-generated YouTube queries per deep-dive section ──────────
    # These are already ultra-specific (e.g. "pytorch scaled dot-product attention
    # implementation from scratch tutorial 2024") — fire them as-is.
    for section in lesson.get("deep_dive_sections", []):
        yt_query = section.get("youtube_search", "").strip()
        if yt_query:
            queries.append({"query": yt_query, "intent": "video"})

    # ── Layer B: Core concepts → documentation / official spec queries ───────
    for concept in lesson.get("core_concepts", []):
        queries.append({
            "query": f"{concept} official documentation tutorial",
            "intent": "documentation",
        })

    # ── Layer C: Deployment lab → hands-on project query ────────────────────
    lab = lesson.get("deployment_lab", {})
    lab_mission = lab.get("mission", "").strip()
    if lab_mission:
        queries.append({
            "query": f"{lab_mission} github example implementation",
            "intent": "project",
        })
        # Also look for the first concrete milestone command/tool
        milestones = lab.get("milestones", [])
        if milestones:
            first_task = milestones[0].get("task", "").strip()
            if first_task and len(first_task) < 200:
                queries.append({
                    "query": f"{first_task} tutorial step by step",
                    "intent": "tutorial",
                })

    # ── Layer D: Deep-dive section titles → article / paper queries ──────────
    for section in lesson.get("deep_dive_sections", []):
        title = section.get("title", "").strip()
        if title:
            queries.append({
                "query": f"{title} paper arxiv OR research blog engineering",
                "intent": "article",
            })

    # ── Fallback: always include the pre-written search_requirements ─────────
    # These are broad safety nets, especially for nodes without lesson content
    for q in fallback_queries:
        queries.append({"query": q, "intent": "direct"})

    return queries


async def _generate_vanguard_queries(
    node_title: str,
    node_description: str,
    phase: str,
    lesson: Any,
) -> List[str]:
    """
    Vanguard layer: uses the full lesson content as a source document
    (exactly like Vanguard uses a transcript) to identify what a learner
    needs to TRULY master this node beyond what the lesson itself covers.
    """
    # Build a rich content summary from the lesson — the richer the source,
    # the better the gap analysis, just like Vanguard with transcripts.
    lesson_summary = ""
    if lesson and isinstance(lesson, dict):
        brief = lesson.get("mission_brief", "")
        concepts = ", ".join(lesson.get("core_concepts", []))
        section_titles = " | ".join(
            s.get("title", "") for s in lesson.get("deep_dive_sections", [])
        )
        expert_context = lesson.get("deployment_lab", {}).get("expert_context", "")
        lesson_summary = f"""
Lesson brief: {brief}
Core concepts covered: {concepts}
Sections: {section_titles}
Expert context: {expert_context}
""".strip()
    else:
        lesson_summary = f"Unit: {node_title}. {node_description}"

    prompt = f"""You are the Vanguard research planner. A learner has just read this lesson:

--- LESSON CONTENT ---
Node: {node_title} (Phase: {phase})
{lesson_summary}
--- END ---

Your job: identify what this lesson does NOT cover but the learner MUST encounter to truly master the subject.

Generate 6 search queries targeting:
1. The original landmark paper or RFC that introduced the core idea (arxiv, IETF, ACM)
2. A YouTube talk by a domain expert — NOT a tutorial, but a real engineering talk (conference, lecture, internal tech talk)
3. A battle-tested GitHub repo showing this in a production-scale project
4. A blog post by a senior engineer on the gotchas, failure modes, or non-obvious trade-offs
5. An adjacent technique that experts combine with this skill (the "unlock" that makes it 10x more powerful)
6. A benchmark, comparison, or case study showing this technique vs alternatives in real conditions

Each query must be specific enough to find exactly one result. Include author names, paper titles, conference names, or repo names where known.

Return ONLY a JSON array of 6 query strings. No explanation, no markdown:
["query 1", "query 2", "query 3", "query 4", "query 5", "query 6"]"""

    try:
        response = AIService.generate_json(
            prompt,
            provider=settings.DEFAULT_PROVIDER,
            system_prompt="You are the Vanguard research planner. Return only a valid JSON array of search query strings.",
            temperature=0.3,
        )
        data = json.loads(response)
        if isinstance(data, list):
            return [q for q in data if isinstance(q, str)]
    except Exception as e:
        logger.error(f"Vanguard query generation failed: {e}")
    return []


def _deduplicate(results: List[Dict]) -> List[Dict]:
    seen: set = set()
    out = []
    for r in results:
        if r["url"] not in seen:
            seen.add(r["url"])
            out.append(r)
    return out


class ScoutService:
    @staticmethod
    async def scout_for_node(node_id: str, db_session=None) -> Optional[List[Dict[str, Any]]]:
        """
        Two-layer agentic research for a CurriculumNode.

        Scout layer  — derives queries directly from the synthesised lesson content:
                       uses the AI-written youtube_search strings, core concept terms,
                       lab mission, and section titles as search queries. This gives
                       Scout the same quality of source intelligence that Vanguard
                       gets from transcripts — no more generic guesses.

        Vanguard layer — reads the full lesson as a source document and identifies
                         what it does NOT cover: landmark papers, expert talks,
                         production repos, battle-tested engineering posts.

        Both layers run in parallel. Single synthesis pass picks best 8 diverse
        resources from the merged pool.
        """
        db = db_session or SessionLocal()
        try:
            node = db.query(CurriculumNode).filter(CurriculumNode.id == node_id).first()
            if not node:
                logger.warning(f"Scout: Node {node_id} not found.")
                return None

            api_key = settings.TAVILY_API_KEY
            if not api_key:
                logger.error("Scout: TAVILY_API_KEY missing — cannot run research.")
                raise ValueError("TAVILY_API_KEY is not configured on this server. Scout requires web search to find resources.")

            lesson = node.lesson_content

            # ── Auto-generate lesson if missing — Scout quality depends on it ──
            # Without lesson content we only have a title and generic queries.
            # This is the same problem as Vanguard trying to work without a transcript.
            if not lesson:
                logger.info(f"Scout: No lesson for '{node.title}' — generating first...")
                try:
                    lesson_json = AIService.generate_node_lesson(
                        node_title=node.title,
                        node_description=node.description,
                        phase=node.phase,
                        provider=settings.DEFAULT_PROVIDER,
                    )
                    lesson = json.loads(lesson_json)
                    node.lesson_content = lesson
                    db.flush()
                    logger.info(f"Scout: Lesson generated for '{node.title}'")
                except Exception as le:
                    logger.warning(f"Scout: Lesson generation failed, proceeding without: {le}")
                    lesson = None

            logger.info(
                f"Scout+Vanguard: Starting research for '{node.title}' [{node.phase}] "
                f"(lesson={'yes' if lesson else 'no'})"
            )

            # ── Build Scout queries from lesson content ────────────────────────
            fallback = list(node.search_requirements or [])
            scout_query_dicts = _extract_scout_queries_from_lesson(lesson, fallback)

            # Deduplicate queries (same string can appear from multiple sources)
            seen_queries: set = set()
            unique_scout_queries = []
            for qd in scout_query_dicts:
                if qd["query"] not in seen_queries:
                    seen_queries.add(qd["query"])
                    unique_scout_queries.append(qd)

            logger.info(
                f"Scout: {len(unique_scout_queries)} unique queries "
                f"({'from lesson' if lesson else 'from search_requirements'})"
            )

            # ── Build Vanguard gap queries from lesson as source ───────────────
            vanguard_queries = await _generate_vanguard_queries(
                node.title, node.description, node.phase, lesson
            )
            logger.info(f"Vanguard: {len(vanguard_queries)} frontier queries for '{node.title}'")

            # ── Fire everything in parallel ────────────────────────────────────
            # No domain filter on any query — domain filters blocked non-tech
            # topics entirely (e.g. "Business Analysis" has nothing on pytorch.org).
            # Open web gives us papers, professional bodies, niche blogs, YouTube.
            # basic depth keeps costs reasonable; Vanguard uses advanced for depth.
            scout_tasks = [
                _tavily_search(qd["query"], api_key, max_results=10, search_depth="basic")
                for qd in unique_scout_queries
            ]
            vanguard_tasks = [
                _tavily_search(q, api_key, max_results=8, search_depth="advanced")
                for q in vanguard_queries
            ]

            all_results_nested = await asyncio.gather(*scout_tasks, *vanguard_tasks)

            # Flatten and tag by layer
            n_scout = len(scout_tasks)
            scout_raw: List[Dict] = []
            vanguard_raw: List[Dict] = []
            for i, batch in enumerate(all_results_nested):
                tag = "scout" if i < n_scout else "vanguard"
                for r in batch:
                    (scout_raw if tag == "scout" else vanguard_raw).append({**r, "_layer": tag})

            all_candidates = _deduplicate(scout_raw + vanguard_raw)
            logger.info(
                f"Scout+Vanguard: {len(scout_raw)} scout + {len(vanguard_raw)} vanguard "
                f"= {len(all_candidates)} unique candidates for '{node.title}'"
            )

            if not all_candidates:
                logger.warning(f"No candidates found for node {node_id}")
                return []

            # ── Synthesis ──────────────────────────────────────────────────────
            research_blob = "\n\n".join([
                f"[{i+1}] [{r.get('_layer','?').upper()}] Type: {r['type']}\nTitle: {r['title']}\nURL: {r['url']}\nSnippet: {r['snippet']}"
                for i, r in enumerate(all_candidates[:35])
            ])

            # Include lesson core_concepts in the synthesis prompt so the AI can
            # check alignment — same intelligence Vanguard uses for synthesis
            concepts_hint = ""
            if lesson and isinstance(lesson, dict):
                concepts = lesson.get("core_concepts", [])
                if concepts:
                    concepts_hint = f"\nCore concepts this node covers: {', '.join(concepts[:8])}"

            prompt = f"""You are a senior learning curator. Select the BEST 8 resources for: "{node.title}" (phase: {node.phase}).{concepts_hint}

Each candidate is tagged [SCOUT] (direct teaching resource, derived from lesson content) or [VANGUARD] (frontier/depth resource — papers, expert talks, production repos).
Pick a blend of both — Scout resources teach the skill, Vanguard resources build mastery.

Mandatory diversity (satisfy all that have candidates):
- At least 1 VIDEO (YouTube tutorial, lecture, or conference talk)
- At least 1 PDF or PAPER (arxiv, textbook, RFC, spec)
- At least 1 PROJECT (GitHub repo, notebook, working code)
- At least 1 DOCUMENTATION page (official docs, API reference)
- At least 2 VANGUARD resources (landmark paper, expert gotcha post, production case study, or adjacent tool)
- URLs must be copied EXACTLY from candidates — do not invent or modify any URL
- Description: 15-25 words on the specific thing the learner gains from this resource

Return ONLY a JSON array of up to 8 objects. No explanation, no markdown:
[
  {{
    "title": "Concise title (under 12 words)",
    "url": "Exact URL from candidates",
    "description": "15-25 words: specific learning outcome",
    "type": "video" | "pdf" | "documentation" | "project" | "article",
    "layer": "scout" | "vanguard"
  }}
]

Candidates:
{research_blob}"""

            response_json = AIService.generate_json(
                prompt,
                provider=settings.DEFAULT_PROVIDER,
                system_prompt="You are a world-class technical learning curator. Pick resources that build real mastery. Return only valid JSON.",
                temperature=0.1,
            )

            try:
                data = json.loads(response_json)
                selected: List[Dict] = []
                if isinstance(data, list):
                    selected = data
                elif isinstance(data, dict):
                    selected = data.get("resources", [])
                    if not selected and any(k in data for k in ["title", "url"]):
                        selected = [data]

                if selected:
                    node.suggested_resources = selected
                    db.commit()
                    scout_count = sum(1 for r in selected if r.get("layer") == "scout")
                    vanguard_count = sum(1 for r in selected if r.get("layer") == "vanguard")
                    logger.info(
                        f"Scout+Vanguard: '{node.title}' → {len(selected)} resources "
                        f"({scout_count} scout, {vanguard_count} vanguard)"
                    )
                    return selected
                else:
                    logger.warning(f"Synthesis returned no resources for node {node_id}")

            except Exception as e:
                logger.error(f"Synthesis parse error: {e} | raw: {response_json[:500]}")

            return []

        except Exception as e:
            logger.error(f"Scout+Vanguard global error: {e}")
            db.rollback()
            return None
        finally:
            if not db_session:
                db.close()
