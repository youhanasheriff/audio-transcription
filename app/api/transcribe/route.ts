import { type NextRequest, NextResponse } from 'next/server';

const SUPPORTED_AUDIO_TYPES = [
  'flac',
  'mp3',
  'mp4',
  'mpeg',
  'mpga',
  'm4a',
  'ogg',
  'opus',
  'wav',
  'webm',
];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB limit

function validateAudioFile(file: File): { isValid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size too large. Maximum allowed size is ${
        MAX_FILE_SIZE / (1024 * 1024)
      }MB`,
    };
  }

  // Check file extension
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  const mimeType = file.type.toLowerCase();

  const isValidExtension =
    fileExtension && SUPPORTED_AUDIO_TYPES.includes(fileExtension);
  const isValidMimeType =
    mimeType.startsWith('audio/') || mimeType.startsWith('video/');

  if (!isValidExtension && !isValidMimeType) {
    return {
      isValid: false,
      error: `Unsupported file format. File must be one of: ${SUPPORTED_AUDIO_TYPES.join(
        ', '
      )}`,
    };
  }

  return { isValid: true };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Validate the audio file
    const validation = validateAudioFile(audioFile);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    console.log(
      `Processing file: ${audioFile.name}, size: ${audioFile.size} bytes, type: ${audioFile.type}`
    );

    // Use direct Groq API call with FormData
    const formDataForGroq = new FormData();
    formDataForGroq.append('model', 'distil-whisper-large-v3-en');
    formDataForGroq.append('file', audioFile);
    formDataForGroq.append('response_format', 'verbose_json');

    const response = await fetch(
      'https://api.groq.com/openai/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: formDataForGroq,
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${errorData}`);
    }

    const result = await response.json();

    return NextResponse.json({
      text: result.text,
      language: result.language,
      duration: result.duration,
    });
  } catch (error) {
    console.error('Transcription error:', error);

    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('file must be one of the following types')) {
        return NextResponse.json(
          {
            error:
              'File format validation failed. The audio file may be corrupted or in an unsupported encoding.',
            details: error.message,
          },
          { status: 400 }
        );
      }

      if (
        error.message.includes('rate limit') ||
        error.message.includes('quota')
      ) {
        return NextResponse.json(
          { error: 'Service temporarily unavailable. Please try again later.' },
          { status: 429 }
        );
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}
