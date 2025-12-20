from sqlalchemy import create_engine, desc
from sqlalchemy.orm import sessionmaker
from models import OTP
from config import settings

# Setup DB connection
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

# Fetch latest OTP
latest_otp = db.query(OTP).order_by(desc(OTP.created_at)).first()

if latest_otp:
    print(f"\n✅ LATEST OTP found in DB:")
    print(f"Email: {latest_otp.email}")
    print(f"Code:  {latest_otp.code}")
    print(f"Time:  {latest_otp.created_at}\n")
else:
    print("\n❌ No OTPs found in the database.\n")
