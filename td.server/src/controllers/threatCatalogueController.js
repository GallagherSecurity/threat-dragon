import { badRequest, notFound, serverError } from "./errors.js";

import env from "../env/Env.js";
import loggerHelper from "../helpers/logger.helper.js";
import repositories from "../repositories";
import responseWrapper from "./responseWrapper.js";

const logger = loggerHelper.get("controllers/threatCatalogueController.js");

const BRIEF_DESCRIPTION_LENGTH = 150;

const computeBriefDescription = (description) => {
    if (!description) return '';
    return description.length > BRIEF_DESCRIPTION_LENGTH
        ? description.slice(0, BRIEF_DESCRIPTION_LENGTH) + '...'
        : description;
};

const fetchThreatCatalogueMetadata = async (repository, accessToken) => {
    const result = await repository.listThreatCatalogueAsync(accessToken);
    const file = result[0];
    const decoded = Buffer.from(file.content, "base64").toString("utf8");
    const parsed = JSON.parse(decoded);
    const catalogue = Array.isArray(parsed) ? parsed : parsed.catalogue || [];
    return { catalogue, sha: file.sha };
};

const listCatalogueThreats = (req, res) => responseWrapper.sendResponseAsync(async () => {
    const repository = repositories.get();
    const contentRepo = env.get().config.GITHUB_CONTENT_REPO;

    if (!contentRepo) {
        return { catalogue: [], status: "NOT_CONFIGURED", canWrite: false };
    }

    try {
        const { catalogue, sha } = await fetchThreatCatalogueMetadata(repository, req.provider.access_token);
        if (req.query.sha && req.query.sha === sha) {
            return { unchanged: true };
        }
        return { catalogue, sha };
    } catch (e) {
        if (e.statusCode === 404) {
            try {
                await repository.repoExistsAsync(req.provider.access_token);
                return {
                    catalogue: [],
                    status: "NOT_INITIALIZED",
                    canWrite: req.user?.isAdmin || false
                };
            } catch (repoError) {
                return notFound(`Threat catalogue repository '${contentRepo}' not found`, res, logger);
            }
        }
        throw e;
    }
}, req, res, logger);

const createCatalogueThreat = async (req, res) => {
    const repository = repositories.get();
    const accessToken = req.provider.access_token;
    const threat = req.body;

    try {
        const { catalogue, sha } = await fetchThreatCatalogueMetadata(repository, accessToken);

        const isDuplicate = catalogue.some(
            (t) => (t.title || "").toLowerCase() === (threat.title || "").toLowerCase()
                && t.modelType === threat.modelType
        );

        if (isDuplicate) {
            return badRequest(`A catalogue threat with the title "${threat.title}" already exists for framework "${threat.modelType}"`, res, logger);
        }

        // Build the index entry — lightweight with briefDescription
        const { id, threatRef,  description, mitigation, ...metadata } = threat;
        const indexEntry = {
            id,
            threatRef,
            ...metadata,
            briefDescription: computeBriefDescription(description)
        };

        catalogue.push(indexEntry);
        await repository.updateThreatCatalogueMetadataAsync(accessToken, catalogue, sha);

        // Content file stores only threat data — id lives in the filename
        await repository.createThreatContentFileAsync(accessToken, threatRef, { ...metadata, description, mitigation });
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
        const { catalogue, sha } = await fetchThreatCatalogueMetadata(repository, accessToken);

        const threatIndex = catalogue.findIndex((t) => t.id === id);
        if (threatIndex === -1) {
            return notFound(`Catalogue threat with ID "${id}" not found`, res, logger);
        }

        const { description, mitigation, ...metadata } = updates;
        const threatRef = catalogue[threatIndex].threatRef;

        catalogue[threatIndex] = {
            ...catalogue[threatIndex],
            ...metadata,
            id,
            threatRef,  // preserve content file reference
            briefDescription: computeBriefDescription(description)
        };

        await repository.updateThreatCatalogueMetadataAsync(accessToken, catalogue, sha);
        await repository.updateThreatContentFileAsync(accessToken, threatRef, updates);

        return res.status(200).json({ status: 200, message: "Catalogue threat updated successfully" });
    } catch (err) {
        logger.error(err);
        return serverError(err.message || "Failed to update catalogue threat", res, logger);
    }
};

