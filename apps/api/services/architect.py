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
                
                # Automatically trigger a lesson generation and resource scouting for the VERY FIRST node
                # to ensure the user sees 'Owned' content immediately.
                if phase_idx == 0 and node_idx == 0:
                    try:
                        logger.info(f"[_create_nodes] Auto-synthesizing first lesson for {node.title}")
                        lesson = AIService.generate_node_lesson(node.title, node.description, phase_name, provider=settings.DEFAULT_PROVIDER)
                        node.lesson_content = lesson
                        
                        # Trigger Scout Agent for first node resources
                        logger.info(f"[_create_nodes] Auto-scouting resources for {node.title}")
                        await ScoutService.scout_for_node(node.id, db_session=db)
                    except Exception as le:
                        logger.error(f"Failed to auto-generate first lesson or scout: {le}")

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
            context = f"MISSION: Become expert in: {vision}" if vision else f"MISSION: Master JD:\n{job_description}"

            prompt = f"""Design a professional mastery roadmap for the following goal:

{context}

Step 1: Generate a short, punchy mission title (3-5 words, like "Cloud Security Architect" or "RAG Systems Engineer").
Step 2: Create 4 sequential phases: Foundation → Core Skills → Advanced Application → Mastery & Integration.
Step 3: Each phase must have 3-5 nodes. Each node is one concrete learning unit.

Return ONLY this JSON structure, no explanation, no markdown:
{{
  "mission_name": "Short punchy mission title",
  "phases": [
    {{
      "name": "Phase name",
      "nodes": [
        {{
          "title": "Specific skill or concept title (not generic)",
          "description": "2-3 sentences: what this covers, why it matters at this stage, what the learner can do after.",
          "search_requirements": ["high-intent search query to find the best tutorial or documentation for this exact topic"]
        }}
      ]
    }}
  ]
}}

Rules:
- Every node title must name a real, specific skill — not "Introduction" or "Basics".
- Descriptions must explain practical value, not restate the title.
- search_requirements must be specific enough to find real learning resources.
- Sequence everything so each unit builds on the previous.
- Minimum 3 nodes per phase, maximum 5.
- Output valid JSON only. No backticks, no preamble."""

            response_json = AIService.generate_json(prompt, provider=settings.DEFAULT_PROVIDER, system_prompt="You are an expert curriculum designer and career coach. Output only valid JSON.", temperature=0.3)
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
