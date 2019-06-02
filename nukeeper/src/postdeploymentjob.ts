import * as tl from 'azure-pipelines-task-lib';
import { deleteNugetConfig } from './FeedInstaller';

async function run() {
   try {
        tl.execSync("git", ["checkout", "--progress", "--force", tl.getVariable('Build.SourceVersion')]);
        tl.execSync("git", ["config", "--global", "--unset", "user.name"]);
        tl.execSync("git", ["config", "--global", "--unset", "user.email"]);

        await deleteNugetConfig();
        
    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, err)
    } 
}

void run();