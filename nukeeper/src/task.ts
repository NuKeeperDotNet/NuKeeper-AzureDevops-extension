
import * as path from 'path';
import * as tl from 'vsts-task-lib';
import * as ttl from 'vsts-task-tool-lib';
import * as tr from 'vsts-task-lib/toolrunner';

async function execNuKeeper(args: string|string[]) : Promise<any>  {
    try {
        return new tr.ToolRunner(tl.which("dotnet"))
            .arg([path.join(__dirname, '..', 'bin', 'NuKeeper.dll')].concat(args))
            .line(tl.getInput("arguments"))
            .exec();

    } catch (err){
        throw err;
    }
}

async function run() {
   try {
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