export interface PasswordStrength {
  score: number; // 0-4
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong';
  color: string;
  percentage: number;
}

export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
  strength: PasswordStrength;
}

export const validatePassword = (password: string): PasswordValidation => {
  const errors: string[] = [];
  let score = 0;

  // Check minimum length
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  } else {
    score += 1;
  }

  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else {
    score += 1;
  }

  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else {
    score += 1;
  }

  // Check for number
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  } else {
    score += 1;
  }

  // Check for special character (optional, bonus point)
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 1;
  }

  // Calculate strength
  const strength = getPasswordStrength(score, password.length);

  return {
    isValid: errors.length === 0,
    errors,
    strength,
  };
};

const getPasswordStrength = (score: number, length: number): PasswordStrength => {
  // Bonus for longer passwords
  if (length >= 12) score = Math.min(score + 1, 5);
  if (length >= 16) score = Math.min(score + 1, 5);

  if (score <= 1) {
    return {
      score: 0,
      label: 'Very Weak',
      color: '#ef4444', // red-500
      percentage: 20,
    };
  } else if (score === 2) {
    return {
      score: 1,
      label: 'Weak',
      color: '#f97316', // orange-500
      percentage: 40,
    };
  } else if (score === 3) {
    return {
      score: 2,
      label: 'Fair',
      color: '#eab308', // yellow-500
      percentage: 60,
    };
  } else if (score === 4) {
    return {
      score: 3,
      label: 'Strong',
      color: '#84cc16', // lime-500
      percentage: 80,
    };
  } else {
    return {
      score: 4,
      label: 'Very Strong',
      color: '#22c55e', // green-500
      percentage: 100,
    };
  }
};

export const getPasswordRequirements = (): string[] => {
  return [
    'At least 8 characters long',
    'One uppercase letter (A-Z)',
    'One lowercase letter (a-z)',
    'One number (0-9)',
    'One special character (!@#$%^&*) recommended',
  ];
};
