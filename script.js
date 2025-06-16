// Global state variables
let currentPage = 1;
let selectedScenario = '';
let selectedPersona = '';
let scenarioDescription = '';
let userRole = '';
let companyContext = '';
let policyFiles = [];
let briefingFiles = [];
let traitValues = {};
let openaiApiKey = '';
let elevenlabsApiKey = '';

// NEW: Conversation memory
let conversationHistory = [];
let isRecording = false;

// Voice recognition variables
let recognition = null;
let speechSynthesis = window.speechSynthesis;

// Trait definitions for different scenarios
const traitDefinitions = {
    committee: {
        aggressiveness: {
            name: 'Aggressiveness',
            description: 'How confrontational and pushy the questioning becomes',
            low: 'Polite and respectful',
            high: 'Very confrontational'
        },
        technicality: {
            name: 'Technical Detail',
            description: 'Level of specific policy and procedural detail expected',
            low: 'General questions',
            high: 'Highly technical'
        },
        interruption: {
            name: 'Interruption Rate',
            description: 'How often they cut off or interrupt responses',
            low: 'Patient listening',
            high: 'Frequent interruptions'
        },
        followUp: {
            name: 'Follow-up Intensity',
            description: 'How persistently they probe for more information',
            low: 'Accepts first answer',
            high: 'Relentless follow-ups'
        }
    },
    media: {
        aggressiveness: {
            name: 'Aggressiveness',
            description: 'How confrontational the interviewing style becomes',
            low: 'Gentle questioning',
            high: 'Very aggressive'
        },
        timePressure: {
            name: 'Time Pressure',
            description: 'How much they emphasize time constraints and quick answers',
            low: 'Relaxed pace',
            high: 'Urgent, rushed'
        },
        gotcha: {
            name: 'Gotcha Questions',
            description: 'Tendency to ask trick questions or bring up controversies',
            low: 'Straightforward questions',
            high: 'Frequent gotcha moments'
        },
        soundbite: {
            name: 'Soundbite Focus',
            description: 'How much they push for quotable, punchy responses',
            low: 'Allows detailed answers',
            high: 'Demands short soundbites'
        }
    },
    consultation: {
        emotion: {
            name: 'Emotional Intensity',
            description: 'How emotionally charged the questions become',
            low: 'Calm and rational',
            high: 'Very emotional'
        },
        personalStories: {
            name: 'Personal Stories',
            description: 'How much they share personal anecdotes and experiences',
            low: 'Factual questions only',
            high: 'Lots of personal stories'
        },
        hostility: {
            name: 'Hostility Level',
            description: 'How antagonistic they are toward authority figures',
            low: 'Respectful disagreement',
            high: 'Openly hostile'
        },
        techChallenge: {
            name: 'Technical Challenge',
            description: 'How much they challenge technical details and expertise',
            low: 'Trusts expertise',
            high: 'Questions everything'
        }
    },
    interview: {
        difficulty: {
            name: 'Question Difficulty',
            description: 'Complexity level of questions asked',
            low: 'Basic, straightforward',
            high: 'Complex, challenging'
        },
        pressure: {
            name: 'Interview Pressure',
            description: 'Level of stress and time pressure applied',
            low: 'Relaxed, supportive',
            high: 'High stress, demanding'
        },
        behavioral: {
            name: 'Behavioral Focus',
            description: 'Emphasis on behavioral and situational questions',
            low: 'Skills and experience',
            high: 'Heavy behavioral probing'
        },
        technical: {
            name: 'Technical Depth',
            description: 'Level of technical knowledge testing',
            low: 'General concepts',
            high: 'Deep technical expertise'
        }
    }
};

