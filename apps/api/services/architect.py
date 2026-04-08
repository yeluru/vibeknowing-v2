from typing import List, Dict, Any
import json
import logging
from config import settings
from database import SessionLocal
from models import Project, Curriculum, CurriculumNode
from .ai import AIService

logger = logging.getLogger(__name__)

class ArchitectService:
    @staticmethod
    async def _create_nodes(db, curriculum_id: str, phases: List[Dict[str, Any]]):
        """Helper to wipe and recreate nodes for a curriculum."""
        from services.scout import ScoutService
        db.query(CurriculumNode).filter(CurriculumNode.curriculum_id == curriculum_id).delete()
        for phase_idx, phase_data in enumerate(phases):
            phase_name = phase_data.get("name")
            for node_idx, node_data in enumerate(phase_data.get("nodes", [])):
                logger.info(f"[_create_nodes] Creating node: {node_data.get('title')} in phase: {phase_name}")
                node = CurriculumNode(
                    curriculum_id=curriculum_id,
                    title=node_data.get("title"),
                    description=node_data.get("description"),
                    phase=phase_name,
                    sequence_order=(phase_idx * 10) + node_idx,
                    search_requirements=node_data.get("search_requirements"),
                    status="unlocked" if phase_idx == 0 and node_idx == 0 else "locked"
                )
                db.add(node)
                db.flush()
                
                # Auto-synthesize lesson + scout resources for every node in the first phase
                # so the learner sees real content immediately without waiting.
                if phase_idx == 0:
                    try:
                        logger.info(f"[_create_nodes] Auto-synthesizing lesson for {node.title}")
                        lesson = AIService.generate_node_lesson(node.title, node.description, phase_name, provider=settings.DEFAULT_PROVIDER)
                        node.lesson_content = json.loads(lesson)

                        # Flush so the node has a persisted ID before scout references it
                        db.flush()

                        logger.info(f"[_create_nodes] Auto-scouting resources for {node.title}")
                        await ScoutService.scout_for_node(node.id, db_session=db)
                    except Exception as le:
                        logger.error(f"Failed to auto-generate lesson or scout for {node.title}: {le}")

    @staticmethod
    async def create_syllabus(project_id: str, db_session=None):
        db = db_session or SessionLocal()
        try:
            project = db.query(Project).filter(Project.id == project_id).first()
            if not project: return None

            prompt = f"""Design a structured 4-phase learning curriculum for the topic: "{project.title}".

Create exactly 4 phases: Foundation, Core Skills, Advanced Application, Mastery & Integration.
Each phase must contain 3-5 nodes (learning units).

Return ONLY this JSON structure, no explanation, no markdown:
{{
  "phases": [
    {{
      "name": "Phase name",
      "nodes": [
        {{
          "title": "Specific, concrete topic title (not generic)",
          "description": "2-3 sentences: what this unit covers, why it matters, what the learner will be able to do after completing it.",
          "search_requirements": ["precise search query to find the best learning resource for this topic"]
        }}
      ]
    }}
  ]
}}

Rules:
- Node titles must be specific. "Introduction to Transformers" not "Introduction".
- Descriptions must explain the value, not just restate the title.
- search_requirements must be specific enough to find real tutorials or documentation (e.g. "pytorch transformer implementation tutorial" not "machine learning").
- Sequence nodes so each one builds on the previous. Do not repeat concepts across phases.
- Output valid JSON only. No backticks, no preamble."""

            response_json = AIService.generate_json(prompt, provider=settings.DEFAULT_PROVIDER, system_prompt="You are an expert curriculum designer. Output only valid JSON.", temperature=0.3)
            data = json.loads(response_json)
            phases = data.get("phases", [])

            curriculum = db.query(Curriculum).filter(Curriculum.project_id == project_id).first()
            if not curriculum:
                curriculum = Curriculum(project_id=project_id, goal=project.title, phases=phases)
                db.add(curriculum)
                db.flush()
            else:
                curriculum.phases = phases
                curriculum.goal = project.title

            await ArchitectService._create_nodes(db, curriculum.id, phases)
            db.commit()
            return curriculum
        except Exception as e:
            logger.error(f"Architect Error: {e}"); db.rollback(); return None
        finally:
            if not db_session: db.close()

    @staticmethod
    async def create_path_syllabus(category_id: str, db_session=None, reset: bool = False):
        db = db_session or SessionLocal()
        try:
            from models import Category, Project
            category = db.query(Category).filter(Category.id == category_id).first()
            if not category: return None
            
            projects = db.query(Project).filter(Project.category_id == category_id).all()
            context = "MISSION: Synthesize projects:\n" + "\n".join([f"- {p.title}" for p in projects]) if projects else f"MISSION: Build path for {category.name}"

            prompt = f"""Design a structured 4-phase learning curriculum for the collection: "{category.name}".

{context}

Create exactly 4 phases: Foundation, Core Skills, Advanced Application, Mastery & Integration.
Each phase must contain 3-5 nodes (learning units) that build progressively on each other.

Return ONLY this JSON structure, no explanation, no markdown:
{{
  "phases": [
    {{
      "name": "Phase name",
      "nodes": [
        {{
          "title": "Specific, concrete topic title",
          "description": "2-3 sentences: what this unit covers, why it matters, what the learner can do after.",
          "search_requirements": ["precise search query to find the best resource for this specific topic"]
        }}
      ]
    }}
  ]
}}

Rules:
- Derive topics directly from the projects listed in the context above.
- Node titles must name a real, concrete skill — not "Introduction" or "Overview".
- Sequence nodes so each one explicitly builds on the previous.
- Output valid JSON only. No backticks, no preamble."""

            response_json = AIService.generate_json(prompt, provider=settings.DEFAULT_PROVIDER, system_prompt="You are an expert curriculum designer. Output only valid JSON.", temperature=0.3)
            data = json.loads(response_json)
            phases = data.get("phases", [])

            curriculum = db.query(Curriculum).filter(Curriculum.category_id == category_id).first()
            if not curriculum:
                curriculum = Curriculum(category_id=category_id, goal=category.name, phases=phases)
                db.add(curriculum)
                db.flush()
            else:
                curriculum.phases = phases

            await ArchitectService._create_nodes(db, curriculum.id, phases)
            db.commit()
            return curriculum
        except Exception as e:
            logger.error(f"Path Architect Error: {e}"); db.rollback(); return None
        finally:
            if not db_session: db.close()

    @staticmethod
    async def create_mission_syllabus(user_id: str, db_session=None, vision: str = None, job_description: str = None, reset: bool = False, theme: str = None):
        db = db_session or SessionLocal()
        try:
            # Initial name attempt
            initial_name = theme or vision or "New Career Mission"
            context = f"TARGET ROLE / GOAL:\n{vision}" if vision else f"JOB DESCRIPTION TO MASTER:\n{job_description}"

            prompt = f"""You are designing a complete, real-world mastery roadmap. There are no artificial limits on depth or breadth — build exactly as many phases and nodes as the role genuinely requires.

{context}

--- DEPTH CALIBRATION ---
Analyse the goal first. Then decide:
- A narrow tool (e.g. "Learn Pandas") → 2-3 phases, 4-8 nodes total.
- A mid-level role (e.g. "Backend Engineer") → 4-6 phases, 20-40 nodes total.
- A senior / specialist role (e.g. "Staff ML Infrastructure Engineer at a FAANG") → 7-12 phases, 50-120 nodes total.
- A multi-discipline goal (e.g. "CTO of a fintech startup") → 10-15 phases, 80-150 nodes total.
There is NO upper cap. If the role demands 200 learning units, create 200.

--- NODE RULES ---
Each node is one concrete, hireable skill. Rules:
1. Title must name a real, specific skill or tool — never "Introduction", "Overview", or "Basics".
2. Description: 2-3 sentences — what it covers, why it matters at this stage, what the learner can demonstrate after.
3. search_requirements: 4-5 targeted queries, one per resource type. EACH query must be specific enough to find a single high-quality result:
   - [video] e.g. "pytorch scaled dot-product attention implementation from scratch tutorial youtube 2024"
   - [docs]  e.g. "pytorch nn.MultiheadAttention official documentation parameters"
   - [project] e.g. "build transformer encoder from scratch python project github"
   - [pdf]   e.g. "attention is all you need paper pdf arxiv 2017"
   - [blog]  e.g. "andrej karpathy minGPT walkthrough annotated"
4. Sequence nodes so every unit explicitly builds on the previous ones.
5. Phase names must reflect what the learner can DO at the end, not generic labels. Good: "Ship Production-Grade REST APIs". Bad: "Advanced Application".

Return ONLY this JSON structure. No markdown, no backticks, no preamble:
{{
  "mission_name": "3-6 word punchy title that names the exact role (e.g. 'RAG Systems Engineer', 'Staff ML Infrastructure Lead')",
  "estimated_hours": 120,
  "phases": [
    {{
      "name": "Phase name — outcome-oriented",
      "nodes": [
        {{
          "title": "Specific skill title",
          "description": "2-3 sentences.",
          "search_requirements": [
            "video query specific enough to find one tutorial",
            "official docs or spec query",
            "hands-on project or exercise query",
            "pdf textbook or paper query",
            "engineering blog or deep-dive article query"
          ]
        }}
      ]
    }}
  ]
}}

Output valid JSON only. No explanation outside the JSON."""

            response_json = AIService.generate_json(prompt, provider=settings.DEFAULT_PROVIDER, system_prompt="You are a world-class curriculum architect. You build deep, realistic mastery roadmaps calibrated to exactly what a real hiring bar requires. Output only valid JSON.", temperature=0.4, max_tokens=16000)
            data = json.loads(response_json)
            
            # Use AI's calculated name if we don't have a specific theme/vision
            mission_name = theme or data.get("mission_name") or initial_name
            phases = data.get("phases", [])

            # Check for existing mission with same name or ID
            curriculum = db.query(Curriculum).filter(Curriculum.user_id == user_id, Curriculum.goal == mission_name).first()
            if not curriculum:
                curriculum = Curriculum(user_id=user_id, goal=mission_name, phases=phases)
                db.add(curriculum)
                db.flush()
            else:
                curriculum.phases = phases
                curriculum.goal = mission_name # Update in case it changed

            logger.info(f"[create_mission_syllabus] Finalizing mission: {curriculum.id} ({mission_name}) with {len(phases)} phases")
            await ArchitectService._create_nodes(db, curriculum.id, phases)
            db.commit()
            db.refresh(curriculum)
            return curriculum
        except Exception as e:
            logger.error(f"Mission Architect Error: {e}"); db.rollback(); return None
        finally:
            if not db_session: db.close()
