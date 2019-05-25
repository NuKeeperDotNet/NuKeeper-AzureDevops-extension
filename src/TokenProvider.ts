import * as tl from 'azure-pipelines-task-lib';

export default async function getToken() : Promise<string> {
    const githubEndpoint = tl.getInput("gitHubConnection");

    if(githubEndpoint)  //github connection is specified
    {
        return getGithubEndPointToken(githubEndpoint);
    }

    return tl.getEndpointAuthorizationParameter("SystemVssConnection", "AccessToken", false);
}


function getGithubEndPointToken(githubEndpoint: string): string {
    const githubEndpointObject = tl.getEndpointAuthorization(githubEndpoint, false);
    let githubEndpointToken: string = null;

    if (!!githubEndpointObject) {
        tl.debug("Endpoint scheme: " + githubEndpointObject.scheme);
        
        if (githubEndpointObject.scheme === 'PersonalAccessToken') {
            githubEndpointToken = githubEndpointObject.parameters.accessToken
        } else if (githubEndpointObject.scheme === 'OAuth'){
            // scheme: 'OAuth'
            githubEndpointToken = githubEndpointObject.parameters.AccessToken
        }
        else if (githubEndpointObject.scheme) {
            throw new Error(tl.loc("InvalidEndpointAuthScheme", githubEndpointObject.scheme));
        }
    }

    if (!githubEndpointToken) {
        throw new Error(tl.loc("InvalidGitHubEndpoint", githubEndpoint));
    }

    return githubEndpointToken;
}