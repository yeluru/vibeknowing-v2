from openai import OpenAI
from ..config import settings

client = OpenAI(api_key=settings.OPENAI_API_KEY)

class AIService:
    @staticmethod
    def generate_summary(text: str, style: str = "article"):
        if style == "article":
            # Use the exact prompt that produced great results in ChatGPT
            prompt = f"""You are a senior content creator who specializes in turning raw transcripts into deeply engaging, beginner-friendly articles.
Your job is to take the transcript I provide and transform it into a medium-length (8–10 min) article that absolute beginners can understand and enjoy.

Follow these instructions carefully:

1. Audience & Tone
- Write for absolute beginners with no prior knowledge of the topic.
- Use a tone that is friendly, conversational, and clear, like explaining something to a smart 5-year-old.
- Keep it professional but simple, and lightly motivational.

2. Style & Flow
- Create a hybrid narrative + tutorial article:
  - Start with a simple story or hook that helps readers instantly relate.
  - Gradually guide them into the core idea.
  - Break down concepts step-by-step with plain English.
  - Use short, clean paragraphs that breathe.

3. Visuals
- Include diagrams and illustrations in text-friendly form:
  - Simple block diagrams
  - Flowcharts with arrows
  - Analogy-based illustrations (e.g., "like how a librarian organizes books")
- Use markdown code blocks for diagrams, for example:

```
[Simple Diagram]
Topic → Concept → Output
```

4. Examples
- Include both:
  - Everyday analogies
  - Real technical examples (But written so a beginner will still understand.)

5. Clarity Rules
- Strictly avoid:
  - Heavy jargon
  - Complex math
  - Long walls of text
  - Salesy tone
  - Overly academic or robotic sentences
- Rewrite complicated ideas into clean, everyday language.

6. Structure
The article must follow this structure:
- A warm, simple introduction
- A story or real-life hook
- Key concept explained in simple English
- Diagram or visual illustration
- Step-by-step explanation
- Real-world example
- Everyday analogy
- Second diagram or flowchart
- Why this matters
- Simple recap
- Closing thoughts that encourage learning

7. Output
- Produce a full article, 100% rewritten — no transcript wording repeated.
- Keep it very easy to read.
- Make the article worth reading to the end.

**CRITICAL FORMATTING RULES:**
- Use ## for main section headings (e.g., ## The Big Idea)
- Use ### for subsection headings (e.g., ### Step 1: Understanding the Basics)
- DO NOT use horizontal lines (---) as section dividers
- DO NOT use bullet points (•) for headings - use proper ## markdown headings
- Use **bold** for emphasis within paragraphs
- Use bullet points (-) only for lists, not for headings

**CONTENT TYPE ADAPTATION:**
First, analyze the transcript to determine if it's:
- **Tutorial/How-To**: If the content teaches how to DO something, build something, or solve a problem step-by-step
- **Informational/Conceptual**: If the content explains WHAT something is, WHY it matters, or explores ideas/concepts

Then adapt your writing style:

FOR TUTORIAL CONTENT:
- Use numbered steps (1., 2., 3.) for sequential processes
- Include "Let's build...", "Here's how to...", "Follow these steps..."
- Provide concrete, actionable instructions
- Include code examples, commands, or specific actions to take
- Use second-person ("you will", "you can", "try this")
- End with "What you've learned" or "Next steps"

FOR INFORMATIONAL CONTENT:
- Use conceptual headings (## The Big Idea, ## How It Works, ## Why This Matters)
- Focus on understanding and mental models
- Use analogies and metaphors to explain abstract concepts
- Include "Imagine...", "Think of it like...", "This is similar to..."
- Use third-person or general statements
- End with "Key Takeaways" or "The Bigger Picture"

IMPORTANT: Remember, the reader chose to READ this instead of watching the video. Make it worth their time with rich, descriptive explanations that teach the concept thoroughly.

Here is the transcript:

{text[:12000]}"""
            model = "o1"  # Match ChatGPT's reasoning model
            max_tokens = 16000  # o1 supports longer outputs
            
        elif style == "concise":
            prompt = "Provide a concise summary of the key points in bullet format using Markdown.\n\n" + text[:10000]
            model = "o1"
            max_tokens = 4000
        elif style == "eli5":
            prompt = "Explain this like I'm 5 years old, using simple analogies and Markdown formatting.\n\n" + text[:10000]
            model = "o1"
            max_tokens = 8000
        else:
            prompt = "Summarize this content clearly.\n\n" + text[:10000]
            model = "o1"
            max_tokens = 8000
        
        try:
            print(f"Generating summary with style: {style}")
            print(f"API Key present: {bool(settings.OPENAI_API_KEY)}")
            print(f"Text length: {len(text)}")
            print(f"Using model: {model}")
            
            # o1 models don't support temperature parameter
            response = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                max_completion_tokens=max_tokens
            )
            result = response.choices[0].message.content
            print(f"Summary generated successfully ({len(result)} chars)")
            return result
        except Exception as e:
            print(f"AI Error: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            return f"Failed to generate summary: {str(e)}"

    @staticmethod
    def generate_flashcards(text: str):
        prompt = "Create 5 spaced-repetition flashcards from this content. Return as JSON array with 'front' and 'back' fields."
        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are an educational AI."},
                    {"role": "user", "content": f"{prompt}\n\nContent:\n{text[:10000]}"}
                ],
                response_format={ "type": "json_object" }
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"AI Error: {e}")
            return "[]"

    @staticmethod
    def chat_with_context(query: str, context: str):
        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": """You are a knowledgeable and helpful tutor. Your primary goal is to help the user understand and learn.

When answering questions:
1. PRIORITIZE information from the provided content/transcript when it's relevant
2. If the question is directly about the content, answer based on it
3. If the question is RELATED but goes beyond the content (e.g., asking for examples, clarifications, or related concepts), feel free to provide helpful additional information
4. If asked about something completely unrelated to the content, politely acknowledge it's outside the scope but still provide a brief, helpful answer if you can
5. Always be educational, clear, and encouraging

Remember: You're here to help the user learn, not to be restrictive. Use the content as your foundation, but don't refuse to help with related questions."""},
                    {"role": "user", "content": f"Content/Transcript:\n{context[:20000]}\n\nQuestion: {query}"}
                ],
                stream=True
            )
            return response
        except Exception as e:
            print(f"Chat Error: {e}")
            return None
