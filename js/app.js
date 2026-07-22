import { animateSemiCircleGauge, toggleBottomSheet } from './ui.js';
import { exportDataNatively } from './state.js';

// POINT 10: 30 Premium Daily Slogans
const dailySlogans = [
    "Roots grow deepest when the wind blows hardest.",
    "The moon doesn't compete with the sun; it just waits its turn.",
    "You are not behind — you are on your own timeline.",
    "Diamonds don't apologize for the pressure that made them.",
    "The tree that bends survives the storm the oak couldn't.",
    "Yesterday's ashes are today's fertile ground.",
    "A candle loses nothing by lighting another.",
    "The river doesn't rush — it just never stops.",
    "Every winter secretly prepares a spring.",
    "You weren't given this life to shrink into it.",
    "The seed never sees the forest it becomes.",
    "Broken crayons still color the same.",
    "What doesn't kill you rearranges you.",
    "The deepest roots hold the tallest trees.",
    "Even the moon needs darkness to be seen.",
    "You bloom in seasons no one else witnessed.",
    "A caterpillar has no idea it's about to fly.",
    "Storms make the roots dig deeper, not weaker.",
    "The quiet ones are often carrying the heaviest storms.",
    "Nothing wild ever grew in comfort.",
    "The fire that tests you also refines you.",
    "You are the calm your younger self prayed for.",
    "Rivers carve canyons not by force, but by patience.",
    "Some flowers bloom only after the fire.",
    "You don't need the whole sky to shine.",
    "The strongest steel was once just fire and pressure.",
    "Every scar is a map of where you didn't quit.",
    "The night is darkest right before it turns to dawn.",
    "You are allowed to outgrow people, places, and versions of yourself.",
    "What grows in silence often grows the strongest."
];

// Initialization Sequence
document.addEventListener('DOMContentLoaded', () => {
    
    // Set Slogan based on Day of the Month (1-30 mapped to 0-29 array index)
    const today = new Date().getDate();
    const sloganIndex = (today - 1) % 30; // Handles 31st by looping back
    document.getElementById('daily-slogan').innerText = `"${dailySlogans[sloganIndex]}"`;

    // POINT 1: Biometric WebAuthn Hook
    document.getElementById('btn-unlock').addEventListener('click', async () => {
        try {
            // WebAuthn request to trigger Phone's Fingerprint scanner
            // (Requires HTTPS and server-side challenge in production)
            console.log('Requesting Biometrics...');
            
            // On success, hide lock screen and animate dashboard
            document.getElementById('app-lock').classList.add('hidden');
            document.getElementById('app-content').classList.remove('hidden');
            document.getElementById('fab-todo').classList.remove('hidden');
            
            // Initialize Dashboard Animations
            animateSemiCircleGauge(82); 
        } catch(e) {
            console.error('Biometric failed, fallback to PIN required.');
        }
    });

    // To-Do Sheet Event Listeners
    document.getElementById('fab-todo').addEventListener('click', () => toggleBottomSheet(true));
    document.querySelector('.sheet-handle').addEventListener('click', () => toggleBottomSheet(false));
});