// Personas for each scenario type
const personas = {
    committee: [
        {
            id: 'chair',
            name: 'Committee Chair',
            description: 'Procedural, evidence-focused, asks for specific details and follows up on inconsistencies'
        },
        {
            id: 'skeptical',
            name: 'Skeptical MP',
            description: 'Challenges assumptions, asks tough questions about policy effectiveness'
        },
        {
            id: 'detail-oriented',
            name: 'Detail-Oriented Member',
            description: 'Focuses on statistics, timelines, and precise implementation details'
        }
    ],
    media: [
        {
            id: 'paxman',
            name: 'Jeremy Paxman Style',
            description: 'Aggressive, interrupting, "Why didn\'t you answer the question?" approach'
        },
        {
            id: 'radio',
            name: 'Radio Host',
            description: 'Fast-paced, soundbite-focused, time pressure, broad audience appeal'
        },
        {
            id: 'investigative',
            name: 'Investigative Journalist',
            description: 'Well-researched, probing, follows paper trails and asks about controversies'
        },
        {
            id: 'friendly',
            name: 'Friendly Interviewer',
            description: 'Supportive but professional, gives space to explain complex issues'
        }
    ],
    consultation: [
        {
            id: 'concerned-resident',
            name: 'Concerned Resident',
            description: 'Emotional, personal impact focused, asks about effects on daily life'
        },
        {
            id: 'business-owner',
            name: 'Local Business Owner',
            description: 'Practical concerns about economic impact, regulations, and compliance'
        },
        {
            id: 'activist',
            name: 'Community Activist',
            description: 'Well-informed, passionate, challenges on social justice and equity issues'
        }
    ],
    interview: [
        {
            id: 'tough-hr',
            name: 'Tough HR Director',
            description: 'Direct, probing questions about experience and cultural fit'
        },
        {
            id: 'technical-lead',
            name: 'Technical Interviewer',
            description: 'Deep technical questions, problem-solving, hands-on challenges'
        },
        {
            id: 'panel',
            name: 'Panel Interview',
            description: 'Multiple perspectives, varied questioning styles, comprehensive evaluation'
        },
        {
            id: 'friendly-manager',
            name: 'Supportive Manager',
            description: 'Encouraging but thorough, focuses on potential and growth'
        }
    ]
};

