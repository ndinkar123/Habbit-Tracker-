// POINT 6: BMI Math Logic
export function calculateBMI(heightCm, weightKg) {
    const heightM = heightCm / 100;
    const bmi = (weightKg / (heightM * heightM)).toFixed(1);
    
    // Calculate target weight for 'Normal' center (BMI 21.7)
    const idealWeight = (21.7 * (heightM * heightM)).toFixed(1);
    const difference = (weightKg - idealWeight).toFixed(1);
    
    return { bmi, idealWeight, difference };
}

// POINT 9: RPG Progression Logic
export const BadgeLibrary = [
    { id: 'first_blood', name: 'First Blood', req: 'Complete 1 habit', unlocked: false },
    { id: 'the_machine', name: 'The Machine', req: '21 Day Streak', unlocked: false },
    { id: 'the_titan', name: 'The Titan', req: '10,000 Completions', unlocked: false }
];
