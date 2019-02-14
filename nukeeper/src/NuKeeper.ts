import * as path from 'path';
import * as tl from 'vsts-task-lib';
import * as tr from 'vsts-task-lib/toolrunner';
let https = require("follow-redirects").https;
import fs = require("fs");
import q = require("q");
import { IncomingMessage } from "http";
import * as ttl from "vsts-task-tool-lib";

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

async function downloadFile(url: string, dest: string): q.Promise<any> {
    let deferal = q.defer<any>();
    let file = fs.createWriteStream(dest);
    https.get(url, (response: IncomingMessage) => {
        response.pipe(file);
        file.on("finish", () => {
            deferal.resolve();
        });
    }).on("error", (err: any) => {
        deferal.reject(err);
    });

    return deferal.promise;
}

async function run() {
   try {
        let localFilePath = path.join(__dirname, './', "nukeeper.nupkg");
        let extractionPath = path.resolve(__dirname, './nukeeper');
        
        if (!fs.existsSync(extractionPath)) {
            await downloadFile("https://www.nuget.org/api/v2/package/NuKeeper", localFilePath);
            await ttl.extractZip(path.join(__dirname, './', 'nukeeper.nupkg'), path.resolve(__dirname, './nukeeper'));
        }
        
        tl.execSync("git", ["checkout", tl.getVariable('Build.SourceBranchName')]);
        tl.execSync("git", ["pull"]);
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