import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import settings

import httpx

class EmailService:
    @staticmethod
    def send_otp(to_email: str, code: str):
        # Debug: Always print OTP to logs first (in case email fails/hangs)
        print(f"🔒 [DEBUG] OTP for {to_email}: {code}")

        if settings.EMAIL_PROVIDER == "resend":
            EmailService.send_via_resend(to_email, code)
        else:
            EmailService.send_via_smtp(to_email, code)

    @staticmethod
    def send_via_resend(to_email: str, code: str):
        if not settings.RESEND_API_KEY:
            print("❌ Resend API Key missing")
            return

        html_content = EmailService.get_html_content(code)
        
        try:
            response = httpx.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
                json={
                    "from": "VibeKnowing <onboarding@resend.dev>", # Use Resend's default test domain if user hasn't verified theirs
                    "to": [to_email],
                    "subject": "Your VibeKnowing Login Code",
                    "html": html_content
                },
                timeout=10.0
            )
            if response.status_code >= 200 and response.status_code < 300:
                print(f"✅ OTP sent via Resend to {to_email}")
            else:
                print(f"❌ Resend API Error: {response.text}")
        except Exception as e:
            print(f"❌ Failed to send via Resend: {e}")

    @staticmethod
    def send_via_smtp(to_email: str, code: str):
        if not settings.SMTP_PASSWORD:
            print(f"⚠️ SMTP not configured.")
            return

        msg = MIMEMultipart()
        msg['From'] = f"VibeKnowing <{settings.SMTP_USERNAME}>"
        msg['To'] = to_email
        msg['Subject'] = "Your VibeKnowing Login Code"
        msg.attach(MIMEText(EmailService.get_html_content(code), 'html'))

        try:
            if settings.SMTP_PORT == 465:
                # SSL connection
                with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                    server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                    server.send_message(msg)
            else:
                # TLS connection (587 or other)
                with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                    server.starttls()
                    server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                    server.send_message(msg)
            
            print(f"✅ OTP email sent via SMTP to {to_email}")
        except Exception as e:
            print(f"❌ Failed to send via SMTP: {e}")

    @staticmethod
    def get_html_content(code: str) -> str:
        return f"""
        <html>
            <body style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <div style="max-width: 500px; margin: 0 auto; background: #f9f9f9; padding: 30px; border-radius: 10px;">
                    <h2 style="color: #4f46e5; text-align: center;">VibeKnowing</h2>
                    <p>Hello,</p>
                    <p>Your verification code is:</p>
                    <div style="font-size: 32px; font-weight: bold; text-align: center; letter-spacing: 5px; margin: 20px 0; color: #111;">
                        {code}
                    </div>
                    <p>This code will expire in 10 minutes.</p>
                    <p style="text-align: center; color: #888; font-size: 12px; margin-top: 30px;">
                        If you didn't request this, you can ignore this email.
                    </p>
                </div>
            </body>
        </html>
        """
