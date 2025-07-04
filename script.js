// Firebase Authentication Variables
let currentUser = null;
let sessionRating = 0;

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

// NEW: Top lines tracking
let topLines = [];
let topLinesTracking = {};

// NEW: Conversation memory
let conversationHistory = [];
let isRecording = false;

// CRITICAL FIX: Add message queue and duplicate prevention
let isProcessingMessage = false;
let messageQueue = [];
let lastInterviewerMessage = '';
let lastInterviewerMessageTime = 0;
let lastMessageTime = 0;
let currentMessageId = null;
let lastAPICallTime = 0;
let processingTimeout = null;

// Voice recognition variables
let recognition = null;
let speechSynthesis = window.speechSynthesis;
let useElevenLabs = true; // Flag to track if we should use ElevenLabs

// Simple auth check - redirect to login if not authenticated
auth.onAuthStateChanged(function(user) {
    if (!user) {
        // Not logged in - redirect to login
        console.log('No user logged in - redirecting to login page...');
        window.location.href = 'login.html';
    } else {
        // User is logged in
        console.log('User authenticated:', user.email);
        currentUser = user;
        
        // Show logout link
        const logoutLink = document.getElementById('logout-link');
        if (logoutLink) {
            logoutLink.style.display = 'block';
        }
    }
});

function signOut() {
    if (confirm('Are you sure you want to sign out?')) {
        auth.signOut().then(() => {
            console.log('User signed out');
            // Redirect to login page
            window.location.href = 'login.html';
        });
    }
}

function resetApplicationState() {
    currentPage = 1;
    selectedScenario = '';
    selectedPersona = '';
    scenarioDescription = '';
    userRole = '';
    companyContext = '';
    policyFiles = [];
    briefingFiles = [];
    traitValues = {};
    conversationHistory = [];
    isRecording = false;
    isProcessingMessage = false; // Reset processing lock
    useElevenLabs = true; // Reset voice preference
    topLines = []; // Reset top lines
    topLinesTracking = {}; // Reset tracking
    
    // Reset message tracking
    lastInterviewerMessage = '';
    lastInterviewerMessageTime = 0;
    lastMessageTime = 0;
    currentMessageId = null;
    lastAPICallTime = 0;
    
    // Clear any pending timeouts
    if (processingTimeout) {
        clearTimeout(processingTimeout);
        processingTimeout = null;
    }
    
    // Clear any pending timeouts
    if (processingTimeout) {
        clearTimeout(processingTimeout);
        processingTimeout = null;
    }
    lastAPICallTime = 0;
    currentMessageId = null;
    
    // Reset UI
    document.querySelectorAll('.scenario-card').forEach(card => {
        card.classList.remove('active');
    });
    document.querySelectorAll('.persona-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Clear form fields
    const fields = ['scenario-description', 'your-role', 'company-context'];
    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) field.value = '';
    });
    
    // Reset top lines container
    const topLinesContainer = document.getElementById('top-lines-container');
    if (topLinesContainer) {
        topLinesContainer.innerHTML = `
            <div class="top-line-input">
                <input type="text" class="top-line" placeholder="Key message 1" maxlength="150">
            </div>
        `;
    }
}

// NEW: Add top line input field
function addTopLine() {
    const container = document.getElementById('top-lines-container');
    const currentLines = container.querySelectorAll('.top-line').length;
    
    if (currentLines >= 5) {
        alert('Maximum 5 key messages allowed');
        return;
    }
    
    const newLineDiv = document.createElement('div');
    newLineDiv.className = 'top-line-input';
    newLineDiv.innerHTML = `
        <input type="text" class="top-line" placeholder="Key message ${currentLines + 1}" maxlength="150">
        <button onclick="removeTopLine(this)" style="margin-left: 0.5rem; padding: 0.5rem; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer;">✕</button>
    `;
    container.appendChild(newLineDiv);
}

// NEW: Remove top line input field
function removeTopLine(button) {
    button.parentElement.remove();
    // Update placeholders
    const inputs = document.querySelectorAll('.top-line');
    inputs.forEach((input, index) => {
        input.placeholder = `Key message ${index + 1}`;
    });
}

// NEW: Collect top lines when starting training
function collectTopLines() {
    topLines = [];
    topLinesTracking = {};
    
    const inputs = document.querySelectorAll('.top-line');
    inputs.forEach(input => {
        const value = input.value.trim();
        if (value) {
            topLines.push(value);
            // Initialize tracking for each top line
            topLinesTracking[value] = {
                mentioned: false,
                context: '',
                timing: 'not_mentioned',
                effectiveness: 0
            };
        }
    });
}

