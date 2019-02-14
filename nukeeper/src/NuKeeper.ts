import * as path from 'path';
import * as tl from 'azure-pipelines-task-lib';
import * as tr from 'azure-pipelines-task-lib/toolrunner';
import * as ttl from 'azure-pipelines-tool-lib';

async function execNuKeeper(args: string|string[]) : Promise<any>  {
    try {
        return new tr.ToolRunner(tl.which("dotnet"))
            .arg([path.join(__dirname, './nukeeper/tools/netcoreapp2.1/any', 'NuKeeper.dll')].concat(args))
            .line(tl.getInput("arguments"))
            .exec();
    } catch (err){
        throw err;
    }
}

async function run() {
   try {
        let downPath: string = await ttl.downloadTool("https://www.nuget.org/api/v2/package/NuKeeper", "nukeeper.nupkg");
        await ttl.extractZip(downPath, path.resolve(__dirname, './nukeeper'));
        
        tl.execSync("git", ["checkout", tl.getVariable('Build.SourceBranchName')]);
        tl.execSync("git", ["config", "--global", "user.name", "NuKeeper"]);
        tl.execSync("git", ["config", "--global", "user.email", "nukeeper@nukeeper.com"]);
    
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