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

// Conversation memory
let conversationHistory = [];
let isRecording = false;

// Voice recognition variables
let recognition = null;
let speechSynthesis = window.speechSynthesis;
let useElevenLabs = true;

// Session timer variables
let sessionStartTime = null;
let sessionTimer = null;

// Firebase Authentication Functions
auth.onAuthStateChanged(function(user) {
    console.log('🔥 Auth state changed:', user ? 'LOGGED IN' : 'LOGGED OUT');
    if (user) {
        currentUser = user;
        console.log('✅ User logged in:', user.email);
        showLoggedInState();
        if (document.getElementById('login-page').classList.contains('active')) {
            console.log('📱 Redirecting to main app...');
            goToPage(1);
        }
    } else {
        currentUser = null;
        console.log('❌ User logged out');
        showLoginPage();
    }
});

function checkFormFields() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    
    const signinBtn = document.getElementById('signin-btn');
    const signupBtn = document.getElementById('signup-btn');
    
    if (email && password && password.length >= 6) {
        signinBtn.disabled = false;
        signupBtn.disabled = false;
        signinBtn.style.opacity = '1';
        signupBtn.style.opacity = '1';
        signinBtn.style.cursor = 'pointer';
        signupBtn.style.cursor = 'pointer';
    } else {
        signinBtn.disabled = true;
        signupBtn.disabled = true;
        signinBtn.style.opacity = '0.5';
        signupBtn.style.opacity = '0.5';
        signinBtn.style.cursor = 'not-allowed';
        signupBtn.style.cursor = 'not-allowed';
    }
}

function showLoginPage() {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById('login-page').classList.add('active');
    document.getElementById('logout-link').style.display = 'none';
    document.getElementById('history-link').style.display = 'none';
    const stepIndicator = document.querySelector('.step-indicator');
    if (stepIndicator) {
        stepIndicator.style.display = 'none';
    }
}

function showLoggedInState() {
    document.getElementById('logout-link').style.display = 'block';
    document.getElementById('history-link').style.display = 'block';
}

function signInWithGoogle() {
    showAuthMessage('Signing in with Google...', 'success');
    auth.signInWithPopup(googleProvider)
        .then((result) => {
            console.log('Google sign-in successful');
            showAuthMessage('Welcome! Redirecting to training...', 'success');
        })
        .catch((error) => {
            console.error('Google sign-in error:', error);
            showAuthError(error.message);
        });
}

function signInWithEmail() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    
    if (!email || !password) {
        showAuthError('Please enter both email and password to sign in');
        return;
    }
    
    showAuthMessage('Signing in...', 'success');
    auth.signInWithEmailAndPassword(email, password)
        .then((result) => {
            console.log('Email sign-in successful');
            showAuthMessage('Welcome back! Redirecting...', 'success');
        })
        .catch((error) => {
            console.error('Email sign-in error:', error);
            showAuthError(getErrorMessage(error.code));
        });
}

function signUpWithEmail() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    
    if (!email || !password) {
        showAuthError('Please enter both email and password to create an account');
        return;
    }
    
    if (password.length < 6) {
        showAuthError('Password must be at least 6 characters long');
        return;
    }
    
    showAuthMessage('Creating your account...', 'success');
    auth.createUserWithEmailAndPassword(email, password)
        .then((result) => {
            console.log('Account created successfully');
            showAuthMessage('Account created! Welcome to Training Pro!', 'success');
        })
        .catch((error) => {
            console.error('Sign-up error:', error);
            showAuthError(getErrorMessage(error.code));
        });
}

function signOut() {
    if (confirm('Are you sure you want to sign out?')) {
        auth.signOut().then(() => {
            console.log('User signed out');
            resetApplicationState();
        });
    }
}

function showAuthError(message) {
    const errorDiv = document.getElementById('auth-error');
    const successDiv = document.getElementById('auth-success');
    successDiv.style.display = 'none';
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

function showAuthMessage(message, type) {
    const errorDiv = document.getElementById('auth-error');
    const successDiv = document.getElementById('auth-success');
    errorDiv.style.display = 'none';
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    if (type === 'success') {
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 3000);
    }
}