// ENHANCED System prompts with memory and personality
const systemPrompts = {
    'committee-chair': 'You are a parliamentary select committee chair. You are professional but persistent. REMEMBER everything the witness has said previously and build on it. If they contradict themselves, point it out. If they avoid questions, press them harder. Ask specific follow-up questions based on their previous answers. Keep responses to 1-2 sentences maximum.',
    
    'committee-skeptical': 'You are a skeptical MP who challenges everything. REMEMBER their previous answers and find inconsistencies. If they said something earlier that contradicts their current answer, call it out directly. Be suspicious of vague answers and demand specifics. Stay in character as a skeptical politician.',
    
    'committee-detail-oriented': 'You are obsessed with precise details and statistics. REMEMBER exact figures they\'ve mentioned and challenge inconsistencies. If they give a different number than before, question it aggressively. Demand specific timelines, costs, and evidence.',
    
    'media-paxman': 'You are Jeremy Paxman. INTERRUPT them if they waffle. REMEMBER everything they\'ve said and use it against them. "You just said X, now you\'re saying Y - which is it?" Be aggressive, confrontational. If they don\'t answer directly, say "That\'s not what I asked." Keep questions short and punchy.',
    
    'media-radio': 'You are a radio host with time pressure. REMEMBER their key points and challenge them quickly. "Earlier you said X, but that contradicts Y." Keep everything fast-paced and push for clear soundbites. Reference their previous answers to create pressure.',
    
    'media-investigative': 'You are an investigative journalist who has done research. REMEMBER everything they\'ve told you and compare it to "your research." Challenge inconsistencies: "But you just told me X, my sources say Y." Be thorough and build cases from their answers.',
    
    'media-friendly': 'You are supportive but still professional. REMEMBER their answers and ask gentle follow-ups. "You mentioned X earlier, can you expand on that?" Build on what they\'ve said constructively.',
    
    'consultation-concerned-resident': 'You are an emotional local resident. REMEMBER what they\'ve promised and hold them to it. "You said earlier that X would happen, but how?" Get personal and emotional. Stay in character as a worried resident, not a politician.',
    
    'consultation-business-owner': 'You are a practical business owner focused on costs. REMEMBER any figures or commitments they\'ve made. "You mentioned X cost earlier, how does that affect my business?" Stay focused on practical business impacts.',
    
    'consultation-activist': 'You are a passionate activist. REMEMBER their commitments and challenge them. "Earlier you said you cared about X, but your policy does Y." Be confrontational but informed. Challenge them on their values.',
    
    'interview-tough-hr': 'You are a tough HR director. REMEMBER their previous answers about experience and challenge inconsistencies. "You said earlier you managed X people, but that seems to contradict what you just said." Be direct and probing.',
    
    'interview-technical-lead': 'You are testing technical competency. REMEMBER their technical claims and build on them. "You mentioned you know X technology, how would you handle Y problem with it?" Progressive questioning that builds complexity.',
    
    'interview-panel': 'You represent multiple perspectives. REMEMBER all their answers and approach from different angles. "From a technical perspective you said X, but from a management angle, how do you reconcile that with Y?"',
    
    'interview-friendly-manager': 'You are encouraging but thorough. REMEMBER their examples and ask for more details. "That\'s interesting - you mentioned X project, what did you learn from that experience?" Build on their stories positively.'
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeVoiceRecognition();
    setupEventListeners();
});
function initializeVoiceRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-GB';
        
        recognition.onstart = function() {
            updateVoiceStatus('listening', 'Listening... (click to stop)');
            updateVoiceButton('recording');
        };
        
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            document.getElementById('user-input').value = transcript;
            updateVoiceStatus('processing', 'Processing...');
            sendMessage();
        };
        
        recognition.onerror = function(event) {
            updateVoiceStatus('error', 'Voice recognition error. Please try typing.');
            console.error('Speech recognition error:', event.error);
            isRecording = false;
            updateVoiceButton('idle');
        };
        
        recognition.onend = function() {
            isRecording = false;
            updateVoiceButton('idle');
            if (document.getElementById('voice-status').textContent.includes('Listening')) {
                updateVoiceStatus('ready', 'Ready for voice input');
            }
        };
    } else {
        console.warn('Speech recognition not supported');
        const indicator = document.getElementById('voice-status-indicator');
        if (indicator) {
            indicator.textContent = '⌨️ TYPING ONLY';
        }
    }
}

function setupEventListeners() {
    // Scenario selection
    document.querySelectorAll('.scenario-card').forEach(card => {
        card.addEventListener('click', function() {
            selectScenario(this.dataset.scenario);
        });
    });
}

function selectScenario(scenario) {
    selectedScenario = scenario;
    
    // Update UI
    document.querySelectorAll('.scenario-card').forEach(card => {
        card.classList.remove('active');
    });
    document.querySelector(`[data-scenario="${scenario}"]`).classList.add('active');
    
    // Apply theme
    document.body.className = `${scenario}-theme`;
    
    // Enable next button
    const nextBtn = document.getElementById('next-to-page-2');
    if (nextBtn) {
        nextBtn.disabled = false;
    }
    
    // Update step
    updateStep(1);
}

function goToPage(pageNumber) {
    // Hide current page
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show target page
    const targetPage = document.getElementById(`page-${pageNumber}`);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    currentPage = pageNumber;
    
    // Update step indicator
    updateStep(pageNumber);
    
    // Special handling for specific pages
    if (pageNumber === 3) {
        loadPersonas();
        setupFileUploadListeners();
    } else if (pageNumber === 4) {
        updateSummary();
    } else if (pageNumber === 5) {
        // Set up voice button listener when we reach training page
        const voiceBtn = document.getElementById('voice-toggle');
        if (voiceBtn && !voiceBtn.hasAttribute('data-listener')) {
            voiceBtn.addEventListener('click', toggleVoiceRecognition);
            voiceBtn.setAttribute('data-listener', 'true');
        }
    }
}

