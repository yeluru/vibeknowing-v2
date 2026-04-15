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
        import httpx
        import anthropic
        return anthropic.Anthropic(api_key=api_key)
    elif provider == "google":
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        return genai
    else:
        import httpx
        from openai import OpenAI
        return OpenAI(api_key=api_key, http_client=httpx.Client())


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
            import httpx
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
            import httpx
            client = OpenAI(api_key=key, http_client=httpx.Client())
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
            import httpx
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
            import httpx
            client = OpenAI(api_key=key, http_client=httpx.Client())
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
        import traceback
        print(f"AI JSON Error [{provider}/{mdl}]: {type(e).__name__}: {e}")
        traceback.print_exc()
        raise


class AIService:
    @staticmethod
    def generate_embedding(text: str, provider: str = "openai", api_key: str = None) -> list[float]:
        """Generate a dense vector embedding for the given text."""
        key = _resolve_key(provider, api_key)
        if not key:
            return []
        
        try:
            if provider == "openai":
                import httpx
                from openai import OpenAI
                client = OpenAI(api_key=key, http_client=httpx.Client())
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
                    import httpx
                    from openai import OpenAI
                    client = OpenAI(api_key=fallback_key, http_client=httpx.Client())
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
            prompt = f"""Read the source content below and write a clear, tight summary that captures the real substance of what was said.

Your reader is someone new to this topic but not unintelligent. They want to know what this is actually about, what the key ideas are, and why those ideas matter. They do not need to be wowed. They need to understand.

How to write it:
- Write in flowing prose. No fancy heading structures. One or two ## headings only if the content genuinely covers completely separate topics.
- 4 to 6 paragraphs total. Each paragraph covers one distinct idea or thread from the source.
- Open by stating the subject and the core idea directly. Do not refer to "the content", "the source", "the video", "the transcript", or "this piece". Write as if you are just explaining the topic to someone. "GraphRAG extends knowledge graphs with..." not "This content explains how GraphRAG..."
- Never use phrases like "The content discusses", "The source covers", "The video concludes by", "This piece explores". Write about the subject, not about the document.
- When a technical term appears for the first time, explain it briefly in the same sentence. Do not assume prior knowledge, but do not over-explain either.
- Strip all filler, repetition, and meta-commentary from the source ("in this video we'll cover...", "that's all for today"). Keep only the substance.
- If there is a specific process, comparison, or set of steps central to the topic, describe it clearly and concisely.
- No analogies invented just to sound clever. No motivational framing. No "this is important because..." Just state the idea and move on.
- Do not use em-dashes. Use commas, short sentences, or periods instead.
- If a mathematical concept is involved, state the formula in LaTeX and explain what each part means in one sentence. No derivations needed here.
- Length: 350 to 550 words. No more. No padding.

Source content:
{text[:30000]}"""
            max_tokens = 4000
        elif style == "concise":
            prompt = f"""Read the content below and write a tight summary of the essential points a reader needs to walk away with.

Format:
- Open with one sentence (no heading) that captures the single most important idea.
- Follow with 5 to 8 bullet points. Each bullet is one complete sentence. No sub-bullets.
- Close with exactly: "In short: [restate the core idea in different words]."

Tone: Direct and clear. Write as if briefing a busy professional who has 60 seconds.

Content:
{text[:15000]}"""
            max_tokens = 4000
        elif style == "eli5":
            prompt = f"""Explain the content below to someone who has never heard of this topic. Assume they are smart but completely new to the field.

Rules:
- Never use jargon without immediately explaining it in plain words right after.
- Use one concrete analogy from everyday life for each major concept. Cooking, sports, shopping, commuting work well. Tech analogies do not.
- Short paragraphs, 2 to 3 sentences max.
- Use simple Markdown: ## for sections, bold for key terms the first time they appear.
- Treat the reader as capable. Explain simply, not condescendingly.
- The word "imagine" can appear at most once.
- If math is involved, still explain it with words first, then show the formula in LaTeX if it helps.

Content:
{text[:15000]}"""
            max_tokens = 8000
        else:
            prompt = f"""Summarize the content below clearly and accurately.

Write 3 to 5 paragraphs. Each paragraph covers one theme or aspect of the content. Use plain language. Do not add opinions or information not present in the source.

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

Rules for writing questions:
- Test reasoning and comprehension, not word-for-word recall or trivia.
- One clearly correct answer. Three wrong answers that represent real misconceptions, not obviously silly choices.
- Mix up the question types across the set: some test definitions, some test application, some test cause-and-effect, some test comparison.
- Write in plain, direct language. No double negatives. No trick questions.
- If the content involves math or formulas, at least one question should test whether the reader understands what the formula means, not just how to recall it.

Answer position rule: the correct answer must not always be at index 0. Spread correct answers across positions 0, 1, 2, and 3. No more than 2 questions should share the same correctAnswer index.

Explanation rule: each explanation must teach. Show why the correct answer is right AND why at least one wrong answer is wrong. Write like a tutor, not a textbook.
Good: "C is correct because gradient descent updates weights in the direction that reduces loss. A is wrong because it describes forward propagation, not the update step."
Bad: "C is the correct answer."

Output a JSON object with this exact structure:
{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 2,
      "explanation": "Why this answer is right, and why the key wrong answer is wrong."
    }
  ]
}

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
        prompt = """Create 12 flashcards from the content below that are genuinely useful for learning and long-term retention.

