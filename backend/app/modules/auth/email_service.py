import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from anyio.to_thread import run_sync

from app.core.config import settings


def _send_otp_email_sync(to_email: str, otp_code: str, name: str) -> bool:
    """Send OTP email via Gmail"""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Paisatrack - Email Verification Code"
        msg["From"] = settings.GMAIL_USER
        msg["To"] = to_email

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #333; }}
                .container {{ max-width: 400px; padding: 20px; }}
                .code {{ font-size: 24px; font-weight: bold; margin: 24px 0; letter-spacing: 4px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <p>Hello {name},</p>
                <p>Your verification code for Paisatrack is:</p>
                <div class="code">{otp_code}</div>
                <p>This code expires in 10 minutes.</p>
                <p>If you didn't request this, please ignore this email.</p>
            </div>
        </body>
        </html>
        """

        html_part = MIMEText(html_content, "html")
        msg.attach(html_part)

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(settings.GMAIL_USER, settings.GMAIL_APP_PASSWORD)
            server.send_message(msg)

        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False


async def send_otp_email(to_email: str, otp_code: str, name: str) -> bool:
    return await run_sync(_send_otp_email_sync, to_email, otp_code, name)


def _send_budget_alert_sync(to_email: str, name: str, percentage: int) -> bool:
    """Send budget threshold alert via Gmail"""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Paisatrack - Budget Alert"
        msg["From"] = settings.GMAIL_USER
        msg["To"] = to_email

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #333; }}
                .container {{ max-width: 400px; padding: 20px; }}
                .alert {{ background-color: #fff3cd; border: 1px solid #ffc107; padding: 16px; border-radius: 8px; margin: 16px 0; }}
                .percentage {{ font-size: 32px; font-weight: bold; color: #ff6b6b; margin: 16px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <p>Hello {name},</p>
                <div class="alert">
                    <p>You have used <span class="percentage">{percentage}%</span> of your monthly budget.</p>
                </div>
                <p>Consider reviewing your expenses to stay within your budget for this month.</p>
                <p>Log in to Paisatrack to see your detailed spending breakdown.</p>
            </div>
        </body>
        </html>
        """

        html_part = MIMEText(html_content, "html")
        msg.attach(html_part)

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(settings.GMAIL_USER, settings.GMAIL_APP_PASSWORD)
            server.send_message(msg)

        return True
    except Exception as e:
        print(f"Failed to send budget alert email: {e}")
        return False


async def send_budget_alert(to_email: str, name: str, percentage: int) -> bool:
    """Send budget threshold alert"""
    return await run_sync(_send_budget_alert_sync, to_email, name, percentage)


def _send_password_reset_email_sync(to_email: str, otp_code: str, name: str) -> bool:
    """Send Password Reset OTP email via Gmail"""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Paisatrack - Password Reset Code"
        msg["From"] = settings.GMAIL_USER
        msg["To"] = to_email

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #333; }}
                .container {{ max-width: 400px; padding: 20px; }}
                .code {{ font-size: 24px; font-weight: bold; margin: 24px 0; letter-spacing: 4px; color: #2563eb; }}
            </style>
        </head>
        <body>
            <div class="container">
                <p>Hello {name},</p>
                <p>We received a request to reset your password. Here is your verification code:</p>
                <div class="code">{otp_code}</div>
                <p>This code expires in 10 minutes.</p>
                <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
            </div>
        </body>
        </html>
        """

        html_part = MIMEText(html_content, "html")
        msg.attach(html_part)

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(settings.GMAIL_USER, settings.GMAIL_APP_PASSWORD)
            server.send_message(msg)

        return True
    except Exception as e:
        print(f"Failed to send password reset email: {e}")
        return False


async def send_password_reset_email(to_email: str, otp_code: str, name: str) -> bool:
    return await run_sync(_send_password_reset_email_sync, to_email, otp_code, name)
