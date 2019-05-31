import * as tl from 'azure-pipelines-task-lib';
import * as path from "path";
import * as fs from "fs";
import * as builder from "xmlbuilder";
import * as tr from 'azure-pipelines-task-lib/toolrunner';

interface IFeedResponse {
    url: string;
}

export interface IPackageSource {
    feedName: string;
    feedUri: string;
}

const nugetConfigPath = path.join(tl.getVariable('Pipeline.Workspace'), "NuGet.config");

export default async function createFeed(inputParam: string, nukeeperPath: string): Promise<any> {
    try {
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

        var accessToken = tl.getVariable("System.AccessToken");
        if(accessToken)
        {
            tl.debug("Getting package information..");
            var packageSource = await getPackageSource(feedId, accessToken);
            tl.debug("Done getting package information..");

            tl.debug("Create local nuget config content");
            var content = createEmptyNugetConfig(packageSource, accessToken); //set the nugetConfig content
            tl.debug("Done creating local nuget config content");

            tl.debug("Create local nuget config");
            await createNugetConfig(content, nukeeperPath, packageSource, accessToken); //create a temp local nuget.config
            tl.debug("Done creating local nuget config");
        } else 
        {
            tl.setResult(tl.TaskResult.Failed, "NuKeeper needs access to the OAuth token to query the API");
        }

    } catch (err) {
        tl.debug(err);
        tl.setResult(tl.TaskResult.Failed, "Error creating a private feed");
    }
}

async function getPackageSource(feedId: string, accessToken : string) : Promise<IPackageSource> {
    try {
        if (feedId) {
            var organisationUrl = tl.getVariable("System.TeamFoundationCollectionUri"); //get the default package url

            const overwritePackagingCollectionUrl = tl.getVariable("NuGet.OverwritePackagingCollectionUrl"); //change to collectionurl if necessary
            if (overwritePackagingCollectionUrl) {
                tl.debug("Overwriting packaging collection URL");
                organisationUrl = overwritePackagingCollectionUrl;
            }
            
            var parts = organisationUrl.split("/");
            let organisation : string; 
            
            if (parts.length === 3)
            {
                organisation = parts[3]; //new style: https://dev.azure.com/x/
            }
            
            if (parts.length === 4)
            {
                organisation = parts[2].split(".")[0]; //old style: https://x.visualstudio.com/
            }

            var url = `https://pkgs.dev.azure.com/${organisation}/_packaging/${feedId}/nuget/v3/index.json`;
           
            tl.debug("Feed registry url: " + url);
            return <IPackageSource>
            {
                feedName: feedId,
                feedUri: url
            }
        }
    } catch (err) {
        tl.debug(err);
        tl.setResult(tl.TaskResult.Failed, "Error getting the package source");
    }
}

async function createNugetConfig(xmlContent: string, nukeeperPath: string, packageSource: IPackageSource, password: string): Promise<any> {
    try {
        //Needs to be NuGet.config for NuKeeper to find it.
        //It also needs to be up the tree relative to the caller. The tree is searched for Nuget.Config up till the root of the machine
        fs.writeFileSync(nugetConfigPath, xmlContent);

        var args = ["sources", "add", "-name", packageSource.feedName, "-source", packageSource.feedUri, "-username", "nukeeper", "-password", password, "-configFile", nugetConfigPath]
        await tl.exec(path.join(nukeeperPath, 'NuGet.exe'), args);

    } catch (err) {
        tl.debug(err);
        tl.setResult(tl.TaskResult.Failed, "Error writting file temp nuget config");
    }
}


function createEmptyNugetConfig (packageSource: IPackageSource, accessToken: string) : string
{
    var xml = builder.create('configuration')
    .ele('packageSources')
    .up()
    .ele('packageSourceCredentials')
    .up()
    .end({ pretty: true});
    return xml
}

export async function deleteNugetConfig()
{
    try 
    {
        fs.exists(nugetConfigPath, (exists)  =>
        {
            if(exists)
            {
                fs.unlink(nugetConfigPath, (err) => 
                {
                    tl.debug(`Couldn't delete nuget config file: ${err}`);
                });
            }
        });
    }
    catch(err){
        tl.debug("Couldn't delete nuget config file");
    }
}
