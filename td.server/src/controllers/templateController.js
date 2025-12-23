
import loggerHelper from '../helpers/logger.helper.js';
import repositories from "../repositories";
import { serverError, badRequest, notFound } from './errors.js';

const logger = loggerHelper.get('controllers/templateController.js');

const listTemplates = async (req, res) => {
    const repository = repositories.get();
    
    try {
        // Extract and validate query params
        const filters = {
            search: (req.query.searchQuery || req.query.search || '').trim(),
            tags: req.query.tags ? req.query.tags.split(',').filter(t => t.trim()) : []
        };
        
        const pagination = {
            page: parseInt(req.query.page, 10) || 1,
            limit: parseInt(req.query.limit, 10) || 20
        };
        
        // Validate pagination bounds
        if (pagination.page < 1 || pagination.limit < 1 || pagination.limit > 100) {
            return badRequest('Invalid pagination parameters: page and limit must be positive, limit max 100', res, logger);
        }
        
        logger.debug(`API listTemplates request: ${logger.transformToString(req)}`);

        let templatesResp;
        try {
            templatesResp = await repository.listTemplatesAsync(req.provider.access_token);
        } catch (e) {
            if (e.statusCode === 404) {
                return res.status(200).json({
                    status: 200,
                    data: {
                        templates: [],
                        pagination: { page: 1, limit: pagination.limit, total: 0, totalPages: 0 }
                    }
                });
            }
            throw e;
        }
        
        let templates;
        try {
            const decoded = Buffer.from(templatesResp[0].content, 'base64').toString('utf8');
            const parsed = JSON.parse(decoded);
            templates = Array.isArray(parsed) ? parsed : (parsed.templates || []);
        } catch (parseErr) {
            logger.error('Failed to parse template metadata:', parseErr);
            return serverError('Invalid template data format', res, logger);
        }
        
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            templates = templates.filter(t => 
                (t.name || '').toLowerCase().includes(searchLower) ||
                (t.description || '').toLowerCase().includes(searchLower)
            );
        }
        
        if (filters.tags && filters.tags.length > 0) {
            templates = templates.filter(t =>
                filters.tags.some(tag => (t.tags || []).includes(tag))
            );
        }
        
        const total = templates.length;
        const totalPages = Math.ceil(total / pagination.limit);
        const start = (pagination.page - 1) * pagination.limit;
        const paginatedTemplates = templates.slice(start, start + pagination.limit);

        return res.status(200).json({
            status: 200,
            data: {
                templates: paginatedTemplates,
                pagination: {
                    page: pagination.page,
                    limit: pagination.limit,
                    total: total,
                    totalPages: totalPages
                }
            }
        });
    } catch (err) {
        logger.error(err);
        return serverError(err.message || 'Failed to retrieve templates', res, logger);
    }
};

