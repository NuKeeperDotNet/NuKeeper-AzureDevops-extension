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
        await createFeed("feed", nukeeperPath);

        var nukeeperArgs = tl.getInput("arguments");
        if(nukeeperArgs.includes('--targetBranch'))
        {
            return new tr.ToolRunner(tl.which("dotnet"))
                .arg([path.join(nukeeperPath, 'NuKeeper.dll')].concat(args))
                .line(nukeeperArgs)
                .exec();
        } 
        else 
        {
            // Get target branch.
            // For reference: https://github.com/microsoft/azure-pipelines-agent/issues/838#issuecomment-403151822
            const sourceBranch = tl.getVariable('Build.SourceBranch');
            const targetBranch = "origin/" + sourceBranch.substring(sourceBranch.indexOf('/', 5) + 1);
            tl.debug(`Used target branch: '${targetBranch}'`);

            return new tr.ToolRunner(tl.which("dotnet"))
                .arg([path.join(nukeeperPath, 'NuKeeper.dll')].concat(args))
                .arg(["--targetBranch", targetBranch])
                .line(nukeeperArgs)
                .exec();
        }
    } catch (err){
        throw err;
    }
}

async function run() {
   try {
        await tl.exec("git", ["config", "--global", "user.name", "NuKeeper"]);
        await tl.exec("git", ["config", "--global", "user.email", "nukeeper@nukeeper.com"]);
        
        var path: string = tl.getPathInput('targetFolder');
        if(path)
        {
            tl.cd(path);
        } else 
        {
            tl.cd(tl.getVariable('Build.SourcesDirectory'));
        }
        
        let token = await getToken();
        await execNuKeeper(['repo', tl.cwd(), token]);
        
        tl.setResult(tl.TaskResult.Succeeded, "done");
    }
    catch (err) {
        tl.setResult(tl.TaskResult.Failed, err)
    }
}

void run();