const deleteCatalogueThreat = async (req, res) => {
    const repository = repositories.get();
    const accessToken = req.provider.access_token;
    const { id } = req.params;

    try {
        const { catalogue, sha } = await fetchThreatCatalogueMetadata(repository, accessToken);

        const threat = catalogue.find((t) => t.id === id);
        if (!threat) {
            return notFound(`Catalogue threat with ID "${id}" not found`, res, logger);
        }

        const updatedCatalogue = catalogue.filter((t) => t.id !== id);
        await repository.updateThreatCatalogueMetadataAsync(accessToken, updatedCatalogue, sha);
        await repository.deleteThreatContentFileAsync(accessToken, threat.threatRef);

        return res.status(200).json({ status: 200, message: "Catalogue threat deleted successfully" });
    } catch (err) {
        logger.error(err);
        return serverError(err.message || "Failed to delete catalogue threat", res, logger);
    }
};

const getCatalogueThreatContent = (req, res) => {
    const repository = repositories.get();
    const accessToken = req.provider.access_token;
    const { id } = req.params;

    return responseWrapper.sendResponseAsync(async () => {
        const { catalogue } = await fetchThreatCatalogueMetadata(repository, accessToken);
        const threat = catalogue.find((t) => t.id === id);
        if (!threat) {
            return notFound(`Catalogue threat with ID "${id}" not found`, res, logger);
        }

        try {
            const contentResult = await repository.getThreatContentFileAsync(accessToken, threat.threatRef);
            const contentFile = contentResult[0];
            const decoded = Buffer.from(contentFile.content, "base64").toString("utf8");
            const content = JSON.parse(decoded);
            return { content };
        } catch (error) {
            if (error.statusCode === 404) {
                return notFound(`Catalogue threat content for ID "${id}" not found`, res, logger);
            }
            throw error;
        }
    }, req, res, logger);
};

const bulkGetCatalogueContent = (req, res) => responseWrapper.sendResponseAsync(async () => {
    const repository = repositories.get();
    const accessToken = req.provider.access_token;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
        return badRequest("Expected non-empty { ids: [] }", res, logger);
    }

    const { catalogue } = await fetchThreatCatalogueMetadata(repository, accessToken);
    const threats = ids.map(id => catalogue.find(t => t.id === id)).filter(Boolean);

    const contents = await Promise.all(
        threats.map(async (threat) => {
            const contentResult = await repository.getThreatContentFileAsync(accessToken, threat.threatRef);
            const decoded = Buffer.from(contentResult[0].content, "base64").toString("utf8");
            return JSON.parse(decoded);
        })
    );

    return { contents };
}, req, res, logger);

const bootstrapCatalogueRepository = async (req, res) => {
    const repository = repositories.get();
    const accessToken = req.provider.access_token;
    const contentRepo = env.get().config.GITHUB_CONTENT_REPO;

    if (!contentRepo) {
        return badRequest("Threat catalogue repository not configured. Set GITHUB_CONTENT_REPO environment variable.", res, logger);
    }

    try {
        try {
            await repository.listThreatCatalogueAsync(accessToken);
            return badRequest("Threat catalogue already initialized", res, logger);
        } catch (checkError) {
            if (checkError.statusCode !== 404) {
                throw checkError;
            }
        }

        await repository.createThreatCatalogueMetadataAsync(accessToken);

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
        const { catalogue, sha } = await fetchThreatCatalogueMetadata(repository, accessToken);
        const results = { created: 0, skipped: 0 };

        for (const threat of threatLibrary) {
            const isDuplicate = catalogue.some(
                (t) => (t.title || "").toLowerCase() === (threat.title || "").toLowerCase()
                    && t.modelType === threat.modelType
            );

            if (isDuplicate) {
                results.skipped++;
                continue;
            }

            const { id, threatRef, description, mitigation, ...metadata } = threat;

            catalogue.push({
                id,
                threatRef,
                ...metadata,
                briefDescription: computeBriefDescription(description)
            });

            await repository.createThreatContentFileAsync(accessToken, threatRef, { ...metadata, description, mitigation });
            results.created++;
        }

        await repository.updateThreatCatalogueMetadataAsync(accessToken, catalogue, sha);

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
    getCatalogueThreatContent,
    bulkGetCatalogueContent,
    bootstrapCatalogueRepository,
    importThreatLibrary
};
