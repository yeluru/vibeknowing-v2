import json
from typing import Any
from .agent_base import AgentBase
from database import SessionLocal
from models import Source, Artifact
from .ai import AIService
import uuid

class ProcessingAgent(AgentBase):
    """
    Automates the "processing" pipeline for a new source:
    1. Generate Summary
    2. Generate Quiz
    3. Generate Flashcards
    """

    def __init__(self, source_id: str):
        super().__init__(agent_id=f"processing-{source_id}")
        self.source_id = source_id

    async def process(self, input_data: Any) -> Any:
        self.add_memory("system", f"Starting processing for source {self.source_id}")
        
        db = SessionLocal()
        try:
            source = db.query(Source).filter(Source.id == self.source_id).first()
            if not source:
                raise ValueError(f"Source {self.source_id} not found")

            if not source.content_text:
                self.add_memory("system", "Source has no content text. Aborting.")
                # We return gracefully here because it might be an audio file still transcribing
                return "No content"

            # 1. Generate Summary
            if not source.summary:
                self.add_memory("system", "Generating summary...")
                summary = AIService.generate_summary(source.content_text, style="article")
                source.summary = summary
                db.commit()
                self.add_memory("system", "Summary generated and saved.")
            else:
                self.add_memory("system", "Summary already exists. Skipping.")

            # 2. Generate Quiz
            # Check if quiz already exists
            existing_quiz = db.query(Artifact).filter(
                Artifact.source_id == self.source_id,
                Artifact.type == "quiz"
            ).first()
            
            if not existing_quiz:
                self.add_memory("system", "Generating quiz...")
                quiz_json_str = AIService.generate_quiz(source.content_text)
                
                # Parse JSON to ensure it's valid, then save
                try:
                    quiz_content = json.loads(quiz_json_str)
                    
                    quiz_artifact = Artifact(
                       id=str(uuid.uuid4()),
                       project_id=source.project_id,
                       source_id=source.id,
                       type="quiz",
                       title=f"Quiz: {source.title}",
                       content=quiz_content
                    )
                    db.add(quiz_artifact)
                    db.commit()
                    self.add_memory("system", "Quiz generated and saved.")
                except json.JSONDecodeError:
                    self.add_memory("error", "Failed to parse quiz JSON")
            else:
                 self.add_memory("system", "Quiz already exists. Skipping.")

            # 3. Generate Flashcards
            existing_fc = db.query(Artifact).filter(
                Artifact.source_id == self.source_id,
                Artifact.type == "flashcard"
            ).first()
            
            if not existing_fc:
                self.add_memory("system", "Generating flashcards...")
                fc_json_str = AIService.generate_flashcards(source.content_text)
                
                try:
                    fc_content = json.loads(fc_json_str)
                    
                    fc_artifact = Artifact(
                       id=str(uuid.uuid4()),
                       project_id=source.project_id,
                       source_id=source.id,
                       type="flashcard", 
                       title=f"Flashcards: {source.title}",
                       content=fc_content
                    )
                    db.add(fc_artifact)
                    db.commit()
                    self.add_memory("system", "Flashcards generated and saved.")
                except json.JSONDecodeError:
                    self.add_memory("error", "Failed to parse flashcards JSON")
            else:
                 self.add_memory("system", "Flashcards already exists. Skipping.")

            return "Processing completed successfully"

        except Exception as e:
            db.rollback()
            self.add_memory("error", str(e))
            raise e
        finally:
            db.close()
