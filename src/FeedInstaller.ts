import * as tl from 'azure-pipelines-task-lib';
import * as path from "path";
import * as fs from "fs";
import * as builder from "xmlbuilder";
import * as vsts from 'azure-devops-node-api';
import { IRequestOptions } from 'azure-devops-node-api/interfaces/common/VsoBaseInterfaces';

export interface IPackageSource {
    feedName: string;
    feedUri: string;
}

export default async function createFeed(inputParam: string): Promise<any> {
    const feedProject = tl.getInput(inputParam);

    if(!feedProject) //no feed specified
    {
        return;
    }

    var projectId = null;
    var feedId = feedProject;
    if(feedProject && feedProject.includes("/")) {
        const feedProjectParts = feedProject.split("/");
        projectId = feedProjectParts[0] || null;
        feedId = feedProjectParts[1];
    }

    var accessToken = tl.getEndpointAuthorizationParameter("SystemVssConnection", "AccessToken", false);
    var packageSource = await getPackageSource(feedId, projectId, accessToken);
    var content = createNugetConfigContent(packageSource, accessToken); //set the nugetConfig content

    createNugetConfig(content); //create a temp local nuget.config
  
    return "hi"
}

async function getPackageSource(feedId: string, projectId: string, accessToken : string) : Promise<IPackageSource> {
    if (feedId) {
        if(projectId) {
            throw new Error(tl.loc("UnsupportedProjectScopedFeeds"));
        } else {
            var packageUrl = tl.getVariable("System.TeamFoundationCollectionUri"); //get the default package url

            const overwritePackagingCollectionUrl = tl.getVariable("NuGet.OverwritePackagingCollectionUrl"); //change to collectionurl if necessary
            if (overwritePackagingCollectionUrl) {
                tl.debug("Overwriting packaging collection URL");
                packageUrl = overwritePackagingCollectionUrl;
            }
            
            var webApi = getWebApiWithProxy(packageUrl, accessToken); //create a webapi

            var nugetVersion = {
                apiVersion: '3.0-preview.1',
                area: 'nuget',
                locationId: "9D3A4E8E-2F8F-4AE1-ABC2-B461A51CB3B3"
            };

            const data = await Retry(async () => {
                return await webApi.vsoClient.getVersioningData(nugetVersion.apiVersion, nugetVersion.area, nugetVersion.locationId, { feedId: feedId, project: null });
            }, 4, 100);
        
            tl.debug("Feed registry url: " + data.requestUrl);
            let feedUrl = data.requestUrl;

            return <IPackageSource>
            {
                feedName: feedId,
                feedUri: feedUrl
            }
        }
    }
}

function createNugetConfig(xmlContent: string): any {
    let tempNugetConfigBaseDir = tl.getVariable("Agent.BuildDirectory") || tl.getVariable("Agent.TempDirectory");
    let tempNugetConfigDir = path.join(tempNugetConfigBaseDir, "Nuget");
    let tempNugetConfigFileName = "tempNuGet_" + tl.getVariable("build.buildId") + ".config";
    let tempNugetConfigPath = path.join(tempNugetConfigDir, tempNugetConfigFileName);

    if (!(fs.existsSync(tempNugetConfigDir))) {
        fs.mkdirSync(tempNugetConfigDir);
    }
    
    fs.writeFileSync(tempNugetConfigPath, xmlContent); 
}


function createNugetConfigContent (packageSource: IPackageSource, accessToken: string) : string
{
    var xml = builder.create('configuration')
    .ele('packageSources')
      .ele('add', {'key': packageSource.feedName, 'value': packageSource.feedUri})
    .ele('packageSourceCredentials')
        .ele(packageSource.feedName)
            .ele('add', {'key' : 'username', 'value' : 'doesntmatter'})
            .ele('add', {'key' : 'Password', 'value' : accessToken})
    .end({ pretty: true});

    return xml
}


export function getWebApiWithProxy(serviceUri: string, accessToken: string): vsts.WebApi {
    const credentialHandler = vsts.getBasicHandler('vsts', accessToken);
    const options: IRequestOptions = {
        proxy: tl.getHttpProxyConfiguration(serviceUri)
    };
    return new vsts.WebApi(serviceUri, credentialHandler, options);
}

// This should be replaced when retry is implemented in vso client.
export async function Retry<T>(cb : () => Promise<T>, max_retry: number, retry_delay: number) : Promise<T> {
    try {
        return await cb();
    } catch(exception) {
        tl.debug(JSON.stringify(exception));
        if(max_retry > 0)
        {
            tl.debug("Waiting ${retry_delay} ms...");
            await delay(retry_delay);
            tl.debug("Retrying...");
            return await Retry<T>(cb, max_retry-1, retry_delay*2);
        } else {
            throw new Error(exception);
        }
    }
}

function delay(delayMs:number) : Promise<any> {
    return new Promise(function(resolve) { 
        setTimeout(resolve, delayMs);
    });
}