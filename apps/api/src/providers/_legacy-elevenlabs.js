export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // British voices available in ElevenLabs
    const voiceMap = {
      // For committee/political scenarios - use a British voice
      'committee': 'XB0fDUnXU5powFXDhCwa', // Charlotte - British female, professional
      'media': 'N2lVS1w4EtoT3dr4eOWO', // Lily - British female, clear broadcast style
      'consultation': 'ThT5KcBeYPX3keUQqHPh', // Dorothy - British female, warm
      'interview': 'nPczCjzI2devNBz1zQrb', // Brian - British male, professional
      'default': 'XB0fDUnXU5powFXDhCwa' // Charlotte as fallback
    };
    
    // Alternative: If you prefer all British male voices for more authority
    const britishMaleVoices = {
      'committee': 'nPczCjzI2devNBz1zQrb', // Brian - authoritative
      'media': 'Yko7PKHZNXotIFUBG7I9', // Clyde - broadcaster style
      'consultation': 'N2lVS1w4EtoT3dr4eOWO', // Keep Lily for warmer consultation
      'interview': 'nPczCjzI2devNBz1zQrb', // Brian for interviews
    };
    
    // Use this line to switch between voice sets
    const selectedVoiceMap = voiceMap; // or britishMaleVoices
    
    const scenario = req.body.scenario || 'default';
    const voiceId = selectedVoiceMap[scenario] || selectedVoiceMap.default || '21m00Tcm4TlvDq8ikWAM';
    
    console.log('Using voice ID:', voiceId, 'for scenario:', scenario);
    
    // Voice settings optimized for British accents
    const voiceSettings = {
      stability: 0.65, // Natural variation
      similarity_boost: 0.75 // Clear but not robotic
    };
    
    const modelId = 'eleven_monolingual_v1';
    
    const apiUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    
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
      
      // Fall back to Rachel if voice not available
      if (response.status === 400 && errorText.includes('voice_not_found')) {
        console.log('Voice not found, falling back to Rachel');
        
        const fallbackResponse = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
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
        
        if (fallbackResponse.ok) {
          const audioBuffer = await fallbackResponse.arrayBuffer();
          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('Content-Length', audioBuffer.byteLength);
          return res.status(200).send(Buffer.from(audioBuffer));
        }
      }
      
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
      details: error.message
    });
  }
}
