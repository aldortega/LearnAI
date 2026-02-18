"""Email service for sending transactional emails via Resend."""

import resend

from ..config import settings


def send_password_reset(email: str, reset_url: str) -> dict:
    """Send password reset email to user."""
    if not settings.resend_api_key:
        raise RuntimeError("RESEND_API_KEY no configurado")

    resend.api_key = settings.resend_api_key

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recuperación de contraseña</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f9fafb; border-radius: 8px; padding: 32px;">
            <h1 style="color: #111827; margin-bottom: 24px; font-size: 24px;">Recuperación de contraseña</h1>
            
            <p style="margin-bottom: 16px; color: #4b5563;">
                Recibimos una solicitud para restablecer tu contraseña. Haz clic en el siguiente botón para crear una nueva contraseña:
            </p>
            
            <div style="text-align: center; margin: 32px 0;">
                <a href="{reset_url}" 
                   style="display: inline-block; background: #111827; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
                    Restablecer contraseña
                </a>
            </div>
            
            <p style="color: #9ca3af; font-size: 14px; margin-bottom: 8px;">
                Este enlace expirará en 1 hora por seguridad.
            </p>
            
            <p style="color: #9ca3af; font-size: 14px;">
                Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña seguirá siendo la misma.
            </p>
        </div>
        
        <div style="text-align: center; margin-top: 24px; color: #9ca3af; font-size: 12px;">
            <p>© 2026 LearnAI. Todos los derechos reservados.</p>
        </div>
    </body>
    </html>
    """

    params = {
        "from": settings.from_email,
        "to": [email],
        "subject": "Recuperación de contraseña - LearnAI",
        "html": html_content,
    }

    return resend.Emails.send(params)
