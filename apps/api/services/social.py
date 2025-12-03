from openai import OpenAI
from config import settings

client = OpenAI(api_key=settings.OPENAI_API_KEY)

class SocialMediaService:
    @staticmethod
    def generate_linkedin_post(content: str, style: str = "thought_leader"):
        prompts = {
            "thought_leader": "Create a LinkedIn post in a thought leadership style. Start with a hook, share insights, and end with a question to engage the audience.",
            "technical": "Create a technical LinkedIn post explaining key concepts. Use clear structure with bullet points.",
            "storytelling": "Create a LinkedIn post using storytelling. Share a narrative that connects to the main ideas."
        }
        
        prompt = prompts.get(style, prompts["thought_leader"])
        
        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a LinkedIn content expert."},
                    {"role": "user", "content": f"{prompt}\n\nSource content:\n{content[:10000]}"}
                ]
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Social Media Error: {e}")
            return "Failed to generate post."

    @staticmethod
    def generate_instagram_caption(content: str, style: str = "viral"):
        prompts = {
            "viral": "Create an engaging Instagram caption with emojis. Make it shareable and include relevant hashtags.",
            "carousel": "Create a carousel post script with 5 slides. Each slide should have a title and brief text."
        }
        
        prompt = prompts.get(style, prompts["viral"])
        
        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are an Instagram content creator."},
                    {"role": "user", "content": f"{prompt}\n\nSource content:\n{content[:8000]}"}
                ]
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Social Media Error: {e}")
            return "Failed to generate caption."

    @staticmethod
    def generate_diagram(content: str, diagram_type: str = "flowchart"):
        prompt = f"Generate a Mermaid.js {diagram_type} diagram based on this content. Return ONLY the mermaid code, no explanation."
        
        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a diagram expert. Generate only valid Mermaid.js syntax."},
                    {"role": "user", "content": f"{prompt}\n\nContent:\n{content[:8000]}"}
                ]
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Diagram Error: {e}")
            return "graph TD\n  A[Error generating diagram]"
