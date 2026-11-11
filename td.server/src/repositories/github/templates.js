import env from '../../env/Env.js';
import { getClient } from './client.js';

const METADATA_PATH = 'templates/template_info.json';

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

export default {
    listTemplatesAsync,
    createMetadataAsync,
    createContentFileAsync,
    updateMetadataAsync,
    deleteContentFileAsync,
    getContentFileAsync
};
