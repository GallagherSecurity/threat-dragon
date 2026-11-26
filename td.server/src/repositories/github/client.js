import env from '../../env/Env.js';
import github from 'octonode';

export const getClient = (accessToken) => {
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

export const repoExistsAsync = (accessToken) => {
    const client = getClient(accessToken);
    return client.repo(env.get().config.GITHUB_CONTENT_REPO).infoAsync();
};
