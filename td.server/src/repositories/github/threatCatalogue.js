import { getClient, repoExistsAsync } from './client.js';

import env from '../../env/Env.js';
import { randomUUID } from 'crypto';

const THREAT_CATALOGUE_METADATA_PATH = 'threats/threat_catalogue.json';

const listThreatCatalogueAsync = (accessToken) => getClient(accessToken).
    repo(env.get().config.GITHUB_CONTENT_REPO).
    contentsAsync(THREAT_CATALOGUE_METADATA_PATH);

const getCatalogueFileAsync = async (accessToken) => {
    const result = await listThreatCatalogueAsync(accessToken);
    const file = result[0];
    const decoded = Buffer.from(file.content, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded);
    const threats = Array.isArray(parsed) ? parsed : parsed.catalogue || [];
    return { threats, sha: file.sha };
};

const listThreatsAsync = async (accessToken) => {
    if (!env.get().config.GITHUB_CONTENT_REPO) {return { threats: [], status: 'NOT_CONFIGURED' };}
    try {
        const { threats, sha } = await getCatalogueFileAsync(accessToken);
        return { threats, sha };
    } catch (e) {
        if (e.statusCode === 404) {
            try {
                await repoExistsAsync(accessToken);
                return { threats: [], status: 'NOT_INITIALIZED' };
            } catch {
                return { threats: [], status: 'NOT_FOUND' };
            }
        }
        throw e;
    }
};

const getThreatAsync = async (accessToken, id) => {
    const { threats } = await getCatalogueFileAsync(accessToken);
    const entry = threats.find((t) => t.id === id);
    if (!entry) {return null;}
    try {
        const result = await getThreatContentFileAsync(accessToken, entry.threatRef);
        const decoded = Buffer.from(result[0].content, 'base64').toString('utf8');
        return JSON.parse(decoded);
    } catch (e) {
        if (e.statusCode === 404) {return null;}
        throw e;
    }
};

const getBulkThreatsAsync = async (accessToken, ids) => {
    const { threats: catalogue } = await getCatalogueFileAsync(accessToken);
    const entries = ids.map((id) => catalogue.find((t) => t.id === id)).filter(Boolean);
    return Promise.all(entries.map(async (entry) => {
        const result = await getThreatContentFileAsync(accessToken, entry.threatRef);
        const decoded = Buffer.from(result[0].content, 'base64').toString('utf8');
        return JSON.parse(decoded);
    }));
};

const saveThreatAsync = async (accessToken, threat) => {
    const { threats, sha } = await getCatalogueFileAsync(accessToken);
    const { id, briefDescription, hash, description, mitigationRefs, ...metadata } = threat;
    const { threatRef } = await createThreatContentFileAsync(accessToken, { ...metadata, description, mitigationRefs });
    threats.push({ id, threatRef, ...metadata, briefDescription, hash, mitigationRefs });
    await updateThreatCatalogueMetadataAsync(accessToken, threats, sha);
};

const bulkSaveThreatsAsync = async (accessToken, newThreats) => {
    const { threats, sha } = await getCatalogueFileAsync(accessToken);
    const newEntries = await newThreats.reduce(async (prevPromise, threat) => {
        const acc = await prevPromise;
        const { id, briefDescription, hash, description, mitigationRefs, ...metadata } = threat;
        const { threatRef } = await createThreatContentFileAsync(accessToken, { ...metadata, description, mitigationRefs });
        return [...acc, { id, threatRef, ...metadata, briefDescription, hash, mitigationRefs }];
    }, Promise.resolve([]));
    threats.push(...newEntries);
    await updateThreatCatalogueMetadataAsync(accessToken, threats, sha);
};

const updateThreatEntryAsync = async (accessToken, id, data) => {
    const { threats, sha } = await getCatalogueFileAsync(accessToken);
    const index = threats.findIndex((t) => t.id === id);
    if (index === -1) {
        const err = new Error(`Threat ${id} not found`);
        err.statusCode = 404;
        throw err;
    }
    const { description, mitigationRefs, briefDescription, hash, ...metadata } = data;
    const threatRef = threats[index].threatRef;
    threats[index] = { ...threats[index], ...metadata, id, threatRef, briefDescription, hash, mitigationRefs };
    await updateThreatCatalogueMetadataAsync(accessToken, threats, sha);
    await updateThreatContentFileAsync(accessToken, threatRef, { ...metadata, description, mitigationRefs });
};

