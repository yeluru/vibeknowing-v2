"""
AI Service for VibeKnowing V2 - Multi-model support.
Replaces apps/api/services/ai.py

Each method accepts optional provider, model, api_key.
Resolution: browser header key > env var key > error.
Supports OpenAI, Anthropic, and Google Gemini.
"""

from config import settings
from typing import Optional
import json


def _get_client(provider: str = "openai", api_key: str = ""):
    """Create the right AI client based on provider."""
    if provider == "anthropic":
        import anthropic
        return anthropic.Anthropic(api_key=api_key)
    elif provider == "google":
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        return genai
    else:
        from openai import OpenAI
        return OpenAI(api_key=api_key)


def _resolve_key(provider: str, api_key: Optional[str] = None) -> str:
    """Get the API key: explicit > env var."""
    if api_key:
        return api_key
    fallbacks = {
        "openai": settings.OPENAI_API_KEY,
        "anthropic": getattr(settings, "ANTHROPIC_API_KEY", ""),
        "google": getattr(settings, "GOOGLE_AI_API_KEY", ""),
    }
    return fallbacks.get(provider, "")


def _resolve_model(provider: str, model: Optional[str] = None, task: str = "chat") -> str:
    """Get the model: explicit > sensible default per provider."""
    if model:
        return model
    defaults = {
        "openai": "gpt-4o",
        "anthropic": "claude-sonnet-4-20250514",
        "google": "gemini-2.0-flash",
    }
    return defaults.get(provider, "gpt-4o")