const importTemplate = async (req, res) => {
    const repository = repositories.get();
    const accessToken = req.provider.access_token;
    
    try {
        // Extract and validate template data
        const {  templateMetadata,  model } = req.body;
        const effectiveTemplate = { 
            metadata: templateMetadata,
            model:  model
        };

        // Validate payload
        if (!effectiveTemplate || !effectiveTemplate.metadata || !effectiveTemplate.model) {
            return badRequest('Invalid template payload: expected metadata and model', res, logger);
        }

        const { metadata, model: templateModel } = effectiveTemplate;
        
        if (!metadata.name || !metadata.modelRef) {
            return badRequest('Template metadata must include name and modelRef', res, logger);
        }
        
        logger.debug(`API importTemplate request: ${logger.transformToString(req)}`);

        try {
            // Fetch existing metadata file
            const result = await repository.listTemplatesAsync(accessToken);
            const currentSha = result[0].sha;
            
            let existingTemplates;
            try {
                const decoded = Buffer.from(result[0].content, 'base64').toString('utf8');
                const parsed = JSON.parse(decoded);
                existingTemplates = Array.isArray(parsed) ? parsed : (parsed.templates || []);
            } catch (parseErr) {
                logger.error('Failed to parse existing templates:', parseErr);
                return serverError('Invalid existing template data format', res, logger);
            }

            // Duplicate check
            const isDuplicate = existingTemplates.some(t => 
                (t.name || '').toLowerCase() === metadata.name.toLowerCase()
            );

            if (isDuplicate) {
                return badRequest(`A template with the name "${metadata.name}" already exists`, res, logger);
            }

            // Add new template metadata
            const newMetadataEntry = { ...metadata };
            existingTemplates.push(newMetadataEntry);

            // Update metadata file and create content file
            await repository.updateMetadataAsync(accessToken, existingTemplates, currentSha);
            await repository.createContentFileAsync(accessToken, metadata.modelRef, templateModel);

            return res.status(201).json({ 
                status: 201, 
                message: "Template imported successfully" 
            });

        } catch (error) {
            if (error.statusCode === 404) {
                logger.debug('Index not found, creating new one...');
                
                try {
                    const newTemplates = [{ ...metadata }];
                    await repository.addTemplateMetadataAsync(accessToken, newTemplates, null);
                    await repository.createContentFileAsync(accessToken, metadata.modelRef, templateModel);
                    return res.status(201).json({ 
                        status: 201, 
                        message: "Template imported successfully (new index created)" 
                    });
                } catch (bootstrapError) {
                    logger.error('Failed to bootstrap templates:', bootstrapError);
                    return serverError(`Failed to create template index: ${bootstrapError.message}`, res, logger);
                }
            }
            
            throw error;
        }
    } catch (error) {
        logger.error('Import template error:', error);
        return serverError(error.message || 'Failed to import template', res, logger);
    }
};

const deleteTemplate = async (req, res) => {
    const repository = repositories.get();
    const accessToken = req.provider.access_token;
    const { id } = req.params;
    
    try {
        if (!id) {
            return badRequest('Template ID is required', res, logger);
        }
        
        logger.debug(`API deleteTemplate request: ${logger.transformToString(req)}`);

        // 1. Fetch current metadata
        let result, sha, existingTemplates;
        try {
            result = await repository.listTemplatesAsync(accessToken);
            const file = result[0];
            sha = file.sha;
            
            const decoded = Buffer.from(file.content, 'base64').toString('utf8');
            const parsed = JSON.parse(decoded);
            existingTemplates = Array.isArray(parsed) ? parsed : (parsed.templates || []);
        } catch (parseErr) {
            logger.error('Failed to parse template metadata:', parseErr);
            return serverError('Invalid template data format', res, logger);
        }
        
        // 2. Find and remove the template
        const templateToDelete = existingTemplates.find(t => t.id === id);
        if (!templateToDelete) {
            return notFound(`Template with ID "${id}" not found`, res, logger);
        }

        const updatedTemplates = existingTemplates.filter(t => t.id !== id);

        // 3. Delete content file and update metadata
        await repository.deleteContentFileAsync(accessToken, templateToDelete.modelRef);
        await repository.updateMetadataAsync(accessToken, updatedTemplates, sha);
        
        return res.status(200).json({ 
            status: 200, 
            message: 'Template deleted successfully' 
        });
    } catch (err) {
        logger.error(err);
        return serverError(err.message || 'Failed to delete template', res, logger);
    }
};


