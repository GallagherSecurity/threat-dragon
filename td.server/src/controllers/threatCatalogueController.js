import { badRequest, notFound, serverError } from "./errors.js";
import { createHash } from "crypto";


import loggerHelper from "../helpers/logger.helper.js";
import repositories from "../repositories";
import responseWrapper from "./responseWrapper.js";

const logger = loggerHelper.get("controllers/threatCatalogueController.js");

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

        const { id, description, mitigation, ...metadata } = threat;
        const briefDescription = computeBriefDescription(description);
        const hash = computeThreatHash(threat);

        await repository.saveThreatAsync(accessToken, { id, hash, briefDescription, ...metadata, description, mitigation });

        return res.status(201).json({ status: 201, message: "Catalogue threat created successfully" });
    } catch (error) {
        logger.error("Create catalogue threat error:", error);
        return serverError(error.message || "Failed to create catalogue threat", res, logger);
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

        const { description, mitigation, ...metadata } = updates;
        const briefDescription = computeBriefDescription(description);

        await repository.updateThreatEntryAsync(accessToken, id, { ...metadata, description, mitigation, briefDescription, hash });

        return res.status(200).json({ status: 200, message: "Catalogue threat updated successfully" });
    } catch (err) {
        if (err.statusCode === 404) {return notFound(`Catalogue threat with ID "${id}" not found`, res, logger);}
        logger.error(err);
        return serverError(err.message || "Failed to update catalogue threat", res, logger);
    }
};

const deleteCatalogueThreat = async (req, res) => {
    const repository = repositories.get();
    const accessToken = req.provider.access_token;
    const { id } = req.params;

    try {
        await repository.deleteThreatEntryAsync(accessToken, id);
        return res.status(200).json({ status: 200, message: "Catalogue threat deleted successfully" });
    } catch (err) {
        if (err.statusCode === 404) {return notFound(`Catalogue threat with ID "${id}" not found`, res, logger);}
        logger.error(err);
        return serverError(err.message || "Failed to delete catalogue threat", res, logger);
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
        logger.error(err);
        return serverError(err.message || "Failed to fetch catalogue threat", res, logger);
    }
};

const bulkGetCatalogueContent = async (req, res) => {
    const repository = repositories.get();
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
        return badRequest("Expected non-empty { ids: [] }", res, logger);
    }

    try {
        const contents = await repository.getBulkThreatsAsync(req.provider.access_token, ids);
        return res.status(200).json({ status: 200, data: { contents } });
    } catch (err) {
        logger.error(err);
        return serverError(err.message || "Failed to fetch catalogue threats", res, logger);
    }
};

const bulkDeleteCatalogueThreats = async (req, res) => {
    const repository = repositories.get();
    const accessToken = req.provider.access_token;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
        return badRequest("Expected non-empty { ids: [] }", res, logger);
    }

    try {
        await repository.bulkDeleteThreatsAsync(accessToken, ids);
        return res.status(200).json({ status: 200, message: `${ids.length} threat(s) deleted successfully` });
    } catch (err) {
        logger.error(err);
        return serverError(err.message || "Failed to bulk delete catalogue threats", res, logger);
    }
};

const bootstrapCatalogueRepository = async (req, res) => {
    const repository = repositories.get();

    try {
        const result = await repository.listThreatsAsync(req.provider.access_token);

        if (result.status === 'NOT_CONFIGURED') {
            return badRequest("Threat catalogue not configured. Set GITHUB_CONTENT_REPO environment variable.", res, logger);
        }
        if (result.status === 'NOT_FOUND') {
            return notFound("Threat catalogue repository not found", res, logger);
        }
        if (!result.status) {
            return badRequest("Threat catalogue already initialized", res, logger);
        }

        await repository.initializeThreatCatalogueAsync(req.provider.access_token);
        return res.status(201).json({ status: 201, message: "Threat catalogue initialized successfully" });
    } catch (err) {
        logger.error(err);
        return serverError(err.message || "Failed to initialize threat catalogue", res, logger);
    }
};

const importThreatLibrary = async (req, res) => {
    const repository = repositories.get();
    const accessToken = req.provider.access_token;
    const { threatLibrary } = req.body;

    if (!Array.isArray(threatLibrary) || threatLibrary.length === 0) {
        return badRequest("Invalid threat library: expected non-empty { threatLibrary: [] }", res, logger);
    }

    try {
        const { threats: existing } = await repository.listThreatsAsync(accessToken);
        const seen = new Set(existing.map((t) => t.hash));
        const results = { created: 0, skipped: 0 };

        const toCreate = [];
        for (const threat of threatLibrary) {
            const hash = computeThreatHash(threat);
            if (seen.has(hash)) {
                results.skipped++;
            } else {
                seen.add(hash);
                const { id, description, mitigation, ...metadata } = threat;
                toCreate.push({ id, hash, briefDescription: computeBriefDescription(description), ...metadata, description, mitigation });
                results.created++;
            }
        }

        if (toCreate.length > 0) {
            await repository.bulkSaveThreatsAsync(accessToken, toCreate);
        }

        return res.status(200).json({
            status: 200,
            message: `Import complete: ${results.created} created, ${results.skipped} skipped`,
            results
        });
    } catch (error) {
        logger.error("Import threat library error:", error);
        return serverError(error.message || "Failed to import threat library", res, logger);
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