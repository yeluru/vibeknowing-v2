import json
from typing import Any
from .agent_base import AgentBase
from database import SessionLocal
from models import Source, Artifact
from .ai import AIService
from config import settings
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
            
            # 1. RAG CHUNKING PIPELINE (Multi-Source Vector Generation)
            from models import SourceChunk
            existing_chunks = db.query(SourceChunk).filter(SourceChunk.source_id == self.source_id).first()
            if not existing_chunks:
                self.add_memory("system", "Generating RAG vector embeddings...")
                import re
                
                # Split roughly by double newlines or single newlines
                chunks_raw = [c.strip() for c in re.split(r'\n+', source.content_text) if len(c.strip()) > 50]
                
                # Group them to roughly ~1000-1500 characters per chunk
                chunk_groups = []
                current_group = ""
                for section in chunks_raw:
                    if len(current_group) + len(section) > 1500:
                        if len(current_group) > 50:
                            chunk_groups.append(current_group.strip())
                        current_group = section
                    else:
                        current_group += " " + section if current_group else section
                if len(current_group.strip()) > 50:
                    chunk_groups.append(current_group.strip())

                # Determine which provider to use for embeddings.
                # Anthropic has no native embeddings API so we prefer OpenAI, then Google.
                # If neither is available the embedding will be None and RAG will be skipped gracefully.
                if settings.OPENAI_API_KEY:
                    embed_provider = "openai"
                    embed_key = settings.OPENAI_API_KEY
                elif settings.GOOGLE_AI_API_KEY:
                    embed_provider = "google"
                    embed_key = settings.GOOGLE_AI_API_KEY
                else:
                    embed_provider = "openai"  # will fail gracefully with empty key
                    embed_key = ""

                # Generate Math Vectors
                chunks_created = 0
                for chunk_text in chunk_groups:
                    emb = AIService.generate_embedding(chunk_text, provider=embed_provider, api_key=embed_key)
                    new_chunk = SourceChunk(
                        source_id=source.id,
                        project_id=source.project_id,
                        content_text=chunk_text,
                        embedding=emb if emb else [] # Persist as JSON
                    )
                    db.add(new_chunk)
                    chunks_created += 1
                
                db.commit()
                self.add_memory("system", f"Generated {chunks_created} vector chunks for multi-document RAG.")
            else:
                self.add_memory("system", "Vector embeddings already exist.")

            self.add_memory("system", "Ingestion complete. Artifacts will be generated on-demand.")

            return "Processing completed successfully"

        except Exception as e:
            db.rollback()
            self.add_memory("error", str(e))
            raise e
        finally:
            db.close()
