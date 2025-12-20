import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import settings

class EmailService:
    @staticmethod
    def send_otp(to_email: str, code: str):
        if not settings.SMTP_PASSWORD:
            print(f"⚠️ SMTP not configured. OTP for {to_email}: {code}")
            return

        subject = "Your VibeKnowing Login Code"
        html_content = f"""
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

        msg = MIMEMultipart()
        msg['From'] = f"VibeKnowing <{settings.SMTP_USERNAME}>"
        msg['To'] = to_email
        msg['Subject'] = subject

        msg.attach(MIMEText(html_content, 'html'))

        try:
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.send_message(msg)
            print(f"✅ OTP email sent to {to_email}")
        except Exception as e:
            print(f"❌ Failed to send email: {e}")
            # Fallback to console for debugging
            print(f"OTP for {to_email}: {code}")
