// Entrypoint for the PR Training frontend.
// Wires together firebase, auth, api, chat, voice, and router modules.
// TODO (FE-001): decompose src/script.legacy.js into the modules listed in REPO_STRUCTURE.md §3.

import './firebase.js';
import { startAuthListener } from './auth.js';
import { mountRouter } from './router.js';

startAuthListener();
mountRouter();
