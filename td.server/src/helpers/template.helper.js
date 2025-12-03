const validateTemplateName = (name) => {
    if (!name || name.trim().length === 0) {
        return { 
            error: { 
                code: 'VALIDATION_ERROR', 
                message: 'Name is required',
                details: { field: 'name' }
            } 
        };
    }
    if (name.length > 255) {
        return { 
            error: { 
                code: 'VALIDATION_ERROR', 
                message: 'Name must be 255 characters or less',
                details: { field: 'name' }
            } 
        };
    }
    return null;
};

const validateTemplateContent = (content) => {
    if (!content) {
        return { 
            error: { 
                code: 'VALIDATION_ERROR', 
                message: 'Content is required',
                details: { field: 'content' }
            } 
        };
    }
    
    return null;
};

export default {
    validateTemplateName,
    validateTemplateContent
};