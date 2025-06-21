export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // These are the default voice IDs that should work with all ElevenLabs accounts
    const voiceMap = {
      'committee': '21m00Tcm4TlvDq8ikWAM', // Rachel - Clear, professional voice
      'media': 'AZnzlk1XvdvUeBnXmlld', // Domi - Engaging, dynamic voice
      'consultation': 'MF3mGyEYCl7XYWbV9V6O', // Elli - Warm, approachable voice
      'interview': 'VR6AewLTigWG4xSOukaG', // Arnold - Professional, clear voice
      'default': '21m00Tcm4TlvDq8ikWAM' // Rachel as fallback
    };
    
    const scenario = req.body.scenario || 'default';
    const voiceId = voiceMap[scenario] || voiceMap.default;
    
    console.log('Using voice ID:', voiceId, 'for scenario:', scenario);
    
    // Simplified voice settings for better compatibility
    const voiceSettings = {
      stability: 0.7,
      similarity_boost: 0.7
    };
    
    // Use the standard model for better compatibility
    const modelId = 'eleven_monolingual_v1';
    
    const apiUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    console.log('Calling ElevenLabs API:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: req.body.text,
        model_id: modelId,
        voice_settings: voiceSettings
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      
      // Check if it's an API key issue
      if (response.status === 401) {
        return res.status(401).json({ error: 'Invalid API key. Please check your ElevenLabs API key.' });
      }
      
      // Return a more helpful error message
      return res.status(response.status).json({ 
        error: 'ElevenLabs API error', 
        details: errorText,
        voiceId: voiceId 
      });
    }

    const audioBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.byteLength);
    res.status(200).send(Buffer.from(audioBuffer));
  } catch (error) {
    console.error('ElevenLabs handler error:', error);
    res.status(500).json({ 
      error: 'Failed to call ElevenLabs', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
