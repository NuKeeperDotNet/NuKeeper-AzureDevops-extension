import * as tl from 'azure-pipelines-task-lib';
import * as path from "path";
import * as fs from "fs";
import * as builder from "xmlbuilder";

interface IFeedResponse {
    url: string;
}

export interface IPackageSource {
    feedName: string;
    feedUri: string;
}

const workspace = tl.getVariables().some(x => x.name === 'Pipeline.Workspace') ? 
    tl.getVariable('Pipeline.Workspace') : 
    tl.getVariable('Agent.BuildDirectory');
    
const nugetConfigPath = path.join(workspace, "NuGet.config");

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
            var packageSource = await getPackageSource(feedId, projectId, accessToken);
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

async function getPackageSource(feedId: string, projectId: string, accessToken : string) : Promise<IPackageSource> {
    try {
        if (feedId) {
            var organisationUrl = tl.getVariable("System.TeamFoundationCollectionUri"); //get the default package url

            const overwritePackagingCollectionUrl = tl.getVariable("NuGet.OverwritePackagingCollectionUrl"); //change to collectionurl if necessary
            if (overwritePackagingCollectionUrl) {
                tl.debug("Overwriting packaging collection URL");
                organisationUrl = overwritePackagingCollectionUrl;
            }
            
            let organisation = getOrganisation(organisationUrl);
            
            var url = null;
            var name = null;
            if( projectId == null) {
                url = `https://pkgs.dev.azure.com/${organisation}/_packaging/${feedId}/nuget/v3/index.json`;
                name = 'organisationalScoped';
            } else {
                url = `https://pkgs.dev.azure.com/${organisation}/${projectId}/_packaging/${feedId}/nuget/v3/index.json`;
                name  = 'projectScoped';
            }
          
        
            tl.debug("Feed url: ${ url }");
        
            return <IPackageSource>
            {
                feedName: name,
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

function getOrganisation (organisationUrl: string) : string
{
    let parts = organisationUrl.split("/");

    // Check for new style: https://dev.azure.com/x/
    if (parts.length === 5)
    {
        return parts[3];
    }
    
    // Check for old style: https://x.visualstudio.com/
    if (parts.length === 4)
    {
        // Get x.visualstudio.com part.
        let part = parts[2];

        // Return organisation part (x).
        return part.split(".")[0];
    }

    tl.setResult(tl.TaskResult.Failed, `Error parsing organisation from organisation url: '${organisationUrl}'.`);
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
