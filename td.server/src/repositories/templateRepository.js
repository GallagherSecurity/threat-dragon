import database from '../config/database.config.js';

// Private helper - builds WHERE clause for filtering
const buildWhereClause = (filters = {}) => {
    const { search = '', tags = [] } = filters;
    const conditions = ['is_active = true'];
    const params = [];
    let paramCount = 1;

    if (search) {
        conditions.push(`(name ILIKE $${paramCount} OR description ILIKE $${paramCount})`);
        params.push(`%${search}%`);
        paramCount++;
    }

    if (tags.length > 0) {
        conditions.push(`tags && $${paramCount}`);
        params.push(tags);
        paramCount++;
    }

    return {
        whereClause: conditions.join(' AND '),
        params,
        nextParamIndex: paramCount
    };
};

const findAllMetadata = async (filters = {}, pagination = {}) => {
    const pool = database.getPool();
    const { sortBy = 'created_at', sortOrder = 'desc' } = filters;
    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;

    // Build WHERE clause once
    const { whereClause, params, nextParamIndex } = buildWhereClause(filters);

    // Main query
    const query = `
        SELECT id, name, description, tags, created_by, created_at, updated_at 
        FROM template_metadata 
        WHERE ${whereClause}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT $${nextParamIndex} OFFSET $${nextParamIndex + 1}
    `;
    const queryParams = [...params, limit, offset];

    // Count query
    const countQuery = `
        SELECT COUNT(*) 
        FROM template_metadata 
        WHERE ${whereClause}
    `;

    // Execute in parallel
    const [result, countResult] = await Promise.all([
        pool.query(query, queryParams),
        pool.query(countQuery, params)
    ]);

    return {
        data: result.rows,
        pagination: {
            page,
            limit,
            total: parseInt(countResult.rows[0].count, 10),
            totalPages: Math.ceil(parseInt(countResult.rows[0].count, 10) / limit)
        }
    };
};

const findById = async (id) => {
    const pool = database.getPool();
    
    const metadataQuery = `
        SELECT * 
        FROM template_metadata 
        WHERE id = $1 AND is_active = true
    `;
    const contentQuery = `
        SELECT json_data 
        FROM template_content 
        WHERE template_id = $1
    `;
    
    const [metadataResult, contentResult] = await Promise.all([
        pool.query(metadataQuery, [id]),
        pool.query(contentQuery, [id])
    ]);
    
    if (metadataResult.rows.length === 0) {
        return null;
    }
    
    return {
        metadata: metadataResult.rows[0],
        content: contentResult.rows[0]?.json_data || null
    };
};

const create = async (metadata, content) => {
    const pool = database.getPool();
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const metadataQuery = `
            INSERT INTO template_metadata (name, description, tags, created_by)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const metadataResult = await client.query(metadataQuery, [
            metadata.name,
            metadata.description || null,
            metadata.tags || [],
            metadata.created_by || null
        ]);
        
        const templateId = metadataResult.rows[0].id;
        
        const contentQuery = `
            INSERT INTO template_content (template_id, json_data)
            VALUES ($1, $2)
        `;
        await client.query(contentQuery, [templateId, content]);
        
        await client.query('COMMIT');
        return metadataResult.rows[0];
        
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const update = async (id, metadata) => {
    const pool = database.getPool();
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const query = `
            UPDATE template_metadata 
            SET name = $1, 
                description = $2, 
                tags = $3, 
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4 AND is_active = true
            RETURNING *
        `;
        const result = await client.query(query, [
            metadata.name,
            metadata.description,
            metadata.tags,
            id
        ]);
        
        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return null;
        }
        
        await client.query('COMMIT');
        return result.rows[0];
        
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const softDelete = async (id) => {
    const pool = database.getPool();
    
    const query = `
        UPDATE template_metadata
        SET is_active = false, 
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND is_active = true
        RETURNING id
    `;
    const result = await pool.query(query, [id]);
    return result.rows.length > 0;
};

const existsByName = async (name, excludeId = null) => {
    const pool = database.getPool();
    
    const query = excludeId
        ? 'SELECT id FROM template_metadata WHERE name = $1 AND is_active = true AND id != $2'
        : 'SELECT id FROM template_metadata WHERE name = $1 AND is_active = true';
    
    const params = excludeId ? [name, excludeId] : [name];
    const result = await pool.query(query, params);
    
    return result.rows.length > 0;
};

export default {
    findAllMetadata,
    findById,
    create,
    update,
    softDelete,
    existsByName
};