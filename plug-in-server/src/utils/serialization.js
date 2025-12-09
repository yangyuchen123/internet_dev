const ensureJson = (value, fieldName) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (error) {
      throw new Error(`${fieldName} must be serializable JSON`);
    }
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (!trimmed) {
      return null;
    }

    try {
      JSON.parse(trimmed);
      return trimmed;
    } catch (error) {
      throw new Error(`${fieldName} must be a valid JSON string`);
    }
  }

  throw new Error(`${fieldName} must be an object or JSON string`);
};

const parseJsonColumn = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'object' && !Buffer.isBuffer(value)) {
    return value;
  }

  const normalized = Buffer.isBuffer(value) ? value.toString('utf8') : String(value);

  try {
    return JSON.parse(normalized);
  } catch (error) {
    return normalized;
  }
};

const normalizeDate = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
};

const ensureStringContent = (value) => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  try {
    return JSON.stringify(value ?? {});
  } catch (_error) {
    return '{}';
  }
};

const serializeMetadata = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }

  try {
    return JSON.stringify(value);
  } catch (_error) {
    return null;
  }
};

module.exports = {
  ensureJson,
  parseJsonColumn,
  normalizeDate,
  ensureStringContent,
  serializeMetadata
};
