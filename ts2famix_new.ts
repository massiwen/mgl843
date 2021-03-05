import {ClassDeclaration, Project} from "ts-morph"
import {Data} from "./Data";
import {ClassHandler} from "./ClassHandler";
import {FmxUtils} from "./FmxUtils";

let data = new Data();
let fmxUtils = new FmxUtils();

const project = new Project();
project.addSourceFilesAtPaths("entities/**/*.ts");

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

let tasks = [addClassToMSE, addMethodToMSE, addMethodsParametersToMSE, addClassesAttributesToMSE]

tasks.forEach(task => {
        project.getSourceFiles().forEach(srcFile => {
            if (srcFile.getClasses().length > 0) {
                srcFile.getClasses().forEach(aClass => {
                    task(aClass);
                });
            }
        });
    }
)

addTypesToMSE();
addNamespacesToMSE();
data.mseFile += ')'
saveMSEFile(data.mseFile);


function addClassToMSE(clazz: ClassDeclaration) {
    data.parentClassId = data.id;
    let containerRef: number = getEntityContainerRef(clazz);

    data.entitiesIds["Class-" + clazz.getName()] = data.id;
    data.mseFile += "    (" + data.famixPrefix + ".Class (id: " + data.id++ + ")\n";
    data.mseFile += "        (name '" + clazz.getName() + "')\n";
    data.mseFile += "        (modifiers 'public')";
    data.mseFile += "\n        (typeContainer (ref: " + containerRef + "))";

    data.mseFile += ")\n";
}


function addMethodToMSE(clazz: ClassDeclaration) {
    if (clazz.getMethods().length > 0) {
        clazz.getMethods().forEach(meth => {
            var tmpReturnType = fmxUtils.convertTsTypeToJava(meth.getReturnType().getText());
            data.entitiesIds["Method-" + meth.getName()] = data.id;

            data.mseFile += "    (" + data.famixPrefix + ".Method (id: " + data.id++ + ")\n";
            data.mseFile += "        (name '" + meth.getName() + "')\n";
            data.mseFile += "		(cyclomaticComplexity 1)\n";
            data.mseFile += "		(declaredType (ref: " + data.typesDictionary[tmpReturnType] + "))\n";

            // Checking the modifiers
            //checkAnEntityModifier(meth, mseFile);
            let nbModifiers: number = meth.getModifiers().length;
            if (nbModifiers > 0) {
                let tmpTab = new Array();
                meth.getModifiers().forEach(mod => {
                    tmpTab.push(mod.getText());
                });
                data.mseFile += "        (modifiers";
                tmpTab.forEach(element => {
                    data.mseFile += " '" + element + "'";
                });
                data.mseFile += ")\n";
            }

            data.mseFile += "		(numberOfStatements " + meth.getStatements().length + ")\n";
            data.mseFile += "		(parentType (ref: " + data.parentClassId + "))\n";


            // Not including the return type
            let tmpString: string = "		(signature '" + meth.getName() + "(";

            if (meth.getParameters().length > 0) {
                let tmpIncrement: number = 1;
                meth.getParameters().forEach(ele => {
                    if (++tmpIncrement <= meth.getParameters().length) {
                        tmpString += ', ';
                    }
                    //var eleType:string = ele.getType().getText();
                    tmpString += fmxUtils.convertTsTypeToJava(ele.getType().getText());

                });
            }
            tmpString += ')';
            //mseFile += "		(signature '" + meth.getSignature().getParameters() + "()" + "')";
            data.mseFile += tmpString + "')";

            data.mseFile += ")\n";
        });
    }
}


