export function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value).trim());
}

export function isValidPhone(value) {
  const digits = String(value).replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 13;
}

export function isValidUsername(value) {
  return /^[a-zA-Z0-9._]{4,20}$/.test(String(value).trim());
}

export function isValidPassword(value) {
  return String(value).length >= 6;
}

export function isPositiveNumber(value) {
  return !isBlank(value) && Number.isFinite(Number(value)) && Number(value) > 0;
}

export function isNonNegativeNumber(value) {
  return !isBlank(value) && Number.isFinite(Number(value)) && Number(value) >= 0;
}

export function isPastOrToday(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return date.getTime() <= endOfToday.getTime();
}

export function validateHosteller(values, { hostellers, admins, hostellerId } = {}) {
  const errors = {};
  const isEdit = Boolean(hostellerId);

  if (isBlank(values.fullName) || String(values.fullName).trim().length < 3) {
    errors.fullName = 'Enter the full name (at least 3 characters).';
  }
  if (isBlank(values.phone)) {
    errors.phone = 'Phone number is required.';
  } else if (!isValidPhone(values.phone)) {
    errors.phone = 'Enter a valid phone number (10–13 digits).';
  }
  if (isBlank(values.email)) {
    errors.email = 'Email address is required.';
  } else if (!isValidEmail(values.email)) {
    errors.email = 'Enter a valid email address.';
  }
  if (isBlank(values.joinDate)) {
    errors.joinDate = 'Date of joining is required.';
  } else if (!isPastOrToday(values.joinDate)) {
    errors.joinDate = 'Date of joining cannot be in the future.';
  }
  if (isBlank(values.emergencyContact)) {
    errors.emergencyContact = 'Emergency contact is required.';
  } else if (String(values.emergencyContact).replace(/\D/g, '').length < 10) {
    errors.emergencyContact = 'Include a phone number with at least 10 digits.';
  }

  if (isBlank(values.idType)) errors.idType = 'Select an ID type.';
  if (isBlank(values.idNumber) || String(values.idNumber).trim().length < 4) {
    errors.idNumber = 'Enter a valid ID number.';
  }

  if (isBlank(values.roomNumber)) errors.roomNumber = 'Room number is required.';
  if (isBlank(values.bedNumber)) errors.bedNumber = 'Bed number is required.';
  if (!isPositiveNumber(values.monthlyRent)) {
    errors.monthlyRent = 'Monthly rent must be greater than zero.';
  }
  if (!isEdit && !isBlank(values.advanceDeposit) && !isNonNegativeNumber(values.advanceDeposit)) {
    errors.advanceDeposit = 'Advance must be zero or more.';
  }
  const dueDay = Number(values.rentDueDay);
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 28) {
    errors.rentDueDay = 'Choose a rent due day between 1 and 28.';
  }

  if (values.washingEnabled) {
    if (!isNonNegativeNumber(values.washingAmount)) {
      errors.washingAmount = 'Enter the subscription amount (zero or more).';
    }
    if (isBlank(values.washingStartDate)) {
      errors.washingStartDate = 'Subscription start date is required.';
    }
  }

  if (isBlank(values.username)) {
    errors.username = 'Username is required.';
  } else if (!isValidUsername(values.username)) {
    errors.username = 'Use 4–20 letters, numbers, dots or underscores.';
  } else {
    const username = String(values.username).trim().toLowerCase();
    const hostellerClash = (hostellers || []).some(
      (item) => item.id !== hostellerId && item.username.toLowerCase() === username,
    );
    const adminClash = (admins || []).some((item) => item.username.toLowerCase() === username);
    if (hostellerClash || adminClash) {
      errors.username = 'That username is already taken.';
    }
  }

  if (isBlank(values.password) && !isEdit) {
    errors.password = 'Password is required.';
  } else if (!isBlank(values.password) && !isValidPassword(values.password)) {
    errors.password = 'Password must be at least 6 characters.';
  }

  return errors;
}

export function validatePayment(values, { pending }) {
  const errors = {};
  if (!isPositiveNumber(values.amount)) {
    errors.amount = 'Enter a payment amount greater than zero.';
  } else if (Number(values.amount) > Number(pending) + 0.01) {
    errors.amount = `Amount cannot exceed the pending rent of ₹${Number(pending).toLocaleString('en-IN')}.`;
  }
  if (isBlank(values.date)) {
    errors.date = 'Payment date is required.';
  } else if (!isPastOrToday(values.date)) {
    errors.date = 'Payment date cannot be in the future.';
  }
  if (isBlank(values.method)) errors.method = 'Select a payment method.';
  if (values.method && values.method !== 'Cash' && isBlank(values.reference)) {
    errors.reference = 'Add a transaction ID or reference for non-cash payments.';
  }
  return errors;
}

export function validateAdvance(values, { balance }) {
  const errors = {};
  if (isBlank(values.type)) errors.type = 'Select an entry type.';
  if (!isPositiveNumber(values.amount)) {
    errors.amount = 'Enter an amount greater than zero.';
  } else if (values.type === 'refund' && Number(values.amount) > Number(balance) + 0.01) {
    errors.amount = `Refund cannot exceed the current advance balance of ₹${Number(balance).toLocaleString('en-IN')}.`;
  }
  if (isBlank(values.date)) {
    errors.date = 'Date is required.';
  } else if (!isPastOrToday(values.date)) {
    errors.date = 'Date cannot be in the future.';
  }
  if (isBlank(values.method)) errors.method = 'Select a payment method.';
  return errors;
}

export function validatePoll(values, { polls } = {}) {
  const errors = {};
  if (isBlank(values.weekStart)) {
    errors.weekStart = 'Select the week start date.';
  } else if ((polls || []).some((poll) => poll.weekStart === values.weekStart)) {
    errors.weekStart = 'A poll already exists for this week.';
  }
  if (isBlank(values.deadline)) {
    errors.deadline = 'Set a submission deadline.';
  } else if (new Date(values.deadline).getTime() <= Date.now()) {
    errors.deadline = 'The deadline must be in the future.';
  }
  (values.days || []).forEach((day) => {
    if (isBlank(day.breakfast)) errors[`breakfast-${day.date}`] = 'Required';
    if (isBlank(day.lunch)) errors[`lunch-${day.date}`] = 'Required';
    if (isBlank(day.dinner)) errors[`dinner-${day.date}`] = 'Required';
  });
  return errors;
}
