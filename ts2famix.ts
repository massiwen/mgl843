import {ClassDeclaration, Project} from "ts-morph"

let id: number = 1;
let parentClassId: number;
let computedId: number;
let stringParameterFound: boolean = false;
let classesModifiersTab = new Array();
let primitiveTypesTab:string[] = new Array();
let otherTypesTab:string[] = new Array();

const project = new Project();

const famixPrefix = "Famix-Java-Entities";

let mseFile: string = '(\n';

project.addSourceFilesAtPaths("entities/**/*.ts");

project.getSourceFiles().forEach(sourceFile => {
    console.log('\nSource file: ' + sourceFile.getBaseName());

    const hasClasses = sourceFile.getClasses().length > 0;
    const hasInterfaces = sourceFile.getInterfaces().length > 0;

    if(hasClasses) {
        // Initial computation
        computedId = sourceFile.getClasses().length;
        sourceFile.getClasses().forEach(cl => {
            cl.getConstructors().forEach(co => {
                computedId += co.getParameters().length;
                co.getParameters().forEach(pa => {
                    var tmpParamType = pa.getType().getText();
                    locateTypeToCategory(convertTStypeToJava(tmpParamType));
                });
            });
            computedId += cl.getMethods().length;
            cl.getMethods().forEach(me => {
                locateTypeToCategory(convertTStypeToJava(me.getReturnType().getText()));
                if(me.getParameters().length > 0) {
                    me.getParameters().forEach(pa => {
                        locateTypeToCategory(convertTStypeToJava(pa.getType().getText()));
                    });
                }

            });
        });

        console.log('Found classes:');
        sourceFile.getClasses().forEach(oneClass => {
            console.log('Class ' + oneClass.getName());
            console.log(' Nb Modifiers :' + oneClass.getModifiers().length);
            if(oneClass.getConstructors().length > 0) {
                console.log(' Constructor :');
                oneClass.getConstructors().forEach(construct => {
                    let nbParameters: number = construct.getParameters().length;
                    let paramOutput: string = '  Number Of Parameters: ' + nbParameters.toString();

                    if(nbParameters > 0) {
                        construct.getParameters().forEach(cons => {
                            paramOutput += '\n   Parameter : name: ' + cons.getName() + ', type: ' + cons.getType().getText();
                            if(cons.getType().getText() == 'string') {
                                stringParameterFound = true;
                            }
                        });
                    }
                    console.log(paramOutput);
                });
            }
            addClassToMSE(oneClass, mseFile);
            addMethodToMSE(oneClass, parentClassId, mseFile);
        });
    }

    if(hasInterfaces) {
        console.log('Found interfaces:');
        sourceFile.getInterfaces().forEach(inter => {
            console.log(' Interface: ' + inter.getName());
        });
    }
});

// Adding String class
if(stringParameterFound) {
    addClassStringToMSE(mseFile);
}

mseFile += ')';

console.log('\n\nMSEFile:\n'+mseFile);

saveMSEFile(mseFile);


function addClassToMSE(clazz: ClassDeclaration, mseDocument: string) {
    let tmpId:number = id;
    parentClassId = id;
    let containerRef:number = 23;
    mseFile += "    (" + famixPrefix + ".Class (id: " + id++ + ")\n";
    mseFile += "        (name '" + clazz.getName() + "')\n";
    mseFile += "        (modifiers 'public')";
    mseFile += "\n        (typeContainer (ref: " + containerRef + ")"; 
    // Does TypeContainer (from Java) make sense in TypeScript?

    // Checking the modifiers
    /*
    let nbModifiers:number = clazz.getModifiers().length;
    if(nbModifiers > 0) {
        classesModifiersTab[tmpId] = new Array();
        let tmpTab = new Array();
        clazz.getModifiers().forEach(mod => {
            tmpTab.push(mod.getType().getText());
        });
        classesModifiersTab.push(tmpTab);

        mseFile += "\n        (modifiers";
        classesModifiersTab[tmpId].array.forEach(element => {
            mseFile += " '" + element + "'";
        });

        mseFile += ")";
    }
    */

    mseFile += ")\n";
}

function addClassStringToMSE(mseDocument: string) {
    mseFile += "    (" + famixPrefix + ".Class (id: " + id++ + ")\n";
    mseFile += "        (name 'String')\n";
    mseFile += "		(isStub true)\n";
    mseFile += "		(modifiers 'public' 'final')";
    mseFile += ")\n";
}

function addMethodToMSE(clazz: ClassDeclaration, parentId: number, mseDocument: string) {
    if(clazz.getMethods().length > 0) {
        clazz.getMethods().forEach(meth => {
            mseFile += "    (" + famixPrefix + ".Method (id: " + id++ + ")\n";
            mseFile += "        (name '" + meth.getName() + "')\n";
            mseFile += "		(cyclomaticComplexity 1)\n";

            // Checking the modifiers
            let nbModifiers:number = meth.getModifiers().length;
            if(nbModifiers > 0) {
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
            
            mseFile += "		(parentType (ref: " + parentId + "))\n";

            // Including the return type
            /*
            var methReturnType:string = convertTStypeToJava(meth.getReturnType().getText());
            if(methReturnType.length>0) {
                methReturnType += " ";
            }
            let tmpString: string = "		(signature '" + methReturnType + meth.getName() + "(";
            */

            // Not including the return type
            let tmpString: string = "		(signature '" + meth.getName() + "(";

            if(meth.getParameters().length > 0) {
                let tmpIncrement: number = 1;
                meth.getParameters().forEach(ele => {
                    if(++tmpIncrement <= meth.getParameters().length) {
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

function saveMSEFile(mseFile: string) {
    const fs = require('fs');
    fs.writeFileSync('msefile-test.mse', mseFile);
    console.log('\nFile successfully created!');
}

function convertTStypeToJava(tsType: string) : string {
    var javaType:string;
    switch(tsType) {
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
    if(tmpParamType in ['void', 'int', 'bool']) {
        if(!primitiveTypesTab.includes(tmpParamType)) {
            primitiveTypesTab.push(tmpParamType);
        }
    }
    else if(tmpParamType != 'Unknown') {
        if(!otherTypesTab.includes(tmpParamType)) {
            otherTypesTab.push(tmpParamType);
        }
    }
}