function addMethodsParametersToMSE(clazz: ClassDeclaration) {
    if (clazz.getMethods().length > 0) {
        clazz.getMethods().forEach(me => {
            if (me.getParameters().length > 0) {
                const methodId = data.entitiesIds["Method-" + me.getName()];
                me.getParameters().forEach(pa => {
                    const tmpReturnType = fmxUtils.convertTsTypeToJava(pa.getType().getText());
                    data.entitiesIds["Parameter-" + pa.getName()] = data.id;

                    data.mseFile += "    (" + data.famixPrefix + ".Parameter (id: " + data.id++ + ")\n";
                    data.mseFile += "		(name '" + pa.getName() + "')\n";
                    data.mseFile += "		(declaredType (ref: " + data.typesDictionary[tmpReturnType] + "))\n";
                    data.mseFile += "		(parentBehaviouralEntity (ref: " + methodId + ")))\n";

                });
            }
        });
    }

}


function addClassesAttributesToMSE(clazz: ClassDeclaration) {
    var tmpReturnType: string;

    clazz.getMembers().forEach(mem => {
        tmpReturnType = fmxUtils.convertTsTypeToJava(mem.getType().getText());
        const classId = data.entitiesIds["Class-" + clazz.getName()];

        if (tmpReturnType != 'Unknown') {
            const str1 = mem.getText();
            const pos1 = str1.indexOf(':');
            const str2 = str1.substring(0, pos1).trim();
            const memName = str2.toLowerCase();

            data.mseFile += "    (" + data.famixPrefix + ".Attribute (id: " + data.id++ + ")\n";
            data.mseFile += "		(name '" + memName + "')\n";
            data.mseFile += "		(declaredType (ref: " + data.typesDictionary[tmpReturnType] + "))\n";

            //checkAnEntityModifier(mem, mseFile);
            // Checking the modifiers
            const nbModifiers: number = mem.getModifiers().length;
            if (nbModifiers > 0) {
                var aTab = new Array();
                mem.getModifiers().forEach(mod => {
                    aTab.push(mod.getText());
                });
                data.mseFile += "        (modifiers";
                aTab.forEach(element => {
                    data.mseFile += " '" + element + "'";
                });
                data.mseFile += ")\n";
            } else {
                data.mseFile += "        (modifiers 'private')\n";
            }

            data.mseFile += "		(parentType (ref: " + classId + ")))\n";
        }

    });

}


function addOtherTypesClassToMSE(typeName: string, typeId: number) {
    data.entitiesIds["OtherType-" + typeName] = typeId;

    data.mseFile += "    (" + data.famixPrefix + ".Class (id: " + typeId + ")\n";
    data.mseFile += "        (name '" + typeName + "')\n";
    data.mseFile += "		(isStub true)\n";
    data.mseFile += "		(modifiers 'public' 'final')";
    data.mseFile += ")\n";
}


function addTypesToMSE() {
    // Handling the primitive types first
    data.primitiveTypesTab.forEach(pt => {
        data.entitiesIds["PrimitiveType-" + pt] = data.typesDictionary[pt];

        data.mseFile += "    (" + data.famixPrefix + ".PrimitiveType (id: " + data.typesDictionary[pt] + ")\n";
        data.mseFile += "		(name '" + pt + "')\n";
        data.mseFile += "		(isStub true))\n";
    });

    // Handling then the other types
    data.otherTypesTab.forEach(ot => {
        addOtherTypesClassToMSE(ot, data.typesDictionary[ot]);
    });
}

function addNamespacesToMSE() {
    data.namespacesTab.forEach(na => {
        data.entitiesIds["Namespace-" + na] = data.namespacesDictionary[na];

        data.mseFile += "    (" + data.famixPrefix + ".Namespace (id: " + data.namespacesDictionary[na] + ")\n";
        data.mseFile += "		(name '" + na + "'))\n";
    });
}

function getEntityContainerRef(clazz: ClassDeclaration): number {
    var namespaceDefinition: string;

    if (clazz.getParentNamespace() == undefined) {
        namespaceDefinition = "<Default Package>";
    }

    return data.namespacesDictionary[namespaceDefinition];
}

function saveMSEFile(mseFile: string) {
    const fs = require('fs');
    fs.writeFileSync('msefile-test.mse', mseFile);
    console.log('\nFile successfully created!');
}

