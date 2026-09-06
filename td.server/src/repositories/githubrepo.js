import env from '../env/Env.js';
import github from 'octonode';
import { randomUUID } from 'crypto';



const repoRootDirectory = () => env.get().config.GITHUB_REPO_ROOT_DIRECTORY || env.get().config.REPO_ROOT_DIRECTORY;

const getClient = (accessToken) => {
    const enterpriseHostname = env.get().config.GITHUB_ENTERPRISE_HOSTNAME;
    if (enterpriseHostname) {
        const port = env.get().config.GITHUB_ENTERPRISE_PORT;
        const protocol = env.get().config.GITHUB_ENTERPRISE_PROTOCOL;
        const enterpriseOpts = { hostname: `${enterpriseHostname}/api/v3` };
        if (port) { enterpriseOpts.port = parseInt(port, 10); }
        if (protocol) { enterpriseOpts.protocol = protocol; }

        return github.client(accessToken, enterpriseOpts);
    }
    return github.client(accessToken);
};

const reposAsync = (page, accessToken) => getClient(accessToken).me().
    reposAsync(page);

const searchAsync = (page, accessToken, searchQuerys = []) => getClient(accessToken).search().
    reposAsync({ page: page, q: searchQuerys });

const userAsync = async (accessToken) => {

    const resp = await getClient(accessToken).me().
        infoAsync();
    return resp[0];
};

const branchesAsync = (repoInfo, accessToken) => {
    const client = getClient(accessToken);
    return client.repo(getRepoFullName(repoInfo)).branchesAsync(repoInfo.page);
};

const modelsAsync = (branchInfo, accessToken) => getClient(accessToken).
    repo(getRepoFullName(branchInfo)).
    contentsAsync(repoRootDirectory(), branchInfo.branch);

const modelAsync = (modelInfo, accessToken) => getClient(accessToken).
    repo(getRepoFullName(modelInfo)).
    contentsAsync(getModelPath(modelInfo), modelInfo.branch);

const createAsync = (modelInfo, accessToken) => getClient(accessToken).
    repo(getRepoFullName(modelInfo)).
    createContentsAsync(
        getModelPath(modelInfo),
        'Created by OWASP Threat Dragon',
        getModelContent(modelInfo),
        modelInfo.branch
    );

const updateAsync = async (modelInfo, accessToken) => {
    const original = await modelAsync(modelInfo, accessToken);
    const repo = getRepoFullName(modelInfo);
    const path = getModelPath(modelInfo);
    const modelContent = getModelContent(modelInfo);

    return getClient(accessToken).
        repo(repo).
        updateContentsAsync(
            path,
            'Updated by OWASP Threat Dragon',
            modelContent,
            original[0].sha,
            modelInfo.branch
        );
};

const deleteAsync = async (modelInfo, accessToken) => {
    const content = await modelAsync(modelInfo, accessToken);
    return getClient(accessToken).
        repo(getRepoFullName(modelInfo)).
        deleteContentsAsync(
            getModelPath(modelInfo),
            'Deleted by OWASP Threat Dragon',
            content[0].sha,
            modelInfo.branch
        );
};
const METADATA_PATH = 'templates/template_info.json';
const THREAT_CATALOGUE_METADATA_PATH = 'threats/threat_catalogue.json';

const repoExistsAsync = (accessToken) => {
    const client = getClient(accessToken);
    return client.repo(env.get().config.GITHUB_CONTENT_REPO).infoAsync();
};

const listTemplatesAsync = (accessToken) => getClient(accessToken).
    repo(env.get().config.GITHUB_CONTENT_REPO).
    contentsAsync(METADATA_PATH);


const createContentFileAsync = (accessToken, fileName, content) => {
    const repo = getClient(accessToken).repo(env.get().config.GITHUB_CONTENT_REPO);
    const path = `templates/${fileName}.json`;

    return repo.createContentsAsync(
        path, 
        `feat: add content for ${fileName}`, 
        JSON.stringify(content, null, 2),
        'main'
    );
};

const createMetadataAsync = (accessToken) => {
    const repo = getClient(accessToken).repo(env.get().config.GITHUB_CONTENT_REPO);
    const fileContent = JSON.stringify({ templates: [] }, null, 2);

    return repo.createContentsAsync(
        METADATA_PATH,
        'feat: initialize template repository',
        fileContent,
        'main'
    );
};

const updateMetadataAsync = (accessToken, newTemplateMetadata, sha) => {
    const repo = getClient(accessToken).repo(env.get().config.GITHUB_CONTENT_REPO);
    const fileContent = JSON.stringify({ templates: newTemplateMetadata }, null, 2);

    return repo.updateContentsAsync(
        METADATA_PATH,
        'feat: update template index',
        fileContent,
        sha,
        'main'
    );
};

const getContentFileAsync = (accessToken, modelRef) => {
    const repo = getClient(accessToken).repo(env.get().config.GITHUB_CONTENT_REPO);
    const path = `templates/${modelRef}.json`;
    return repo.contentsAsync(path, 'main');
};

