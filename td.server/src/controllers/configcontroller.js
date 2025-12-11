import env from "../env/Env";
import loggerHelper from '../helpers/logger.helper.js';
import googledrive from "../repositories/googledrive.js";
import responseWrapper from "./responseWrapper";

const logger = loggerHelper.get('controllers/configcontroller.js');

const config = (req, res) => responseWrapper.sendResponse(() => getConfig(), req, res, logger);

export const getConfig = () => ({
    bitbucketEnabled: env.get().config.BITBUCKET_CLIENT_ID !== undefined && env.get().config.BITBUCKET_CLIENT_ID !== null,
    githubEnabled: env.get().config.GITHUB_CLIENT_ID !== undefined && env.get().config.GITHUB_CLIENT_ID !== null,
    gitlabEnabled: env.get().config.GITLAB_CLIENT_ID !== undefined && env.get().config.GITLAB_CLIENT_ID !== null,
    googleEnabled: env.get().config.GOOGLE_CLIENT_ID !== undefined && env.get().config.GOOGLE_CLIENT_ID !== null,
    githubContentEnabled: env.get().config.GITHUB_CONTENT_REPO !== undefined && env.get().config.GITHUB_CONTENT_REPO !== null,
    gitlabContentEnabled: false,  // Future: env.get().config.GITLAB_CONTENT_REPO
    bitbucketContentEnabled: false,  // Future: env.get().config.BITBUCKET_CONTENT_REPO
    googleContentEnabled: false, // Future: env.get().config.GOOGLE_CONTENT_REPO
    localEnabled: true,
});

export default {
    config
};
