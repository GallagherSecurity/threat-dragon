import env from '../env/Env.js';
import github from 'octonode';

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
const listTemplatesAsync = async (accessToken) => getClient(accessToken)
    .repo(env.get().config.GITHUB_CONTENT_REPO).
    contentsAsync('templates/template_info.json');




const getTemplateAsync = async (name, accessToken) => {
    // Fetch a specific template by name
    // return client.repo(repo).contentsAsync(`templates/${name}.json`)
}
const createTemplateAsync = async (templateInfo, accessToken) => {
    // Add a new template to the repo
    // return client.repo(repo).createContentsAsync(`templates/${templateInfo.name}.json`, 'Created template', JSON.stringify(templateInfo.body, null, '  '), branch)
}
const updateTemplateAsync = async (templateInfo, accessToken) => {
    // Edit template metadata
    // const original = await getTemplateAsync(templateInfo.name)
    // return client.repo(repo).updateContentsAsync(`templates/${templateInfo.name}.json`, 'Updated template', JSON.stringify(templateInfo.body, null, '  '), original[0].sha, branch)
}
const deleteTemplateAsync = async (name, accessToken) => { }
// Delete a template from the repo
// const content = await    }
// getTemplateAsync(name)
// return client.repo(repo).deleteContentsAsync(`templates/${name}.json`, 'Deleted template', content[0].sha, branch)   

const createBranchAsync = async (repoInfo, accessToken) => {
    const client = getClient(accessToken);
    const repo = getRepoFullName(repoInfo);
    const resp = await client.repo(repo).refAsync(`heads/${repoInfo.ref}`);
    const sha = resp[0].object.sha;
    return client.repo(repo).createRefAsync(`refs/heads/${repoInfo.branch}`, sha);
};

const getRepoFullName = (info) => `${info.organisation}/${info.repo}`;
const getModelPath = (modelInfo) => `${repoRootDirectory()}/${modelInfo.model}/${modelInfo.model}.json`;
const getTemplateMetadataPath = (name) => `templates/${name}.json`;
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
};
