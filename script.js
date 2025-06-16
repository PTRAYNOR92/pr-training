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

// Voice recognition variables
let recognition = null;
let isListening = false;
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

// System prompts for different persona types
const systemPrompts = {
    'committee-chair': 'You are a parliamentary select committee chair. You are professional, procedural, and focused on getting clear evidence. Ask detailed questions about policy implementation, costs, timelines, and effectiveness. Follow up when answers are vague.',
    'committee-skeptical': 'You are a skeptical MP on a select committee. You challenge assumptions, question the effectiveness of policies, and ask tough questions about whether proposed solutions will actually work.',
    'committee-detail-oriented': 'You are a detail-oriented select committee member. You focus on statistics, precise timelines, budget breakdowns, and specific implementation details. You ask for exact figures.',
    'media-paxman': 'You are an aggressive BBC-style interviewer in the tradition of Jeremy Paxman. You interrupt when answers are evasive, repeat questions that haven\'t been answered directly, and use phrases like "That\'s not what I asked".',
    'media-radio': 'You are a radio host conducting a live interview. You work with time constraints, need clear soundbites, and ask questions that a general audience can understand.',
    'media-investigative': 'You are an investigative journalist who has done extensive research. You ask probing questions about controversies, follow paper trails, and reference specific documents.',
    'media-friendly': 'You are a friendly but professional interviewer. You give guests space to explain complex issues while maintaining journalistic rigor.',
    'consultation-concerned-resident': 'You are a concerned local resident at a public consultation. You ask emotional questions about how policies will affect your daily life and community.',
    'consultation-business-owner': 'You are a local business owner concerned about practical impacts. You ask about regulations, compliance costs, and economic effects.',
    'consultation-activist': 'You are a well-informed community activist. You challenge policies on social justice grounds and push for stronger action.',
    'interview-tough-hr': 'You are a tough HR director conducting a job interview. You ask direct, probing questions about experience, achievements, and cultural fit. You test candidates under pressure.',
    'interview-technical-lead': 'You are a technical interviewer assessing candidates\' skills. You ask deep technical questions, present problems to solve, and evaluate technical competency.',
    'interview-panel': 'You are part of a panel interview. You ask varied questions from different perspectives, covering both technical skills and soft skills comprehensively.',
    'interview-friendly-manager': 'You are a supportive hiring manager. You ask encouraging but thorough questions, focusing on the candidate\'s potential and growth mindset.'
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
            updateVoiceStatus('listening', 'Listening...');
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
        };
        
        recognition.onend = function() {
            isListening = false;
            updateVoiceButton();
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

function toggleVoiceRecognition() {
    if (!recognition) {
        alert('Voice recognition not supported in this browser');
        return;
    }
    
    if (isListening) {
        recognition.stop();
        isListening = false;
    } else {
        recognition.start();
        isListening = true;
    }
    
    updateVoiceButton();
}

function updateVoiceButton() {
    const button = document.getElementById('voice-toggle');
    const icon = document.getElementById('voice-icon');
    const text = document.getElementById('voice-text');
    
    if (!button || !icon || !text) return;
    
    button.className = 'voice-btn';
    
    if (isListening) {
        button.classList.add('recording');
        icon.textContent = '🔴';
        text.textContent = 'Recording...';
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
    
    // Add trait customization
    const traits = traitDefinitions[selectedScenario];
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
    });
    
    systemPrompt += traitInstructions + scenarioContext;
    
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
                        content: systemPrompt + contextualInfo + '\n\nKeep responses concise but challenging. Adapt your style based on the trait settings.'
                    },
                    {
                        role: 'user',
                        content: userMessage
                    }
                ],
                max_tokens: 200,
                temperature: 0.7
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