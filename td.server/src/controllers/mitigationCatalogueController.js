import { badRequest, notFound, serverError } from "./errors.js";
import { createHash } from "crypto";

import loggerHelper from "../helpers/logger.helper.js";
import repositories from "../repositories";
import responseWrapper from "./responseWrapper.js";

const logger = loggerHelper.get("controllers/mitigationCatalogueController.js");

const BRIEF_DESCRIPTION_LENGTH = 150;

const computeBriefDescription = (description) => {
    if (!description) {return '';}
    return description.length > BRIEF_DESCRIPTION_LENGTH
        ? description.slice(0, BRIEF_DESCRIPTION_LENGTH) + '...'
        : description;
};

const computeMitigationHash = (mitigation) => {
    const normalized = [
        (mitigation.title || '').trim().toLowerCase(),
        (mitigation.description || '').trim().toLowerCase()
    ].join('::');
    return createHash('sha256').update(normalized).digest('hex');
};

const isDuplicate = (mitigations, incoming) => {
    const hash = computeMitigationHash(incoming);
    return mitigations.some((m) => m.hash === hash);
};

const listCatalogueMitigations = (req, res) => responseWrapper.sendResponseAsync(async () => {
    const repository = repositories.get();
    const result = await repository.listMitigationsAsync(req.provider.access_token);

    if (result.status) {
        const canWrite = result.status === 'NOT_INITIALIZED' ? (req.user?.isAdmin || false) : false;
        return { catalogue: [], status: result.status, canWrite };
    }
    if (req.query.sha && req.query.sha === result.sha) {
        return { unchanged: true };
    }
    return { catalogue: result.mitigations, sha: result.sha, canWrite: true };
}, req, res, logger);

const createCatalogueMitigation = async (req, res) => {
    const repository = repositories.get();
    const accessToken = req.provider.access_token;
    const mitigation = req.body;

    try {
        const { mitigations } = await repository.listMitigationsAsync(accessToken);

        if (isDuplicate(mitigations, mitigation)) {
            return badRequest(`A catalogue mitigation with the title "${mitigation.title}" already exists`, res, logger);
        }

        const { id, description, clauses, ...metadata } = mitigation;
        const briefDescription = computeBriefDescription(description);
        const hash = computeMitigationHash(mitigation);

        await repository.saveMitigationAsync(accessToken, { id, hash, briefDescription, ...metadata, description, clauses });

        return res.status(201).json({ status: 201, message: "Catalogue mitigation created successfully" });
    } catch (error) {
        logger.error("Create catalogue mitigation error:", error);
        return serverError(error.message || "Failed to create catalogue mitigation", res, logger);
    }
};

const updateCatalogueMitigation = async (req, res) => {
    const repository = repositories.get();
    const accessToken = req.provider.access_token;
    const { id } = req.params;
    const updates = req.body;

    try {
        const hash = computeMitigationHash(updates);
        const { mitigations } = await repository.listMitigationsAsync(accessToken);
        if (mitigations.some((m) => m.id !== id && m.hash === hash)) {
            return badRequest(`A catalogue mitigation with the title "${updates.title}" already exists`, res, logger);
        }

        const { description, clauses, ...metadata } = updates;
        const briefDescription = computeBriefDescription(description);

        await repository.updateMitigationEntryAsync(accessToken, id, { ...metadata, description, clauses, briefDescription, hash });

        return res.status(200).json({ status: 200, message: "Catalogue mitigation updated successfully" });
    } catch (err) {
        if (err.statusCode === 404) {return notFound(`Catalogue mitigation with ID "${id}" not found`, res, logger);}
        logger.error(err);
        return serverError(err.message || "Failed to update catalogue mitigation", res, logger);
    }
};

const deleteCatalogueMitigation = async (req, res) => {
    const repository = repositories.get();
    const accessToken = req.provider.access_token;
    const { id } = req.params;

    try {
        await repository.deleteMitigationEntryAsync(accessToken, id);
        return res.status(200).json({ status: 200, message: "Catalogue mitigation deleted successfully" });
    } catch (err) {
        if (err.statusCode === 404) {return notFound(`Catalogue mitigation with ID "${id}" not found`, res, logger);}
        logger.error(err);
        return serverError(err.message || "Failed to delete catalogue mitigation", res, logger);
    }
};

