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
            prompt = f"""
            Analyze the following text from a source titled '{source.title}'.
            Identify 3-5 'Knowledge Frontiers'—highly relevant technical concepts or deep-dives 
            that are NOT fully explained in this source but are crucial for a user to achieve 'Mastery' of this topic.
            
            Format the output as a clean JSON list of strings (queries).
            Example query style: 'Detailed technical implementation of [concept] for [context]'
            
            Source Text Snippet (first 5000 chars):
            {source.content_text[:5000]}
            """
            
            # Use AIService to generate the brainstorm
            # We use OpenAI for internal agentic reasoning as it's the most stable for JSON
            response = AIService.generate_text(
                prompt, 
                provider="openai", 
                system_prompt="You are the Vibe-Vanguard, a master researcher and pedagogist.",
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
        """Use LangChain + Tavily to find a Dual-Mastery syllabus (YouTube + Web)."""
        if not settings.TAVILY_API_KEY:
            logger.warning("Vanguard: TAVILY_API_KEY not configured. Skipping research.")
            return []

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
                
                search_results = await asyncio.to_thread(search.run, enhanced_query)
                
                if isinstance(search_results, list):
                    for res in search_results:
                        url = res.get("url", "")
                        is_yt = "youtube.com" in url or "youtu.be" in url
                        if url and url not in existing_urls:
                            results.append({
                                "title": res.get("title", query),
                                "url": url,
                                "snippet": res.get("content", ""),
                                "query_context": query,
                                "is_youtube_link": is_yt
                            })
            except Exception as e:
                logger.error(f"Vanguard Search Error for '{query}': {e}")

        # Hunt for both YouTube (Strict) and Web (Broad) candidates
        tasks = []
        for q in queries[:2]:
            tasks.append(search_query(q, site_filter="youtube"))
            tasks.append(search_query(q, site_filter="web"))
            
        await asyncio.gather(*tasks)
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

            prompt = f"""
            I have found several external sources to expand on the source '{source.title}'.
            You MUST synthesize a 'Dual-Mastery' syllabus containing exactly 5 items:
            1. TOP 3 YouTube Masterclasses (Non-negotiable).
            2. TOP 2 Technical Web Deep-Dives (Articles/Documentation).
            
            For each, provide:
            1. title: A concise, catchy title.
            2. url: The link provided.
            3. reasoning: A one-sentence 'Vanguard Commentary' explaining WHY this is specific next step.
            4. type: 'video' if YouTube, otherwise 'web'.
            
            Final output MUST be a JSON list of exactly 5 objects.
            
            Found Research:
            {research_blob}
            """

            response = AIService.generate_text(
                prompt,
                provider="openai",
                system_prompt="You are the Vibe-Vanguard. You provide a surgical 3-Video / 2-Web mastery syllabus.",
                temperature=0.3
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
    async def research_and_recommend(source_id: str):
        """Full Agentic Loop for a single source."""
        logger.info(f"Vibe-Vanguard: Starting research loop for {source_id}")
        
        # 1. Identify Gaps
        queries = await VanguardService.identify_knowledge_gaps(source_id)
        if not queries:
            return
        
        # 2. Agentic Research
        db = SessionLocal()
        source = db.query(Source).filter(Source.id == source_id).first()
        project_id = source.project_id if source else None
        db.close()
        
        if not project_id:
            return

        research_data = await VanguardService.perform_agentic_research(queries, project_id)
        
        # 3. Synthesize
        recommendations = await VanguardService.synthesize_recommendations(source_id, research_data)
        
        if not recommendations:
            return

        # 4. Save as Artifact
        db = SessionLocal()
        try:
            artifact = Artifact(
                project_id=project_id,
                source_id=source_id,
                type="recommendation",
                title="Vanguard Mastery Briefing",
                content={
                    "recommendations": recommendations,
                    "status": "ready",
                    "agent_commentary": "I've analyzed your source and identified these three technical frontiers that will accelerate your mastery of this topic."
                }
            )
            db.add(artifact)
            db.commit()
            logger.info(f"Vibe-Vanguard: Research complete for {source_id}. Saved {len(recommendations)} recommendations.")
        except Exception as e:
            logger.error(f"Vanguard: Failed to save artifact: {e}")
            db.rollback()
        finally:
            db.close()