function updateStep(stepNumber) {
    document.querySelectorAll('.step').forEach((step, index) => {
        step.classList.remove('active', 'completed');
        if (index + 1 === stepNumber) {
            step.classList.add('active');
        } else if (index + 1 < stepNumber) {
            step.classList.add('completed');
        }
    });
}

function setupFileUploadListeners() {
    const policyInput = document.getElementById('policy-input');
    const briefingInput = document.getElementById('briefing-input');
    
    if (policyInput && !policyInput.hasAttribute('data-listener')) {
        policyInput.addEventListener('change', function(e) {
            handleFileUpload(e, 'policy');
        });
        policyInput.setAttribute('data-listener', 'true');
    }
    
    if (briefingInput && !briefingInput.hasAttribute('data-listener')) {
        briefingInput.addEventListener('change', function(e) {
            handleFileUpload(e, 'briefing');
        });
        briefingInput.setAttribute('data-listener', 'true');
    }
}

function loadPersonas() {
    const container = document.getElementById('personas-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!personas[selectedScenario]) return;
    
    personas[selectedScenario].forEach(persona => {
        const personaBtn = document.createElement('div');
        personaBtn.className = 'persona-btn';
        personaBtn.dataset.persona = persona.id;
        personaBtn.innerHTML = `
            <h4>${persona.name}</h4>
            <p>${persona.description}</p>
        `;
        personaBtn.addEventListener('click', function() {
            selectPersona(persona.id);
        });
        container.appendChild(personaBtn);
    });
}

function selectPersona(persona) {
    selectedPersona = persona;
    
    // Update UI
    document.querySelectorAll('.persona-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`[data-persona="${persona}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // Show trait sliders
    const traitSliders = document.getElementById('trait-sliders');
    if (traitSliders) {
        traitSliders.style.display = 'block';
        loadTraitSliders();
    }
    
    // Enable next button
    const nextBtn = document.getElementById('next-to-page-4');
    if (nextBtn) {
        nextBtn.disabled = false;
    }
}

function loadTraitSliders() {
    const container = document.getElementById('sliders-container');
    if (!container) return;
    
    const traits = traitDefinitions[selectedScenario];
    if (!traits) return;
    
    container.innerHTML = '';
    traitValues = {};
    
    Object.entries(traits).forEach(([key, trait]) => {
        traitValues[key] = 5; // Default value
        
        const sliderGroup = document.createElement('div');
        sliderGroup.className = 'slider-group';
        sliderGroup.innerHTML = `
            <div class="slider-label">
                <span>${trait.name}</span>
                <span class="slider-value" id="value-${key}">5</span>
            </div>
            <input type="range" min="1" max="10" value="5" class="slider" id="slider-${key}">
            <div class="slider-description">
                <strong>Low:</strong> ${trait.low}<br>
                <strong>High:</strong> ${trait.high}
            </div>
        `;
        
        container.appendChild(sliderGroup);
        
        const slider = sliderGroup.querySelector(`#slider-${key}`);
        slider.addEventListener('input', function() {
            traitValues[key] = parseInt(this.value);
            const valueElement = document.getElementById(`value-${key}`);
            if (valueElement) {
                valueElement.textContent = this.value;
            }
        });
    });
}

function handleFileUpload(event, type) {
    const files = Array.from(event.target.files);
    
    if (type === 'policy') {
        policyFiles = files;
        displayFiles(files, 'policy-files');
    } else if (type === 'briefing') {
        briefingFiles = files;
        displayFiles(files, 'briefing-files');
    }
}

function displayFiles(files, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    files.forEach(file => {
        const fileDiv = document.createElement('div');
        fileDiv.style.cssText = 'margin: 0.5rem 0; padding: 0.5rem; background: white; border-radius: 5px; border: 1px solid #ddd;';
        fileDiv.innerHTML = `📄 ${file.name} <span style="color: #666; font-size: 0.9rem;">(${(file.size/1024).toFixed(1)} KB)</span>`;
        container.appendChild(fileDiv);
    });
}

function updateSummary() {
    const scenarioNames = {
        committee: 'Select Committee Appearance',
        media: 'Media Interview',
        consultation: 'Public Consultation',
        interview: 'Job Interview'
    };
    
    const summaryScenario = document.getElementById('summary-scenario');
    const summaryRole = document.getElementById('summary-role');
    const summaryPersona = document.getElementById('summary-persona');
    
    if (summaryScenario) {
        summaryScenario.textContent = scenarioNames[selectedScenario] || selectedScenario;
    }
    
    if (summaryRole) {
        const roleInput = document.getElementById('your-role');
        summaryRole.textContent = roleInput ? roleInput.value || 'Not specified' : 'Not specified';
    }
    
    if (summaryPersona) {
        const personaData = personas[selectedScenario]?.find(p => p.id === selectedPersona);
        summaryPersona.textContent = personaData?.name || 'Not selected';
    }
}

// NEW: Enhanced voice control (click to start/stop)
function toggleVoiceRecognition() {
    if (!recognition) {
        alert('Voice recognition not supported in this browser');
        return;
    }
    
    if (isRecording) {
        // Stop recording
        recognition.stop();
        isRecording = false;
        updateVoiceButton('idle');
        updateVoiceStatus('ready', 'Ready for voice input');
    } else {
        // Start recording
        recognition.start();
        isRecording = true;
        updateVoiceButton('recording');
        updateVoiceStatus('listening', 'Listening... (click to stop)');
    }
}

function updateVoiceButton(state) {
    const button = document.getElementById('voice-toggle');
    const icon = document.getElementById('voice-icon');
    const text = document.getElementById('voice-text');
    
    if (!button || !icon || !text) return;
    
    button.className = 'voice-btn';
    
    if (state === 'recording') {
        button.classList.add('recording');
        icon.textContent = '🔴';
        text.textContent = 'Recording... (click to stop)';
    } else {
        button.classList.add('idle');
        icon.textContent = '🎤';
        text.textContent = 'Click to Speak';
    }
}

function updateVoiceStatus(status, message) {
    const statusElement = document.getElementById('voice-status');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = `voice-status ${status}`;
    }
}
function saveApiKeys() {
    const openaiKey = document.getElementById('openai-key').value.trim();
    const elevenlabsKey = document.getElementById('elevenlabs-key').value.trim();
    
    if (!openaiKey) {
        alert('OpenAI API key is required');
        return;
    }
    
    openaiApiKey = openaiKey;
    elevenlabsApiKey = elevenlabsKey;
    
    const modal = document.getElementById('api-key-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    beginTrainingSession();
}

function startTraining() {
    // Capture all form data
    const descInput = document.getElementById('scenario-description');
    const roleInput = document.getElementById('your-role');
    const contextInput = document.getElementById('company-context');
    
    if (descInput) scenarioDescription = descInput.value.trim();
    if (roleInput) userRole = roleInput.value.trim();
    if (contextInput) companyContext = contextInput.value.trim();
    
    // Show API key modal
    const modal = document.getElementById('api-key-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function beginTrainingSession() {
    // Reset conversation history for new session
    conversationHistory = [];
    
    goToPage(5);
    updateStep(5);
    
    // Set up training interface
    const scenarioNames = {
        committee: 'Select Committee',
        media: 'Media Interview',
        consultation: 'Public Consultation',
        interview: 'Job Interview'
    };
    
    const personaData = personas[selectedScenario]?.find(p => p.id === selectedPersona);
    
    const trainingTitle = document.getElementById('training-title');
    const personaDescription = document.getElementById('persona-description');
    
    if (trainingTitle) {
        trainingTitle.textContent = `${scenarioNames[selectedScenario] || 'Training'} Session`;
    }
    
    if (personaDescription) {
        personaDescription.textContent = `Interviewer: ${personaData?.name || 'Unknown'}`;
    }
    
    // Clear previous messages
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
        messagesContainer.innerHTML = `
            <div class="message interviewer">
                <strong>Interviewer:</strong> Welcome to your training session. I'll be playing the role of ${personaData?.name || 'your interviewer'}. Are you ready to begin?
            </div>
        `;
    }
    
    updateVoiceStatus('ready', 'Ready for voice input');
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

async function sendMessage() {
    const input = document.getElementById('user-input');
    if (!input) return;
    
    const message = input.value.trim();
    if (!message) return;
    
    // Add user message to conversation history
    conversationHistory.push({
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
    });
    
    addMessage(message, 'user');
    input.value = '';
    
    // Show typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message interviewer';
    typingDiv.innerHTML = '<strong>Interviewer:</strong> <em>typing...</em>';
    typingDiv.id = 'typing-indicator';
    
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
        messagesContainer.appendChild(typingDiv);
    }
    
    try {
        const response = await getAIResponse(message);
        const typingElement = document.getElementById('typing-indicator');
        if (typingElement) {
            typingElement.remove();
        }
        
        // Add AI response to conversation history
        conversationHistory.push({
            role: 'interviewer',
            content: response,
            timestamp: new Date().toISOString()
        });
        
        addMessage(response, 'interviewer');
        
        // Convert response to speech if ElevenLabs key available
        if (elevenlabsApiKey) {
            await speakResponse(response);
        }
        
        updateVoiceStatus('ready', 'Ready for voice input');
    } catch (error) {
        const typingElement = document.getElementById('typing-indicator');
        if (typingElement) {
            typingElement.remove();
        }
        
        addMessage('Sorry, there was an error. Please check your API keys and try again.', 'interviewer');
        console.error('Error:', error);
        updateVoiceStatus('error', 'Error occurred');
    }
}

function addMessage(message, sender) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    if (sender === 'interviewer') {
        messageDiv.innerHTML = `<strong>Interviewer:</strong> ${message}`;
    } else {
        messageDiv.innerHTML = `<strong>You:</strong> ${message}`;
    }
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function getAIResponse(userMessage) {
    const personaKey = `${selectedScenario}-${selectedPersona}`;
    let systemPrompt = systemPrompts[personaKey] || 'You are a professional interviewer.';
    
    // Build conversation memory context
    let conversationContext = '';
    if (conversationHistory.length > 2) {
        conversationContext = '\n\nPREVIOUS CONVERSATION:\n';
        conversationHistory.slice(-6).forEach(entry => {
            if (entry.role === 'user') {
                conversationContext += `THEIR ANSWER: "${entry.content}"\n`;
            } else {
                conversationContext += `YOUR QUESTION: "${entry.content}"\n`;
            }
        });
        conversationContext += '\nREMEMBER: Reference their previous answers. Point out contradictions. Build on what they\'ve said. Be reactive, not generic.\n';
    }
    
    // Add trait customization
    let traitInstructions = '\n\nCustomized traits for this session:\n';
    
    // Add scenario context
    let scenarioContext = '';
    if (scenarioDescription) {
        scenarioContext += `\n\nScenario Context: ${scenarioDescription}`;
    }
    if (userRole) {
        scenarioContext += `\nUser's Role: ${userRole}`;
    }
    if (companyContext) {
        scenarioContext += `\nOrganization: ${companyContext}`;
    }
    
    // Build trait instructions
    Object.entries(traitValues).forEach(([key, value]) => {
        if (key === 'aggressiveness' || key === 'pressure') {
            if (value >= 8) traitInstructions += `- Be very confrontational and challenging (${value}/10)\n`;
            else if (value <= 3) traitInstructions += `- Be polite and respectful (${value}/10)\n`;
        }
        if (key === 'interruption') {
            if (value >= 8) traitInstructions += `- Interrupt frequently when answers are evasive (${value}/10)\n`;
        }
        if (key === 'difficulty') {
            if (value >= 8) traitInstructions += `- Ask very complex, challenging questions (${value}/10)\n`;
            else if (value <= 3) traitInstructions += `- Keep questions basic and straightforward (${value}/10)\n`;
        }
        if (key === 'followUp') {
            if (value >= 8) traitInstructions += `- Be relentless in follow-up questioning (${value}/10)\n`;
        }
        if (key === 'emotion') {
            if (value >= 8) traitInstructions += `- Be very emotional and passionate (${value}/10)\n`;
        }
        if (key === 'hostility') {
            if (value >= 8) traitInstructions += `- Be openly hostile and antagonistic (${value}/10)\n`;
        }
    });
    
    // Add document context
    let contextualInfo = '';
    if (policyFiles.length > 0 || briefingFiles.length > 0) {
        contextualInfo += '\n\nDocument Context:';
        if (policyFiles.length > 0) {
            contextualInfo += `\nRelevant Documents: ${policyFiles.map(f => f.name).join(', ')}`;
        }
        if (briefingFiles.length > 0) {
            contextualInfo += `\nBriefing Materials: ${briefingFiles.map(f => f.name).join(', ')}`;
        }
    }
    
    // Combine all context
    const fullPrompt = systemPrompt + conversationContext + traitInstructions + scenarioContext + contextualInfo + 
        '\n\nIMPORTANT: Keep responses to 1-2 sentences maximum. Be conversational and human. Reference their previous answers. Stay in character.';
    
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiApiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: fullPrompt
                    },
                    {
                        role: 'user',
                        content: userMessage
                    }
                ],
                max_tokens: 100, // Reduced for shorter responses
                temperature: 0.8 // Increased for more natural conversation
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
        
    } catch (error) {
        if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
            throw new Error('Network error. Please ensure you have proper API access or deploy to a server.');
        } else {
            throw error;
        }
    }
}

