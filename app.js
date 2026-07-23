// Point 10: 30 Premium Slogans
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

document.addEventListener('DOMContentLoaded', () => {
    
    // Set Daily Slogan
    const todayIndex = (new Date().getDate() - 1) % 30;
    document.getElementById('daily-slogan').innerText = `"${dailySlogans[todayIndex]}"`;

    // 1. Biometric Lock
    document.getElementById('btn-unlock').addEventListener('click', () => {
        document.getElementById('app-lock').classList.add('hidden');
        document.getElementById('app-content').classList.remove('hidden');
        document.getElementById('bottom-nav').classList.remove('hidden');
        document.getElementById('fab-todo').classList.remove('hidden');
        
        // Animate Gauge (e.g. 82%)
        setTimeout(() => {
            const offset = 125 - (125 * 0.82);
            document.getElementById('progress-path').style.strokeDashoffset = offset;
            document.getElementById('overall-percentage').innerText = '82%';
        }, 100);
    });

    // 2. Tab Navigation Logic
    const tabs = document.querySelectorAll('.app-tab');
    const navBtns = document.querySelectorAll('.nav-btn');

    navBtns.forEach(btn => {
        if(btn.id === 'btn-badges') return; // Skip badge button
        btn.addEventListener('click', (e) => {
            // Remove active states
            tabs.forEach(tab => tab.classList.add('hidden'));
            navBtns.forEach(b => b.classList.remove('active'));
            
            // Add active state to clicked
            const target = document.getElementById(e.target.dataset.target);
            target.classList.remove('hidden');
            e.target.classList.add('active');
        });
    });

    // 3. Modals & Bottom Sheets
    const todoSheet = document.getElementById('todo-sheet');
    document.getElementById('fab-todo').addEventListener('click', () => {
        todoSheet.classList.remove('hidden');
        todoSheet.style.transform = 'translateY(0)';
    });
    document.querySelector('.sheet-handle').addEventListener('click', () => {
        todoSheet.style.transform = 'translateY(100%)';
        setTimeout(() => todoSheet.classList.add('hidden'), 300);
    });

    const badgeModal = document.getElementById('badges-modal');
    document.getElementById('btn-badges').addEventListener('click', () => badgeModal.classList.remove('hidden'));
    document.getElementById('close-badges').addEventListener('click', () => badgeModal.classList.add('hidden'));

    // 4. BMI Calculator Math
    document.getElementById('toggle-bmi').addEventListener('click', () => {
        document.getElementById('bmi-body').classList.toggle('hidden');
    });

    const hSlider = document.getElementById('height-slider');
    const wSlider = document.getElementById('weight-slider');
    
    function updateBMI() {
        document.getElementById('h-val').innerText = hSlider.value;
        document.getElementById('w-val').innerText = wSlider.value;
        
        const hMeters = hSlider.value / 100;
        const bmi = (wSlider.value / (hMeters * hMeters)).toFixed(1);
        document.getElementById('bmi-score').innerText = bmi;
        
        // Move Pin (Range 15 to 35)
        let percent = ((bmi - 15) / 20) * 100;
        if(percent > 100) percent = 100;
        if(percent < 0) percent = 0;
        document.getElementById('bmi-pin').style.left = `${percent}%`;
    }
    
    hSlider.addEventListener('input', updateBMI);
    wSlider.addEventListener('input', updateBMI);
    updateBMI();

    // 5. Native Share Backup
    document.getElementById('btn-export').addEventListener('click', async () => {
        const dummyData = JSON.stringify({ app: "HabitsPro", status: "Backup Complete" });
        const blob = new Blob([dummyData], { type: "application/json" });
        const fileName = `HabitsPro_Backup_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.json`;
        const file = new File([blob], fileName, { type: "application/json" });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: 'Habits Backup' });
        } else {
            // Fallback for PC
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = fileName;
            a.click();
        }
    });
});
