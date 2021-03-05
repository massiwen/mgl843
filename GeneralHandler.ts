import {Data} from "./Data";
import {ClassDeclaration, Project} from "ts-morph";
import {FmxUtils} from "./FmxUtils";

let data: Data

export class GeneralHandler {

    constructor(d: Data) {
        data = d
    }


    runOnProject(project: Project) {
        let tasks = [this.addClassToMSE, this.addMethodToMSE,
            this.addMethodsParametersToMSE, this.addClassesAttributesToMSE]

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

    }

    addClassToMSE(clazz: ClassDeclaration) {

        const getEntityContainerRef = (clazz: ClassDeclaration): number => {
            var namespaceDefinition: string;

            if (clazz.getParentNamespace() == undefined) {
                namespaceDefinition = "<Default Package>";
            }

            return data.namespacesDictionary[namespaceDefinition];
        };

        data.parentClassId = data.id;
        let containerRef: number = getEntityContainerRef(clazz);

        data.entitiesIds["Class-" + clazz.getName()] = data.id;
        data.mseFile += "    (" + data.famixPrefix + ".Class (id: " + data.id++ + ")\n";
        data.mseFile += "        (name '" + clazz.getName() + "')\n";
        data.mseFile += "        (modifiers 'public')";
        data.mseFile += "\n        (typeContainer (ref: " + containerRef + "))";

        data.mseFile += ")\n";
        return data
    }


    addMethodToMSE(clazz: ClassDeclaration) {
        if (clazz.getMethods().length > 0) {
            clazz.getMethods().forEach(meth => {
                var tmpReturnType = new FmxUtils().convertTsTypeToJava(meth.getReturnType().getText());
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
                        tmpString += new FmxUtils().convertTsTypeToJava(ele.getType().getText());

                    });
                }
                tmpString += ')';
                //mseFile += "		(signature '" + meth.getSignature().getParameters() + "()" + "')";
                data.mseFile += tmpString + "')";

                data.mseFile += ")\n";
            });
        }

    }


    addMethodsParametersToMSE(clazz: ClassDeclaration) {

        if (clazz.getMethods().length > 0) {
            clazz.getMethods().forEach(me => {
                if (me.getParameters().length > 0) {
                    const methodId = data.entitiesIds["Method-" + me.getName()];
                    me.getParameters().forEach(pa => {
                        const tmpReturnType = new FmxUtils().convertTsTypeToJava(pa.getType().getText());
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


    addClassesAttributesToMSE(clazz: ClassDeclaration) {
        var tmpReturnType: string;

        clazz.getMembers().forEach(mem => {
            tmpReturnType = new FmxUtils().convertTsTypeToJava(mem.getType().getText());
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
                    var aTab = [];
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

}