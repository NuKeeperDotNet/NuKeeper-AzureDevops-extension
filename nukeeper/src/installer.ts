
import * as jsonPath from 'jsonpath';
import * as toolLib from 'azure-pipelines-tool-lib';
import * as tl from 'azure-pipelines-task-lib';
import * as httpm from 'typed-rest-client/HttpClient';
import * as path from 'path';

export default async function getNuKeeper(versionSpec: string, checkLatest: boolean) : Promise<string> {

    if (toolLib.isExplicitVersion(versionSpec)) {
        checkLatest = false; // check latest doesn't make sense when explicit version
    }

    let toolPath: string;
    if (!checkLatest) {
        //
        // Let's try and resolve the version spec locally first
        //
        toolPath = toolLib.findLocalTool('nukeeper', versionSpec);
    }

    if (!toolPath) {
        let version: string;
        if (toolLib.isExplicitVersion(versionSpec)) {
            //
            // Explicit version was specified. No need to query for list of versions.
            //
            version = versionSpec;
        }
        else {
            //
            // Let's query and resolve the latest version for the versionSpec.
            // If the version is an explicit version (1.1.1 or v1.1.1) then no need to query.
            // If your tool doesn't offer a mechanism to query, 
            // then it can only support exact version inputs.
            //
            version = await queryLatestMatch(versionSpec);
            if (!version) {
                throw new Error(`Unable to find NuKeeper version '${versionSpec}'.`);
            }

            //
            // Check the cache for the resolved version.
            //
            toolPath = toolLib.findLocalTool('nukeeper', version)
        }

        if (!toolPath) {
            //
            // Download, extract, cache
            //

            try {
                toolPath = await acquireNuKeeper(version);
            } catch (err) {
                tl.setResult(tl.TaskResult.Failed, "Error acquiring NuKeeper version");
            }
        }
    }

    return toolPath;
}

async function queryLatestMatch(versionSpec: string): Promise<string> {
    try {
        let nukeeperVersionEndpoint = "https://api.nuget.org/v3/registration3/nukeeper/index.json";
        
        let res: httpm.HttpClientResponse = await new httpm.HttpClient(null).get(nukeeperVersionEndpoint);
        let jsonResponse: string = await res.readBody();
        let versions = jsonPath.query(JSON.parse(jsonResponse), '$.items[*].items[*].catalogEntry.version');

        let version: string = toolLib.evaluateVersions(versions, versionSpec);

        return version;
    } catch (err){
        tl.setResult(tl.TaskResult.Failed, "Error reading nuget version list");
    }
}

async function acquireNuKeeper(version: string): Promise<string> {
    //
    // Download - a tool installer intimately knows how to get the tool (and construct urls)
    //
    version = toolLib.cleanVersion(version);
    const fileName = 'nukeeper.' + version + '.nupkg';
    let downloadUrl = 'https://api.nuget.org/v3-flatcontainer/nukeeper/' + version + '/' + fileName;

    let downloadPath: string = await toolLib.downloadTool(downloadUrl);
    let unpackedPath = downloadPath + ".unpacked";

    await toolLib.extractZip(downloadPath, unpackedPath);

    let foundVersions = tl.findMatch(unpackedPath, '**/NuKeeper.dll');

    let toolRoot: string;

    if(foundVersions.length > 0)
    {
        toolRoot = foundVersions[0]; //get first matched version
    } else {
        tl.setResult(tl.TaskResult.Failed, "No version found that matched your query");
    }

    return toolLib.cacheDir(path.dirname(toolRoot), 'nukeeper', version);
}