// NEW: AI-powered feedback analysis
async function generateAIFeedback() {
    const feedbackContent = document.getElementById('ai-feedback-content');
    
    if (!feedbackContent) return;
    
    // Show loading state
    feedbackContent.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
            <div class="loading-spinner"></div>
            <p>Analyzing your performance...</p>
        </div>
    `;
    
    try {
        // Prepare analysis request
        const analysisPrompt = `
Analyze this training session conversation and provide detailed feedback:

Role: ${userRole}
Scenario: ${selectedScenario}
Key Messages to Land: ${topLines.join(', ')}

Conversation:
${conversationHistory.map(entry => `${entry.role.toUpperCase()}: ${entry.content}`).join('\n')}

Provide analysis in these areas:
1. Key Message Delivery - Did they land their key messages effectively? Were they mentioned naturally or forced?
2. Response Quality - Were answers clear, concise, and on-topic?
3. Confidence & Authority - Did they sound authoritative and confident?
4. Handling Difficult Questions - How well did they manage challenging moments?
5. Areas for Improvement - Specific actionable feedback

Format the response as structured feedback with scores out of 10 for each area.
Be specific about which key messages were landed well and which were missed.
`;

        // Call OpenAI API for analysis
        const response = await fetch('/api/openai', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert communications coach analyzing training session performance. Provide constructive, specific feedback that helps people improve their professional communication skills.'
                    },
                    {
                        role: 'user',
                        content: analysisPrompt
                    }
                ],
                max_tokens: 800,
                temperature: 0.7
            })
        });
        
        const data = await response.json();
        const analysis = data.choices[0].message.content;
        
        // Parse the analysis and create visual feedback
        displayFormattedFeedback(analysis);
        
    } catch (error) {
        console.error('Error generating AI feedback:', error);
        feedbackContent.innerHTML = `
            <div style="background: #f8d7da; padding: 1rem; border-radius: 8px; color: #721c24;">
                <p>Unable to generate AI feedback. Please try again.</p>
            </div>
        `;
    }
}

// NEW: Display formatted AI feedback
function displayFormattedFeedback(analysis) {
    const feedbackContent = document.getElementById('ai-feedback-content');
    
    // Create a visually appealing feedback display
    let feedbackHTML = `
        <div style="background: white; padding: 2rem; border-radius: 10px; margin-bottom: 1.5rem;">
            <h4 style="color: #667eea; margin-bottom: 1rem;">🎯 Key Messages Performance</h4>
            <div style="margin-bottom: 1.5rem;">
    `;
    
    // Analyze which top lines were mentioned
    topLines.forEach((line, index) => {
        const wasMentioned = conversationHistory.some(entry => 
            entry.role === 'user' && entry.content.toLowerCase().includes(line.toLowerCase().substring(0, 20))
        );
        
        feedbackHTML += `
            <div style="display: flex; align-items: center; margin-bottom: 0.5rem;">
                <span style="font-size: 1.2rem; margin-right: 0.5rem;">
                    ${wasMentioned ? '✅' : '❌'}
                </span>
                <span style="flex: 1;">${line}</span>
                <span style="font-size: 0.9rem; color: ${wasMentioned ? '#28a745' : '#dc3545'};">
                    ${wasMentioned ? 'Delivered' : 'Missed'}
                </span>
            </div>
        `;
    });
    
    feedbackHTML += `
            </div>
        </div>
        
        <div style="background: white; padding: 2rem; border-radius: 10px;">
            <h4 style="color: #667eea; margin-bottom: 1rem;">📊 Detailed Analysis</h4>
            <div style="white-space: pre-wrap; line-height: 1.6;">
                ${analysis}
            </div>
        </div>
        
        <div style="background: #e7f3ff; padding: 1.5rem; border-radius: 10px; margin-top: 1.5rem;">
            <h4>💡 Quick Tips for Next Time</h4>
            <ul style="margin-top: 1rem;">
                ${topLines.filter((line, index) => {
                    const wasMentioned = conversationHistory.some(entry => 
                        entry.role === 'user' && entry.content.toLowerCase().includes(line.toLowerCase().substring(0, 20))
                    );
                    return !wasMentioned;
                }).map(line => `
                    <li>Find opportunities to naturally mention: "${line}"</li>
                `).join('')}
                <li>Practice bridging from difficult questions back to your key messages</li>
                <li>Use examples and evidence to support your points</li>
            </ul>
        </div>
    `;
    
    feedbackContent.innerHTML = feedbackHTML;
}

// Modified endTraining function
function endTraining() {
    if (confirm('Are you sure you want to end this training session?')) {
        // Clear any pending timeouts
        if (processingTimeout) {
            clearTimeout(processingTimeout);
            processingTimeout = null;
        }
        // Stop recording if active
        if (isRecording && recognition) {
            recognition.stop();
            isRecording = false;
        }
        
        // Reset processing lock
        isProcessingMessage = false;
        
        // Collect top lines for analysis
        collectTopLines();
        
        // Go to feedback page
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById('feedback-page').classList.add('active');
        
        // Generate AI feedback
        generateAIFeedback();
    }
}

// Simplified resetForNewSession (no Firebase saving)
function resetForNewSession() {
    // Reset session-specific data but keep user logged in
    selectedScenario = '';
    selectedPersona = '';
    scenarioDescription = '';
    userRole = '';
    companyContext = '';
    policyFiles = [];
    briefingFiles = [];
    traitValues = {};
    conversationHistory = [];
    sessionRating = 0;
    topLines = [];
    topLinesTracking = {};
    isProcessingMessage = false; // Reset processing lock
    
    // Reset message tracking
    lastInterviewerMessage = '';
    lastInterviewerMessageTime = 0;
    lastMessageTime = 0;
    
    // Reset voice settings
    useElevenLabs = true;
    const indicator = document.getElementById('voice-status-indicator');
    if (indicator) {
        indicator.textContent = '🎤 VOICE ENABLED';
        indicator.style.background = '#28a745';
    }
    
    // Reset UI elements
    document.querySelectorAll('.scenario-card').forEach(card => {
        card.classList.remove('active');
    });
    document.querySelectorAll('.persona-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Clear form fields except login
    const fields = ['scenario-description', 'your-role', 'company-context'];
    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) field.value = '';
    });
    
    // Reset top lines container
    const topLinesContainer = document.getElementById('top-lines-container');
    if (topLinesContainer) {
        topLinesContainer.innerHTML = `
            <div class="top-line-input">
                <input type="text" class="top-line" placeholder="Key message 1" maxlength="150">
            </div>
        `;
    }
    
    // Reset buttons
    const nextBtn2 = document.getElementById('next-to-page-2');
    const nextBtn4 = document.getElementById('next-to-page-4');
    if (nextBtn2) nextBtn2.disabled = true;
    if (nextBtn4) nextBtn4.disabled = true;
    
    // Clear file uploads
    const fileContainers = ['policy-files', 'briefing-files'];
    fileContainers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) container.innerHTML = '';
    });
    
    // Clear chat
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
        messagesContainer.innerHTML = `
            <div class="message interviewer">
                <strong>Interviewer:</strong> Welcome to your training session. Are you ready to begin?
            </div>
        `;
    }
    
    // Go back to page 1 (not login, since user is still logged in)
    goToPage(1);
}

// Your existing trait definitions and personas (keep exactly the same)
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

// Updated Personas for each scenario type (keep exactly the same)
const personas = {
    committee: [
        {
            id: 'forensic-chair',
            name: 'The Forensic Chair',
            description: 'Committee chair known for methodical evidence-gathering. Builds cases systematically, references previous testimony, maintains order while pursuing uncomfortable truths.'
        },
        {
            id: 'backbench-terrier',
            name: 'The Backbench Terrier',
            description: 'Persistent backbench MP famous for never letting go. Known for asking the same question seven different ways until getting a straight answer.'
        },
        {
            id: 'technical-specialist',
            name: 'The Technical Specialist',
            description: 'Committee member with deep subject expertise. Quotes specific legislation, challenges on technical details, knows the policy inside out.'
        }
    ],
    media: [
        {
            id: 'political-heavyweight',
            name: 'The Political Heavyweight',
            description: 'Sunday morning political interviewing style. Won\'t accept politician-speak, repeats unanswered questions, challenges with research and facts.'
        },
        {
            id: 'time-pressure-broadcaster',
            name: 'The Time-Pressure Broadcaster',
            description: 'Radio news style - fast-paced, urgent, focused on immediate public interest. Cuts through complexity for mass audience.'
        },
        {
            id: 'investigative-journalist',
            name: 'The Investigative Journalist',
            description: 'Long-form investigative style. Well-researched, builds narratives, follows paper trails, asks about uncomfortable details.'
        },
        {
            id: 'sympathetic-professional',
            name: 'The Sympathetic Professional',
            description: 'Supportive but thorough broadcaster. Gives space to explain complex issues while maintaining journalistic integrity.'
        }
    ],
    consultation: [
        {
            id: 'concerned-local',
            name: 'The Concerned Local',
            description: 'Worried resident focused on immediate community impact. Emotional investment, practical concerns, personal stories.'
        },
        {
            id: 'business-voice',
            name: 'The Business Voice',
            description: 'Local business owner focused on economic impact, practical implementation, regulatory burden.'
        },
        {
            id: 'informed-activist',
            name: 'The Informed Activist',
            description: 'Well-researched community advocate. Challenges on equity, environment, or social justice angles.'
        }
    ],
    interview: [
        {
            id: 'senior-stakeholder',
            name: 'The Senior Stakeholder',
            description: 'Senior executive style - strategic thinking, cultural fit, leadership under pressure.'
        },
        {
            id: 'technical-evaluator',
            name: 'The Technical Evaluator',
            description: 'Hands-on technical assessment. Problem-solving in real-time, deep technical knowledge, practical application.'
        },
        {
            id: 'panel-perspective',
            name: 'The Panel Perspective',
            description: 'Multi-angle panel interview. Different stakeholders, varied questioning styles, comprehensive evaluation.'
        },
        {
            id: 'supportive-developer',
            name: 'The Supportive Developer',
            description: 'Growth-focused interviewer. Potential over perfection, learning ability, development mindset.'
        }
    ]
};

// UPDATED System prompts with STRONGER single message enforcement
const systemPrompts = {
    // COMMITTEE PERSONAS - Keys must match exactly with persona IDs
    'committee-forensic-chair': 'Channel the select committee chair style of figures like Yvette Cooper or Hilary Benn - methodical, evidence-based questioning that builds cases systematically. Reference previous witness testimony, maintain formal parliamentary courtesy but be relentless in pursuing facts. Use the questioning approach seen in Hansard transcripts - start with context-setting, then drill down systematically. Remember everything they\'ve said and build your case witness by witness. CRITICAL: Keep responses to 1-4 sentences maximum in ONE SINGLE MESSAGE. NEVER send two messages. ALWAYS complete your thought fully. NEVER leave a sentence unfinished.',
    
    'committee-backbench-terrier': 'Embody the style of persistent backbench MPs like those who made their reputation holding power to account in select committees. You have no ministerial ambitions - just a burning need for truth. Apply the approach seen in parliamentary questioning where MPs circle back to unanswered questions multiple ways until getting real answers. You\'re not impressed by titles or evasions - you represent ordinary constituents who deserve straight answers. CRITICAL: Keep responses to 1-4 sentences maximum in ONE SINGLE MESSAGE. NEVER send two messages. ALWAYS complete your thought fully. NEVER leave a sentence unfinished.',
    
    'committee-technical-specialist': 'Channel the approach of subject-matter expert MPs who sit on specialist committees - those with genuine expertise in policy areas. You know the legislation inside out, previous consultations, international comparisons. Use the technically precise questioning style seen in select committee transcripts that reveals whether witnesses really understand their brief. Catch when they misstate facts or dodge technical realities. CRITICAL: Keep responses to 1-4 sentences maximum in ONE SINGLE MESSAGE. NEVER send two messages. ALWAYS complete your thought fully. NEVER leave a sentence unfinished.',

    // MEDIA PERSONAS  
    'media-political-heavyweight': 'Channel the interviewing style of Jeremy Paxman and Andrew Neil - veteran political interviewers known for forensic preparation and refusing to accept evasive answers. You\'ve done your homework like they do - you know voting records, previous statements, contradictions. Apply their approach of circling back to unanswered questions and not being deflected by political spin. You represent viewers who want straight answers, using their confrontational but professional style. CRITICAL: Keep responses to 1-4 sentences maximum in ONE SINGLE MESSAGE. NEVER send two messages. ALWAYS complete your thought fully. NEVER leave a sentence unfinished.',
    
    'media-time-pressure-broadcaster': 'Use the radio interviewing style of John Humphrys and Nick Robinson on Radio 4 Today programme - fast-paced with tight time constraints and broad audience appeal. Apply their technique of cutting through jargon, pressing for simple explanations, and moving quickly between topics. Channel their approach of making complex issues accessible to ordinary listeners with time pressure and urgency. CRITICAL: Keep responses to 1-4 sentences maximum in ONE SINGLE MESSAGE. NEVER send two messages. ALWAYS complete your thought fully. NEVER leave a sentence unfinished.',
    
    'media-investigative-journalist': 'Channel the investigative approach of journalists like those who spend weeks researching stories for programmes like Panorama or Dispatches. You have documents, sources, timeline contradictions. Build questioning like they do - each question serves a larger narrative you\'re constructing. Be patient but implacable like investigative journalists, following every thread methodically. CRITICAL: Keep responses to 1-4 sentences maximum in ONE SINGLE MESSAGE. NEVER send two messages. ALWAYS complete your thought fully. NEVER leave a sentence unfinished.',
    
    'media-sympathetic-professional': 'Use the interviewing approach of Emily Maitlis or Martha Kearney - respected broadcasters known for fair but thorough interviews. Give people space to explain complex issues like they do, while still asking tough questions when needed. Channel their style of being genuinely interested in understanding perspectives while maintaining journalistic integrity and public interest. CRITICAL: Keep responses to 1-4 sentences maximum in ONE SINGLE MESSAGE. NEVER send two messages. ALWAYS complete your thought fully. NEVER leave a sentence unfinished.',

    // CONSULTATION PERSONAS
    'consultation-concerned-local': 'You are a local resident whose life will be directly affected by this decision. You\'re not a policy expert - you\'re a real person with real concerns about your community, your family, your daily life. Ask emotional, practical questions about what this actually means for ordinary people like you. Stay grounded in personal impact, not policy theory. Remember their previous answers and hold them to commitments. CRITICAL: Keep responses to 1-4 sentences maximum in ONE SINGLE MESSAGE. NEVER send two messages. ALWAYS complete your thought fully. NEVER leave a sentence unfinished.',
    
    'consultation-business-voice': 'You are a local business owner trying to understand what this policy means for your livelihood. Think in practical terms - costs, compliance, timelines, paperwork. You\'re not hostile to progress but need to understand real-world implementation and economic impacts on small businesses like yours. Reference their previous statements about costs and timelines. CRITICAL: Keep responses to 1-4 sentences maximum in ONE SINGLE MESSAGE. NEVER send two messages. ALWAYS complete your thought fully. NEVER leave a sentence unfinished.',
    
    'consultation-informed-activist': 'You are a community activist who\'s done homework on this issue. You understand policy detail but approach from values-based perspective - social justice, environmental impact, community equity. Challenge officials to consider broader implications beyond their narrow brief, drawing on activist questioning techniques. Remember their commitments and challenge inconsistencies. CRITICAL: Keep responses to 1-4 sentences maximum in ONE SINGLE MESSAGE. NEVER send two messages. ALWAYS complete your thought fully. NEVER leave a sentence unfinished.',

    // INTERVIEW PERSONAS
    'interview-senior-stakeholder': 'You are a senior executive evaluating whether this person can operate at the level required. Ask about strategic thinking, leadership examples, how they handle pressure and ambiguity. Assess cultural fit and whether they can represent the organization externally. Use executive-level questioning approach. Build on their previous answers to assess consistency. CRITICAL: Keep responses to 1-4 sentences maximum in ONE SINGLE MESSAGE. NEVER send two messages. ALWAYS complete your thought fully. NEVER leave a sentence unfinished.',
    
    'interview-technical-evaluator': 'You are a technical expert evaluating actual competency, not just resume claims. Ask specific technical questions, present scenarios, test problem-solving in real-time. Distinguish between theoretical knowledge and practical experience through hands-on technical assessment. Reference their previous technical claims and build complexity. CRITICAL: Keep responses to 1-4 sentences maximum in ONE SINGLE MESSAGE. NEVER send two messages. ALWAYS complete your thought fully. NEVER leave a sentence unfinished.',
    
    'interview-panel-perspective': 'Represent multiple perspectives in this interview - sometimes technical, sometimes managerial, sometimes cultural fit. Shift between different types of questions as if different panel members are speaking. Evaluate comprehensively across all dimensions using varied panel interview techniques. Remember all their answers from different angles. CRITICAL: Keep responses to 1-4 sentences maximum in ONE SINGLE MESSAGE. NEVER send two messages. ALWAYS complete your thought fully. NEVER leave a sentence unfinished.',
    
    'interview-supportive-developer': 'Focus on potential and growth mindset over perfect answers. Ask about learning experiences, how they handle failure, what they want to develop. Probe for curiosity, adaptability, and genuine enthusiasm for growth using supportive but thorough questioning techniques. Build on their examples positively while still challenging them. CRITICAL: Keep responses to 1-4 sentences maximum in ONE SINGLE MESSAGE. NEVER send two messages. ALWAYS complete your thought fully. NEVER leave a sentence unfinished.'
};

// Cookie notice functionality
function checkCookieNotice() {
    // Check if user has already seen the notice
    if (!localStorage.getItem('cookieNoticeAccepted')) {
        const cookieNotice = document.getElementById('cookie-notice');
        if (cookieNotice) {
            cookieNotice.style.display = 'block';
        }
    }
}

function acceptCookies() {
    // Mark as accepted
    localStorage.setItem('cookieNoticeAccepted', 'true');
    // Hide notice
    const cookieNotice = document.getElementById('cookie-notice');
    if (cookieNotice) {
        cookieNotice.style.display = 'none';
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Starting Training Pro with double-message prevention...');
    
    initializeVoiceRecognition();
    setupEventListeners();
    
    // Add global click handler to detect duplicate button clicks
    document.addEventListener('click', function(e) {
        if (e.target.matches('.chat-input button') && isProcessingMessage) {
            console.warn('Send button clicked while processing - blocked!');
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);
    
    // Load available voices for fallback TTS
    if ('speechSynthesis' in window) {
        // Function to log available voices
        const logVoices = () => {
            const voices = speechSynthesis.getVoices();
            console.log(`Loaded ${voices.length} TTS voices`);
            const britishVoices = voices.filter(v => v.lang.includes('GB'));
            console.log(`Found ${britishVoices.length} British voices:`, britishVoices.map(v => v.name));
        };
        
        // Chrome loads voices asynchronously
        speechSynthesis.addEventListener('voiceschanged', logVoices);
        // Trigger initial voice load
        speechSynthesis.getVoices();
        // Also try loading after a delay
        setTimeout(() => speechSynthesis.getVoices(), 100);
    }
    
    // Check cookie notice
    checkCookieNotice();
    
    // Initialize first step
    updateStep(1);
    
    console.log('🔥 App loaded - ready for training!');
});

function initializeVoiceRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        
        // IMPORTANT: Set continuous to true so it doesn't stop automatically
        recognition.continuous = true;
        recognition.interimResults = true; // Show results as user speaks
        recognition.lang = 'en-GB';
        recognition.maxAlternatives = 1;
        
        // Build up the full transcript
        let fullTranscript = '';
        
        recognition.onstart = function() {
            console.log('Voice recognition started');
            fullTranscript = ''; // Reset transcript
            updateVoiceStatus('listening', 'Listening... (click to stop)');
            updateVoiceButton('recording');
        };
        
        recognition.onresult = function(event) {
            let interimTranscript = '';
            let finalTranscript = '';
            
            // Process all results
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }
            
            // Update the input field with accumulated transcript
            if (finalTranscript) {
                fullTranscript += finalTranscript;
            }
            
            const inputField = document.getElementById('user-input');
            if (inputField) {
                inputField.value = fullTranscript + interimTranscript;
            }
        };
        
        recognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            
            // Handle specific errors
            if (event.error === 'no-speech') {
                updateVoiceStatus('listening', 'No speech detected. Keep talking or click stop...');
                // Don't stop recording on no-speech error
                return;
            }
            
            updateVoiceStatus('error', 'Voice recognition error. Please try typing.');
            isRecording = false;
            updateVoiceButton('idle');
        };
        
        recognition.onend = function() {
            console.log('Voice recognition ended');
            
            // Only update UI if we're not supposed to be recording
            if (!isRecording) {
                updateVoiceButton('idle');
                updateVoiceStatus('ready', 'Ready for voice input');
                
                // Send the message if there's content (but check processing lock first)
                const inputField = document.getElementById('user-input');
                if (inputField && inputField.value.trim() && !isProcessingMessage) {
                    // Check cooldown
                    const now = Date.now();
                    if (now - lastMessageTime >= MESSAGE_COOLDOWN) {
                        sendMessage();
                    } else {
                        console.log('Cooldown active, not sending message from voice end');
                    }
                }
            } else {
                // If we're supposed to be recording but recognition ended, restart it
                console.log('Restarting recognition...');
                try {
                    recognition.start();
                } catch (e) {
                    console.error('Failed to restart recognition:', e);
                    isRecording = false;
                    updateVoiceButton('idle');
                    updateVoiceStatus('ready', 'Ready for voice input');
                }
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
    
    // Show step indicator for non-login pages
    const stepIndicator = document.querySelector('.step-indicator');
    if (stepIndicator) {
        stepIndicator.style.display = 'flex';
    }
    
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
    const summaryTopLines = document.getElementById('summary-top-lines');
    
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
    
    // Display top lines summary
    if (summaryTopLines) {
        const topLineInputs = document.querySelectorAll('.top-line');
        const lines = [];
        topLineInputs.forEach(input => {
            if (input.value.trim()) {
                lines.push(input.value.trim());
            }
        });
        summaryTopLines.textContent = lines.length > 0 ? lines.join(', ') : 'None specified';
    }
}

// UPDATED: Enhanced voice control with processing protection
function toggleVoiceRecognition() {
    if (!recognition) {
        alert('Voice recognition not supported in this browser');
        return;
    }
    
    // If already processing a message, don't allow voice recording
    if (isProcessingMessage) {
        console.log('Currently processing a message, cannot start voice recording');
        alert('Please wait for the current response before recording again');
        return;
    }
    
    if (isRecording) {
        // Stop recording
        console.log('Stopping voice recognition...');
        recognition.stop();
        isRecording = false;
        updateVoiceButton('idle');
        updateVoiceStatus('ready', 'Ready for voice input');
        
        // Send the message if there's content
        const inputField = document.getElementById('user-input');
        if (inputField && inputField.value.trim()) {
            updateVoiceStatus('processing', 'Processing...');
            
            // Add a small delay to ensure recognition has fully stopped
            setTimeout(() => {
                sendMessage();
            }, 200);
        }
    } else {
        // Check cooldown before starting
        const now = Date.now();
        if (now - lastMessageTime < MESSAGE_COOLDOWN) {
            console.log('Cooldown active, please wait...');
            alert('Please wait a moment before recording again');
            return;
        }
        
        // Start recording
        console.log('Starting voice recognition...');
        try {
            recognition.start();
            isRecording = true;
            updateVoiceButton('recording');
            updateVoiceStatus('listening', 'Listening... (click to stop)');
        } catch (e) {
            console.error('Failed to start recognition:', e);
            updateVoiceStatus('error', 'Failed to start voice recognition');
        }
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

function startTraining() {
    // Capture all form data
    const descInput = document.getElementById('scenario-description');
    const roleInput = document.getElementById('your-role');
    const contextInput = document.getElementById('company-context');
    
    if (descInput) scenarioDescription = descInput.value.trim();
    if (roleInput) userRole = roleInput.value.trim();
    if (contextInput) companyContext = contextInput.value.trim();
    
    // Collect top lines
    collectTopLines();
    
    // Skip API key modal - keys are embedded
    beginTrainingSession();
}

function beginTrainingSession() {
    // Reset conversation history for new session
    conversationHistory = [];
    
    // Reset processing lock
    isProcessingMessage = false;
    
    // Reset message tracking for fresh session
    lastInterviewerMessage = '';
    lastInterviewerMessageTime = 0;
    lastMessageTime = 0;
    currentMessageId = null;
    lastAPICallTime = 0;
    
    // Clear any pending timeouts
    if (processingTimeout) {
        clearTimeout(processingTimeout);
        processingTimeout = null;
    }
    
    // Reset ElevenLabs flag for new session
    useElevenLabs = true;
    
    // Reset voice indicator
    const indicator = document.getElementById('voice-status-indicator');
    if (indicator) {
        indicator.textContent = '🎤 VOICE ENABLED';
        indicator.style.background = '#28a745';
    }
    
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
        event.preventDefault(); // Prevent default form submission
        
        // Check if we're already processing
        if (isProcessingMessage) {
            console.log('Already processing, ignoring Enter key...');
            return;
        }
        
        // Check cooldown
        const now = Date.now();
        if (now - lastMessageTime < MESSAGE_COOLDOWN) {
            console.log('Cooldown active, ignoring Enter key...');
            return;
        }
        
        sendMessage();
    }
}

// UPDATED sendMessage with AGGRESSIVE processing lock and debouncing
const MESSAGE_COOLDOWN = 3000; // 3 second cooldown between messages

async function sendMessage() {
    // Generate unique message ID
    const messageId = Date.now() + '-' + Math.random();
    
    // Check if we're already processing this exact message
    if (currentMessageId === messageId) {
        console.log('Duplicate message detected, ignoring...');
        return;
    }
    // Check cooldown period
    const now = Date.now();
    if (now - lastMessageTime < MESSAGE_COOLDOWN) {
        console.log('Message sent too quickly, enforcing cooldown...');
        return;
    }
    
    // Check if already processing
    if (isProcessingMessage) {
        console.log('Already processing a message, ignoring...');
        return;
    }
    
    const input = document.getElementById('user-input');
    if (!input) return;
    
    const message = input.value.trim();
    if (!message) return;
    
    // AGGRESSIVE LOCK: Set multiple flags
    isProcessingMessage = true;
    lastMessageTime = now;
    currentMessageId = messageId;
    
    // Clear input IMMEDIATELY to prevent double sends
    const messageToSend = message;
    input.value = '';
    
    // Disable ALL interactive elements
    const sendButton = document.querySelector('.chat-input button');
    const voiceButton = document.getElementById('voice-toggle');
    const inputField = document.getElementById('user-input');
    
    if (sendButton) {
        sendButton.disabled = true;
        sendButton.style.opacity = '0.5';
        sendButton.style.cursor = 'not-allowed';
    }
    if (voiceButton) {
        voiceButton.disabled = true;
        voiceButton.style.opacity = '0.5';
        voiceButton.style.cursor = 'not-allowed';
    }
    if (inputField) {
        inputField.disabled = true;
        inputField.placeholder = 'Processing...';
    }
    
    try {
        console.log(`📤 Sending message (ID: ${messageId}): "${messageToSend}"`);
        
        // Add user message to conversation history
        conversationHistory.push({
            role: 'user',
            content: messageToSend,
            timestamp: new Date().toISOString()
        });
        
        addMessage(messageToSend, 'user');
        
        // Show typing indicator WITH UNIQUE ID
        const typingId = 'typing-' + Date.now();
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message interviewer';
        typingDiv.innerHTML = '<strong>Interviewer:</strong> <em>typing...</em>';
        typingDiv.id = typingId;
        
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            messagesContainer.appendChild(typingDiv);
        }
        
        // Add extra safety delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const response = await getAIResponse(messageToSend);
        console.log(`📥 Received AI response (ID: ${messageId}): "${response.substring(0, 50)}..."`);
        
        // Remove specific typing indicator
        const typingElement = document.getElementById(typingId);
        if (typingElement) {
            typingElement.remove();
        }
        
        // VERIFY we're still in the same message cycle
        if (!isProcessingMessage) {
            console.warn('Processing flag was cleared unexpectedly - aborting');
            return;
        }
        
        // Add AI response to conversation history
        conversationHistory.push({
            role: 'interviewer',
            content: response,
            timestamp: new Date().toISOString()
        });
        
        addMessage(response, 'interviewer');
        
        // Convert response to speech using your secure API
        console.log('🔊 Attempting to speak response:', response.substring(0, 50) + '...');
        await speakResponse(response);
        
        updateVoiceStatus('ready', 'Ready for voice input');
        
    } catch (error) {
        const typingElements = document.querySelectorAll('[id^="typing-"]');
        typingElements.forEach(el => el.remove());
        
        addMessage('Sorry, there was an error. Please check your connection and try again.', 'interviewer');
        console.error('Error in sendMessage:', error);
        updateVoiceStatus('error', 'Error occurred');
        
    } finally {
        // Always release the lock and re-enable UI with a delay
        processingTimeout = setTimeout(() => {
            isProcessingMessage = false;
            currentMessageId = null;
            
            const sendButton = document.querySelector('.chat-input button');
            const voiceButton = document.getElementById('voice-toggle');
            const inputField = document.getElementById('user-input');
            
            if (sendButton) {
                sendButton.disabled = false;
                sendButton.style.opacity = '1';
                sendButton.style.cursor = 'pointer';
            }
            if (voiceButton) {
                voiceButton.disabled = false;
                voiceButton.style.opacity = '1';
                voiceButton.style.cursor = 'pointer';
            }
            if (inputField) {
                inputField.disabled = false;
                inputField.placeholder = 'Or type your response...';
            }
        }, 1000); // 1 second delay before re-enabling
    }
}

function addMessage(message, sender) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;
    
    // CRITICAL: Prevent duplicate interviewer messages
    if (sender === 'interviewer') {
        const now = Date.now();
        
        // Check if this is the same message as the last one (or very similar)
        if (lastInterviewerMessage && 
            (message === lastInterviewerMessage || 
             message.substring(0, 50) === lastInterviewerMessage.substring(0, 50))) {
            console.warn('🚫 DUPLICATE MESSAGE BLOCKED:', {
                newMessage: message.substring(0, 50) + '...',
                lastMessage: lastInterviewerMessage.substring(0, 50) + '...',
                timeDiff: now - lastInterviewerMessageTime
            });
            return;
        }
        
        // Check if messages are coming too quickly (within 2 seconds)
        if (now - lastInterviewerMessageTime < 2000) {
            console.warn('🚫 MESSAGE TOO QUICK - BLOCKED:', {
                message: message.substring(0, 50) + '...',
                timeSinceLastMessage: now - lastInterviewerMessageTime
            });
            return;
        }
        
        console.log('✅ Adding interviewer message:', message.substring(0, 50) + '...');
        lastInterviewerMessage = message;
        lastInterviewerMessageTime = now;
    }
    
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

// UPDATED AI Response function with ABSOLUTE single message enforcement
const API_COOLDOWN = 2000; // 2 second cooldown between API calls

async function getAIResponse(userMessage) {
    // Check API cooldown
    const now = Date.now();
    if (now - lastAPICallTime < API_COOLDOWN) {
        console.error('API called too quickly - blocking!');
        throw new Error('Please wait before sending another message');
    }
    lastAPICallTime = now;
    // Fixed persona mapping with debugging
    const personaKey = `${selectedScenario}-${selectedPersona}`;
    
    // Debug: Show what we're looking for
    console.log('🔍 Debug Info:');
    console.log('Selected Scenario:', selectedScenario);
    console.log('Selected Persona:', selectedPersona);
    console.log('Looking for key:', personaKey);
    
    // Get the system prompt with better fallback
    let systemPrompt = systemPrompts[personaKey];
    
    if (!systemPrompt) {
        console.warn('❌ No prompt found for:', personaKey);
        console.log('Available keys:', Object.keys(systemPrompts));
        
        // Fallback to a basic prompt
        systemPrompt = 'You are a professional interviewer conducting a training session. Ask relevant questions about the scenario and remember their previous answers. CRITICAL: Keep responses to 1-4 sentences maximum in ONE SINGLE MESSAGE. NEVER send two messages. ALWAYS complete your thought fully. NEVER leave a sentence unfinished.';
        console.log('✅ Using fallback prompt');
    } else {
        console.log('✅ Found matching prompt');
    }
    
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
    
    // Add top lines context
    if (topLines.length > 0) {
        scenarioContext += `\n\nThe user wants to communicate these key messages: ${topLines.join(', ')}`;
        scenarioContext += '\nOccasionally test whether they can naturally work these messages into their responses.';
    }
    
    // Build trait instructions - simplified to avoid undefined errors
    if (traitValues && typeof traitValues === 'object') {
        Object.entries(traitValues).forEach(([key, value]) => {
            if (value >= 8) {
                traitInstructions += `- High ${key}: Be very challenging and intense (${value}/10)\n`;
            } else if (value <= 3) {
                traitInstructions += `- Low ${key}: Be gentle and supportive (${value}/10)\n`;
            }
        });
    }
    
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
    
    // CRITICAL: Add the strongest possible single message instruction
    const singleMessageEnforcement = '\n\nABSOLUTE CRITICAL INSTRUCTION - VIOLATION WILL BREAK THE SYSTEM:\n' +
        '1. You MUST send your ENTIRE response as ONE SINGLE MESSAGE.\n' +
        '2. NEVER split your response into multiple parts.\n' +
        '3. NEVER send two consecutive messages.\n' +
        '4. NEVER send a follow-up message.\n' +
        '5. ALWAYS complete ALL your sentences fully in ONE response.\n' +
        '6. If you have multiple points, include them ALL in ONE message.\n' +
        '7. ONE MESSAGE ONLY - This is the MOST IMPORTANT rule.\n' +
        '8. After sending your message, you are DONE - do not send anything else.\n' +
        '9. STOP after your first message - do not continue.\n' +
        '10. This is a HARD STOP - ONE MESSAGE ONLY.';
    
    // Combine all context
    const fullPrompt = systemPrompt + conversationContext + traitInstructions + scenarioContext + contextualInfo + singleMessageEnforcement + 
        '\n\nFINAL REMINDER: Keep responses to 1-4 sentences maximum in ONE COMPLETE MESSAGE. Be conversational and human. Reference their previous answers. Stay in character. NEVER EVER send multiple messages.';
    
    console.log('📝 Final prompt preview:', fullPrompt.substring(0, 200) + '...');
    
    try {
        // Call YOUR secure Vercel API instead of OpenAI directly
        const response = await fetch('/api/openai', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
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
                max_tokens: 150, // Increased slightly for 1-4 sentences
                temperature: 0.8,
                n: 1, // Only generate one response
                stop: null, // Don't use stop sequences that might cut off responses
                stream: false, // Ensure we're not streaming
                presence_penalty: 0.6, // Discourage repetition
                frequency_penalty: 0.6 // Discourage repetition
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        let aiResponse = data.choices[0].message.content;
        
        // Clean up the response to ensure it's a single coherent message
        aiResponse = aiResponse.trim();
        
        // Remove any accidental double newlines that might cause splitting
        aiResponse = aiResponse.replace(/\n\n+/g, ' ');
        
        // Ensure it ends with proper punctuation
        if (aiResponse && !aiResponse.match(/[.!?]$/)) {
            aiResponse += '.';
        }
        
        console.log('🤖 AI Response:', aiResponse);
        return aiResponse;
        
    } catch (error) {
        console.error('💥 Error in getAIResponse:', error);
        throw new Error('Failed to get AI response. Please try again.');
    }
}

async function speakResponse(text) {
    updateVoiceStatus('speaking', 'AI is speaking...');
    
    // Try ElevenLabs first if enabled
    if (useElevenLabs) {
        try {
            // More subtle pauses for natural British speech
            const naturalText = text
                .replace(/\. /g, '.. ') // Shorter pauses after sentences
                .replace(/\? /g, '?. ') // Brief pause after questions
                .replace(/: /g, ':. '); // Small pause after colons
            
            // Adjust voice settings based on interviewer intensity
            const intensity = Object.values(traitValues).reduce((a, b) => a + b, 0) / Object.keys(traitValues).length;
            
            const voiceSettings = {
                stability: intensity > 7 ? 0.55 : 0.65, // More natural variation
                similarity_boost: 0.75, // Balanced for British accents
                style: intensity > 7 ? 0.6 : 0.4, // More expressive
                use_speaker_boost: true
            };
            
            // Call YOUR secure Vercel API with scenario context
            const response = await fetch('/api/elevenlabs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: naturalText,
                    scenario: selectedScenario, // Pass scenario for voice selection
                    model_id: 'eleven_turbo_v2', // Turbo model for better quality
                    voice_settings: voiceSettings
                })
            });
            
            if (response.ok) {
                const audioBlob = await response.blob();
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);
                
                // Set volume and playback rate
                audio.volume = 0.9;
                audio.playbackRate = 1.05; // Slightly faster for more natural British speech
                
                // Add error handling for audio playback
                audio.onerror = (e) => {
                    console.error('Audio playback error:', e);
                    // Fall back to browser speech
                    useElevenLabs = false;
                    speakWithBrowserTTS(text);
                };
                
                // Play the audio
                const playPromise = audio.play();
                
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            console.log('Audio playing successfully');
                            // Reset voice indicator to show ElevenLabs is working
                            const indicator = document.getElementById('voice-status-indicator');
                            if (indicator) {
                                indicator.textContent = '🎤 VOICE ENABLED';
                                indicator.style.background = '#28a745';
                            }
                        })
                        .catch(error => {
                            console.error('Audio play failed:', error);
                            // Fall back to browser speech
                            useElevenLabs = false;
                            speakWithBrowserTTS(text);
                        });
                }
                
                audio.onended = () => {
                    updateVoiceStatus('ready', 'Ready for voice input');
                    URL.revokeObjectURL(audioUrl);
                };
                
                return; // Success with ElevenLabs
            } else {
                console.error('ElevenLabs API error:', response.status);
                const errorData = await response.json();
                console.error('Error details:', errorData);
                // Fall back to browser speech
                useElevenLabs = false;
            }
        } catch (error) {
            console.error('ElevenLabs error:', error);
            // Fall back to browser speech
            useElevenLabs = false;
        }
    }
    
    // Fallback to browser's built-in speech synthesis
    speakWithBrowserTTS(text);
}

function speakWithBrowserTTS(text) {
    // Update indicator to show we're using browser TTS
    const indicator = document.getElementById('voice-status-indicator');
    if (indicator) {
        indicator.textContent = '🔊 BROWSER VOICE';
        indicator.style.background = '#ffc107'; // Yellow to indicate fallback
    }
    
    if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Get available voices and prioritize British ones
        const voices = speechSynthesis.getVoices();
        
        // Look for British voices first
        const britishVoices = voices.filter(voice => 
            voice.lang.includes('en-GB') || 
            voice.lang.includes('en_GB') ||
            voice.name.toLowerCase().includes('british') ||
            voice.name.toLowerCase().includes('uk')
        );
        
        // Fallback to any English voice if no British found
        const englishVoices = voices.filter(voice => voice.lang.startsWith('en'));
        
        // Select the best available voice
        if (britishVoices.length > 0) {
            // Prefer Google UK voices or Microsoft voices which tend to sound better
            const preferredBritish = britishVoices.find(voice => 
                voice.name.includes('Google UK') || 
                voice.name.includes('Microsoft') ||
                voice.name.includes('Emma')
            );
            utterance.voice = preferredBritish || britishVoices[0];
            console.log('Using British voice:', utterance.voice.name);
        } else if (englishVoices.length > 0) {
            utterance.voice = englishVoices[0];
            console.log('Using English voice (no British found):', utterance.voice.name);
        }
        
        // Adjust speech parameters for more natural British sound
        utterance.rate = 1.1; // Slightly faster for natural British speech
        utterance.pitch = 1.0;
        utterance.volume = 0.9;
        
        utterance.onend = () => {
            updateVoiceStatus('ready', 'Ready for voice input');
        };
        
        utterance.onerror = (event) => {
            console.error('Browser TTS error:', event);
            updateVoiceStatus('ready', 'Ready for voice input (voice unavailable)');
        };
        
        speechSynthesis.speak(utterance);
    } else {
        console.warn('Speech synthesis not supported');
        updateVoiceStatus('ready', 'Ready for voice input (voice unavailable)');
    }
}

// Test function to verify persona mapping
function testPersonaMapping() {
    console.log('🧪 Testing Persona Mapping...');
    
    // Test all scenario-persona combinations
    const testCombinations = [
        // Committee
        ['committee', 'forensic-chair'],
        ['committee', 'backbench-terrier'],
        ['committee', 'technical-specialist'],
        
        // Media
        ['media', 'political-heavyweight'],
        ['media', 'time-pressure-broadcaster'],
        ['media', 'investigative-journalist'],
        ['media', 'sympathetic-professional'],
        
        // Consultation
        ['consultation', 'concerned-local'],
        ['consultation', 'business-voice'],
        ['consultation', 'informed-activist'],
        
        // Interview
        ['interview', 'senior-stakeholder'],
        ['interview', 'technical-evaluator'],
        ['interview', 'panel-perspective'],
        ['interview', 'supportive-developer']
    ];
    
    let passedTests = 0;
    let totalTests = testCombinations.length;
    
    testCombinations.forEach(([scenario, persona]) => {
        const key = `${scenario}-${persona}`;
        const prompt = systemPrompts[key];
        
        if (prompt) {
            console.log(`✅ ${key} → Found prompt`);
            passedTests++;
        } else {
            console.error(`❌ ${key} → Missing prompt!`);
        }
    });
    
    console.log(`\n📊 Test Results: ${passedTests}/${totalTests} passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All persona mappings working correctly!');
    } else {
        console.error('💥 Some persona mappings are broken - check the keys above');
        console.log('Available prompt keys:', Object.keys(systemPrompts));
    }
    
    return passedTests === totalTests;
}

