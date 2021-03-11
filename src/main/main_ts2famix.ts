import {Project} from "ts-morph"
import {Data} from "./Data";
import {ClassHandler} from "./ClassHandler";
import {GeneralHandler} from "./GeneralHandler";

let data = new Data();
let repo_name = 'entities'

const project = new Project();
project.addSourceFilesAtPaths("resources/repo/"+repo_name+"/**/*.ts");

project.getSourceFiles().forEach(sourceFile => {
    console.log('\nSource file: ' + sourceFile.getBaseName());

    const hasClasses = sourceFile.getClasses().length > 0;
    if (hasClasses) {
        new ClassHandler(data, sourceFile)
    }

    const hasInterfaces = sourceFile.getInterfaces().length > 0;
    if (hasInterfaces) {
        console.log('Found interfaces:');
        sourceFile.getInterfaces().forEach(inter => {
            console.log(' Interface: ' + inter.getName());
        });
    }
});

let generalHandler = new GeneralHandler(data)
generalHandler.runOnProject(project)

data.mseFile += ')'
saveMSEFile(data.mseFile);

function saveMSEFile(mseFile: string) {
    const fs = require('fs');
    fs.writeFileSync('resources/mse/'+repo_name+'.mse', mseFile);
    console.log('\nFile successfully created!');
}

