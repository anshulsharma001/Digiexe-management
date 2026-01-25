import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, token, invitedByName, role } = body;

    if (!email || !token) {
      return NextResponse.json(
        { error: "Email and token are required" },
        { status: 400 }
      );
    }

    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const appName = process.env.APP_NAME || "Tool Management";
    const inviteUrl = `${appUrl}/register?token=${token}`;

    // If Resend is configured, send the email
    if (resend) {
      await resend.emails.send({
        from: process.env.EMAIL_FROM || "noreply@example.com",
        to: email,
        subject: `You've been invited to join ${appName}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Invitation to ${appName}</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">${appName}</h1>
              </div>

              <div style="background: #ffffff; padding: 30px; border: 1px solid #e1e1e1; border-top: none; border-radius: 0 0 10px 10px;">
                <h2 style="color: #333; margin-top: 0;">You're Invited!</h2>

                <p>Hi there,</p>

                <p><strong>${invitedByName}</strong> has invited you to join ${appName} as a <strong>${role}</strong>.</p>

                <p>Click the button below to create your account and get started:</p>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${inviteUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Accept Invitation</a>
                </div>

                <p style="color: #666; font-size: 14px;">This invitation link will expire in 48 hours.</p>

                <p style="color: #666; font-size: 14px;">If you didn't expect this invitation, you can safely ignore this email.</p>

                <hr style="border: none; border-top: 1px solid #e1e1e1; margin: 30px 0;">

                <p style="color: #999; font-size: 12px; text-align: center;">
                  If the button doesn't work, copy and paste this link into your browser:<br>
                  <a href="${inviteUrl}" style="color: #667eea; word-break: break-all;">${inviteUrl}</a>
                </p>
              </div>

              <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
                <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
              </div>
            </body>
          </html>
        `,
      });

      return NextResponse.json({ success: true, message: "Email sent" });
    }

    // If Resend is not configured, just log and return success
    console.log("Email service not configured. Invitation URL:", inviteUrl);

    return NextResponse.json({
      success: true,
      message: "Invitation created (email service not configured)",
      inviteUrl,
    });
  } catch (error: any) {
    console.error("Error sending invitation email:", error);
    return NextResponse.json(
      { error: "Failed to send invitation email" },
      { status: 500 }
    );
  }
}
