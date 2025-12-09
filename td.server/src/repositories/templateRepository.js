import database from '../helpers/database.connection.js';

const findAllMetadata = async (filters = {}, pagination = {}) => {
    const pool = database.getPool();
    const { search = '', tags = [], sortBy = 'created_at', sortOrder = 'desc' } = filters;
    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const whereConditions = [];
    const params = [];
    let paramCount = 1;
    
    if (search) {
        whereConditions.push(`(name ILIKE $${paramCount} OR description ILIKE $${paramCount})`);
        params.push(`%${search}%`);
        paramCount++;
    }
    
    if (tags.length > 0) {
        whereConditions.push(`tags && $${paramCount}`);
        params.push(tags);
        paramCount++;
    }
    
    // Build main query
    let query = 'SELECT id, name, description, tags, created_at, updated_at FROM template_metadata';
    if (whereConditions.length > 0) {
        query += ' WHERE ' + whereConditions.join(' AND ');
    }
    query += ` ORDER BY ${sortBy} ${sortOrder}`;
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);
    
    // Build count query
    let countQuery = 'SELECT COUNT(*) FROM template_metadata';
    if (whereConditions.length > 0) {
        countQuery += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    // Execute both queries in parallel
    const [result, countResult] = await Promise.all([
        pool.query(query, params),
        pool.query(countQuery, params.slice(0, paramCount - 1)) // Don't include limit/offset
    ]);
    
    const total = parseInt(countResult.rows[0].count, 10);
    
    return {
        templates: result.rows,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
};

const findById = async (id) => {
    const pool = database.getPool();
    
    const metadataQuery = 'SELECT * FROM template_metadata WHERE id = $1';
    const contentQuery = 'SELECT json_data FROM template_content WHERE template_id = $1';
    
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
            INSERT INTO template_metadata (name, description, tags)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        const metadataResult = await client.query(metadataQuery, [
            metadata.name,
            metadata.description || null,
            metadata.tags || [],
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
            WHERE id = $4
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

const deleteById = async (id) => {
    const pool = database.getPool();
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Delete content first (foreign key constraint)
        await client.query('DELETE FROM template_content WHERE template_id = $1', [id]);
        
        // Then delete metadata
        const result = await client.query(
            'DELETE FROM template_metadata WHERE id = $1 RETURNING id',
            [id]
        );
        
        await client.query('COMMIT');
        return result.rows.length > 0;
        
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const existsByName = async (name, excludeId = null) => {
    const pool = database.getPool();
    
    const query = excludeId
        ? 'SELECT id FROM template_metadata WHERE name = $1 AND id != $2'
        : 'SELECT id FROM template_metadata WHERE name = $1';
    
    const params = excludeId ? [name, excludeId] : [name];
    const result = await pool.query(query, params);
    
    return result.rows.length > 0;
};

export default {
    findAllMetadata,
    findById,
    create,
    update,
    deleteById,
    existsByName
};