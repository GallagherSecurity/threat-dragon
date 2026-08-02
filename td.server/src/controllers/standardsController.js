import { badRequest, notFound, serverError } from './errors.js';

import loggerHelper from '../helpers/logger.helper.js';
import repositories from '../repositories';
import responseWrapper from './responseWrapper.js';

const logger = loggerHelper.get('controllers/standardsController.js');

const listStandards = (req, res) => responseWrapper.sendResponseAsync(async () => {
    const repository = repositories.get();
    const result = await repository.listStandardsAsync(req.provider.access_token);

    if (result.status) {
        return { standards: [], status: result.status };
    }

    return { standards: result.standards };
}, req, res, logger);

const createStandard = async (req, res) => {
    const repository = repositories.get();
    const accessToken = req.provider.access_token;
    const { name } = req.body;

    if (!name) {
        return badRequest('Standard requires a name field', res, logger);
    }

    try {
        const { standards } = await repository.listStandardsAsync(accessToken);

        if (standards.some((s) => s.name.toLowerCase() === name.trim().toLowerCase())) {
            return badRequest(`A standard named "${name}" already exists`, res, logger);
        }

        await repository.saveStandardAsync(accessToken, name.trim());

        return res.status(201).json({ status: 201, message: 'Standard created successfully' });
    } catch (error) {
        logger.error('Create standard error:', error);
        return serverError(error.message || 'Failed to create standard', res, logger);
    }
};

const deleteStandard = async (req, res) => {
    const repository = repositories.get();
    const accessToken = req.provider.access_token;
    const { id } = req.params;

    try {
        const { standards } = await repository.listStandardsAsync(accessToken);

        if (!standards.some((s) => s.id === id)) {
            return notFound(`Standard with id "${id}" not found`, res, logger);
        }

        await repository.deleteStandardAsync(accessToken, id);

        return res.status(200).json({ status: 200, message: 'Standard deleted successfully' });
    } catch (err) {
        logger.error(err);
        return serverError(err.message || 'Failed to delete standard', res, logger);
    }
};

export default {
    listStandards,
    createStandard,
    deleteStandard
};