function getErrorMessage(errorCode) {
    switch (errorCode) {
        case 'auth/user-not-found':
            return 'No account found with this email address.';
        case 'auth/wrong-password':
            return 'Incorrect password.';
        case 'auth/email-already-in-use':
            return 'An account with this email already exists.';
        case 'auth/weak-password':
            return 'Password should be at least 6 characters.';
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/too-many-requests':
            return 'Too many failed attempts. Please try again later.';
        default:
            return 'An error occurred. Please try again.';
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
    useElevenLabs = true;
    sessionRating = 0;
    stopSessionTimer();
    
    document.body.className = '';
    document.querySelectorAll('.scenario-card').forEach(card => {
        card.classList.remove('active');
    });
    document.querySelectorAll('.persona-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const fields = ['scenario-description', 'your-role', 'company-context', 'email', 'password'];
    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) field.value = '';
    });
}

// Feedback System Functions
function setRating(rating) {
    sessionRating = rating;
    const stars = document.querySelectorAll('.star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.style.color = '#ffc107';
        } else {
            star.style.color = '#ddd';
        }
    });
}

function submitFeedback() {
    const feedback = document.getElementById('feedback-text').value.trim();
    
    if (sessionRating === 0) {
        alert('Please rate your session before submitting feedback.');
        return;
    }
    
    if (currentUser) {
        const sessionData = {
            userId: currentUser.uid,
            userEmail: currentUser.email,
            scenario: selectedScenario,
            persona: selectedPersona,
            rating: sessionRating,
            feedback: feedback,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            sessionDuration: conversationHistory.length,
            userRole: userRole,
            scenarioDescription: scenarioDescription,
            conversationCount: conversationHistory.filter(h => h.role === 'user').length
        };
        
        db.collection('trainingSessions').add(sessionData)
            .then((docRef) => {
                console.log('Session saved with ID: ', docRef.id);
                showFeedbackSuccess();
            })
            .catch((error) => {
                console.error('Error saving session: ', error);
                showFeedbackSuccess();
            });
    } else {
        showFeedbackSuccess();
    }
}

function showFeedbackSuccess() {
    const feedbackPage = document.getElementById('feedback-page');
    const successMessage = document.createElement('div');
    successMessage.style.cssText = `
        background: #28a745;
        color: white;
        padding: 1rem 2rem;
        border-radius: 10px;
        text-align: center;
        margin: 1rem auto;
        max-width: 500px;
        font-weight: 600;
        animation: slideIn 0.3s ease;
    `;
    successMessage.textContent = 'Excellent work! Your feedback has been saved. Redirecting...';
    
    feedbackPage.insertBefore(successMessage, feedbackPage.firstChild);
    
    setTimeout(() => {
        const stepIndicator = document.querySelector('.step-indicator');
        if (stepIndicator) {
            stepIndicator.style.display = 'flex';
        }
        
        resetForNewSession();
        goToPage(1);
        
        successMessage.remove();
    }, 2000);
}

function resetForNewSession() {
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
    stopSessionTimer();
    
    useElevenLabs = true;
    const indicator = document.getElementById('voice-status-indicator');
    if (indicator) {
        indicator.textContent = '🎤 VOICE ENABLED';
        indicator.style.background = '#28a745';
    }
    
    document.body.className = '';
    document.querySelectorAll('.scenario-card').forEach(card => {
        card.classList.remove('active');
    });
    document.querySelectorAll('.persona-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const fields = ['scenario-description', 'your-role', 'company-context', 'feedback-text'];
    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) field.value = '';
    });
    
    const nextBtn2 = document.getElementById('next-to-page-2');
    const nextBtn4 = document.getElementById('next-to-page-4');
    if (nextBtn2) nextBtn2.disabled = true;
    if (nextBtn4) nextBtn4.disabled = true;
    
    const fileContainers = ['policy-files', 'briefing-files'];
    fileContainers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) container.innerHTML = '';
    });
    
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
        messagesContainer.innerHTML = `
            <div class="message interviewer">
                <strong>Interviewer:</strong> Welcome to your training session. Are you ready to begin?
            </div>
        `;
    }
}

// Session Timer Functions
function startSessionTimer() {
    sessionStartTime = Date.now();
    updateSessionTimer();
    sessionTimer = setInterval(updateSessionTimer, 1000);
}

