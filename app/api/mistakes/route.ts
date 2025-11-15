import { NextRequest, NextResponse } from 'next/server'
import { imagekit, deleteImageKit } from '@/lib/imagekit'
import { db } from '@/lib/db'

// POST - Create new mistake
export async function POST(request: NextRequest) {
  try {
    console.log('📝 Starting mistake creation...')
    
    const formData = await request.formData()
    
    // Extract form fields
    const mistakeIdentified = formData.get('mistakeIdentified') as string
    const impact = formData.get('impact') as string
    const rootCause = formData.get('rootCause') as string
    const resolution = formData.get('resolution') as string
    const learnings = formData.get('learnings') as string
    const category = formData.get('category') as string
    const mistakeDate = formData.get('mistakeDate') as string
    const authorId = formData.get('authorId') as string

    console.log('📋 Form data received:', {
      mistakeIdentified: mistakeIdentified?.substring(0, 50) + '...',
      impact,
      category,
      mistakeDate,
      authorId
    })

    // Validate required fields
    if (!mistakeIdentified || !impact || !rootCause || !resolution || !learnings || !category || !mistakeDate || !authorId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields',
          details: 'Please fill in all required fields'
        },
        { status: 400 }
      )
    }

    // Validate enum values
    const validImpacts = ['LOW', 'MEDIUM', 'HIGH']
    const validCategories = ['PROCESS', 'TECHNICAL', 'HUMAN_ERROR']
    
    if (!validImpacts.includes(impact)) {
      return NextResponse.json(
        { success: false, error: 'Invalid impact level' },
        { status: 400 }
      )
    }
    
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { success: false, error: 'Invalid category' },
        { status: 400 }
      )
    }

    // Handle file uploads to ImageKit
    const files = formData.getAll('attachments') as File[]
    const attachments = []
    
    console.log(`📎 Processing ${files.length} attachments...`)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file && file.size > 0) {
        try {
          console.log(`📤 Uploading file ${i + 1}: ${file.name} (${file.size} bytes)`)
          
          const bytes = await file.arrayBuffer()
          const buffer = Buffer.from(bytes)
          
          // Create unique filename
          const timestamp = Date.now()
          const randomString = Math.random().toString(36).substring(2, 8)
          const fileExtension = file.name.split('.').pop()
          const uniqueFileName = `mistake_${timestamp}_${randomString}.${fileExtension}`
          
          const uploadResponse = await imagekit.upload({
            file: buffer,
            fileName: uniqueFileName,
            folder: '/mistakes',
            useUniqueFileName: false,
          })
          
          console.log(`✅ File uploaded successfully: ${uploadResponse.fileId}`)
          
          attachments.push({
            url: uploadResponse.url,
            name: file.name,
            originalName: file.name,
            fileName: uniqueFileName,
            type: file.type,
            size: file.size,
            fileId: uploadResponse.fileId,
            thumbnailUrl: uploadResponse.thumbnailUrl || null
          })
        } catch (uploadError) {
          console.error(`❌ ImageKit upload error for file ${file.name}:`, uploadError)
          // Continue with other files even if one fails
          attachments.push({
            url: null,
            name: file.name,
            type: file.type,
            size: file.size,
            error: 'Upload failed'
          })
        }
      }
    }

    console.log(`💾 Creating database record...`)

    // Create mistake record in database
    const mistake = await db.mistakeLog.create({
      data: {
        mistakeIdentified: mistakeIdentified.trim(),
        impact: impact as any,
        rootCause: rootCause.trim(),
        resolution: resolution.trim(),
        learnings: learnings.trim(),
        category: category as any,
        mistakeDate: new Date(mistakeDate),
        authorId,
        attachments: attachments.length > 0 ? attachments : undefined ,
        status: 'PENDING' // Default status
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    console.log(`✅ Mistake created successfully with ID: ${mistake.id}`)

    return NextResponse.json({ 
      success: true, 
      data: mistake,
      message: 'Mistake logged successfully',
      attachmentsUploaded: attachments.filter(a => a.url).length,
      attachmentsFailed: attachments.filter(a => !a.url).length
    }, { status: 201 })

  } catch (error) {
    console.error('❌ Error creating mistake:', error)
    
    // Handle db errors specifically
    if (error instanceof Error) {
      if (error.message.includes('User')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid user ID',
            details: 'The provided user ID does not exist'
          },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create mistake log',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

// GET - List all mistakes with pagination and filters
export async function GET(request: NextRequest) {
  try {
    console.log('📋 Fetching mistakes list...')
    
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '10'))) // Limit between 1-50
    const category = searchParams.get('category')
    const impact = searchParams.get('impact')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    console.log('🔍 Query params:', { page, limit, category, impact, status, search })

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    
    if (category && ['PROCESS', 'TECHNICAL', 'HUMAN_ERROR'].includes(category)) {
      where.category = category
    }
    
    if (impact && ['LOW', 'MEDIUM', 'HIGH'].includes(impact)) {
      where.impact = impact
    }
    
    if (status && ['PENDING', 'REVIEWED', 'ARCHIVED'].includes(status)) {
      where.status = status
    }

    // Add search functionality
    if (search && search.trim().length > 0) {
      where.OR = [
        {
          mistakeIdentified: {
            contains: search.trim(),
            mode: 'insensitive'
          }
        },
        {
          rootCause: {
            contains: search.trim(),
            mode: 'insensitive'
          }
        },
        {
          resolution: {
            contains: search.trim(),
            mode: 'insensitive'
          }
        },
        {
          learnings: {
            contains: search.trim(),
            mode: 'insensitive'
          }
        }
      ]
    }

    // Fetch mistakes and total count
    const [mistakes, total] = await Promise.all([
      db.mistakeLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      }),
      db.mistakeLog.count({ where })
    ])

    const totalPages = Math.ceil(total / limit)

    console.log(`✅ Found ${mistakes.length} mistakes (${total} total, page ${page}/${totalPages})`)

    // Get summary statistics
    const [impactStats, categoryStats, statusStats] = await Promise.all([
      db.mistakeLog.groupBy({
        by: ['impact'],
        _count: { impact: true },
        where: Object.keys(where).length > 0 ? where : undefined
      }),
      db.mistakeLog.groupBy({
        by: ['category'],
        _count: { category: true },
        where: Object.keys(where).length > 0 ? where : undefined
      }),
      db.mistakeLog.groupBy({
        by: ['status'],
        _count: { status: true },
        where: Object.keys(where).length > 0 ? where : undefined
      })
    ])

    return NextResponse.json({
      success: true,
      data: mistakes,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      filters: {
        category,
        impact,
        status,
        search
      },
      statistics: {
        impact: impactStats.reduce((acc, stat) => {
          acc[stat.impact] = stat._count.impact
          return acc
        }, {} as Record<string, number>),
        category: categoryStats.reduce((acc, stat) => {
          acc[stat.category] = stat._count.category
          return acc
        }, {} as Record<string, number>),
        status: statusStats.reduce((acc, stat) => {
          acc[stat.status] = stat._count.status
          return acc
        }, {} as Record<string, number>)
      }
    })

  } catch (error) {
    console.error('❌ Error fetching mistakes:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch mistakes',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}