const updateTemplate = async (req, res) => {
    const repository = repositories.get();
    const accessToken = req.provider.access_token;
    const { id } = req.params; 
    const { name, description, tags } = req.body; 
    
    try {
        if (!id) {
            return badRequest('Template ID is required', res, logger);
        }
        
        if (!name || typeof name !== 'string') {
            return badRequest('Template name is required and must be a string', res, logger);
        }
        
        logger.debug(`API updateTemplate request: ${logger.transformToString(req)}`);

        let result, sha, existingTemplates;
        try {
            result = await repository.listTemplatesAsync(accessToken);
            const file = result[0];
            sha = file.sha;

            const decoded = Buffer.from(file.content, 'base64').toString('utf8');
            const parsed = JSON.parse(decoded);
            existingTemplates = Array.isArray(parsed) ? parsed : (parsed.templates || []);
        } catch (parseErr) {
            logger.error('Failed to parse template metadata:', parseErr);
            return serverError('Invalid template data format', res, logger);
        }

        const templateIndex = existingTemplates.findIndex(t => t.id === id);
        if (templateIndex === -1) {
            return notFound(`Template with ID "${id}" not found`, res, logger);
        }

        // Update metadata but preserve id and modelRef
        existingTemplates[templateIndex] = {
            ...existingTemplates[templateIndex],
            name: name.trim(),
            ...(description && { description: description.trim() }),
            ...(Array.isArray(tags) && { tags }),
            id: id,  // Preserve original id
            modelRef: existingTemplates[templateIndex].modelRef  // Preserve original modelRef
        };

        await repository.updateMetadataAsync(accessToken, existingTemplates, sha);

        return res.status(200).json({ 
            status: 200, 
            message: 'Template updated successfully' 
        });
    } catch (err) {
        logger.error(err);
        return serverError(err.message || 'Failed to update template', res, logger);
    }
};

const getTemplateContent = async (req, res) => {
    const repository = repositories.get();
    const accessToken = req.provider.access_token;
    const { id } = req.params;

    try {
        if (!id) {
            return badRequest('Template ID is required', res, logger);
        }

        logger.debug(`API getTemplateContent request: ${logger.transformToString(req)}`);

        // 1. Fetch metadata to get modelRef
        let result, existingTemplates;
        try {
            result = await repository.listTemplatesAsync(accessToken);
            const file = result[0];

            const decoded = Buffer.from(file.content, 'base64').toString('utf8');
            const parsed = JSON.parse(decoded);
            existingTemplates = Array.isArray(parsed) ? parsed : (parsed.templates || []);
        } catch (parseErr) {
            logger.error('Failed to parse template metadata:', parseErr);
            return serverError('Invalid template data format', res, logger);
        }

        // 2. Find template by id
        const template = existingTemplates.find(t => t.id === id);
        if (!template) {
            return notFound(`Template with ID "${id}" not found`, res, logger);
        }

        // 3. Fetch content file using modelRef
        try {
            const contentResult = await repository.getContentFileAsync(accessToken, template.modelRef);
            const contentFile = contentResult[0];

            let templateContent;
            try {
                const decoded = Buffer.from(contentFile.content, 'base64').toString('utf8');
                templateContent = JSON.parse(decoded);
            } catch (parseErr) {
                logger.error('Failed to parse template content:', parseErr);
                return serverError('Invalid template content format', res, logger);
            }

            return res.status(200).json({
                status: 200,
                data: {
                    content: templateContent,
                    metadata: template
                }
            });
        } catch (error) {
            if (error.statusCode === 404) {
                return notFound(`Template content for "${template.name}" not found`, res, logger);
            }
            throw error;
        }
    } catch (err) {
        logger.error(err);
        return serverError(err.message || 'Failed to retrieve template content', res, logger);
    }
};

const bootstrapTemplateRepository = async (req, res) => {
    const repository = repositories.get();
    const accessToken = req.provider.access_token;

    try {
        logger.debug(`API bootstrapTemplateRepository request: ${logger.transformToString(req)}`);

        // Create empty template_info.json file
        await repository.createMetadataAsync(accessToken);

        return res.status(201).json({
            status: 201,
            message: 'Template repository initialized successfully'
        });
    } catch (err) {
        logger.error(err);
        return serverError(err.message || 'Failed to initialize template repository', res, logger);
    }
};

export default {
    listTemplates,
    importTemplate,
    deleteTemplate,
    updateTemplate,
    getTemplateContent,
    bootstrapTemplateRepository
};