function updateSessionTimer() {
    if (!sessionStartTime) return;
    
    const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    
    const timerDisplay = document.getElementById('session-timer');
    if (timerDisplay) {
        timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

function stopSessionTimer() {
    if (sessionTimer) {
        clearInterval(sessionTimer);
        sessionTimer = null;
    }
    sessionStartTime = null;
}

// Auto-save progress function
function autoSaveProgress() {
    if (currentUser && conversationHistory.length > 0) {
        const progressData = {
            userId: currentUser.uid,
            scenario: selectedScenario,
            persona: selectedPersona,
            conversationHistory: conversationHistory,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'in-progress'
        };
        
        const sessionId = `${currentUser.uid}_${Date.now()}`;
        db.collection('sessionsInProgress').doc(sessionId).set(progressData)
            .then(() => console.log('Progress auto-saved'))
            .catch(err => console.error('Auto-save failed:', err));
    }
}

// History page functions
function showHistory() {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById('history-page').classList.add('active');
    const stepIndicator = document.querySelector('.step-indicator');
    if (stepIndicator) {
        stepIndicator.style.display = 'none';
    }
    loadTrainingHistory();
}

async function loadTrainingHistory() {
    if (!currentUser) return;
    
    const container = document.getElementById('history-container');
    if (!container) return;
    
    container.innerHTML = '<p>Loading your sessions...</p>';
    
    try {
        const sessions = await db.collection('trainingSessions')
            .where('userId', '==', currentUser.uid)
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();
        
        if (sessions.empty) {
            container.innerHTML = '<p>No previous training sessions found.</p>';
            return;
        }
        
        let html = '<div class="sessions-list">';
        sessions.forEach(doc => {
            const data = doc.data();
            const date = data.timestamp ? data.timestamp.toDate().toLocaleDateString() : 'Unknown date';
            
            html += `
                <div class="session-card" style="background: #f8f9fa; padding: 1.5rem; border-radius: 10px; margin-bottom: 1rem;">
                    <h4>${data.scenario || 'Unknown'} - ${data.persona || 'Unknown'}</h4>
                    <p>Role: ${data.userRole || 'Not specified'}</p>
                    <p>Date: ${date}</p>
                    <p>Rating: ${'⭐'.repeat(data.rating || 0)}</p>
                    <p>Messages exchanged: ${data.conversationCount || 0}</p>
                </div>
            `;
        });
        html += '</div>';
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading history:', error);
        container.innerHTML = '<p>Error loading session history.</p>';
    }
}

// Trait definitions
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

// Personas for each scenario
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

// System prompts
const systemPrompts = {
    'committee-forensic-chair': 'Channel the select committee chair style of figures like Yvette Cooper or Hilary Benn - methodical, evidence-based questioning that builds cases systematically. Reference previous witness testimony, maintain formal parliamentary courtesy but be relentless in pursuing facts. Use the questioning approach seen in Hansard transcripts - start with context-setting, then drill down systematically. Remember everything they\'ve said and build your case witness by witness. Keep responses to 1-2 sentences maximum.',
    
    'committee-backbench-terrier': 'Embody the style of persistent backbench MPs like those who made their reputation holding power to account in select committees. You have no ministerial ambitions - just a burning need for truth. Apply the approach seen in parliamentary questioning where MPs circle back to unanswered questions multiple ways until getting real answers. You\'re not impressed by titles or evasions - you represent ordinary constituents who deserve straight answers. Keep responses to 1-2 sentences maximum.',
    
    'committee-technical-specialist': 'Channel the approach of subject-matter expert MPs who sit on specialist committees - those with genuine expertise in policy areas. You know the legislation inside out, previous consultations, international comparisons. Use the technically precise questioning style seen in select committee transcripts that reveals whether witnesses really understand their brief. Catch when they misstate facts or dodge technical realities. Keep responses to 1-2 sentences maximum.',

    'media-political-heavyweight': 'Channel the interviewing style of Jeremy Paxman and Andrew Neil - veteran political interviewers known for forensic preparation and refusing to accept evasive answers. You\'ve done your homework like they do - you know voting records, previous statements, contradictions. Apply their approach of circling back to unanswered questions and not being deflected by political spin. You represent viewers who want straight answers, using their confrontational but professional style. Keep responses to 1-2 sentences maximum.',
    
    'media-time-pressure-broadcaster': 'Use the radio interviewing style of John Humphrys and Nick Robinson on Radio 4 Today programme - fast-paced with tight time constraints and broad audience appeal. Apply their technique of cutting through jargon, pressing for simple explanations, and moving quickly between topics. Channel their approach of making complex issues accessible to ordinary listeners with time pressure and urgency. Keep responses to 1-2 sentences maximum.',
    
    'media-investigative-journalist': 'Channel the investigative approach of journalists like those who spend weeks researching stories for programmes like Panorama or Dispatches. You have documents, sources, timeline contradictions. Build questioning like they do - each question serves a larger narrative you\'re constructing. Be patient but implacable like investigative journalists, following every thread methodically. Keep responses to 1-2 sentences maximum.',
    
    'media-sympathetic-professional': 'Use the interviewing approach of Emily Maitlis or Martha Kearney - respected broadcasters known for fair but thorough interviews. Give people space to explain complex issues like they do, while still asking tough questions when needed. Channel their style of being genuinely interested in understanding perspectives while maintaining journalistic integrity and public interest. Keep responses to 1-2 sentences maximum.',

    'consultation-concerned-local': 'You are a local resident whose life will be directly affected by this decision. You\'re not a policy expert - you\'re a real person with real concerns about your community, your family, your daily life. Ask emotional, practical questions about what this actually means for ordinary people like you. Stay grounded in personal impact, not policy theory. Remember their previous answers and hold them to commitments. Keep responses to 1-2 sentences maximum.',
    
    'consultation-business-voice': 'You are a local business owner trying to understand what this policy means for your livelihood. Think in practical terms - costs, compliance, timelines, paperwork. You\'re not hostile to progress but need to understand real-world implementation and economic impacts on small businesses like yours. Reference their previous statements about costs and timelines. Keep responses to 1-2 sentences maximum.',
    
    'consultation-informed-activist': 'You are a community activist who\'s done homework on this issue. You understand policy detail but approach from values-based perspective - social justice, environmental impact, community equity. Challenge officials to consider broader implications beyond their narrow brief, drawing on activist questioning techniques. Remember their commitments and challenge inconsistencies. Keep responses to 1-2 sentences maximum.',

    'interview-senior-stakeholder': 'You are a senior executive evaluating whether this person can operate at the level required. Ask about strategic thinking, leadership examples, how they handle pressure and ambiguity. Assess cultural fit and whether they can represent the organization externally. Use executive-level questioning approach. Build on their previous answers to assess consistency. Keep responses to 1-2 sentences maximum.',
    
    'interview-technical-evaluator': 'You are a technical expert evaluating actual competency, not just resume claims. Ask specific technical questions, present scenarios, test problem-solving in real-time. Distinguish between theoretical knowledge and practical experience through hands-on technical assessment. Reference their previous technical claims and build complexity. Keep responses to 1-2 sentences maximum.',
    
    'interview-panel-perspective': 'Represent multiple perspectives in this interview - sometimes technical, sometimes managerial, sometimes cultural fit. Shift between different types of questions as if different panel members are speaking. Evaluate comprehensively across all dimensions using varied panel interview techniques. Remember all their answers from different angles. Keep responses to 1-2 sentences maximum.',
    
    'interview-supportive-developer': 'Focus on potential and growth mindset over perfect answers. Ask about learning experiences, how they handle failure, what they want to develop. Probe for curiosity, adaptability, and genuine enthusiasm for growth using supportive but thorough questioning techniques. Build on their examples positively while still challenging them. Keep responses to 1-2 sentences maximum.'
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeVoiceRecognition();
    setupEventListeners();
    
    if ('speechSynthesis' in window) {
        const logVoices = () => {
            const voices = speechSynthesis.getVoices();
            console.log(`Loaded ${voices.length} TTS voices`);
            const britishVoices = voices.filter(v => v.lang.includes('GB'));
            console.log(`Found ${britishVoices.length} British voices:`, britishVoices.map(v => v.name));
        };
        
        speechSynthesis.addEventListener('voiceschanged', logVoices);
        speechSynthesis.getVoices();
        setTimeout(() => speechSynthesis.getVoices(), 100);
    }
    
    console.log('🔥 App loaded - waiting for Firebase auth...');
    showLoginPage();
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (currentPage !== 5) return;
    
    if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
        e.preventDefault();
        toggleVoiceRecognition();
    }
    
    if (e.code === 'Escape') {
        const confirmEnd = confirm('Press OK to end training session');
        if (confirmEnd) {
            endTraining();
        }
    }
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
    document.querySelectorAll('.scenario-card').forEach(card => {
        card.addEventListener('click', function() {
            selectScenario(this.dataset.scenario);
        });
    });
}

function selectScenario(scenario) {
    selectedScenario = scenario;
    
    document.querySelectorAll('.scenario-card').forEach(card => {
        card.classList.remove('active');
    });
    document.querySelector(`[data-scenario="${scenario}"]`).classList.add('active');
    
    document.body.className = `${scenario}-theme`;
    
    const nextBtn = document.getElementById('next-to-page-2');
    if (nextBtn) {
        nextBtn.disabled = false;
    }
    
    updateStep(1);
}

function goToPage(pageNumber) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById('feedback-page').classList.remove('active');
    
    const stepIndicator = document.querySelector('.step-indicator');
    if (stepIndicator) {
        stepIndicator.style.display = 'flex';
    }
    
    const targetPage = document.getElementById(`page-${pageNumber}`);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    currentPage = pageNumber;
    
    updateStep(pageNumber);
    
    if (pageNumber === 3) {
        loadPersonas();
        setupFileUploadListeners();
    } else if (pageNumber === 4) {
        updateSummary();
    } else if (pageNumber === 5) {
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
    
    document.querySelectorAll('.persona-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`[data-persona="${persona}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    const traitSliders = document.getElementById('trait-sliders');
    if (traitSliders) {
        traitSliders.style.display = 'block';
        loadTraitSliders();
    }
    
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
        traitValues[key] = 5;
        
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

function toggleVoiceRecognition() {
    if (!recognition) {
        alert('Voice recognition not supported in this browser');
        return;
    }
    
    if (isRecording) {
        recognition.stop();
        isRecording = false;
        updateVoiceButton('idle');
        updateVoiceStatus('ready', 'Ready for voice input');
    } else {
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

function startTraining() {
    const descInput = document.getElementById('scenario-description');
    const roleInput = document.getElementById('your-role');
    const contextInput = document.getElementById('company-context');
    
    if (descInput) scenarioDescription = descInput.value.trim();
    if (roleInput) userRole = roleInput.value.trim();
    if (contextInput) companyContext = contextInput.value.trim();
    
    beginTrainingSession();
}

function beginTrainingSession() {
    conversationHistory = [];
    useElevenLabs = true;
    
    const indicator = document.getElementById('voice-status-indicator');
    if (indicator) {
        indicator.textContent = '🎤 VOICE ENABLED';
        indicator.style.background = '#28a745';
    }
    
    goToPage(5);
    updateStep(5);
    startSessionTimer();
    
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
    
    conversationHistory.push({
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
    });
    
    addMessage(message, 'user');
    input.value = '';
    
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
        
        conversationHistory.push({
            role: 'interviewer',
            content: response,
            timestamp: new Date().toISOString()
        });
        
        addMessage(response, 'interviewer');
        autoSaveProgress();
        
        console.log('🔊 Attempting to speak response:', response.substring(0, 50) + '...');
        await speakResponse(response);
        
        updateVoiceStatus('ready', 'Ready for voice input');
    } catch (error) {
        const typingElement = document.getElementById('typing-indicator');
        if (typingElement) {
            typingElement.remove();
        }
        
        addMessage('Sorry, there was an error. Please check your connection and try again.', 'interviewer');
        console.error('Error in sendMessage:', error);
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
    
    console.log('🔍 Debug Info:');
    console.log('Selected Scenario:', selectedScenario);
    console.log('Selected Persona:', selectedPersona);
    console.log('Looking for key:', personaKey);
    
    let systemPrompt = systemPrompts[personaKey];
    
    if (!systemPrompt) {
        console.warn('❌ No prompt found for:', personaKey);
        console.log('Available keys:', Object.keys(systemPrompts));
        
        systemPrompt = 'You are a professional interviewer conducting a training session. Ask relevant questions about the scenario and remember their previous answers. Keep responses to 1-2 sentences maximum.';
        console.log('✅ Using fallback prompt');
    } else {
        console.log('✅ Found matching prompt');
    }
    
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
    
    let traitInstructions = '\n\nCustomized traits for this session:\n';
    
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
    
    if (traitValues && typeof traitValues === 'object') {
        Object.entries(traitValues).forEach(([key, value]) => {
            if (value >= 8) {
                traitInstructions += `- High ${key}: Be very challenging and intense (${value}/10)\n`;
            } else if (value <= 3) {
                traitInstructions += `- Low ${key}: Be gentle and supportive (${value}/10)\n`;
            }
        });
    }
    
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
    
    const fullPrompt = systemPrompt + conversationContext + traitInstructions + scenarioContext + contextualInfo + 
        '\n\nIMPORTANT: Keep responses to 1-2 sentences maximum. Be conversational and human. Reference their previous answers. Stay in character.';
    
    console.log('📝 Final prompt preview:', fullPrompt.substring(0, 200) + '...');
    
    try {
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
                max_tokens: 100,
                temperature: 0.8
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const aiResponse = data.choices[0].message.content;
        
        console.log('🤖 AI Response:', aiResponse);
        return aiResponse;
        
    } catch (error) {
        console.error('💥 Error in getAIResponse:', error);
        throw new Error('Failed to get AI response. Please try again.');
    }
}

async function speakResponse(text) {
    updateVoiceStatus('speaking', 'AI is speaking...');
    
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount < maxRetries && useElevenLabs) {
        try {
            const naturalText = text
                .replace(/\. /g, '.. ')
                .replace(/\? /g, '?. ')
                .replace(/: /g, ':. ');
            
            const intensity = Object.values(traitValues).reduce((a, b) => a + b, 0) / Object.keys(traitValues).length;
            
            const voiceSettings = {
                stability: intensity > 7 ? 0.55 : 0.65,
                similarity_boost: 0.75,
                style: intensity > 7 ? 0.6 : 0.4,
                use_speaker_boost: true
            };
            
            const response = await fetch('/api/elevenlabs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: naturalText,
                    scenario: selectedScenario,
                    model_id: 'eleven_turbo_v2',
                    voice_settings: voiceSettings
                })
            });
            
            if (response.ok) {
                const audioBlob = await response.blob();
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);
                
                audio.volume = 0.9;
                audio.playbackRate = 1.05;
                
                audio.onerror = (e) => {
                    console.error('Audio playback error:', e);
                    useElevenLabs = false;
                    speakWithBrowserTTS(text);
                };
                
                const playPromise = audio.play();
                
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            console.log('Audio playing successfully');
                            const indicator = document.getElementById('voice-status-indicator');
                            if (indicator) {
                                indicator.textContent = '🎤 VOICE ENABLED';
                                indicator.style.background = '#28a745';
                            }
                        })
                        .catch(error => {
                            console.error('Audio play failed:', error);
                            useElevenLabs = false;
                            speakWithBrowserTTS(text);
                        });
                }
                
                audio.onended = () => {
                    updateVoiceStatus('ready', 'Ready for voice input');
                    URL.revokeObjectURL(audioUrl);
                };
                
                return;
            } else {
                console.error('ElevenLabs API error:', response.status);
                const errorData = await response.json();
                console.error('Error details:', errorData);
                retryCount++;
                
                if (retryCount < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } else {
                    useElevenLabs = false;
                }
            }
        } catch (error) {
            console.error('ElevenLabs error:', error);
            retryCount++;
            
            if (retryCount < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                useElevenLabs = false;
            }
        }
    }
    
    speakWithBrowserTTS(text);
}