// Test voice functionality
function testVoices() {
    console.log('🔊 Testing Voice System...');
    
    // Test ElevenLabs for each scenario
    const scenarios = ['committee', 'media', 'consultation', 'interview'];
    console.log('Testing ElevenLabs voices for scenarios:', scenarios);
    
    // Test browser TTS
    if ('speechSynthesis' in window) {
        const voices = speechSynthesis.getVoices();
        const britishVoices = voices.filter(v => 
            v.lang.includes('en-GB') || 
            v.lang.includes('en_GB') ||
            v.name.toLowerCase().includes('british') ||
            v.name.toLowerCase().includes('uk')
        );
        
        console.log(`Browser TTS: Found ${britishVoices.length} British voices`);
        britishVoices.forEach(v => {
            console.log(`- ${v.name} (${v.lang})`);
        });
    }
    
    // You can test a specific voice by calling:
    // speakResponse("Hello, this is a test of the voice system.");
}

// Debug function to check protection status
function debugProtection() {
    const now = Date.now();
    console.log('🛡️ PROTECTION STATUS:');
    console.log('- isProcessingMessage:', isProcessingMessage);
    console.log('- currentMessageId:', currentMessageId);
    console.log('- Time since last message:', now - lastMessageTime, 'ms');
    console.log('- Time since last API call:', now - lastAPICallTime, 'ms');
    console.log('- Last interviewer message:', lastInterviewerMessage?.substring(0, 50) + '...');
    console.log('- Time since last interviewer message:', now - lastInterviewerMessageTime, 'ms');
    console.log('- MESSAGE_COOLDOWN:', MESSAGE_COOLDOWN, 'ms');
    console.log('- API_COOLDOWN:', API_COOLDOWN, 'ms');
    console.log('- Buttons disabled:', {
        send: document.querySelector('.chat-input button')?.disabled,
        voice: document.getElementById('voice-toggle')?.disabled,
        input: document.getElementById('user-input')?.disabled
    });
}

// Global functions for onclick handlers
window.goToPage = goToPage;
window.selectScenario = selectScenario;
window.selectPersona = selectPersona;
window.startTraining = startTraining;
window.endTraining = endTraining;
window.handleKeyPress = handleKeyPress;
window.sendMessage = sendMessage;
window.toggleVoiceRecognition = toggleVoiceRecognition;
window.testPersonaMapping = testPersonaMapping;
window.testVoices = testVoices;
window.addTopLine = addTopLine;
window.removeTopLine = removeTopLine;
window.resetForNewSession = resetForNewSession;
window.signOut = signOut;
window.debugProtection = debugProtection;

// Navigation handler
window.handleNavClick = function(section) {
    console.log('Navigation to:', section);
    
    // For now, all navigation goes to page 1
    // You can expand this later to show different content
    if (section === 'home' || section === 'training') {
        goToPage(1);
    } else if (section === 'about') {
        // Could show an about modal or page in the future
        alert('About Training Pro: AI-powered training for professional interviews and media appearances.');
    }
};

// Cookie notice function
window.acceptCookies = acceptCookies;
