
import * as tl from 'vsts-task-lib';


async function run() {
   try {
        tl.exec("git", ["checkout", tl.getVariable('Build.SourceBranchName')]); 
        tl.exec("git", ["config", "--global", "user.name", "NuKeeper"]);
        tl.exec("git", ["config", "--global", "user.email", "nukeeper@nukeeper.com"]);
        tl.cd(tl.getVariable('Build.SourcesDirectory'));
    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, err)
    }
}

void run();