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
    const { standards } = JSON.parse(decoded);
    return { standards, sha: file.sha };
};

const updateStandardsFileAsync = (accessToken, standards, sha, message) => getClient(accessToken).
    repo(env.get().config.GITHUB_CONTENT_REPO).
    updateContentsAsync(STANDARDS_PATH, message, JSON.stringify({ standards }, null, 2), sha, 'main');

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
    const { standards, sha } = await getStandardsFileAsync(accessToken);
    await updateStandardsFileAsync(accessToken, [...standards, { id, name }], sha, `feat: add standard ${name}`);
    return { id };
};

const deleteStandardAsync = async (accessToken, id) => {
    const { standards, sha } = await getStandardsFileAsync(accessToken);
    await updateStandardsFileAsync(accessToken, standards.filter((s) => s.id !== id), sha, `feat: remove standard ${id}`);
};

const initializeStandardsAsync = (accessToken) => getClient(accessToken).
    repo(env.get().config.GITHUB_CONTENT_REPO).
    createContentsAsync(STANDARDS_PATH, 'feat: initialize standards', JSON.stringify({ standards: [] }, null, 2), 'main');

export default {
    listStandardsAsync,
    saveStandardAsync,
    deleteStandardAsync,
    initializeStandardsAsync
};
