import { getClient, repoExistsAsync } from './client.js';

import env from '../../env/Env.js';
import { randomUUID } from 'crypto';

const STANDARDS_PATH = 'standards/standards.json';

const getStandardsFileAsync = async (accessToken) => {
    const result = await getClient(accessToken).
        repo(env.get().config.GITHUB_CONTENT_REPO).
        contentsAsync(STANDARDS_PATH);
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
        await getClient(accessToken).
            repo(env.get().config.GITHUB_CONTENT_REPO).
            updateContentsAsync(STANDARDS_PATH, `feat: add standard ${name}`, JSON.stringify(standards, null, 2), sha, 'main');
    } catch (e) {
        if (e.statusCode === 404) {
            await getClient(accessToken).
                repo(env.get().config.GITHUB_CONTENT_REPO).
                createContentsAsync(STANDARDS_PATH, `feat: add standard ${name}`, JSON.stringify([{ id, name }], null, 2), 'main');
        } else {
            throw e;
        }
    }
    return { id };
};

const deleteStandardAsync = async (accessToken, id) => {
    const { standards, sha } = await getStandardsFileAsync(accessToken);
    const updated = standards.filter((s) => s.id !== id);
    await getClient(accessToken).
        repo(env.get().config.GITHUB_CONTENT_REPO).
        updateContentsAsync(STANDARDS_PATH, `feat: remove standard ${id}`, JSON.stringify(updated, null, 2), sha, 'main');
};

export default {
    listStandardsAsync,
    saveStandardAsync,
    deleteStandardAsync
};
