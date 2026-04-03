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
    def generate_embedding(text: str, provider: str = "openai", api_key: str = None) -> list[float]:
        """Generate a dense vector embedding for the given text."""
        key = _resolve_key(provider, api_key)
        if not key:
            return []
        
        try:
            if provider == "openai":
                from openai import OpenAI
                client = OpenAI(api_key=key)
                # OpenAI uses text-embedding-3-small by default (1536 dims)
                res = client.embeddings.create(input=[text], model="text-embedding-3-small")
                return res.data[0].embedding
            elif provider == "google":
                import google.generativeai as genai
                genai.configure(api_key=key)
                res = genai.embed_content(
                    model="models/text-embedding-004",
                    content=text,
                    task_type="retrieval_document"
                )
                return res['embedding']
            elif provider == "anthropic":
                # Anthropic doesn't have native embeddings on their standard API, normally uses Voyage.
                # Fallback to OpenAI if key available, else just empty for now.
                fallback_key = _resolve_key("openai")
                if fallback_key:
                    from openai import OpenAI
                    client = OpenAI(api_key=fallback_key)
                    res = client.embeddings.create(input=[text], model="text-embedding-3-small")
                    return res.data[0].embedding
                return []
        except Exception as e:
            print(f"Embedding Error [{provider}]: {e}")
            return []

    @staticmethod
    def cleanup_content(text: str, provider: str = "openai", model: str = None, api_key: str = None) -> str:
        prompt = """Extract the main readable content from the raw text below and return it as clean, readable plain text (not Markdown).

Rules:
- Keep the exact original wording of the main content. Do not summarize, rephrase, or reorder.
- For social media posts: keep only the post body. Remove comments, reactions, like/share buttons, timestamps, follower counts, and "You might also like" sections.
- For articles and blog posts: keep the headline and body. Remove navigation menus, footers, sidebars, cookie banners, subscription prompts, and "Read more" links.
- For YouTube transcripts: keep the spoken words. Remove [Music], [Applause], and other bracketed annotations unless they are part of a spoken phrase.
- Preserve the original language.
- Do not add headings, bullet points, or formatting that was not in the original.
- Return only the cleaned content. No preamble, no explanation.

Raw Content:
"""

        input_text = text[:50000]
        result = _generate(
            prompt=f"{prompt}{input_text}",
            provider=provider, model=model, api_key=api_key,
            system_prompt="You are a precise content extractor. Return only the requested content, nothing else.",
            max_tokens=16000, temperature=0.1, task="cleanup",
        )
        return result if not result.startswith("Error:") and not result.startswith("Failed") else text

    @staticmethod
    def generate_summary(text: str, style: str = "article", provider: str = "openai", model: str = None, api_key: str = None):
        if style == "article":
            prompt = f"""You are a teacher writing an educational guide based on the content below. Your goal is to help the reader genuinely understand the subject — not just know what was said, but understand why it matters and how it works.

Write in plain, confident English. Imagine you are explaining this to a smart colleague who is new to the topic. No jargon without explanation. No hype. No filler phrases like "In conclusion" or "It's important to note."

Structure your response in Markdown:
- Start with a single sentence that captures the core idea of the entire piece (no heading, just the sentence).
- Use ## for major sections (2–5 depending on content depth).
- Use ### for subsections only when a major section has more than one distinct concept.
- Write paragraphs of 3–5 sentences. Each paragraph makes exactly one point.
- Use bullet lists sparingly — only when listing genuinely parallel items. Never use bullets just to break up text.

For every key concept:
1. State it plainly in one sentence.
2. Explain why it works that way (the reasoning, not just the definition).
3. Give one concrete real-world example or analogy. Make it specific — "like a spreadsheet" is weak; "like a restaurant keeping a running tab per table" is strong.
4. If there is a common mistake or misconception people have about this concept, address it in one sentence.

Only include the following if they genuinely appear in the source content:
- Code: show real snippets with brief inline comments. Do not invent code.
- Math: use LaTeX ($...$ inline, $$...$$ for blocks). Show the reasoning step by step.
- ASCII diagrams: only for relationships or flows that are genuinely hard to explain in text. Keep them under 20 lines.

End with a short section titled "## The one thing to remember" — one paragraph, maximum 3 sentences, that captures the single most important insight from the content.

Source content:
{text[:30000]}"""
            max_tokens = 16000
        elif style == "concise":
            prompt = f"""Read the content below and write a concise summary that captures the essential points a reader needs to walk away with.

Format:
- Start with one sentence (no heading) that captures the single most important idea.
- Then list 5–8 key points as bullet points. Each bullet is one complete sentence. No sub-bullets.
- End with one sentence: "In short: [restate the core idea in different words]."

Tone: Direct and informative. Write as if briefing a busy professional.

Content:
{text[:15000]}"""
            max_tokens = 4000
        elif style == "eli5":
            prompt = f"""Explain the content below to someone who has never heard of this topic before. Assume they are intelligent but completely unfamiliar with the field.

Rules:
- Never use jargon without immediately explaining it in parentheses.
- Use one concrete, relatable analogy for each major concept. Pick analogies from everyday life (cooking, sports, driving, shopping — not tech).
- Use short paragraphs. Maximum 3 sentences each.
- Use simple Markdown: ## for sections, bold for key terms when first introduced.
- Do not talk down to the reader. Explain simply, not condescendingly.
- Do not use the phrase "imagine" more than once.

Content:
{text[:15000]}"""
            max_tokens = 8000
        else:
            prompt = f"""Summarize the content below clearly and accurately.

Write 3–5 paragraphs. Each paragraph covers one theme or aspect of the content. Use plain language. Do not add opinions or information not present in the source.

Content:
{text[:15000]}"""
            max_tokens = 8000

        print(f"Generating summary with style: {style} [{provider}]")
        return _generate(
            prompt=prompt, provider=provider, model=model, api_key=api_key,
            max_tokens=max_tokens, temperature=0.7, task="summary",
        )

    @staticmethod
    def generate_quiz(text: str, provider: str = "openai", model: str = None, api_key: str = None):
        prompt = """Create 6 multiple-choice questions that test genuine understanding of the content below.

Question writing rules:
- Test reasoning and comprehension, not memory of specific words or trivia.
- Each question should have one clearly correct answer and three plausible wrong answers.
- Wrong answers should represent real misconceptions or common confusions — not obviously silly distractors.
- Questions should vary in type: some test definitions, some test application, some test comparison or cause-and-effect.
- Write questions in plain language. Avoid double negatives.

IMPORTANT — answer position:
- The correct answer must NOT always be at index 0. Distribute correct answers across all four positions (0, 1, 2, 3) across the question set. No more than 2 questions should share the same correctAnswer index. Deliberately vary the position.

Output a JSON object with this exact structure:
{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 2,
      "explanation": "One or two sentences explaining why this answer is correct and why the others are not."
    }
  ]
}

Explanations must be written in plain English. They should teach, not just confirm. Example of a good explanation: "The correct answer is C because [reason]. A is wrong because [reason]."

Content:
"""

        return _generate_json(
            prompt=f"{prompt}{text[:20000]}",
            provider=provider, model=model, api_key=api_key,
            system_prompt="You are an expert educator. Return only valid JSON. No markdown, no backticks.",
            max_tokens=6000, temperature=0.5, task="quiz",
        )

    @staticmethod
    def generate_flashcards(text: str, provider: str = "openai", model: str = None, api_key: str = None):
        prompt = """Create 12 flashcards from the content below that are genuinely useful for learning and retention.

Flashcard writing rules:
- Front: A focused question or prompt. Maximum 15 words. Should not contain the answer.
- Back: A clear, complete answer. 1–3 sentences. Should explain the concept, not just name it.
- Cover a mix of: key terms and definitions, cause-and-effect relationships, comparisons between concepts, and "why does this matter" questions.
- Do not create trivial cards (e.g., "What year was X?" unless the date is genuinely important).
- Write fronts as questions, not phrases. "What is X?" is better than "X definition".
- Backs should be self-contained — the reader should understand the answer without reading the front again.

Good example:
  Front: "Why does HTTP/2 use multiplexing instead of multiple TCP connections?"
  Back: "HTTP/2 multiplexing sends multiple requests over one TCP connection simultaneously, avoiding the overhead of establishing separate connections and eliminating head-of-line blocking at the HTTP layer."

Bad example:
  Front: "HTTP/2"
  Back: "A protocol"

Output a JSON object with this exact structure:
{
  "flashcards": [
    {
      "front": "Question or prompt here?",
      "back": "Clear, complete answer here."
    }
  ]
}

Content:
"""

        return _generate_json(
            prompt=f"{prompt}{text[:20000]}",
            provider=provider, model=model, api_key=api_key,
            system_prompt="You are an expert educator creating spaced-repetition flashcards. Return only valid JSON.",
            max_tokens=6000, temperature=0.5, task="flashcard",
        )

    @staticmethod
    def generate_social_media(text: str, platform: str = "twitter", provider: str = "openai", model: str = None, api_key: str = None):
        platform_guides = {
            "twitter": "280 characters max, engaging hook, use 1-2 hashtags",
            "linkedin": "Professional tone, 1-3 paragraphs, focus on insights and takeaways",
            "facebook": "Conversational, 1-2 paragraphs, encourage engagement"
        }
        guide = platform_guides.get(platform.lower(), platform_guides["twitter"])

        prompt = f"""Write a {platform} post based on the content below that a real person would actually share.

Platform guidelines for {platform}:
{guide}

Writing rules (apply to all platforms):
- Lead with the most surprising or valuable insight — not a setup or teaser.
- Write like a human sharing something they found genuinely useful, not like a brand.
- Be specific. "RAG retrieval improves answer accuracy by grounding responses in real data" is better than "AI can be improved."
- No empty superlatives: avoid "game-changing," "revolutionary," "powerful," "incredible."
- One idea per post. Do not try to cover everything.

Output a JSON object with this exact structure:
{{
  "post": "The complete post text, ready to copy and paste",
  "hook": "Just the opening line — the sentence that makes someone stop scrolling",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3"]
}}

Hashtag rules: 3-4 max. Specific over generic. #MachineLearning beats #Tech. #RAG beats #AI.

Content:
{text[:12000]}"""

        return _generate_json(
            prompt=prompt,
            provider=provider, model=model, api_key=api_key,
            system_prompt="You are a skilled writer who creates authentic social media content. Return only valid JSON.",
            max_tokens=2048, temperature=0.75, task="social",
        )

    @staticmethod
    def generate_diagram(text: str, concept: str = "", provider: str = "openai", model: str = None, api_key: str = None):
        concept_hint = f" Focus on visualizing: {concept}." if concept else ""
        prompt = f"""Create a highly readable, structural node-based overview of the key concepts, relationships, or processes in the content.{concept_hint}

Diagram rules:
- Extract logical steps, hierarchies, or networks from the text.
- Create explicit nodes and the directional edges (connections) between them.
- Keep node labels concise (under 5-8 words).
- You MUST format the output as a valid stringified JSON object containing 'nodes' and 'edges'.

Output a JSON object with this exact structure:
{{
  "diagram": "{{\\"nodes\\": [{{\\"id\\": \\"1\\", \\"label\\": \\"Step 1\\"}}, ...], \\"edges\\": [{{\\"id\\": \\"e1-2\\", \\"source\\": \\"1\\", \\"target\\": \\"2\\", \\"label\\": \\"leads to\\"}}]}}",
  "type": "flowchart",
  "title": "Specific descriptive title",
  "description": "One sentence explaining what the diagram shows."
}}

Content:
{text[:15000]}"""

        return _generate_json(
            prompt=prompt,
            provider=provider, model=model, api_key=api_key,
            system_prompt="You are a senior Data Visualization architect. Return strictly valid JSON.",
            max_tokens=4096, temperature=0.3, task="diagram",
        )

    @staticmethod
    def generate_article(text: str, style: str = "blog", provider: str = "openai", model: str = None, api_key: str = None):
        style_guides = {
            "blog": """Write in a confident, conversational voice. Use short paragraphs (2-4 sentences). 
Target length: 900-1300 words. Include 3-5 sections with ## headings.
Open with a hook — a question, a surprising fact, or a bold statement. Do not open with "In today's world" or "Have you ever wondered."
Close with one concrete takeaway the reader can act on or remember.""",

            "technical": """Write with precision. Define every technical term on first use.
Target length: 1200-1800 words. Use ## for major sections, ### for subsections.
Include code examples only if they appear in the source material — show real snippets, not pseudocode.
Structure: Problem → Why it's hard → The solution → How it works → When to use it.""",

            "tutorial": """Write as step-by-step instructions. Number each step.
Target length: 1000-1500 words.
Each step: what to do (one sentence) + why you're doing it (one sentence) + what success looks like (one sentence).
Include a "Before you start" section listing prerequisites.
End with a "You've now..." summary of what the reader accomplished.""",
        }
        guide = style_guides.get(style.lower(), style_guides["blog"])

        prompt = f"""Transform the source content below into a publishable {style} article.

Style guide for {style}:
{guide}

Writing quality standards (apply to all styles):
- Every sentence must earn its place. Delete any sentence that could be removed without losing meaning.
- Use active voice. "The system processes requests" not "Requests are processed by the system."
- Use specific nouns. "Redis cache" not "caching solution."
- No filler openers: never start a paragraph with "It is important to note that," "Basically," or "In essence."
- Write as a human expert, not as an AI assistant.

Output a JSON object with this exact structure:
{{
  "title": "A specific, concrete title (not generic — it should describe exactly what this article covers)",
  "content": "Full article in Markdown",
  "excerpt": "2 sentences that would make someone want to read the full article",
  "readTime": estimated_minutes_as_integer
}}

Source content:
{text[:25000]}"""

        return _generate_json(
            prompt=prompt,
            provider=provider, model=model, api_key=api_key,
            system_prompt="You are a professional writer and editor. Return only valid JSON. No markdown code fences.",
            max_tokens=8192, temperature=0.65, task="article",
        )

    @staticmethod
    def chat_with_context(query: str, context: str, provider: str = "openai", model: str = None, api_key: str = None):
        """Chat with source content. Returns a streaming iterator for OpenAI, or full text for others."""
        key = _resolve_key(provider, api_key)
        mdl = _resolve_model(provider, model, "chat")

        system_prompt = """You are a knowledgeable study partner helping someone understand and learn from a specific piece of content.

How to answer:
- Ground your answers in the provided content. Quote or paraphrase specific parts when relevant.
- If the question is directly answered in the content, answer it clearly and explain the reasoning behind it, not just the fact.
- If the question goes beyond the content but is clearly related, answer from your knowledge and say so: "The content doesn't cover this directly, but..."
- If the question is completely unrelated to the content, say so briefly and offer to refocus.
- Never refuse to engage with a genuine learning question.

How to write your answers:
- Be direct. Answer the question in the first sentence, then explain.
- Use plain language. If you use a technical term, define it immediately.
- Keep answers focused. 150-300 words for most questions. Longer only if the question genuinely requires it.
- Use bullet points only when listing 3+ parallel items. Never bullet-ize a single continuous thought.
- Do not start answers with "Great question!", "Certainly!", or "Of course!" — just answer.
- End complex answers with one sentence that captures the key takeaway."""

        user_content = f"Content:\n{context[:30000]}\n\nQuestion: {query}"

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

    @staticmethod
    def generate_podcast_script(text: str, provider: str = "openai", model: str = None, api_key: str = None):
        prompt = """Create a VIBRANT, HIGH-ENERGY AI Audio Briefing, presented by Alex, a professional human analyst who knows how to tell a story.

Audio Briefing Style Rules (The "Vibrant Human" Edition):
- DIVE IN IMMEDIATELY: Start with a powerful hook that captures the 'Why does this matter?' of the material. Use the speaker's own energy.
- NO AI JARGON: Strictly avoid phrases like "In summary," "The evolution of," "This technology underpinned," or "This methodology integrates." Speak like a human expert in a casual but professional setting.
- NARRATIVE PULSE: Tell a story. Start with the problem, the context, and the friction described in the transcript. Then, reveal the 'Aha!' moment.
- GROUNDED DETAILS: Use the specific examples from the transcript. If the speaker mentions AltaVista, MOSFETs, or 'Wi-Fi lights flashing yellow,' YOU mention them. These details make it real.
- ENGAGEMENT TECHNIQUES: Use rhetorical questions ("Ever wonder why...?"), verbal hooks ("Now, here's where it gets interesting..."), and emphasis ("This is really freaking powerful").
- HUMAN CADENCE: Use varied sentence lengths. Use conversational fillers naturally (e.g., "Think about it," "The reality is," "But wait, there's a kicker").
- COMPREHENSIVE BUT PUNCHY: For a 20-minute source, aim for 1200-1500 words of high-density storytelling. Go deep into the 'How it works' without losing the listener.
- Tone: Enthusiastic, Insightful, and Human. Not a robot reading a summary.

Output a JSON object with this exact structure:
{
  "title": "A punchy, engaging title that hooks the reader",
  "segments": [
    {
      "speaker": "Alex",
      "text": "The energetic, story-driven monologue. One segment is fine if it flows perfectly."
    }
  ]
}

Source Transcript:
"""
        return _generate_json(
            prompt=f"{prompt}{text[:30000]}",
            provider=provider, model=model, api_key=api_key,
            system_prompt="You are an award-winning podcast producer and scriptwriter. Return only valid JSON. No markdown code fences.",
            max_tokens=8192, temperature=0.8, task="podcast",
        )

    @staticmethod
    def generate_podcast_audio(segments: list, api_key: str = None) -> bytes:
        """
        Generate audio for each segment using OpenAI TTS and stitch them together.
        Alex = alloy, Sam = shimmer
        """
        from openai import OpenAI
        from io import BytesIO
        from pydub import AudioSegment
        
        key = _resolve_key("openai", api_key)
        client = OpenAI(api_key=key)
        
        # We need a dummy starting segment to initialize combined_audio properly
        # Or just use silent first. 
        # Actually initializing with an empty AudioSegment is fine.
        combined_audio = AudioSegment.silent(duration=10) # start with a tiny bit of silence
        
        # We'll use a 250ms silence between segments for natural pacing
        pause = AudioSegment.silent(duration=250)
        
        for i, seg in enumerate(segments):
            speaker = seg.get("speaker", "Alex")
            voice = "alloy" if speaker == "Alex" else "shimmer"
            text = seg.get("text", "")
            
            if not text:
                continue
                
            print(f"[Podcast] Generating TTS for {speaker}: {text[:30]}...")
            
            # Use tts-1 for speed/cost (hd is better but overkill for podcast host voices)
            response = client.audio.speech.create(
                model="tts-1",
                voice=voice,
                input=text
            )
            
            # Load the mp3 bytes into an AudioSegment
            seg_audio = AudioSegment.from_file(BytesIO(response.content), format="mp3")
            
            if i > 0:
                combined_audio += pause
            
            combined_audio += seg_audio
            
        # Export the final combined audio as mp3 bytes
        out_buffer = BytesIO()
        combined_audio.export(out_buffer, format="mp3")
        return out_buffer.getvalue()