import {ClassDeclaration, Project} from "ts-morph"

let id: number = 1;
let parentClassId: number;
let computedId: number;
let stringParameterFound: boolean = false;
let primitiveTypesTab: string[] = new Array();
let otherTypesTab: string[] = new Array();
let namespacesTab: string[] = new Array();
let typesDictionary = {};
let entitiesIds = {};
let namespacesDictionary = {};

const project = new Project();

const famixPrefix = "Famix-Java-Entities";

let mseFile: string = '(\n';

project.addSourceFilesAtPaths("entities/**/*.ts");

project.getSourceFiles().forEach(sourceFile => {
    console.log('\nSource file: ' + sourceFile.getBaseName());

    const hasClasses = sourceFile.getClasses().length > 0;
    const hasInterfaces = sourceFile.getInterfaces().length > 0;

    if (hasClasses) {
        // Initial computation
        computedId = sourceFile.getClasses().length + 1;
        sourceFile.getClasses().forEach(cl => {
            cl.getConstructors().forEach(co => {
                computedId += co.getParameters().length + 1;
                co.getParameters().forEach(pa => {
                    var tmpParamType = pa.getType().getText();
                    locateTypeToCategory(convertTStypeToJava(tmpParamType));
                });
            });

            //console.log('Class '+cl.getName()+': NbMethods='+cl.getMethods().length+', NbMembers='+cl.getMembers().length);
            //computedId += cl.getMethods().length + cl.getMembers().length;
            computedId += cl.getMethods().length + 1;

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

            if (!namespacesTab.includes(namespaceDefinition)) {
                namespacesTab.push(namespaceDefinition);
            }
        });
        computedId += primitiveTypesTab.length + otherTypesTab.length + 1;

        // Filling up the types dictionary
        var tmpComputedId = computedId;
        primitiveTypesTab.forEach(pt => {
            typesDictionary[pt] = tmpComputedId++;
        });
        otherTypesTab.forEach(ot => {
            typesDictionary[ot] = tmpComputedId++;
        });

        // Filling up the namespaces dictionary
        namespacesTab.forEach(na => {
            namespacesDictionary[na] = tmpComputedId++;
        });

        computedId = tmpComputedId;


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
                                stringParameterFound = true;
                            }
                        });
                    }
                    console.log(paramOutput);
                });
            }
            //addClassToMSE(oneClass, mseFile);
            //addMethodToMSE(oneClass, parentClassId, mseFile);
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
mseFile += ')'
saveMSEFile(mseFile);


function addClassToMSE(clazz: ClassDeclaration) {
    parentClassId = id;
    let containerRef: number = getEntityContainerRef(clazz);

    entitiesIds["Class-" + clazz.getName()] = id;
    mseFile += "    (" + famixPrefix + ".Class (id: " + id++ + ")\n";
    mseFile += "        (name '" + clazz.getName() + "')\n";
    mseFile += "        (modifiers 'public')";
    mseFile += "\n        (typeContainer (ref: " + containerRef + "))";

    mseFile += ")\n";
}


function addMethodToMSE(clazz: ClassDeclaration) {
    if (clazz.getMethods().length > 0) {
        clazz.getMethods().forEach(meth => {
            var tmpReturnType = convertTStypeToJava(meth.getReturnType().getText());
            entitiesIds["Method-" + meth.getName()] = id;

            mseFile += "    (" + famixPrefix + ".Method (id: " + id++ + ")\n";
            mseFile += "        (name '" + meth.getName() + "')\n";
            mseFile += "		(cyclomaticComplexity 1)\n";
            mseFile += "		(declaredType (ref: " + typesDictionary[tmpReturnType] + "))\n";

            // Checking the modifiers
            //checkAnEntityModifier(meth, mseFile);
            let nbModifiers: number = meth.getModifiers().length;
            if (nbModifiers > 0) {
                let tmpTab = new Array();
                meth.getModifiers().forEach(mod => {
                    tmpTab.push(mod.getText());
                });
                mseFile += "        (modifiers";
                tmpTab.forEach(element => {
                    mseFile += " '" + element + "'";
                });
                mseFile += ")\n";
            }

            mseFile += "		(numberOfStatements " + meth.getStatements().length + ")\n";
            mseFile += "		(parentType (ref: " + parentClassId + "))\n";


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
            mseFile += tmpString + "')";

            mseFile += ")\n";
        });
    }
}


