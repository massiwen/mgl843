import {ClassDeclaration, Project} from "ts-morph"
import {Data} from "./Data";

let data = new Data()

const project = new Project();


project.addSourceFilesAtPaths("entities/**/*.ts");

project.getSourceFiles().forEach(sourceFile => {
    console.log('\nSource file: ' + sourceFile.getBaseName());

    const hasClasses = sourceFile.getClasses().length > 0;
    const hasInterfaces = sourceFile.getInterfaces().length > 0;

    if (hasClasses) {
        // Initial computation
        data.computedId = sourceFile.getClasses().length + 1;
        sourceFile.getClasses().forEach(cl => {
            cl.getConstructors().forEach(co => {
                data.computedId += co.getParameters().length + 1;
                co.getParameters().forEach(pa => {
                    var tmpParamType = pa.getType().getText();
                    locateTypeToCategory(convertTStypeToJava(tmpParamType));
                });
            });

            //console.log('Class '+cl.getName()+': NbMethods='+cl.getMethods().length+', NbMembers='+cl.getMembers().length);
            //computedId += cl.getMethods().length + cl.getMembers().length;
            data.computedId += cl.getMethods().length + 1;

            cl.getMethods().forEach(me => {
                locateTypeToCategory(convertTStypeToJava(me.getReturnType().getText()));
                if (me.getParameters().length > 0) {
                    me.getParameters().forEach(pa => {
                        locateTypeToCategory(convertTStypeToJava(pa.getType().getText()));
                    });
                }

            });

            // Checking the namespaces
            var namespaceDefinition: string;
            if (cl.getParentNamespace() == undefined) {
                namespaceDefinition = "<Default Package>";
            } else {
                namespaceDefinition = cl.getParentNamespace().getText();
            }

            if (!data.namespacesTab.includes(namespaceDefinition)) {
                data.namespacesTab.push(namespaceDefinition);
            }
        });
        data.computedId += data.primitiveTypesTab.length + data.otherTypesTab.length + 1;

        // Filling up the types dictionary
        var tmpComputedId = data.computedId;
        data.primitiveTypesTab.forEach(pt => {
            data.typesDictionary[pt] = tmpComputedId++;
        });
        data.otherTypesTab.forEach(ot => {
            data.typesDictionary[ot] = tmpComputedId++;
        });

        // Filling up the namespaces dictionary
        data.namespacesTab.forEach(na => {
            data.namespacesDictionary[na] = tmpComputedId++;
        });

        data.computedId = tmpComputedId;


        console.log('Found classes:');
        sourceFile.getClasses().forEach(oneClass => {
            console.log('Class ' + oneClass.getName());
            console.log(' Nb Modifiers :' + oneClass.getModifiers().length);
            if (oneClass.getConstructors().length > 0) {
                console.log(' Constructor :');
                oneClass.getConstructors().forEach(construct => {
                    let nbParameters: number = construct.getParameters().length;
                    let paramOutput: string = '  Number Of Parameters: ' + nbParameters.toString();

                    if (nbParameters > 0) {
                        construct.getParameters().forEach(cons => {
                            paramOutput += '\n   Parameter : name: ' + cons.getName() + ', type: ' + cons.getType().getText();
                            if (cons.getType().getText() == 'string') {
                                data.stringParameterFound = true;
                            }
                        });
                    }
                    console.log(paramOutput);
                });
            }
        });


    }

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
            var tmpReturnType = convertTStypeToJava(meth.getReturnType().getText());
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
                    tmpString += convertTStypeToJava(ele.getType().getText());

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
                    const tmpReturnType = convertTStypeToJava(pa.getType().getText());
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
        tmpReturnType = convertTStypeToJava(mem.getType().getText());
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

function convertTStypeToJava(tsType: string): string {
    var javaType: string;
    switch (tsType) {
        case 'string':
            javaType = 'String';
            break;
        case 'number':
            javaType = 'int';
            break;
        case 'boolean':
            javaType = 'bool';
            break;
        case 'void':
            javaType = 'void';
            break;
        default:
            javaType = 'Unknown';
    }
    return javaType;
}

function locateTypeToCategory(tmpParamType: string) {
    const tmpPrimitiveTypes = ['void', 'int', 'bool'];
    const tmpOtherTypes = ['String'];
    if (tmpPrimitiveTypes.includes(tmpParamType)) {
        if (!data.primitiveTypesTab.includes(tmpParamType)) {
            data.primitiveTypesTab.push(tmpParamType);
        }
    }
    if (tmpOtherTypes.includes(tmpParamType)) {
        if (!data.otherTypesTab.includes(tmpParamType)) {
            data.otherTypesTab.push(tmpParamType);
        }
    }
}

