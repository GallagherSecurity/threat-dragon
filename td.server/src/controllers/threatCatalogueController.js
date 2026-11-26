import { badRequest, notFound, serverError } from './errors.js';
import {
    computeBriefDescription,
    computeThreatHash,
    importThreatLibraryAsync,
    toCatalogueEntry
} from './threatLibraryImport.js';

import loggerHelper from '../helpers/logger.helper.js';
import repositories from '../repositories';
import responseWrapper from './responseWrapper.js';

const logger = loggerHelper.get('controllers/threatCatalogueController.js');

const handleServerError = (err, res, fallbackMessage) => {
    logger.error(err);
    return serverError(err.message || fallbackMessage, res, logger);
};

const isDuplicate = (threats, incoming) => {
    const hash = computeThreatHash(incoming);
    return threats.some((t) => t.hash === hash);
};

const listCatalogueThreats = (req, res) => responseWrapper.sendResponseAsync(async () => {
    const repository = repositories.get();
    const result = await repository.listThreatsAsync(req.provider.access_token);

    if (result.status) {
        const canWrite = result.status === 'NOT_INITIALIZED' ? (req.user?.isAdmin || false) : false;
        return { catalogue: [], status: result.status, canWrite };
    }
    if (req.query.sha && req.query.sha === result.sha) {
        return { unchanged: true };
    }
    return { catalogue: result.threats, sha: result.sha, canWrite: true };
}, req, res, logger);

const createCatalogueThreat = async (req, res) => {
    const repository = repositories.get();
    const accessToken = req.provider.access_token;
    const threat = req.body;

    try {
        const { threats } = await repository.listThreatsAsync(accessToken);

        if (isDuplicate(threats, threat)) {
            return badRequest(`A catalogue threat with the title "${threat.title}" already exists for framework "${threat.modelType}"`, res, logger);
        }

        const { mitigationRefs, ...fields } = threat;
        await repository.saveThreatAsync(accessToken, toCatalogueEntry(fields, mitigationRefs));

        return res.status(201).json({ status: 201, message: 'Catalogue threat created successfully' });
    } catch (error) {
        return handleServerError(error, res, 'Failed to create catalogue threat');
    }
};

const updateCatalogueThreat = async (req, res) => {
    const repository = repositories.get();
    const accessToken = req.provider.access_token;
    const { id } = req.params;
    const updates = req.body;

    try {
        const hash = computeThreatHash(updates);
        const { threats } = await repository.listThreatsAsync(accessToken);
        if (threats.some((t) => t.id !== id && t.hash === hash)) {
            return badRequest(`A catalogue threat with the title "${updates.title}" already exists for framework "${updates.modelType}"`, res, logger);
        }

        const { description, mitigationRefs, ...metadata } = updates;
        const briefDescription = computeBriefDescription(description);

        await repository.updateThreatEntryAsync(accessToken, id, { ...metadata, description, mitigationRefs, briefDescription, hash });

        return res.status(200).json({ status: 200, message: 'Catalogue threat updated successfully' });
    } catch (err) {
        if (err.statusCode === 404) {return notFound(`Catalogue threat with ID "${id}" not found`, res, logger);}
        return handleServerError(err, res, 'Failed to update catalogue threat');
    }
};

const deleteCatalogueThreat = async (req, res) => {
    const repository = repositories.get();
    const accessToken = req.provider.access_token;
    const { id } = req.params;

    try {
        await repository.deleteThreatEntryAsync(accessToken, id);
        return res.status(200).json({ status: 200, message: 'Catalogue threat deleted successfully' });
    } catch (err) {
        if (err.statusCode === 404) {return notFound(`Catalogue threat with ID "${id}" not found`, res, logger);}
        return handleServerError(err, res, 'Failed to delete catalogue threat');
    }
};

