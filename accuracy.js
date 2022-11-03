
/**
 * Calculate hit chance based on parameters
 * @param accuracy 
 * @param range 
 * @param distance 
 * @returns 
 */
export function calculateHitChance(accuracy, range, distance) {
    // Out of range check
    if (distance > range) {
        return 0.0;
    }
    
    // Range modifier breakpoints
    const range_table = [
        [0.05, 1000],
        [0.17, 100],
        [0.33, 75],
        [0.50, 50],
        [0.67, 25],
        [1.00, 0],
    ];
    
    const distance_ratio = (distance / range);
    let ratio_bonus_value = 0.0
    
    let interp_low = range_table[0][1]
    let interp_high = -1
    for (let i = 0; i < range_table.length; i++) {
        if (range_table[i][0] == distance_ratio) {
            ratio_bonus_value = range_table[i][1] / 100;
            break;
        }
        
        if (i === 0 ) {
            if (distance_ratio < range_table[i][0]) {
                ratio_bonus_value = range_table[0][1] / 100;
                break;  
            } else {
                continue;
            }
            
        } else if ( range_table[i-1][0] < distance_ratio && range_table[i][0] > distance_ratio ) {
            interp_low = range_table[i-1];
            interp_high = range_table[i];
            break;
        } else if ( i === range_table.length - 1) {
            ratio_bonus_value = range_table[i][1] / 100;
            break;
        } 
    }
    
    if (interp_high !== -1) {
        const diff = (distance_ratio - interp_low[0]) / (interp_high[0] - interp_low[0])
        const bonus = (interp_low[1] - interp_high[1]) * (1 - diff)
        ratio_bonus_value = (interp_high[1] + bonus) / 100
    }
    
    return accuracy + (ratio_bonus_value * accuracy);
}
