from openai import OpenAI
from config import settings

client = OpenAI(api_key=settings.OPENAI_API_KEY)

class AIService:
    @staticmethod
    def generate_summary(text: str, style: str = "article"):
        if style == "article":
            # Use the exact prompt that produced great results in ChatGPT
            prompt = f"""You are an expert AI technical educator.

Write a highly engaging, well-structured, and richly informative educational article based on the following transcript:

Guidelines:
- Use **Markdown headings** (`##` for main sections, `###` for subsections) to clearly structure content.
- Ensure headings are meaningful and not empty.
- Write concise paragraphs (3-5 sentences each) with smooth, storytelling transitions between sections.
- Use proper list formatting: `-` for unordered lists, `1.` for ordered lists, with consistent indentation.
- **Visuals**: Include text-based diagrams (ASCII art or box-and-arrow) inside code blocks to visualize processes or relationships.
- Explain technical concepts clearly using real-world metaphors, analogies, and examples.
- Include inline code explanations (e.g., `code`) when referencing code.
- Break down complex topics into approachable, logically flowing paragraphs.
- Maintain a professional, approachable, and slightly conversational tone, like a great teacher guiding a learner.
- Avoid motivational filler, excessive metaphors, or redundant whitespace.
- Ensure the output is ready-to-publish, highly engaging, and clear for intelligent general readers.
- When including mathematical expressions or formulas, always use LaTeX syntax and wrap them in $...$ for inline math or $$...$$ for block math.
- If the transcript covers a mathematical or technical concept, include a clear, step-by-step explanation, with formulas and worked examples as a teacher would. Favor a tutorial style over a generic summary when the content is instructional.
- For each key concept, provide at least one worked example with numbers and formulas, step by step.
- Ignore repeated or filler phrases from the transcript; focus on unique mathematical explanations and problem-solving steps.
- Minimize motivational or generic language; focus on clear, logical, and example-driven teaching.

Transcript:
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
    def generate_quiz(text: str):
        prompt = """You are an expert AI tutor creating a quiz for a student.
Based on the provided content, generate 5 multiple-choice questions.

Output must be a JSON object with a "questions" key, containing an array of objects.
Each object must have:
- "question": The question text.
- "options": An array of 4 possible answers (strings).
- "correctAnswer": The index (0-3) of the correct option.
- "explanation": A brief explanation of why the answer is correct.

Focus on key concepts and understanding, not just trivia."""
        
        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a helpful educational AI."},
                    {"role": "user", "content": f"{prompt}\n\nContent:\n{text[:15000]}"}
                ],
                response_format={ "type": "json_object" }
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"AI Error (Quiz): {e}")
            return '{"questions": []}'

    @staticmethod
    def generate_flashcards(text: str):
        prompt = """You are an expert in spaced repetition learning.
Create 10 high-quality flashcards from the provided content.

Output must be a JSON object with a "flashcards" key, containing an array of objects.
Each object must have:
- "front": The concept, question, or term.
- "back": The definition, answer, or explanation.

Guidelines:
- Keep the "front" concise.
- Ensure the "back" is clear and comprehensive but not overwhelming.
- Focus on the most important information for long-term retention."""

        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a helpful educational AI."},
                    {"role": "user", "content": f"{prompt}\n\nContent:\n{text[:15000]}"}
                ],
                response_format={ "type": "json_object" }
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"AI Error (Flashcards): {e}")
            return '{"flashcards": []}'

    @staticmethod
    def generate_social_media(text: str, platform: str = "twitter"):
        """Generate social media posts from content."""
        platform_guides = {
            "twitter": "280 characters max, engaging hook, use 1-2 hashtags",
            "linkedin": "Professional tone, 1-3 paragraphs, focus on insights and takeaways",
            "facebook": "Conversational, 1-2 paragraphs, encourage engagement"
        }
        
        guide = platform_guides.get(platform.lower(), platform_guides["twitter"])
        
        prompt = f"""You are a social media content creator.
Create an engaging {platform} post based on the provided content.

Guidelines for {platform}:
{guide}

Output must be a JSON object with:
- "post": The social media post text
- "hashtags": Array of relevant hashtags (3-5)
- "hook": A compelling opening line

Make it engaging, valuable, and shareable."""

        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a social media expert."},
                    {"role": "user", "content": f"{prompt}\n\nContent:\n{text[:10000]}"}
                ],
                response_format={ "type": "json_object" }
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"AI Error (Social Media): {e}")
            return '{"post": "", "hashtags": [], "hook": ""}'

    @staticmethod
    def generate_diagram(text: str, concept: str = ""):
        """Generate text-based diagrams/visualizations."""
        concept_hint = f" Focus on visualizing: {concept}." if concept else ""
        
        prompt = f"""You are an expert at creating clear, educational ASCII diagrams.
Create a text-based diagram to visualize the key concepts from this content.{concept_hint}

Output must be a JSON object with:
- "diagram": The ASCII diagram (use box-drawing characters: ─ │ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼ or simple +, -, |)
- "type": "ascii"
- "title": A descriptive title for the diagram
- "description": Brief explanation of what the diagram shows

Guidelines for ASCII diagrams:
- Use simple boxes and arrows to show relationships
- Keep it clean and readable
- Use spacing for clarity
- Show flow from top to bottom or left to right
- Label each box clearly

Example format:
```
┌─────────────┐
│   Input     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Process    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Output    │
└─────────────┘
```

Make it educational and visually clear."""

        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a visualization expert who creates clear ASCII diagrams."},
                    {"role": "user", "content": f"{prompt}\n\nContent:\n{text[:10000]}"}
                ],
                response_format={ "type": "json_object" }
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"AI Error (Diagram): {e}")
            return '{"diagram": "", "type": "ascii", "title": "", "description": ""}'

    @staticmethod
    def generate_article(text: str, style: str = "blog"):
        """Generate articles from content."""
        style_guides = {
            "blog": "Conversational, engaging, 800-1200 words, use headings and examples",
            "technical": "Detailed, precise, 1000-1500 words, include code examples if relevant",
            "tutorial": "Step-by-step, actionable, 1000-1500 words, numbered steps with explanations"
        }
        
        guide = style_guides.get(style.lower(), style_guides["blog"])
        
        prompt = f"""You are a professional content writer.
Transform the provided content into a well-structured {style} article.

Guidelines for {style} style:
{guide}

Output must be a JSON object with:
- "title": Compelling article title
- "content": Full article in Markdown format
- "excerpt": 2-3 sentence summary
- "readTime": Estimated read time in minutes

Use proper Markdown formatting with headings, lists, and emphasis.
Make it valuable, well-structured, and ready to publish."""

        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a professional writer."},
                    {"role": "user", "content": f"{prompt}\n\nContent:\n{text[:15000]}"}
                ],
                response_format={ "type": "json_object" }
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"AI Error (Article): {e}")
            return '{"title": "", "content": "", "excerpt": "", "readTime": 0}'


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
