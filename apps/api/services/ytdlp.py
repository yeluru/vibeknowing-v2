import subprocess
import tempfile
import glob
import os
import math
import time
from typing import List, Dict, Optional
from openai import OpenAI
from youtube_transcript_api import YouTubeTranscriptApi
import re
from config import settings

import requests

class YtDlpService:
    @staticmethod
    def extract_video_id(url: str) -> Optional[str]:
        """Extract YouTube video ID from URL"""
        patterns = [
            r'(?:v=|\/)([0-9A-Za-z_-]{11}).*',
            r'(?:youtu\.be\/)([0-9A-Za-z_-]{11})',
            r'(?:embed\/)([0-9A-Za-z_-]{11})'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        return None

    @staticmethod
    def split_audio_ffmpeg(audio_file: str, max_size: int = 20*1024*1024) -> List[str]:
        """Split audio file into chunks smaller than max_size bytes"""
        file_size = os.path.getsize(audio_file)
        if file_size <= max_size:
            return [audio_file]
        
        # Check if ffmpeg is available
        try:
            subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("ffmpeg not available, returning original file")
            return [audio_file]
        
        # Get duration in seconds
        result = subprocess.run(
            ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of',
             'default=noprint_wrappers=1:nokey=1', audio_file],
            capture_output=True, text=True
        )
        
        if result.returncode != 0:
            print(f"Error getting duration: {result.stderr}")
            return [audio_file]
        
        try:
            duration = float(result.stdout.strip())
        except ValueError:
            print(f"Could not parse duration: {result.stdout}")
            return [audio_file]
        
        # Calculate number of chunks needed
        num_chunks = math.ceil(file_size / max_size)
        chunk_duration = duration / num_chunks
        
        chunk_paths = []
        base_name = os.path.splitext(audio_file)[0]
        
        for i in range(num_chunks):
            start_time = i * chunk_duration
            end_time = min((i + 1) * chunk_duration, duration)
            chunk_path = f"{base_name}_chunk_{i:03d}.mp3"
            
            cmd = [
                'ffmpeg', '-y', '-i', audio_file,
                '-ss', str(start_time),
                '-t', str(end_time - start_time),
                '-acodec', 'libmp3lame',
                '-ar', '16000',
                '-ac', '1',
                '-b:a', '128k',
                chunk_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            if result.returncode == 0 and os.path.exists(chunk_path):
                chunk_paths.append(chunk_path)
            else:
                print(f"Error creating chunk {i}: {result.stderr}")
        
        return chunk_paths if chunk_paths else [audio_file]

    @staticmethod
    def transcribe_with_retry(client: OpenAI, audio_file_path: str, max_retries: int = 3) -> str:
        """Transcribe audio file with retry logic"""
        for attempt in range(max_retries):
            try:
                with open(audio_file_path, "rb") as audio_file:
                    transcript = client.audio.transcriptions.create(
                        model="whisper-1",
                        file=audio_file,
                        response_format="text"
                    )
                    return transcript
            except Exception as e:
                print(f"Transcription attempt {attempt + 1} failed: {str(e)}")
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
                else:
                    raise e
        
        # This should never be reached, but just in case
        raise RuntimeError("All transcription attempts failed")

    @staticmethod
    def process_video(url: str) -> Dict[str, any]:
        """Process video URL using yt-dlp to get transcript or audio"""
        print(f"Starting yt-dlp processing for URL: {url}")

        # Check for WORKER_URL to offload processing
        if worker_url:
            print(f"Found WORKER_URL: {worker_url}. Attempting to offload processing...")
            try:
                # Add header to bypass ngrok free tier warning page
                headers = {"ngrok-skip-browser-warning": "true"}
                response = requests.post(worker_url, json={"url": url}, headers=headers, timeout=300)
                
                if response.status_code == 200:
                    data = response.json()
                    print("Worker processing successful!")
                    
                    # Determine default title based on URL type
                    default_title = "Video"
                    if 'youtube.com' in url or 'youtu.be' in url:
                        default_title = "YouTube Video"
                    elif 'instagram.com' in url:
                        default_title = "Instagram Reel"
                    elif 'ted.com' in url:
                        default_title = "TED Talk"
                    
                    return {
                        "success": True,
                        "method": f"worker_{data.get('method', 'unknown')}",
                        "content": data.get("transcript", ""),
                        "title": data.get("title", default_title)
                    }
                else:
                    # Log the full response for debugging
                    print(f"Worker failed with status {response.status_code}")
                    print(f"Worker response: {response.text[:500]}") # First 500 chars
                    print("Falling back to local processing...")
            except Exception as e:
                print(f"Worker request failed with error: {str(e)}")
                print("Falling back to local processing...")
        
        # Check if yt-dlp is available
        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                # Write cookies to file if env var exists
                cookies_path = None
                cookies_content = os.environ.get("YOUTUBE_COOKIES")
                if cookies_content:
                    print(f"Found YOUTUBE_COOKIES env var (length: {len(cookies_content)})")
                    cookies_path = f"{temp_dir}/cookies.txt"
                    with open(cookies_path, "w") as f:
                        f.write(cookies_content)
                    print(f"Created temporary cookies file at: {cookies_path}")
                    # Verify file exists and has content
                    if os.path.exists(cookies_path):
                        print(f"Verified cookies file exists, size: {os.path.getsize(cookies_path)} bytes")
                    else:
                        print("ERROR: Cookies file was not created!")
                else:
                    print("YOUTUBE_COOKIES env var not found or empty")

                # 0. Try youtube-transcript-api first (most reliable for transcripts)
                video_id = YtDlpService.extract_video_id(url)
                print(f"Extracted video ID: {video_id}")
                
                if video_id:
                    print(f"Attempting youtube-transcript-api for ID: {video_id}")
                    try:
                        # Use cookies if available
                        print(f"Calling get_transcript with cookies_path: {cookies_path}")
                        transcript_list = YouTubeTranscriptApi.get_transcript(video_id, cookies=cookies_path)
                        print(f"Successfully fetched transcript with youtube-transcript-api. Items: {len(transcript_list)}")
                        formatter = ""
                        for item in transcript_list:
                            formatter += item['text'] + " "
                        
                        # Get title using yt-dlp (lightweight)
                        # Determine default title based on URL type
                        default_title = "Video"
                        if 'youtube.com' in url or 'youtu.be' in url:
                            default_title = "YouTube Video"
                        elif 'instagram.com' in url:
                            default_title = "Instagram Reel"
                        elif 'ted.com' in url:
                            default_title = "TED Talk"
                        
                        title = default_title
                        try:
                            title_cmd = ["yt-dlp", "--get-title", "--no-warnings", url]
                            title_res = subprocess.run(title_cmd, capture_output=True, text=True, timeout=10)
                            if title_res.returncode == 0 and title_res.stdout.strip():
                                extracted_title = title_res.stdout.strip()
                                # Only use if it looks like a valid title (not empty)
                                if extracted_title:
                                    title = extracted_title
                        except:
                            pass

                        return {
                            "success": True,
                            "method": "youtube_transcript_api",
                            "content": formatter.strip(),
                            "title": title
                        }
                    except Exception as e:
                        print(f"youtube-transcript-api failed: {str(e)}")
                        print("Falling back to yt-dlp...")
                        # Continue to yt-dlp fallback

                # 1. Try to get subtitles first (cheaper and faster)
                cmd = [
                    "yt-dlp",
                    "--write-sub",
                    "--write-auto-sub",
                    "--sub-langs", "en,en-US,en-GB",
                    "--sub-format", "vtt",
                    "--skip-download",
                    "--no-warnings",
                    "-o", f"{temp_dir}/%(title)s.%(ext)s",
                    "--extractor-args", "youtube:player_client=android",
                    url
                ]
                
                if cookies_path:
                    cmd.extend(["--cookies", cookies_path])
                print(f"Running subtitle command: {' '.join(cmd)}")
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
                    
                vtt_files = glob.glob(f"{temp_dir}/*.vtt")
                print(f"Found VTT files: {vtt_files}")
                
                if vtt_files:
                    with open(vtt_files[0], "r", encoding="utf-8") as f:
                        content = f.read()
                    
                    # Clean VTT content (simple cleaning)
                    lines = content.splitlines()
                    cleaned_lines = []
                    seen_lines = set()
                    for line in lines:
                        line = line.strip()
                        # Skip timestamps, headers, and empty lines
                        if (not line or 
                            line.startswith('WEBVTT') or 
                            '-->' in line or 
                            line.isdigit() or
                            line in seen_lines):
                            continue
                        cleaned_lines.append(line)
                        seen_lines.add(line)
                    
                    cleaned_content = " ".join(cleaned_lines)
                    
                    # Get title using yt-dlp --get-title
                    title_cmd = ["yt-dlp", "--get-title", url]
                    title_res = subprocess.run(title_cmd, capture_output=True, text=True)
                    title = title_res.stdout.strip() or "Video Transcript"
                    
                    return {
                        "success": True, 
                        "method": "subtitles", 
                        "content": cleaned_content,
                        "title": title
                    }

                # 2. Fallback: download audio and transcribe with OpenAI Whisper
                print("No subtitles found, falling back to audio transcription...")
                
                if not settings.OPENAI_API_KEY:
                    return {"success": False, "error": "OpenAI API key required for audio transcription"}
                
                client = OpenAI(api_key=settings.OPENAI_API_KEY)
                
                cmd = [
                    "yt-dlp",
                    "--extract-audio",
                    "--audio-format", "mp3",
                    "--audio-quality", "192K",
                    "--no-warnings",
                    "-o", f"{temp_dir}/%(title)s.%(ext)s",
                    "--extractor-args", "youtube:player_client=android",
                    url
                ]
                
                if cookies_path:
                    cmd.extend(["--cookies", cookies_path])
                print(f"Running audio command: {' '.join(cmd)}")
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=300) # 5 min timeout for download
                
                if result.returncode != 0:
                    error_msg = result.stderr.strip() or result.stdout.strip() or "Unknown yt-dlp error"
                    print(f"Audio download failed: {error_msg}")
                    return {"success": False, "error": f"Audio download failed: {error_msg}"}
                
                audio_files = glob.glob(f"{temp_dir}/*.mp3")
                print(f"Found audio files: {audio_files}")
                
                if audio_files:
                    audio_file_path = audio_files[0]
                    title = os.path.splitext(os.path.basename(audio_file_path))[0]
                    print(f"Processing audio file: {audio_file_path}")
                    
                    # Split audio if needed (20MB chunks for safety)
                    max_size = 20 * 1024 * 1024
                    chunk_paths = YtDlpService.split_audio_ffmpeg(audio_file_path, max_size)
                    print(f"Split into {len(chunk_paths)} chunks")
                    
                    full_transcript = ""
                    for i, chunk_path in enumerate(chunk_paths):
                        print(f"Transcribing chunk {i+1}/{len(chunk_paths)}: {chunk_path}")
                        try:
                            transcript = YtDlpService.transcribe_with_retry(client, chunk_path)
                            full_transcript += transcript + "\n"
                        except Exception as e:
                            print(f"Failed to transcribe chunk {i+1}: {str(e)}")
                            # Continue with other chunks
                        
                        # Clean up chunk file if it's not the original
                        if chunk_path != audio_file_path and os.path.exists(chunk_path):
                            os.remove(chunk_path)
                    
                    if full_transcript.strip():
                        return {
                            "success": True, 
                            "method": "audio", 
                            "content": full_transcript.strip(),
                            "title": title
                        }
                    else:
                        return {"success": False, "error": "Failed to transcribe any audio chunks"}

                return {"success": False, "error": "Failed to download audio"}
        except Exception as e:
            print(f"Error in process_video: {str(e)}")
            import traceback
            traceback.print_exc()
            return {"success": False, "error": str(e)}