const deleteContentFileAsync = async (accessToken, fileName) => {
    const repo = getClient(accessToken).repo(env.get().config.GITHUB_CONTENT_REPO);
    const path = `templates/${fileName}.json`;
    

    const file = await repo.contentsAsync(path, 'main');
    const sha = file[0].sha;
    
    return repo.deleteContentsAsync(
        path,
        `feat: delete template ${fileName}`,
        sha,
        'main'
    );
};

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
    const { id, briefDescription, hash, description, mitigation, ...metadata } = threat;
    const { threatRef } = await createThreatContentFileAsync(accessToken, { ...metadata, description, mitigation });
    threats.push({ id, threatRef, ...metadata, briefDescription, hash });
    await updateThreatCatalogueMetadataAsync(accessToken, threats, sha);
};

const bulkSaveThreatsAsync = async (accessToken, newThreats) => {
    const { threats, sha } = await getCatalogueFileAsync(accessToken);
    const newEntries = await newThreats.reduce(async (prevPromise, threat) => {
        const acc = await prevPromise;
        const { id, briefDescription, hash, description, mitigation, ...metadata } = threat;
        const { threatRef } = await createThreatContentFileAsync(accessToken, { ...metadata, description, mitigation });
        return [...acc, { id, threatRef, ...metadata, briefDescription, hash }];
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
    const { description, mitigation, briefDescription, hash, ...metadata } = data;
    const threatRef = threats[index].threatRef;
    threats[index] = { ...threats[index], ...metadata, id, threatRef, briefDescription, hash };
    await updateThreatCatalogueMetadataAsync(accessToken, threats, sha);
    await updateThreatContentFileAsync(accessToken, threatRef, { ...metadata, description, mitigation });
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

const STANDARDS_PATH = 'standards/standards.json';

const getStandardsFileAsync = async (accessToken) => {
    const result = await getClient(accessToken)
        .repo(env.get().config.GITHUB_CONTENT_REPO)
        .contentsAsync(STANDARDS_PATH);
    const file = result[0];
    const decoded = Buffer.from(file.content, 'base64').toString('utf8');
    const standards = JSON.parse(decoded);
    return { standards: Array.isArray(standards) ? standards : [], sha: file.sha };
};

const listStandardsAsync = async (accessToken) => {
    if (!env.get().config.GITHUB_CONTENT_REPO) { return { standards: [], status: 'NOT_CONFIGURED' }; }
    try {
        const { standards } = await getStandardsFileAsync(accessToken);
        return { standards };
    } catch (e) {
        if (e.statusCode === 404) {
            try {
                await repoExistsAsync(accessToken);
                return { standards: [], status: 'NOT_INITIALIZED' };
            } catch {
                return { standards: [], status: 'NOT_FOUND' };
            }
        }
        throw e;
    }
};

const saveStandardAsync = async (accessToken, name) => {
    const id = randomUUID();
    try {
        const { standards, sha } = await getStandardsFileAsync(accessToken);
        standards.push({ id, name });
        await getClient(accessToken)
            .repo(env.get().config.GITHUB_CONTENT_REPO)
            .updateContentsAsync(STANDARDS_PATH, `feat: add standard ${name}`, JSON.stringify(standards, null, 2), sha, 'main');
    } catch (e) {
        if (e.statusCode === 404) {
            await getClient(accessToken)
                .repo(env.get().config.GITHUB_CONTENT_REPO)
                .createContentsAsync(STANDARDS_PATH, `feat: add standard ${name}`, JSON.stringify([{ id, name }], null, 2), 'main');
        } else {
            throw e;
        }
    }
    return { id };
};

const deleteStandardAsync = async (accessToken, id) => {
    const { standards, sha } = await getStandardsFileAsync(accessToken);
    const updated = standards.filter((s) => s.id !== id);
    await getClient(accessToken)
        .repo(env.get().config.GITHUB_CONTENT_REPO)
        .updateContentsAsync(STANDARDS_PATH, `feat: remove standard ${id}`, JSON.stringify(updated, null, 2), sha, 'main');
};

const createBranchAsync = async (repoInfo, accessToken) => {
    const client = getClient(accessToken);
    const repo = getRepoFullName(repoInfo);
    const resp = await client.repo(repo).refAsync(`heads/${repoInfo.ref}`);
    const sha = resp[0].object.sha;
    return client.repo(repo).createRefAsync(`refs/heads/${repoInfo.branch}`, sha);
};

const getRepoFullName = (info) => `${info.organisation}/${info.repo}`;
const getModelPath = (modelInfo) => `${repoRootDirectory()}/${modelInfo.model}/${modelInfo.model}.json`;
const getModelContent = (modelInfo) => JSON.stringify(modelInfo.body, null, '  ');
const getRepoPermissionsAsync = async (accessToken, repoName) => {
    const client = getClient(accessToken); // Your existing client creator
    const info = await client.repo(repoName).infoAsync();
    return info[0].permissions;
};


export default {
    branchesAsync,
    createAsync,
    deleteAsync,
    modelAsync,
    modelsAsync,
    reposAsync,
    searchAsync,
    updateAsync,
    userAsync,
    createBranchAsync,
    getRepoPermissionsAsync,
    listTemplatesAsync,
    createMetadataAsync,
    createContentFileAsync,
    updateMetadataAsync,
    deleteContentFileAsync,
    getContentFileAsync,
    repoExistsAsync,
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
    initializeThreatCatalogueAsync,
    listStandardsAsync,
    saveStandardAsync,
    deleteStandardAsync,
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