const toNullableNumber = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const ensurePositiveInteger = (value, fieldName, createError) => {
  const errorFactory = typeof createError === 'function' ? createError : (message) => new Error(message);

  if (value === undefined || value === null) {
    throw errorFactory(`${fieldName} is required`);
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw errorFactory(`${fieldName} must be a positive integer`);
  }

  return parsed;
};

module.exports = {
  toNullableNumber,
  ensurePositiveInteger
};
