import { getClient, repoExistsAsync } from './client.js';

import env from '../../env/Env.js';
import { randomUUID } from 'crypto';

const MITIGATION_CATALOGUE_METADATA_PATH = 'mitigations/mitigation_catalogue.json';

const listMitigationCatalogueAsync = (accessToken) => getClient(accessToken).
    repo(env.get().config.GITHUB_CONTENT_REPO).
    contentsAsync(MITIGATION_CATALOGUE_METADATA_PATH);

const getMitigationCatalogueFileAsync = async (accessToken) => {
    const result = await listMitigationCatalogueAsync(accessToken);
    const file = result[0];
    const decoded = Buffer.from(file.content, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded);
    const mitigations = Array.isArray(parsed) ? parsed : parsed.catalogue || [];
    return { mitigations, sha: file.sha };
};

const listMitigationsAsync = async (accessToken) => {
    if (!env.get().config.GITHUB_CONTENT_REPO) {return { mitigations: [], status: 'NOT_CONFIGURED' };}
    try {
        const { mitigations, sha } = await getMitigationCatalogueFileAsync(accessToken);
        return { mitigations, sha };
    } catch (e) {
        if (e.statusCode === 404) {
            try {
                await repoExistsAsync(accessToken);
                return { mitigations: [], status: 'NOT_INITIALIZED' };
            } catch {
                return { mitigations: [], status: 'NOT_FOUND' };
            }
        }
        throw e;
    }
};

const getMitigationAsync = async (accessToken, id) => {
    const { mitigations } = await getMitigationCatalogueFileAsync(accessToken);
    const entry = mitigations.find((m) => m.id === id);
    if (!entry) {return null;}
    try {
        const result = await getMitigationContentFileAsync(accessToken, entry.mitigationRef);
        const decoded = Buffer.from(result[0].content, 'base64').toString('utf8');
        return JSON.parse(decoded);
    } catch (e) {
        if (e.statusCode === 404) {return null;}
        throw e;
    }
};

const getBulkMitigationsAsync = async (accessToken, ids) => {
    const { mitigations: catalogue } = await getMitigationCatalogueFileAsync(accessToken);
    const entries = ids.map((id) => catalogue.find((m) => m.id === id)).filter(Boolean);
    return Promise.all(entries.map(async (entry) => {
        const result = await getMitigationContentFileAsync(accessToken, entry.mitigationRef);
        const decoded = Buffer.from(result[0].content, 'base64').toString('utf8');
        return JSON.parse(decoded);
    }));
};

const saveMitigationAsync = async (accessToken, mitigation) => {
    const { mitigations, sha } = await getMitigationCatalogueFileAsync(accessToken);
    const { id, briefDescription, hash, description, clauses, ...metadata } = mitigation;
    const { mitigationRef } = await createMitigationContentFileAsync(accessToken, { ...metadata, description, clauses });
    mitigations.push({ id, mitigationRef, ...metadata, briefDescription, hash });
    await updateMitigationCatalogueMetadataAsync(accessToken, mitigations, sha);
};

const bulkSaveMitigationsAsync = async (accessToken, newMitigations) => {
    const { mitigations, sha } = await getMitigationCatalogueFileAsync(accessToken);
    const newEntries = await newMitigations.reduce(async (prevPromise, mitigation) => {
        const acc = await prevPromise;
        const { id, briefDescription, hash, description, clauses, ...metadata } = mitigation;
        const { mitigationRef } = await createMitigationContentFileAsync(accessToken, { ...metadata, description, clauses });
        return [...acc, { id, mitigationRef, ...metadata, briefDescription, hash }];
    }, Promise.resolve([]));
    mitigations.push(...newEntries);
    await updateMitigationCatalogueMetadataAsync(accessToken, mitigations, sha);
};

const updateMitigationEntryAsync = async (accessToken, id, data) => {
    const { mitigations, sha } = await getMitigationCatalogueFileAsync(accessToken);
    const index = mitigations.findIndex((m) => m.id === id);
    if (index === -1) {
        const err = new Error(`Mitigation ${id} not found`);
        err.statusCode = 404;
        throw err;
    }
    const { description, clauses, briefDescription, hash, ...metadata } = data;
    const mitigationRef = mitigations[index].mitigationRef;
    mitigations[index] = { ...mitigations[index], ...metadata, id, mitigationRef, briefDescription, hash };
    await updateMitigationCatalogueMetadataAsync(accessToken, mitigations, sha);
    await updateMitigationContentFileAsync(accessToken, mitigationRef, { ...metadata, description, clauses });
};

