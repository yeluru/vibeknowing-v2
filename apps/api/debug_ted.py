import requests
from bs4 import BeautifulSoup
import json

url = "https://www.ted.com/talks/sam_altman_openai_s_sam_altman_talks_chatgpt_ai_agents_and_superintelligence_live_at_ted2025/transcript"
headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
}

print(f"Fetching {url}...")
response = requests.get(url, headers=headers)
soup = BeautifulSoup(response.content, 'html.parser')

next_data = soup.find('script', id='__NEXT_DATA__')
if next_data:
    print("Found __NEXT_DATA__")
    data = json.loads(next_data.string)
    
    # Print keys to understand structure
    props = data.get('props', {})
    page_props = props.get('pageProps', {})
    print("PageProps keys:", page_props.keys())
    
    if 'transcriptData' in page_props:
        print("Found 'transcriptData' in pageProps")
        transcript_data = page_props['transcriptData']
        print("TranscriptData keys:", transcript_data.keys())
        if 'translation' in transcript_data:
            print("Found 'translation'")
            translation = transcript_data['translation']
            if 'paragraphs' in translation:
                print(f"Found {len(translation['paragraphs'])} paragraphs")
                # Print first paragraph to verify
                print("First paragraph:", translation['paragraphs'][0])
            else:
                print("No 'paragraphs' in translation")
        else:
            print("No 'translation' in transcriptData")
    else:
        print("No 'transcriptData' in pageProps")
else:
    print("No __NEXT_DATA__ found")
