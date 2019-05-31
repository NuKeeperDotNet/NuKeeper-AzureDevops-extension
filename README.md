
[![Build Status](https://travis-ci.org/NuKeeperDotNet/NuKeeper.svg?branch=master)](https://travis-ci.org/NuKeeperDotNet/NuKeeper/)
[![Gitter](https://img.shields.io/gitter/room/NuKeeperDotNet/Lobby.js.svg?maxAge=2592000)](https://gitter.im/NuKeeperDotNet/Lobby)

# NuKeeper AzureDevops Extension

This is the [NuKeeper](https://github.com/NuKeeperDotNet/NuKeeper) for [Azure DevOps](https://azure.microsoft.com/en-gb/services/devops/) / VSTS extension. It will allow you to run the NuKeeper command inside the users build pipeline.

You will find it [here in the Visual Studio marketplace](https://marketplace.visualstudio.com/items?itemName=nukeeper.nukeeper).

It's up to the user to schedule the pipeline in whatever is correct for their solution.


[See the website for installation instructions](https://nukeeper.com/platform/azure-devops/#extension)

## Development

### Prerequisites
- npm

### Debugging the extension

Run `npm install` in root folder.
Create a folder named `temp` in the root folder.

Adjust `.vscode/launch.json`:
* Adjust the `BUILD_SOURCESDIRECTORY` for a path to a repo. 
* Put a valid token in the `ENDPOINT_AUTH_PARAMETER_SYSTEMVSSCONNECTION_ACCESSTOKEN`

Open the root folder in Visual Studio Code.

Go to the debugger tab and click `Debug NuKeeper`.

>Check the Debug console for output
