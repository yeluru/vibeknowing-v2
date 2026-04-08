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

class ScoutService:
    @staticmethod
    async def scout_for_node(node_id: str, db_session=None) -> Optional[List[Dict[str, Any]]]:
        """
        Agentic Scout: Search the web for specific resources to satisfy a CurriculumNode.
        """
        db = db_session or SessionLocal()
        try:
            node = db.query(CurriculumNode).filter(CurriculumNode.id == node_id).first()
            if not node:
                logger.warning(f"Scout: Node {node_id} not found.")
                return None

            if not node.search_requirements:
                logger.info(f"Scout: No search requirements for node '{node.title}'.")
                return []

            logger.info(f"Scout: Hunting for node '{node.title}' in {node.phase} phase...")
            
            queries = node.search_requirements
            search_results = []
            
            api_key = settings.TAVILY_API_KEY
            if not api_key:
                logger.error("Scout: TAVILY_API_KEY missing.")
                return []

            async def perform_search(q: str):
                try:
                    # Enhanced query for multi-modal technical learning (Docs, Videos, Courses)
                    enhanced_query = f"{q} technical masterclass guide documentation youtube video official course curriculum"
                    
                    async with httpx.AsyncClient() as client:
                        resp = await client.post(
                            "https://api.tavily.com/search",
                            json={
                                "api_key": api_key,
                                "query": enhanced_query,
                                "search_depth": "basic",
                                "max_results": 8,
                                "include_answer": False
                            },
                            timeout=12.0
                        )
                        if resp.status_code == 200:
                            data = resp.json()
                            results = data.get("results", [])
                            for res in results:
                                url = res.get("url")
                                if not url: continue
                                
                                is_yt = "youtube.com" in url or "youtu.be" in url
                                search_results.append({
                                    "title": res.get("title", q),
                                    "url": url,
                                    "snippet": res.get("content", ""),
                                    "type": "video" if is_yt else "documentation"
                                })
                        else:
                            logger.error(f"Scout Tavily Error: {resp.status_code}")
                except Exception as e:
                    logger.error(f"Scout Search Task Error for '{q}': {e}")

            # Run searches in parallel for efficiency
            # We limit to first 3 requirements to prevent massive concurrency
            await asyncio.gather(*[perform_search(q) for q in queries[:3]])
            
            if not search_results:
                logger.warning(f"Scout: No results found for node {node_id}")
                return []

            # Step 2: Synthesis - Rank and filter candidates using AIService
            research_blob = "\n\n".join([
                f"Candidate: {r['title']}\nURL: {r['url']}\nType: {r['type']}\nSnippet: {r['snippet'][:250]}" 
                for r in search_results[:12]
            ])
            
            logger.info(f"Scout: Beginning synthesis with {len(search_results)} search candidates...")
            
            prompt = f"""Select the TOP 3 resources for a learner mastering the unit: "{node.title}" (phase: {node.phase}).

Learning requirements for this unit:
{chr(10).join(f"- {q}" for q in node.search_requirements)}

Selection criteria (in order of priority):
1. Directly teaches the specific skill or concept named in the unit title
2. High-signal sources: official documentation, recognized technical YouTube channels, university course materials, top-tier engineering blogs
3. Appropriate depth: matches the phase level ({node.phase})
4. Media diversity: include at least one video if available, plus documentation or article
5. URL must come exactly from the candidate list — do not invent or modify URLs

For each resource, write a 10-15 word description explaining exactly what the learner will gain from it.

Return ONLY a JSON array of exactly 3 objects. No explanation, no markdown:
[
  {{
    "title": "Resource title (keep concise, under 10 words)",
    "url": "Exact URL from the candidate list",
    "description": "10-15 words: what the learner gains from this specific resource",
    "type": "video" | "article" | "documentation"
  }}
]

Candidate Resources:
{research_blob}"""

            response_json = AIService.generate_json(
                prompt,
                provider=settings.DEFAULT_PROVIDER,
                system_prompt="You are the Scout Agent. Select only the highest-quality technical learning resources. Return only valid JSON. No markdown, no backticks.",
                temperature=0.2
            )
            
            logger.info(f"Scout: LLM synthesis response received: {response_json[:500]}...")
            
            try:
                # Some LLM wrappers might return the wrapper JSON, e.g., OpenAI JSON mode
                data = json.loads(response_json)
                
                # Check for standard wrapper keys or direct list
                selected_resources = []
                if isinstance(data, list):
                    selected_resources = data
                elif isinstance(data, dict):
                    # Check for 'resources' or other keys, if not, handle single result or empty
                    selected_resources = data.get("resources", []) if "resources" in data else []
                    if not selected_resources and any(k in data for k in ["title", "url"]):
                        selected_resources = [data] # Single result

                if selected_resources:
                    # Save to DB
                    node.suggested_resources = selected_resources
                    db.commit()
                    logger.info(f"Scout: Node {node_id} successfully populated with {len(selected_resources)} resources.")
                    return selected_resources
                else:
                    logger.warning(f"Scout: No resources synthesized for node {node_id}.")
            except Exception as e:
                logger.error(f"Scout: Failed to parse or save synthesized resources: {e}")
                logger.error(f"Scout: Raw JSON that failed: {response_json}")
                
            return []
            
        except Exception as e:
            logger.error(f"Scout Service Global Error: {e}")
            db.rollback()
            return None
        finally:
            if not db_session:
                db.close()
