// SIMPLIFIED VERSION - Use this if you're having issues
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Use only Rachel voice - most reliable default voice
    const voiceId = '21m00Tcm4TlvDq8ikWAM';
    
    // Log for debugging
    console.log('ElevenLabs request:', {
      textLength: req.body.text?.length,
      hasApiKey: !!process.env.ELEVENLABS_API_KEY
    });
    
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: req.body.text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.75,
          similarity_boost: 0.75
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs error:', response.status, errorText);
      
      // Provide specific error messages
      if (response.status === 401) {
        return res.status(401).json({ 
          error: 'API Key Error',
          message: 'Invalid or missing ELEVENLABS_API_KEY. Please check your Vercel environment variables.'
        });
      } else if (response.status === 422) {
        return res.status(422).json({ 
          error: 'Invalid Request',
          message: 'The voice ID or request format is invalid.'
        });
      } else if (response.status === 429) {
        return res.status(429).json({ 
          error: 'Rate Limited',
          message: 'You have exceeded your ElevenLabs character limit. The app will use browser voice.'
        });
      }
      
      return res.status(response.status).json({ 
        error: 'ElevenLabs API Error',
        message: errorText
      });
    }

    const audioBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(audioBuffer));
    
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: 'Server Error',
      message: error.message 
    });
  }
}