Front of card:
- A focused question or prompt, 15 words max.
- Must not contain the answer or hint at it.
- Write as a question, not a phrase. "Why does X happen?" beats "X definition".

Back of card:
- 1 to 3 sentences. Explain the concept, do not just name it.
- Self-contained. The reader should understand the answer without re-reading the front.
- For math concepts: include the formula in LaTeX if it aids understanding. Briefly explain what each variable means.
- End with a memory hook when it helps: a one-sentence analogy, contrast, or mnemonic that makes the concept stick. "Think of it like a post office sorting facility" or "Unlike X which does Y, this does Z" are good forms.

Card type variety across the 12 cards:
- Key terms and what they actually mean
- Cause-and-effect relationships
- Comparisons between two concepts
- "Why does this work?" questions
- "What goes wrong if you don't?" questions
- No trivial dates or names unless they are genuinely important to the concept

Good example:
  Front: "Why does HTTP/2 use multiplexing instead of multiple TCP connections?"
  Back: "Multiplexing sends multiple requests over a single TCP connection at the same time. This eliminates the overhead of opening new connections and avoids head-of-line blocking that plagued HTTP/1.1."

Bad example:
  Front: "HTTP/2"
  Back: "A protocol"

Output a JSON object with this exact structure:
{
  "flashcards": [
    {
      "front": "Question or prompt here?",
      "back": "Clear, complete, self-contained answer here."
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
            "twitter": (
                "Max 280 characters. One punchy sentence. Pick the most surprising or useful insight from the content. "
                "No thread format. End with 1-2 highly specific hashtags (e.g. #RAG not #AI)."
            ),
            "linkedin": (
                "3-5 short paragraphs. Open with a concrete insight or counterintuitive fact. Not a question, not a greeting. "
                "Each paragraph makes one point. End with a practical takeaway the reader can use today. "
                "Professional but human. No corporate buzzwords. 3-4 relevant hashtags at the end."
            ),
            "instagram": (
                "2-3 short paragraphs. Hook in the first line. Make someone stop scrolling. "
                "Conversational, visual language. Describe ideas like you're talking to a friend. "
                "End with a call to action (save, share, try this). 5-8 specific hashtags on a new line."
            ),
        }
        guide = platform_guides.get(platform.lower(), platform_guides["twitter"])

        prompt = f"""Write a {platform} post based on the content below that a real person would actually share.

Platform guidelines for {platform}:
{guide}

Writing rules (apply to all platforms):
- Lead with the most surprising or valuable insight, not a setup or teaser.
- Write like a human sharing something genuinely useful, not like a brand or a press release.
- Be specific. "RAG retrieval improves accuracy by grounding LLM responses in retrieved documents" beats "AI can be improved."
- No empty superlatives. Cut: game-changing, revolutionary, powerful, incredible, transformative.
- One idea per post. Do not try to summarize everything.
- Never use em-dashes. Use a comma, a period, or rewrite the sentence.

Output a JSON object with this exact structure:
{{
  "post": "The complete post text, ready to copy and paste",
  "hook": "Just the opening line, the sentence that makes someone stop scrolling",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3"]
}}

Hashtag rules: 3 to 4 max. Specific over generic. #MachineLearning beats #Tech. #RAG beats #AI.

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
        concept_hint = f" Focus specifically on visualizing: {concept}." if concept else ""
        prompt = f"""Create a clear node-based diagram of the key concepts, steps, or relationships in the content below.{concept_hint}

Rules:
- Extract the logical structure: steps, hierarchies, data flows, or cause-and-effect chains.
- Every node needs a label that is 5 words or fewer.
- Every edge needs a label that describes the relationship (e.g. "triggers", "outputs to", "depends on", "calls").
- Group related nodes by giving them a shared prefix in the id (e.g. "data-1", "data-2" for data layer nodes).
- Prefer depth over breadth. A deep chain of 8 nodes is more useful than a flat list of 15.
- Do not invent relationships that are not in the content.

Output a JSON object with this exact structure:
{{
  "diagram": "{{\\"nodes\\": [{{\\"id\\": \\"1\\", \\"label\\": \\"Step 1\\"}}, ...], \\"edges\\": [{{\\"id\\": \\"e1-2\\", \\"source\\": \\"1\\", \\"target\\": \\"2\\", \\"label\\": \\"leads to\\"}}]}}",
  "type": "flowchart",
  "title": "Specific, descriptive title (not generic like 'Overview')",
  "description": "One sentence explaining what this diagram shows and why it matters."
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
            "blog": """This is a blog post for Medium or LinkedIn. Someone will read it in their feed and decide in 3 seconds whether to keep going.

Target length: 900 to 1300 words. 3 to 5 sections with ## headings.

Opening: Do not summarize. Do not explain what you are about to write. Start with a single punchy sentence that makes the reader feel something or want to know more. A surprising stat, a concrete situation, a counterintuitive claim. Never "In today's world", never "Have you ever wondered".

Body: Take a clear point of view. Do not just report what the source said. Shape it into an argument, a lesson, or a revelation. Each section advances the piece, it does not just add more facts.

Closing: One concrete thing the reader can do, remember, or look at differently tomorrow. Not "in conclusion". Land the idea.

Tone: Confident, human, direct. The writer knows this topic and is sharing something genuinely worth knowing.""",

            "technical": """This is a deep-dive technical article for developers or engineers. The reader is comfortable with code and wants to understand how something actually works.

Target length: 1200 to 1800 words. Use ## for major sections, ### for subsections.

Structure each major section as: what problem this solves, why the naive approach fails, the actual solution, how it works under the hood, when to use it vs. alternatives.

For every mathematical concept: build the intuition first in plain language, then show the formula in LaTeX ($...$ inline, $$...$$ for block), and define every variable.

Include code snippets only if they appear in the source. Real code only, no pseudocode, no placeholder variable names.

Use Markdown comparison tables when two or more options share the same set of tradeoffs. A table is cleaner than "X does this, Y does that" repeated three times.

The reader should finish this article able to explain the concept to a colleague and know when to reach for it.""",

            "tutorial": """This is a hands-on tutorial. The reader wants to build or do something specific, not just understand theory.

Target length: 1000 to 1500 words.

Start with a short "Before you start" section: what the reader needs installed or understood already.

Each step has exactly three parts: what to do (one sentence, imperative), why you are doing it (one sentence), what success looks like (one sentence). Number every step.

End with "You now have..." followed by a one-paragraph description of what was built and what the reader can extend or explore next.""",
        }
        guide = style_guides.get(style.lower(), style_guides["blog"])

        prompt = f"""Write a publishable {style} article based on the source content below. This article will appear on platforms like Medium, LinkedIn, or a technical blog. It must read like it was written by a person with genuine expertise and a point of view, not like a document summarizer.

Style guide for {style}:
{guide}

Standards that apply to every style:
- Every sentence must earn its place. Cut anything that does not add meaning.
- Active voice. "The algorithm updates weights" not "Weights are updated by the algorithm."
- Specific nouns. "PostgreSQL index" not "database optimization". "attention head" not "model component".
- No filler openers. Never start any paragraph with "It is important to note", "Basically", "In essence", or "As we can see".
- No em-dashes. Use a comma, a short sentence, or rewrite.
- Never refer to "the source", "the content", "the video", "the transcript", or "this piece". Write directly about the subject as if you are the author, not a reporter summarizing someone else's work.
- If the content involves math, write all formulas in LaTeX and walk through the reasoning.

Output a JSON object with this exact structure:
{{
  "title": "A specific, concrete title a reader would click on, not a generic label",
  "content": "Full article in Markdown",
  "excerpt": "2 sentences that make a reader in a feed stop scrolling and open this",
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

        system_prompt = """You are a sharp, knowledgeable study partner helping someone understand a specific piece of content deeply.

How to answer:
- Ground your answers in the provided content. Quote or paraphrase specific parts when it helps.
- If the question is answered in the content, explain the reasoning behind the answer, not just the fact.
- When someone asks WHY something works, explain the chain of cause and effect step by step. Do not jump to the conclusion. Walk the path: "X happens because Y, which causes Z, which means..."
- If the question goes beyond the content but is clearly related, answer from your knowledge and flag it: "The content does not cover this directly, but..."
- If the question is completely off-topic, say so briefly and offer to refocus.
- Never refuse a genuine learning question.
- If the question involves a formula or equation, write it in LaTeX ($...$ inline, $$...$$ for block) and walk through what each part means. Build the intuition before showing the math.

How to write your answers:
- Lead with the answer in the first sentence, then explain.
- Plain language. If you use a technical term, define it in the same sentence.
- 150 to 300 words for most questions. Longer only when the question genuinely needs it.
- Bullet points only when listing 3 or more parallel items. Never bullet a single continuous thought.
- Do not open with "Great question!", "Certainly!", or "Of course!". Just answer.
- Close complex answers with one sentence that captures the key takeaway.
- No em-dashes. Use a comma, a period, or rewrite the sentence."""

        user_content = f"Content:\n{context[:30000]}\n\nQuestion: {query}"

        try:
            if provider == "anthropic":
                import httpx
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
                import httpx
                from openai import OpenAI
                client = OpenAI(api_key=key, http_client=httpx.Client())
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
        prompt = """Write a high-energy audio briefing presented by Alex, a sharp analyst who tells stories for a living.

Rules:
- Start immediately with a hook that answers "why does this matter right now?" No throat-clearing, no "Today we're going to talk about..."
- Tell a story. Open with the problem or the friction, build through the context, land on the insight.
- Use the specific details from the source. If the source mentions AltaVista, MOSFETs, or a Wi-Fi light flashing yellow, Alex mentions them too. Details make it real.
- Rhetorical questions work: "Ever wonder why...?" "Here's the part most people miss..."
- Conversational fillers used sparingly and naturally: "Think about it." "The reality is." "And here's the kicker."
- Varied sentence lengths. Some punchy. Some that build a bit more before landing. Like this.
- Avoid all of these phrases: "In summary", "The evolution of", "This technology underpinned", "This methodology integrates", "It is worth noting", "Delve into".
- For a 20-minute source, aim for 1200 to 1500 words of high-density storytelling. Go deep on how it works without losing the listener.
- No em-dashes. Use short sentences or commas instead.
- Tone: Enthusiastic, curious, human. Not a robot reading a summary.

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
        import httpx
        from openai import OpenAI
        from io import BytesIO
        from pydub import AudioSegment

        key = _resolve_key("openai", api_key)
        client = OpenAI(api_key=key, http_client=httpx.Client())
        
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

    @staticmethod
    def generate_text(prompt: str, **kwargs) -> str:
        """Expose the _generate logic to other services."""
        return _generate(prompt=prompt, **kwargs)

    @staticmethod
    def generate_node_lesson(node_title: str, node_description: str, phase: str, **kwargs) -> str:
        """Generate a dense, robust technical masterclass for a curriculum node."""
        prompt = f"""Create a technical masterclass for the learning unit: "{node_title}"

Phase: {phase}
Unit description: {node_description}

What to write:
- Build intuition before formal definition. For every concept, open with the problem it solves or the real-world moment that made someone invent it. Then introduce the term.
- Explain the reasoning behind every concept, not just the definition. A learner should understand WHY, not just WHAT.
- Every concept needs a concrete, specific example from the real world. No generic placeholders.
- For mathematical concepts, write every formula in LaTeX. Use $...$ for inline and $$...$$ for block equations. Explain each variable and walk through the derivation step by step. Show the intuition first, then the math.
- For processes or architectures, include a labeled ASCII diagram showing how the pieces connect. Every section that describes a flow, pipeline, or structure should have a diagram.
- Write in plain, direct language. Like a senior engineer explaining something to a smart junior. No em-dashes.
- The youtube_search for each section must be specific enough to surface exactly one tutorial (e.g. "pytorch scaled dot-product attention implementation from scratch" not "learn pytorch").
- The deployment_lab must give tasks the learner can actually run, with real CLI commands or code snippets, not vague instructions.

Return ONLY this JSON structure. No markdown, no backticks, no preamble:
{{
  "mission_brief": "Two sentences: what this unit covers and what the learner can build or do after completing it",
  "core_concepts": ["5 to 8 specific concept names that form the 80/20 foundation of this unit"],
  "deep_dive_sections": [
    {{
      "title": "Name of a specific concept (not Introduction or Overview)",
      "content": "4 to 6 paragraphs. Dense, accurate technical content with real examples. Include LaTeX formulas and ASCII diagrams where they aid understanding.",
      "pro_tip": "One expert-level insight that most tutorials skip or get wrong",
      "youtube_search": "Specific enough query to find exactly one high-quality tutorial video for this concept"
    }}
  ],
  "visual_architecture": "ASCII diagram of the overall structure, flow, or component relationships for this unit (15 to 30 lines, labeled)",
  "deployment_lab": {{
    "mission": "The concrete, hands-on objective of this lab in one sentence",
    "milestones": [
      {{
        "title": "Milestone name",
        "task": "Exact task with real commands or code the learner runs",
        "verification": "How the learner confirms this milestone is done"
      }}
    ],
    "expert_context": "One paragraph on what separates a practitioner from a beginner on this topic"
  }}
}}

Include 5 to 8 deep_dive_sections."""
        return _generate_json(
            prompt=prompt,
            system_prompt="You are a senior technical educator. Create surgical-grade pedagogical content. Return only valid JSON. No markdown, no backticks.",
            temperature=0.3,
            **kwargs
        )

    @staticmethod
    def generate_json(prompt: str, **kwargs) -> str:
        """Expose the _generate_json logic to other services."""
        return _generate_json(prompt=prompt, **kwargs)

    @staticmethod
    def generate_interview_questions(topic: str, content: str = "", batch: int = 0, provider: str = "openai", model: str = None, api_key: str = None):
        """Generate 2 easy, 2 medium, 1 hard interview questions for a given topic/content.

        batch=0 → foundational set. batch>0 → progressively deeper/more advanced questions
        so repeated calls produce distinct, escalating content.
        """
        content_section = f"\n\nSource material (draw specific terminology, APIs, and patterns from here):\n{content[:12000]}" if content.strip() else ""

        batch_instruction = ""
        if batch == 1:
            batch_instruction = """
IMPORTANT — BATCH 2 (Advanced): This is the second set of questions. Go DEEPER than the first batch.
- Easy: Focus on internal mechanics, edge cases, and common misconceptions — not surface definitions.
- Medium: Target production debugging, failure modes, and architecture decisions under real constraints.
- Hard: Demand deep system design knowledge, performance reasoning at scale, and trade-off analysis.
Do NOT repeat question themes from the first batch. Explore different sub-domains of the topic."""
        elif batch == 2:
            batch_instruction = """
IMPORTANT — BATCH 3 (Expert): This is the third set. Assume the candidate has answered all prior questions correctly.
- Easy: These should feel like medium questions to a typical engineer. Ask about non-obvious interactions between components.
- Medium: Real-world war stories — latency spikes, consistency anomalies, rollback strategies, observability under load.
- Hard: Staff/principal-level questions. Think: "design X for 10M users", "how would you evolve this architecture 2 years from now", "what breaks at scale that doesn't show in testing".
Do NOT repeat question themes from earlier batches. Push into areas most engineers have never thought about."""
        elif batch >= 3:
            batch_instruction = f"""
IMPORTANT — BATCH {batch + 1} (Frontier): Assume the candidate is an expert. Go to the absolute frontier of this topic.
- Questions should challenge even principal engineers and distinguished architects.
- Easy: Known gotchas that even experienced engineers often get wrong.
- Medium: Questions about internal implementation details of tools/frameworks, not just their API.
- Hard: Open research problems, cutting-edge architectural patterns, or questions about building the tools that others use.
Be creative and specific — reference real systems (Redis, Kafka, PostgreSQL internals, Linux kernel, etc.) where applicable."""

        prompt = f"""You are a principal engineer and senior technical interviewer at a top-tier tech company. You are running a deep technical interview loop for a senior/staff engineer role on the topic: "{topic}".
{batch_instruction}
Generate exactly 5 interview questions: 2 easy, 2 medium, 1 hard.{content_section}

Difficulty standards (these are HIGH bars — this is a senior/staff loop):
- Easy: A strong mid-level engineer answers this in 60 seconds. Tests precise understanding of a specific mechanism, not just awareness.
  Bad easy question: "What is a database index?"
  Good easy question: "A query on a composite index (a, b) is filtering only on column b. Will the index be used? Why or why not?"
- Medium: Requires the engineer to reason through a problem, not recall a fact. Tests debugging instinct, trade-off awareness, and design intuition.
  Bad medium: "What are the pros and cons of microservices?"
  Good medium: "You have a service that makes 5 downstream calls in parallel. P50 latency is 30ms but P99 is 800ms. Walk me through how you'd diagnose and fix this."
- Hard: No one answer is 'correct'. Evaluates system design depth, handling of ambiguity, and the ability to reason about trade-offs at scale with incomplete information.
  Bad hard: "Design Twitter."
  Good hard: "You're designing the fanout layer for a social feed where 0.01% of users have 50M+ followers. How do you handle write amplification without blowing up storage costs or read latency? What does your data model look like and how does it change under different consistency requirements?"

Answer quality standards:
- Easy answers: 4–6 sentences. Be precise — name the exact mechanism, not a vague description. Include the "why" not just the "what".
- Medium answers: 2–3 tight paragraphs. Walk through the reasoning as a senior engineer would explain it to a peer. Include what a weak answer would miss.
- Hard answers: 3–4 paragraphs. Show multiple valid approaches, their real trade-offs, and what a GREAT answer includes that a good answer doesn't. Name real systems or tools where relevant.

Return ONLY a valid JSON object with this exact structure:
{{
  "topic": "{topic}",
  "questions": [
    {{
      "difficulty": "easy",
      "question": "Specific, precise easy question?",
      "answer": "Full model answer — precise, mechanism-level, includes the why."
    }},
    {{
      "difficulty": "easy",
      "question": "Second easy question — different sub-domain?",
      "answer": "Full model answer."
    }},
    {{
      "difficulty": "medium",
      "question": "Scenario-based medium question?",
      "answer": "Full model answer — walks through reasoning, names what a weak answer misses."
    }},
    {{
      "difficulty": "medium",
      "question": "Second medium — different failure mode or design axis?",
      "answer": "Full model answer."
    }},
    {{
      "difficulty": "hard",
      "question": "Open-ended hard question with real constraints?",
      "answer": "Full model answer — multiple approaches, trade-offs, what makes a great answer vs a good one."
    }}
  ]
}}

Non-negotiable rules:
- Every question must be specific and technical — no generic "explain X" questions unless X is a nuanced mechanism.
- Every answer must be a real model answer an expert would give — not a textbook definition.
- {f"Draw specific terminology, system names, and patterns from the source material above." if content.strip() else "Draw on real systems, tools, and production scenarios relevant to the topic."}
- Do NOT repeat question themes already covered in earlier batches if batch > 0.
- Return ONLY the JSON object — no markdown, no backticks, no preamble.
"""
        return _generate_json(
            prompt=prompt,
            provider=provider, model=model, api_key=api_key,
            system_prompt="You are a principal engineer running a senior/staff-level technical interview. Return only valid JSON. No markdown, no backticks, no commentary.",
            max_tokens=5000, temperature=0.7, task="interview",
        )
