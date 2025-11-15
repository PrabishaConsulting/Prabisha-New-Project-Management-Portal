import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer'
import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'

async function getMistake(id: string) {
  const mistake = await db.mistakeLog.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      reviewer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  if (!mistake) {
    return null
  }

  return {
    ...mistake,
    attachments: Array.isArray(mistake.attachments) ? (mistake.attachments as any[]) : [],
  }
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(date)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const {id} = await params

    if (!id || id === undefined) return NextResponse.json({error : "Id is not undefined"} , {status : 400})
    const mistake = await getMistake(id)

    if (!mistake) {
      return NextResponse.json({ error: 'Mistake not found' }, { status: 404 })
    }

    // Get base URL for assets
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

    // Generate HTML content for PDF
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mistake Report - ${mistake.mistakeIdentified}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap');

        body {
            font-family: 'Montserrat', sans-serif;
            margin: 0;
            padding: 40px;
            background: white;
            color: #1f2937;
            line-height: 1.6;
        }

        .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 30px;
        }

        .logo {
            width: 160px;
            height: auto;
            margin-bottom: 10px;
        }

        .title {
            font-size: 28px;
            font-weight: 700;
            color: #1f2937;
            margin: 10px 0;
        }

        .subtitle {
            font-size: 16px;
            color: #6b7280;
            margin: 5px 0;
        }

        .badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            margin: 5px;
        }

        .badge-impact-low { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
        .badge-impact-medium { background: #fffbeb; color: #92400e; border: 1px solid #fcd34d; }
        .badge-impact-high { background: #fef2f2; color: #991b1b; border: 1px solid #fca5a5; }
        .badge-status-pending { background: #f9fafb; color: #374151; border: 1px dashed #d1d5db; }
        .badge-status-reviewed { background: #eff6ff; color: #1e40af; border: 1px solid #93c5fd; }
        .badge-status-archived { background: #f9fafb; color: #374151; border: 1px solid #d1d5db; }
        .badge-category { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
        .badge-author { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }

        .section {
            margin-bottom: 30px;
        }

        .section-title {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 1px solid #e5e7eb;
        }

        .section-content {
            font-size: 14px;
            color: #374151;
            line-height: 1.7;
            white-space: pre-wrap;
        }

        .timeline {
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }

        .timeline-item {
            display: flex;
            margin-bottom: 15px;
            align-items: flex-start;
        }

        .timeline-icon {
            width: 20px;
            height: 20px;
            margin-right: 15px;
            margin-top: 2px;
            color: #6b7280;
        }

        .timeline-content h4 {
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            color: #6b7280;
            margin: 0 0 5px 0;
        }

        .timeline-content p {
            font-size: 14px;
            color: #1f2937;
            margin: 0;
        }

        .attachments {
            margin-top: 20px;
        }

        .attachment-item {
            display: flex;
            align-items: center;
            padding: 12px;
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            margin-bottom: 10px;
        }

        .attachment-icon {
            width: 16px;
            height: 16px;
            margin-right: 10px;
            color: #6b7280;
        }

        .attachment-info h4 {
            font-size: 14px;
            font-weight: 600;
            color: #1f2937;
            margin: 0;
        }

        .attachment-info p {
            font-size: 12px;
            color: #6b7280;
            margin: 0;
        }

        .url-button {
            display: inline-block;
            padding: 12px 24px;
            background: #2832B0;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin-top: 20px;
        }

        .url-button:hover {
            background: #2563eb;
        }

        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            font-size: 12px;
            color: #6b7280;
        }

        .images {
            margin-top: 20px;
        }

        .image-item {
            margin-bottom: 15px;
        }

        .image-item img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        @media print {
            body { margin: 20px; }
        }
    </style>
</head>
<body>
    <div class="header">
        <img src="${baseUrl}/icons/logo.png" alt="Prabisha Logo" class="logo" />
        <h1 class="title">${mistake.mistakeIdentified}</h1>
        <div>
            <span class="badge badge-impact-${mistake.impact.toLowerCase()}">${mistake.impact}</span>
            <span class="badge badge-status-${mistake.status.toLowerCase()}">${mistake.status}</span>
            <span class="badge badge-category">${mistake.category.replace('_', ' ')}</span>
            <span class="badge badge-author">Submitted by ${mistake.author?.name || mistake.author?.email || 'Unassigned'}</span>
        </div>
    </div>

    <div class="section">
        <h2 class="section-title">What Happened (Root Cause)</h2>
        <div class="section-content">${mistake.rootCause}</div>
    </div>

    <div class="section">
        <h2 class="section-title">How It Was Resolved</h2>
        <div class="section-content">${mistake.resolution}</div>
    </div>

    <div class="section">
        <h2 class="section-title">Key Learnings</h2>
        <div class="section-content">${mistake.learnings}</div>
    </div>

    <div class="timeline">
        <h2 class="section-title">Timeline</h2>
        <div class="timeline-item">
            <div class="timeline-icon">📅</div>
            <div class="timeline-content">
                <h4>Mistake Date</h4>
                <p>${formatDate(mistake.mistakeDate)}</p>
            </div>
        </div>
        <div class="timeline-item">
            <div class="timeline-icon">🔄</div>
            <div class="timeline-content">
                <h4>Status Last Updated</h4>
                <p>${formatDateTime(mistake.updatedAt)}</p>
            </div>
        </div>
        ${mistake.reviewer ? `
        <div class="timeline-item">
            <div class="timeline-icon">✅</div>
            <div class="timeline-content">
                <h4>Reviewed By</h4>
                <p>${mistake.reviewer.name || mistake.reviewer.email}</p>
                ${mistake.reviewNotes ? `<p><strong>Review Notes:</strong> ${mistake.reviewNotes}</p>` : ''}
            </div>
        </div>
        ` : ''}
    </div>

    <div class="section images">
        <h2 class="section-title">Images</h2>
        ${mistake.attachments && mistake.attachments.filter(att => att.type?.startsWith('image/')).length > 0 ?
            mistake.attachments.filter(att => att.type?.startsWith('image/')).map(attachment => `
            <div class="image-item">
                <img src="${attachment.url}" alt="${attachment.name || 'Attachment'}" />
            </div>
            `).join('') : '<p>No images attached.</p>'}
    </div>

    <div style="text-align: center;">
        <a href="${baseUrl}/mistakes/${mistake.id}" class="url-button" target="_blank" rel="noopener">
            View Full Mistake Details
        </a>
    </div>

    <div class="footer">
        <p>Generated on ${formatDateTime(new Date())} | Prabisha AI Dashboard</p>
    </div>
</body>
</html>
    `

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    const page = await browser.newPage()

    // Set content
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' })

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    })

    await browser.close()

    // Return PDF
    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="mistake-${mistake.id}.pdf"`
      }
    })

  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}