function speakWithBrowserTTS(text) {
    const indicator = document.getElementById('voice-status-indicator');
    if (indicator) {
        indicator.textContent = '🔊 BROWSER VOICE';
        indicator.style.background = '#ffc107';
    }
    
    if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        const voices = speechSynthesis.getVoices();
        
        const britishVoices = voices.filter(voice => 
            voice.lang.includes('en-GB') || 
            voice.lang.includes('en_GB') ||
            voice.name.toLowerCase().includes('british') ||
            voice.name.toLowerCase().includes('uk')
        );
        
        const englishVoices = voices.filter(voice => voice.lang.startsWith('en'));
        
        if (britishVoices.length > 0) {
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
        
        utterance.rate = 1.1;
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

function endTraining() {
    if (confirm('Are you sure you want to end this training session?')) {
        stopSessionTimer();
        
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        document.getElementById('feedback-page').classList.add('active');
        
        const stepIndicator = document.querySelector('.step-indicator');
        if (stepIndicator) {
            stepIndicator.style.display = 'none';
        }
        
        updateVoiceStatus('ready', 'Session ended');
    }
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
window.signInWithGoogle = signInWithGoogle;
window.signInWithEmail = signInWithEmail;
window.signUpWithEmail = signUpWithEmail;
window.signOut = signOut;
window.checkFormFields = checkFormFields;
window.setRating = setRating;
window.submitFeedback = submitFeedback;
window.showHistory = showHistory;