function addMethodsParametersToMSE(clazz: ClassDeclaration) {
    if (clazz.getMethods().length > 0) {
        clazz.getMethods().forEach(me => {
            if (me.getParameters().length > 0) {
                const methodId = entitiesIds["Method-" + me.getName()];
                me.getParameters().forEach(pa => {
                    const tmpReturnType = convertTStypeToJava(pa.getType().getText());
                    entitiesIds["Parameter-" + pa.getName()] = id;

                    mseFile += "    (" + famixPrefix + ".Parameter (id: " + id++ + ")\n";
                    mseFile += "		(name '" + pa.getName() + "')\n";
                    mseFile += "		(declaredType (ref: " + typesDictionary[tmpReturnType] + "))\n";
                    mseFile += "		(parentBehaviouralEntity (ref: " + methodId + ")))\n";

                });
            }
        });
    }

}


function addClassesAttributesToMSE(clazz: ClassDeclaration) {
    var tmpReturnType: string;

    clazz.getMembers().forEach(mem => {
        tmpReturnType = convertTStypeToJava(mem.getType().getText());
        const classId = entitiesIds["Class-" + clazz.getName()];

        if (tmpReturnType != 'Unknown') {
            const str1 = mem.getText();
            const pos1 = str1.indexOf(':');
            const str2 = str1.substring(0, pos1).trim();
            const memName = str2.toLowerCase();

            mseFile += "    (" + famixPrefix + ".Attribute (id: " + id++ + ")\n";
            mseFile += "		(name '" + memName + "')\n";
            mseFile += "		(declaredType (ref: " + typesDictionary[tmpReturnType] + "))\n";

            //checkAnEntityModifier(mem, mseFile);
            // Checking the modifiers
            const nbModifiers: number = mem.getModifiers().length;
            if (nbModifiers > 0) {
                var aTab = new Array();
                mem.getModifiers().forEach(mod => {
                    aTab.push(mod.getText());
                });
                mseFile += "        (modifiers";
                aTab.forEach(element => {
                    mseFile += " '" + element + "'";
                });
                mseFile += ")\n";
            } else {
                mseFile += "        (modifiers 'private')\n";
            }

            mseFile += "		(parentType (ref: " + classId + ")))\n";
        }

    });

}


function addOtherTypesClassToMSE(typeName: string, typeId: number) {
    entitiesIds["OtherType-" + typeName] = typeId;

    mseFile += "    (" + famixPrefix + ".Class (id: " + typeId + ")\n";
    mseFile += "        (name '" + typeName + "')\n";
    mseFile += "		(isStub true)\n";
    mseFile += "		(modifiers 'public' 'final')";
    mseFile += ")\n";
}


function addTypesToMSE() {
    // Handling the primitive types first
    primitiveTypesTab.forEach(pt => {
        entitiesIds["PrimitiveType-" + pt] = typesDictionary[pt];

        mseFile += "    (" + famixPrefix + ".PrimitiveType (id: " + typesDictionary[pt] + ")\n";
        mseFile += "		(name '" + pt + "')\n";
        mseFile += "		(isStub true))\n";
    });

    // Handling then the other types
    otherTypesTab.forEach(ot => {
        addOtherTypesClassToMSE(ot, typesDictionary[ot]);
    });
}

function addNamespacesToMSE() {
    namespacesTab.forEach(na => {
        entitiesIds["Namespace-" + na] = namespacesDictionary[na];

        mseFile += "    (" + famixPrefix + ".Namespace (id: " + namespacesDictionary[na] + ")\n";
        mseFile += "		(name '" + na + "'))\n";
    });
}

function getEntityContainerRef(clazz: ClassDeclaration): number {
    var namespaceDefinition: string;

    if (clazz.getParentNamespace() == undefined) {
        namespaceDefinition = "<Default Package>";
    }

    return namespacesDictionary[namespaceDefinition];
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
        if (!primitiveTypesTab.includes(tmpParamType)) {
            primitiveTypesTab.push(tmpParamType);
        }
    }
    if (tmpOtherTypes.includes(tmpParamType)) {
        if (!otherTypesTab.includes(tmpParamType)) {
            otherTypesTab.push(tmpParamType);
        }
    }
}

