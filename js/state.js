export const AppState = {
    userSettings: {},
    habits: [],
    completedTodos: []
};

// POINT 7: Premium Backup using Native Share Sheet
export async function exportDataNatively() {
    const dataStr = JSON.stringify(AppState);
    const blob = new Blob([dataStr], { type: "application/json" });
    
    // Generate smart filename
    const date = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    const fileName = `HabitsPro_Backup_${date}.json`;
    const file = new File([blob], fileName, { type: "application/json" });

    // Trigger native iOS/Android Share Sheet instead of Chrome Download
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({
                files: [file],
                title: 'Habits Pro Backup',
                text: 'My secure habit tracker backup.'
            });
        } catch (error) {
            console.log('User cancelled share or share failed');
        }
    } else {
        // Fallback for desktop
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = fileName; a.click();
    }
}
