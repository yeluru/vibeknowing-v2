from typing import List, Dict, Any, Optional
import json
import asyncio
from config import settings
from database import SessionLocal
from models import Source, Artifact, Project
from .ai import AIService
import logging
from langchain_community.tools.tavily_search import TavilySearchResults

logger = logging.getLogger(__name__)

class VanguardService:
    """
    The Vibe-Vanguard Agent:
    Autonomous Research & Discovery to fill knowledge gaps.
    """

    @staticmethod
    async def identify_knowledge_gaps(source_id: str, db_session = None) -> List[str]:
        """Analyze source content to find missing technical 'Mastery' concepts."""
        db = db_session or SessionLocal()
        try:
            source = db.query(Source).filter(Source.id == source_id).first()
            if not source or not source.content_text:
                return []

            # Step 1: Brainstorm 'Frontier' concepts using LLM
            prompt = f"""Analyze this learning source and identify knowledge gaps.

Source title: "{source.title}"
Source content (excerpt):
{source.content_text[:5000]}

Task: Identify 3-5 specific technical concepts that are mentioned or implied in this source but NOT fully explained — concepts the learner would need to master the topic completely.

For each gap, write a precise search query a learner would use to find the best tutorial or documentation on that concept.

Good query examples:
- "pytorch attention mechanism implementation step by step"
- "redis cache eviction policies LRU LFU comparison"
- "kubernetes pod scheduling affinity rules tutorial"

Bad query examples:
- "learn more about AI"
- "deep dive into the topic"

Return ONLY a JSON array of query strings. No explanation, no markdown:
["query 1", "query 2", "query 3"]"""

            response = AIService.generate_text(
                prompt,
                provider=settings.DEFAULT_PROVIDER,
                system_prompt="You are a learning gap analyst. Return only a valid JSON array of search query strings. No markdown, no explanation.",
                temperature=0.2
            )
            
            try:
                # Basic JSON cleaning
                if "```json" in response:
                    response = response.split("```json")[1].split("```")[0].strip()
                elif "```" in response:
                    response = response.split("```")[1].split("```")[0].strip()
                
                queries = json.loads(response)
                return queries if isinstance(queries, list) else []
            except Exception as e:
                logger.error(f"Failed to parse Vanguard brainstorm: {e}")
                return []
        finally:
            if not db_session:
                db.close()

    @staticmethod
    async def perform_agentic_research(queries: List[str], project_id: str) -> List[Dict[str, Any]]:
        """Use Tavily to find a Dual-Mastery syllabus (YouTube + Web)."""
        # Caller is responsible for checking TAVILY_API_KEY before calling this

        # Get existing URLs in this project to avoid duplicates
        db = SessionLocal()
        existing_urls = {s.url for s in db.query(Source).filter(Source.project_id == project_id).all() if s.url}
        db.close()

        results = []
        # Initialize search tool
        search = TavilySearchResults(k=4)
        
        # We process queries in parallel for efficiency
        async def search_query(query: str, site_filter: Optional[str] = None):
            try:
                if site_filter == "youtube":
                    enhanced_query = f"{query} technical masterclass site:youtube.com"
                else:
                    enhanced_query = f"{query} educational technical guide deep dive"
                
                # Direct HTTP call to Tavily to avoid LangChain tool versioning issues
                import httpx
                api_key = settings.TAVILY_API_KEY
                
                logger.info(f"Vanguard: Direct Tavily search for: {enhanced_query[:50]}...")
                
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        "https://api.tavily.com/search",
                        json={
                            "api_key": api_key,
                            "query": enhanced_query,
                            "search_depth": "basic",
                            "max_results": 5,
                            "include_answer": False,
                            "include_raw_content": False,
                            "include_images": False
                        },
                        timeout=15.0
                    )
                    
                    if response.status_code == 200:
                        search_results_data = response.json()
                        search_results = search_results_data.get("results", [])
                        logger.info(f"Vanguard HTTP: Got {len(search_results)} results")
                        
                        for res in search_results:
                            url = res.get("url", "")
                            if not url: continue
                            
                            is_yt = "youtube.com" in url or "youtu.be" in url
                            results.append({
                                "title": res.get("title", query),
                                "url": url,
                                "snippet": res.get("content", ""),
                                "query_context": query,
                                "is_youtube_link": is_yt
                            })
                    else:
                        logger.error(f"Vanguard Tavily Error: {response.status_code} - {response.text}")
            except Exception as e:
                logger.error(f"Vanguard Search Error for '{query}': {e}")

        # Hunt for both YouTube (Strict) and Web (Broad) candidates
        tasks = []
        for q in queries[:2]:
            tasks.append(search_query(q, site_filter="youtube"))
            tasks.append(search_query(q, site_filter="web"))
            
        await asyncio.gather(*tasks)
        
        # DEBUG: Log results before any filtering
        logger.info(f"Vanguard RAW results found: {len(results)}")
        for r in results[:3]:
            logger.info(f"Sample Result: {r['url']}")

        return results

    @staticmethod
    async def synthesize_recommendations(source_id: str, research_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Synthesize a Dual-Mastery syllabus: 3 YouTube Masterclasses + 2 Web Deep-Dives."""
        if not research_results:
            return []

        db = SessionLocal()
        try:
            source = db.query(Source).filter(Source.id == source_id).first()
            
            # Format and prioritize candidates
            research_blob = "\n\n".join([
                f"Topic: {r['query_context']}\nFormat: {'Video' if r.get('is_youtube_link') else 'Web'}\nTitle: {r['title']}\nURL: {r['url']}\nSnippet: {r['snippet'][:300]}"
                for r in research_results[:12]
            ])

            prompt = f"""You are curating a Dual-Mastery resource syllabus for a learner studying: "{source.title}".

Select exactly 5 resources from the candidates below:
- 3 must be YouTube videos (type: "video")
- 2 must be web resources — articles, documentation, or tutorials (type: "web")

If fewer than 3 YouTube videos are available in the candidates, still return 3 video slots — use the best available YouTube links. Prioritize quality over the count constraint only as a last resort.

Selection criteria (in order of priority):
1. Directly addresses a knowledge gap in "{source.title}"
2. High-signal source: official docs, recognized technical channels, university courses, or top-tier engineering blogs
3. Appropriate depth: not a beginner overview if this is an advanced topic
4. The URL must come exactly from the candidate list — do not invent URLs

For each selected resource, write a one-sentence "Vanguard Commentary" explaining specifically why this resource is the right next step for this learner — not generic praise.

Return ONLY a JSON array of exactly 5 objects. No explanation, no markdown:
[
  {{
    "title": "Concise descriptive title",
    "url": "URL from candidate list",
    "reasoning": "One sentence: why this specific resource accelerates mastery of this topic",
    "type": "video" or "web"
  }}
]

Candidate Resources:
{research_blob}"""

            response = AIService.generate_text(
                prompt,
                provider=settings.DEFAULT_PROVIDER,
                system_prompt="You are the Vibe-Vanguard. Return only a valid JSON array of exactly 5 objects. No markdown, no preamble.",
                temperature=0.2
            )

            try:
                if "```json" in response:
                    response = response.split("```json")[1].split("```")[0].strip()
                
                recommendations = json.loads(response)
                return recommendations if isinstance(recommendations, list) else []
            except Exception as e:
                logger.error(f"Failed to synthesize Vanguard recommendations: {e}")
                return []
        finally:
            db.close()

    @staticmethod
    def _save_artifact(source_id: str, project_id: Optional[str], content: dict):
        """Upsert a recommendation artifact for source_id."""
        db = SessionLocal()
        try:
            existing = db.query(Artifact).filter(
                Artifact.source_id == source_id,
                Artifact.type == "recommendation"
            ).order_by(Artifact.created_at.desc()).first()
            if existing:
                existing.content = content
            else:
                db.add(Artifact(
                    project_id=project_id,
                    source_id=source_id,
                    type="recommendation",
                    title="Vanguard Mastery Briefing",
                    content=content,
                ))
            db.commit()
        except Exception as e:
            logger.error(f"Vanguard: Failed to save artifact for {source_id}: {e}")
            db.rollback()
        finally:
            db.close()

    @staticmethod
    async def research_and_recommend(source_id: str):
        """Full Agentic Loop for a single source."""
        logger.info(f"Vibe-Vanguard: Starting research loop for {source_id}")

        # Resolve project_id early so we can always save an artifact (even on error)
        db = SessionLocal()
        source = db.query(Source).filter(Source.id == source_id).first()
        project_id = source.project_id if source else None
        db.close()

        def _save_error(message: str):
            logger.warning(f"Vanguard error for {source_id}: {message}")
            VanguardService._save_artifact(source_id, project_id, {
                "status": "error",
                "error": message,
                "recommendations": [],
                "agent_commentary": "",
            })

        try:
            # ── Guard: Tavily key required ────────────────────────────────────
            if not settings.TAVILY_API_KEY:
                _save_error("TAVILY_API_KEY is not configured on this server. Ask your admin to add it.")
                return

            if not project_id:
                _save_error("Source has no associated project. Please add it to a learning path first.")
                return

            # 1. Identify Gaps
            queries = await VanguardService.identify_knowledge_gaps(source_id)
            if not queries:
                _save_error("Could not extract knowledge-gap queries from this source. The content may be too short or unstructured.")
                return

            # 2. Agentic Research
            logger.info(f"Vanguard: Starting research for {len(queries)} queries on {source_id}")
            research_data = await VanguardService.perform_agentic_research(queries, project_id)
            logger.info(f"Vanguard: Found {len(research_data)} candidates for {source_id}")

            if not research_data:
                _save_error("Tavily search returned no results. The API key may be invalid or the search quota exhausted.")
                return

            # 3. Synthesize
            recommendations = await VanguardService.synthesize_recommendations(source_id, research_data)

            if not recommendations:
                _save_error("The AI could not synthesise recommendations from the search results. Try again or regenerate.")
                return

            # 4. Save success artifact
            VanguardService._save_artifact(source_id, project_id, {
                "recommendations": recommendations,
                "status": "ready",
                "agent_commentary": "I've analyzed your source and identified these technical frontiers that will accelerate your mastery.",
            })
            logger.info(f"Vibe-Vanguard: Research complete and SAVED for {source_id}.")

        except Exception as e:
            logger.error(f"Vanguard: Global research loop error for {source_id}: {e}")
            _save_error(f"Unexpected error during research: {str(e)}")
