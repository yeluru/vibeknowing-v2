import subprocess
import json
import re
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter

class TranscriptService:
    @staticmethod
    def extract_video_id(url: str):
        """Extract video ID from various YouTube URL formats."""
        patterns = [
            r'(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)',
            r'youtube\.com\/embed\/([^&\n?#]+)',
            r'youtube\.com\/v\/([^&\n?#]+)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        return None

    @staticmethod
    def get_transcript_ytdlp(video_id: str):
        """
        Extract transcript using yt-dlp (most reliable method).
        Downloads auto-generated or manual subtitles in VTT format.
        """
        try:
            import os
            import tempfile
            
            # Create temp directory for subtitle files
            temp_dir = tempfile.gettempdir()
            output_template = os.path.join(temp_dir, f'ytdlp_{video_id}')
            
            # Try to get subtitles using yt-dlp
            cmd = [
                'yt-dlp',
                '--skip-download',
                '--write-auto-sub',
                '--sub-lang', 'en',
                '--sub-format', 'vtt',
                '--output', output_template,
                f'https://www.youtube.com/watch?v={video_id}'
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            # Look for the subtitle file (could be .en.vtt or .en-US.vtt, etc.)
            subtitle_file = None
            for filename in os.listdir(temp_dir):
                if filename.startswith(f'ytdlp_{video_id}') and filename.endswith('.vtt'):
                    subtitle_file = os.path.join(temp_dir, filename)
                    break
            
            if not subtitle_file:
                print(f"No subtitle file found for {video_id}")
                return None
            
            # Parse VTT file
            try:
                with open(subtitle_file, 'r', encoding='utf-8') as f:
                    vtt_content = f.read()
                
                # Clean up the file
                try:
                    os.remove(subtitle_file)
                except:
                    pass
                
                # Parse VTT format - extract just the text, skip timestamps
                lines = vtt_content.split('\n')
                text_parts = []
                
                for line in lines:
                    line = line.strip()
                    # Skip WEBVTT header, timestamps, and empty lines
                    if (line and 
                        not line.startswith('WEBVTT') and 
                        not '-->' in line and 
                        not line.isdigit() and
                        not line.startswith('NOTE')):
                        # Remove VTT tags like <c>
                        clean_line = re.sub(r'<[^>]+>', '', line)
                        if clean_line:
                            text_parts.append(clean_line)
                
                transcript = ' '.join(text_parts).strip()
                return transcript if transcript else None
                
            except FileNotFoundError:
                print(f"Subtitle file not found: {subtitle_file}")
                return None
                
        except subprocess.TimeoutExpired:
            print(f"yt-dlp timeout for {video_id}")
            return None
        except Exception as e:
            print(f"yt-dlp error for {video_id}: {e}")
            import traceback
            traceback.print_exc()
            return None

    @staticmethod
    def get_transcript_api(video_id: str):
        """
        Fallback: Use youtube-transcript-api library.
        Works for some videos but less reliable.
        """
        try:
            transcript = YouTubeTranscriptApi.get_transcript(video_id)
            formatter = TextFormatter()
            text = formatter.format_transcript(transcript)
            return text
        except Exception as e:
            print(f"youtube-transcript-api error for {video_id}: {e}")
            return None

    @staticmethod
    def get_transcript(video_id: str):
        """
        Try multiple methods to get transcript:
        1. yt-dlp (most reliable)
        2. youtube-transcript-api (fallback)
        """
        print(f"Attempting transcript extraction for {video_id}")
        
        # Method 1: yt-dlp
        transcript = TranscriptService.get_transcript_ytdlp(video_id)
        if transcript:
            print(f"✓ yt-dlp succeeded ({len(transcript)} chars)")
            return transcript
        
        # Method 2: youtube-transcript-api
        transcript = TranscriptService.get_transcript_api(video_id)
        if transcript:
            print(f"✓ youtube-transcript-api succeeded ({len(transcript)} chars)")
            return transcript
        
        print(f"✗ All transcript methods failed for {video_id}")
        return None