async function speakResponse(text) {
    if (!elevenlabsApiKey) return;
    
    updateVoiceStatus('speaking', 'AI is speaking...');
    
    try {
        const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': elevenlabsApiKey
            },
            body: JSON.stringify({
                text: text,
                model_id: 'eleven_monolingual_v1',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.5
                }
            })
        });
        
        if (response.ok) {
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audio.play();
            
            audio.onended = () => {
                updateVoiceStatus('ready', 'Ready for voice input');
                URL.revokeObjectURL(audioUrl);
            };
        } else {
            console.error('ElevenLabs API error:', response.status);
            updateVoiceStatus('ready', 'Ready for voice input');
        }
    } catch (error) {
        console.error('Speech synthesis error:', error);
        updateVoiceStatus('ready', 'Ready for voice input');
    }
}

function endTraining() {
    if (confirm('Are you sure you want to end this training session?')) {
        // Reset conversation history
        conversationHistory = [];
        
        goToPage(1);
        updateStep(1);
        
        // Reset state
        selectedScenario = '';
        selectedPersona = '';
        document.body.className = '';
        
        // Reset form fields
        const fields = ['scenario-description', 'your-role', 'company-context'];
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) field.value = '';
        });
        
        // Clear file uploads
        policyFiles = [];
        briefingFiles = [];
        const fileContainers = ['policy-files', 'briefing-files'];
        fileContainers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) container.innerHTML = '';
        });
        
        // Reset UI
        document.querySelectorAll('.scenario-card').forEach(card => {
            card.classList.remove('active');
        });
        document.querySelectorAll('.persona-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Disable buttons
        const nextBtn2 = document.getElementById('next-to-page-2');
        const nextBtn4 = document.getElementById('next-to-page-4');
        if (nextBtn2) nextBtn2.disabled = true;
        if (nextBtn4) nextBtn4.disabled = true;
    }
}

// Global functions for onclick handlers
window.goToPage = goToPage;
window.selectScenario = selectScenario;
window.selectPersona = selectPersona;
window.startTraining = startTraining;
window.saveApiKeys = saveApiKeys;
window.endTraining = endTraining;
window.handleKeyPress = handleKeyPress;
window.sendMessage = sendMessage;
window.toggleVoiceRecognition = toggleVoiceRecognition;
