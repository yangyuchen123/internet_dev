const { normalizeDate } = require('./serialization');

const mapAgentRow = (row) => ({
  id: Number(row.id),
  name: row.name,
  description: row.description ?? null,
  avatar: row.avatar ?? null,
  category: row.category,
  url: row.url ?? null,
  connectType: row.connect_type,
  isTested: Number(row.is_tested) === 1,
  isPublic: Number(row.is_public) === 1,
  createdAt: normalizeDate(row.created_at),
  updatedAt: normalizeDate(row.updated_at)
});

const fetchAgent = async (fastify, agentId) => {
  const rows = await fastify.mysql.query(
    'SELECT id, name, description, avatar, category, url, connect_type, is_tested, is_public, created_at, updated_at FROM agent WHERE id = ? LIMIT 1',
    [agentId]
  );

  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  return mapAgentRow(rows[0]);
};

const fetchAgentWithOwnership = async (fastify, agentId, userId) => {
  const rows = await fastify.mysql.query(
    'SELECT a.id, a.name, a.description, a.avatar, a.category, a.url, a.connect_type, a.is_tested, a.is_public, a.created_at, a.updated_at, ua.is_owner FROM agent a LEFT JOIN user_agent ua ON ua.agent_id = a.id AND ua.user_id = ? WHERE a.id = ? LIMIT 1',
    [userId, agentId]
  );

  if (!Array.isArray(rows) || rows.length === 0) {
    return { agent: null, isOwner: false };
  }

  const row = rows[0];

  return {
    agent: mapAgentRow(row),
    isOwner: Number(row.is_owner) === 1
  };
};

module.exports = {
  mapAgentRow,
  fetchAgent,
  fetchAgentWithOwnership
};