const bulkDeleteMitigationsAsync = async (accessToken, ids) => {
    const { mitigations, sha } = await getMitigationCatalogueFileAsync(accessToken);
    const toDelete = mitigations.filter((m) => ids.includes(m.id));
    const remaining = mitigations.filter((m) => !ids.includes(m.id));
    await updateMitigationCatalogueMetadataAsync(accessToken, remaining, sha);
    await toDelete.reduce(async (prevPromise, m) => {
        await prevPromise;
        return deleteMitigationContentFileAsync(accessToken, m.mitigationRef);
    }, Promise.resolve());
};

const deleteMitigationEntryAsync = async (accessToken, id) => {
    const { mitigations, sha } = await getMitigationCatalogueFileAsync(accessToken);
    const mitigation = mitigations.find((m) => m.id === id);
    if (!mitigation) {
        const err = new Error(`Mitigation ${id} not found`);
        err.statusCode = 404;
        throw err;
    }
    await updateMitigationCatalogueMetadataAsync(accessToken, mitigations.filter((m) => m.id !== id), sha);
    await deleteMitigationContentFileAsync(accessToken, mitigation.mitigationRef);
};

const initializeMitigationCatalogueAsync = async (accessToken) => {
    await createMitigationCatalogueMetadataAsync(accessToken);
};

const createMitigationCatalogueMetadataAsync = (accessToken) => {
    const repo = getClient(accessToken).repo(env.get().config.GITHUB_CONTENT_REPO);
    const fileContent = JSON.stringify({ catalogue: [] }, null, 2);
    return repo.createContentsAsync(
        MITIGATION_CATALOGUE_METADATA_PATH,
        'feat: initialize mitigation catalogue',
        fileContent,
        'main'
    );
};

const updateMitigationCatalogueMetadataAsync = (accessToken, newCatalogueMetadata, sha) => {
    const repo = getClient(accessToken).repo(env.get().config.GITHUB_CONTENT_REPO);
    const fileContent = JSON.stringify({ catalogue: newCatalogueMetadata }, null, 2);
    return repo.updateContentsAsync(
        MITIGATION_CATALOGUE_METADATA_PATH,
        'feat: update mitigation catalogue index',
        fileContent,
        sha,
        'main'
    );
};

const createMitigationContentFileAsync = async (accessToken, content) => {
    const mitigationRef = randomUUID();
    const repo = getClient(accessToken).repo(env.get().config.GITHUB_CONTENT_REPO);
    const path = `mitigations/${mitigationRef}.json`;
    await repo.createContentsAsync(
        path,
        `feat: add mitigation ${mitigationRef}`,
        JSON.stringify(content, null, 2),
        'main'
    );
    return { mitigationRef };
};

const getMitigationContentFileAsync = (accessToken, mitigationRef) => {
    const repo = getClient(accessToken).repo(env.get().config.GITHUB_CONTENT_REPO);
    const path = `mitigations/${mitigationRef}.json`;
    return repo.contentsAsync(path, 'main');
};

const updateMitigationContentFileAsync = async (accessToken, mitigationRef, content) => {
    const repo = getClient(accessToken).repo(env.get().config.GITHUB_CONTENT_REPO);
    const path = `mitigations/${mitigationRef}.json`;
    const file = await repo.contentsAsync(path, 'main');
    return repo.updateContentsAsync(
        path,
        `feat: update mitigation ${mitigationRef}`,
        JSON.stringify(content, null, 2),
        file[0].sha,
        'main'
    );
};

const deleteMitigationContentFileAsync = async (accessToken, mitigationRef) => {
    const repo = getClient(accessToken).repo(env.get().config.GITHUB_CONTENT_REPO);
    const path = `mitigations/${mitigationRef}.json`;
    const file = await repo.contentsAsync(path, 'main');
    return repo.deleteContentsAsync(
        path,
        `feat: delete mitigation ${mitigationRef}`,
        file[0].sha,
        'main'
    );
};

export default {
    listMitigationsAsync,
    getMitigationAsync,
    getBulkMitigationsAsync,
    saveMitigationAsync,
    bulkSaveMitigationsAsync,
    updateMitigationEntryAsync,
    deleteMitigationEntryAsync,
    bulkDeleteMitigationsAsync,
    initializeMitigationCatalogueAsync
};
