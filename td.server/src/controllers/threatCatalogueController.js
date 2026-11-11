import { badRequest, notFound, serverError } from './errors.js';
import { createHash, randomUUID } from 'crypto';

import { computeMitigationHash } from './mitigationCatalogueController.js';
import { resolveStandardsAsync } from './standardsController.js';

import loggerHelper from '../helpers/logger.helper.js';
import repositories from '../repositories';
import responseWrapper from './responseWrapper.js';

const logger = loggerHelper.get('controllers/threatCatalogueController.js');

const handleServerError = (err, res, fallbackMessage) => {
    logger.error(err);
    return serverError(err.message || fallbackMessage, res, logger);
};

const BRIEF_DESCRIPTION_LENGTH = 150;

const computeBriefDescription = (description) => {
    if (!description) {return '';}
    return description.length > BRIEF_DESCRIPTION_LENGTH
        ? description.slice(0, BRIEF_DESCRIPTION_LENGTH) + '...'
        : description;
};

const computeThreatHash = (threat) => {
    const normalized = [
        (threat.modelType || '').trim().toLowerCase(),
        (threat.type || '').trim().toLowerCase(),
        (threat.title || '').trim().toLowerCase(),
        (threat.description || '').trim().toLowerCase()
    ].join('::');
    return createHash('sha256').update(normalized).
        digest('hex');
};

const isDuplicate = (threats, incoming) => {
    const hash = computeThreatHash(incoming);
    return threats.some((t) => t.hash === hash);
};

// Converts a threat object into the format stored in the catalogue index
const toCatalogueEntry = ({ id, description, ...metadata }, mitigationRefs) => ({
    id,
    hash: computeThreatHash({ description, ...metadata }),
    briefDescription: computeBriefDescription(description),
    ...metadata,
    description,
    mitigationRefs
});

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

const toNewMitigation = ({ title, description, status, clauses }, id, hash) => ({
    id, hash, briefDescription: computeBriefDescription(description), title, description, status, clauses: clauses || []
});

// Assigns catalogue IDs to mitigations, creating new IDs for those not already in the catalogue
const assignMitigationIds = (threats, existingIdsByHash) => {
    const mitigationIdsByHash = new Map(existingIdsByHash);
    const mitigationsToCreate = [];
    for (const mitigation of threats.flatMap((t) => t.mitigations || [])) {
        const hash = computeMitigationHash(mitigation);
        if (!mitigationIdsByHash.has(hash)) {
            const id = randomUUID();
            mitigationIdsByHash.set(hash, id);
            mitigationsToCreate.push(toNewMitigation(mitigation, id, hash));
        }
    }
    return { mitigationIdsByHash, mitigationsToCreate };
};

const lookupMitigationRefs = (mitigations, mitigationIdsByHash) => [...new Set((mitigations || []).map((m) => mitigationIdsByHash.get(computeMitigationHash(m))))];

// drops threats already in the catalogue as well as repeats within the library itself
const removeDuplicateThreats = (threatLibrary, existingHashes) => {
    const seenHashes = new Set(existingHashes);
    return threatLibrary.filter((threat) => {
        const hash = computeThreatHash(threat);
        const isNew = !seenHashes.has(hash);
        seenHashes.add(hash);
        return isNew;
    });
};

const saveNewMitigationsAsync = async (repository, accessToken, catalogueStatus, mitigationsToCreate) => {
    if (mitigationsToCreate.length === 0) {
        return { mitigationsCreated: 0, standardsCreated: 0 };
    }
    if (catalogueStatus === 'NOT_INITIALIZED') {
        await repository.initializeMitigationCatalogueAsync(accessToken);
    }
    const { mitigations: resolvedMitigations, standardsCreated } =
        await resolveStandardsAsync(repository, accessToken, mitigationsToCreate);
    await repository.bulkSaveMitigationsAsync(accessToken, resolvedMitigations);
    return { mitigationsCreated: resolvedMitigations.length, standardsCreated };
};

const importThreatLibrary = async (req, res) => {
    const repository = repositories.get();
    const accessToken = req.provider.access_token;
    const { threatLibrary } = req.body;

    if (!Array.isArray(threatLibrary) || threatLibrary.length === 0) {
        return badRequest('Invalid threat library: expected non-empty { threatLibrary: [] }', res, logger);
    }

    try {
        const { threats: existing } = await repository.listThreatsAsync(accessToken);
        const mitigationCatalogue = await repository.listMitigationsAsync(accessToken);
        const newThreats = removeDuplicateThreats(threatLibrary, existing.map((t) => t.hash));
        const existingMitigationIds = new Map(mitigationCatalogue.mitigations.map((m) => [m.hash, m.id]));
        const { mitigationIdsByHash, mitigationsToCreate } = assignMitigationIds(newThreats, existingMitigationIds);
        const toCreate = newThreats.map(({ mitigations, ...threat }) => toCatalogueEntry(threat, lookupMitigationRefs(mitigations, mitigationIdsByHash)));
        const { mitigationsCreated, standardsCreated } =
            await saveNewMitigationsAsync(repository, accessToken, mitigationCatalogue.status, mitigationsToCreate);

        if (toCreate.length > 0) {
            await repository.bulkSaveThreatsAsync(accessToken, toCreate);
        }

        const results = { created: toCreate.length, skipped: threatLibrary.length - newThreats.length, mitigationsCreated, standardsCreated };
        return res.status(200).json({
            status: 200,
            message: `Import complete: ${results.created} created, ${results.skipped} skipped, ${results.mitigationsCreated} new mitigation(s), ${results.standardsCreated} new standard(s)`,
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