const getCatalogueThreatContent = async (req, res) => {
    const repository = repositories.get();
    const { id } = req.params;

    try {
        const content = await repository.getThreatAsync(req.provider.access_token, id);
        if (!content) {return notFound(`Catalogue threat with ID "${id}" not found`, res, logger);}
        return res.status(200).json({ status: 200, data: { content } });
    } catch (err) {
        return handleServerError(err, res, 'Failed to fetch catalogue threat');
    }
};

const bulkGetCatalogueContent = async (req, res) => {
    const repository = repositories.get();
    const accessToken = req.provider.access_token;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
        return badRequest('Expected non-empty { ids: [] }', res, logger);
    }

    try {
        const threats = await repository.getBulkThreatsAsync(accessToken, ids);

        const refIds = [...new Set(threats.flatMap((t) => t.mitigationRefs || []))];
        const mitigationsById = new Map(await Promise.all(
            refIds.map(async (id) => [id, await repository.getMitigationAsync(accessToken, id)])
        ));

        const contents = threats.map(({ mitigationRefs = [], ...threat }) => ({
            ...threat,
            mitigations: mitigationRefs.
                map((id) => mitigationsById.get(id)).
                filter(Boolean).
                map(({ title, description, status, clauses = [] }) => ({ title, description, status, clauses }))
        }));

        return res.status(200).json({ status: 200, data: { contents } });
    } catch (err) {
        return handleServerError(err, res, 'Failed to fetch catalogue threats');
    }
};

const bulkDeleteCatalogueThreats = async (req, res) => {
    const repository = repositories.get();
    const accessToken = req.provider.access_token;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
        return badRequest('Expected non-empty { ids: [] }', res, logger);
    }

    try {
        await repository.bulkDeleteThreatsAsync(accessToken, ids);
        return res.status(200).json({ status: 200, message: `${ids.length} threat(s) deleted successfully` });
    } catch (err) {
        return handleServerError(err, res, 'Failed to bulk delete catalogue threats');
    }
};

const bootstrapCatalogueRepository = async (req, res) => {
    const repository = repositories.get();

    try {
        const result = await repository.listThreatsAsync(req.provider.access_token);

        if (result.status === 'NOT_CONFIGURED') {
            return badRequest('Threat catalogue not configured. Set GITHUB_CONTENT_REPO environment variable.', res, logger);
        }
        if (result.status === 'NOT_FOUND') {
            return notFound('Threat catalogue repository not found', res, logger);
        }
        if (!result.status) {
            return badRequest('Threat catalogue already initialized', res, logger);
        }

        await repository.initializeThreatCatalogueAsync(req.provider.access_token);
        return res.status(201).json({ status: 201, message: 'Threat catalogue initialized successfully' });
    } catch (err) {
        return handleServerError(err, res, 'Failed to initialize threat catalogue');
    }
};

const importThreatLibrary = async (req, res) => {
    const repository = repositories.get();
    const accessToken = req.provider.access_token;
    const { threatLibrary } = req.body;

    if (!Array.isArray(threatLibrary) || threatLibrary.length === 0) {
        return badRequest('Invalid threat library: expected non-empty { threatLibrary: [] }', res, logger);
    }

    try {
        const results = await importThreatLibraryAsync(repository, accessToken, threatLibrary);
        return res.status(200).json({
            status: 200,
            message: `Import complete: ${results.created} created, ${results.skipped} skipped, ${results.threatsLinked} existing threat(s) updated, ${results.mitigationsCreated} new mitigation(s), ${results.standardsCreated} new standard(s)`,
            results
        });
    } catch (error) {
        return handleServerError(error, res, 'Failed to import threat library');
    }
};

export default {
    listCatalogueThreats,
    createCatalogueThreat,
    updateCatalogueThreat,
    deleteCatalogueThreat,
    bulkDeleteCatalogueThreats,
    getCatalogueThreatContent,
    bulkGetCatalogueContent,
    bootstrapCatalogueRepository,
    importThreatLibrary
};