import { NextRequest, NextResponse } from 'next/server'
import { imagekit, deleteImageKit } from '@/lib/imagekit'
import { db } from '@/lib/db'

// GET - Retrieve a single mistake by ID
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    console.log(`🔍 Fetching mistake with ID: ${id}`)

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
      },
    })

    if (!mistake) {
      console.log(`❌ Mistake with ID ${id} not found`)
      return NextResponse.json({ success: false, error: 'Mistake not found' }, { status: 404 })
    }

    console.log(`✅ Successfully fetched mistake: ${mistake.id}`)
    return NextResponse.json(mistake)

  } catch (error) {
    console.error('❌ Error fetching mistake:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch mistake',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

// PUT - Update an existing mistake
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    console.log(`🔄 Starting update for mistake ID: ${id}`)

    const formData = await request.formData()

    const mistakeIdentified = formData.get('mistakeIdentified') as string
    const impact = formData.get('impact') as string
    const rootCause = formData.get('rootCause') as string
    const resolution = formData.get('resolution') as string
    const learnings = formData.get('learnings') as string
    const category = formData.get('category') as string
    const mistakeDate = formData.get('mistakeDate') as string

    // --- Validations (similar to POST) ---
    if (!mistakeIdentified || !impact || !rootCause || !resolution || !learnings || !category || !mistakeDate) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    // --- File Handling ---
    const existingMistake = await db.mistakeLog.findUnique({ where: { id } })
    if (!existingMistake) {
      return NextResponse.json({ success: false, error: 'Mistake not found' }, { status: 404 })
    }

    const files = formData.getAll('attachments') as File[]
    let attachments = existingMistake.attachments ? JSON.parse(JSON.stringify(existingMistake.attachments)) : []

    if (files.length > 0) {
      console.log(`📎 Processing ${files.length} new attachments...`)
      for (const file of files) {
        if (file && file.size > 0) {
          const buffer = Buffer.from(await file.arrayBuffer())
          const uniqueFileName = `mistake_${Date.now()}_${file.name}`
          const uploadResponse = await imagekit.upload({
            file: buffer,
            fileName: uniqueFileName,
            folder: '/mistakes',
          })
          attachments.push({
            url: uploadResponse.url,
            name: file.name,
            fileId: uploadResponse.fileId,
            size: file.size,
            type: file.type,
          })
        }
      }
    }

    // --- Database Update ---
    console.log(`💾 Updating database record for ID: ${id}`)
    const updatedMistake = await db.mistakeLog.update({
      where: { id },
      data: {
        mistakeIdentified: mistakeIdentified.trim(),
        impact: impact as any,
        rootCause: rootCause.trim(),
        resolution: resolution.trim(),
        learnings: learnings.trim(),
        category: category as any,
        mistakeDate: new Date(mistakeDate),
        attachments: attachments.length > 0 ? attachments : null,
        updatedAt: new Date(),
      },
    })

    console.log(`✅ Mistake updated successfully: ${updatedMistake.id}`)
    return NextResponse.json({ success: true, data: updatedMistake }, { status: 200 })

  } catch (error) {
    console.error('❌ Error updating mistake:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update mistake log',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

// DELETE - Remove a mistake by ID
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    if (!id || id === undefined) {
        return NextResponse.json({error : "id should be defined"} , {status : 400})
    }
    console.log(`🗑️ Starting deletion for mistake ID: ${id}`)

    const mistake = await db.mistakeLog.findUnique({ where: { id } })

    if (!mistake) {
      return NextResponse.json({ success: false, error: 'Mistake not found' }, { status: 404 })
    }

    // --- Delete Attachments from ImageKit ---
    if (mistake.attachments) {
      const attachments = JSON.parse(JSON.stringify(mistake.attachments)) as any[]
      const fileIds = attachments.map(att => att.fileId).filter(Boolean)

      if (fileIds.length > 0) {
        console.log(`🔥 Deleting ${fileIds.length} attachments from ImageKit...`)
        await deleteImageKit(fileIds as any)
      }
    }

    // --- Delete from Database ---
    await db.mistakeLog.delete({ where: { id } })

    console.log(`✅ Mistake with ID ${id} deleted successfully.`)
    return NextResponse.json({ success: true, message: 'Mistake deleted successfully' }, { status: 200 })

  } catch (error) {
    console.error('❌ Error deleting mistake:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete mistake'
      },
      { status: 500 }
    )
  }
}