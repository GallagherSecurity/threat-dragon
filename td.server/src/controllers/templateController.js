import {validateTemplateContent, validateTemplateName} from '../helpers/template.helper.js';

import loggerHelper from '../helpers/logger.helper.js';
import responseWrapper from './responseWrapper.js';
import { serverError } from './errors.js';
import templateRepository from '../repositories/templateRepository.js';



const logger = loggerHelper.get('controllers/templateController.js');

const metadata = (req, res) => responseWrapper.sendResponseAsync(async () => {
    const filters = {
        search: req.query.search || '',
        tags: req.query.tags ? req.query.tags.split(',') : [],
        sortBy: req.query.sortBy || 'created_at',
        sortOrder: req.query.sortOrder || 'desc'
    };
    
    const pagination = {
        page: parseInt(req.query.page, 10) || 1,
        limit: Math.min(parseInt(req.query.limit, 10) || 20, 100)
    };

    const metadata = await templateRepository.findAllMetadata(filters, pagination); 
    
    logger.debug(`API template metadata request: ${logger.transformToString(req)}`);
    
    return metadata;
}, req, res, logger);

const getById = (req, res) => responseWrapper.sendResponseAsync(async () => {
    const { id } = req.params;
    logger.debug(`API template getById request: ${logger.transformToString(req)}`);
    
    const template = await templateRepository.findById(id); 
    
    if (!template) {
        const error = new Error('Template not found');
        error.statusCode = 404;
        throw error;
    }
    
    return template; 
}, req, res, logger);

const create = async (req, res) => {
    try {
        const { name, description, tags, content } = req.body;
        logger.debug(`API template create request: ${logger.transformToString(req)}`);
        
        // Validation using helper method
        const nameError = validateTemplateName(name);
        if (nameError) {
            return res.status(400).json(nameError);
        }
        
        const contentError = validateTemplateContent(content);
        if (contentError) {
            return res.status(400).json(contentError);
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
        
        return res.status(201).json(result);
    } catch (err) {
        logger.error(err);
        return serverError('Error creating template', res, logger);
    }
};

const update = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, tags } = req.body;
        logger.debug(`API template update request: ${logger.transformToString(req)}`);
        
        // Validation
        const nameError = validateTemplateName(name);
        if (nameError) {
            return res.status(400).json(nameError);
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
        
        return res.json(result);
    } catch (err) {
        logger.error(err);
        return serverError('Error updating template', res, logger);
    }
};

const remove = async (req, res) => {
    try {
        const { id } = req.params;
        logger.debug(`API template delete request: ${logger.transformToString(req)}`);
        
        const deleted = await templateRepository.softDelete(id);
        
        if (!deleted) {
            return res.status(404).json({ 
                error: { 
                    code: 'TEMPLATE_NOT_FOUND', 
                    message: 'Template not found' 
                } 
            });
        }
        
        return res.status(204).send();
    } catch (err) {
        logger.error(err);
        return serverError('Error deleting template', res, logger);
    }
};

export default {
    metadata,
    getById,
    create,
    update,
    remove
};