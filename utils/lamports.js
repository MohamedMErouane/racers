/**
 * Utility functions for SOL to lamports conversion with BigInt precision
 * Handles large amounts without precision loss
 */

/**
 * Convert a string representation of SOL to lamports (BigInt)
 * @param {string} str - String representation of SOL amount
 * @returns {BigInt} - Lamports as BigInt
 */
function stringToLamports(str) {
  try {
    // Validate input
    if (typeof str !== 'string' || str.trim() === '') {
      return BigInt(0);
    }
    
    // Split into integer and fractional parts
    const [integerPart, fractionalPart = ''] = str.split('.');
    
    // Pad fractional part to 9 decimal places and truncate if longer
    const paddedFractional = fractionalPart.padEnd(9, '0').slice(0, 9);
    
    // Combine integer and fractional parts
    const lamportsStr = integerPart + paddedFractional;
    
    return BigInt(lamportsStr);
  } catch (error) {
    console.error('Error converting string to lamports:', error);
    return BigInt(0);
  }
}

/**
 * Convert a number representation of SOL to lamports (BigInt)
 * @param {number} sol - SOL amount as number
 * @returns {BigInt} - Lamports as BigInt
 */
function solToLamports(sol) {
  // Validate input is numeric
  if (typeof sol !== 'number' || isNaN(sol)) {
    throw new Error('Invalid numeric value for SOL conversion');
  }
  
  return stringToLamports(sol.toString());
}

/**
 * Convert lamports (BigInt) back to string representation of SOL
 * @param {BigInt|string|number} lamports - Lamports amount
 * @returns {string} - SOL amount as string
 */
function lamportsToString(lamports) {
  try {
    // Convert lamports back to string balance (in SOL) using big-number arithmetic
    const lamportsStr = lamports.toString();
    
    // Pad with leading zeros if needed to ensure at least 10 digits (for 9 decimal places)
    const paddedLamports = lamportsStr.padStart(10, '0');
    
    // Split into integer and fractional parts
    const integerPart = paddedLamports.slice(0, -9) || '0';
    const fractionalPart = paddedLamports.slice(-9);
    
    // Remove trailing zeros from fractional part
    const trimmedFractional = fractionalPart.replace(/0+$/, '');
    
    // Return formatted SOL amount
    if (trimmedFractional === '') {
      return integerPart;
    } else {
      return `${integerPart}.${trimmedFractional}`;
    }
  } catch (error) {
    console.error('Error converting lamports to string:', error);
    return '0.000000000';
  }
}

module.exports = {
  stringToLamports,
  solToLamports,
  lamportsToString
};
