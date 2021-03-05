import {Data} from "./Data";
import {SourceFile} from "ts-morph";
import {FmxUtils} from "./FmxUtils";


export class ClassHandler {
    data: Data
    fmxUtils = new FmxUtils();

    constructor(data: Data, sourceFile: SourceFile) {
        this.data = data

        // Initial computation
        data.computedId = sourceFile.getClasses().length + 1;
        sourceFile.getClasses().forEach(cl => {
            cl.getConstructors().forEach(co => {
                data.computedId += co.getParameters().length + 1;
                co.getParameters().forEach(pa => {
                    var tmpParamType = pa.getType().getText();
                    this.locateTypeToCategory(this.fmxUtils.convertTsTypeToJava(tmpParamType));
                });
            });

            //console.log('Class '+cl.getName()+': NbMethods='+cl.getMethods().length+', NbMembers='+cl.getMembers().length);
            //computedId += cl.getMethods().length + cl.getMembers().length;
            data.computedId += cl.getMethods().length + 1;

            cl.getMethods().forEach(me => {
                this.locateTypeToCategory(this.fmxUtils.convertTsTypeToJava(me.getReturnType().getText()));
                if (me.getParameters().length > 0) {
                    me.getParameters().forEach(pa => {
                        this.locateTypeToCategory(this.fmxUtils.convertTsTypeToJava(pa.getType().getText()));
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

    locateTypeToCategory(tmpParamType: string) {
        const tmpPrimitiveTypes = ['void', 'int', 'bool'];
        const tmpOtherTypes = ['String'];
        if (tmpPrimitiveTypes.includes(tmpParamType)) {
            if (!this.data.primitiveTypesTab.includes(tmpParamType)) {
                this.data.primitiveTypesTab.push(tmpParamType);
            }
        }
        if (tmpOtherTypes.includes(tmpParamType)) {
            if (!this.data.otherTypesTab.includes(tmpParamType)) {
                this.data.otherTypesTab.push(tmpParamType);
            }
        }
    }


}