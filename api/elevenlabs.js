export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Voice selection based on persona type for more natural variety
    const voiceMap = {
      'committee': 'EXAVITQu4vr4xnSDxMaL', // Rachel - professional, authoritative
      'media': 'ErXwobaYiN019PkySvjV', // Antoni - energetic journalist style
      'consultation': 'VR6AewLTigWG4xSOukaG', // Arnold - warm, community-focused
      'interview': 'pNInz6obpgDQGcFmaJgB', // Adam - professional interviewer
      'default': 'EXAVITQu4vr4xnSDxMaL' // Rachel as fallback
    };
    
    const scenario = req.body.scenario || 'default';
    const voiceId = voiceMap[scenario] || voiceMap.default;
    
    // More human-like voice settings with variation based on interviewer style
    const voiceSettings = req.body.voice_settings || {
      stability: 0.75, // Higher for more consistent but still natural speech
      similarity_boost: 0.85, // Higher for clearer voice characteristics
      style: 0.3, // Add style for more expressive speech (if using v2 model)
      use_speaker_boost: true // Enhance voice clarity
    };
    
    // Use the more advanced model for better quality
    const modelId = req.body.model_id || 'eleven_multilingual_v2';
    
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
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
      console.error('ElevenLabs API error:', response.status, await response.text());
      return res.status(response.status).json({ error: 'ElevenLabs API error' });
    }

    const audioBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.byteLength);
    res.status(200).send(Buffer.from(audioBuffer));
  } catch (error) {
    console.error('ElevenLabs error:', error);
    res.status(500).json({ error: 'Failed to call ElevenLabs', details: error.message });
  }
}
