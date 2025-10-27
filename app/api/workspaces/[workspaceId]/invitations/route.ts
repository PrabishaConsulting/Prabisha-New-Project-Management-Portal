import { NextRequest, NextResponse } from 'next/server';
import { WorkspaceRole, Role } from '@/app/generated/client';
import { getServerSession } from 'next-auth';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendMail } from '@/lib/mail';
import { db } from '@/lib/db';
import { authOptions } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const currentUserId = session.user.id;
    const { workspaceId } = await params;
    const { email } = await request.json();

    if (!email) {
      return new NextResponse(JSON.stringify({ error: 'Email is required' }), { status: 400 });
    }

    const existingMember = await db.workspaceMember.findFirst({
      where: { workspaceId, user: { email } },
    });

    if (existingMember) {
      return new NextResponse(JSON.stringify({ error: 'This user is already a member.' }), { status: 409 });
    }
    
    const workspace = await db.workspace.findUnique({ where: { id: workspaceId }});
    if (!workspace) {
      return new NextResponse(JSON.stringify({ error: 'Workspace not found.' }), { status: 404 });
    }

    let userToInvite = await db.user.findUnique({ where: { email } });
    
    // This variable will hold the password ONLY for new users.
    let temporaryPasswordForEmail: string | null = null;

    if (!userToInvite) {
      // Generate the plaintext password and store it for the email
      temporaryPasswordForEmail = crypto.randomBytes(12).toString('hex');
      const hashedPassword = await bcrypt.hash(temporaryPasswordForEmail, 12);

      userToInvite = await db.user.create({
        data: {
          email,
          name: email.split('@')[0],
          password: hashedPassword, // Store the HASHED password
          role: Role.MEMBER,
        },
      });
    }

    const invitationToken = crypto.randomBytes(32).toString('hex');
    const authToken = jwt.sign({ userId: userToInvite.id }, process.env.NEXTAUTH_SECRET!, {
      expiresIn: '24h',
    });
    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invitation?token=${invitationToken}&auth_token=${authToken}`;
    
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db.workspaceInvitation.upsert({
        where: { workspaceId_email: { workspaceId, email } },
        update: { token: invitationToken, expiresAt },
        create: {
            workspaceId,
            email,
            token: invitationToken,
            expiresAt,
            invitedById: currentUserId,
            role: WorkspaceRole.MEMBER,
        },
    });

    // --- UPDATED EMAIL LOGIC ---
    await sendMail({
        to: email,
        subject: `You're invited to join ${workspace.name} on Project Pro`,
        html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2>You've been invited to join ${workspace.name}</h2>
            <p>Click the button below to accept the invitation and sign in. This link is valid for 24 hours.</p>
            <p style="margin: 20px 0;">
            <a href="${invitationLink}" 
                style="display: inline-block; padding: 12px 24px; background-color: #0d6efd; color: white; text-decoration: none; border-radius: 6px;">
                Accept Invitation & Sign In
            </a>
            </p>

            ${
              temporaryPasswordForEmail
                ? `<div style="margin-top: 20px; padding: 12px; background-color: #f9f9f9; border: 1px solid #ccc; border-radius: 4px;">
                    <p>An account has been created for you. Here are your login details:</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Temporary Password:</strong> ${temporaryPasswordForEmail}</p>
                    <p style="font-size: 0.9em; color: #555;">We recommend changing your password after your first login.</p>
                  </div>`
                : `<div style="margin-top: 20px; padding: 12px; background-color: #f0f8ff; border: 1px solid #b3d7ff; border-radius: 4px;">
                    <p>You have been added to a new workspace. Please log in using your existing password.</p>
                    <p><strong>Email:</strong> ${email}</p>
                  </div>`
            }
        </div>
        `,
    });

    return NextResponse.json({ message: 'Invitation sent successfully' });
  } catch (error) {
    console.error('[INVITATIONS_POST]', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}