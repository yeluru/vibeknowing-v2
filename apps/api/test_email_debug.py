import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

# Hardcoded for debug verification based on user provided info
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 465
SMTP_USERNAME = "rkyeluru@gmail.com" 
SMTP_PASSWORD = "duvh rabw ywui plpi" 

def test_send_email():
    print(f"Testing SMTP connection to {SMTP_HOST}:{SMTP_PORT}...")
    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_USERNAME
        msg['To'] = SMTP_USERNAME # Send to self
        msg['Subject'] = "VibeKnowing SMTP Debug"
        msg.attach(MIMEText("This is a test email to verify SMTP settings.", 'plain'))

        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
            print("Login...")
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            print("Sending...")
            server.send_message(msg)
            print("✅ Email sent successfully!")

    except Exception as e:
        print(f"❌ Failed to send email: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_send_email()
