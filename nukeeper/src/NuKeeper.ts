import * as path from 'path';
import * as tl from 'azure-pipelines-task-lib';
import * as tr from 'azure-pipelines-task-lib/toolrunner';
import * as ttl from 'azure-pipelines-tool-lib';
import fs = require("fs");

async function execNuKeeper(args: string|string[]) : Promise<any>  {
    try {
        return new tr.ToolRunner(tl.which("dotnet"))
            .arg([path.join(tl.getVariable('Agent.TempDirectory'), './nukeeper/tools/netcoreapp2.1/any', 'NuKeeper.dll')].concat(args))
            .arg(["--targetBranch", "/origin/" + tl.getVariable('Build.SourceBranchName')])
            .line(tl.getInput("arguments"))
            .exec();
    } catch (err){
        throw err;
    }
}

async function run() {
   try {
        let extractionPath = path.resolve(tl.getVariable('Agent.TempDirectory'), './nukeeper');
    
        if (!fs.existsSync(extractionPath)) {
            let downPath: string = await ttl.downloadTool("https://www.nuget.org/api/v2/package/NuKeeper", "nukeeper.nupkg");
            await ttl.extractZip(downPath, extractionPath);
        }

        await tl.exec("git", ["config", "--global", "user.name", "NuKeeper"]);
        await tl.exec("git", ["config", "--global", "user.email", "nukeeper@nukeeper.com"]);
        
        tl.cd(tl.getVariable('Build.SourcesDirectory'));
    
        let token = tl.getEndpointAuthorizationParameter("SystemVssConnection", "AccessToken", false);
        
        await execNuKeeper(['repo', tl.cwd(), token]);
        
        tl.setResult(tl.TaskResult.Succeeded, "done");
    }
    catch (err) {
        tl.setResult(tl.TaskResult.Failed, err)
    }
}

void run();