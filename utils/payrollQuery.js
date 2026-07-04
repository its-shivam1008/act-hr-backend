const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parsePaging = (query, defaultLimit = 25) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(
    1,
    Math.min(100, parseInt(query.limit, 10) || defaultLimit),
  );
  const sortBy = query.sortBy || "createdAt";
  const sortOrder = query.sortOrder === "asc" ? 1 : -1;

  return {
    page,
    limit,
    sortBy,
    sortOrder,
    skip: (page - 1) * limit,
  };
};

const buildTextSearch = (search, fields = []) => {
  if (!search) return {};

  const escaped = escapeRegex(String(search).trim());
  if (!escaped) return {};

  return {
    $or: fields.map((field) => ({
      [field]: { $regex: escaped, $options: "i" },
    })),
  };
};

const buildLocationFilter = (
  locationId,
  fields = [
    "locationId",
    "location",
    "employeeLocationId",
    "employeeLocationName",
  ],
) => {
  if (!locationId || locationId === "All" || locationId === "All Locations")
    return {};
  return {
    $or: fields.map((field) => ({ [field]: locationId })),
  };
};

const buildDateFilter = (date, fieldNames = ["createdAt"]) => {
  if (!date) return {};

  const selected = new Date(date);
  if (Number.isNaN(selected.getTime())) return {};

  const start = new Date(selected.getFullYear(), selected.getMonth(), 1);
  const end = new Date(selected.getFullYear(), selected.getMonth() + 1, 1);
  const query = { $or: [] };

  fieldNames.forEach((field) => {
    if (field === "payrollMonth") {
      const monthValue = `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, "0")}`;
      query.$or.push({ [field]: monthValue });
      return;
    }

    query.$or.push({
      [field]: {
        $gte: start,
        $lt: end,
      },
    });
  });

  return query.$or.length ? query : {};
};

const paginateModelQuery = async ({
  model,
  query = {},
  page,
  limit,
  sortBy,
  sortOrder,
  populate = [],
  transform,
}) => {
  const total = await model.countDocuments(query);
  let cursor = model.find(query);

  populate.forEach((item) => {
    cursor = cursor.populate(item.path, item.select);
  });

  cursor = cursor
    .sort({ [sortBy]: sortOrder })
    .skip((page - 1) * limit)
    .limit(limit);
  const docs = await cursor;
  const items = transform ? docs.map(transform) : docs;

  return {
    items,
    pagination: {
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

module.exports = {
  buildTextSearch,
  buildLocationFilter,
  buildDateFilter,
  parsePaging,
  paginateModelQuery,
};
