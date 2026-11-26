import env from '../../env/Env.js';
import { getClient } from './client.js';

const repoRootDirectory = () => env.get().config.GITHUB_REPO_ROOT_DIRECTORY || env.get().config.REPO_ROOT_DIRECTORY;

const reposAsync = (page, accessToken) => getClient(accessToken).me().
    reposAsync(page);

const searchAsync = (page, accessToken, searchQuery = []) => getClient(accessToken).search().
    reposAsync({ page: page, q: searchQuery });

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
    getRepoPermissionsAsync
};
