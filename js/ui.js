// POINT 2: Smooth sweeping animation for the hero gauge
export function animateSemiCircleGauge(percentage) {
    const path = document.getElementById('progress-path');
    const text = document.getElementById('overall-percentage');
    
    // Total length of the SVG arc is 125
    const offset = 125 - (125 * (percentage / 100));
    
    // Trigger CSS animation
    setTimeout(() => {
        path.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(0.25, 1, 0.5, 1)';
        path.style.strokeDashoffset = offset;
        text.innerText = `${percentage}%`;
    }, 100);
}

// POINT 4: To-Do Bottom Sheet Logic
export function toggleBottomSheet(show) {
    const sheet = document.getElementById('todo-sheet');
    if(show) {
        sheet.classList.remove('hidden');
        sheet.style.transform = 'translateY(0)';
    } else {
        sheet.style.transform = 'translateY(100%)';
        setTimeout(() => sheet.classList.add('hidden'), 300);
    }
}
