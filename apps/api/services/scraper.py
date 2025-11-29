"""Web scraping service for extracting content from various URLs"""

import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse
import re
import time
# Optional Playwright import for JS-rendered pages
try:
    from playwright.sync_api import sync_playwright
except ImportError:
    sync_playwright = None  # Playwright not installed

class WebScraperService:
    
    @staticmethod
    def detect_url_type(url: str) -> str:
        """Detect the type of URL"""
        domain = urlparse(url).netloc.lower()
        
        if 'youtube.com' in domain or 'youtu.be' in domain:
            return 'youtube'
        elif 'instagram.com' in domain:
            return 'instagram'
        elif 'linkedin.com' in domain:
            return 'linkedin'
        elif 'ted.com' in domain:
            return 'ted'
        else:
            return 'web'
    
    @staticmethod
    def scrape_instagram(url: str) -> dict:
        """Extract content from Instagram post"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
            response = requests.get(url, headers=headers, timeout=10)
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Try to extract post caption/description
            # Instagram's structure changes frequently, so this is a best-effort approach
            meta_description = soup.find('meta', property='og:description')
            title = soup.find('meta', property='og:title')
            
            content = ""
            if meta_description:
                content = meta_description.get('content', '')
            
            post_title = "Instagram Post"
            if title:
                post_title = title.get('content', 'Instagram Post')
            
            return {
                'title': post_title,
                'content': content or "Instagram post content (login may be required for full access)",
                'success': bool(content)
            }
        except Exception as e:
            return {
                'title': 'Instagram Post',
                'content': f'Failed to extract Instagram content: {str(e)}',
                'success': False
            }
    
    @staticmethod
    def scrape_linkedin(url: str) -> dict:
        """Extract content from LinkedIn post/article"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
            response = requests.get(url, headers=headers, timeout=10)
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract meta tags
            meta_description = soup.find('meta', property='og:description')
            title = soup.find('meta', property='og:title')
            
            content = ""
            if meta_description:
                content = meta_description.get('content', '')
            
            post_title = "LinkedIn Post"
            if title:
                post_title = title.get('content', 'LinkedIn Post')
            
            return {
                'title': post_title,
                'content': content or "LinkedIn content (login may be required for full access)",
                'success': bool(content)
            }
        except Exception as e:
            return {
                'title': 'LinkedIn Post',
                'content': f'Failed to extract LinkedIn content: {str(e)}',
                'success': False
            }
    
    @staticmethod
    def scrape_ted(url: str) -> dict:
        """Extract transcript from TED talk"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
            
            # Ensure we are looking at the transcript page
            transcript_url = url
            if '/transcript' not in url:
                transcript_url = url.rstrip('/') + '/transcript'
            
            print(f"Fetching TED transcript from: {transcript_url}")
            response = requests.get(transcript_url, headers=headers, timeout=10)
            
            # If transcript page doesn't exist, fall back to main page
            if response.status_code != 200:
                print(f"Transcript page not found ({response.status_code}), falling back to main page")
                response = requests.get(url, headers=headers, timeout=10)
            # If content is very short, try rendering with Playwright (JS-heavy pages)
            if len(response.content) < 200:
                try:
                    rendered_html = WebScraperService._render_page(url)
                    soup = BeautifulSoup(rendered_html, 'html.parser')
                except Exception:
                    # Fallback to raw content if rendering fails
                    soup = BeautifulSoup(response.content, 'html.parser')
            else:
                soup = BeautifulSoup(response.content, 'html.parser')
            # Extract title
            title_tag = soup.find('meta', property='og:title')
            title = title_tag.get('content', 'TED Talk') if title_tag else 'TED Talk'
            title = title.replace(' | TED Talk', '')
            
            transcript = ""
            
            # Method 1: Look for Next.js data (most reliable)
            import json
            next_data = soup.find('script', id='__NEXT_DATA__')
            if next_data:
                try:
                    data = json.loads(next_data.string)
                    # Traverse JSON to find transcript
                    # Path varies, but usually props -> pageProps -> transcriptData
                    props = data.get('props', {}).get('pageProps', {})
                    # Try 'transcriptData' first, then 'transcript'
                    transcript_data_obj = props.get('transcriptData') or props.get('transcript', {})
                    transcript_paragraphs = transcript_data_obj.get('translation', {}).get('paragraphs', [])
                    
                    if transcript_paragraphs:
                        full_text = []
                        for paragraph in transcript_paragraphs:
                            cues = paragraph.get('cues', [])
                            para_text = " ".join([cue.get('text', '') for cue in cues])
                            full_text.append(para_text)
                        transcript = "\n\n".join(full_text)
                        print(f"Extracted transcript from JSON ({len(transcript)} chars)")
                except Exception as e:
                    print(f"Failed to parse Next.js data: {e}")

            # Method 2: Look for transcript container in HTML (fallback)
            if not transcript:
                # TED often uses grid layouts for transcripts
                # Look for elements with class containing 'Grid' or 'p' tags inside a container
                # This is brittle, so we rely heavily on Method 1
                pass

            # Method 3: Fallback to description if still empty
            if not transcript:
                print("Falling back to description")
                meta_description = soup.find('meta', property='og:description')
                if meta_description:
                    transcript = meta_description.get('content', '')
            
            return {
                'title': title,
                'content': transcript or "TED talk content (transcript may not be available)",
                'success': bool(transcript) and len(transcript) > 200 # Ensure we got more than just a description
            }
        except Exception as e:
            return {
                'title': 'TED Talk',
                'content': f'Failed to extract TED content: {str(e)}',
                'success': False
            }
    
    @staticmethod
    def scrape_generic_webpage(url: str) -> dict:
        """Extract main content from any webpage with robust fallbacks."""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Referer': 'https://www.google.com/'
            }

            # Simple retry loop
            for attempt in range(3):
                response = requests.get(url, headers=headers, timeout=20)
                if response.status_code == 200:
                    break
                time.sleep(2 ** attempt)
            else:
                return {
                    'title': urlparse(url).netloc,
                    'content': f'Failed to fetch page (status {response.status_code})',
                    'success': False
                }

            # PDF handling – if the URL points to a PDF or the response is a PDF, extract text
            content_type = response.headers.get('Content-Type', '')
            if url.lower().endswith('.pdf') or 'application/pdf' in content_type:
                try:
                    from io import BytesIO
                    # Attempt to import PyPDF2 locally to avoid global dependency issues
                    from PyPDF2 import PdfReader
                    pdf_stream = BytesIO(response.content)
                    reader = PdfReader(pdf_stream)
                    pdf_text = []
                    for page in reader.pages:
                        pdf_text.append(page.extract_text() or '')
                    content = '\n\n'.join(pdf_text).strip()
                    title = urlparse(url).netloc
                    return {
                        'title': title,
                        'content': content or 'PDF content could not be extracted',
                        'success': bool(content)
                    }
                except ImportError:
                    return {
                        'title': urlparse(url).netloc,
                        'content': 'PDF extraction requires PyPDF2 library (pip install PyPDF2)',
                        'success': False
                    }
                except Exception as e:
                    return {
                        'title': urlparse(url).netloc,
                        'content': f'Failed to extract PDF: {str(e)}',
                        'success': False
                    }

            # If the fetched HTML is very short, it likely needs JavaScript rendering.
            if len(response.content) < 200:
                try:
                    rendered_html = WebScraperService._render_page(url)
                    soup = BeautifulSoup(rendered_html, 'html.parser')
                except Exception:
                    # Fallback to raw content if Playwright fails
                    soup = BeautifulSoup(response.content, 'html.parser')
            else:
                soup = BeautifulSoup(response.content, 'html.parser')

            # Title extraction
            title_tag = soup.find('title')
            title = title_tag.get_text(strip=True) if title_tag else urlparse(url).netloc

            # Strip out noisy tags
            for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'noscript']):
                tag.decompose()

            # Primary content search
            main_content = (
                soup.find('main') or
                soup.find('article') or
                soup.find('div', class_=re.compile('content|article|post', re.I)) or
                soup.find('section', class_=re.compile('content|article|post|body', re.I)) or
                soup.find('div', id=re.compile('content|article|post|body', re.I))
            )

            if main_content:
                # Get all visible text within the main content container
                content = main_content.get_text(separator='\n', strip=True)
            else:
                paragraphs = soup.find_all('p')
                content = '\n\n'.join([p.get_text(strip=True) for p in paragraphs if p.get_text(strip=True)])

            # Meta description fallback
            if not content:
                meta = soup.find('meta', property='og:description') or soup.find('meta', attrs={'name': 'description'})
                if meta:
                    content = meta.get('content', '').strip()

            # Full body fallback
            if not content:
                body = soup.body
                if body:
                    content = body.get_text(separator='\n', strip=True)

            # Length guard
            if len(content) > 50000:
                content = content[:50000] + "\n\n[Content truncated...]"

            return {
                'title': title,
                'content': content or "Could not extract meaningful content from webpage",
                'success': bool(content)
            }
        except Exception as e:
            return {
                'title': urlparse(url).netloc,
                'content': f'Failed to extract webpage content: {str(e)}',
                'success': False
            }

    @staticmethod
    def _render_page(url: str) -> str:
        """
        Render a page using Playwright to get fully loaded HTML.
        Returns the page content as a string.
        """
        if sync_playwright is None:
            raise RuntimeError("Playwright is not installed")
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(url, wait_until="networkidle")
            content = page.content()
            browser.close()
            return content

    @staticmethod
    def scrape_url(url: str) -> dict:
        """Main method to scrape any URL"""
        url_type = WebScraperService.detect_url_type(url)
        
        if url_type == 'instagram':
            return WebScraperService.scrape_instagram(url)
        elif url_type == 'linkedin':
            return WebScraperService.scrape_linkedin(url)
        elif url_type == 'ted':
            return WebScraperService.scrape_ted(url)
        elif url_type == 'web':
            return WebScraperService.scrape_generic_webpage(url)
        else:
            # YouTube is handled separately
            return {
                'title': 'YouTube Video',
                'content': '',
                'success': False
            }
