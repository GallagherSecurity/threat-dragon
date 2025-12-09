import templateRepository from '../repositories/templateRepository.js';
import loggerHelper from '../helpers/logger.helper.js';

import responseWrapper from './responseWrapper.js';
import errors from './errors.js';

const logger = loggerHelper.get('controllers/templateController.js');

const getTemplateMetadata = async (req, res) => responseWrapper.sendResponseAsync(async () => {

        const filters = {
            search: req.query.search || '',
            tags: req.query.tags ? req.query.tags.split(',') : [],
            sortBy: req.query.sortBy || 'created_at',
            sortOrder: req.query.sortOrder || 'desc'
        };
        
        const pagination = {
            page: parseInt(req.query.page,10) || 1,
            limit: Math.min(parseInt(req.query.limit,10) || 20, 100)
        };
        
        const result = await templateRepository.findAllMetadata(filters, pagination);
        return result;
    }, req, res, logger);


const getTemplateById = async (req, res) => {
    try {
        const { id } = req.params;
        const template = await templateRepository.findById(id);
        
        if (!template) {
            return res.status(404).json({ 
                error: { code: 'TEMPLATE_NOT_FOUND', message: 'Template not found' } 
            });
        }
        
        return res.json(template);
    } catch (error) {
        logger.error(error);
        return errors.serverError('Failed to fetch template', res, logger);
    }
};


const createTemplate = async (req, res) => {
    try {
        const { name, description, tags, content } = req.body;
        
        // Validation
        if (!name || name.trim().length === 0) {
            return res.status(400).json({ 
                error: { 
                    code: 'VALIDATION_ERROR', 
                    message: 'Name is required',
                    details: { field: 'name' }
                } 
            });
        }
        
        if (name.length > 255) {
            return res.status(400).json({ 
                error: { 
                    code: 'VALIDATION_ERROR', 
                    message: 'Name must be 255 characters or less',
                    details: { field: 'name' }
                } 
            });
        }
        
        if (!content) {
            return res.status(400).json({ 
                error: { 
                    code: 'VALIDATION_ERROR', 
                    message: 'Content is required',
                    details: { field: 'content' }
                } 
            });
        }
        
        // Check for duplicate name
        const exists = await templateRepository.existsByName(name);
        if (exists) {
            return res.status(400).json({ 
                error: { 
                    code: 'VALIDATION_ERROR', 
                    message: 'Template name already exists',
                    details: { field: 'name', constraint: 'unique' }
                } 
            });
        }
        
        const metadata = { name: name.trim(), description, tags };
        const result = await templateRepository.create(metadata, content);
        
        res.status(201).json(result);
    } catch (error) {
         logger.error(error);
         return errors.serverError('Error creating template', res, logger);
    }
};

const updateTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, tags } = req.body;
        
        // Validation
        if (!name || name.trim().length === 0) {
            return res.status(400).json({ 
                error: { 
                    code: 'VALIDATION_ERROR', 
                    message: 'Name is required',
                    details: { field: 'name' }
                } 
            });
        }
        
        if (name.length > 255) {
            return res.status(400).json({ 
                error: { 
                    code: 'VALIDATION_ERROR', 
                    message: 'Name must be 255 characters or less',
                    details: { field: 'name' }
                } 
            });
        }
    
        
        // Check for duplicate name (excluding current template)
        const exists = await templateRepository.existsByName(name, id);
        if (exists) {
            return res.status(400).json({ 
                error: { 
                    code: 'VALIDATION_ERROR', 
                    message: 'Template name already exists',
                    details: { field: 'name', constraint: 'unique' }
                } 
            });
        }
        
        const metadata = { name: name.trim(), description, tags };
        const result = await templateRepository.update(id, metadata);
        
        if (!result) {
            return res.status(404).json({ 
                error: { 
                    code: 'TEMPLATE_NOT_FOUND', 
                    message: 'Template not found' 
                } 
            });
        }
        
        res.json(result);
    } catch (error) {
        logger.error('Error updating template:', error);
        return errors.serverError('Failed to update template', res, logger);
    }
};

const removeTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await templateRepository.deleteById(id);
        
        if (!deleted) {
            return res.status(404).json({ 
                error: { 
                    code: 'TEMPLATE_NOT_FOUND', 
                    message: 'Template not found' 
                } 
            });
        }
        
        res.status(204).send();
    } catch (error) {
        logger.error(error);
        return errors.serverError('Error deleting template', res, logger);
    }
};

export default {
    getTemplateMetadata,
    getTemplateById,
    createTemplate,
    updateTemplate,
    removeTemplate
};