const bulkDeleteThreatsAsync = async (accessToken, ids) => {
    const { threats, sha } = await getCatalogueFileAsync(accessToken);
    const toDelete = threats.filter((t) => ids.includes(t.id));
    const remaining = threats.filter((t) => !ids.includes(t.id));
    await updateThreatCatalogueMetadataAsync(accessToken, remaining, sha);
    await toDelete.reduce(async (prevPromise, t) => {
        await prevPromise;
        return deleteThreatContentFileAsync(accessToken, t.threatRef);
    }, Promise.resolve());
};

const deleteThreatEntryAsync = async (accessToken, id) => {
    const { threats, sha } = await getCatalogueFileAsync(accessToken);
    const threat = threats.find((t) => t.id === id);
    if (!threat) {
        const err = new Error(`Threat ${id} not found`);
        err.statusCode = 404;
        throw err;
    }
    await updateThreatCatalogueMetadataAsync(accessToken, threats.filter((t) => t.id !== id), sha);
    await deleteThreatContentFileAsync(accessToken, threat.threatRef);
};

const initializeThreatCatalogueAsync = async (accessToken) => {
    await createThreatCatalogueMetadataAsync(accessToken);
};

const createThreatCatalogueMetadataAsync = (accessToken) => {
    const repo = getClient(accessToken).repo(env.get().config.GITHUB_CONTENT_REPO);
    const fileContent = JSON.stringify({ catalogue: [] }, null, 2);
    return repo.createContentsAsync(
        THREAT_CATALOGUE_METADATA_PATH,
        'feat: initialize threat catalogue',
        fileContent,
        'main'
    );
};

const updateThreatCatalogueMetadataAsync = (accessToken, newCatalogueMetadata, sha) => {
    const repo = getClient(accessToken).repo(env.get().config.GITHUB_CONTENT_REPO);
    const fileContent = JSON.stringify({ catalogue: newCatalogueMetadata }, null, 2);
    return repo.updateContentsAsync(
        THREAT_CATALOGUE_METADATA_PATH,
        'feat: update threat catalogue index',
        fileContent,
        sha,
        'main'
    );
};


const createThreatContentFileAsync = async (accessToken, content) => {
    const threatRef = randomUUID();
    const repo = getClient(accessToken).repo(env.get().config.GITHUB_CONTENT_REPO);
    const path = `threats/${threatRef}.json`;
    await repo.createContentsAsync(
        path,
        `feat: add threat ${threatRef}`,
        JSON.stringify(content, null, 2),
        'main'
    );
    return { threatRef };
};

const getThreatContentFileAsync = (accessToken, threatRef) => {
    const repo = getClient(accessToken).repo(env.get().config.GITHUB_CONTENT_REPO);
    const path = `threats/${threatRef}.json`;
    return repo.contentsAsync(path, 'main');
};

const updateThreatContentFileAsync = async (accessToken, threatRef, content) => {
    const repo = getClient(accessToken).repo(env.get().config.GITHUB_CONTENT_REPO);
    const path = `threats/${threatRef}.json`;
    const file = await repo.contentsAsync(path, 'main');
    return repo.updateContentsAsync(
        path,
        `feat: update threat ${threatRef}`,
        JSON.stringify(content, null, 2),
        file[0].sha,
        'main'
    );
};

const deleteThreatContentFileAsync = async (accessToken, threatRef) => {
    const repo = getClient(accessToken).repo(env.get().config.GITHUB_CONTENT_REPO);
    const path = `threats/${threatRef}.json`;
    const file = await repo.contentsAsync(path, 'main');
    return repo.deleteContentsAsync(
        path,
        `feat: delete threat ${threatRef}`,
        file[0].sha,
        'main'
    );
};

export default {
    listThreatCatalogueAsync,
    createThreatCatalogueMetadataAsync,
    updateThreatCatalogueMetadataAsync,
    createThreatContentFileAsync,
    getThreatContentFileAsync,
    updateThreatContentFileAsync,
    deleteThreatContentFileAsync,
    listThreatsAsync,
    getThreatAsync,
    getBulkThreatsAsync,
    saveThreatAsync,
    bulkSaveThreatsAsync,
    updateThreatEntryAsync,
    deleteThreatEntryAsync,
    bulkDeleteThreatsAsync,
    initializeThreatCatalogueAsync
};
