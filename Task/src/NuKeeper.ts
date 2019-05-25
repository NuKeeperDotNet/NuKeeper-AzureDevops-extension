import * as path from 'path';
import * as tl from 'azure-pipelines-task-lib';
import * as tr from 'azure-pipelines-task-lib/toolrunner';
import getNuKeeper  from './VersionInstaller';
import getToken from './TokenProvider';
import createFeed from './FeedInstaller';

async function execNuKeeper(args: string|string[]) : Promise<any>  {
    try {
        const version = tl.getInput("version", false);
        const checkLatest = tl.getBoolInput("checkLatest", false) || false;
        
        const nukeeperPath = await getNuKeeper(version, checkLatest);

        return new tr.ToolRunner(tl.which("dotnet"))
            .arg([path.join(nukeeperPath, 'NuKeeper.dll')].concat(args))
            .arg(["--targetBranch", "origin/" + tl.getVariable('Build.SourceBranchName')])
            .line(tl.getInput("arguments"))
            .exec();

    } catch (err){
        throw err;
    }
}

async function run() {
   try {
        await tl.exec("git", ["config", "--global", "user.name", "NuKeeper"]);
        await tl.exec("git", ["config", "--global", "user.email", "nukeeper@nukeeper.com"]);
        
        tl.cd(tl.getVariable('Build.SourcesDirectory'));
        
        let token = await getToken();
        
        await createFeed("feed");

        await execNuKeeper(['repo', tl.cwd(), token]);
        
        tl.setResult(tl.TaskResult.Succeeded, "done");
    }
    catch (err) {
        tl.setResult(tl.TaskResult.Failed, err)
    }
}

void run();