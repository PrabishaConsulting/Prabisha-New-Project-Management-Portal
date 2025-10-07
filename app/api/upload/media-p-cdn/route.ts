import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ success: false, message: 'No file uploaded' }, { status: 400 });
    }

    // Create a new FormData to send to the CDN
    const cdnFormData = new FormData();
    cdnFormData.append('file', file);
    
    // Forward the request to the CDN
    const response = await axios.post('https://media-cdn.prabisha.com/upload', cdnFormData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'x-upload-folder': 'products', // You can customize this folder name
      },
    });

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error during upload',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}