const getCatalogueMitigationContent = async (req, res) => {
    const repository = repositories.get();
    const { id } = req.params;

    try {
        const content = await repository.getMitigationAsync(req.provider.access_token, id);
        if (!content) {return notFound(`Catalogue mitigation with ID "${id}" not found`, res, logger);}
        return res.status(200).json({ status: 200, data: { content } });
    } catch (err) {
        logger.error(err);
        return serverError(err.message || "Failed to fetch catalogue mitigation", res, logger);
    }
};

const bulkGetCatalogueMitigationContent = async (req, res) => {
    const repository = repositories.get();
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
        return badRequest("Expected non-empty { ids: [] }", res, logger);
    }

    try {
        const contents = await repository.getBulkMitigationsAsync(req.provider.access_token, ids);
        return res.status(200).json({ status: 200, data: { contents } });
    } catch (err) {
        logger.error(err);
        return serverError(err.message || "Failed to fetch catalogue mitigations", res, logger);
    }
};

const bulkDeleteCatalogueMitigations = async (req, res) => {
    const repository = repositories.get();
    const accessToken = req.provider.access_token;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
        return badRequest("Expected non-empty { ids: [] }", res, logger);
    }

    try {
        await repository.bulkDeleteMitigationsAsync(accessToken, ids);
        return res.status(200).json({ status: 200, message: `${ids.length} mitigation(s) deleted successfully` });
    } catch (err) {
        logger.error(err);
        return serverError(err.message || "Failed to bulk delete catalogue mitigations", res, logger);
    }
};

const bootstrapMitigationCatalogueRepository = async (req, res) => {
    const repository = repositories.get();

    try {
        const result = await repository.listMitigationsAsync(req.provider.access_token);

        if (result.status === 'NOT_CONFIGURED') {
            return badRequest("Mitigation catalogue not configured. Set GITHUB_CONTENT_REPO environment variable.", res, logger);
        }
        if (result.status === 'NOT_FOUND') {
            return notFound("Mitigation catalogue repository not found", res, logger);
        }
        if (!result.status) {
            return badRequest("Mitigation catalogue already initialized", res, logger);
        }

        await repository.initializeMitigationCatalogueAsync(req.provider.access_token);
        return res.status(201).json({ status: 201, message: "Mitigation catalogue initialized successfully" });
    } catch (err) {
        logger.error(err);
        return serverError(err.message || "Failed to initialize mitigation catalogue", res, logger);
    }
};

const importMitigationLibrary = async (req, res) => {
    const repository = repositories.get();
    const accessToken = req.provider.access_token;
    const { mitigationLibrary } = req.body;

    if (!Array.isArray(mitigationLibrary) || mitigationLibrary.length === 0) {
        return badRequest("Invalid mitigation library: expected non-empty { mitigationLibrary: [] }", res, logger);
    }

    try {
        const { mitigations: existing } = await repository.listMitigationsAsync(accessToken);
        const seen = new Set(existing.map((m) => m.hash));
        const results = { created: 0, skipped: 0 };

        const toCreate = [];
        for (const mitigation of mitigationLibrary) {
            const hash = computeMitigationHash(mitigation);
            if (seen.has(hash)) {
                results.skipped++;
            } else {
                seen.add(hash);
                const { id, description, clauses, ...metadata } = mitigation;
                toCreate.push({ id, hash, briefDescription: computeBriefDescription(description), ...metadata, description, clauses });
                results.created++;
            }
        }

        if (toCreate.length > 0) {
            await repository.bulkSaveMitigationsAsync(accessToken, toCreate);
        }

        return res.status(200).json({
            status: 200,
            message: `Import complete: ${results.created} created, ${results.skipped} skipped`,
            results
        });
    } catch (error) {
        logger.error("Import mitigation library error:", error);
        return serverError(error.message || "Failed to import mitigation library", res, logger);
    }
};

export default {
    listCatalogueMitigations,
    createCatalogueMitigation,
    updateCatalogueMitigation,
    deleteCatalogueMitigation,
    bulkDeleteCatalogueMitigations,
    getCatalogueMitigationContent,
    bulkGetCatalogueMitigationContent,
    bootstrapMitigationCatalogueRepository,
    importMitigationLibrary
};
