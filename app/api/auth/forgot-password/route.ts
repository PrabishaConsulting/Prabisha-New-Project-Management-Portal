import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendMail } from '@/lib/mail'
import { forgotPasswordSchema } from '@/lib/validations'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = forgotPasswordSchema.parse(body)

    // Check if user exists
    const user = await db.user.findUnique({
      where: { email }
    })


    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json(
        { message: 'If an account with that email exists, we have sent a password reset link.' },
        { status: 200 }
      )
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour from now

    // Save reset token to database
    await db.user.update({
      where: { email },
      data: {
        resetToken,
        resetTokenExpiry
      }
    })

    // Create reset URL
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`

    // Send email
    const emailHtml = `
      <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <title>Reset Your Password</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 20px auto; background-color: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
        .content { padding: 30px; }
        .button {
          display: inline-block;
          background-color: #2832B1;
          color: #ffffff !important;
          text-decoration: none;
          font-weight: 600;
          padding: 12px 24px;
          border-radius: 6px;
          font-size: 16px;
        }
        .button:hover {
          background-color: #1f2890;
        }
        .footer { background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 14px; color: #6c757d; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Reset Your Password</h1>
        </div>
        <div class="content">
          <p>Hello ${user.name},</p>
          <p>We received a request to reset your password for your Project Pro account.</p>
          <p>Click the button below to reset your password:</p>
          <p style="text-align:center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </p>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>This link will expire in 1 hour for security reasons.</p>
          <p>If you didn't request this password reset, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          <p>This is an automated message from Project Pro. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
  </html>
    `;

const mailResult = await sendMail({
  to: email,
  subject: 'Reset Your Password - Project Pro',
  html: emailHtml
})



    return NextResponse.json(
      { message: 'If an account with that email exists, we have sent a password reset link.' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}