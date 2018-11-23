
import * as tl from 'vsts-task-lib';

async function run() {
   try {
        tl.exec("git", ["checkout", "--progress", "--force", tl.getVariable('Build.SourceVersion')]);
        tl.exec("git", ["config", "--global", "--unset", "user.name"]);
        tl.exec("git", ["config", "--global", "--unset", "user.email"]);
    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, err)
    } 
}

void run();