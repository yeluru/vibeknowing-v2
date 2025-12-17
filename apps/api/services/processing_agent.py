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

            # EAGER GENERATION DISABLED FOR TOKEN SAVINGS
            # The frontend will trigger these generations on-demand.
            
            # 1. Generate Summary (Disabled)
            # if not source.summary:
            #     self.add_memory("system", "Generating summary...")
            #     summary = AIService.generate_summary(source.content_text, style="article")
            #     source.summary = summary
            #     db.commit()
            #     self.add_memory("system", "Summary generated and saved.")
            # else:
            #     self.add_memory("system", "Summary already exists. Skipping.")

            # 2. Generate Quiz (Disabled)
            # existing_quiz = db.query(Artifact).filter(...)
            
            # 3. Generate Flashcards (Disabled)
            # existing_fc = db.query(Artifact).filter(...)

            self.add_memory("system", "Ingestion complete. Artifacts will be generated on-demand.")

            return "Processing completed successfully"

        except Exception as e:
            db.rollback()
            self.add_memory("error", str(e))
            raise e
        finally:
            db.close()
