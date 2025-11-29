from fastapi import APIRouter, Depends, HTTPException, Request, Form, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from ..database import get_db
from ..dependencies import get_current_user
from .. import models
from pydantic import BaseModel

router = APIRouter(
    prefix="/ingest",
    tags=["ingestion"]
)

class YouTubeRequest(BaseModel):
    url: str
    project_id: str

@router.post("/youtube")
async def ingest_youtube(request: YouTubeRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Universal URL ingestion - handles YouTube, Instagram, LinkedIn, TED, and any webpage"""
    # Handle default project
    if request.project_id == "default":
        # Find or create default project
        project = db.query(models.Project).filter(
            models.Project.owner_id == current_user.id,
            models.Project.title == "My Library"
        ).first()
        
        if not project:
            project = models.Project(
                title="My Library",
                description="Default project for all content",
                owner_id=current_user.id
            )
            db.add(project)
            db.commit()
            db.refresh(project)
        
        project_id = project.id
    else:
        project_id = request.project_id
        # Verify project belongs to user
        project = db.query(models.Project).filter(
            models.Project.id == project_id,
            models.Project.owner_id == current_user.id
        ).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

    # Check if URL already exists in any of the user's projects
    existing_source = db.query(models.Source).join(models.Project).filter(
        models.Project.owner_id == current_user.id,
        models.Source.url == request.url
    ).first()

    if existing_source:
        print(f"URL already exists: {request.url} -> Source ID: {existing_source.id}")
        return {
            "status": "exists", 
            "source_id": existing_source.id, 
            "has_content": bool(existing_source.content_text),
            "url_type": existing_source.type,
            "message": "Source already exists, redirecting..."
        }

    # Detect URL type
    from ..services.scraper import WebScraperService
    url_type = WebScraperService.detect_url_type(request.url)
    
    # Create source entry
    source = models.Source(
        project_id=project_id,
        type=url_type,
        url=request.url,
        title="Processing...",
        content_text=""
    )
    db.add(source)
    db.commit()
    db.refresh(source)

    # Try to fetch content based on URL type
    content_fetched = False
    error_message = None
    
    try:
        if url_type == 'youtube':
            # Use existing YouTube transcript service
            from ..services.transcript import TranscriptService
            video_id = TranscriptService.extract_video_id(request.url)
            
            if video_id:
                print(f"Attempting to fetch transcript for video ID: {video_id}")
                transcript_text = TranscriptService.get_transcript(video_id)
                
                if transcript_text:
                    source.content_text = transcript_text
                    source.title = f"YouTube: {video_id}"
                    content_fetched = True
                    print(f"Successfully fetched transcript ({len(transcript_text)} chars)")
                else:
                    error_message = "Transcript returned empty"
                    print(f"Transcript fetch returned None for {video_id}")
            else:
                error_message = "Could not extract video ID from URL"
                print(f"Failed to extract video ID from: {request.url}")
        else:
            # Use web scraper for all other URLs
            print(f"Scraping {url_type} URL: {request.url}")
            result = WebScraperService.scrape_url(request.url)
            
            if result['success'] and result['content']:
                source.content_text = result['content']
                source.title = result['title']
                content_fetched = True
                print(f"Successfully scraped content ({len(result['content'])} chars)")
            else:
                error_message = result['content']
                print(f"Scraping failed: {error_message}")
                
    except Exception as e:
        error_message = str(e)
        print(f"Content extraction error for {request.url}: {e}")
        import traceback
        traceback.print_exc()
    
    # If content extraction failed, add a helpful placeholder
    if not content_fetched:
        source.content_text = f"""[Content extraction failed: {error_message}]

This URL could not be processed automatically. This may be due to:
- Login/authentication requirements
- Anti-scraping protections
- Unsupported content format

For testing purposes, you can still:
- Generate a summary (will use this placeholder text)
- Create social media posts
- Try the manual transcript upload feature

URL Type: {url_type}
Original URL: {request.url}"""
        source.title = f"{url_type.capitalize()} Content (Extraction unavailable)"
    
    db.commit()
    return {"status": "ready", "source_id": source.id, "has_content": content_fetched, "url_type": url_type}

def process_file_background(source_id: str, content_bytes: bytes, filename: str, file_ext: str, content_type: str, force_ocr: bool):
    from ..database import SessionLocal
    from .. import models
    import traceback
    
    print(f"Background processing started for {filename} (Source ID: {source_id})")
    db = SessionLocal()
    
    content_text = ""
    source_type = "file"
    error_message = None
    
    try:
        # Handle different file types
        if file_ext in ['mp3', 'mp4', 'wav', 'm4a', 'webm', 'mpeg', 'mpga'] or \
           (content_type and ('audio' in content_type or 'video' in content_type)):
            # Audio/Video file - use Whisper for transcription
            print(f"Detected audio/video file, using Whisper transcription")
            source_type = "audio"
            
            # Save temporarily for Whisper
            import tempfile
            import os
            from openai import OpenAI
            from ..config import settings
            from pydub import AudioSegment
            
            # Create a temp file for the original upload
            with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{file_ext}') as tmp_file:
                tmp_file.write(content_bytes)
                tmp_path = tmp_file.name
            
            try:
                client = OpenAI(api_key=settings.OPENAI_API_KEY)
                file_size = os.path.getsize(tmp_path)
                limit_bytes = 25 * 1024 * 1024  # 25 MB
                
                if file_size > limit_bytes:
                    print(f"File size {file_size/1024/1024:.2f} MB exceeds Whisper limit (25 MB). Chunking...")
                    
                    # Load audio
                    audio = AudioSegment.from_file(tmp_path)
                    
                    # Split into 10-minute chunks (10 * 60 * 1000 ms)
                    chunk_length_ms = 10 * 60 * 1000
                    chunks = [audio[i:i + chunk_length_ms] for i in range(0, len(audio), chunk_length_ms)]
                    
                    print(f"Split into {len(chunks)} chunks")
                    
                    full_transcript = []
                    
                    for i, chunk in enumerate(chunks):
                        # Export chunk to temp file
                        chunk_name = f"{tmp_path}_chunk_{i}.mp3"
                        chunk.export(chunk_name, format="mp3")
                        
                        try:
                            print(f"Transcribing chunk {i+1}/{len(chunks)}...")
                            with open(chunk_name, 'rb') as audio_chunk:
                                transcript_chunk = client.audio.transcriptions.create(
                                    model="whisper-1",
                                    file=audio_chunk,
                                    response_format="text"
                                )
                            full_transcript.append(transcript_chunk)
                        finally:
                            # Clean up chunk file
                            if os.path.exists(chunk_name):
                                os.unlink(chunk_name)
                    
                    content_text = " ".join(full_transcript)
                    print(f"Chunked transcription successful ({len(content_text)} chars)")
                    
                else:
                    # File is small enough, transcribe directly
                    with open(tmp_path, 'rb') as audio_file:
                        transcript = client.audio.transcriptions.create(
                            model="whisper-1",
                            file=audio_file,
                            response_format="text"
                        )
                    content_text = transcript
                    print(f"Whisper transcription successful ({len(content_text)} chars)")
                    
            except Exception as e:
                error_message = f"Whisper transcription failed: {str(e)}"
                print(error_message)
            finally:
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
                
        elif file_ext == 'pdf' or (content_type and 'pdf' in content_type):
            # PDF file - extract text
            print(f"Detected PDF file, extracting text (Force OCR: {force_ocr})")
            source_type = "pdf"
            
            try:
                import PyPDF2
                import io
                
                # If force_ocr is True, skip PyPDF2 and go straight to OCR
                text_parts = []
                if not force_ocr:
                    try:
                        pdf_file = io.BytesIO(content_bytes)
                        pdf_reader = PyPDF2.PdfReader(pdf_file)
                        
                        # Check if PDF is encrypted
                        if pdf_reader.is_encrypted:
                            try:
                                pdf_reader.decrypt('')
                            except:
                                error_message = "PDF is password-protected"
                                print(error_message)
                                raise Exception(error_message)
                        
                        for page_num, page in enumerate(pdf_reader.pages):
                            try:
                                page_text = page.extract_text()
                                if page_text and page_text.strip():
                                    text_parts.append(page_text)
                            except Exception as page_error:
                                print(f"Warning: Failed to extract text from page {page_num + 1}: {page_error}")
                                continue
                    except Exception as pypdf_error:
                        print(f"PyPDF2 extraction failed: {pypdf_error}")
                
                if text_parts and not force_ocr:
                    raw_text = '\n\n'.join(text_parts)
                    
                    # Clean up the text for better readability
                    import re
                    
                    # Remove excessive whitespace while preserving paragraph breaks
                    cleaned_text = re.sub(r'\n{3,}', '\n\n', raw_text)  # Max 2 newlines
                    
                    # Fix broken lines (single newlines that should be spaces)
                    # But preserve intentional line breaks (like lists, addresses, etc.)
                    lines = cleaned_text.split('\n')
                    processed_lines = []
                    
                    for i, line in enumerate(lines):
                        line = line.strip()
                        if not line:
                            processed_lines.append('')
                            continue
                        
                        # Check if this line should be joined with the next
                        if i < len(lines) - 1:
                            next_line = lines[i + 1].strip()
                            
                            # Don't join if:
                            # - Current line ends with punctuation (., !, ?, :)
                            # - Next line starts with bullet/number
                            # - Current line is very short (likely a heading/label)
                            # - Line is all caps (likely a heading)
                            if (line and next_line and 
                                not line[-1] in '.!?:' and
                                not re.match(r'^[\d\-•*]', next_line) and
                                len(line) > 20 and
                                not line.isupper()):
                                # Join with space
                                processed_lines.append(line + ' ')
                            else:
                                processed_lines.append(line)
                        else:
                            processed_lines.append(line)
                    
                    content_text = '\n'.join(processed_lines)
                    
                    # Final cleanup: remove multiple spaces
                    content_text = re.sub(r' {2,}', ' ', content_text)
                    
                    print(f"PDF extraction successful ({len(content_text)} chars from {len(text_parts)} pages)")
                else:
                    # No text extracted OR force_ocr is True - try OCR
                    if force_ocr:
                        print("Force OCR enabled, skipping text extraction...")
                    else:
                        print("No text found with PyPDF2, attempting OCR...")
                    try:
                        from pdf2image import convert_from_bytes
                        import pytesseract
                        from PIL import Image
                        
                        # Convert PDF pages to images
                        images = convert_from_bytes(content_bytes)
                        print(f"Converted PDF to {len(images)} images for OCR")
                        
                        ocr_text_parts = []
                        for i, image in enumerate(images):
                            try:
                                # Perform OCR on each page
                                page_text = pytesseract.image_to_string(image)
                                if page_text and page_text.strip():
                                    ocr_text_parts.append(page_text)
                                    print(f"OCR page {i+1}: extracted {len(page_text)} chars")
                            except Exception as ocr_error:
                                print(f"OCR failed for page {i+1}: {ocr_error}")
                                continue
                        
                        if ocr_text_parts:
                            content_text = '\n\n'.join(ocr_text_parts)
                            print(f"OCR extraction successful ({len(content_text)} chars from {len(ocr_text_parts)}/{len(images)} pages)")
                        else:
                            error_message = "No text could be extracted from PDF even with OCR (might be empty or corrupted)"
                            print(error_message)
                            
                    except ImportError as import_err:
                        missing_lib = str(import_err).split("'")[1] if "'" in str(import_err) else "unknown"
                        error_message = f"OCR libraries not installed. Install with: pip install pdf2image pytesseract pillow\nAlso install tesseract: brew install tesseract (Mac) or apt-get install tesseract-ocr (Linux)"
                        print(error_message)
                    except Exception as ocr_error:
                        error_message = f"OCR extraction failed: {str(ocr_error)}"
                        print(error_message)
                    
            except ImportError:
                error_message = "PyPDF2 not installed. Install with: pip install PyPDF2"
                print(error_message)
            except Exception as e:
                error_message = f"PDF extraction failed: {str(e)}"
                print(error_message)

        elif file_ext == 'docx' or (content_type and 'wordprocessingml' in content_type):
            # Word document (.docx)
            print(f"Detected Word file, extracting text")
            source_type = "docx"
            
            try:
                import docx
                import io
                
                doc_file = io.BytesIO(content_bytes)
                doc = docx.Document(doc_file)
                
                text_parts = []
                for para in doc.paragraphs:
                    if para.text.strip():
                        text_parts.append(para.text)
                
                content_text = '\n\n'.join(text_parts)
                print(f"Word extraction successful ({len(content_text)} chars)")
                
            except ImportError:
                error_message = "python-docx not installed. Install with: pip install python-docx"
                print(error_message)
            except Exception as e:
                error_message = f"Word extraction failed: {str(e)}"
                print(error_message)
                
        elif file_ext in ['txt', 'md', 'csv', 'json'] or \
             (content_type and 'text' in content_type):
            # Text file - decode directly
            print(f"Detected text file, decoding content")
            source_type = "text"
            
            try:
                content_text = content_bytes.decode('utf-8')
                print(f"Text file decoded successfully ({len(content_text)} chars)")
            except UnicodeDecodeError:
                try:
                    content_text = content_bytes.decode('latin-1')
                    print(f"Text file decoded with latin-1 ({len(content_text)} chars)")
                except Exception as e:
                    error_message = f"Text decoding failed: {str(e)}"
                    print(error_message)
        else:
            error_message = f"Unsupported file type: {file_ext} ({content_type})"
            print(error_message)
    
    except Exception as e:
        error_message = f"File processing error: {str(e)}"
        print(error_message)
        import traceback
        traceback.print_exc()
    
    # Create failure message if needed
    if not content_text and error_message:
        content_text = f"""[File processing failed: {error_message}]

File: {filename}
Type: {file_ext}
Content-Type: {content_type}

Supported formats:
- Audio/Video: mp3, mp4, wav, m4a, webm (transcribed with Whisper)
- Documents: pdf, docx (text extraction)
- Text: txt, md, csv, json"""

    # Update source in DB
    try:
        source = db.query(models.Source).filter(models.Source.id == source_id).first()
        if source:
            source.content_text = content_text
            source.type = source_type
            # Update status to completed or failed
            source.meta_data = {"status": "completed" if not (error_message and not content_text) else "failed"}
            if error_message:
                source.meta_data["error"] = error_message
                
            db.commit()
            print(f"Background processing completed for source {source_id}")
        else:
            print(f"Source {source_id} not found during background processing")
    except Exception as e:
        print(f"Error updating source {source_id}: {e}")
    finally:
        db.close()

@router.post("/file")
async def ingest_file(
    background_tasks: BackgroundTasks,
    project_id: str = Form(...),
    file: UploadFile = File(...),
    force_ocr: bool = Form(False),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Upload and process files: audio/video (transcribe), PDF (extract text), or text files"""
    
    # Handle default project (same logic as URL ingestion)
    if project_id == "default":
        # Find or create default project
        project = db.query(models.Project).filter(
            models.Project.owner_id == current_user.id,
            models.Project.title == "My Library"
        ).first()
        
        if not project:
            project = models.Project(
                title="My Library",
                description="Default project for all content",
                owner_id=current_user.id
            )
            db.add(project)
            db.commit()
            db.refresh(project)
        
        project_id = project.id
    else:
        # Verify project belongs to user
        project = db.query(models.Project).filter(
            models.Project.id == project_id,
            models.Project.owner_id == current_user.id
        ).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

    filename = file.filename or "uploaded_file"
    file_ext = filename.split('.')[-1].lower() if '.' in filename else ''
    
    print(f"Queuing uploaded file for processing: {filename} (type: {file.content_type})")
    
    # Create source immediately with 'processing' status
    source = models.Source(
        project_id=project_id,
        type="file", # Placeholder
        title=filename,
        content_text=None,
        meta_data={"status": "processing"}
    )
    db.add(source)
    db.commit()
    db.refresh(source)
    
    # Read file content
    content_bytes = await file.read()
    
    # Add background task
    background_tasks.add_task(
        process_file_background,
        source.id,
        content_bytes,
        filename,
        file_ext,
        file.content_type,
        force_ocr
    )

    return {
        "status": "processing", 
        "source_id": source.id,
        "has_content": False,
        "file_type": "file"
    }

class ExtensionRequest(BaseModel):
    content: str
    url: str
    type: str

@router.post("/extension")
async def ingest_extension(request: ExtensionRequest, db: Session = Depends(get_db)):
    # TODO: Authenticate user via token
    # For now, use the first user found
    user = db.query(models.User).first()
    if not user:
        # Create default user if missing
        user = models.User(email="extension@example.com", full_name="Extension User")
        db.add(user)
        db.commit()
    
    # Find or create a default "Extension Captures" project
    project = db.query(models.Project).filter(models.Project.owner_id == user.id, models.Project.title == "Extension Captures").first()
    if not project:
        project = models.Project(title="Extension Captures", owner_id=user.id)
        db.add(project)
        db.commit()
        db.refresh(project)

    source = models.Source(
        project_id=project.id,
        type=request.type,
        url=request.url,
        title="Captured from Browser",
        content_text=request.content
    )
    db.add(source)
    db.commit()
    db.refresh(source)

    return {"status": "captured", "source_id": source.id}

@router.post("/refresh/{source_id}")
async def refresh_source(source_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Re-ingest a source by re-scraping the original URL and updating the database"""
    # Get the source and verify ownership
    source = db.query(models.Source).join(models.Project).filter(
        models.Source.id == source_id,
        models.Project.owner_id == current_user.id
    ).first()
    
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    # Store the original URL
    url = source.url
    url_type = source.type
    
    print(f"Refreshing source {source_id}: {url}")
    
    # Re-fetch content based on URL type
    content_fetched = False
    error_message = None
    
    try:
        if url_type == 'youtube':
            from ..services.transcript import TranscriptService
            video_id = TranscriptService.extract_video_id(url)
            
            if video_id:
                print(f"Re-fetching transcript for video ID: {video_id}")
                transcript_text = TranscriptService.get_transcript(video_id)
                
                if transcript_text:
                    source.content_text = transcript_text
                    source.title = f"YouTube: {video_id}"
                    content_fetched = True
                    print(f"Successfully re-fetched transcript ({len(transcript_text)} chars)")
                else:
                    error_message = "Transcript returned empty"
            else:
                error_message = "Could not extract video ID from URL"
        else:
            # Use web scraper for all other URLs
            from ..services.scraper import WebScraperService
            print(f"Re-scraping {url_type} URL: {url}")
            result = WebScraperService.scrape_url(url)
            
            if result['success'] and result['content']:
                source.content_text = result['content']
                source.title = result['title']
                content_fetched = True
                print(f"Successfully re-scraped content ({len(result['content'])} chars)")
            else:
                error_message = result['content']
                print(f"Re-scraping failed: {error_message}")
                
    except Exception as e:
        error_message = str(e)
        print(f"Content re-extraction error for {url}: {e}")
        import traceback
        traceback.print_exc()
    
    # If content extraction failed, update with error message
    if not content_fetched:
        source.content_text = f"""[Content extraction failed: {error_message}]

This URL could not be processed automatically. This may be due to:
- Login/authentication requirements
- Anti-scraping protections
- Unsupported content format

URL Type: {url_type}
Original URL: {url}"""
        source.title = f"{url_type.capitalize()} Content (Extraction unavailable)"
    
    # Clear the summary so it can be regenerated with new content
    source.summary = None
    
    db.commit()
    db.refresh(source)
    
    return {
        "status": "refreshed", 
        "source_id": source.id, 
        "has_content": content_fetched,
        "content_length": len(source.content_text) if source.content_text else 0,
        "title": source.title
    }