def _generate(
    prompt: str,
    provider: str = "openai",
    model: Optional[str] = None,
    api_key: Optional[str] = None,
    system_prompt: str = "",
    max_tokens: int = 4096,
    temperature: float = 0.7,
    task: str = "chat",
) -> str:
    """Unified text generation across providers."""
    key = _resolve_key(provider, api_key)
    mdl = _resolve_model(provider, model, task)

    if not key:
        return f"Error: No API key configured for {provider}."

    try:
        if provider == "anthropic":
            import anthropic
            client = anthropic.Anthropic(api_key=key)
            kwargs = {
                "model": mdl,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "messages": [{"role": "user", "content": prompt}],
            }
            if system_prompt:
                kwargs["system"] = system_prompt
            response = client.messages.create(**kwargs)
            return "".join(b.text for b in response.content if b.type == "text")

        elif provider == "google":
            import google.generativeai as genai
            genai.configure(api_key=key)
            gen_config = genai.types.GenerationConfig(
                max_output_tokens=max_tokens,
                temperature=temperature,
            )
            gmodel = genai.GenerativeModel(
                model_name=mdl,
                generation_config=gen_config,
                system_instruction=system_prompt or None,
            )
            response = gmodel.generate_content(prompt)
            return response.text or ""

        else:
            # OpenAI (default)
            from openai import OpenAI
            client = OpenAI(api_key=key)
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            # Handle reasoning models (o1, o3-mini)
            reasoning_models = {"o1", "o1-mini", "o1-pro", "o3-mini"}
            kwargs = {"model": mdl, "messages": messages}
            if mdl in reasoning_models:
                kwargs["max_completion_tokens"] = max_tokens
            else:
                kwargs["max_tokens"] = max_tokens
                kwargs["temperature"] = temperature

            response = client.chat.completions.create(**kwargs)
            return response.choices[0].message.content or ""

    except Exception as e:
        print(f"AI Error [{provider}/{mdl}]: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return f"Failed to generate: {str(e)}"


def _generate_json(
    prompt: str,
    provider: str = "openai",
    model: Optional[str] = None,
    api_key: Optional[str] = None,
    system_prompt: str = "",
    max_tokens: int = 4096,
    temperature: float = 0.7,
    task: str = "chat",
) -> str:
    """Unified JSON generation across providers."""
    key = _resolve_key(provider, api_key)
    mdl = _resolve_model(provider, model, task)

    if not key:
        return "{}"

    try:
        if provider == "anthropic":
            import anthropic
            client = anthropic.Anthropic(api_key=key)
            full_system = (system_prompt + "\n\n" if system_prompt else "") + \
                "IMPORTANT: Respond ONLY with valid JSON. No markdown, no backticks, no preamble."
            response = client.messages.create(
                model=mdl,
                max_tokens=max_tokens,
                temperature=temperature,
                system=full_system,
                messages=[
                    {"role": "user", "content": prompt},
                    {"role": "assistant", "content": "{"},
                ],
            )
            content = "".join(b.text for b in response.content if b.type == "text")
            return "{" + content

        elif provider == "google":
            import google.generativeai as genai
            genai.configure(api_key=key)
            gen_config = genai.types.GenerationConfig(
                max_output_tokens=max_tokens,
                temperature=temperature,
                response_mime_type="application/json",
            )
            gmodel = genai.GenerativeModel(
                model_name=mdl,
                generation_config=gen_config,
                system_instruction=system_prompt or None,
            )
            response = gmodel.generate_content(prompt)
            return response.text or "{}"

        else:
            # OpenAI
            from openai import OpenAI
            client = OpenAI(api_key=key)
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            response = client.chat.completions.create(
                model=mdl,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
                response_format={"type": "json_object"},
            )
            return response.choices[0].message.content or "{}"

    except Exception as e:
        print(f"AI JSON Error [{provider}/{mdl}]: {e}")
        return "{}"


class AIService:

    @staticmethod
    def cleanup_content(text: str, provider: str = "openai", model: str = None, api_key: str = None) -> str:
        prompt = """You are an expert content editor.
Your task is to extract ONLY the main content/article/post from the raw webpage text below and format it as a clean Markdown transcript.

CRITICAL CLEANUP RULES:
1. SOCIAL MEDIA POSTS: If this is a social media post (LinkedIn, Twitter, etc.), keep ONLY the main post text.
   - REMOVE all comments, replies, and reactions.
   - REMOVE interactions like "Like", "Comment", "Share", "Repost".
   - REMOVE relative timestamps (e.g., "17h", "2d").
   - REMOVE author bios, follower counts, and "You might also like" sections.
2. ARTICLES: Keep the headline and body text. Remove headers, footers, sidebars, and "Read more" links.
3. FORMATTING: Use clean Markdown. No extra horizontal rules or clutter.
4. ACCURACY: Do NOT summarize. Keep the exact wording of the main content.
5. LANGUAGE: Preserve the original language.

The output should look like a clean document, ready for reading, without any UI noise.

Return ONLY the cleaned main content."""

        input_text = text[:50000]
        result = _generate(
            prompt=f"{prompt}\n\nRaw Content:\n{input_text}",
            provider=provider, model=model, api_key=api_key,
            system_prompt="You are a helpful content cleaner.",
            max_tokens=16000, temperature=0.3, task="cleanup",
        )
        return result if not result.startswith("Error:") and not result.startswith("Failed") else text

    @staticmethod
    def generate_summary(text: str, style: str = "article", provider: str = "openai", model: str = None, api_key: str = None):
        if style == "article":
            prompt = f"""You are an expert AI technical educator and explainer.

Turn the transcript below into a clear, engaging educational blog for the same audience as the transcript. Write in simple, plain English, like you're patiently teaching a smart friend. Do not sound like a transcript or a generic summary. Reorganize ideas into a logical teaching flow.

Output Format
- Use Markdown headings: `##` for main sections, `###` for subsections.
- Write concise paragraphs (3-5 sentences each).
- Use lists only when they truly improve clarity.

Teaching Style
- Teach one idea per section.
- For each key idea:
    - Explain what it means in everyday words.
    - Explain the common misunderstanding (only if it exists).
    - Give a concrete real-world example or analogy.
- Remove repeated phrases and filler. Keep only the best, unique content.

Visuals (only when helpful)
- Include at most 1-3 simple text diagrams using ASCII inside code blocks only if they genuinely clarify a relationship, workflow, or framework in the transcript.
- Keep diagrams small and readable.

Technical Extras (conditional)
- Only include code references if actual code is provided in the input.
- If no code is provided, do not invent code, file paths, or links.
- Only include math formulas and worked examples if the transcript contains real math or quantitative reasoning.
- If included, use LaTeX: $...$ inline, $$...$$ for blocks, and show steps clearly.

Tone
- Professional, approachable, slightly conversational.
- Avoid motivational filler and hype. No "like and subscribe" language.

Quality Check (before final answer)
- Would a beginner understand this?
- Does each paragraph teach one thing?
- Did you avoid copying transcript wording?

Transcript:
{text[:12000]}"""
            max_tokens = 16000
        elif style == "concise":
            prompt = "Provide a concise summary of the key points in bullet format using Markdown.\n\n" + text[:10000]
            max_tokens = 4000
        elif style == "eli5":
            prompt = "Explain this like I'm 5 years old, using simple analogies and Markdown formatting.\n\n" + text[:10000]
            max_tokens = 8000
        else:
            prompt = "Summarize this content clearly.\n\n" + text[:10000]
            max_tokens = 8000

        print(f"Generating summary with style: {style} [{provider}]")
        return _generate(
            prompt=prompt, provider=provider, model=model, api_key=api_key,
            max_tokens=max_tokens, temperature=0.7, task="summary",
        )

    @staticmethod
    def generate_quiz(text: str, provider: str = "openai", model: str = None, api_key: str = None):
        prompt = """You are an expert AI tutor creating a quiz for a student.
Based on the provided content, generate 5 multiple-choice questions.

Output must be a JSON object with a "questions" key, containing an array of objects.
Each object must have:
- "question": The question text.
- "options": An array of 4 possible answers (strings).
- "correctAnswer": The index (0-3) of the correct option.
- "explanation": A brief explanation of why the answer is correct.

Focus on key concepts and understanding, not just trivia."""

        return _generate_json(
            prompt=f"{prompt}\n\nContent:\n{text[:15000]}",
            provider=provider, model=model, api_key=api_key,
            system_prompt="You are a helpful educational AI.",
            max_tokens=4096, temperature=0.7, task="quiz",
        )

    @staticmethod
    def generate_flashcards(text: str, provider: str = "openai", model: str = None, api_key: str = None):
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

        return _generate_json(
            prompt=f"{prompt}\n\nContent:\n{text[:15000]}",
            provider=provider, model=model, api_key=api_key,
            system_prompt="You are a helpful educational AI.",
            max_tokens=4096, temperature=0.7, task="flashcard",
        )

    @staticmethod
    def generate_social_media(text: str, platform: str = "twitter", provider: str = "openai", model: str = None, api_key: str = None):
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

        return _generate_json(
            prompt=f"{prompt}\n\nContent:\n{text[:10000]}",
            provider=provider, model=model, api_key=api_key,
            system_prompt="You are a social media expert.",
            max_tokens=2048, temperature=0.8, task="social",
        )

    @staticmethod
    def generate_diagram(text: str, concept: str = "", provider: str = "openai", model: str = None, api_key: str = None):
        concept_hint = f" Focus on visualizing: {concept}." if concept else ""
        prompt = f"""You are an expert at creating clear, educational ASCII diagrams.
Create a text-based diagram to visualize the key concepts from this content.{concept_hint}

Output must be a JSON object with:
- "diagram": The ASCII diagram (use box-drawing characters)
- "type": "ascii"
- "title": A descriptive title for the diagram
- "description": Brief explanation of what the diagram shows

Keep it clean, readable, and educational."""

        return _generate_json(
            prompt=f"{prompt}\n\nContent:\n{text[:10000]}",
            provider=provider, model=model, api_key=api_key,
            system_prompt="You are a visualization expert who creates clear ASCII diagrams.",
            max_tokens=4096, temperature=0.7, task="diagram",
        )

    @staticmethod
    def generate_article(text: str, style: str = "blog", provider: str = "openai", model: str = None, api_key: str = None):
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

        return _generate_json(
            prompt=f"{prompt}\n\nContent:\n{text[:15000]}",
            provider=provider, model=model, api_key=api_key,
            system_prompt="You are a professional writer.",
            max_tokens=8192, temperature=0.7, task="article",
        )

    @staticmethod
    def chat_with_context(query: str, context: str, provider: str = "openai", model: str = None, api_key: str = None):
        """Chat with source content. Returns a streaming iterator for OpenAI, or full text for others."""
        key = _resolve_key(provider, api_key)
        mdl = _resolve_model(provider, model, "chat")

        system_prompt = """You are a knowledgeable and helpful tutor. Your primary goal is to help the user understand and learn.

When answering questions:
1. PRIORITIZE information from the provided content/transcript when it's relevant
2. If the question is directly about the content, answer based on it
3. If the question is RELATED but goes beyond the content, feel free to provide helpful additional information
4. If asked about something completely unrelated, politely acknowledge it's outside the scope but still provide a brief, helpful answer
5. Always be educational, clear, and encouraging

Use the content as your foundation, but don't refuse to help with related questions."""

        user_content = f"Content/Transcript:\n{context[:20000]}\n\nQuestion: {query}"

        try:
            if provider == "anthropic":
                import anthropic
                client = anthropic.Anthropic(api_key=key)
                # Return a streaming iterator
                stream = client.messages.stream(
                    model=mdl,
                    max_tokens=4096,
                    temperature=0.7,
                    system=system_prompt,
                    messages=[{"role": "user", "content": user_content}],
                )
                return ("anthropic", stream)

            elif provider == "google":
                import google.generativeai as genai
                genai.configure(api_key=key)
                gen_config = genai.types.GenerationConfig(
                    max_output_tokens=4096,
                    temperature=0.7,
                )
                gmodel = genai.GenerativeModel(
                    model_name=mdl,
                    generation_config=gen_config,
                    system_instruction=system_prompt,
                )
                response = gmodel.generate_content(user_content, stream=True)
                return ("google", response)

            else:
                # OpenAI streaming (original behavior)
                from openai import OpenAI
                client = OpenAI(api_key=key)
                response = client.chat.completions.create(
                    model=mdl,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content}
                    ],
                    stream=True,
                )
                return ("openai", response)

        except Exception as e:
            print(f"Chat Error [{provider}/{mdl}]: {e}")
            return None
